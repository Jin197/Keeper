import { NextResponse } from 'next/server';
import { z } from 'zod';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env, stripePriceFor, stripeSaleDossierPriceFor } from '@/lib/env';
import { TRIAL_DAYS } from '@/lib/trial';
import { resolvePricing } from '@/lib/pricing';
import { resolveRequestCountry } from '@/lib/geo';

const bodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('subscription').default('subscription'),
    interval: z.enum(['monthly', 'yearly']).default('monthly'),
  }),
  z.object({
    kind: z.literal('sale_dossier'),
    vehicleId: z.string().uuid(),
  }),
]);

// Legacy clients still post `{ interval, tier }` without `kind`.
const legacySchema = z.object({
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  tier: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsedBody = bodySchema.safeParse(raw);
    const body = parsedBody.success
      ? parsedBody.data
      : ({ kind: 'subscription', interval: legacySchema.parse(raw).interval } as const);

    // Profile: Stripe customer + the country that decides the price band.
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, country, currency')
      .eq('id', user.id)
      .single();

    const country = resolveRequestCountry(profile?.country);
    const pricing = resolvePricing(country, profile?.currency);

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email!,
        metadata: { user_id: user.id, country },
      });
      customerId = customer.id;
      await createAdminClient()
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const common = {
      customer: customerId,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      metadata: { user_id: user.id, band: pricing.band, country },
    } satisfies Partial<Stripe.Checkout.SessionCreateParams>;

    let params: Stripe.Checkout.SessionCreateParams;
    if (body.kind === 'sale_dossier') {
      // The vehicle must belong to the caller (RLS already guarantees it,
      // but a 404 is friendlier than a webhook that later finds nothing).
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id, make, model, plate')
        .eq('id', body.vehicleId)
        .maybeSingle();
      if (!vehicle) {
        return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
      }
      params = {
        ...common,
        mode: 'payment',
        line_items: [{ price: stripeSaleDossierPriceFor(pricing.band), quantity: 1 }],
        payment_intent_data: {
          metadata: { user_id: user.id, kind: 'sale_dossier', vehicle_id: vehicle.id },
        },
        metadata: { ...common.metadata, kind: 'sale_dossier', vehicle_id: vehicle.id },
        invoice_creation: { enabled: true },
        success_url: `${env.appUrl()}/vehicles/${vehicle.id}?purchase=success`,
        cancel_url: `${env.appUrl()}/vehicles/${vehicle.id}?purchase=cancelled`,
      };
    } else {
      params = {
        ...common,
        mode: 'subscription',
        line_items: [{ price: stripePriceFor(body.interval, pricing.band), quantity: 1 }],
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: { user_id: user.id, band: pricing.band, country },
        },
        success_url: `${env.appUrl()}/settings/billing?status=success`,
        cancel_url: `${env.appUrl()}/pricing?status=cancelled`,
      };
    }

    // Charge in the buyer's currency when the Price carries a matching
    // `currency_options` entry. If it doesn't, Stripe rejects the `currency`
    // param — retry once in the Price's default currency rather than fail.
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        ...params,
        currency: pricing.currency.toLowerCase(),
      });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      const msg = e instanceof Error ? e.message : '';
      if (code === 'parameter_invalid_empty' || /currency/i.test(msg)) {
        session = await stripe.checkout.sessions.create(params);
      } else {
        throw e;
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

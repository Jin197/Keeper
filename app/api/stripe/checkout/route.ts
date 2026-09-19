import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { TRIAL_DAYS } from '@/lib/trial';

const bodySchema = z.object({
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  tier: z.enum(['premium', 'family']).default('premium'),
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { interval, tier } = bodySchema.parse(await req.json());
    let priceId: string;
    if (tier === 'family') {
      priceId =
        interval === 'yearly'
          ? env.stripePriceFamilyYearly()
          : env.stripePriceFamilyMonthly();
    } else {
      priceId =
        interval === 'yearly' ? env.stripePriceYearly() : env.stripePriceMonthly();
    }

    // Look up profile for stripe_customer_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email!,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await createAdminClient()
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { user_id: user.id },
      },
      automatic_tax: { enabled: true },
      success_url: `${env.appUrl()}/settings/billing?status=success`,
      cancel_url: `${env.appUrl()}/pricing?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

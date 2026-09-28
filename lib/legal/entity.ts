/**
 * Legal identity of the publisher.
 *
 * The previous imprint shipped invented details (an "SAS" with a capital, an
 * RCS number and an intra-EU VAT number that do not belong to this project).
 * Publishing a false company registration or VAT number is a
 * misrepresentation, so nothing is hard-coded here any more: every field comes
 * from the environment, and `isComplete()` is false until the mandatory ones
 * are set. When it is false the imprint says so instead of inventing an answer.
 *
 * Set these in Vercel (and .env.local for dev) before going live:
 *   LEGAL_ENTITY_NAME, LEGAL_ENTITY_FORM, LEGAL_ENTITY_ADDRESS,
 *   LEGAL_ENTITY_EMAIL, LEGAL_ENTITY_PUBLISHER,
 *   LEGAL_ENTITY_REGISTRY, LEGAL_ENTITY_VAT, LEGAL_ENTITY_CAPITAL (optional)
 */
export interface LegalEntity {
  name: string | null;
  form: string | null;
  capital: string | null;
  registry: string | null;
  vat: string | null;
  address: string | null;
  publisher: string | null;
  email: string;
  dpoEmail: string;
}

export function legalEntity(): LegalEntity {
  const v = (k: string) => {
    const raw = process.env[k]?.trim();
    return raw && raw.length > 0 ? raw : null;
  };
  return {
    name: v('LEGAL_ENTITY_NAME'),
    form: v('LEGAL_ENTITY_FORM'),
    capital: v('LEGAL_ENTITY_CAPITAL'),
    registry: v('LEGAL_ENTITY_REGISTRY'),
    vat: v('LEGAL_ENTITY_VAT'),
    address: v('LEGAL_ENTITY_ADDRESS'),
    publisher: v('LEGAL_ENTITY_PUBLISHER'),
    email: v('LEGAL_ENTITY_EMAIL') ?? 'legal@keeperapp.app',
    dpoEmail: v('LEGAL_ENTITY_DPO_EMAIL') ?? v('LEGAL_ENTITY_EMAIL') ?? 'privacy@keeperapp.app',
  };
}

/** True when the imprint can be published as-is (name, address and a contact). */
export function isComplete(e: LegalEntity = legalEntity()): boolean {
  return Boolean(e.name && e.address && e.email);
}

/** Date the current version of the legal documents took effect. */
export const LEGAL_VERSION = '2026-09-27';

import { createTranslator } from 'next-intl';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';

/**
 * Translations outside a request (crons, webhooks, emails). Inside pages use
 * `getTranslations` / `useTranslations` from next-intl instead.
 */
const CATALOGUES: Record<'en' | 'fr', typeof en> = { en, fr: fr as typeof en };

export type ServerLocale = 'en' | 'fr';

export function serverLocale(raw: string | null | undefined): ServerLocale {
  return raw === 'fr' ? 'fr' : 'en';
}

type Messages = typeof en;
type Namespace = keyof Messages;

/** Returns `(key, params?) => string` for one namespace, typed loosely on purpose: callers pass computed keys. */
export function translatorFor(locale: string | null | undefined, namespace: Namespace) {
  const l = serverLocale(locale);
  const t = createTranslator({ locale: l, messages: CATALOGUES[l] as unknown as Record<string, unknown>, namespace });
  return (key: string, params?: Record<string, string | number | Date>) =>
    (t as unknown as (k: string, p?: Record<string, string | number | Date>) => string)(key, params);
}

/** BCP-47 tag for Intl formatting that matches the catalogue. */
export function intlTagFor(locale: string | null | undefined): string {
  return serverLocale(locale) === 'fr' ? 'fr-FR' : 'en-GB';
}

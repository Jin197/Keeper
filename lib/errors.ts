import 'server-only';
import { getLocale } from 'next-intl/server';
import { translatorFor } from '@/lib/i18n/messages';

/**
 * Localised messages for server actions and route handlers.
 *
 * Server actions return their error as a plain string that the client shows in
 * a toast, so the string has to already be in the user's language. `getLocale`
 * works inside an action (it reads the request the action was called from);
 * outside one — a cron, a webhook — it throws, so we fall back to English.
 */
type ErrorKey =
  | 'unauthenticated'
  | 'invalidData'
  | 'notConfigured'
  | 'vehicleNotFound'
  | 'vehicleNotYours'
  | 'profileNotFound'
  | 'tooManyAttempts'
  | 'tooSoon'
  | 'generic'
  | 'duplicateVehicle'
  | 'alreadyHasVehicles'
  | 'breachedPassword'
  | 'codeRequired'
  | 'fetchFailed'
  | 'demoFailed'
  | 'invalidFormulaNumber'
  | 'contestReasonRequired'
  | 'fineCancelled'
  | 'duplicateFineNumber'
  | 'requestFailed'
  | 'badCredentials'
  | 'rateLimited'
  | 'tooManyScans'
  | 'unsupportedFormat'
  | 'noStripeCustomer'
  | 'unreadableText'
  | 'docNotRecognised'
  | 'plateOrVinRequired'
  | 'invalidFrenchPlate'
  | 'exportProOnly'
  | 'plateNotInSiv'
  | 'sivNotConfigured'
  | 'plateNotInDvla'
  | 'dvlaNotConfigured'
  | 'vinNotRecognised'
  | 'plateFormatUnknown';

export async function err(key: ErrorKey): Promise<string> {
  let locale = 'en';
  try {
    locale = await getLocale();
  } catch {
    // Not in a request scope — English it is.
  }
  return translatorFor(locale, 'errors')(key);
}

/** `{ error: … }` shaped for ActionResult, in one call. */
export async function errResult(key: ErrorKey): Promise<{ error: string }> {
  return { error: await err(key) };
}

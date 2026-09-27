import { z } from 'zod';

/**
 * Strong password schema enforced at signup and password reset.
 *
 * Policy:
 *   - 10 characters minimum (NIST 800-63B recommends 8+, we go slightly higher)
 *   - At least one lowercase letter
 *   - At least one uppercase letter
 *   - At least one digit
 *
 * Symbols are intentionally NOT required: recent NIST guidance shows that
 * forcing symbols pushes users toward predictable patterns (`P@ssw0rd!`).
 * Length + character-class diversity gives better entropy in practice.
 */
export const strongPasswordSchema = z
  .string()
  .min(10, 'At least 10 characters')
  .max(128, 'Trop long (128 max)')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[0-9]/, 'Au moins un chiffre');

/**
 * Lighter schema used by the login form. We don't want to leak our exact
 * password policy to attackers, and existing accounts may pre-date the
 * stronger policy, so login only requires a minimal sanity check.
 */
export const loginPasswordSchema = z.string().min(6).max(128);

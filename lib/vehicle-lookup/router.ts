// lib/vehicle-lookup/router.ts
// Routeur Intelligent de Lookup Véhicule.
// Orchestre la cascade : Cache Redis → API spécifique au pays → Fallback NHTSA → Erreur gracieuse.

import { getCachedLookup, setCachedLookup, type LookupResult } from './cache';
import { lookupBySivFrance, isSivConfigured } from './providers/siv-france';
import { lookupByNhtsa } from './providers/nhtsa';
import { lookupByDvla, isDvlaConfigured } from './providers/dvla-uk';

// ─── Regex de détection des formats ───────────────────────────────
// France SIV (nouveau) : AA-123-AA ou AA123AA
const REGEX_PLATE_FR = /^[A-Z]{2}-?\d{3}-?[A-Z]{2}$/;
// France ancien format : 1234 AB 75
const REGEX_PLATE_FR_OLD = /^\d{1,4}\s?[A-Z]{1,3}\s?\d{2,3}$/;
// UK : AA12 AAA ou AA12AAA
const REGEX_PLATE_UK = /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/;
// VIN international (17 caractères alphanumériques, sans I/O/Q)
const REGEX_VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

export type InputType = 'plate-fr' | 'plate-uk' | 'vin' | 'unknown';

export interface LookupResponse {
  success: boolean;
  data?: LookupResult;
  inputType: InputType;
  /**
   * Key into the `errors` message namespace. The API route turns it into a
   * localised sentence; keeping a key here leaves this module pure and testable.
   */
  errorKey?:
    | 'plateNotInSiv'
    | 'sivNotConfigured'
    | 'plateNotInDvla'
    | 'dvlaNotConfigured'
    | 'vinNotRecognised'
    | 'plateFormatUnknown';
  /** Suggestion de fallback pour le frontend */
  fallback?: 'try-vin' | 'manual-entry';
}

/**
 * Détecte le type d'identifiant soumis par l'utilisateur.
 */
export function detectInputType(input: string): InputType {
  const cleaned = input.toUpperCase().trim();

  if (REGEX_VIN.test(cleaned)) return 'vin';
  if (REGEX_PLATE_FR.test(cleaned) || REGEX_PLATE_FR_OLD.test(cleaned)) return 'plate-fr';
  if (REGEX_PLATE_UK.test(cleaned)) return 'plate-uk';

  return 'unknown';
}

/**
 * Valide le format d'une plaque FR côté serveur (anti-abus API payante).
 */
export function isValidFrenchPlate(plate: string): boolean {
  const cleaned = plate.toUpperCase().replace(/[\s-]/g, '');
  return REGEX_PLATE_FR.test(cleaned) || REGEX_PLATE_FR_OLD.test(cleaned.replace(/\s/g, ''));
}

/**
 * Point d'entrée principal du routeur.
 * Cascade : Cache → Provider spécifique → Fallback NHTSA → Erreur gracieuse.
 */
export async function lookupVehicle(
  input: string,
  countryHint?: string,
): Promise<LookupResponse> {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '');
  const inputType = detectInputType(cleaned);

  // 0. Vérification du cache Redis
  const cached = await getCachedLookup(cleaned);
  if (cached) {
    return { success: true, data: cached, inputType };
  }

  let result: LookupResult | null = null;

  // ─── Routage selon le type d'input ────────────────────────────────

  switch (inputType) {
    case 'plate-fr': {
      // Cascade FR : SIV → (pas de fallback VIN possible sans VIN)
      if (isSivConfigured()) {
        result = await lookupBySivFrance(cleaned);

        // Si le SIV retourne un VIN, on l'enrichit via NHTSA
        if (result?.vin && (!result.engine || !result.trim)) {
          const nhtsaEnrich = await lookupByNhtsa(result.vin, result.plate);
          if (nhtsaEnrich) {
            result = {
              ...result,
              engine: result.engine || nhtsaEnrich.engine,
              trim: result.trim || nhtsaEnrich.trim,
              // Garder le source SIV car c'est la source primaire
            };
          }
        }
      }

      if (!result) {
        return {
          success: false,
          inputType,
          errorKey: isSivConfigured() ? 'plateNotInSiv' : 'sivNotConfigured',
          fallback: 'try-vin',
        };
      }
      break;
    }

    case 'plate-uk': {
      if (isDvlaConfigured()) {
        result = await lookupByDvla(cleaned);
      }

      if (!result) {
        return {
          success: false,
          inputType,
          errorKey: isDvlaConfigured() ? 'plateNotInDvla' : 'dvlaNotConfigured',
          fallback: 'try-vin',
        };
      }
      break;
    }

    case 'vin': {
      result = await lookupByNhtsa(cleaned);

      if (!result) {
        return {
          success: false,
          inputType,
          errorKey: 'vinNotRecognised',
          fallback: 'manual-entry',
        };
      }
      break;
    }

    default: {
      return {
        success: false,
        inputType: 'unknown',
        errorKey: 'plateFormatUnknown',
        fallback: 'manual-entry',
      };
    }
  }

  // Stocker dans le cache Redis pour les prochaines 24h
  if (result) {
    await setCachedLookup(cleaned, result);
  }

  return { success: true, data: result!, inputType };
}

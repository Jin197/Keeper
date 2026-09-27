// lib/vehicle-lookup/cache.ts
// Cache Redis (Upstash) pour les résultats de lookup véhicule.
// Évite de payer plusieurs fois la même requête SIV.
// Fallback silencieux si Redis n'est pas configuré.

import { Redis } from '@upstash/redis';

const CACHE_PREFIX = 'vlookup:';
const CACHE_TTL_SECONDS = 86400; // 24 heures

let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch {
  // Redis non configuré — mode sans cache
}

export interface LookupResult {
  plate: string;
  make: string;
  model: string;
  year: number | null;
  fuel_type: string;
  engine: string;
  vin: string;
  color: string;
  trim: string;
  source: 'siv' | 'nhtsa' | 'dvla' | 'cache' | 'carte-grise-ocr';
  /** ISO-3166 alpha-2 registration country when the provider implies one. */
  country?: string;
  /** DVLA VES extras (UK only). ISO dates. */
  motExpiryDate?: string | null;
  motStatus?: string | null;
  taxDueDate?: string | null;
  taxStatus?: string | null;
  co2Emissions?: number | null;
}

/**
 * Tente de récupérer un résultat depuis le cache Redis.
 */
export async function getCachedLookup(key: string): Promise<LookupResult | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get<LookupResult>(`${CACHE_PREFIX}${key}`);
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    return null;
  } catch {
    return null; // Cache failure = cache miss
  }
}

/**
 * Stocke un résultat dans le cache Redis (TTL 24h).
 */
export async function setCachedLookup(key: string, result: LookupResult): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`${CACHE_PREFIX}${key}`, result, { ex: CACHE_TTL_SECONDS });
  } catch {
    // Ignorer les erreurs d'écriture cache
  }
}

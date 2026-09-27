// lib/vehicle-lookup/providers/dvla-uk.ts
// Fournisseur DVLA pour le Royaume-Uni.
// Architecture modulaire : prêt à brancher l'API DVLA/Car Registration API.
// Activé par : DVLA_API_KEY dans les variables d'environnement.

import type { LookupResult } from '../cache';

const DVLA_API_KEY = process.env.DVLA_API_KEY;
// L'API officielle DVLA VES : https://developer-portal.driver-vehicle-licensing.api.gov.uk/
const DVLA_API_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

/**
 * Vérifie si le fournisseur DVLA est configuré.
 */
export function isDvlaConfigured(): boolean {
  return !!DVLA_API_KEY;
}

/**
 * Recherche un véhicule via l'API DVLA britannique.
 * Retourne null si non configuré ou si le véhicule n'est pas trouvé.
 */
export async function lookupByDvla(plate: string): Promise<LookupResult | null> {
  if (!DVLA_API_KEY) return null;

  try {
    const res = await fetch(DVLA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': DVLA_API_KEY,
      },
      body: JSON.stringify({ registrationNumber: plate }),
    });

    if (!res.ok) return null;

    const raw = await res.json();

    const make = raw.make || '';
    if (!make) return null;

    return {
      plate,
      make,
      model: '', // DVLA ne retourne pas toujours le modèle
      year: raw.yearOfManufacture || null,
      fuel_type: normalizeFuelType(raw.fuelType || ''),
      engine: raw.engineCapacity ? `${raw.engineCapacity}cc` : '',
      vin: '', // DVLA ne retourne pas le VIN pour des raisons de sécurité
      color: raw.colour || '',
      trim: '',
      source: 'dvla',
      country: 'GB',
      motExpiryDate: raw.motExpiryDate || null,
      motStatus: raw.motStatus || null,
      taxDueDate: raw.taxDueDate || null,
      taxStatus: raw.taxStatus || null,
      co2Emissions: typeof raw.co2Emissions === 'number' ? raw.co2Emissions : null,
    };
  } catch {
    return null;
  }
}

function normalizeFuelType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('electri')) return 'electric';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'thermal';
}

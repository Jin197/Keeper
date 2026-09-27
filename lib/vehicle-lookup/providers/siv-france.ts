// lib/vehicle-lookup/providers/siv-france.ts
// Fournisseur SIV français (API payante, activée par variables d'environnement).
// Compatible avec : apiplaqueimmatriculation.com, Eurekar, SIV-API.com, Drivauto.
// Conformité RGPD : seules les données techniques du véhicule sont extraites.

import type { LookupResult } from '../cache';

const SIV_API_KEY = process.env.SIV_API_KEY;
const SIV_API_URL = process.env.SIV_API_URL;

/**
 * Vérifie si le fournisseur SIV est configuré.
 */
export function isSivConfigured(): boolean {
  return !!(SIV_API_KEY && SIV_API_URL);
}

/**
 * Recherche un véhicule via l'API SIV française.
 * Retourne null si non configuré ou si le véhicule n'est pas trouvé.
 *
 * RGPD : Aucune donnée nominative (nom, adresse) n'est extraite ou stockée.
 * Seules les données techniques du véhicule sont récupérées.
 */
export async function lookupBySivFrance(plate: string): Promise<LookupResult | null> {
  if (!SIV_API_KEY || !SIV_API_URL) return null;

  try {
    const res = await fetch(
      `${SIV_API_URL}?immatriculation=${encodeURIComponent(plate)}&token=${SIV_API_KEY}&pays=FR`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return null;

    const raw = await res.json();

    // Extraction STRICTE des données techniques uniquement (RGPD)
    const make = raw.marque || raw.make || '';
    const model = raw.modele || raw.model || '';
    if (!make) return null;

    return {
      plate,
      make,
      model,
      year: parseYear(raw.annee || raw.year || raw.date_mise_circulation),
      fuel_type: normalizeFuelType(raw.energie || raw.fuel_type || raw.carburant || ''),
      engine: raw.motorisation || raw.engine || raw.cylindree || '',
      vin: raw.vin || raw.codifVin || '',
      color: raw.couleur || raw.color || '',
      trim: raw.version || raw.trim || '',
      source: 'siv',
      country: 'FR',
    };
  } catch {
    return null;
  }
}

function parseYear(raw: string | number | undefined): number | null {
  if (!raw) return null;
  if (typeof raw === 'number') return raw;
  // Handle dates like "2023-01-15" or "15/01/2023"
  const match = raw.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

function normalizeFuelType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('electri') || lower.includes('ev') || lower.includes('battery')) return 'electric';
  if (lower.includes('hybrid') || lower.includes('hybride')) return 'hybrid';
  if (lower.includes('diesel') || lower.includes('gazole') || lower.includes('go')) return 'thermal';
  if (lower.includes('essence') || lower.includes('gasoline') || lower.includes('sp') || lower.includes('petrol')) return 'thermal';
  if (lower.includes('gpl') || lower.includes('e85') || lower.includes('gnv')) return 'thermal';
  return 'thermal';
}

import { z } from 'zod';

export const fuelTypeSchema = z.enum(['thermal', 'electric', 'hybrid']);
import { currencies } from '@/lib/currencies';

/** Any ISO-4217 code we list in lib/currencies.ts — the app is global now. */
const KNOWN_CURRENCIES = new Set(currencies.map((c) => c.code));
export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((c) => KNOWN_CURRENCIES.has(c), 'Unknown currency');

export const vehicleInputSchema = z.object({
  make: z.string().trim().min(1, 'Make required').max(50),
  model: z.string().trim().min(1, 'Model required').max(80),
  year: z
    .coerce.number()
    .int()
    .min(1950, 'Year too old')
    .max(new Date().getFullYear() + 1, 'Invalid year'),
  trim: z.string().trim().max(50).optional().or(z.literal('')),
  color: z.string().trim().max(40).optional().or(z.literal('')),
  plate: z
    .string()
    .trim()
    .min(2, 'Registration required')
    .max(20)
    .toUpperCase(),
  vin: z
    .string()
    .trim()
    .max(17, 'VIN is at most 17 characters')
    .optional()
    .or(z.literal('')),
  fuelType: fuelTypeSchema,
  purchaseDate: z.string().min(1, 'Purchase date required'),
  purchasePrice: z.coerce.number().nonnegative('Price must be positive'),
  currency: currencySchema,
  currentMileageKm: z.coerce.number().int().nonnegative('Invalid mileage'),
  imageUrl: z
    .string()
    .url('Invalid URL')
    .optional()
    .or(z.literal('')),
  insuranceProvider: z.string().trim().max(50).optional().or(z.literal('')),
  insuranceMonthly: z
    .coerce.number()
    .nonnegative()
    .optional(),
  /** ISO date the policy renews; empty string clears it. */
  insuranceRenewalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional()
    .or(z.literal('')),
  /** ISO-3166 alpha-2 registration country. */
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Invalid country')
    .optional()
    .or(z.literal('')),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

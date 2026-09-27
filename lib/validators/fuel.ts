import { z } from 'zod';
import { currencySchema } from './vehicle';

export const energyTypeSchema = z.enum([
  'gasoline',
  'diesel',
  'electric',
  'e85',
  'gpl',
]);

export const fuelEntryInputSchema = z
  .object({
    vehicleId: z.string().min(1, 'Vehicle required'),
    occurredAt: z.string().min(1, 'Date required'),
    energyType: energyTypeSchema,
    quantity: z.coerce.number().positive('Quantity required'),
    unitPrice: z.coerce.number().positive('Prix unitaire requis'),
    totalPrice: z.coerce.number().positive('Total requis'),
    currency: currencySchema,
    stationName: z.string().trim().min(1, 'Station required').max(80),
    stationCity: z.string().trim().max(80).optional().or(z.literal('')),
    mileageKm: z.coerce.number().int().nonnegative('Invalid mileage'),
    ocrSource: z.enum(['manual', 'ocr']).default('manual'),
  })
  .refine(
    (data) => {
      // Total roughly matches qty * unit price (within 5% tolerance)
      const expected = data.quantity * data.unitPrice;
      const diff = Math.abs(expected - data.totalPrice);
      return diff / Math.max(expected, 0.01) < 0.05;
    },
    {
      message: 'Le total ne correspond pas à quantité × prix unitaire',
      path: ['totalPrice'],
    },
  );

export type FuelEntryInput = z.infer<typeof fuelEntryInputSchema>;

export const unitForEnergy = (e: z.infer<typeof energyTypeSchema>): 'L' | 'kWh' =>
  e === 'electric' ? 'kWh' : 'L';

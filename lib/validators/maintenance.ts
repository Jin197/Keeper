import { z } from 'zod';
import { currencySchema } from './vehicle';

export const maintenanceCategorySchema = z.enum([
  'oil',
  'tires',
  'brakes',
  'filter',
  'battery',
  'inspection',
  'belt',
  'fluid',
  'gearbox',
  'other',
]);

export const maintenanceInputSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle required'),
  occurredAt: z.string().min(1, 'Date required'),
  category: maintenanceCategorySchema,
  description: z.string().trim().min(3, 'Description trop courte').max(200),
  cost: z.coerce.number().nonnegative('Invalid cost'),
  currency: currencySchema,
  garageName: z.string().trim().min(1, 'Garage required').max(80),
  mileageKm: z.coerce.number().int().nonnegative('Invalid mileage'),
  nextDueMileage: z.coerce.number().int().nonnegative().optional(),
  nextDueDate: z.string().optional().or(z.literal('')),
});

export type MaintenanceInput = z.infer<typeof maintenanceInputSchema>;

import { z } from 'zod';
import { currencySchema } from './vehicle';

export const localeSchema = z.enum(['fr', 'en', 'es', 'ar', 'pt']);

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(1, 'Name required').max(80),
  email: z.string().email('Invalid email'),
  locale: localeSchema,
  currency: currencySchema,
  country: z.string().trim().min(2).max(3).toUpperCase(),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

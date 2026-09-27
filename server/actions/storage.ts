'use server';

import { storage } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/env';
import type { ActionResult } from './profile';
import { err, errResult } from '@/lib/errors';

export async function uploadReceiptAction(
  formData: FormData,
): Promise<ActionResult & { path?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Fichier manquant' };
  return storage.uploadReceipt(file);
}

export async function uploadVehiclePhotoAction(
  formData: FormData,
): Promise<ActionResult & { path?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Fichier manquant' };
  return storage.uploadVehiclePhoto(file);
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ActionResult & { path?: string }> {
  if (!isSupabaseConfigured()) return errResult('notConfigured');
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Fichier manquant' };
  return storage.uploadAvatar(file);
}

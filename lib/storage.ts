import { createClient } from '@/lib/supabase/server';
import { err } from '@/lib/errors';

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_RECEIPT = [...ALLOWED_IMAGE, 'application/pdf'];

const MAX_RECEIPT = 5 * 1024 * 1024;
const MAX_INVOICE = 10 * 1024 * 1024;
const MAX_AVATAR = 2 * 1024 * 1024;

interface UploadResult {
  path?: string;
  error?: string;
}

async function uploadToBucket(
  bucket: 'receipts' | 'invoices' | 'vehicle-photos' | 'avatars',
  file: File,
  allowed: string[],
  maxSize: number,
): Promise<UploadResult> {
  if (!allowed.includes(file.type)) {
    return { error: `Type de fichier non autorisé (${file.type})` };
  }
  if (file.size > maxSize) {
    return { error: `Fichier trop lourd (max ${Math.round(maxSize / 1024 / 1024)} Mo)` };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: await err('unauthenticated') };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };
  return { path };
}

export const storage = {
  uploadReceipt: (file: File) =>
    uploadToBucket('receipts', file, ALLOWED_RECEIPT, MAX_RECEIPT),
  uploadInvoice: (file: File) =>
    uploadToBucket('invoices', file, ALLOWED_RECEIPT, MAX_INVOICE),
  uploadVehiclePhoto: (file: File) =>
    uploadToBucket('vehicle-photos', file, ALLOWED_IMAGE, MAX_RECEIPT),
  uploadAvatar: (file: File) =>
    uploadToBucket('avatars', file, ALLOWED_IMAGE, MAX_AVATAR),

  signedUrl: async (
    bucket: 'receipts' | 'invoices' | 'vehicle-photos' | 'avatars',
    path: string,
    expiresIn = 3600,
  ): Promise<string | null> => {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    return data?.signedUrl ?? null;
  },
};

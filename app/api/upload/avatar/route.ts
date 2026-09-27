import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { err } from '@/lib/errors';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB — matches the bucket's `file_size_limit`
const BUCKET = 'avatars';

/**
 * POST /api/upload/avatar
 *
 * Multipart upload of the user's profile picture. Stored at
 * `<userId>/<uuid>.<ext>` in the public `avatars` bucket so we can
 * return a permanent CDN-cached URL instead of dealing with signed-URL
 * expiry on every render.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_SIZE * 1.1) {
    return NextResponse.json(
      { error: 'Fichier trop lourd (max 2 Mo)' },
      { status: 413 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: await err('unauthenticated') }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: await err('unsupportedFormat') },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop lourd (max 2 Mo).' },
        { status: 400 },
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 },
      );
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return NextResponse.json({
      path,
      publicUrl: publicData.publicUrl,
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload." },
      { status: 500 },
    );
  }
}

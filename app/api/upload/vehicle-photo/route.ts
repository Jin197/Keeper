import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { err } from '@/lib/errors';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const BUCKET = 'vehicle-photos';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_SIZE * 1.1) {
    return NextResponse.json(
      { error: 'Fichier trop lourd (max 5 Mo)' },
      { status: 413 }
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
        { error: `Format non supporté. Utilisez JPEG, PNG ou WebP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop lourd (max 5 Mo)` },
        { status: 400 }
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
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Bucket is now public — return the permanent CDN URL alongside a
    // 1h signed URL for any legacy callers that still expect the latter.
    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);
    const { data: signedData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    return NextResponse.json({
      path,
      publicUrl: publicData.publicUrl,
      signedUrl: signedData?.signedUrl ?? null,
    });
  } catch (error) {
    console.error('Vehicle photo upload error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload.' },
      { status: 500 }
    );
  }
}

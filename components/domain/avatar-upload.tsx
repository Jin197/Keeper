'use client';

import { useRef, useState, useTransition } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { updateAvatarAction } from '@/server/actions/profile';

interface Props {
  fullName: string;
  initialAvatarUrl?: string | null;
  size?: 'md' | 'lg';
}

/**
 * Drop-in upload UI for the user's profile picture.
 *
 * - Click the avatar (or the "Changer" button) to pick a file
 * - Uploads to /api/upload/avatar (Supabase storage, public `avatars` bucket)
 * - Persists the resulting public URL on `profiles.avatar_url` via
 *   updateAvatarAction so the Topbar / Sidebar reflect the change on
 *   next render.
 */
export function AvatarUpload({
  fullName,
  initialAvatarUrl,
  size = 'lg',
}: Props) {
  const t = useTranslations('photoUpload');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialAvatarUrl ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('unsupportedFormat'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('avatarTooHeavy'));
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Échec de l'upload.");
        return;
      }

      const url = data.publicUrl as string;
      setAvatarUrl(url);
      startTransition(async () => {
        const persist = await updateAvatarAction(url);
        if (persist.error) {
          toast.error(persist.error);
          return;
        }
        toast.success(t('avatarUpdated'));
      });
    } catch (err) {
      console.error('Avatar upload failed', err);
      toast.error("Impossible d'envoyer la photo. Réessaie.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setAvatarUrl(null);
    startTransition(async () => {
      const res = await updateAvatarAction(null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t('avatarRemoved'));
    });
  };

  const busy = isUploading || pending;

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={handlePick}
        disabled={busy}
        aria-label="Changer la photo de profil"
        className="relative group rounded-full disabled:opacity-50"
      >
        <Avatar
          name={fullName}
          src={avatarUrl}
          size={size}
        />
        <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </button>

      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePick}
          disabled={busy}
        >
          {avatarUrl ? t('changePhoto') : t('addPhoto')}
        </Button>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={busy}
            className="text-muted-foreground hover:text-destructive gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Retirer
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">
          JPEG, PNG ou WebP · max 2 Mo
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

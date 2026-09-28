'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface VehiclePhotoUploadProps {
  /** Hidden input name for form submission */
  name?: string;
  /** Callback when upload completes */
  onUploaded?: (path: string, url: string) => void;
}

export function VehiclePhotoUpload({ name = 'imageUrl', onUploaded }: VehiclePhotoUploadProps) {
  const t = useTranslations('photoUpload');
  const [preview, setPreview] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    // Client-side validation
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('unsupportedFormat'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('fileTooHeavy'));
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(50);

      const res = await fetch('/api/upload/vehicle-photo', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('uploadError'));
      }

      const { path, signedUrl } = await res.json();
      setStoragePath(path);
      setUploadProgress(100);

      // Use signed URL for preview if available
      if (signedUrl) {
        URL.revokeObjectURL(localUrl);
        setPreview(signedUrl);
      }

      onUploaded?.(path, signedUrl || localUrl);
      toast.success(t('uploadSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('uploadError'));
      setPreview(null);
      setStoragePath('');
    } finally {
      setIsUploading(false);
    }
  }, [onUploaded, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStoragePath('');
    setUploadProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Hidden input to include path in form data */}
      <input type="hidden" name={name} value={storagePath} />

      {preview ? (
        /* ── Preview state ── */
        <div className="relative group rounded-card overflow-hidden border border-border">
          <img
            src={preview}
            alt="Photo du véhicule"
            className="w-full aspect-[16/9] object-cover"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-colors"
              title={t('changePhoto')}
              aria-label={t('changePhoto')}
            >
              <Camera className="h-5 w-5 text-white" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={removePhoto}
              className="p-2.5 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-sm border border-red-500/20 transition-colors"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <X className="h-5 w-5 text-red-400" aria-hidden="true" />
            </button>
          </div>

          {/* Upload status badge */}
          {isUploading ? (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-xs text-white">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('uploading')}
            </div>
          ) : storagePath ? (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-eco/20 backdrop-blur-sm text-xs text-eco">
              <CheckCircle2 className="h-3 w-3" />
              {t('registered')}
            </div>
          ) : null}

          {/* Progress bar */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
              <div
                className="h-full bg-keeper transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── Drop zone state ── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          aria-label={t('addPhoto')}
          className={`
            w-full aspect-[16/9] rounded-card border-2 border-dashed
            transition-all duration-200 ease-out
            flex flex-col items-center justify-center gap-3
            cursor-pointer
            ${isDragOver
              ? 'border-keeper bg-keeper/10 scale-[1.01]'
              : 'border-border hover:border-keeper/50 hover:bg-keeper/5'
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-keeper animate-spin" />
              <span className="text-sm text-muted-foreground">{t('uploading')}</span>
            </>
          ) : isDragOver ? (
            <>
              <Upload className="h-8 w-8 text-keeper animate-bounce" />
              <span className="text-sm text-keeper font-medium">{t('dropHere')}</span>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-muted/50">
                <ImageIcon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-foreground">
                  {t('addPhoto')}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('dragDropHint')}
                </p>
              </div>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Camera,
  Upload,
  ScanLine,
  CameraOff,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OcrScannerProps {
  /** Called with the captured image, ready to be sent to /api/ocr. */
  onCapture?: (file: File) => void;
  /** Triggers the host's hidden <input type=file> so the user can pick from disk. */
  onUpload?: () => void;
  /** Whether the parent is currently running OCR — we freeze the UI while true. */
  scanning?: boolean;
}

/**
 * Live-camera ticket capture. On mount we try to attach the device's
 * back-facing camera to a <video>; if that fails (no permission, no
 * camera, desktop without webcam) we degrade gracefully to the upload
 * fallback. The user can also force-fall-back via the "Pas de caméra"
 * button which is always visible.
 *
 * The "Capturer" button draws the current frame onto an offscreen
 * <canvas>, encodes it as JPEG and hands a real `File` to the parent so
 * the OCR pipeline gets actual pixels — no more fake "TotalEnergies"
 * placeholder data.
 */
export function OcrScanner({ onCapture, onUpload, scanning }: OcrScannerProps) {
  const t = useTranslations('scan');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'requesting' | 'live' | 'denied' | 'unsupported'
  >('idle');

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraStatus('unsupported');
        return;
      }
      setCameraStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStatus('live');
      } catch (err) {
        // NotAllowedError, NotFoundError, NotReadableError…
        // In every case the upload path stays available, no need to surface
        // a specific error per case.
        setCameraStatus('denied');
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || cameraStatus !== 'live') return;

    // Use the video's native resolution so the OCR has the most pixels.
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;

    const file = new File([blob], `receipt-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    onCapture?.(file);
  };

  const handleRetry = () => {
    // Re-trigger the effect by changing key would be cleaner, but a tiny
    // local reload of the stream is enough here.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraStatus('idle');
    setTimeout(async () => {
      try {
        setCameraStatus('requesting');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStatus('live');
      } catch {
        setCameraStatus('denied');
      }
    }, 30);
  };

  return (
    <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-card overflow-hidden bg-anthra border border-border">
      {/* Live camera feed. Always rendered so the ref is attached; hidden
          via opacity when the stream isn't ready, so we don't flash. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={
          cameraStatus === 'live'
            ? 'absolute inset-0 h-full w-full object-cover'
            : 'absolute inset-0 h-full w-full object-cover opacity-0'
        }
      />

      {/* Idle / requesting / fallback overlay */}
      {cameraStatus !== 'live' && (
        <div className="absolute inset-0 bg-gradient-to-b from-anthra-500 via-anthra-700 to-anthra-900 flex items-center justify-center text-muted-foreground/60">
          {cameraStatus === 'requesting' ? (
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-12 w-12 animate-pulse" strokeWidth={0.75} />
              <span className="text-xs">{t('cameraStarting')}</span>
            </div>
          ) : cameraStatus === 'denied' ? (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <CameraOff className="h-12 w-12 text-amber-400" strokeWidth={1} />
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t('cameraUnavailable')}
                </div>
                <p className="text-xs mt-1 max-w-[16rem]">
                  {t('cameraHint')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RotateCcw className="h-3.5 w-3.5" /> {t('retry')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-16 w-16" strokeWidth={0.75} />
              <span className="text-xs">{t('cameraUnsupported')}</span>
            </div>
          )}
        </div>
      )}

      {/* Frame guides */}
      <div className="absolute inset-6 border-2 border-eco/40 rounded-card pointer-events-none">
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-eco rounded-tl-card" />
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-eco rounded-tr-card" />
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-eco rounded-bl-card" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-eco rounded-br-card" />
      </div>

      {/* Laser sweep */}
      {scanning && (
        <div className="absolute inset-6 overflow-hidden rounded-card pointer-events-none">
          <div
            className="absolute inset-x-0 h-1 bg-gradient-to-b from-transparent via-eco to-transparent animate-laser-sweep"
            style={{
              boxShadow: '0 0 20px 4px rgba(46, 204, 113, 0.6)',
            }}
          />
        </div>
      )}

      {/* Status badge */}
      {scanning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-pill bg-eco/20 border border-eco/30 px-3 py-1.5 text-eco text-xs font-medium backdrop-blur">
          <ScanLine className="h-3.5 w-3.5 animate-pulse" />
          {t('analysing')}
        </div>
      )}

      {/* Actions */}
      <div className="absolute bottom-4 inset-x-4 flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          size="lg"
          onClick={handleCapture}
          disabled={scanning || cameraStatus !== 'live'}
        >
          <Camera className="h-4 w-4" /> {t('capture')}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={onUpload}
          disabled={scanning}
          className="bg-white/10 backdrop-blur"
          title={t('importGallery')}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

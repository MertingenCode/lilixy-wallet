"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/hooks/use-locale";

function addressFromQr(value: string): string | null {
  const match = value.match(/0x[a-fA-F0-9]{40}/u);
  return match?.[0] ?? null;
}

export function QrScannerDialog({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (address: string) => void;
}) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onResultRef = useRef(onResult);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onResultRef.current = onResult;
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange, onResult]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    function stop() {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function start() {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("send.cameraUnsupported"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const scan = () => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (video.videoWidth > 0 && video.videoHeight > 0 && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            });
            if (context) {
              context.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const image = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const code = jsQR(image.data, image.width, image.height, {
                inversionAttempts: "dontInvert",
              });
              if (code?.data) {
                const address = addressFromQr(code.data);
                if (address) {
                  onResultRef.current(address);
                  onOpenChangeRef.current(false);
                  return;
                }
              }
            }
          }
          frameRef.current = requestAnimationFrame(scan);
        };
        scan();
      } catch {
        setError(t("send.cameraError"));
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-[1.5rem]">
            {t("send.scanTitle")}
          </DialogTitle>
          <DialogDescription>{t("send.scanDescription")}</DialogDescription>
        </DialogHeader>
        <div className="bg-shade relative aspect-square overflow-hidden rounded-[18px]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full object-cover"
          />
          <div className="pointer-events-none absolute inset-6 rounded-[18px] border-2 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-shade/80 p-6 text-center text-sm text-white">
              {error}
            </div>
          ) : null}
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </DialogContent>
    </Dialog>
  );
}

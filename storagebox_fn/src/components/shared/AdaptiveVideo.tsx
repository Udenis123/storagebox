import { useEffect, useRef, type SyntheticEvent } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";

type AdaptiveVideoProps = {
  src: string;
  streamSrc?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  posterTime?: number;
  onLoadedMetadata?: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onError?: () => void;
};

/**
 * Plays adaptive HLS when a stream is ready (quality follows bandwidth, with a deep
 * preload buffer). Falls back to progressive MP4/MOV when packaging is still running.
 */
export function AdaptiveVideo({
  src,
  streamSrc,
  className,
  autoPlay,
  muted,
  posterTime,
  onLoadedMetadata,
  onError,
}: AdaptiveVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const progressive = posterTime !== undefined ? `${src}#t=${posterTime}` : src;
    let hls: Hls | undefined;

    const loadProgressive = () => {
      video.src = progressive;
      video.load();
    };

    if (streamSrc && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        startLevel: -1,
        abrEwmaDefaultEstimate: 2_000_000,
      });
      hls.loadSource(streamSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        hls?.destroy();
        hls = undefined;
        loadProgressive();
      });
    } else if (streamSrc && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamSrc;
    } else {
      loadProgressive();
    }

    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, streamSrc, posterTime]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay={autoPlay}
      muted={muted}
      preload="auto"
      onLoadedMetadata={onLoadedMetadata}
      onError={onError}
      className={cn("bg-black", className)}
    />
  );
}

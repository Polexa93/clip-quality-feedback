import { useEffect, useState } from "react";
import type { ClipType } from "@cqf/shared";
import { getYouTubeThumbnailUrl, getYouTubeVideoId } from "../lib/youtube";

export const CLIP_TYPE_ICON: Record<ClipType, string> = {
  tutorial: "🎓",
  podcast: "🎙️",
  interview: "🗣️",
  commentary: "💬",
  highlight: "⭐",
  other: "🎬",
};

// Small in-memory cache so navigating away and back (or the list re-fetching)
// doesn't regenerate the same thumbnail from scratch every time.
const thumbCache = new Map<string, string>();

interface ClipThumbnailProps {
  videoUrl: string;
  clipType: ClipType;
}

/**
 * Renders a real video preview: YouTube links use YouTube's own thumbnail
 * image; other clips get a real frame captured by loading the video
 * off-screen, seeking, and snapshotting it onto a canvas — no server changes
 * or ffmpeg needed. Falls back to a type icon for external URLs that block
 * hotlinking/CORS or fail to load.
 */
export function ClipThumbnail({ videoUrl, clipType }: ClipThumbnailProps) {
  const youTubeId = getYouTubeVideoId(videoUrl);
  const [thumb, setThumb] = useState<string | null>(
    youTubeId ? getYouTubeThumbnailUrl(youTubeId) : thumbCache.get(videoUrl) ?? null
  );

  useEffect(() => {
    // YouTube URLs aren't playable as a raw <video> src, so we can't seek
    // and snapshot a frame — use YouTube's own thumbnail image instead.
    if (youTubeId) {
      setThumb(getYouTubeThumbnailUrl(youTubeId));
      return;
    }

    const cached = thumbCache.get(videoUrl);
    if (cached) {
      setThumb(cached);
      return;
    }
    setThumb(null);

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    let cancelled = false;

    function capture() {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        thumbCache.set(videoUrl, dataUrl);
        if (!cancelled) setThumb(dataUrl);
      } catch {
        // Cross-origin video without CORS headers taints the canvas —
        // silently fall back to the icon.
      }
    }

    function onLoadedMetadata() {
      try {
        video.currentTime = Math.min(1, (video.duration || 1) / 2);
      } catch {
        capture();
      }
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("seeked", capture);

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("seeked", capture);
      video.src = "";
    };
  }, [videoUrl, youTubeId]);

  if (thumb) {
    return <img className="clip-card__thumb clip-card__thumb--img" src={thumb} alt="" />;
  }

  return <div className="clip-card__thumb">{CLIP_TYPE_ICON[clipType]}</div>;
}

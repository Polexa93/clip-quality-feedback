// YouTube "watch" URLs are HTML pages, not direct video files — a plain
// <video src="..."> can't play them. These helpers detect a YouTube link and
// derive the embeddable player URL / thumbnail image, so the UI can render
// an <iframe> and a real preview image instead of silently failing.

const YOUTUBE_HOSTS = new Set(["youtube.com", "youtube-nocookie.com"]);

export function getYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return id || null;
  }

  if (YOUTUBE_HOSTS.has(host)) {
    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v");
    }
    const match = parsed.pathname.match(/^\/(?:embed|v|shorts)\/([a-zA-Z0-9_-]{6,})/);
    if (match) return match[1];
  }

  return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

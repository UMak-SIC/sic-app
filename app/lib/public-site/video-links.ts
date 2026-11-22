/**
 * Turns an SDE video link into something the public event page can show (PS-14).
 *
 * YouTube and Vimeo play in an embedded player. Every other platform, and a link
 * whose video cannot be identified, gets a "Watch on <platform>" link that opens
 * in a new tab.
 */

export type VideoLink = {
  platform: string;
  embedUrl: string | null;
  watchUrl: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m)\./, "");
  const candidate =
    host === "youtu.be"
      ? url.pathname.slice(1).split("/")[0]
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : /^\/(shorts|embed|live)\/([^/]+)/.exec(url.pathname)?.[2];
  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

const NAMED_PLATFORMS: Record<string, string> = {
  "facebook.com": "Facebook",
  "fb.watch": "Facebook",
  "tiktok.com": "TikTok",
  "instagram.com": "Instagram",
  "drive.google.com": "Google Drive",
};

export function describeVideoLink(value: string): VideoLink | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^(www|m)\./, "");

  if (host === "youtube.com" || host === "youtu.be") {
    const id = youtubeId(url);
    return {
      platform: "YouTube",
      embedUrl: id ? `https://www.youtube-nocookie.com/embed/${id}` : null,
      watchUrl: value,
    };
  }

  if (host === "vimeo.com") {
    const id = /^\/(\d+)/.exec(url.pathname)?.[1];
    return {
      platform: "Vimeo",
      embedUrl: id ? `https://player.vimeo.com/video/${id}` : null,
      watchUrl: value,
    };
  }

  return { platform: NAMED_PLATFORMS[host] ?? host, embedUrl: null, watchUrl: value };
}

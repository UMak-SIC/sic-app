import { expect, test } from "vitest";

import { describeVideoLink } from "@/lib/public-site/video-links";

test("embeds YouTube links in the privacy-enhanced player", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  ]) {
    expect(describeVideoLink(url), url).toEqual({
      platform: "YouTube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      watchUrl: url,
    });
  }
});

test("embeds Vimeo links", () => {
  expect(describeVideoLink("https://vimeo.com/76979871")).toEqual({
    platform: "Vimeo",
    embedUrl: "https://player.vimeo.com/video/76979871",
    watchUrl: "https://vimeo.com/76979871",
  });
});

test("offers a watch link when a platform cannot be embedded", () => {
  expect(describeVideoLink("https://www.facebook.com/umaksic/videos/123")).toEqual({
    platform: "Facebook",
    embedUrl: null,
    watchUrl: "https://www.facebook.com/umaksic/videos/123",
  });
  expect(describeVideoLink("https://fb.watch/abc123/")?.platform).toBe("Facebook");
  expect(describeVideoLink("https://www.tiktok.com/@umaksic/video/1")?.platform).toBe("TikTok");
  expect(describeVideoLink("https://example.org/sde.mp4")).toMatchObject({
    platform: "example.org",
    embedUrl: null,
  });
});

test("ignores links that are not https or have no video id", () => {
  expect(describeVideoLink("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
  expect(describeVideoLink("javascript:alert(1)")).toBeNull();
  expect(describeVideoLink("not a link")).toBeNull();
  expect(describeVideoLink("https://www.youtube.com/watch")).toMatchObject({
    platform: "YouTube",
    embedUrl: null,
  });
});

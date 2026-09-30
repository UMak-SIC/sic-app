import "server-only";

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export type MarkdownCompileOptions = {
  /**
   * Host that email images must come from, normally the Neon Object Storage
   * endpoint. Overridable so tests do not depend on deployment configuration.
   * Defaults to `AWS_ENDPOINT_URL_S3`.
   */
  allowedImageHost?: string;
};

// US-13 requires that Markdown render to email HTML with no way to smuggle
// markup or behaviour through. The allowlist is deliberately narrower than what
// Markdown can express: anything not named here is dropped, not escaped.
const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "sub",
  "sup",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

// No `style` anywhere: inline CSS is both a tracking vector and a way to break
// an email client's layout. No `on*` handlers, so no script execution.
const ALLOWED_ATTRIBUTES = {
  // `rel` and `target` are added by the transform below, so they must be
  // allowlisted or sanitize-html strips them straight back off again.
  a: ["href", "title", "rel", "target"],
  img: ["src", "alt", "title", "width", "height"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  code: ["class"],
};

// Links may only point somewhere a recipient can safely follow.
const ALLOWED_SCHEMES = ["http", "https", "mailto"];

function storageImageHost(): string {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();

  if (!endpoint) {
    throw new Error("AWS_ENDPOINT_URL_S3 is required to compile email images.");
  }

  let host: string;

  try {
    host = new URL(endpoint).host;
  } catch {
    throw new Error("AWS_ENDPOINT_URL_S3 must be a valid URL.");
  }

  if (!host) {
    throw new Error("AWS_ENDPOINT_URL_S3 must include a host.");
  }

  return host;
}

function isAllowedImageSource(source: string, allowedHost: string): boolean {
  let url: URL;

  try {
    // The base must be an absolute URL. Passing the bare host here made
    // `new URL` throw and silently rejected every image, including valid ones.
    url = new URL(source, `https://${allowedHost}`);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return false;
  }

  // Host match only. Path, bucket, and object key are free-form within the
  // account, so they are not constrained here.
  return url.host === allowedHost;
}

/**
 * Compiles Markdown into email-safe HTML.
 *
 * US-12 and US-13: the composer is Markdown-first, and the rendered result must
 * contain only the tags, attributes, and URL schemes named above. US-14: images
 * must already live in Neon Object Storage, so their host is pinned.
 */
export function compileMarkdown(
  markdown: string,
  options: MarkdownCompileOptions = {},
): string {
  const allowedImageHost = options.allowedImageHost ?? storageImageHost();
  const html = marked.parse(markdown, { async: false });

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesAppliedToAttributes: ["href", "src"],
    // Drop the element entirely rather than leaving a broken tag behind.
    disallowedTagsMode: "discard",
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (tagName, attribs) => {
        const { href, title } = attribs;

        return {
          tagName: "a",
          attribs: {
            ...(href ? { href } : {}),
            ...(title ? { title } : {}),
            // The composer is untrusted content in a shared system; without
            // these a target=_blank link can reach back through window.opener.
            rel: "noopener noreferrer",
            target: "_blank",
          },
        };
      },
      img: (tagName, attribs) => {
        const src = attribs.src ?? "";

        if (!isAllowedImageSource(src, allowedImageHost)) {
          return { tagName: "img", attribs: {} };
        }

        return {
          tagName: "img",
          attribs: {
            src,
            ...(attribs.alt ? { alt: attribs.alt } : {}),
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(attribs.width ? { width: attribs.width } : {}),
            ...(attribs.height ? { height: attribs.height } : {}),
          },
        };
      },
    },
    // Runs after transformTags, so it sees the rewritten attributes.
    exclusiveFilter(frame) {
      return frame.tag === "img" && Object.keys(frame.attribs).length === 0;
    },
  });
}

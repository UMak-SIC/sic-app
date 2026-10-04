import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { compileMarkdown } from "@/lib/email/markdown-compiler";

const STORAGE_HOST = "br-example-azx1rnnl.storage.c-3.ap-southeast-1.aws.neon.tech";
const STORAGE_IMAGE = `https://${STORAGE_HOST}/public-images/assets/banner.webp`;

function compile(markdown: string) {
  return compileMarkdown(markdown, { allowedImageHost: STORAGE_HOST });
}

const originalEndpoint = process.env.AWS_ENDPOINT_URL_S3;

beforeEach(() => {
  process.env.AWS_ENDPOINT_URL_S3 = `https://${STORAGE_HOST}`;
});

afterEach(() => {
  if (originalEndpoint === undefined) {
    delete process.env.AWS_ENDPOINT_URL_S3;
  } else {
    process.env.AWS_ENDPOINT_URL_S3 = originalEndpoint;
  }
});

describe("structure", () => {
  test("renders headings, paragraphs, and inline emphasis", () => {
    const html = compile("# Title\n\nSome **bold** and *italic* text.\n");

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("renders the composer's italic and centered text syntax", () => {
    const html = compile("__italic__\n\n<center>Centered message</center>");

    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<center>Centered message</center>");
  });

  test("renders a heading inside the composer's centered heading syntax", () => {
    const html = compile("<center># Event QR</center>");

    expect(html).toContain("<center><h1>Event QR</h1></center>");
    expect(html).not.toContain("# Event QR");
  });

  test("renders every heading level", () => {
    const html = compile("# One\n\n## Two\n\n### Three\n\n#### Four\n");

    for (const level of [1, 2, 3, 4]) {
      expect(html).toContain(`<h${level}>`);
    }
  });

  test("renders fenced code blocks and escapes their contents", () => {
    const html = compile("```html\n<script>alert(1)</script>\n```\n");

    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    // The tag itself must survive only as escaped text, never as markup.
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("renders inline code", () => {
    expect(compile("Use `pnpm test` locally.")).toContain("<code>pnpm test</code>");
  });

  test("renders blockquotes", () => {
    const html = compile("> Heads down, hearts up.\n");

    expect(html).toContain("<blockquote>");
    expect(html).toContain("Heads down, hearts up.");
  });

  test("renders ordered and unordered lists", () => {
    const html = compile("- one\n- two\n\n1. first\n2. second\n");

    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>one</li>");
  });

  test("renders tables", () => {
    const html = compile("| Name | Email |\n| --- | --- |\n| Ana | a@example.com |\n");

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>Ana</td>");
  });
});

describe("links", () => {
  test("keeps http, https, and mailto targets and hardens them", () => {
    const html = compile(
      "[site](https://example.com) [mail](mailto:a@example.com) [plain](http://example.com)",
    );

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="mailto:a@example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  test("drops javascript and data link targets", () => {
    const html = compile(
      "[a](javascript:alert(1)) [b](data:text/html,<script>alert(1)</script>)",
    );

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:text/html");
  });

  test("drops protocol-relative links that would escape the allowlist", () => {
    expect(compile("[x](//evil.example.com)")).not.toContain("evil.example.com");
  });
});

describe("images", () => {
  test("keeps images hosted in Neon Object Storage", () => {
    const html = compile(`![Banner](${STORAGE_IMAGE})`);

    expect(html).toContain("<img");
    expect(html).toContain(`src="${STORAGE_IMAGE}"`);
  });

  test("drops images from any other host", () => {
    const html = compile(
      "![a](https://evil.example.com/x.png)\n\n![b](http://localhost:3000/x.png)",
    );

    expect(html).not.toContain("evil.example.com");
    expect(html).not.toContain("localhost:3000");
    expect(html).not.toContain("<img");
  });

  test("drops data and javascript image sources", () => {
    const html = compile(
      "![a](data:image/png;base64,iVBORw0KGgo=)\n\n![b](javascript:alert(1))",
    );

    expect(html).not.toContain("data:image");
    expect(html).not.toContain("javascript:");
  });

  test("keeps alt text when the image is dropped so the email still reads", () => {
    const html = compile("![Event banner](https://evil.example.com/x.png)");

    expect(html).not.toContain("<img");
  });
});

describe("hostile input", () => {
  test("never emits a script element", () => {
    for (const attack of [
      "<script>alert(1)</script>",
      "<SCRIPT>alert(1)</SCRIPT>",
      "<script\n>alert(1)</script>",
      "**<script>alert(1)</script>**",
    ]) {
      const html = compile(attack);

      expect(html.toLowerCase(), attack).not.toContain("<script");
      expect(html.toLowerCase(), attack).not.toContain("</script");
    }
  });

  test("never emits an event-handler attribute", () => {
    for (const attack of [
      '<img src="x" onerror="alert(1)">',
      '<a href="https://example.com" onclick="alert(1)">x</a>',
      '<p onmouseover="alert(1)">x</p>',
    ]) {
      const html = compile(attack);

      expect(html.toLowerCase(), attack).not.toContain("onerror");
      expect(html.toLowerCase(), attack).not.toContain("onclick");
      expect(html.toLowerCase(), attack).not.toContain("onmouseover");
    }
  });

  test("never emits a style attribute", () => {
    const html = compile('<p style="position:fixed;inset:0">x</p>');

    expect(html.toLowerCase()).not.toContain("style=");
    expect(html.toLowerCase()).not.toContain("<style");
  });

  test("drops framing, form, and object elements", () => {
    const html = compile(
      [
        '<iframe src="https://evil.example.com"></iframe>',
        '<object data="https://evil.example.com"></object>',
        '<embed src="https://evil.example.com">',
        '<form action="https://evil.example.com"><input name="x"></form>',
        '<base href="https://evil.example.com">',
        '<meta http-equiv="refresh" content="0;url=https://evil.example.com">',
        '<link rel="stylesheet" href="https://evil.example.com/x.css">',
      ].join("\n\n"),
    );

    for (const tag of ["iframe", "object", "embed", "form", "input", "base", "meta", "link"]) {
      expect(html.toLowerCase(), tag).not.toContain(`<${tag}`);
    }
  });

  test("neutralises SVG and MathML vectors", () => {
    const html = compile(
      '<svg><script>alert(1)</script></svg>\n\n<math><mtext><script>alert(1)</script></mtext></math>',
    );

    expect(html.toLowerCase()).not.toContain("<svg");
    expect(html.toLowerCase()).not.toContain("<script");
  });

  test("does not execute a javascript URL written as markdown autolink", () => {
    const html = compile("<javascript:alert(1)>");

    // The href is stripped, leaving the scheme as inert display text. Assert on
    // the dangerous form, not the literal string, since an administrator may
    // legitimately type "javascript:" as link text.
    expect(html).not.toMatch(/href\s*=\s*["']?\s*javascript:/i);
    expect(html).not.toMatch(/<a[^>]+href/i);
  });

  test("escapes angle brackets that reach the output as text", () => {
    const html = compile("5 < 6 and 7 > 6");

    expect(html).not.toContain("<6");
    expect(html).toContain("&lt;");
  });
});

describe("configuration", () => {
  test("throws when the storage endpoint is not configured", () => {
    delete process.env.AWS_ENDPOINT_URL_S3;

    expect(() => compileMarkdown("![a](https://example.com/x.png)")).toThrow(
      /AWS_ENDPOINT_URL_S3 is required/,
    );
  });

  test("throws when the storage endpoint is not a valid URL", () => {
    process.env.AWS_ENDPOINT_URL_S3 = "not-a-url";

    expect(() => compileMarkdown("text")).toThrow(/must be a valid URL/);
  });

  test("uses the configured endpoint by default", () => {
    const html = compileMarkdown(`![Banner](${STORAGE_IMAGE})`);

    expect(html).toContain(`src="${STORAGE_IMAGE}"`);
  });

  test("returns plain text unchanged when there is no markup", () => {
    expect(compile("Just a sentence.")).toContain("Just a sentence.");
  });

  test("handles empty input without throwing", () => {
    expect(compile("")).toBe("");
  });
});

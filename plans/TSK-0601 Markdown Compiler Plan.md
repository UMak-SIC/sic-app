## Goal

Compile the composer's Markdown into email-safe HTML, supporting headings, fenced
code, blockquotes, and images, with an allowlist narrow enough that no
administrator-authored content can inject markup or behaviour into a recipient's
mail client. US-12 and US-13 define the composer contract; US-14 requires images
to come from Neon Object Storage.

This is the highest-risk task in the sprint. A permissive sanitizer here is a
mail-client injection vector against every recipient in an event.

## Source Of Truth

- GitHub child issue [#31: TSK-0601 safe Markdown-to-HTML compiler](https://github.com/UMak-SIC/sic-app/issues/31)
- GitHub epic [#59: EPIC-06 Email Composer, Markdown Engine & QR Ticket Generation](https://github.com/UMak-SIC/sic-app/issues/59)
- `docs/traceability-matrix.md` (TSK-0601, US-12, US-13, US-14)
- `CONTRIBUTING.md` and `docs/traceability-matrix.md` testing decisions: test behaviour and contracts, and use hostile fixtures rather than happy paths
- `neon.ts` (buckets `private-images` / `public-images`)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- The composer UI and its preview drawer (TSK-0604, #34).
- Attaching images to a campaign. `campaign_assets` and the
  `header` / `inline` / `attachment` roles are an existing schema gap with no
  owning task; see the open question.
- The QR ticket or its image (TSK-0602, TSK-0603).
- Any Markdown extension beyond what US-12 and US-13 name.

## Execution Order

Single self-contained slice. Branches directly from `dev`; it has no dependency
on the EPIC-02, EPIC-05, or queue work.

## PR Stacking Strategy

```
dev
`-- feat/tsk-0601-markdown-compiler -> dev
```

Independent of Stacks A, B, and D.

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #59 owns children #31 through #35. This PR
completes #31. #32 and #33 stack on nothing; #34 needs the preview surface.

### 1. Use maintained libraries, not a hand-rolled parser

`marked` 18.0.14 for Markdown and `sanitize-html` 2.17.7 for sanitising, plus
`@types/sanitize-html` since the package ships no types.

This is the one place in the sprint where a library is not optional. A hand-rolled
Markdown parser plus a hand-rolled HTML sanitizer would mean owning two
security-sensitive parsers for no benefit. By contrast TSK-0501 hand-rolled
deliberately, because validating a length and a shape is not parsing untrusted
markup.

`sanitize-html` is unmaintained upstream. It is still the de facto Node
allowlist sanitiser, its behaviour is stable, and the allowlist below constrains
what it can emit regardless. Worth revisiting if a maintained alternative appears.

### 2. Allowlist, not blocklist

`ALLOWED_TAGS` and `ALLOWED_ATTRIBUTES` name what may survive. Anything not named
is discarded, so an unanticipated tag or attribute is dropped by default rather
than needing to be anticipated and blocked.

Deliberate omissions:

- No `style` attribute and no `style` tag. Inline CSS is both a tracking vector
  and a reliable way to break an email client's layout.
- No `on*` attributes, so no script execution.
- No `iframe`, `object`, `embed`, `form`, `input`, `base`, `meta`, or `link`, so
  no framing, no credential capture, and no `<meta http-equiv="refresh">` redirect.

### 3. Pin images to the storage host

US-14 requires images to live in Neon Object Storage. An `img` whose `src` does
not resolve to the configured endpoint host is dropped entirely, which also
defeats third-party tracking pixels and `data:` payloads.

Only the **host** is compared. Bucket, path, and object key are free-form within
the account, so `public-images/assets/x.webp` and any other path are both
accepted. Constraining the path would couple the compiler to the upload route's
key format for no security gain.

The transform returns an attribute-less `img` and `exclusiveFilter` then discards
it, so a rejected image leaves no empty tag behind. `exclusiveFilter` runs after
`transformTags` and therefore sees the rewritten attributes, which is verified
directly against the installed library.

### 4. Harden outbound links

`rel="noopener noreferrer"` and `target="_blank"` are added to every link. The
composer is untrusted content in a shared system, and without `noopener` a
`target="_blank"` link reaches back through `window.opener`.

`rel` and `target` must therefore appear in `ALLOWED_ATTRIBUTES.a`, or
`sanitize-html` strips them straight back off. The first draft omitted them and
the transform silently did nothing; a test now pins their presence.

### 5. Read the endpoint from configuration, overridable for tests

The allowed host comes from `AWS_ENDPOINT_URL_S3`, the same variable the upload
path uses, so the compiler and the uploader cannot disagree about where images
live. A missing or malformed value throws, matching
`getOrganizationTimezone()` and `getNeonStorageClient()` in this codebase, rather
than silently defaulting to "allow all images".

`allowedImageHost` overrides it so tests do not depend on deployment
configuration.

## Bugs Found While Building This

1. **Every image was rejected.** `isAllowedImageSource` called
   `new URL(source, allowedHost)`, passing a bare host as the base. A base must be
   an absolute URL, so the constructor threw and every image took the reject path,
   including valid ones. The tests caught this; the fix is to construct a real
   `https://<host>` base.
2. **Link hardening was a no-op.** `rel` and `target` were added by the transform
   but absent from the attribute allowlist, so `sanitize-html` removed them again.
3. **A test assertion was wrong, not the code.** `<javascript:alert(1)>` renders
   as `<a>javascript:alert(1)</a>`: the `href` is correctly stripped and the
   remaining string is inert display text an administrator may legitimately type.
   The assertion now checks the dangerous form, `href="javascript:`, rather than
   the bare substring.

## Acceptance Criteria

- Headings at every level, paragraphs, emphasis, fenced and inline code,
  blockquotes, ordered and unordered lists, and tables render correctly.
- Code block contents are escaped, so markup inside a fence appears as text and
  never as elements.
- Links keep `http`, `https`, and `mailto` targets, and every link carries
  `rel="noopener noreferrer"` and `target="_blank"`.
- `javascript:`, `data:`, and protocol-relative link targets are dropped.
- Images resolve only from the configured storage host; every other source,
  including `data:` and off-host hosts, is discarded with no empty tag left behind.
- No `<script>` element is ever emitted, including from raw HTML in Markdown and
  from SVG or MathML vectors.
- No `on*` event-handler attribute survives.
- No `style` attribute or `<style>` element survives.
- `iframe`, `object`, `embed`, `form`, `input`, `base`, `meta`, and `link` are all
  dropped.
- A missing or malformed `AWS_ENDPOINT_URL_S3` throws rather than allowing
  arbitrary image hosts.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass, and the CI credential-isolation
  guard reports clean.

## Open Question For Review

The schema has `campaign_assets` with `header` / `inline` / `attachment` roles,
but no DMA entry describes it and no task owns binding assets to a campaign. This
compiler treats every image identically, which satisfies US-14 for inline images
but means the `header` and `attachment` roles are not yet expressed anywhere.

Two follow-ups, neither belonging to this task:

1. Decide how a `header` image is injected into a campaign's email, since a
   Markdown body has no header concept.
2. Add the missing DMA entry so the table is not undocumented.

Raised here because TSK-0604's preview drawer will need both, and the composer UI
cannot be built correctly while the attachment model is undefined.

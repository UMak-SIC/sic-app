## Goal

Render a signed QR ticket as an image that can be embedded in a campaign email
and read by a phone camera. US-15 requires the image to contain the opaque
signed ticket and nothing else.

## Source Of Truth

- GitHub child issue [#33: TSK-0603 QR code image renderer](https://github.com/UMak-SIC/sic-app/issues/33)
- GitHub epic [#59: EPIC-06 Email Composer, Markdown Engine & QR Ticket Generation](https://github.com/UMak-SIC/sic-app/issues/59)
- `docs/traceability-matrix.md` (TSK-0603, US-15)
- `plans/TSK-0602 QR Signer Plan.md` (the token this renders)
- `app/next.config.ts` and the repository's `sharp` usage (existing image handling precedent)

Issue [#2](https://github.com/UMak-SIC/sic-app/issues/2) and the wider traceability
matrix are historical/derived context, not decision inputs.

## Non-Goals

- The scan endpoint. TSK-0902, #47.
- The composer preview drawer. TSK-0604, #34.
- Attaching the image to a `campaigns` record. The `campaign_assets` table has
  `header` / `inline` / `attachment` roles but no owning task; see the open
  question shared with TSK-0601.
- SVG output. See the format decision below.

## Execution Order

Single slice consuming a signed ticket from TSK-0602.

## PR Stacking Strategy

```
feat/tsk-0602-qr-signer
`-- feat/tsk-0603-qr-image-generator -> feat/tsk-0602-qr-signer
```

## Linear Sub-Issue Tracking

No Linear project is configured. Epic #59 owns children #31 through #35. This PR
completes #33, the last of the in-scope EPIC-06 tasks.

### 1. PNG only, not configurable

Email clients render PNG reliably and largely ignore SVG in HTML mail. JPEG and
WebP are also unsafe for a `cid:` source: clients may re-encode them or refuse
them. So the format is fixed rather than exposed, and the media type is returned
alongside the buffer so the caller never has to hardcode the string.

`@zxing/browser` is decode-only, added by PR #78 for the scanner, so it cannot
encode. `qrcode` 1.5.4 is the encoder, with `@types/qrcode`.

### 2. Error correction defaults to M

A ticket may be printed, folded, or scanned off a screen in poor light. Level `M`
tolerates roughly 15% damage, which is the right trade for a code that has to
survive both a phone camera and a printer. It is overridable because a
high-stakes event may want `Q` or `H` at the cost of a larger, denser image.

A test decodes the image back at every level, so a level that produced an
unreadable code would fail rather than pass silently.

### 3. The CID is derived from the ticket

A composer preview and the sent message must reference the **same** Content-ID or
the image does not render in the recipient's client at all. Deriving the CID from
a hash of the ticket makes that agreement automatic: the same ticket always
yields the same CID, with no state to keep in sync between preview and send.

`qrTicketCid` is exported so a message body can build a `cid:` reference without
rendering the image first.

### 4. No verification here

Rendering does not verify the ticket. Verification happens when it is scanned
(TSK-0902), so this function needs no signing secret and a preview can be
rendered without a second signing path. This is a deliberate separation: the
image is a transport, not a gate.

### 5. Length bound and option validation

A signed ticket is roughly 220 characters, comfortably inside byte-mode capacity
at error correction M. `MAX_TICKET_LENGTH` is the true byte-mode limit so an
unexpectedly long token produces a clear error rather than a corrupt or
unreadable code.

`moduleSize` and `margin` are validated up front. An invalid value reaching the
encoder produces a confusing failure or a silently wrong image, neither of which
is acceptable in a path whose whole job is scannability.

## Testing Note

The verification criterion is that the image is **readable** and contains the
ticket. Asserting the encoder's intent is not the same thing, so the suite
decodes each rendered PNG with `jsqr` over `pngjs` and compares the recovered
payload to the signed ticket.

That means a real decode round-trip on every render, at every error correction
level, and across both the buffer and data-URL paths. It also means a silent
encoder regression fails the build rather than shipping an unscannable ticket to
a real event.

`jsqr` and `pngjs` are dev-only and never reach the application bundle.

A meta-test asserting the decoders were installed was written and then removed.
The decode assertions cannot pass vacuously, because a `null` decode is unequal to
a ticket string, so the guard added a brittle relative path for no coverage.

## Bug Found While Building This

`toBuffer` and `toDataURL` spell the output type differently: `"png"` versus
`"image/png"`. The first draft shared one options builder between them, which made
`toDataURL`'s options match neither overload variant, so TypeScript selected the
**callback** signature and `Promise<string>` became `void & Promise<string>`.

Vitest reported 16/16 green because the runtime behaviour was fine; only
`pnpm build` caught it. The two builders are now separate.

## Acceptance Criteria

- A rendered image is a real PNG and reports `image/png`.
- Decoding the image returns exactly the signed ticket, and nothing else.
- The image is a pure function of the ticket, and a different ticket yields a
  different image and CID.
- Images remain decodable at error correction levels L, M, Q, and H.
- A longer ticket produces a larger image, confirming the content is encoded
  rather than a placeholder.
- The Content-ID is deterministic, matches `^qr-ticket-[0-9a-f]{24}$`, and agrees
  between the renderer and `qrTicketCid`.
- The data URL is a `data:image/png;base64,` URL that decodes to the same ticket
  and produces byte-identical output to the buffer renderer.
- An empty, whitespace-only, or over-length ticket is rejected with a clear error.
- Invalid `moduleSize` and `margin` are rejected before reaching the encoder.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

## Open Question For Review

Same gap TSK-0601 raised: `campaign_assets` exists in the schema with
`header` / `inline` / `attachment` roles, but no DMA entry describes it and no
task owns binding a rendered image to a campaign. This module returns a buffer
and a CID, which is the right shape for a `cid:` inline reference, but nothing
yet decides whether a ticket image is an `inline` asset, an `attachment`, or
neither, nor where the CID is recorded so preview and send can agree.

That decision belongs with TSK-0604's preview work and the `campaign_assets` DMA
entry, not here. Raised so the composer UI is not built on an undefined
attachment model.

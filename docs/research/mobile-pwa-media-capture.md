# Mobile PWA camera and microphone constraints

**Ticket:** [#12](https://github.com/Globus007/finance-calc/issues/12)  
**Scope:** Practical constraints for **receipt photo** + **voice recording** capture in mobile Safari / Chrome and installed PWAs (permissions, HTTPS, file input vs `getUserMedia`, backgrounding).  
**Primary sources:** MDN, WebKit/Apple, Chrome for Developers (links in [Sources](#sources)).  
**Date:** 2026-08-04

---

## Executive summary (MVP)

| Capture | Recommended MVP pattern | Why |
| --- | --- | --- |
| **Receipt photo** | `<input type="file" accept="image/*" capture="environment">` (plus optional “from gallery” without `capture`) | Native OS camera UI; returns a `File`/`Blob` ready for vision LLM upload; no live stream lifecycle, fewer permission/background edge cases. |
| **Voice** | `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder`, with MIME negotiation via `MediaRecorder.isTypeSupported` | In-app hold-to-record / start–stop UX; server STT needs a compressed blob. Feature-detect MIME (`audio/webm`, `audio/mp4`, etc.). |
| **HTTPS** | Required for `getUserMedia` / `MediaDevices` | Secure context only; insecure → `navigator.mediaDevices` is `undefined`. |
| **Installed PWA** | Same APIs as browser tab on modern iOS/Android when origin is HTTPS | Home Screen web apps support local capture (fixed historically on iOS); still stop tracks on `pagehide` / visibility loss. |

**Do not** rely on continuous in-page camera preview for receipt MVP unless product requires framing overlays. Prefer one-shot OS capture for photos.

---

## 1. Secure context (HTTPS)

`MediaDevices.getUserMedia()` is available **only in secure contexts** (HTTPS, `localhost`, or `file://` in limited cases). In an insecure context, `navigator.mediaDevices` is `undefined`, so `getUserMedia` cannot be called (attempt yields `TypeError`).

- MDN documents that `getUserMedia` is secure-context-only and that insecure loads make `navigator.mediaDevices` unavailable.
- `NotAllowedError` is also associated with insecure browsing contexts among other denial reasons.

**MVP implication:** Production PWA and preview deploys must be HTTPS. Local Next.js on `localhost` is fine for development.

---

## 2. Permissions model

### 2.1 `getUserMedia` always needs user permission

Per MDN (`MediaDevices.getUserMedia`):

- The method prompts for permission before opening camera or microphone.
- Denial (or global/session block) → promise rejects with `NotAllowedError` (older specs used `SecurityError` for some cases).
- The promise may **neither resolve nor reject** if the user ignores the prompt.
- Browsers may offer once-per-origin persistent grant, but must ask at least the first time.
- Browsers must show indicators that a camera/mic is in use and that permission exists even when not actively recording.

Only a top-level document (or an iframe explicitly allowed via Permissions Policy / `allow`) can request media; otherwise the user is not even prompted.

### 2.2 Permissions Policy (`camera` / `microphone`)

MDN lists Permissions-Policy directives that gate `getUserMedia`:

```http
Permissions-Policy: camera=(self)
Permissions-Policy: microphone=(self)
```

For iframes:

```html
<iframe src="https://example.com" allow="camera; microphone"></iframe>
```

If policy forbids access, browsers that support policy enforcement return `NotAllowedError`.

**MVP implication:** Serve the app from the top-level origin; do not nest capture in third-party iframes without explicit `allow` + policy. Prefer same-origin capture UI.

### 2.3 Chrome one-time permissions (camera / microphone)

Chrome for Developers documents **“Allow this time”** for camera, microphone, and geolocation (desktop rollout from Chrome 116; mobile prompts may differ by version).

- Temporary grant lasts for the current interaction with the origin.
- Expiration conditions include: tab/page closed or discarded, **16 hours** elapsed, manual revoke, or origin in background **≥ 5 minutes** *without* active use of the capability.
- **Camera and microphone may continue in a background tab** while in use; Chrome shows a **tab strip indicator** and delays the 5-minute timer until the page **stops using** the device. The 16-hour timer still runs.
- Permissions API reports one-time and persistent grants both as `granted` while valid; on expiry, status returns to `prompt`. Observe `PermissionStatus.onchange`.

**MVP implication:** Assume mic permission may be session-scoped. Request audio only on explicit “Record” gesture; handle re-prompt on next visit. Stop tracks when recording ends so one-time grants and OS indicators clear cleanly.

### 2.4 Safari / WebKit / iOS system prompts

WebKit documents that camera/microphone access is gated by a **user prompt** similar across Safari and related surfaces. System privacy settings (iOS Settings → Privacy) can revoke access independently of the site prompt.

**MVP implication:** Surface Russian UI copy that explains *why* camera/mic is needed, with a clear control the user taps (permission UX best practice also stressed by Chrome). If permanently blocked, guide the user to iOS/Android site settings.

### 2.5 Transient activation / user gesture

MDN requires **transient user activation** for `getDisplayMedia`, not as a hard universal requirement on `getUserMedia` in the same wording. In practice, mobile Safari and Chrome expect capture to start from a **user gesture** (button click/tap). Auto-starting mic/camera on page load is fragile and poor UX.

**MVP implication:** Wire photo and voice only to explicit buttons; never on first paint.

---

## 3. File input + `capture` vs `getUserMedia`

### 3.1 HTML Media Capture (`<input type="file" capture>`)

MDN (`capture` attribute, `<input type="file">`):

- Supported on `type="file"`.
- Values: `user` (user-facing camera/mic) or `environment` (outward-facing).
- Used with `accept` to indicate image / video / audio.
- On mobile, OS typically offers camera (or microphone) UI; on desktop, often a normal file picker.
- Historical note: `capture` was previously a boolean “prefer device over file picker”.

Examples relevant to MVP:

```html
<!-- Receipt: rear camera preferred -->
<input type="file" accept="image/*" capture="environment" />

<!-- Optional gallery / any image (no capture hint) -->
<input type="file" accept="image/*" />

<!-- Voice memo style (OS-dependent; less control than MediaRecorder) -->
<input type="file" accept="audio/*" capture />
```

**Pros for receipts**

- One shot → one `File` in `change` event; fits “upload → vision LLM → discard image” pipeline.
- No need to manage `MediaStream`, video element, or still-frame canvas.
- OS handles focus, flash, orientation, and permission chrome.

**Cons**

- Less in-app framing control (crop guides, multi-page).
- Desktop UX is usually “pick a file”, not camera.
- MDN marks `capture` as limited availability / not fully Baseline across all desktop browsers; **mobile** is the target and is where it matters.

### 3.2 `getUserMedia` for still photos

MDN “Taking still photos with getUserMedia” describes preview via `<video>` + canvas snapshot. Useful for AR/scan overlays; heavier for a single receipt photo.

Requires:

- Secure context + permission for **video**.
- Stream lifecycle: `track.stop()` when done.
- `playsinline` / muted autoplay patterns on iOS for preview video elements (common WebKit requirement for inline playback).

### 3.3 `getUserMedia` + `MediaRecorder` for voice

MDN MediaStream Recording API:

1. Obtain `MediaStream` (e.g. `getUserMedia({ audio: true })`).
2. `new MediaRecorder(stream, options)`.
3. Listen for `dataavailable` → collect `Blob` chunks.
4. `start()` / `stop()`; optional timeslice.
5. On stop, assemble blobs; stop all tracks.

Feature-detect MIME types:

```js
MediaRecorder.isTypeSupported("audio/webm;codecs=opus");
MediaRecorder.isTypeSupported("audio/mp4");
// then pick first supported and pass as mimeType
```

**WebKit / Safari codec reality (primary sources)**

- WebKit blog (2020, MediaRecorder default on): Safari supported **MP4** with **H.264 / AAC**; example records from camera+mic via `getUserMedia` + `MediaRecorder`.
- Safari **18.4** (WebKit blog, 2025): MediaRecorder adds **WebM** with **Opus** (+ VP8/VP9 for video), fragmented MP4, and more codecs — better cross-browser parity for podcasting-style audio apps.
- Always negotiate with `isTypeSupported` and send the actual `mediaRecorder.mimeType` (or file extension derived from it) to the STT backend.

**Chrome:** typically strong WebM/Opus support for audio-only recording; still call `isTypeSupported`.

---

## 4. Mobile Safari vs Chrome (and installed PWAs)

### 4.1 Engine note (iOS)

On iOS/iPadOS, third-party browsers use WebKit. Capture behavior is largely **WebKit-constrained** everywhere; differences are mostly chrome, permission UI, and PWA install paths—not a separate Chromium media stack on iPhone.

Android Chrome uses Chromium; Android “installed” PWAs (TWA / standalone) use the same secure-origin media APIs when launched as the PWA.

### 4.2 Home Screen / installed PWA

- Historical WebKit bug: `getUserMedia` **did not work** in standalone Home Screen apps; **fixed** (WebKit bug 185448, targeted iOS 13.x era). Treat modern iOS as supporting local capture in Home Screen web apps.
- WebKit notes `getUserMedia` exposure in **WKWebView** when the host app has native capture entitlement (relevant to embedded browsers, not our standalone PWA).
- Safari 18.4: Screen Wake Lock for Home Screen web apps (useful if a long STT wait leaves the screen on—not required for short voice clips).

**MVP implication:** Test capture in **both** Safari tab and Add to Home Screen standalone mode on a physical iPhone, and Chrome (tab + install) on Android. Do not assume desktop Safari alone is sufficient.

### 4.3 Backgrounding and interrupted capture

Practical rules aligned with platform docs and Chrome’s background policy:

| Situation | Expected behavior | App response |
| --- | --- | --- |
| User backgrounds app during **voice recording** | Tracks often end or audio session is interrupted (especially iOS); Chrome desktop may keep mic with indicator, mobile is stricter | Listen for `visibilitychange` / `pagehide`; if `document.hidden`, **stop** `MediaRecorder`, stop tracks, prompt to re-record |
| User backgrounds during **file-input camera** | Capture is in OS UI; returning may deliver `change` or cancel | Handle empty selection; no stream to clean |
| One-time mic grant (Chrome) | Expires after background idle rules (see §2.3) | Re-request on next Record |
| Permission revoked in system Settings | Next `getUserMedia` → `NotAllowedError` | Explain how to re-enable in OS settings |
| Live stream left open | Battery, privacy indicator, blocks other apps from mic/camera | Always `stream.getTracks().forEach(t => t.stop())` after use |

MDN also notes `InvalidStateError` if the document is not fully active when calling `getUserMedia`.

**MVP implication:** Short voice clips (e.g. 5–60s) recorded in-foreground only. No “record while shopping in another app.”

---

## 5. Error catalog (handle in UI)

From MDN `getUserMedia` exceptions (map to Russian user-facing messages later):

| Name | Typical cause |
| --- | --- |
| `NotAllowedError` | Denied permission, Permissions-Policy block, insecure context (also listed) |
| `NotFoundError` | No matching mic/camera for constraints |
| `NotReadableError` | Hardware/OS/browser could not open device (in use elsewhere) |
| `OverconstrainedError` | Constraints impossible (e.g. exotic resolution); use loose `{ audio: true }` for voice |
| `AbortError` | Non-hardware abort after grant |
| `SecurityError` | User-media support disabled on the document |
| `InvalidStateError` | Document not fully active |
| `TypeError` | Empty/false constraints or insecure context (`mediaDevices` undefined) |

For `MediaRecorder`, listen for `error` events; unsupported `mimeType` can throw at construction—fall back to default constructor after `isTypeSupported` checks.

---

## 6. Recommended capture patterns for this product MVP

Product constraints (map #1): online-first PWA; receipt → vision LLM then **discard photo**; voice → **server STT** → LLM draft; confirm draft before save.

### 6.1 Receipt photo (preferred)

```text
[Сфотографировать чек]  →  <input accept="image/*" capture="environment">
[Выбрать из галереи]    →  <input accept="image/*">   // no capture
        ↓ change event → File
        ↓ optional client compress (max edge / JPEG quality)
        ↓ upload to processing endpoint (ephemeral storage only)
        ↓ vision LLM → draft fields
        ↓ discard image per product rule
```

Rationale:

- Matches “one image, process, drop” without WebRTC complexity.
- `environment` prefers rear camera for paper receipts.
- Gallery path covers already-taken photos.

Optional later: in-app `getUserMedia` preview if multi-page or overlay guides become required—not for MVP.

### 6.2 Voice expense (preferred)

```text
User taps [Запись] (user gesture)
  → getUserMedia({ audio: true })  // loose constraints
  → MediaRecorder with first isTypeSupported mime
  → start(); UI shows timer + Stop
User taps [Стоп] or max duration
  → recorder.stop(); tracks.stop()
  → Blob (audio/webm or audio/mp4, …)
  → upload → server STT → LLM draft
On visibility hidden / pagehide / unmount
  → abort recording path; stop tracks; do not upload partial unless product says so
```

MIME negotiation sketch:

```js
const candidates = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
];
const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t));
const recorder = mimeType
  ? new MediaRecorder(stream, { mimeType })
  : new MediaRecorder(stream);
```

Server STT must accept at least **WebM/Opus** (Chrome/Android, modern Safari 18.4+) and **MP4/AAC** (Safari historical default). Prefer detecting `Content-Type` from client.

**Fallback (optional):** `<input type="file" accept="audio/*" capture>` for environments where `MediaRecorder` fails feature detection—worse UX (leaves the app), keep as progressive enhancement only.

### 6.3 What not to do in MVP

- Do not keep camera/mic streams open across draft confirmation screens.
- Do not start capture without a button press.
- Do not assume WebM-only or MP4-only on all devices.
- Do not require `getUserMedia` video solely to take a still receipt photo.
- Do not depend on background recording.
- Do not embed capture in cross-origin iframes.

### 6.4 Minimal test matrix

| Surface | Photo (`input`+`capture`) | Voice (`gUM`+`MediaRecorder`) |
| --- | --- | --- |
| iOS Safari (tab) | Required | Required |
| iOS Home Screen PWA | Required | Required |
| Android Chrome (tab) | Required | Required |
| Android installed PWA | Required | Required |
| Desktop (any) | Gallery/file OK | Optional mic |

---

## 7. Decision for the map

**Capture stack for MVP:**

1. **Photo receipts:** HTML file input with `accept="image/*"` and `capture="environment"`, plus a separate gallery picker without `capture`.
2. **Voice:** `getUserMedia({ audio: true })` + `MediaRecorder` with runtime MIME negotiation; stop tracks on completion and when the document is hidden.
3. **Platform baseline:** HTTPS-only; top-level browsing context; explicit user gesture; handle `NotAllowedError` / missing devices with clear Russian recovery copy.
4. **PWA:** Same implementation for browser and installed modes; verify on real iOS Home Screen and Android install.

This unblocks ephemeral upload design (ticket on temp storage) and STT/vision API choice without requiring native apps.

---

## Sources

1. [MDN: `MediaDevices.getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — secure context, permission, errors, Privacy/Security, Permissions-Policy `camera` / `microphone`, iframe `allow`.
2. [MDN: MediaDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices) — secure context for device APIs.
3. [MDN: Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts) — definition of secure context.
4. [MDN: `capture` HTML attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture) — `user` / `environment`, file input examples for image/audio/video.
5. [MDN: `<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file) — `capture` with `accept`.
6. [MDN: MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) — `MediaRecorder` flow, `isTypeSupported`, `dataavailable`.
7. [MDN: Taking still photos with `getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos) — alternative still-capture approach.
8. [MDN: Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) — permission-aware APIs include camera/microphone.
9. [MDN: `getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) — documents transient activation (contrast with display capture).
10. [WebKit: MediaRecorder API (2020)](https://webkit.org/blog/11353/mediarecorder-api/) — Safari MediaRecorder default; MP4/H.264/AAC; `getUserMedia` example; WKWebView note.
11. [WebKit: Features in Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) — MediaRecorder WebM/Opus; Home Screen Screen Wake Lock; Image Capture API mention.
12. [WebKit bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448) — `getUserMedia` in Home Screen standalone apps (historical gap, fixed).
13. [Chrome for Developers: One-time permissions](https://developer.chrome.com/blog/one-time-permissions) — Allow this time; expiration; camera/mic background + tab indicators; Permissions API `granted` vs `prompt`.
14. [Chrome for Developers: Permissions Policy](https://developer.chrome.com/docs/privacy-security/permissions-policy) — `camera` / feature allowlists and iframe `allow`.
15. [W3C HTML Media Capture](https://w3c.github.io/html-media-capture/#dfn-capture) — spec for `capture` (linked from MDN).

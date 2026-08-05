# Capture error and retry UX (MVP)

MVP has **two** user-facing failure modes on the capture path, plus a separate **Commit** retry on confirm. Media remains ephemeral (ADR-0005): after an extract attempt there is **no** retry of the same Receipt/Recording.

## Modes

### Pre-capture failure

Problems **before** upload/extract starts: permission denied (camera/mic), oversize or wrong type (ADR-0005 limits), offline/no network **before** send, device capture unavailable.

- **Surface:** same **inline capture shell** as Extraction failure (not confirm, not Home-only toast).
- **Copy/CTAs:** specific and actionable where possible (e.g. open settings, pick another file, try when online) + dismiss back to Home.
- Offline **before** upload is pre-capture, not Extraction failure (pipeline never started).

### Extraction failure

Pipeline cannot open a usable Draft after an extract attempt (transport/provider mid-flight, STT/vision/unparseable—ADR-0007). Incomplete Draft (e.g. missing Amount after success) is **not** this mode (ADR-0003: open confirm).

- **Surface:** **inline** on the capture shell for that Channel. Confirm does **not** open.
- **Copy:** one **generic** Russian message + Channel hint (no network-vs-model split, no provider codes).
- **CTAs:** **primary** = new capture of the **same** Channel; **secondary** = dismiss → Home (dock available).
  - **Photo primary:** immediately re-open camera / file capture.
  - **Voice primary:** open voice capture UI **ready**; **do not** auto-start the microphone—user presses record (privacy).
- No “retry same file,” no fake confirm-with-error.

### In-flight extract

While upload → STT/vision → LLM runs: **blocking** progress in the capture shell. **Cancel** aborts the attempt: no Draft, media dropped; this is **not** Extraction failure and not Discard of a Draft (nothing to discard)—user returns to an idle capture/Home state.

Mid-flight network drop after the attempt started → **Extraction failure** (generic).

### Commit failure

Persistence of a confirmed Draft fails (network/server). **Not** Extraction failure: Draft fields already exist client-side (no `drafts` table—ADR-0006).

- Stay on **confirm**.
- **Primary:** retry Commit (same fields).
- **Discard** still ends the Draft without a record.

## Considered options

- **Single fail mode for permission + extract** — rejected: pre-capture is often fixable without a full recapture cycle; extract is always recapture-only.
- **Toast + Home for Extraction failure** — rejected: too easy to miss on mobile; capture context is clearer.
- **Full-screen fail only** — rejected as heavier than needed; inline shell is enough.
- **Retry same media after extract fail** — rejected (ADR-0005).
- **Split Extraction failure copy by cause (network vs model)** — rejected for MVP: same recovery action.
- **Voice recapture auto-starts mic** — rejected: privacy / accidental re-record.
- **Background extract / offline queue** — rejected: online-first, in-flight-only Draft.
- **Commit fail discards Draft** — rejected: user already reviewed fields; retry Commit is cheap.

## Consequences

- Product copy needs two families (pre-capture vs Extraction failure) sharing one shell layout.
- “Retry” in MVP means **Commit retry** or **recapture**, never re-POST of retained media.
- Screen map (prototype #8): fail states hang off capture shell + confirm, not a third primary tab.

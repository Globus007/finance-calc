# Bot chat media pipeline for Expense photo + voice

Bot capture is an **intake adapter** into the **same** server extraction pipeline the PWA uses—not a second extract stack. Under surface roles (PWA primary; Telegram = chat bot Expense-only; no Mini App), **Receipt** (`message.photo`) and **Recording** (`message.voice`) enter temp Storage then `extractDraft({ path, channel })` with the same product size/duration/ephemeral rules (ADR-0005 / ADR-0007 / ADR-0008). **Channel** stays modality only (`photo` | `voice`); Telegram is not a Channel value and is not stored as origin on the record for MVP.

## Intake hop

1. Authorize mapped `telegram_id` (ADR-0009 bot subset); unmapped → deny, no pipeline.
2. **Metadata-first pre-capture:** accept only `message.photo` (largest size) and `message.voice`; reject document/audio/video_note/etc. with a hint. If Telegram reports `voice.duration` > 60 s or known `file_size` above product max → reject **before** download. `getFile`/download failure is **pre-capture** (pipeline never started), not Extraction failure.
3. Download bytes → **write** the same private temp Storage prefix as PWA (`{user_id}/…`) → call **`extractDraft({ path, channel })`** → eager delete (ADR-0005). No in-memory parallel extract seam for MVP.
4. After download, re-check MIME/size; failures remain pre-capture. Photo has **no** client compress on this path (Telegram already delivers a size tier); oversize after download still fails pre-capture.

## Shared product limits (both surfaces)

- **Photo:** ≤ 5 MB; JPEG/PNG/WebP.
- **Voice:** ≤ ~60 s and ≤ 2 MB; product MIME whitelist **includes `audio/ogg`** (Telegram voice notes / Opus) on **both** PWA and bot—expand the shared canonical list rather than a bot-only transcode hop or a bot-only MIME fork.
- Ephemeral media; **no** retry of the same Telegram `file_id` after Extraction failure; recovery = recapture (ADR-0005 / ADR-0008 / ADR-0010).

## Expense-only extract

Bot path **forces Expense Draft** after extract/normalize: no Income Draft, no sticky `/income` / kind mode on this surface. Voice that “sounds like income” still opens an Expense card (user edits fields; no kind switch in chat). Photo remains Expense-only as today.

## Field defaults (bot-specific only)

- Photo **caption** prefills **Note** only if extract left Note empty (same lean as ADR-0010).
- No other bot-only default Amount/Category; Occurred on / Category post-process match PWA extract rules.

## In-flight UX (chat)

Unchanged lean from ADR-0010 under Expense-only: progress message + **Cancel** (abort, no Draft); Extraction failure → generic RU + channel hint → recapture; second media during extract → reject (“wait or Cancel”); new media while Draft card open → implicit Discard + new capture. **Not** in bot: Mini App device APIs or WebView camera/mic fallbacks.

## Considered options

- **Separate bot extract path (bytes-only, no Storage)** — rejected: two seams and lifecycle drift; one `extractDraft(path)` + temp Storage keeps ADR-0005.
- **Same pipeline but soft Telegram-only limits** — rejected: product constraints stay one matrix; only OGG is added **shared**.
- **Transcode OGG → webm/m4a on bot only** — rejected in favor of expanding product MIME for both surfaces (simpler adapter, STT already multi-MIME).
- **Extend Channel with `telegram_photo` / `telegram_voice` or a surface/origin field** — rejected for MVP: Channel = modality (CONTEXT); bot analytics origin not a domain Channel.
- **Always download then validate** — rejected: metadata-first saves bandwidth and clarifies pre-capture vs Extraction failure.
- **Force-reject income-like voice** — rejected: false positives; force Expense Draft is enough.
- **Caption always overwrites Note** — rejected: clobbers good extract merchant/Note.

## Consequences

- Implementation: bot webhook download writer into existing temp bucket + shared `extractDraft`; extend voice MIME helpers/tests for `audio/ogg` on PWA and bot.
- ADR-0010 kind-mode / `/income` sections are **superseded for the bot surface** by Expense-only force (amend when writing destination spec); confirm-card interaction otherwise still applies.
- Map fog “Channel enum for bot vs PWA” is closed: no new Channel values.
- Destination spec should restate this hop and pre-capture matrix; no Mini App media path.

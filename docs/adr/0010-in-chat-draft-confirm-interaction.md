# In-chat Draft confirm interaction model (Telegram bot)

MVP bot path: capture from private chat (**photo** / **voice** only as media), then **Draft confirm fully in chat** (one editable draft card). Domain lifecycle stays Commit | Discard; **one prospective Expense per Draft** on this surface (bot is **Expense-only**—see surface roles). Channels and field rules follow ADR-0002 / ADR-0003 / ADR-0005 / ADR-0007 / ADR-0008 / ADR-0011. Telegram identity ↔ user mapping and bot deny-when-unmapped follow ADR-0009; unmapped users get a short deny and no pipeline.

**Supersession note:** earlier drafts of this ADR included sticky `/expense`|`/income` mode, voice kind propose, and Expense↔Income switch on the confirm card. Those are **superseded** by [Grilling: Surface roles — PWA primary, bot Expense-only (no Mini App)](https://github.com/Globus007/finance-calc/issues/67) and [ADR-0011](0011-bot-chat-media-pipeline.md): bot always forces **Expense** Draft; **Income** and kind switch live on **PWA only**. **Manual** capture is **PWA-only** (not Mini App, not chat NL).

## Intake → Channel

| Inbound | Result |
|---------|--------|
| `message.photo` | Channel **photo** → always **Expense** Draft after successful extract |
| `message.voice` | Channel **voice** → extract → **Expense** Draft (force kind; no Income) |
| `document`, `audio`, `video_note`, stickers, etc. | Reject + hint: send photo or voice |
| Free-text natural language | **Not** a capture path (no Manual Channel in chat). Manual remains **PWA only** |
| Photo **caption** | Prefill **Note** only if extract left Note empty |

Product media limits still apply after download (stricter than Bot API 20 MB); see ADR-0011. Wrong type/oversize = pre-capture reject, not Extraction failure.

## Kind policy (Expense-only)

- Bot path **always** opens an **Expense** Draft after successful extract/normalize (ADR-0011).
- No sticky `/income` / kind mode, no `/expense` command as a mode switch, no Expense↔Income switch on the confirm card.
- Voice that “sounds like income” still opens an Expense card; user may edit Amount / Occurred on / Category / Note, then Commit or Discard—or recapture / use PWA for Income.
- Photo remains Expense-only as on PWA.

## Commands (MVP)

- `/start` — help (photo/voice + in-chat confirm Expense only); does **not** Discard an open Draft  
- `/help` — same help as start  
- `/discard`, `/cancel`, and plain «отмена» while a Draft is open — **Discard**  
- No `/commit` (Commit is card-only). No `/income` / `/expense` mode commands.  
- Unrecognized text: short hint, not NL extract.

## Confirm surface

After successful extract: **one** bot message (draft **card**) with field summary + **inline keyboard**; update via `editMessage*`. Do not re-attach Receipt/Recording on confirm (ADR-0005).

**Buttons (always present where applicable):** Commit, Discard; edit Amount / Occurred on / Note; Category (Expense). **No** kind switch.

**Field edit:** button → **ForceReply** → parse reply into that field → edit card.  
- Amount: same rules as web parser; must be > 0 BYN to Commit.  
- Occurred on: `YYYY-MM-DD`, `D.M.YYYY` / `DD.MM.YYYY`, «сегодня» / «вчера» in Europe/Minsk; future dates allowed (ADR-0007).  
- Note: trim; empty reply clears Note.  
Invalid parse: error, stay in awaiting that field.

**Category:** paginated inline list of **visible** Categories; `callback_data` uses short server-side codes (not raw UUIDs). Prefill per ADR-0003. No create Category in chat.

**Commit / Discard:** both always shown. Invalid Commit → `answerCallbackQuery` alert with reason; card stays. Persist failure → stay on card, retry Commit (ADR-0008). Successful Commit → edit card to **committed summary only** (no monthly/net hint, no required PWA deep-link), clear markup.

## In-flight state (app-owned)

Bot API is stateless; server holds at most **one** open Draft per mapped Telegram user (plus extract job / awaiting-field). Kind mode is **not** stored.

| Situation | Behavior |
|-----------|----------|
| Idle **24h wall-clock** since last user or system action on that Draft | **Auto-Discard** (Discard equivalent); edit card to timeout copy |
| New photo/voice while Draft card open | **Implicit Discard** of current + start new capture |
| During extract (no card yet) | Progress message + **Cancel** (abort pipeline: no Draft—not Discard, not Extraction failure). Second media → reject (“wait or Cancel”) |
| Awaiting ForceReply | Commands and card callbacks take priority over field text; media uses replace policy above |

No deferred Draft list / multi-Draft queue (CONTEXT / ADR-0003).

## Extraction failure & pre-capture (chat)

- **Extraction failure:** one fail message (generic RU + channel hint); no card; recovery = new photo/voice on same Channel. No retry of same `file_id` (ADR-0005).  
- **Pre-capture** (limits, unsupported type, unmapped): distinct short copy; pipeline never starts.  
- Incomplete Draft after successful pipeline still opens the card (ADR-0003).

## Considered options

- **Free-text NL as Manual (or extract) Channel in chat** — rejected for MVP: commands + media only; Manual stays **PWA**.  
- **Income / sticky kind mode / kind switch on bot** — rejected under surface roles: bot is Expense-only; Income on PWA.  
- **Multi-message field wizard / Mini App confirm for bot captures** — rejected: single card in chat (map lean + issue #48).  
- **Category free-text fuzzy or confirm-only-in-Mini-App** — rejected: paginated visible list; full confirm in chat.  
- **Unlimited or multi Draft / no TTL** — rejected: one in-flight + 24h auto-Discard.  
- **Reject new media while Draft open** — rejected: implicit replace for speed.  
- **Retry same Telegram file after extract fail** — rejected (ADR-0005).  
- **document-as-image / audio-as-voice in MVP** — rejected: photo + voice message types only.  
- **Hide Commit until valid** — rejected: always show + alert on invalid.  
- **No mid-flight Cancel** — rejected: progress + Cancel abort for parity with web cancel-extract semantics.  
- **Post-Commit monthly/net or PWA deep-link** — rejected for MVP ack: committed summary on the draft card only.

## Consequences

- Needs durable per-user bot state (Draft fields, card `message_id`, awaiting field, extract cancel token, TTL)—**not** kind mode.  
- Callback payloads must stay ≤ 64 bytes (category short codes).  
- Copy matrix: pre-capture vs Extraction failure vs invalid field vs invalid Commit vs timeout Discard (no income-mode+photo reject).  
- Map item “in-chat Draft confirm interaction model” is closed by this ADR (as amended for Expense-only).  
- Numbered **0010** so it does not collide with identity-link ADR **0009**.

# In-chat Draft confirm interaction model (Telegram bot)

MVP bot path: capture from private chat (**photo** / **voice** only as media), then **Draft confirm fully in chat** (one editable draft card)—not Mini App confirm for this path. Domain lifecycle stays Commit | Discard; one prospective Expense or Income per Draft; Channels and field rules follow ADR-0002 / ADR-0003 / ADR-0005 / ADR-0007 / ADR-0008. Telegram identity ↔ user mapping and bot deny-when-unmapped follow the identity-link grilling ADR (`0009-telegram-identity-link-and-session-ux` on that branch); unmapped users get a short deny and no pipeline.

## Intake → Channel

| Inbound | Result |
|---------|--------|
| `message.photo` | Channel **photo** → always **Expense** Draft after successful extract |
| `message.voice` | Channel **voice** → extract; Draft kind from sticky mode or model propose (below) |
| `document`, `audio`, `video_note`, stickers, etc. | Reject + hint: send photo or voice |
| Free-text natural language | **Not** a capture path (no Manual Channel in chat). Manual remains Mini App / web |
| Photo **caption** | Prefill **Note** only if extract left Note empty |

Product media limits still apply after download (stricter than Bot API 20 MB). Wrong type/oversize = pre-capture reject, not Extraction failure.

## Kind mode (`/expense` / `/income`)

- Sticky **mode** per mapped user: `expense` | `income` | **auto** (default).
- `/expense` / `/income` set sticky mode; **only** another kind command or **`/start`** returns to **auto** (`/start` = help + auto; does **not** Discard an open Draft).
- **Voice:** if mode is expense/income, that kind **overrides** extract `record_kind`; Amount / Occurred on / Note / Category still from extract + post-process. In **auto**, extract proposes kind (ADR-0002).
- **Photo** is always Expense. If mode is **income**, reject photo with copy to use `/expense` or voice.
- Confirm card still allows **Expense↔Income switch** (ADR-0002): Expense→Income drops Category; Income→Expense leaves Category unset until pick.

## Commands (MVP)

- `/start` — help (photo/voice + in-chat confirm) + mode → auto  
- `/help` — same help as start (mode policy: same as start → auto)  
- `/expense`, `/income` — sticky mode  
- `/discard`, `/cancel`, and plain «отмена» while a Draft is open — **Discard**  
- No `/commit` (Commit is card-only). Unrecognized text: short hint, not NL extract.

## Confirm surface

After successful extract: **one** bot message (draft **card**) with field summary + **inline keyboard**; update via `editMessage*`. Do not re-attach Receipt/Recording on confirm (ADR-0005).

**Buttons (always present where applicable):** Commit, Discard; edit Amount / Occurred on / Note; Category (Expense); kind switch (when voice/switch allowed).

**Field edit:** button → **ForceReply** → parse reply into that field → edit card.  
- Amount: same rules as web parser; must be > 0 BYN to Commit.  
- Occurred on: `YYYY-MM-DD`, `D.M.YYYY` / `DD.MM.YYYY`, «сегодня» / «вчера» in Europe/Minsk; future dates allowed (ADR-0007).  
- Note: trim; empty reply clears Note.  
Invalid parse: error, stay in awaiting that field.

**Category:** paginated inline list of **visible** Categories; `callback_data` uses short server-side codes (not raw UUIDs). Prefill per ADR-0003. No create Category in chat.

**Commit / Discard:** both always shown. Invalid Commit → `answerCallbackQuery` alert with reason; card stays. Persist failure → stay on card, retry Commit (ADR-0008). Successful Commit → edit card to committed summary, clear markup.

## In-flight state (app-owned)

Bot API is stateless; server holds at most **one** open Draft per mapped Telegram user (plus extract job / awaiting-field / kind mode).

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

- **Free-text NL as Manual (or extract) Channel in chat** — rejected for MVP: commands + media only; Manual stays web/Mini App.  
- **Multi-message field wizard / Mini App confirm for bot captures** — rejected: single card in chat (map lean + issue #48).  
- **Category free-text fuzzy or confirm-only-in-Mini-App** — rejected: paginated visible list; full confirm in chat.  
- **Kind locked after extract / dual bots** — rejected (ADR-0002).  
- **Unlimited or multi Draft / no TTL** — rejected: one in-flight + 24h auto-Discard.  
- **Reject new media while Draft open** — rejected: implicit replace for speed.  
- **Retry same Telegram file after extract fail** — rejected (ADR-0005).  
- **document-as-image / audio-as-voice in MVP** — rejected: photo + voice message types only.  
- **Hide Commit until valid** — rejected: always show + alert on invalid.  
- **No mid-flight Cancel** — rejected: progress + Cancel abort for parity with web cancel-extract semantics.

## Consequences

- Needs durable per-user bot state (Draft fields, card `message_id`, awaiting field, extract cancel token, kind mode, TTL).  
- Callback payloads must stay ≤ 64 bytes (category short codes).  
- Copy matrix: pre-capture vs Extraction failure vs invalid field vs invalid Commit vs timeout Discard vs income-mode+photo reject.  
- Map item “in-chat Draft confirm interaction model” is closed by this ADR; chat Extraction failure UX is specified here (still distinct from Mini App shell).  
- Numbered **0010** so it does not collide with identity-link ADR **0009** on the parallel grilling branch.

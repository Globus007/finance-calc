# PROTOTYPE — throwaway (issue #8)

**Question:** What is the minimal screen map and primary mobile flows for:
capture (photo / voice / manual) → draft confirm → history → monthly total → category manage → simple income?

**Assumption:** No app shell exists yet → sub-shape B throwaway Next route.
Two structurally different mobile IAs (variant B dropped — capture-home IA not needed), switchable via `?variant=A|C`.

**Visual direction:** Soft purple fintech dashboard (Pinterest pin style) + **voice-first** primary affordance (large microphone).

| Key | Name | IA idea |
|-----|------|---------|
| A | Dashboard + capture dock | Home = balance + last txs; bottom Home \| **photo · big mic · manual** (dock from C) \| Month; full history via «Все» |
| C | Voice stage + feed | Hero mic is the product surface; month stats card + history feed; floating photo/mic/manual dock |

**Run:** `pnpm dev` (from this folder) → http://localhost:3000

**Not production.** In-memory mock only. No auth, no API, no persistence.

**Reference:** https://www.pinterest.com/pin/1094163672026400110/

---

## Verdict (2026-08-05)

**Winner: A + capture dock from C**

- **IA:** dashboard home (net + income/expense + last history), bottom nav **Домой | photo · mic · manual | Месяц**, categories from header, full history via «Все», month totals screen.
- **Capture:** voice is primary (large center mic in dock); photo and manual as side icons in the same pill (dock pattern taken from C). Mid-screen channel chips dropped — single capture surface at the bottom.
- **Visual:** soft lavender canvas, white cards, blue `#5B6CFF` primary, orange expense / purple manual accents (Pinterest fintech pin language).
- **Rejected:** pure B (capture-only home); pure C as the shell (hero-mic stage without dashboard home). C’s dock kept, C’s full IA not.

Use this when folding into product UI: implement **A’s screen map** with the **C-style bottom capture dock**, not three equal channel tiles and not a capture-only home.

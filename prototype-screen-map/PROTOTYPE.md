# PROTOTYPE — throwaway (issue #8)

**Question:** What is the minimal screen map and primary mobile flows for:
capture (photo / voice / manual) → draft confirm → history → monthly total → category manage → simple income?

**Assumption:** No app shell exists yet → sub-shape B throwaway Next route.
Three structurally different mobile IAs, switchable via `?variant=A|B|C`.

| Key | Name | IA idea |
|-----|------|---------|
| A | Tabs + FAB | Bottom tabs History / Month; center FAB for capture; categories in header |
| B | Capture home | Home is only capture; history / month / categories are secondary destinations |
| C | Ledger feed | One timeline with sticky month totals; three capture affordances always in the bottom bar |

**Run:** `pnpm dev` (from this folder) → http://localhost:3000

**Not production.** In-memory mock only. No auth, no API, no persistence.

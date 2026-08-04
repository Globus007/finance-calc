# Ephemeral media lifecycle (temp Storage)

MVP keeps **Receipt** and **Recording** bytes only for the capture → extract hop: **private Supabase Storage** as temp, then drop. There is **no** long-term media archive, confirm-time server preview, or retry of the same file after **Extraction failure**.

## Pipeline

1. Authenticated client obtains a short-lived **signed upload** scoped to its own prefix (`{user_id}/{uuid}`).
2. Client uploads the object **directly to Storage** (not multipart through the app server), then calls extract with the **path**.
3. Server **reads** the object (service role / server-side only), runs vision or STT + language extract, and **best-effort deletes** the object in the same path—on **success and on Extraction failure**.
4. Client **drops** local Blob/ObjectURL as soon as the extract attempt finishes. Confirm UI is **Draft fields only** (no photo thumbnail, no audio playback).
5. **Orphans** (upload without extract, crash before delete): bucket **lifecycle TTL 1 hour** on the temp prefix as a safety net.

## Auth and limits

- Bucket is **private** (not public UUID-guessing). Clients may **upload** only into their prefix via signed URL; they do **not** list/read temp objects after upload. **Read and delete** are server-only. Extract API rejects paths outside the session user’s prefix.
- **Photo:** ≤ 5 MB, JPEG/PNG/WebP (client compress/resize before upload); server rejects oversize/wrong type.
- **Voice:** ≤ ~60 s and ≤ 2 MB; MIME negotiated (`audio/webm`, `audio/mp4` / m4a, etc.); server rejects oversize/wrong type.

## Failure recovery

After Extraction failure, media is already gone (Storage + client). UX is **recapture only**—no “retry same file,” no holding the object for N minutes for re-extract.

## Considered options

- **Client memory + multipart to Next/Vercel only (no Storage)** — rejected: body size/timeout pressure on receipt photos; temp Storage avoids shipping large media through the app function.
- **Client → API multipart → Storage → extract** — rejected: reintroduces the body-limit problem Storage is meant to solve.
- **Hold media until Commit/Discard** — rejected: longer retention, orphan risk on abandoned confirm, and confirm does not need media once fields exist.
- **TTL-only cleanup without eager delete** — rejected: weak privacy/cost story for “drop after extraction.”
- **On failure, keep object (or client Blob) for retry** — rejected for MVP: one lifecycle (delete after every extract attempt) is simpler; transient errors cost a recapture.
- **Public bucket or client read of own temp objects** — rejected: unnecessary leak surface for finance-adjacent media.
- **Supabase Storage unused in MVP** — rejected given the temp-upload path; Storage is in MVP **only** for this ephemeral capture media, not a receipt gallery.

## Consequences

- Map item “whether Storage bucket is used if photos are ephemeral” → **yes, temp only**.
- LLM/STT providers receive bytes (or server-mediated content) from the extract path; product still does not keep a media archive after the attempt.
- Implementation must wire lifecycle rules on the temp prefix and always delete in a `finally`-style path after extract.

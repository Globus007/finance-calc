# Server STT for short Russian expense utterances

**Ticket:** [#9](https://github.com/Globus007/finance-calc/issues/9)  
**Branch:** `research/server-stt-russian`  
**Scope:** Server-side speech-to-text for a Next.js + Supabase PWA that logs expenses from short Russian voice notes (path: voice → STT → LLM extract → draft confirm). Stack constraint: AI Gateway / OpenAI-compatible and adjacent first-party APIs.  
**Sources:** primary docs only (OpenAI, Vercel AI Gateway, xAI). No third-party benchmarks treated as authority.

---

## Product constraints that matter for STT

| Constraint | Implication |
| --- | --- |
| Short utterances (e.g. “кофе 12 рублей”, “такси 15 BYN”) | Batch **file** transcription is enough; live streaming STT is optional, not MVP-critical |
| Russian UI / speech | Need multilingual STT with solid `ru` support and a language hint |
| Draft-confirm UX | STT can be slightly imperfect; LLM + user confirm absorb residual errors |
| Ephemeral media (same spirit as discard-photo-after-extract) | Record → upload once → transcript → drop audio |
| Next.js + AI Gateway | Prefer models available on AI Gateway so LLM + STT share one key, spend, and observability |

---

## Options in scope (primary sources)

### A. OpenAI Transcriptions API (file)

Endpoint: `POST /v1/audio/transcriptions`  
Guide: [File transcription](https://developers.openai.com/api/docs/guides/speech-to-text)  
Reference: [Create transcription](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create)

| Model | Role in OpenAI docs | Pricing (official) | Notes for this app |
| --- | --- | --- | --- |
| **`gpt-transcribe`** | **Recommended** for recorded speech in original language | **$0.0045 / minute** ([pricing](https://developers.openai.com/api/docs/pricing)) | `prompt`, `keywords[]`, `languages[]` (ISO 639-1, e.g. `ru`); streaming file deltas supported; not listed on AI Gateway catalog at research time |
| **`gpt-4o-mini-transcribe`** | Smaller next-gen STT; lower WER / better language recognition vs Whisper | Token-priced **$1.25 / 1M audio input**, **$5 / 1M output**; OpenAI estimated **~$0.003 / minute** | On AI Gateway as `openai/gpt-4o-mini-transcribe` |
| **`gpt-4o-transcribe`** | Higher-accuracy sibling | **$2.50 / 1M input**, **$10 / 1M output**; estimated **~$0.006 / minute** | On AI Gateway as `openai/gpt-4o-transcribe` |
| **`whisper-1`** | Legacy multilingual STT; timestamps / translation path | **$0.006 / minute** | 98 languages (incl. Russian per Whisper language list); `language` hint; **no** `stream=true` on file API |

**Limits (OpenAI file STT):** max **25 MB**; formats `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm` — good fit for browser `MediaRecorder` output.

**Russian:** Whisper family is multilingual; OpenAI documents ISO language codes for `gpt-transcribe` (`languages[]`) and singular `language` for older models. Use a Russian language hint for expense clips so the model does not drift to English.

**Latency:** File transcription is request/response (optional file streaming of text deltas). For ~2–10 s clips, wall-clock is dominated by upload + model turnaround, not by audio duration. OpenAI also offers live Realtime STT (`gpt-live-transcribe` at **$0.017 / minute**) — overkill for post-record draft capture.

---

### B. Vercel AI Gateway (same app stack)

Docs:

- [AI Gateway overview](https://vercel.com/docs/ai-gateway)
- [Speech to Text](https://vercel.com/docs/ai-gateway/modalities/speech-to-text)
- Catalog snapshot via `GET https://ai-gateway.vercel.sh/v1/models` (no auth)

**Transcription models present on the catalog (research time):**

| Gateway model ID | Provider | Catalog pricing fields (Gateway) |
| --- | --- | --- |
| `openai/gpt-4o-mini-transcribe` | OpenAI | audio input **$1.25 / 1M tokens**, output **$5 / 1M** |
| `openai/gpt-4o-transcribe` | OpenAI | audio input **$2.50 / 1M**, output **$10 / 1M** |
| `openai/whisper-1` | OpenAI | duration **$0.0001 / s** (= **$0.006 / min**) |
| `xai/grok-stt` | xAI | duration **$0.000028 / s** (= **$0.00168 / min**) |
| `openai/gpt-realtime-whisper` | OpenAI | streaming-oriented; **$0.017 / min**-class live path |

**Not on AI Gateway catalog at research time:** OpenAI’s recommended `gpt-transcribe`.

**Integration (AI SDK + Gateway):**

```ts
import { experimental_transcribe as transcribe } from 'ai';
import { gateway } from '@ai-sdk/gateway';

const result = await transcribe({
  model: gateway.transcriptionModel('openai/gpt-4o-mini-transcribe'),
  audio: audioBytes, // Buffer | Uint8Array | base64 | URL
});
// result.text → pass to LLM extract
```

Requires recent AI SDK (`ai` ≥ 7.0.31, `@ai-sdk/gateway` ≥ 4.0.23 per [Gateway STT docs](https://vercel.com/docs/ai-gateway/modalities/speech-to-text)). STT is **beta** and may roll out gradually.

REST alternative: `POST https://ai-gateway.vercel.sh/v4/ai/transcription-model` with header `ai-model-id` and base64 audio (no multipart).

**Spend:** AI Gateway states **no markup on tokens** vs provider list prices ([overview](https://vercel.com/docs/ai-gateway)).

---

### C. xAI Grok STT (adjacent API; also on AI Gateway)

Docs:

- [Speech to Text](https://docs.x.ai/developers/model-capabilities/audio/speech-to-text)
- [Pricing](https://docs.x.ai/docs/models#pricing) (Voice: STT **$0.10 / hr REST**, **$0.20 / hr Streaming**)

| Aspect | Detail |
| --- | --- |
| Endpoint | `POST https://api.x.ai/v1/stt` (multipart `file` or `url`) |
| Languages | Explicit table includes **Russian (`ru`)** among 25 languages |
| Domain helpers | `language=ru` + `format=true` (inverse text normalization: spoken amounts → written numbers/currency forms); `keyterm` for category/merchant names (max 100 × 50 chars) |
| Limits | Max **500 MB**; many container formats (incl. webm/m4a/mp3/wav) |
| Streaming | WebSocket `wss://api.x.ai/v1/stt` — not needed for MVP batch capture |
| Gateway ID | `xai/grok-stt` |

**Why it matters for expenses:** short Russian money phrases benefit from ITN (`format`) and optional `keyterm` bias (e.g. category names, “BYN”, merchant brands). Quality claims are not benchmarked by us; treat as A/B candidate against OpenAI mini.

---

### D. Out of MVP default (mention only)

| Option | Why not default |
| --- | --- |
| OpenAI Realtime live STT | Higher $/min; WebSocket complexity; product is post-record draft, not live captions |
| Direct Groq / Deepgram / Google Chirp / AssemblyAI | Capable via AI SDK providers, but **extra vendor + key** outside the agreed “AI Gateway / OpenAI-compatible” spine unless quality forces it |
| On-device Web Speech API | Not server STT; inconsistent Russian quality; out of ticket scope |

---

## Comparison for short Russian expense clips

Assumes ~5 s utterance, ~100 captures/month (single user).

| Criterion | `openai/gpt-4o-mini-transcribe` (Gateway) | `xai/grok-stt` (Gateway or direct) | `openai/whisper-1` | OpenAI `gpt-transcribe` (direct API) |
| --- | --- | --- | --- | --- |
| **Quality (docs)** | Next-gen; better WER / language recognition than Whisper | Multilingual (incl. `ru`); ITN + keyterms | Mature multilingual; accuracy varies by language | OpenAI **recommended** file model; keywords + languages |
| **Russian** | Multilingual; use language hint if exposed via provider options | **Documented `ru`** + `format` | Supported in Whisper language set; set `language=ru` | `languages: ["ru"]` |
| **Latency profile** | Batch file; fine for draft UX | Batch REST; fine for draft UX | Batch file | Batch (+ optional file stream) |
| **Price order of magnitude** | ~$0.003 / min (OpenAI estimate) → ~**$0.00025 / 5 s** | $0.10 / hr → ~**$0.00014 / 5 s** | $0.006 / min → ~**$0.0005 / 5 s** | $0.0045 / min → ~**$0.000375 / 5 s** |
| **Monthly cost @ 100×5 s** | ≪ $0.01 | ≪ $0.01 | ≪ $0.01 | ≪ $0.01 |
| **Stack fit** | **Native AI Gateway + AI SDK** | On Gateway; or separate xAI key | Gateway | OpenAI key only until Gateway lists it |
| **Expense-domain helpers** | `prompt` on OpenAI family | **`keyterm` + `format`** | Limited prompt (224 tokens on whisper) | **`prompt` + `keywords` + `languages`** |

**Cost is not the decision driver** for single-user MVP. Integration surface and Russian expense-phrase quality are.

---

## Recommendation

### Default for MVP

**`openai/gpt-4o-mini-transcribe` via Vercel AI Gateway**  
(`gateway.transcriptionModel('openai/gpt-4o-mini-transcribe')` or equivalent)

**Why**

1. **Stack alignment:** same Gateway key, billing, and observability as the LLM extract step ([AI Gateway](https://vercel.com/docs/ai-gateway), [STT modality](https://vercel.com/docs/ai-gateway/modalities/speech-to-text)).
2. **Quality vs Whisper:** OpenAI positions GPT-4o mini Transcribe as improved WER and language recognition vs original Whisper ([model page](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe)); Vercel’s Gateway model copy also frames mini as a **practical default** for Gateway transcription.
3. **Cost:** lowest OpenAI estimated $/min among production file models (~$0.003/min); negligible for short clips.
4. **UX match:** one-shot file STT after the user stops recording — no Realtime WebSocket for MVP.
5. **Formats:** OpenAI accepts `webm`/`m4a`/`mp3`/`wav`, which maps to common browser capture pipelines.

**MVP integration sketch (Next.js)**

1. Client: `MediaRecorder` → blob (`audio/webm` or `audio/mp4`).
2. `POST` to Route Handler (authenticated Supabase session).
3. Server: `experimental_transcribe` with Gateway model; **do not persist audio** after success (mirror photo discard policy).
4. Server: pass `result.text` into structured LLM extract (also Gateway) → draft DTO.
5. Client: confirm/edit draft → write expense row in Supabase.

**Hardening knobs**

- Prefer **language hint `ru`** via provider options when the AI SDK/OpenAI path exposes it (OpenAI older models use `language`; `gpt-transcribe` uses `languages[]`).
- Optional short **prompt** with category names and “BYN” if the chosen OpenAI model supports prompting.
- Timeouts: `AbortSignal.timeout(...)` around STT + LLM; clear Russian error copy on failure.
- Cap upload size well under 25 MB (e.g. 30–60 s max recording).

---

### Alternatives

#### 1. `xai/grok-stt` (via AI Gateway or direct xAI) — primary alternative

**When to switch:** Russian amounts/merchants systematically mis-transcribed by mini; or you want **cheaper** batch STT with first-class **`language=ru`**, **`format=true`**, and **`keyterm`** ([xAI STT](https://docs.x.ai/developers/model-capabilities/audio/speech-to-text)).

**Trade-offs**

| + | − |
| --- | --- |
| ~2× cheaper than mini at list rates; explicit Russian table | Russian expense quality still unproven for *this* product until A/B |
| ITN + keyterms tailored to money/categories | Another provider quality surface; Gateway STT still beta |
| On AI Gateway catalog | Direct API is multipart (fine); Gateway REST is base64 JSON |

#### 2. Quality upgrade path: `openai/gpt-4o-transcribe` (Gateway) or direct OpenAI `gpt-transcribe`

**When:** mini accuracy insufficient after testing; or Gateway eventually lists `gpt-transcribe`.

| Model | Trade-off |
| --- | --- |
| `openai/gpt-4o-transcribe` | Higher list cost (~2× mini estimate); already on Gateway |
| `gpt-transcribe` (OpenAI direct) | OpenAI’s **current recommended** file model; best keyword/language API; **not on Gateway catalog yet** → second credential path or wait for Gateway listing |

Keep **`whisper-1`** only as a cheap/debug fallback or if you need word timestamps / English translation endpoint — not as the quality default.

---

## What we deliberately did not decide

- Exact browser capture format (`webm` vs `mp4`) — implement-time; both accepted by OpenAI.
- Whether to stream STT deltas to the UI — not required for draft-confirm.
- Formal WER measurement on Russian expense phrases — recommend a 20–50 utterance smoke set before build freeze.
- Whether Storage is used for in-flight audio — prefer in-memory / temp only; align with photo pipeline ticket.

---

## Sources (primary)

1. OpenAI — [File transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text)  
2. OpenAI — [Pricing (Transcription models)](https://developers.openai.com/api/docs/pricing)  
3. OpenAI — [gpt-transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe), [gpt-4o-mini-transcribe](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe), [gpt-4o-transcribe](https://developers.openai.com/api/docs/models/gpt-4o-transcribe), [whisper-1](https://developers.openai.com/api/docs/models/whisper-1)  
4. OpenAI — [Create transcription API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create)  
5. OpenAI Whisper — [Available models and languages](https://github.com/openai/whisper#available-models-and-languages)  
6. Vercel — [AI Gateway](https://vercel.com/docs/ai-gateway), [Speech to Text](https://vercel.com/docs/ai-gateway/modalities/speech-to-text)  
7. Vercel — [AI Gateway models API](https://ai-gateway.vercel.sh/v1/models), model pages e.g. [gpt-4o-mini-transcribe](https://vercel.com/ai-gateway/models/gpt-4o-mini-transcribe), [grok-stt](https://vercel.com/ai-gateway/models/grok-stt)  
8. AI SDK — [Transcription](https://ai-sdk.dev/docs/ai-sdk-core/transcription)  
9. xAI — [Speech to Text](https://docs.x.ai/developers/model-capabilities/audio/speech-to-text), [Models / Voice pricing](https://docs.x.ai/docs/models#pricing)

---

## One-line decision

**MVP default: `openai/gpt-4o-mini-transcribe` on Vercel AI Gateway; A/B `xai/grok-stt` for Russian amounts; upgrade to `gpt-4o-transcribe` / direct `gpt-transcribe` if quality needs it.**

# Research: Vision model via AI Gateway for receipt extraction

**Ticket:** [#10](https://github.com/Globus007/finance-calc/issues/10)  
**Branch:** `research/vision-receipt-extraction`  
**Question:** Which vision-capable model path via AI Gateway / OpenAI-compatible APIs is suitable for extracting structured fields from Belarusian/Russian retail receipts (amount BYN, date, merchant), including structured-output support and cost/latency notes?

**Stack context:** Next.js + Supabase + Vercel AI Gateway / OpenAI-compatible. Photos discarded after extraction (fields only retained). Single-user MVP, Russian UI, BYN.

**Sources:** primary only (Vercel AI Gateway docs + live models catalog, provider docs). Catalog snapshot: `GET https://ai-gateway.vercel.sh/v1/models` on 2026-08-04 (~315 models). Pricing and model availability change; re-check the catalog before lock-in.

---

## Answer (executive)

**Default MVP path:** call Vercel AI Gateway OpenAI-compatible Chat Completions at `https://ai-gateway.vercel.sh/v1` with model id **`google/gemini-2.5-flash-lite`**, send the receipt as a base64 `image_url` content part, and force a small JSON schema for `{ amount_byn, date, merchant, … }` via Gateway `response_format` (`json_schema`) and/or AI SDK structured output (`Output.object` / tools).

**Why this default:** multimodal image input is documented on the Gateway; the catalog tags the model `vision` with `modalities.input: text|image|pdf`; token list price is among the lowest for vision language models ($0.10 / $0.40 per 1M input/output); Gateway and Google docs both support schema-constrained structured extraction; Gemini’s image guide pairs image input with JSON Schema extraction; single-user receipt volume makes absolute cost negligible while keeping latency low (Flash-Lite is the low-latency tier of the 2.5 family).

**Alternatives:**  
1. **`openai/gpt-4o-mini`** (or **`openai/gpt-4.1-mini`**) — strongest first-party structured-outputs story on OpenAI-compatible APIs; good Gateway citizen; watch image-token costs and non-Latin OCR caveats.  
2. **`alibaba/qwen3-vl-instruct`** — VL/OCR-oriented; catalog description highlights OCR upgrades; useful if Cyrillic thermal-print accuracy lags on Flash-Lite.  
3. **Quality fallback:** `google/gemini-2.5-flash` or `anthropic/claude-haiku-4.5` when draft quality fails review.

---

## Integration surface (AI Gateway)

| Item | Value | Primary source |
|------|--------|----------------|
| Base URL | `https://ai-gateway.vercel.sh/v1` | [OpenAI Chat Completions API](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions) |
| Auth | `Authorization: Bearer $AI_GATEWAY_API_KEY` (or OIDC) | same |
| Model id format | `creator/model-name` (e.g. `google/gemini-2.5-flash-lite`) | [Models & Providers](https://vercel.com/docs/ai-gateway/models-and-providers) |
| Image input | Chat message `content` array: `{ type: "text" }` + `{ type: "image_url", image_url: { url: "data:image/…;base64,…" } }` | [File Attachments](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/images) |
| Structured output | `response_format: { type: "json_schema", json_schema: { name, schema, … } }` (preferred); legacy `type: "json"` still documented | [Structured Outputs](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs) |
| Pricing policy | Tokens billed at provider rates; **no markup** on tokens (incl. BYOK) | [AI Gateway overview](https://vercel.com/docs/ai-gateway) |
| Discovery | Unauthenticated `GET https://ai-gateway.vercel.sh/v1/models` returns ids, modalities, pricing | [Models & Providers](https://vercel.com/docs/ai-gateway/models-and-providers) |
| Fallbacks | Gateway model/provider fallbacks for reliability | [Models & Providers](https://vercel.com/docs/ai-gateway/models-and-providers) |

**AI SDK path (fits Next.js stack):** specify `model: 'google/gemini-2.5-flash-lite'` (Gateway is default when model is a string) and use structured generation (`generateObject` historically; AI SDK 6 migrates to `generateText` + `Output.object({ schema })`). Image parts use the SDK file/image content shape. Sources: [Models & Providers](https://vercel.com/docs/ai-gateway/models-and-providers), [AI SDK migration / Output.object](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0).

**Ephemeral photos:** keep the image only for the request body (memory or short-lived temp object). Prefer **inline base64 data URIs** so nothing long-lived is required in Storage; discard after the completion returns. Gateway docs demonstrate base64 data URIs for image analysis ([File Attachments](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/images)).

---

## Candidate comparison (catalog + provider docs)

Prices are **USD per 1M tokens** from AI Gateway catalog pricing fields (`pricing.input` / `pricing.output` × 1e6), snapshot 2026-08-04. All rows below have `modalities.input` including `image` and `type: language`.

| Model id | Input $/1M | Output $/1M | Context | Catalog tags (subset) | Structured-output notes |
|----------|------------|-------------|---------|------------------------|-------------------------|
| **`google/gemini-2.5-flash-lite`** | **0.10** | **0.40** | 1,048,576 | vision, tool-use, reasoning, file-input | Google: JSON Schema structured outputs; image+schema examples in image-understanding docs. Gateway: `response_format` json_schema. |
| `openai/gpt-4.1-nano` | 0.10 | 0.40 | ~1.05M | vision, tool-use | OpenAI Structured Outputs family; lighter quality for dense OCR. |
| `openai/gpt-4o-mini` | 0.15 | 0.60 | 128k | vision, tool-use | Structured Outputs from gpt-4o-mini onward; Gateway documents vision + budget OCR-style use. |
| `openai/gpt-5-nano` | 0.05 | 0.40 | 400k | vision, reasoning, tool-use | Cheapest text rates; simple instruction/classification focus — validate Cyrillic receipts before adopting. |
| `google/gemini-3.1-flash-lite` | 0.25 | 1.50 | 1M | vision, tool-use, reasoning | Newer lite tier; higher unit price than 2.5 Flash-Lite. |
| `google/gemini-2.5-flash` | 0.30 | 2.50 | 1M | vision, tool-use, reasoning | Quality step-up when Lite fails. |
| `openai/gpt-4.1-mini` | 0.40 | 1.60 | ~1.05M | vision, tool-use | Stronger instruction/schema following than 4o-mini; higher text price. |
| `alibaba/qwen3-vl-instruct` | 0.40 | 1.60 | 131k | vision, tool-use | Catalog: major OCR enhancement; VL specialist. |
| `anthropic/claude-haiku-4.5` | 1.00 | 5.00 | 200k | vision, tool-use, reasoning | Higher cost quality/fallback; tools on Gateway. |
| `mistral/pixtral-12b` | 0.15 | 0.15 | 128k | vision, tool-use | Cheap multimodal; weaker first-party structured-output guarantees. |

**Do not use image-generation models** (e.g. `google/gemini-*-flash-image*`) for receipt field extraction — they are optimized for image *output* pricing/modalities, not this pipeline.

### Default: `google/gemini-2.5-flash-lite`

- **Gateway model page:** multimodal inputs (images, audio, documents + text); 1M context; $0.1 / $0.4 per 1M; lowest-latency tier in Gemini 2.5 family; called out for **data extraction** / structured-output production tasks. Source: [AI Gateway model page](https://vercel.com/ai-gateway/models/gemini-2.5-flash-lite).
- **Catalog:** `modalities.input: ["text","image","pdf"]`, tags include `vision`, `tool-use`, `reasoning`.
- **Image tokens (Google):** ~258 tokens if both dimensions ≤ 384px; larger images tiled (768×768 tiles at 258 tokens each). Media resolution controls exist on Gemini 3 for fine text (higher resolution → more tokens/latency). Source: [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding).
- **Structured outputs (Google):** JSON Schema via response format; docs list **data extraction** (names, dates) as a primary use case; **image understanding** docs show image input + `response_format` schema in one call (e.g. detection). Sources: [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding).
- **Thinking cost:** configurable thinking adds output tokens; for simple receipt fields use **minimal/off** thinking so latency and output cost stay low ([model page](https://vercel.com/ai-gateway/models/gemini-2.5-flash-lite)).

### Alternative A: OpenAI mini family (`openai/gpt-4o-mini`, `openai/gpt-4.1-mini`)

- **Vision:** Chat Completions / Responses accept image URL or base64; models with vision process text in images. Source: [Images and vision](https://developers.openai.com/api/docs/guides/images-vision).
- **Structured Outputs:** available starting with GPT-4o; `gpt-4o-mini` and later support `json_schema` strict schema adherence (preferred over JSON mode). Source: [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
- **Gateway:** example structured-output docs use OpenAI model ids; image attachment examples use the same Chat Completions path ([Structured Outputs](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs), [File Attachments](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/images)).
- **gpt-4o-mini Gateway page:** explicitly positions budget **vision / document OCR assistance / visual classification**. Source: [gpt-4o-mini](https://vercel.com/ai-gateway/models/gpt-4o-mini).
- **gpt-4.1-mini:** lower latency vs GPT-4o, stronger instruction following for formatting pipelines; $0.4 / $1.6 per 1M. Source: [gpt-4.1-mini](https://vercel.com/ai-gateway/models/gpt-4.1-mini).
- **Image token cost caveat:** OpenAI tile/patch tokenization can make **large phone photos** dominate input tokens (especially `gpt-4o-mini` high-detail tile rates). Prefer `detail: "low"` only if OCR quality remains acceptable; otherwise resize client-side before upload. Source: [Images and vision — Calculating costs](https://developers.openai.com/api/docs/guides/images-vision).
- **Non-Latin caveat:** OpenAI documents that models **may not perform optimally on non-Latin text in images** (examples: Japanese, Korean). Cyrillic BY/RU receipts should be **eval’d**; do not assume parity with Latin receipts. Source: [Images and vision — Limitations](https://developers.openai.com/api/docs/guides/images-vision).

### Alternative B: `alibaba/qwen3-vl-instruct`

- Catalog description: visual perception/OCR **major enhancement**, VL series.  
- Pricing ~$0.40 / $1.60 per 1M; `tool-use` + `vision`.  
- Use when Gemini/OpenAI mini misread thermal Cyrillic or dense multi-line totals; still route through the same Gateway base URL and prefer tool/JSON schema constraints + app-side validation.

### Alternative C: quality fallbacks

| Model | When |
|-------|------|
| `google/gemini-2.5-flash` | Lite OCR/schema quality insufficient; still multimodal + schema path |
| `anthropic/claude-haiku-4.5` | Strong vision + tools; ~10× input cost vs Flash-Lite — reserve for retries |
| `openai/gpt-4.1-mini` | Prefer OpenAI strict structured outputs with better instruction following |

Configure **Gateway model fallbacks** (primary → secondary) so a single API shape covers outages without app rewrites ([Models & Providers](https://vercel.com/docs/ai-gateway/models-and-providers)).

---

## Suggested request shape (MVP)

**Fields (minimum for ticket):** `amount_byn` (number), `date` (ISO date string or null), `merchant` (string or null). Optional later: currency (default BYN), confidence, raw_total_text, line_items — keep MVP schema small.

**Mechanism (prefer in order):**

1. **Gateway Chat Completions** `response_format.type = "json_schema"` with a strict object schema (all required keys; use nullable unions for missing fields). Source: [AI Gateway Structured Outputs](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs) (aligned with [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)).
2. **Tool / function call** with a single `extract_receipt` tool and `tool_choice` forced — works on catalog models that list `tools` / `tool_choice` (all shortlist models above).
3. **AI SDK** `Output.object({ schema: z.object(...) })` with multimodal messages — matches Next.js stack.

**Prompt notes (product, not model):** instruct Russian/Belarusian receipt OCR; total amount in BYN (look for `итого` / `сумма` / `BYN` / `руб.`); prefer payment total over unit prices; return nulls rather than inventing; user still **confirms draft** before save (map decision).

**Image prep:** correct orientation; avoid blur; moderate resolution (enough for small thermal text, not multi-megapixel raw) to bound tokens/latency — Gemini and OpenAI both document resize/token effects ([Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding), [OpenAI vision costs](https://developers.openai.com/api/docs/guides/images-vision)).

---

## Cost & latency envelope (single-user MVP)

**Assumptions (illustrative, not measured on this ticket):** one phone JPEG of a receipt ≈ 500–2,000 Gemini image tokens after implicit tiling + ~100–300 completion tokens for a tiny JSON object.

| Model | Rough $/receipt (order of magnitude) | Notes |
|-------|--------------------------------------|--------|
| `google/gemini-2.5-flash-lite` | **≪ $0.001** | Dominant cost is image tokens at $0.10/1M |
| `openai/gpt-4o-mini` | **≪ $0.01** typically; can rise if high-detail tiles explode | Text rates low; image tiles can dominate |
| `google/gemini-2.5-flash` | few × Lite | Worth it only on quality retries |
| `anthropic/claude-haiku-4.5` | ~10× Lite input | Fallback only |

At tens–low hundreds of receipts/month, **model spend is noise** vs hosting; optimize for **accuracy + latency UX**, not micro-cents.

**Latency (qualitative from primary docs, not synthetic benchmarks):**

- Gemini 2.5 Flash-Lite: **fastest / lowest first-token latency in 2.5 family** ([model page](https://vercel.com/ai-gateway/models/gemini-2.5-flash-lite)).
- GPT-4.1 mini: **~half latency vs GPT-4o** ([model page](https://vercel.com/ai-gateway/models/gpt-4.1-mini)).
- Avoid high thinking/reasoning budgets on extraction; they add output tokens and wall time.
- Gateway supports streaming structured outputs, but MVP draft confirmation does not need streaming JSON.

**Observability:** Gateway generations expose cost/latency per request in dashboard / `GET /v1/generation` ([Usage & Billing](https://vercel.com/docs/ai-gateway/observability-and-spend/usage)). Use that after first prototype to replace estimates.

---

## Cyrillic / BY retail receipt risks

| Risk | Mitigation |
|------|------------|
| Thermal print, low contrast, skew | Client capture guidance + optional preprocess (contrast/rotate); human draft confirm |
| Non-Latin OCR weaker on some OpenAI vision paths | Prefer Gemini or Qwen-VL default; eval OpenAI mini on real BY/RU samples before switching |
| Multiple totals (pre-discount, cash, card) | Schema + prompt: “final amount charged”; show draft for confirm |
| Date formats `DD.MM.YYYY` | Schema as string + app parse; allow null |
| Hallucinated merchant/amount | Null over guess; never auto-commit (map: draft confirmation) |

This research does **not** run live accuracy evals on Belarusian receipts — that belongs in a prototype ticket with a small labeled sample set.

---

## Recommendation summary

| Role | Model id | Path |
|------|----------|------|
| **Default MVP** | `google/gemini-2.5-flash-lite` | AI Gateway `POST /v1/chat/completions` (or AI SDK string model) + image base64 + `response_format` json_schema / `Output.object` |
| **OpenAI-structured alt** | `openai/gpt-4o-mini` → upgrade `openai/gpt-4.1-mini` if needed | Same Gateway path; strongest OpenAI schema guarantees |
| **OCR specialist alt** | `alibaba/qwen3-vl-instruct` | Same Gateway path if Cyrillic OCR fails on default |
| **Quality fallback** | `google/gemini-2.5-flash` or `anthropic/claude-haiku-4.5` | Gateway fallbacks chain |

**Implementation pointer for later task tickets:** server Route Handler receives ephemeral image → Gateway vision call → parse/validate schema → return draft DTO → **delete image**; never persist receipt blobs.

---

## Primary sources

1. Vercel AI Gateway overview — https://vercel.com/docs/ai-gateway  
2. Models & Providers (+ live catalog) — https://vercel.com/docs/ai-gateway/models-and-providers · `https://ai-gateway.vercel.sh/v1/models`  
3. OpenAI-compatible Chat Completions — https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions  
4. File attachments (images) — https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/images  
5. Structured outputs (Gateway) — https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs  
6. Usage & billing — https://vercel.com/docs/ai-gateway/observability-and-spend/usage  
7. Model pages: [gemini-2.5-flash-lite](https://vercel.com/ai-gateway/models/gemini-2.5-flash-lite), [gpt-4o-mini](https://vercel.com/ai-gateway/models/gpt-4o-mini), [gpt-4.1-mini](https://vercel.com/ai-gateway/models/gpt-4.1-mini)  
8. OpenAI Images and vision — https://developers.openai.com/api/docs/guides/images-vision  
9. OpenAI Structured outputs — https://developers.openai.com/api/docs/guides/structured-outputs  
10. Gemini image understanding — https://ai.google.dev/gemini-api/docs/image-understanding  
11. Gemini structured outputs — https://ai.google.dev/gemini-api/docs/structured-output  
12. Gemini pricing (provider reference) — https://ai.google.dev/gemini-api/docs/pricing  

---

## Out of scope / follow-ups

- Live accuracy benchmark on BY/RU receipt photos (prototype).  
- Exact Zod/JSON Schema for the expense draft (domain / contract ticket).  
- STT model path (separate research ticket).  
- Permanent Storage vs pure ephemeral upload (media retention already: drop photo).

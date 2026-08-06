/**
 * Server-only observability for photo/voice extract (no media / transcript / amounts).
 * Console → Vercel Runtime Logs; Honeybadger notify on mid-pipeline failures + breadcrumbs.
 */

import type { Draft, RecordKind } from "@/lib/draft/types";
import { getServerHoneybadger } from "@/lib/honeybadger/server";

export type ExtractChannel = "photo" | "voice";

/** Ordered pipeline steps for filters in Logs / HB. */
export type ExtractStep =
  | "start"
  | "load_categories"
  | "download"
  | "validate_media"
  | "stt"
  | "vision"
  | "empty_transcript"
  | "text_extract"
  | "normalize"
  | "done";

export type ExtractLogReason =
  | "unauthenticated"
  | "invalid_path"
  | "categories_unavailable"
  | "download_failed"
  | "invalid_media"
  | "stt_failed"
  | "empty_transcript"
  | "vision_failed"
  | "text_extract_failed"
  | "unexpected";

export type FieldPresence = {
  amount_present: boolean;
  occurred_on_present: boolean;
  category_set: boolean;
  record_kind: RecordKind | null;
};

export type StepTimingsMs = Partial<
  Record<
    "load_categories" | "download" | "stt" | "vision" | "text_extract" | "normalize" | "total",
    number
  >
>;

const LOG_PREFIX = "[capture-extract]";
const MESSAGE_MAX = 200;

/** Filename only: strip `{user_id}/` prefix from storage path. */
export function objectNameFromPath(path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

export function fieldPresenceFromDraft(draft: Draft): FieldPresence {
  return {
    amount_present: draft.amount.trim().length > 0,
    occurred_on_present: draft.occurredOn.trim().length > 0,
    category_set: draft.categoryId.trim().length > 0,
    record_kind: draft.kind,
  };
}

export function truncateErrorMessage(message: string, max = MESSAGE_MAX): string {
  const oneLine = message.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

export function errorNameAndMessage(err: unknown): {
  error_name: string;
  error_message: string;
} {
  if (err instanceof Error) {
    return {
      error_name: err.name || "Error",
      error_message: truncateErrorMessage(err.message || "unknown"),
    };
  }
  if (typeof err === "string") {
    return { error_name: "Error", error_message: truncateErrorMessage(err) };
  }
  return { error_name: "Error", error_message: "unknown" };
}

type BaseCtx = {
  attempt_id: string;
  channel: ExtractChannel;
  object_name: string;
};

export type ExtractAttemptLogger = {
  attempt_id: string;
  channel: ExtractChannel;
  object_name: string;
  /** Mark step for HB breadcrumbs + optional console (debug). */
  breadcrumb: (step: ExtractStep, detail?: Record<string, unknown>) => void;
  /** Wall-clock ms for a named phase (stored for success log). */
  setTiming: (phase: keyof StepTimingsMs, ms: number) => void;
  /** Early reject: console warn; HB only for categories_unavailable. */
  early: (reason: ExtractLogReason, step?: ExtractStep) => void;
  /** Mid-pipeline failure: console error + HB notify with breadcrumbs. */
  fail: (input: {
    step: ExtractStep;
    reason: ExtractLogReason;
    err?: unknown;
    extra?: Record<string, unknown>;
  }) => void;
  /** Success: console info with timings + field presence; no HB notice. */
  success: (input: {
    field_presence: FieldPresence;
    models?: Record<string, string | undefined>;
  }) => void;
};

/**
 * One extract attempt. Call early/fail/success at most once for terminal outcome.
 */
export function createExtractLogger(input: {
  channel: ExtractChannel;
  path: string;
  attempt_id?: string;
}): ExtractAttemptLogger {
  const base: BaseCtx = {
    attempt_id: input.attempt_id ?? crypto.randomUUID(),
    channel: input.channel,
    object_name: objectNameFromPath(input.path),
  };
  const timings: StepTimingsMs = {};
  const startedAt = performance.now();

  const hb = () => {
    try {
      return getServerHoneybadger();
    } catch {
      return null;
    }
  };

  const breadcrumb: ExtractAttemptLogger["breadcrumb"] = (step, detail) => {
    const client = hb();
    if (!client) return;
    try {
      client.addBreadcrumb(`${LOG_PREFIX} ${step}`, {
        category: "capture-extract",
        metadata: { ...base, step, ...detail },
      });
    } catch {
      // observability must not break extract
    }
  };

  breadcrumb("start");

  return {
    attempt_id: base.attempt_id,
    channel: base.channel,
    object_name: base.object_name,

    breadcrumb,

    setTiming(phase, ms) {
      timings[phase] = Math.round(ms);
    },

    early(reason, step = "start") {
      const payload = {
        ...base,
        outcome: "early" as const,
        step,
        reason,
      };
      console.warn(LOG_PREFIX, JSON.stringify(payload));
      if (reason === "categories_unavailable") {
        notifyHoneybadger({
          base,
          step,
          reason,
          error_name: "CategoriesUnavailable",
          error_message: "categories or system fallback unavailable",
        });
      }
    },

    fail({ step, reason, err, extra }) {
      const { error_name, error_message } = err
        ? errorNameAndMessage(err)
        : {
            error_name: reason,
            error_message: reason,
          };
      timings.total = Math.round(performance.now() - startedAt);
      const payload = {
        ...base,
        outcome: "error" as const,
        step,
        reason,
        error_name,
        error_message,
        timings_ms: timings,
        ...extra,
      };
      console.error(LOG_PREFIX, JSON.stringify(payload));
      breadcrumb(step, { reason, error_name, error_message });
      notifyHoneybadger({
        base,
        step,
        reason,
        error_name,
        error_message,
        timings,
        extra,
      });
    },

    success({ field_presence, models }) {
      timings.total = Math.round(performance.now() - startedAt);
      const payload = {
        ...base,
        outcome: "ok" as const,
        step: "done" as const,
        timings_ms: timings,
        field_presence,
        models: models ?? undefined,
      };
      console.info(LOG_PREFIX, JSON.stringify(payload));
      breadcrumb("done", { field_presence });
    },
  };
}

function notifyHoneybadger(input: {
  base: BaseCtx;
  step: ExtractStep;
  reason: ExtractLogReason;
  error_name: string;
  error_message: string;
  timings?: StepTimingsMs;
  extra?: Record<string, unknown>;
}): void {
  try {
    const client = getServerHoneybadger();
    if (!client.config?.apiKey) return;

    const err = new Error(
      `${input.reason}: ${input.error_message}`.slice(0, MESSAGE_MAX + 40),
    );
    err.name = `CaptureExtract:${input.reason}`;

    void client.notify(err, {
      name: `capture-extract ${input.base.channel} ${input.reason}`,
      context: {
        ...input.base,
        step: input.step,
        reason: input.reason,
        error_name: input.error_name,
        error_message: input.error_message,
        timings_ms: input.timings,
        ...input.extra,
      },
      tags: ["capture-extract", input.base.channel, input.reason],
    });
  } catch {
    // never throw from logging
  }
}

/** Time an async phase; records ms on the logger. */
export async function timed<T>(
  log: ExtractAttemptLogger,
  phase: keyof StepTimingsMs,
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    log.setTiming(phase, performance.now() - t0);
  }
}

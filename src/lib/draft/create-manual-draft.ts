import { todayInMinsk } from "@/lib/dates/minsk-today";
import type { Draft, RecordKind } from "./types";

/**
 * Opens a manual Draft for confirm: empty Amount, no Category (Expense),
 * Occurred on = today Europe/Minsk, Channel = manual (ADR-0003).
 */
export function createManualDraft(
  kind: RecordKind,
  at: Date = new Date(),
): Draft {
  return {
    kind,
    channel: "manual",
    amount: "",
    occurredOn: todayInMinsk(at),
    categoryId: "",
    note: "",
  };
}

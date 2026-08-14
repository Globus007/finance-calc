import { describe, expect, it } from "vitest";
import { validateSetOpening } from "./validate-set-opening";

const calendar = { today: "2026-08-14", tomorrow: "2026-08-15" };

describe("validateSetOpening", () => {
  it("accepts a zero Opening amount", () => {
    expect(
      validateSetOpening({ amount: "0", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: true, amount: 0, openedOn: "2026-08-14" });
    expect(
      validateSetOpening({ amount: "0,00", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: true, amount: 0, openedOn: "2026-08-14" });
  });

  it("parses Opening amount with dot or comma and defaults date to injected today", () => {
    expect(
      validateSetOpening({ amount: "12.50", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: true, amount: 12.5, openedOn: "2026-08-14" });
    expect(
      validateSetOpening({ amount: "12,50", openedOn: "2026-08-10" }, calendar),
    ).toEqual({ ok: true, amount: 12.5, openedOn: "2026-08-10" });
  });

  it("accepts Opening date today or tomorrow and a past calendar day", () => {
    expect(
      validateSetOpening({ amount: "1", openedOn: "2026-08-14" }, calendar).ok,
    ).toBe(true);
    expect(
      validateSetOpening({ amount: "1", openedOn: "2026-08-15" }, calendar),
    ).toEqual({ ok: true, amount: 1, openedOn: "2026-08-15" });
    expect(
      validateSetOpening({ amount: "1", openedOn: "2026-01-01" }, calendar).ok,
    ).toBe(true);
  });

  it("rejects empty, junk, and scientific-notation amounts", () => {
    expect(
      validateSetOpening({ amount: "", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: false, reason: "amount_required" });
    expect(
      validateSetOpening({ amount: "abc", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: false, reason: "amount_required" });
    expect(
      validateSetOpening({ amount: "1e2", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: false, reason: "amount_required" });
  });

  it("rejects a negative Opening amount", () => {
    expect(
      validateSetOpening({ amount: "-1", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: false, reason: "amount_negative" });
    expect(
      validateSetOpening({ amount: "-0.01", openedOn: "2026-08-14" }, calendar),
    ).toEqual({ ok: false, reason: "amount_negative" });
  });

  it("rejects Opening amount above numeric(12,2) ceiling", () => {
    expect(
      validateSetOpening(
        { amount: "10000000000", openedOn: "2026-08-14" },
        calendar,
      ),
    ).toEqual({ ok: false, reason: "amount_too_large" });
    expect(
      validateSetOpening(
        { amount: "9999999999.99", openedOn: "2026-08-14" },
        calendar,
      ).ok,
    ).toBe(true);
  });

  it("rejects a missing, malformed, or impossible calendar date", () => {
    expect(
      validateSetOpening({ amount: "1", openedOn: "" }, calendar),
    ).toEqual({ ok: false, reason: "date_required" });
    expect(
      validateSetOpening({ amount: "1", openedOn: "not-a-date" }, calendar),
    ).toEqual({ ok: false, reason: "date_required" });
    expect(
      validateSetOpening({ amount: "1", openedOn: "2026-02-30" }, calendar),
    ).toEqual({ ok: false, reason: "date_required" });
    expect(
      validateSetOpening({ amount: "1", openedOn: "2026-13-01" }, calendar),
    ).toEqual({ ok: false, reason: "date_required" });
  });

  it("rejects an Opening date after injected tomorrow", () => {
    expect(
      validateSetOpening({ amount: "1", openedOn: "2026-08-16" }, calendar),
    ).toEqual({ ok: false, reason: "date_after_tomorrow" });
  });
});

import { describe, expect, it } from "vitest";
import { parseOverrideRate } from "./parse-override-rate";

describe("parseOverrideRate", () => {
  it.each([
    ["3,3012", { ok: true, rate: 3.3012 }],
    ["3.30125", { ok: true, rate: 3.3013 }],
    [" 2 ", { ok: true, rate: 2 }],
    ["0", { ok: false, reason: "rate_required" }],
    ["", { ok: false, reason: "rate_required" }],
    ["abc", { ok: false, reason: "rate_required" }],
    ["1e9", { ok: false, reason: "rate_required" }],
    ["100000000", { ok: false, reason: "rate_too_large" }],
  ])("parses %j", (raw, expected) => {
    expect(parseOverrideRate(raw)).toEqual(expected);
  });
});

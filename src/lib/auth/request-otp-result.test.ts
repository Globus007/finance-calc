import { describe, expect, it } from "vitest";
import {
  isAccountAbsenceError,
  toRequestOtpResult,
} from "./request-otp-result";

describe("toRequestOtpResult (anti-enumeration)", () => {
  it("returns sent when Supabase succeeds", () => {
    expect(toRequestOtpResult(null)).toEqual({ status: "sent" });
    expect(toRequestOtpResult(undefined)).toEqual({ status: "sent" });
  });

  it("collapses missing-account errors into sent (same as success)", () => {
    expect(toRequestOtpResult("Signups not allowed for otp")).toEqual({
      status: "sent",
    });
    expect(toRequestOtpResult("User not found")).toEqual({ status: "sent" });
    expect(toRequestOtpResult("user_not_found")).toEqual({ status: "sent" });
  });

  it("exposes only rate-limit and generic failures", () => {
    expect(toRequestOtpResult("For security purposes, you can only request this after 60 seconds.")).toEqual(
      { status: "rate_limited" },
    );
    expect(toRequestOtpResult("Unexpected provider failure")).toEqual({
      status: "unavailable",
    });
  });
});

describe("isAccountAbsenceError", () => {
  it("detects signup-disabled and not-found phrasing", () => {
    expect(isAccountAbsenceError("Signups not allowed for otp")).toBe(true);
    expect(isAccountAbsenceError("User not found")).toBe(true);
    expect(isAccountAbsenceError("Invalid login credentials")).toBe(false);
  });
});

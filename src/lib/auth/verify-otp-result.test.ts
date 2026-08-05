import { describe, expect, it } from "vitest";
import { toVerifyOtpResult } from "./verify-otp-result";

describe("toVerifyOtpResult", () => {
  it("returns ok when provider has no error", () => {
    expect(toVerifyOtpResult(null)).toEqual({ status: "ok" });
    expect(toVerifyOtpResult(undefined)).toEqual({ status: "ok" });
  });

  it("maps expired / wrong token to invalid_code", () => {
    expect(toVerifyOtpResult("Token has expired or is invalid")).toEqual({
      status: "invalid_code",
    });
    expect(toVerifyOtpResult("Invalid OTP")).toEqual({
      status: "invalid_code",
    });
  });

  it("maps rate limits separately", () => {
    expect(toVerifyOtpResult("For security purposes, you can only request this after 60 seconds")).toEqual(
      { status: "rate_limited" },
    );
  });

  it("collapses other provider errors to unavailable", () => {
    expect(toVerifyOtpResult("Internal server error")).toEqual({
      status: "unavailable",
    });
  });
});

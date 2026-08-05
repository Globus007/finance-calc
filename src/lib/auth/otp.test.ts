import { describe, expect, it } from "vitest";
import { isValidEmail, isValidOtpCode, normalizeOtpCode } from "./otp";

describe("isValidEmail", () => {
  it("accepts a normal email address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects empty or malformed values", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@missing.local")).toBe(false);
  });
});

describe("OTP code shape", () => {
  it("accepts exactly six digits", () => {
    expect(isValidOtpCode("123456")).toBe(true);
  });

  it("rejects wrong length or non-digits", () => {
    expect(isValidOtpCode("12345")).toBe(false);
    expect(isValidOtpCode("1234567")).toBe(false);
    expect(isValidOtpCode("12 456")).toBe(false);
    expect(isValidOtpCode("abcdef")).toBe(false);
  });

  it("strips spaces when normalizing pasted codes", () => {
    expect(normalizeOtpCode("123 456")).toBe("123456");
    expect(normalizeOtpCode("  999888 ")).toBe("999888");
  });
});

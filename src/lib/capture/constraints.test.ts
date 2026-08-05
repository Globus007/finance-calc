import { describe, expect, it } from "vitest";
import { isCaptureOnline, isCaptureSecureContext } from "./constraints";

describe("isCaptureSecureContext", () => {
  it("allows HTTPS / localhost secure contexts", () => {
    expect(isCaptureSecureContext(true)).toBe(true);
  });

  it("blocks insecure (non-HTTPS non-localhost) contexts", () => {
    expect(isCaptureSecureContext(false)).toBe(false);
  });

  it("treats unknown as insecure (fail closed for media)", () => {
    expect(isCaptureSecureContext(undefined)).toBe(false);
  });
});

describe("isCaptureOnline", () => {
  it("allows when navigator reports online", () => {
    expect(isCaptureOnline(true)).toBe(true);
  });

  it("blocks offline before upload (pre-capture, no queue)", () => {
    expect(isCaptureOnline(false)).toBe(false);
  });

  it("assumes online when status is unknown (server / SSR)", () => {
    expect(isCaptureOnline(undefined)).toBe(true);
  });
});

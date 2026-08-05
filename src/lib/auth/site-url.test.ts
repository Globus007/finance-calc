import { describe, expect, it } from "vitest";
import {
  isLocalHost,
  resolvePostAuthPath,
  resolvePublicOrigin,
} from "./site-url";

describe("resolvePostAuthPath", () => {
  it("allowlists /month and defaults everything else to home", () => {
    expect(resolvePostAuthPath("/month")).toBe("/month");
    expect(resolvePostAuthPath(null)).toBe("/");
    expect(resolvePostAuthPath("/")).toBe("/");
    expect(resolvePostAuthPath("https://evil.example")).toBe("/");
    expect(resolvePostAuthPath("/login")).toBe("/");
  });
});

describe("isLocalHost", () => {
  it("detects loopback hosts with and without scheme/port", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("localhost:3000")).toBe(true);
    expect(isLocalHost("http://localhost:3000")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("https://finance-calc-inky.vercel.app")).toBe(false);
    expect(isLocalHost("finance-calc-inky.vercel.app")).toBe(false);
  });
});

describe("resolvePublicOrigin", () => {
  it("prefers non-local request host over localhost SITE_URL", () => {
    expect(
      resolvePublicOrigin({
        configured: "http://localhost:3000",
        host: "finance-calc-inky.vercel.app",
        proto: "https",
      }),
    ).toBe("https://finance-calc-inky.vercel.app");
  });

  it("uses non-local SITE_URL when request host is local/missing", () => {
    expect(
      resolvePublicOrigin({
        configured: "https://finance-calc-inky.vercel.app",
        host: "localhost:3000",
      }),
    ).toBe("https://finance-calc-inky.vercel.app");
  });

  it("uses Vercel production alias when env is production and host missing", () => {
    expect(
      resolvePublicOrigin({
        configured: "http://localhost:3000",
        vercelEnv: "production",
        vercelProductionUrl: "finance-calc-inky.vercel.app",
      }),
    ).toBe("https://finance-calc-inky.vercel.app");
  });

  it("uses VERCEL_URL for preview-style deployments", () => {
    expect(
      resolvePublicOrigin({
        configured: "http://localhost:3000",
        vercelEnv: "preview",
        vercelUrl: "finance-calc-abc123-team.vercel.app",
      }),
    ).toBe("https://finance-calc-abc123-team.vercel.app");
  });

  it("falls back to localhost for pure local dev", () => {
    expect(
      resolvePublicOrigin({
        configured: "http://localhost:3000",
        host: "localhost:3000",
      }),
    ).toBe("http://localhost:3000");
    expect(resolvePublicOrigin({})).toBe("http://localhost:3000");
  });
});

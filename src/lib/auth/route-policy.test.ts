import { describe, expect, it } from "vitest";
import {
  isAuthPublicPath,
  resolveAuthRedirect,
} from "./route-policy";

describe("isAuthPublicPath", () => {
  it("allows login and auth confirm without a session", () => {
    expect(isAuthPublicPath("/login")).toBe(true);
    expect(isAuthPublicPath("/auth/confirm")).toBe(true);
  });

  it("allows telegram API paths without a session", () => {
    expect(isAuthPublicPath("/api/telegram/auth")).toBe(true);
    expect(isAuthPublicPath("/api/telegram/webhook")).toBe(true);
  });

  it("treats protected app shell paths as not public", () => {
    expect(isAuthPublicPath("/")).toBe(false);
    expect(isAuthPublicPath("/month")).toBe(false);
    expect(isAuthPublicPath("/auth/other")).toBe(false);
    expect(isAuthPublicPath("/api/other")).toBe(false);
  });
});

describe("resolveAuthRedirect", () => {
  it("sends unauthenticated users from protected routes to login", () => {
    expect(resolveAuthRedirect({ pathname: "/", hasUser: false })).toBe(
      "/login",
    );
    expect(resolveAuthRedirect({ pathname: "/month", hasUser: false })).toBe(
      "/login",
    );
  });

  it("does not redirect unauthenticated users on public auth paths", () => {
    expect(resolveAuthRedirect({ pathname: "/login", hasUser: false })).toBe(
      null,
    );
    expect(
      resolveAuthRedirect({ pathname: "/auth/confirm", hasUser: false }),
    ).toBe(null);
  });

  it("sends authenticated users away from login to home", () => {
    expect(resolveAuthRedirect({ pathname: "/login", hasUser: true })).toBe(
      "/",
    );
  });

  it("lets authenticated users stay on app shell routes", () => {
    expect(resolveAuthRedirect({ pathname: "/", hasUser: true })).toBe(null);
    expect(resolveAuthRedirect({ pathname: "/month", hasUser: true })).toBe(
      null,
    );
  });
});

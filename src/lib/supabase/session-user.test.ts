import { describe, expect, it } from "vitest";
import { userFromGetUserResult } from "./session-user";

describe("userFromGetUserResult", () => {
  it("returns the user when getUser succeeds", () => {
    expect(
      userFromGetUserResult({
        data: { user: { id: "u1" } },
        error: null,
      }),
    ).toEqual({ id: "u1" });
  });

  it("returns null when there is no session", () => {
    expect(
      userFromGetUserResult({
        data: { user: null },
        error: null,
      }),
    ).toBeNull();
  });

  it("treats Auth session missing with user: null as logged out", () => {
    expect(
      userFromGetUserResult({
        data: { user: null },
        error: { message: "Auth session missing!" },
      }),
    ).toBeNull();
  });

  it("does not throw when data is missing and there is no error", () => {
    expect(
      userFromGetUserResult({
        data: null,
        error: null,
      }),
    ).toBeNull();
  });

  it("throws a session error instead of crashing on data: null + error", () => {
    expect(() =>
      userFromGetUserResult({
        data: null,
        error: { message: "Auth session missing!" },
      }),
    ).toThrow("Failed to load session: Auth session missing!");
  });
});

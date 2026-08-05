import { describe, expect, it } from "vitest";
import { resolvePostAuthPath } from "./site-url";

describe("resolvePostAuthPath", () => {
  it("allowlists /month and defaults everything else to home", () => {
    expect(resolvePostAuthPath("/month")).toBe("/month");
    expect(resolvePostAuthPath(null)).toBe("/");
    expect(resolvePostAuthPath("/")).toBe("/");
    expect(resolvePostAuthPath("https://evil.example")).toBe("/");
    expect(resolvePostAuthPath("/login")).toBe("/");
  });
});

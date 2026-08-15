import { describe, expect, it } from "vitest";
import { isServerComponentDigestNotice } from "./is-server-component-digest-notice";

/** Exact Honeybadger fault 133287303 message (production iPhone Safari). */
const FAULT_441 =
  "Minified React error #441; visit https://react.dev/errors/441 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";

const UNMINIFIED_441 =
  "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.";

describe("isServerComponentDigestNotice", () => {
  it("drops the production React #441 digest from fault 133287303", () => {
    expect(isServerComponentDigestNotice({ message: FAULT_441 })).toBe(true);
  });

  it("drops the unminified Server Components render wrapper", () => {
    expect(isServerComponentDigestNotice({ message: UNMINIFIED_441 })).toBe(
      true,
    );
  });

  it("keeps first-party client errors", () => {
    expect(
      isServerComponentDigestNotice({
        message: "useCapture must be used within CaptureProvider",
      }),
    ).toBe(false);
    expect(
      isServerComponentDigestNotice({
        message: "Failed to load expenses: JWT expired",
      }),
    ).toBe(false);
  });

  it("keeps notices with no message", () => {
    expect(isServerComponentDigestNotice(undefined)).toBe(false);
    expect(isServerComponentDigestNotice({})).toBe(false);
  });
});

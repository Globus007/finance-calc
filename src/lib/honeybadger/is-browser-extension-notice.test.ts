import { describe, expect, it } from "vitest";
import { isBrowserExtensionNotice } from "./is-browser-extension-notice";

/** Stack from Honeybadger fault 133494264 (Urban VPN content script). */
const URBAN_VPN_STACK =
  "TypeError: Cannot read properties of undefined (reading 'M_ID')\n" +
  "    at F (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:761)\n" +
  "    at X (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:1442)";

describe("isBrowserExtensionNotice", () => {
  it("drops the Urban VPN unhandledrejection that Honeybadger grouped as M_ID", () => {
    expect(
      isBrowserExtensionNotice({
        message:
          "UnhandledPromiseRejectionWarning: TypeError: Cannot read properties of undefined (reading 'M_ID')",
        stack: URBAN_VPN_STACK,
        backtrace: [
          {
            file: "chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js",
          },
        ],
      }),
    ).toBe(true);
  });

  it("drops when only the raw stack names a chrome-extension URL", () => {
    expect(isBrowserExtensionNotice({ stack: URBAN_VPN_STACK })).toBe(true);
  });

  it("drops Firefox and Safari extension frames", () => {
    expect(
      isBrowserExtensionNotice({
        backtrace: [{ file: "moz-extension://abcd/content.js" }],
      }),
    ).toBe(true);
    expect(
      isBrowserExtensionNotice({
        stack: "Error: boom\n    at safari-extension://x/y.js:1:1",
      }),
    ).toBe(true);
    expect(
      isBrowserExtensionNotice({
        stack: "Error: boom\n    at safari-web-extension://x/y.js:1:1",
      }),
    ).toBe(true);
  });

  it("keeps first-party app errors", () => {
    expect(
      isBrowserExtensionNotice({
        message: "Cannot read properties of undefined (reading 'id')",
        stack:
          "TypeError: Cannot read properties of undefined (reading 'id')\n" +
          "    at loadMoney (https://finance-calc-inky.vercel.app/_next/static/chunks/app.js:12:40)",
        backtrace: [
          {
            file: "https://finance-calc-inky.vercel.app/_next/static/chunks/app.js",
          },
        ],
      }),
    ).toBe(false);
  });

  it("keeps notices with no stack", () => {
    expect(isBrowserExtensionNotice(undefined)).toBe(false);
    expect(isBrowserExtensionNotice({})).toBe(false);
  });
});

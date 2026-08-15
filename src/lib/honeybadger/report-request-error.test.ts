import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isNextControlFlowError,
  reportRequestError,
} from "./report-request-error";

const notifyAsync = vi.fn(async () => undefined);

vi.mock("./server", () => ({
  getServerHoneybadger: () => ({
    config: { apiKey: "test-key" },
    notifyAsync,
  }),
}));

afterEach(() => {
  notifyAsync.mockClear();
});

const request = { path: "/", method: "GET" };
const context = {
  routerKind: "App Router",
  routePath: "/",
  routeType: "render",
  renderSource: "react-server-components",
};

describe("isNextControlFlowError", () => {
  it("skips redirect and notFound control-flow throws", () => {
    expect(
      isNextControlFlowError(
        Object.assign(new Error("NEXT_REDIRECT"), {
          digest: "NEXT_REDIRECT;replace;/login;307;",
        }),
      ),
    ).toBe(true);
    expect(
      isNextControlFlowError(
        Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_NOT_FOUND" }),
      ),
    ).toBe(true);
  });

  it("keeps loader failures", () => {
    expect(
      isNextControlFlowError(new Error("Failed to load expenses: JWT expired")),
    ).toBe(false);
  });
});

describe("reportRequestError", () => {
  it("notifies Honeybadger with the original server exception and route", async () => {
    const err = new Error("Failed to load expenses: JWT expired");
    await reportRequestError(err, request, context);

    expect(notifyAsync).toHaveBeenCalledTimes(1);
    expect(notifyAsync).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        name: "onRequestError",
        context: expect.objectContaining({
          path: "/",
          method: "GET",
          routePath: "/",
          renderSource: "react-server-components",
        }),
      }),
    );
  });

  it("does not notify Next.js redirects", async () => {
    await reportRequestError(
      Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" }),
      request,
      context,
    );
    expect(notifyAsync).not.toHaveBeenCalled();
  });
});

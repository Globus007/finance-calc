import { getServerHoneybadger } from "./server";

type RequestInfo = Readonly<{
  path: string;
  method: string;
}>;

type RequestContext = Readonly<{
  routerKind: string;
  routePath: string;
  routeType: string;
  renderSource?: string;
}>;

/**
 * Report the original server exception (not the client React #441 digest).
 * Next.js control-flow throws (redirect / notFound) are not faults.
 */
export async function reportRequestError(
  error: unknown,
  request: RequestInfo,
  context: RequestContext,
): Promise<void> {
  if (isNextControlFlowError(error)) return;

  const client = getServerHoneybadger();
  if (!client.config?.apiKey) return;

  const err =
    error instanceof Error ? error : new Error(safeErrorMessage(error));

  const payload = {
    name: "onRequestError",
    context: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
  };

  try {
    await client.notifyAsync(err, payload);
  } catch {
    // Reporting must not fail the request after the original error.
  }
}

export function isNextControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest =
    "digest" in error && error.digest != null ? String(error.digest) : "";
  const message = error instanceof Error ? error.message : "";
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest === "NEXT_NOT_FOUND" ||
    digest === "NEXT_HTTP_ERROR_FALLBACK" ||
    message === "NEXT_REDIRECT" ||
    message === "NEXT_NOT_FOUND"
  );
}

function safeErrorMessage(error: unknown): string {
  try {
    return String(error);
  } catch {
    return "Unknown server error";
  }
}

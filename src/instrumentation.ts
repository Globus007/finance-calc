import type { Instrumentation } from "next";
import { reportRequestError } from "@/lib/honeybadger/report-request-error";

/**
 * Capture the original Server Component / route exception.
 * The client only sees React #441 (digest); this is the real fault.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  await reportRequestError(error, request, context);
};

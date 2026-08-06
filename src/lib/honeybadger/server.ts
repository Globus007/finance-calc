import Honeybadger from "@honeybadger-io/js";
import { honeybadgerConfig } from "./config";

let configured = false;

/**
 * Server-side Honeybadger singleton for Server Actions / Node runtime.
 * No-op notify when API key is missing (local/tests).
 */
export function getServerHoneybadger(): typeof Honeybadger {
  if (!configured) {
    Honeybadger.configure({
      apiKey: honeybadgerConfig.apiKey,
      environment: honeybadgerConfig.environment,
      revision: honeybadgerConfig.revision,
    });
    configured = true;
  }
  return Honeybadger;
}

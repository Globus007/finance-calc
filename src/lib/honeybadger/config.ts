/**
 * Shared Honeybadger configure options for browser, Node, and edge.
 * Turbopack-friendly: no webpack entry injection / source-map plugin.
 */
export const honeybadgerConfig = {
  apiKey: process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY,
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV,
  revision:
    process.env.NEXT_PUBLIC_HONEYBADGER_REVISION ||
    process.env.VERCEL_GIT_COMMIT_SHA,
};

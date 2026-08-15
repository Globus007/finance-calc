/**
 * Next.js replaces the real Server Component exception with React #441
 * on the client (production digest). Honeybadger fault 133287303:
 * `error.tsx` notified that wrapper, so the fault has no server message.
 *
 * The original throw is available only on the server (`onRequestError`).
 */
const SERVER_COMPONENT_DIGEST = /Minified React error #441\b/;
const SERVER_COMPONENT_RENDER =
  /An error occurred in the Server Components render/;

export type HoneybadgerMessageLike = {
  message?: string;
};

export function isServerComponentDigestNotice(
  notice?: HoneybadgerMessageLike | null,
): boolean {
  if (!notice?.message) return false;
  return (
    SERVER_COMPONENT_DIGEST.test(notice.message) ||
    SERVER_COMPONENT_RENDER.test(notice.message)
  );
}

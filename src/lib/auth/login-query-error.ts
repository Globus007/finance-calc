/**
 * Login `?error=` query codes. Magic-link confirm and OAuth callback
 * must not share a code: the form copy is path-specific.
 */
export const LOGIN_QUERY_ERROR = {
  auth: "auth",
  oauth: "oauth",
} as const;

const AUTH_LINK_ERROR =
  "Не удалось войти по ссылке. Запросите новый код и введите его здесь, в приложении.";

const OAUTH_CALLBACK_ERROR =
  "Не удалось войти через провайдера. Попробуйте ещё раз.";

export function messageForLoginQueryError(
  code: string | null | undefined,
): string | null {
  if (code === LOGIN_QUERY_ERROR.auth) {
    return AUTH_LINK_ERROR;
  }
  if (code === LOGIN_QUERY_ERROR.oauth) {
    return OAUTH_CALLBACK_ERROR;
  }
  return null;
}

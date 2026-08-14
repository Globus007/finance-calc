/**
 * Mini App native chrome must follow our token family (issue #76).
 * Telegram themeParams may be copied to --tg-* CSS vars, but those
 * vars must not drive in-app color or setHeaderColor / setBackgroundColor.
 */

export type TelegramChromeWebApp = {
  themeParams?: Record<string, string | undefined>;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function copyTelegramThemeVars(
  themeParams: Record<string, string | undefined> | undefined,
): void {
  const tp = themeParams ?? {};
  const map: Record<string, string | undefined> = {
    "--tg-bg": tp.bg_color,
    "--tg-text": tp.text_color,
    "--tg-hint": tp.hint_color,
    "--tg-button": tp.button_color,
    "--tg-button-text": tp.button_text_color,
    "--tg-secondary-bg": tp.secondary_bg_color,
    "--tg-header-bg": tp.header_bg_color,
  };
  const root = document.documentElement;
  for (const [cssVar, value] of Object.entries(map)) {
    if (value) root.style.setProperty(cssVar, value);
  }
}

export function paintTelegramNativeChrome(webApp: TelegramChromeWebApp): void {
  copyTelegramThemeVars(webApp.themeParams);
  const surface = token("--surface", "#f5f7fc");
  const brand = token("--brand", "#4f46e5");
  try {
    webApp.setBackgroundColor?.(surface);
  } catch {
    // older clients
  }
  try {
    webApp.setHeaderColor?.(brand);
  } catch {
    // older clients
  }
}

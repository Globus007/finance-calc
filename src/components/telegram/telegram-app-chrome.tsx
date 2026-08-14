"use client";

/**
 * SPIKE: telegram-feel-demo — theme + BackButton on authenticated shell.
 * Only active when Telegram.WebApp.initData is present.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { paintTelegramNativeChrome } from "@/lib/telegram/native-chrome";

type TgWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  themeParams?: Record<string, string | undefined>;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
};

export function TelegramAppChrome() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const webApp = (window as unknown as { Telegram?: { WebApp?: TgWebApp } })
      .Telegram?.WebApp;
    if (!webApp?.initData) return;

    try {
      webApp.ready?.();
      webApp.expand?.();
    } catch {
      // ignore
    }

    paintTelegramNativeChrome(webApp);

    const back = webApp.BackButton;
    if (!back) return;

    const onBack = () => {
      if (pathname === "/" || pathname === "/login") {
        back.hide();
        return;
      }
      router.back();
    };

    // Show BackButton on nested surfaces (feel of native chrome).
    if (pathname !== "/" && pathname !== "/login") {
      back.show();
      back.onClick(onBack);
    } else {
      back.hide();
    }

    return () => {
      try {
        back.offClick(onBack);
        back.hide();
      } catch {
        // ignore
      }
    };
  }, [pathname, router]);

  return null;
}

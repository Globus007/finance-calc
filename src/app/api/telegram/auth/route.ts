/**
 * SPIKE: telegram-feel-demo — Mini App initData → Supabase session (ADR-0009).
 * Pattern A: HMAC validate → mapping store → admin generateLink → verifyOtp cookies.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTelegramBotToken,
  INIT_DATA_MAX_AGE_SEC,
  isTelegramSpikeConfigured,
} from "@/lib/telegram/config";
import { lookupTelegramUser } from "@/lib/telegram/mapping";
import { validateWebAppInitData } from "@/lib/telegram/validate-init-data";

export type TelegramAuthBody = {
  initData?: string;
};

export type TelegramAuthResponse =
  | { status: "ok" }
  | {
      status: "error";
      reason:
        | "not_configured"
        | "invalid"
        | "stale"
        | "unmapped"
        | "mint_failed"
        | "bad_request";
    };

export async function POST(request: NextRequest) {
  if (!isTelegramSpikeConfigured()) {
    return NextResponse.json(
      { status: "error", reason: "not_configured" } satisfies TelegramAuthResponse,
      { status: 503 },
    );
  }

  let body: TelegramAuthBody;
  try {
    body = (await request.json()) as TelegramAuthBody;
  } catch {
    return NextResponse.json(
      { status: "error", reason: "bad_request" } satisfies TelegramAuthResponse,
      { status: 400 },
    );
  }

  const initData = typeof body.initData === "string" ? body.initData : "";
  const botToken = getTelegramBotToken();
  if (!botToken) {
    return NextResponse.json(
      { status: "error", reason: "not_configured" } satisfies TelegramAuthResponse,
      { status: 503 },
    );
  }

  const validated = validateWebAppInitData(initData, botToken, {
    maxAgeSec: INIT_DATA_MAX_AGE_SEC,
  });

  if (!validated.ok) {
    const reason =
      validated.reason === "stale"
        ? "stale"
        : validated.reason === "missing_user"
          ? "invalid"
          : "invalid";
    return NextResponse.json(
      { status: "error", reason } satisfies TelegramAuthResponse,
      { status: 401 },
    );
  }

  let link;
  try {
    link = await lookupTelegramUser(validated.telegramId);
  } catch {
    return NextResponse.json(
      { status: "error", reason: "mint_failed" } satisfies TelegramAuthResponse,
      { status: 500 },
    );
  }

  if (!link) {
    return NextResponse.json(
      { status: "error", reason: "unmapped" } satisfies TelegramAuthResponse,
      { status: 403 },
    );
  }

  // Mint session cookies on the response (same shape as email OTP / magic link).
  let response = NextResponse.json({
    status: "ok",
  } satisfies TelegramAuthResponse);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json(
      { status: "error", reason: "mint_failed" } satisfies TelegramAuthResponse,
      { status: 500 },
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.json({
          status: "ok",
        } satisfies TelegramAuthResponse);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const admin = createAdminClient();
    const { data: userData, error: userError } =
      await admin.auth.admin.getUserById(link.userId);
    const email = userData.user?.email;
    if (userError || !email) {
      return NextResponse.json(
        { status: "error", reason: "mint_failed" } satisfies TelegramAuthResponse,
        { status: 500 },
      );
    }

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      return NextResponse.json(
        { status: "error", reason: "mint_failed" } satisfies TelegramAuthResponse,
        { status: 500 },
      );
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
    });

    if (verifyError) {
      return NextResponse.json(
        { status: "error", reason: "mint_failed" } satisfies TelegramAuthResponse,
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { status: "error", reason: "mint_failed" } satisfies TelegramAuthResponse,
      { status: 500 },
    );
  }

  return response;
}

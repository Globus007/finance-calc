import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateWebAppInitData } from "./validate-init-data";

const BOT_TOKEN = "123456:ABC-DEF";

function signInitData(
  fields: Record<string, string>,
  botToken: string,
): string {
  const params = new URLSearchParams(fields);
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateWebAppInitData", () => {
  const nowSec = 1_700_000_000;
  const user = JSON.stringify({ id: 424242, first_name: "Test" });

  it("accepts a correctly signed fresh payload", () => {
    const initData = signInitData(
      { user, auth_date: String(nowSec - 30) },
      BOT_TOKEN,
    );
    const result = validateWebAppInitData(initData, BOT_TOKEN, { nowSec });
    expect(result).toEqual({
      ok: true,
      telegramId: "424242",
      authDate: nowSec - 30,
    });
  });

  it("rejects a wrong bot token", () => {
    const initData = signInitData(
      { user, auth_date: String(nowSec) },
      BOT_TOKEN,
    );
    const result = validateWebAppInitData(initData, "other-token", { nowSec });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects tampered fields", () => {
    const initData = signInitData(
      { user, auth_date: String(nowSec) },
      BOT_TOKEN,
    );
    const tampered = initData.replace("424242", "999999");
    const result = validateWebAppInitData(tampered, BOT_TOKEN, { nowSec });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects stale auth_date", () => {
    const initData = signInitData(
      { user, auth_date: String(nowSec - 301) },
      BOT_TOKEN,
    );
    const result = validateWebAppInitData(initData, BOT_TOKEN, {
      nowSec,
      maxAgeSec: 300,
    });
    expect(result).toEqual({ ok: false, reason: "stale" });
  });

  it("rejects missing user", () => {
    const initData = signInitData(
      { auth_date: String(nowSec) },
      BOT_TOKEN,
    );
    const result = validateWebAppInitData(initData, BOT_TOKEN, { nowSec });
    expect(result).toEqual({ ok: false, reason: "missing_user" });
  });

  it("rejects empty initData", () => {
    expect(validateWebAppInitData("", BOT_TOKEN, { nowSec })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

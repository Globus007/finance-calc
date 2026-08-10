import { describe, expect, it } from "vitest";
import {
  parseOccurredOnReply,
  yesterdayInMinsk,
} from "./parse-occurred-on";

/** Fixed wall clock → 2026-08-10 Europe/Minsk (UTC+3, midday). */
const AT = new Date("2026-08-10T12:00:00+03:00");

describe("parseOccurredOnReply", () => {
  it("parses ISO YYYY-MM-DD when calendar-valid", () => {
    expect(parseOccurredOnReply("2026-08-10", AT)).toBe("2026-08-10");
    expect(parseOccurredOnReply("2026-02-30", AT)).toBeNull();
  });

  it("parses D.M.YYYY and DD.MM.YYYY", () => {
    expect(parseOccurredOnReply("10.8.2026", AT)).toBe("2026-08-10");
    expect(parseOccurredOnReply("09.08.2026", AT)).toBe("2026-08-09");
    expect(parseOccurredOnReply("31.02.2026", AT)).toBeNull();
  });

  it("maps сегодня / вчера to Europe/Minsk calendar days", () => {
    expect(parseOccurredOnReply("сегодня", AT)).toBe("2026-08-10");
    expect(parseOccurredOnReply("вчера", AT)).toBe("2026-08-09");
    expect(parseOccurredOnReply("Сегодня", AT)).toBe("2026-08-10");
  });

  it("rejects empty and unrecognized text", () => {
    expect(parseOccurredOnReply("", AT)).toBeNull();
    expect(parseOccurredOnReply("позапозавчера", AT)).toBeNull();
    expect(parseOccurredOnReply("10/08/2026", AT)).toBeNull();
  });
});

describe("yesterdayInMinsk", () => {
  it("steps back one calendar day", () => {
    expect(yesterdayInMinsk(AT)).toBe("2026-08-09");
  });
});

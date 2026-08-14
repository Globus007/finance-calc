import { describe, expect, it } from "vitest";
import { messageForLoginQueryError } from "./login-query-error";

describe("messageForLoginQueryError", () => {
  it("treats error=auth as a magic-link failure", () => {
    expect(messageForLoginQueryError("auth")).toBe(
      "Не удалось войти по ссылке. Запросите новый код и введите его здесь, в приложении.",
    );
  });

  it("treats error=oauth as a provider callback failure", () => {
    expect(messageForLoginQueryError("oauth")).toBe(
      "Не удалось войти через провайдера. Попробуйте ещё раз.",
    );
  });

  it("ignores unknown or missing codes", () => {
    expect(messageForLoginQueryError(undefined)).toBeNull();
    expect(messageForLoginQueryError(null)).toBeNull();
    expect(messageForLoginQueryError("nope")).toBeNull();
  });
});

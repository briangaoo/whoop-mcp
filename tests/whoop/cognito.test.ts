import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshCognitoSession } from "../../src/whoop/cognito.js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Cognito request timeout", () => {
  it("aborts a refresh that never receives a response", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })));
    const pending = refreshCognitoSession("test@example.com", "refresh-token");
    const expectation = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(30_000);
    await expectation;
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/whoop/cognito.js", () => ({
  decodeJwtExp: () => 0,
  refreshCognitoSession: vi.fn().mockResolvedValue({
    accessToken: "fresh-access",
    refreshToken: "fresh-refresh",
    idToken: "id",
    expiresAt: Date.now() + 3_600_000,
  }),
}));

import { TokenManager } from "../../src/whoop/token_manager.js";

afterEach(() => vi.restoreAllMocks());

describe("TokenManager persistence failures", () => {
  it("keeps using a successfully refreshed in-memory token when persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const manager = new TokenManager({
      email: "test@example.com",
      accessToken: "expired",
      refreshToken: "old-refresh",
      store: { save: () => { throw new Error("read-only filesystem"); } },
    });
    await expect(manager.getToken()).resolves.toBe("fresh-access");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("could not persist"));
  });
});

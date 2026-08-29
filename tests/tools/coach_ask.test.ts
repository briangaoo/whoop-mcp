import { describe, expect, it, vi } from "vitest";
import type { WhoopClient } from "../../src/whoop/client.js";
import { pollCoachTurn } from "../../src/tools/v2/coach_ask.js";

describe("pollCoachTurn", () => {
  it("uses a real deadline instead of a fixed iteration count", async () => {
    let now = 0;
    const get = vi.fn().mockResolvedValue({ turn_status: "PENDING", messages: [] });
    const client = { get } as unknown as WhoopClient;
    const result = await pollCoachTurn(client, "conversation", "turn", {
      timeoutMs: 3_000,
      now: () => now,
      sleep: async (ms) => { now += ms; },
      nextDelayMs: () => 1_400,
    });
    expect(result.timedOut).toBe(true);
    expect(now).toBe(3_000);
    expect(result.polled).toBe(2);
  });

  it("returns a complete assistant response immediately on terminal status", async () => {
    let now = 0;
    const client = {
      get: vi.fn().mockResolvedValue({
        turn_status: "COMPLETE",
        messages: [{ role: "assistant", content: "Recovered response" }],
      }),
    } as unknown as WhoopClient;
    const result = await pollCoachTurn(client, "conversation", "turn", {
      timeoutMs: 30_000,
      now: () => now,
      sleep: async (ms) => { now += ms; },
      nextDelayMs: () => 1_000,
    });
    expect(result).toMatchObject({ responseText: "Recovered response", status: "COMPLETE", polled: 1, timedOut: false });
  });
});

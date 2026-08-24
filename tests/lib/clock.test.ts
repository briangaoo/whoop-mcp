import { describe, expect, it } from "vitest";
import { normalizeClockTime } from "../../src/lib/clock.js";

describe("normalizeClockTime", () => {
  it("accepts the human-friendly forms LLMs commonly provide", () => {
    expect(normalizeClockTime("7:05 AM")).toBe("07:05:00");
    expect(normalizeClockTime("7:05")).toBe("07:05:00");
    expect(normalizeClockTime("19:05:42")).toBe("19:05:42");
  });

  it("rejects invalid clock values", () => {
    expect(normalizeClockTime("29:99")).toBeNull();
  });
});

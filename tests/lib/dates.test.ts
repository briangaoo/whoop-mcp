import { describe, expect, it } from "vitest";
import { canonicalUtc } from "../../src/lib/dates.js";

describe("canonicalUtc", () => {
  it("converts any ISO offset to a canonical UTC wire timestamp", () => {
    expect(canonicalUtc("2026-08-23T13:02:00-04:00")).toBe("2026-08-23T17:02:00.000Z");
  });

  it("rejects invalid datetimes instead of producing an invalid wire value", () => {
    expect(() => canonicalUtc("not-a-date")).toThrow("Invalid timestamp");
  });
});

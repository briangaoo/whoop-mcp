import { describe, expect, it } from "vitest";
import { CatalogGate } from "../../src/whoop/session_state.js";

describe("CatalogGate", () => {
  it("isolates catalog unlocks between MCP sessions", () => {
    const first = new CatalogGate();
    const second = new CatalogGate();
    first.markConsulted("sports");
    expect(first.error("sports", "whoop_sports_catalog")).toBeNull();
    expect(second.error("sports", "whoop_sports_catalog")).not.toBeNull();
  });

  it("keeps each catalog independently gated", () => {
    const gate = new CatalogGate();
    gate.markConsulted("exercises");
    expect(gate.error("exercises", "whoop_lift_catalog")).toBeNull();
    expect(gate.error("behaviors", "whoop_journal_catalog")).not.toBeNull();
  });
});

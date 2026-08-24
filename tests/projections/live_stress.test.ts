import { describe, expect, it } from "vitest";
import { projectLiveStress } from "../../src/projections/live_stress.js";

describe("projectLiveStress", () => {
  it("uses the requested day for timeline freshness instead of 1970", () => {
    const out = projectLiveStress({
      gauge: { gauge_score_display: "1.2" },
      stress_graph: { graph: { plots: [{ plot: { segments: [{ points: [
        { data_scrubber_details: { primary_contextual_display: "9:30 AM", value_display: "1.2" } },
      ] }] } }] } },
    }, "2026-08-24");
    expect(out.last_updated_at).toContain("2026-08-24");
  });
});

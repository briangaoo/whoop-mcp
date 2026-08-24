import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { projectSmartAlarm } from "../../src/projections/smart_alarm.js";
import { SmartAlarmOut } from "../../src/schemas/smart_alarm.js";

const load = (): unknown => JSON.parse(readFileSync(resolve("tests/fixtures", "smart_alarm_current.json"), "utf8"));

describe("projectSmartAlarm — current schedule-list response", () => {
  const input = load() as Parameters<typeof projectSmartAlarm>[0];
  const out = projectSmartAlarm(input);

  it("parses the output schema", () => {
    expect(() => SmartAlarmOut.parse(out)).not.toThrow();
  });

  it("uses alarm_on and scheduled_days from the current WHOOP response", () => {
    expect(out.schedules[0]).toMatchObject({
      enabled: true,
      days_of_week: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      latest_wake_time: "6:25 AM",
    });
  });

  it("backfills write-safe defaults omitted by the schedule list", () => {
    expect(out.schedules[0]).toMatchObject({ sleep_goal: "", timezone_offset: "-0400" });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhoopClient } from "../../src/whoop/client.js";
import { CatalogGate } from "../../src/whoop/session_state.js";
import { registerSportsCatalog } from "../../src/tools/v2/sports_catalog.js";
import { registerActivityCreate } from "../../src/tools/v2/activity_create.js";
import { registerHrZonesSet } from "../../src/tools/v2/hr_zones_set.js";
import { registerLiftCatalog } from "../../src/tools/v2/lift_catalog.js";
import { registerLiftLog } from "../../src/tools/v2/lift_log.js";
import { registerSmartAlarmSet } from "../../src/tools/v2/smart_alarm_set.js";
import { registerProfileUpdate } from "../../src/tools/v2/profile_update.js";
import { EXERCISES } from "../../src/data/exercises.js";

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function connect(register: (server: McpServer) => void): Promise<Client> {
  const server = new McpServer({ name: "test-server", version: "1" });
  register(server);
  const client = new Client({ name: "test-client", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  closers.push(async () => { await client.close(); await server.close(); });
  return client;
}

describe("write-tool validation through MCP", () => {
  it("rejects short activity windows before preview or mutation", async () => {
    const post = vi.fn();
    const whoop = { post } as unknown as WhoopClient;
    const gate = new CatalogGate();
    const client = await connect((server) => {
      registerSportsCatalog(server, whoop, gate);
      registerActivityCreate(server, whoop, gate);
    });
    await client.callTool({ name: "whoop_sports_catalog", arguments: { search: "running" } });
    const result = await client.callTool({
      name: "whoop_activity_create",
      arguments: {
        sport_id: 0,
        start: "2026-08-24T12:00:00-04:00",
        end: "2026-08-24T12:00:30-04:00",
        confirm: true,
      },
    });
    expect(result.isError).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("returns a valid preview without mutating, then sends a confirmed activity", async () => {
    const post = vi.fn().mockResolvedValue({ id: "activity-1", cycle_id: 42 });
    const whoop = { post } as unknown as WhoopClient;
    const gate = new CatalogGate();
    const client = await connect((server) => {
      registerSportsCatalog(server, whoop, gate);
      registerActivityCreate(server, whoop, gate);
    });
    await client.callTool({ name: "whoop_sports_catalog", arguments: {} });
    const args = {
      sport_id: 0,
      start: "2026-08-24T12:00:00-04:00",
      end: "2026-08-24T12:30:00-04:00",
    };
    const preview = await client.callTool({ name: "whoop_activity_create", arguments: args });
    expect(preview.isError).not.toBe(true);
    expect(post).not.toHaveBeenCalled();
    await client.callTool({ name: "whoop_activity_create", arguments: { ...args, confirm: true } });
    expect(post).toHaveBeenCalledOnce();
  });

  it("rejects duplicate or overlapping custom HR zones without mutation", async () => {
    const post = vi.fn();
    const whoop = { post } as unknown as WhoopClient;
    const client = await connect((server) => registerHrZonesSet(server, whoop));
    const result = await client.callTool({
      name: "whoop_hr_zones_set",
      arguments: {
        mode: "custom",
        zones: [
          { id: "ZONE_1", min: 50, max: 100 },
          { id: "ZONE_2", min: 90, max: 120 },
          { id: "ZONE_3", min: 120, max: 140 },
          { id: "ZONE_4", min: 140, max: 160 },
          { id: "ZONE_5", min: 160, max: 190 },
        ],
        confirm: true,
      },
    });
    expect(result.isError).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects reversed strength-workout windows before mutation", async () => {
    const post = vi.fn();
    const whoop = { post } as unknown as WhoopClient;
    const gate = new CatalogGate();
    const client = await connect((server) => {
      registerLiftCatalog(server, whoop, gate);
      registerLiftLog(server, whoop, gate);
    });
    await client.callTool({ name: "whoop_lift_catalog", arguments: { limit: 1 } });
    const result = await client.callTool({
      name: "whoop_lift_log",
      arguments: {
        start: "2026-08-24T13:00:00-04:00",
        end: "2026-08-24T12:00:00-04:00",
        exercises: [{ exercise_id: EXERCISES[0]!.exercise_id, sets: [{ reps: 5 }] }],
        confirm: true,
      },
    });
    expect(result.isError).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });

  it("rejects impossible Smart Alarm clock values before mutation", async () => {
    const put = vi.fn();
    const whoop = { put } as unknown as WhoopClient;
    const client = await connect((server) => registerSmartAlarmSet(server, whoop));
    const result = await client.callTool({
      name: "whoop_smart_alarm_set",
      arguments: {
        mode: "schedule",
        schedule_id: "schedule-1",
        schedule: {
          enabled: true,
          days_of_week: ["MONDAY"],
          latest_wake_time: "29:99:00",
          alarm_mode: "EXACT_TIME_PEAK",
          timezone_offset: "-0400",
        },
        confirm: true,
      },
    });
    expect(result.isError).toBe(true);
    expect(put).not.toHaveBeenCalled();
  });

  it("rejects an empty profile update without even fetching the profile", async () => {
    const get = vi.fn();
    const put = vi.fn();
    const whoop = { get, put } as unknown as WhoopClient;
    const client = await connect((server) => registerProfileUpdate(server, whoop));
    const result = await client.callTool({
      name: "whoop_profile_update",
      arguments: { confirm: true },
    });
    expect(result.isError).toBe(true);
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});

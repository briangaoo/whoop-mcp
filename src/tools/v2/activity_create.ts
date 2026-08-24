import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhoopClient } from "../../whoop/client.js";
import { ActivityCreateOut } from "../../schemas/workouts.js";
import { preview } from "../../whoop/write_safety.js";
import { WhoopProjectionError } from "../../whoop/errors.js";
import { jsonOut } from "../../whoop/json_out.js";
import { SPORTS_BY_ID } from "../../data/sports.js";
import type { CatalogGate } from "../../whoop/session_state.js";

const PATH = "/core-details-bff/v0/create-activity";

export function registerActivityCreate(server: McpServer, client: WhoopClient, catalogGate: CatalogGate): void {
  server.tool(
    "whoop_activity_create",
    "WRITE: log a generic off-strap activity for a sport_id (call whoop_sports_catalog first to get one) over a start–end window of at least 1 minute. Preview unless confirm:true.",
    {
      sport_id: z.number().int().describe("Numeric sport_id from whoop_sports_catalog. Must call that tool first; this tool rejects calls otherwise."),
      start: z.iso.datetime({ offset: true }),
      end: z.iso.datetime({ offset: true }),
      gps_enabled: z.boolean().default(false),
      confirm: z.boolean().default(false),
    },
    async ({ sport_id, start, end, gps_enabled, confirm }) => {
      const gate = catalogGate.error("sports", "whoop_sports_catalog");
      if (gate) return { content: [{ type: "text", text: JSON.stringify(gate, null, 2) }], isError: true };
      const sport = SPORTS_BY_ID.get(sport_id);
      if (!sport) {
        return {
          content: [{ type: "text", text: jsonOut({ error: `Unknown sport_id ${sport_id}. Use whoop_sports_catalog to look up valid IDs.` }) }],
          isError: true,
        };
      }
      const durationMs = Date.parse(end) - Date.parse(start);
      if (durationMs < 60_000) {
        return {
          content: [{ type: "text", text: jsonOut({ error: "Activity end must be at least one minute after start." }) }],
          isError: true,
        };
      }
      const body = { sport_id, start_time: start, end_time: end, gps_enabled };
      if (!confirm) {
        return {
          content: [
            {
              type: "text",
              text: jsonOut(
                preview("POST", PATH, {
                  sport_id,
                  sport_name: sport.name,
                  start,
                  end,
                  duration_ms: durationMs,
                }),
              ),
            },
          ],
        };
      }
      const receipt = await client.post<{ id: string; cycle_id: number; sport_id?: number; start?: string; end?: string }>(
        PATH,
        body,
      );
      const projected = {
        created: true as const,
        activity_id: receipt.id,
        cycle_id: receipt.cycle_id,
        start: receipt.start ?? start,
        end: receipt.end ?? end,
        sport_id: receipt.sport_id ?? sport_id,
      };
      try {
        const out = ActivityCreateOut.parse(projected);
        return { content: [{ type: "text", text: jsonOut(out) }] };
      } catch (e) {
        if (e instanceof z.ZodError) throw new WhoopProjectionError("whoop_activity_create", e);
        throw e;
      }
    },
  );
}

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhoopClient } from "../../whoop/client.js";
import { projectWorkoutsList } from "../../projections/workouts.js";
import { jsonOut } from "../../whoop/json_out.js";
import { rangeFromDays } from "../../lib/dates.js";

export function registerLiftOverview(server: McpServer, client: WhoopClient): void {
  server.tool(
    "whoop_lift_overview",
    "Compact recent strength-workout overview. Uses one upstream list request; use whoop_lift_history only when per-exercise aggregates are needed.",
    { limit: z.number().int().min(1).max(20).default(5), end_date: z.iso.date().optional() },
    async ({ limit, end_date }) => {
      const end = end_date ? new Date(`${end_date}T23:59:59.999Z`) : new Date();
      const window = rangeFromDays(60, end);
      const raw = await client.get("/developer/v2/activity/workout", { start: window.start, end: window.end, limit: 25 });
      const all = projectWorkoutsList(raw, undefined, 25);
      const workouts = all.filter((workout) => /weight|strength|powerlift/i.test(workout.sport_name ?? "")).slice(0, limit);
      return { content: [{ type: "text", text: jsonOut({ workouts, detailed_aggregate_available_via: "whoop_lift_history" }) }] };
    },
  );
}

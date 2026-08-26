import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhoopClient } from "../../whoop/client.js";
import { JournalLogOut } from "../../schemas/journal.js";
import { preview } from "../../whoop/write_safety.js";
import { jsonOut } from "../../whoop/json_out.js";
import { todayIso } from "../../lib/dates.js";
import { BEHAVIORS, BEHAVIORS_BY_ID, BEHAVIORS_BY_NAME } from "../../data/behaviors.js";

export function registerJournalLog(server: McpServer, client: WhoopClient, _catalogGate: unknown): void {
  server.tool(
    "whoop_journal_log",
    "WRITE: save the full journal entry for a date — this REPLACES the whole day's entry, so first call whoop_journal to read what's already logged today and resend those entries together with your additions, or they'll be wiped. Use a behavior_tracker_id or exact behavior title/internal name. Empty replacements require allow_empty_replace:true.",
    {
      date: z.iso.date().optional(),
      behaviors: z.array(z.object({
        behavior_tracker_id: z.number().int().optional(),
        behavior: z.string().optional().describe("Exact behavior title or internal name."),
        answered_yes: z.boolean().optional(),
        magnitude_value: z.number().optional(),
        magnitude_label: z.string().optional(),
      })),
      notes: z.string().optional(),
      allow_empty_replace: z.boolean().default(false),
      confirm: z.boolean().default(false),
    },
    async ({ date, behaviors, notes, allow_empty_replace, confirm }) => {
      const d = date ?? todayIso();
      if (behaviors.length === 0 && !allow_empty_replace) {
        return {
          content: [{ type: "text", text: jsonOut({ error: "Refusing to replace a journal with zero behaviors. Set allow_empty_replace:true only when intentional." }) }],
          isError: true,
        };
      }
      const resolved = behaviors.map((behavior) => {
        if (behavior.behavior_tracker_id !== undefined) return { ...behavior, definition: BEHAVIORS_BY_ID.get(behavior.behavior_tracker_id) };
        const name = behavior.behavior?.trim().toLowerCase();
        const definition = name
          ? BEHAVIORS_BY_NAME.get(name) ?? BEHAVIORS.find((b) => b.title.toLowerCase() === name)
          : undefined;
        return { ...behavior, behavior_tracker_id: definition?.behavior_tracker_id, definition };
      });
      const unknown = resolved.filter((b) => !b.definition).map((b) => b.behavior ?? b.behavior_tracker_id);
      if (unknown.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: jsonOut({
                error: "Unknown behavior",
                unknown,
                hint: "Use whoop_journal_catalog",
              }),
            },
          ],
          isError: true,
        };
      }
      for (const b of resolved) {
        const definition = b.definition!;
        if (definition.magnitude === "bare" && (b.answered_yes !== undefined || b.magnitude_value !== undefined)) {
          return { content: [{ type: "text", text: jsonOut({ error: `${definition.title} does not accept a value.` }) }], isError: true };
        }
        if (definition.magnitude === "boolean" && (b.answered_yes === undefined || b.magnitude_value !== undefined)) {
          return { content: [{ type: "text", text: jsonOut({ error: `${definition.title} requires answered_yes and does not accept magnitude_value.` }) }], isError: true };
        }
        if (definition.magnitude === "magnitude" && (b.magnitude_value === undefined || b.answered_yes !== undefined)) {
          return { content: [{ type: "text", text: jsonOut({ error: `${definition.title} requires magnitude_value and does not accept answered_yes.` }) }], isError: true };
        }
      }
      const tracker_inputs = resolved.map((b) => {
        const input: Record<string, unknown> = { behavior_tracker_id: b.behavior_tracker_id };
        if (b.answered_yes !== undefined) input.answered_yes = b.answered_yes;
        if (b.magnitude_value !== undefined) {
          input.magnitude_input_value = b.magnitude_value;
          input.magnitude_input_label = b.magnitude_label ?? String(b.magnitude_value);
        }
        return input;
      });
      const body: Record<string, unknown> = { tracker_inputs };
      if (notes !== undefined) body.notes = notes;
      const path = `/journal-service/v2/journals/entries/user/date/${d}`;
      if (!confirm) {
        const sampleTitles = resolved
          .slice(0, 5)
          .map((b) => b.definition?.title ?? `#${b.behavior_tracker_id}`);
        return {
          content: [
            {
              type: "text",
              text: jsonOut(
                preview("PUT", path, {
                  date: d,
                  behaviors_count: behaviors.length,
                  sample_titles: sampleTitles,
                }),
              ),
            },
          ],
        };
      }
      await client.put(path, body);
      const out = JournalLogOut.parse({ logged: true as const, date: d, behaviors_count: behaviors.length });
      return { content: [{ type: "text", text: jsonOut(out) }] };
    },
  );
}

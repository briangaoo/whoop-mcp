import { z } from "zod";
import { IsoDateTime } from "./primitives.js";

export const LiveFreshnessOut = z.object({
  fetched_at: IsoDateTime,
  source_updated_at: IsoDateTime.nullable(),
  source_age_ms: z.number().int().nonnegative().nullable(),
  completed_cache: z.literal("bypassed"),
});

export const LiveHrOut = z.object({
  current_bpm: z.number().int().nullable(),
  hr_zone: z.number().int().min(0).max(5).nullable(),
  is_recording: z.boolean(),
  last_updated_at: IsoDateTime.nullable(),
  show_live_hr: z.boolean(),
  freshness: LiveFreshnessOut.optional(),
});
export type LiveHrOutT = z.infer<typeof LiveHrOut>;

export const LiveStateOut = z.object({
  state: z.enum(["workout", "sleep", "idle", "recovery", "unknown"]),
  sport_name: z.string().nullable(),
  sport_id: z.number().int().nullable(),
  activity_id: z.string().nullable(),
  started_at: IsoDateTime.nullable(),
  duration_so_far_ms: z.number().int().nullable(),
  tracked_sleep: z.boolean(),
  latest_metrics_at: IsoDateTime.nullable(),
  freshness: LiveFreshnessOut.optional(),
});
export type LiveStateOutT = z.infer<typeof LiveStateOut>;

export const LiveStressOut = z.object({
  current_level: z.number().nullable(),
  baseline_level: z.number().nullable(),
  calibration_state: z.enum(["CALIBRATING", "CALIBRATED"]).nullable(),
  last_updated_at: IsoDateTime.nullable(),
  freshness: LiveFreshnessOut.optional(),
});
export type LiveStressOutT = z.infer<typeof LiveStressOut>;

import { z } from "zod";
import { IsoDateTime } from "./primitives.js";
import { LiveHrOut, LiveStateOut, LiveStressOut } from "./live.js";
import { StrainOut } from "./strain.js";
import { SleepNeedOut } from "./sleep_need.js";
import { TrendOut } from "./trend.js";
import { WorkoutListOut } from "./workouts.js";

const DailyBriefSleep = z.object({
  performance_pct: z.number().nullable(),
  total_sleep_ms: z.number().int().nullable(),
  time_in_bed_ms: z.number().int().nullable().optional(),
  efficiency_pct: z.number().nullable(),
  stages: z.object({
    rem_ms: z.number().int().nullable(),
    light_ms: z.number().int().nullable(),
    sws_ms: z.number().int().nullable(),
    wake_ms: z.number().int().nullable(),
  }).optional(),
  started_at: IsoDateTime.nullable(),
  ended_at: IsoDateTime.nullable(),
});

export const DailyBriefOut = z.object({
  date: z.iso.date(),
  recovery: z.object({
    score: z.number().nullable(), state: z.enum(["GREEN", "YELLOW", "RED"]).nullable(),
    hrv_ms: z.number().nullable(), rhr_bpm: z.number().nullable(),
  }).optional(),
  sleep: DailyBriefSleep.optional(),
  strain: StrainOut.nullable().optional(),
  sleep_plan: SleepNeedOut.nullable().optional(),
  activity: z.object({
    state: z.enum(["workout", "sleep", "idle", "recovery"]).nullable(),
    sport_name: z.string().nullable(), started_at: IsoDateTime.nullable(),
  }).optional(),
});

export const ActivityNowOut = z.object({
  state: LiveStateOut.nullable(),
  heart_rate: LiveHrOut.nullable(),
  stress: LiveStressOut.nullable(),
});

const TrendSegment = z.object({
  label: z.enum(["week", "month", "six_month", "year"]),
  start_date: z.string(), end_date: z.string(), avg: z.number().nullable(),
  min: z.number().nullable(), max: z.number().nullable(), delta_pct: z.number().nullable(),
  unit: z.string().nullable(),
  points: z.array(z.object({ date: z.string(), value: z.number().nullable(), value_display: z.string().nullable() })),
});

export const TrendPackOut = z.object({
  end_date: z.iso.date(),
  window: z.enum(["week", "month", "six_month", "year"]),
  trends: z.array(z.union([
    z.object({ metric: TrendOut.shape.metric, ...TrendSegment.shape }),
    z.object({ metric: TrendOut.shape.metric, window: TrendSegment.shape.label, avg: z.number().nullable(), min: z.number().nullable(), max: z.number().nullable(), delta_pct: z.number().nullable(), unit: z.string().nullable() }),
    z.null(),
  ])),
});

export const WeeklyPlanOut = z.object({
  experimental: z.literal(true),
  date: z.iso.date(), title: z.string().nullable(), days_left: z.string().nullable(),
  accomplished_pct: z.number().nullable(),
  goals: z.array(z.object({
    id: z.string().nullable(), title: z.string().nullable(),
    progress: z.object({ display: z.string().nullable(), current: z.number().nullable(), target: z.number().nullable(), percent: z.number().nullable() }).nullable(),
  })),
});

export const LiftOverviewOut = z.object({
  workouts: WorkoutListOut,
  detailed_aggregate_available_via: z.literal("whoop_lift_history"),
});

export const PreferencesOut = z.object({
  journal_enabled: z.boolean().nullable().optional(),
  notifications: z.array(z.object({ namespace: z.string().nullable(), title: z.string().nullable(), enabled: z.boolean().nullable() })).optional(),
});

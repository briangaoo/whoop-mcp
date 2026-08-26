import { z } from "zod";
import { IsoDateTime, withPreview } from "./primitives.js";

export const HrZonesOut = z.object({
  max_hr: z.number().int().nullable(),
  is_custom: z.boolean(),
  effective_timestamp: IsoDateTime.nullable(),
  zones: z.array(z.object({
    id: z.enum(["ZONE_1", "ZONE_2", "ZONE_3", "ZONE_4", "ZONE_5"]),
    min: z.number().int(),
    max: z.number().int(),
  })),
});
export type HrZonesOutT = z.infer<typeof HrZonesOut>;

export const HrZonesSetOut = withPreview(z.object({
  updated: z.boolean(),
  no_change: z.boolean(),
  mode: z.enum(["max_hr", "custom"]),
}));

export const ProfileUpdateOut = withPreview(z.object({
  updated: z.boolean(),
  no_change: z.boolean(),
  fields_updated: z.array(z.string()),
}));

export const HiddenMetricOut = withPreview(z.object({
  updated: z.boolean(),
  no_change: z.boolean(),
  metric: z.enum(["BODY_COMP", "HEALTHSPAN"]),
  is_hidden: z.boolean(),
}));

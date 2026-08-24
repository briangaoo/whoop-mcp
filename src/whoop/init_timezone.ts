// Auto-detect the user's timezone from their Whoop profile on server boot,
// then cache it for use by jsonOut's timestamp localization. Tier 2 of the
// timezone resolution chain (see src/lib/timezone.ts):
//   1. WHOOP_TIMEZONE env var (explicit override)
//   2. THIS — Whoop profile timezone_offset (zero-config auto-detect)
//   3. System TZ (fallback if both above miss)
//
// Fire-and-forget. We don't want server startup to block on an API call —
// if the fetch fails, getTimezone() falls through to system TZ and tools
// still work, just possibly returning UTC timestamps until the next try.
//
// Refreshed every REFRESH_INTERVAL_MS (default: 1 hour) so a traveler whose
// phone updates their Whoop TZ mid-trip gets the new offset within an hour
// without restarting the server.

import type { WhoopClient } from "./client.js";
import { isValidTimezone, setProfileTimezone } from "../lib/timezone.js";

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

async function fetchProfileTimezone(client: WhoopClient): Promise<string | null> {
  try {
    const bootstrap = await client.get("/users-service/v2/bootstrap");
    if (!bootstrap || typeof bootstrap !== "object") return null;
    const profile = (bootstrap as Record<string, unknown>).profile;
    if (!profile || typeof profile !== "object") return null;
    const offset = (profile as Record<string, unknown>).timezone_offset;
    return typeof offset === "string" && isValidTimezone(offset) ? offset : null;
  } catch {
    return null;
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background profile-TZ auto-detect loop. Safe to call multiple
 * times — subsequent calls clear the previous timer first. The initial fetch
 * fires immediately (not awaited) and the loop refreshes every hour.
 *
 * Skipped entirely if WHOOP_TIMEZONE is set — env var wins and we don't need
 * to spend API calls keeping the cache warm.
 */
export function startTimezoneAutoDetect(client: WhoopClient): void {
  if (process.env.WHOOP_TIMEZONE && isValidTimezone(process.env.WHOOP_TIMEZONE)) return;

  if (refreshTimer) clearInterval(refreshTimer);

  const refresh = async (): Promise<void> => {
    const tz = await fetchProfileTimezone(client);
    if (tz) setProfileTimezone(tz);
  };

  void refresh();
  refreshTimer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
  if (typeof refreshTimer.unref === "function") refreshTimer.unref();
}

export function stopTimezoneAutoDetect(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

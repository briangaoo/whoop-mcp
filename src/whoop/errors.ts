import type { z } from "zod";

/** Extract only conventional API validation fields; never echo an arbitrary body. */
export function apiErrorDetail(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    for (const key of ["error_description", "error", "message", "detail"]) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) return value.trim().replace(/\s+/g, " ").slice(0, 300);
    }
  } catch {
    // A non-JSON 4xx body is intentionally not exposed to the model.
  }
  return undefined;
}

export class WhoopAuthExpiredError extends Error {
  constructor() {
    super(
      "Whoop bearer token expired. Run `totem auth` to capture a fresh one.",
    );
    this.name = "WhoopAuthExpiredError";
  }
}

export class WhoopApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: string,
    description?: string,
  ) {
    // Keep the raw body on `.body` for debugging, but keep it OUT of the
    // human/AI-facing message: a 4xx body can carry a fragment of health data,
    // and this message surfaces to the model and stderr.
    super(`Whoop API error ${status} on ${path}${description ? `: ${description}` : ""}`);
    this.name = "WhoopApiError";
  }
}

export class WhoopServerError extends Error {
  constructor(public readonly status: number, public readonly path: string) {
    super(
      `Whoop API returned ${status} on ${path}. This is usually transient — try again in 30s.`,
    );
    this.name = "WhoopServerError";
  }
}

export class WhoopProjectionError extends Error {
  constructor(public readonly tool: string, public readonly issue: z.ZodError) {
    super(`Projection for ${tool} failed zod parse: ${issue.message.slice(0, 200)}`);
    this.name = "WhoopProjectionError";
  }
}

import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveInstallationId } from "../../src/whoop/installation.js";

const originalId = process.env.WHOOP_INSTALLATION_ID;
const originalEmail = process.env.WHOOP_EMAIL;
const dirs: string[] = [];

afterEach(() => {
  if (originalId === undefined) delete process.env.WHOOP_INSTALLATION_ID;
  else process.env.WHOOP_INSTALLATION_ID = originalId;
  if (originalEmail === undefined) delete process.env.WHOOP_EMAIL;
  else process.env.WHOOP_EMAIL = originalEmail;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("resolveInstallationId", () => {
  it("replaces a blank env entry and reuses the persisted ID after restart", () => {
    const dir = mkdtempSync(join(tmpdir(), "totem-installation-"));
    dirs.push(dir);
    const envPath = join(dir, ".env");
    writeFileSync(envPath, "WHOOP_INSTALLATION_ID=\nWHOOP_EMAIL=test@example.com\n");
    delete process.env.WHOOP_INSTALLATION_ID;
    process.env.WHOOP_EMAIL = "test@example.com";

    const first = resolveInstallationId(envPath);
    expect(readFileSync(envPath, "utf8")).toContain(`WHOOP_INSTALLATION_ID=${first}`);
    delete process.env.WHOOP_INSTALLATION_ID;
    const second = resolveInstallationId(envPath);
    expect(second).toBe(first);
  });

  it("deduplicates blank installation-ID entries while persisting", () => {
    const dir = mkdtempSync(join(tmpdir(), "totem-installation-"));
    dirs.push(dir);
    const envPath = join(dir, ".env");
    writeFileSync(envPath, "WHOOP_INSTALLATION_ID=\nWHOOP_INSTALLATION_ID=\n");
    delete process.env.WHOOP_INSTALLATION_ID;
    process.env.WHOOP_EMAIL = "test@example.com";
    const id = resolveInstallationId(envPath);
    const idLines = readFileSync(envPath, "utf8").split("\n").filter((line) => line.startsWith("WHOOP_INSTALLATION_ID="));
    expect(idLines).toEqual([`WHOOP_INSTALLATION_ID=${id}`]);
  });
});

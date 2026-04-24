import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import {
  buildCatchupReport,
  formatCatchupReport,
  parsePiSessionFile,
} from "../../extensions/planning-with-files/session-catchup.js";
import { checkComplete, summarizeStatus } from "../../extensions/planning-with-files/status.js";
import { ensurePlanningFiles } from "../../extensions/planning-with-files/files.js";

const FIXTURES = join(import.meta.dir, "..", "fixtures");

describe("package smoke tests", () => {
  test("core modules import without side effects", () => {
    expect(() => require("../../extensions/planning-with-files/types.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/security.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/files.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/status.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/context.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/state.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/tools.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/commands.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/session-catchup.js")).not.toThrow();
    expect(() => require("../../extensions/planning-with-files/ui.js")).not.toThrow();
  });

  test("package manifest points to existing extension and skill paths", async () => {
    const pkg = JSON.parse(await readFile(join(import.meta.dir, "..", "..", "package.json"), "utf8"));
    for (const ext of pkg.pi.extensions) {
      expect(existsSync(join(import.meta.dir, "..", "..", ext))).toBe(true);
    }
    for (const skill of pkg.pi.skills) {
      expect(existsSync(join(import.meta.dir, "..", "..", skill, "SKILL.md"))).toBe(true);
    }
  });

  test("basic-plan fixture parses with correct phase counts", async () => {
    const dir = join(FIXTURES, "basic-plan");
    const status = await summarizeStatus(dir);
    expect(status.exists).toBe(true);
    expect(status.counts.total).toBe(3);
    expect(status.counts.complete).toBe(1);
    expect(status.counts.inProgress).toBe(0);
  });

  test("basic-plan fixture is not complete", async () => {
    const dir = join(FIXTURES, "basic-plan");
    const status = await summarizeStatus(dir);
    const result = checkComplete(status);
    expect(result.complete).toBe(false);
  });

  test("unsynced session fixture produces a catchup report", async () => {
    const sessionFile = join(FIXTURES, "pi-sessions", "session-with-unsynced-context.jsonl");
    const report = await buildCatchupReport("/fake/cwd", { sessionFiles: [sessionFile] });
    expect(report.hasReport).toBe(true);
    expect(report.messages.length).toBeGreaterThan(0);
    const formatted = formatCatchupReport(report);
    expect(formatted).toContain("Previous Pi session context");
  });

  test("malformed session fixture does not crash parser", async () => {
    const sessionFile = join(FIXTURES, "pi-sessions", "malformed-session.jsonl");
    const entries = await parsePiSessionFile(sessionFile);
    expect(entries.length).toBeGreaterThan(0);
    const report = await buildCatchupReport("/fake/cwd", { sessionFiles: [sessionFile] });
    expect(report.hasReport).toBe(false);
  });

  test("README documents all commands and trust boundary", async () => {
    const readme = await readFile(join(import.meta.dir, "..", "..", "README.md"), "utf8");
    for (const cmd of ["/plan", "/pwf", "/plan-status", "/plan-check", "/plan-catchup", "/plan-done", "/plan-off", "/plan-on", "/plan-phases"]) {
      expect(readme).toContain(cmd);
    }
    expect(readme).toContain("Trust Boundary");
    expect(readme).toContain("findings.md");
    expect(readme).toContain("pi install");
    expect(readme).toContain("relaunch");
  });

  test("skill docs reference extension automation", async () => {
    const skill = await readFile(join(import.meta.dir, "..", "..", "skills", "planning-with-files", "SKILL.md"), "utf8");
    expect(skill).toContain("extension");
    for (const tool of ["planning_with_files_init", "planning_with_files_status", "planning_with_files_check_complete"]) {
      expect(skill).toContain(tool);
    }
  });

  test("skill docs do not claim shell hooks are required", async () => {
    const skill = await readFile(join(import.meta.dir, "..", "..", "skills", "planning-with-files", "SKILL.md"), "utf8");
    expect(skill).not.toMatch(/shell hooks.*required/i);
    expect(skill).not.toMatch(/hooks.*necessary/i);
  });
});

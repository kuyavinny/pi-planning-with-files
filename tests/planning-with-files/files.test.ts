import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ensurePlanningFiles, getPlanningFilesState, getPlanningPaths, readPlanningFile } from "../../extensions/planning-with-files/files.js";

const packageRoot = resolve(import.meta.dir, "../..");

async function withTempProject<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "pi-pwf-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("planning files", () => {
  test("computes project-root planning paths", () => {
    const paths = getPlanningPaths(".");
    expect(paths.taskPlanPath.endsWith("task_plan.md")).toBe(true);
    expect(paths.findingsPath.endsWith("findings.md")).toBe(true);
    expect(paths.progressPath.endsWith("progress.md")).toBe(true);
  });

  test("creates all missing default planning files", async () => {
    await withTempProject(async (dir) => {
      const result = await ensurePlanningFiles(dir, { packageRoot });
      expect(result.created.sort()).toEqual(["findings.md", "progress.md", "task_plan.md"]);
      const state = await getPlanningFilesState(dir);
      expect(state.exists).toEqual({ taskPlan: true, findings: true, progress: true });
    });
  });

  test("does not overwrite existing planning files", async () => {
    await withTempProject(async (dir) => {
      await writeFile(join(dir, "task_plan.md"), "custom plan", "utf8");
      const result = await ensurePlanningFiles(dir, { packageRoot });
      expect(result.existing).toEqual(["task_plan.md"]);
      expect(await readFile(join(dir, "task_plan.md"), "utf8")).toBe("custom plan");
      expect(result.created.sort()).toEqual(["findings.md", "progress.md"]);
    });
  });

  test("supports analytics template fallback for progress", async () => {
    await withTempProject(async (dir) => {
      await ensurePlanningFiles(dir, { packageRoot, template: "analytics" });
      expect(await readPlanningFile(dir, "task_plan.md")).toContain("Data Discovery");
      expect(await readPlanningFile(dir, "findings.md")).toContain("Data Sources");
      expect(await readPlanningFile(dir, "progress.md")).toContain("Query Log");
    });
  });

  test("throws when a configured template is missing", async () => {
    await withTempProject(async (dir) => {
      await expect(ensurePlanningFiles(dir, { packageRoot: join(dir, "missing-package") })).rejects.toThrow("Missing template");
    });
  });
});

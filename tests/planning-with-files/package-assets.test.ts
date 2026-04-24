import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

const requiredFiles = [
  "package.json",
  "README.md",
  "extensions/planning-with-files/index.ts",
  "skills/planning-with-files/SKILL.md",
  "skills/planning-with-files/examples.md",
  "skills/planning-with-files/reference.md",
  "skills/planning-with-files/templates/task_plan.md",
  "skills/planning-with-files/templates/findings.md",
  "skills/planning-with-files/templates/progress.md",
  "skills/planning-with-files/templates/analytics_task_plan.md",
  "skills/planning-with-files/templates/analytics_findings.md",

];

describe("package assets", () => {
  test("package manifest declares Pi skill and extension resources", () => {
    const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(manifest.pi.extensions).toEqual(["extensions/planning-with-files/index.ts"]);
    expect(manifest.pi.skills).toEqual(["skills/planning-with-files"]);
  });

  test("required skill assets are present", () => {
    for (const file of requiredFiles) {
      expect(existsSync(resolve(root, file)), file).toBe(true);
    }
  });

  test("Pi skill does not claim hooks are unsupported", () => {
    const skill = readFileSync(resolve(root, "skills/planning-with-files/SKILL.md"), "utf8");
    expect(skill.toLowerCase()).not.toContain("hooks are not currently supported");
    expect(skill.toLowerCase()).not.toContain("hooks unsupported");
  });
});

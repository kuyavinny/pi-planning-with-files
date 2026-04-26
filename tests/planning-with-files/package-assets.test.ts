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
  "skills/planning-with-files/templates/brainstorm.md",
  "skills/planning-with-files/templates/discovery.md",
  "skills/planning-with-files/templates/spec.md",
  "skills/planning-with-files/templates/implementation_plan.md",
  "skills/planning-with-files/templates/review.md",
  "skills/planning-with-files/templates/learnings.md",

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

  test("Pi skill contains implementation execution protocol", () => {
    const skill = readFileSync(resolve(root, "skills/planning-with-files/SKILL.md"), "utf8");
    expect(skill).toContain("Implementation Execution Protocol");
    expect(skill).toContain("Compact Loop");
    expect(skill).toContain("Full Loop");
  });

  test("implementation plan template contains execution protocol guidance", () => {
    const plan = readFileSync(resolve(root, "skills/planning-with-files/templates/implementation_plan.md"), "utf8");
    expect(plan).toContain("PwF Execution Protocol");
    expect(plan).toContain("Escalation Checklist");
    expect(plan).toContain("Deviation Log");
  });
});

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

  test("Pi skill requires clarifying dialogue before design gate", () => {
    const skill = readFileSync(resolve(root, "skills/planning-with-files/SKILL.md"), "utf8");
    expect(skill).toContain("design gate cannot proceed until at least one clarifying question");
    expect(skill).toContain("Each brainstorm section must record evidence that the action was actually performed");
  });

  test("Pi skill design gate is a hard stop with explicit user approval", () => {
    const skill = readFileSync(resolve(root, "skills/planning-with-files/SKILL.md"), "utf8");
    expect(skill).toContain("STOP and wait for explicit user approval");
    expect(skill).toContain("Do not create spec.md, implementation_plan.md, or begin implementation until one of those signals occurs");
    expect(skill).toContain("This is a hard stop, not a soft suggestion");
  });

  test("brainstorm template has enforceable design gate section", () => {
    const brainstorm = readFileSync(resolve(root, "skills/planning-with-files/templates/brainstorm.md"), "utf8");
    expect(brainstorm).toContain("THIS IS A HARD STOP");
    expect(brainstorm).toContain("Do not mark this box yourself");
    expect(brainstorm).toContain("The user must signal their choice");
  });

  test("Pi skill contains review protocol with gates and lenses", () => {
    const skill = readFileSync(resolve(root, "skills/planning-with-files/SKILL.md"), "utf8");
    expect(skill).toContain("## Review Protocol");
    expect(skill).toContain("### Review Gates");
    expect(skill).toContain("Self-Check");
    expect(skill).toContain("Plan Sanity");
    expect(skill).toContain("Checkpoint");
    expect(skill).toContain("Final Review");
    expect(skill).toContain("### Conditional Review Lenses");
    expect(skill).toContain("Coherence Lens");
    expect(skill).toContain("Buildability Lens");
    expect(skill).toContain("Scope Lens");
    expect(skill).toContain("Risk Lens");
    expect(skill).toContain("Completeness Lens");
  });

  test("implementation plan template contains checkpoint review", () => {
    const plan = readFileSync(resolve(root, "skills/planning-with-files/templates/implementation_plan.md"), "utf8");
    expect(plan).toContain("## Checkpoint Review");
    expect(plan).toContain("U-ID");
    expect(plan).toContain("Planned");
    expect(plan).toContain("Actual");
    expect(plan).toContain("Deviation");
  });

  test("review template is gate-aware with all four gates", () => {
    const review = readFileSync(resolve(root, "skills/planning-with-files/templates/review.md"), "utf8");
    expect(review).toContain("Review Gate Used");
    expect(review).toContain("## Self-Check");
    expect(review).toContain("## Plan Sanity");
    expect(review).toContain("## Checkpoint Review");
    expect(review).toContain("## Final Review");
    expect(review).toContain("## Conditional Lenses Applied");
    expect(review).toContain("Coherence Lens");
    expect(review).toContain("Buildability Lens");
    expect(review).toContain("Scope Lens");
    expect(review).toContain("Risk Lens");
    expect(review).toContain("Completeness Lens");
  });

  test("implementation plan template contains execution protocol guidance", () => {
    const plan = readFileSync(resolve(root, "skills/planning-with-files/templates/implementation_plan.md"), "utf8");
    expect(plan).toContain("PwF Execution Protocol");
    expect(plan).toContain("Escalation Checklist");
    expect(plan).toContain("Deviation Log");
  });
});

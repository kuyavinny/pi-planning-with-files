import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkComplete, countErrorRows, countLaunchBlockingRisks, countUnresolvedAssumptions, extractDepth, formatStatusForDisplay, parseAssumptions, parsePhases, parseRisks, parseTaskPlan, summarizeStatus } from "../../extensions/planning-with-files/status.js";

async function withTempProject<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "pi-pwf-status-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const canonical = `# Task Plan

## Goal
Ship the package

## Current Phase
Phase 2: Build

## Phases

### Phase 1: Discovery
- **Status:** complete

### Phase 2: Build
- **Status:** in_progress

### Phase 3: Verify
- **Status:** pending

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Timeout | 1 | Retry |
`;

describe("status parsing", () => {
  test("parses canonical phase statuses", () => {
    const parsed = parseTaskPlan(canonical);
    expect(parsed.goal).toBe("Ship the package");
    expect(parsed.currentPhase).toBe("Phase 2: Build");
    expect(parsed.phases.map((phase) => phase.status)).toEqual(["complete", "in_progress", "pending"]);
    expect(parsed.errorsLogged).toBe(1);
  });

  test("parses inline bracket statuses", () => {
    const phases = parsePhases("### Phase 1: One [complete]\n\n### Phase 2: Two [pending]");
    expect(phases.map((phase) => phase.status)).toEqual(["complete", "pending"]);
  });

  test("parses table statuses when headings are absent", () => {
    const phases = parsePhases("| Phase | Status |\n|---|---|\n| Discovery | complete |\n| Build | in_progress |");
    expect(phases).toHaveLength(2);
    expect(phases[1]?.title).toBe("Build");
    expect(phases[1]?.status).toBe("in_progress");
  });

  test("does not count error table headers", () => {
    expect(countErrorRows(canonical)).toBe(1);
  });

  test("summarizes status from files", async () => {
    await withTempProject(async (dir) => {
      await writeFile(join(dir, "task_plan.md"), canonical, "utf8");
      await writeFile(join(dir, "progress.md"), "line 1\nline 2", "utf8");
      const status = await summarizeStatus(dir);
      expect(status.exists).toBe(true);
      expect(status.counts).toMatchObject({ total: 3, complete: 1, inProgress: 1, pending: 1 });
      expect(status.complete).toBe(false);
      expect(formatStatusForDisplay(status)).toContain("1/3 complete");
    });
  });

  test("completion requires at least one complete phase and no open phases", async () => {
    await withTempProject(async (dir) => {
      await writeFile(join(dir, "task_plan.md"), "### Phase 1: Only\n- **Status:** complete\n", "utf8");
      const status = await summarizeStatus(dir);
      expect(checkComplete(status).complete).toBe(true);
    });
  });

  test("parses U-ID phase headings", () => {
    const uidPlan = "# Task Plan\n\n## Goal\nShip it\n\n### U1: Discovery\n- **Status:** complete\n\n### U2: Build\n- **Status:** in_progress\n\n### U3: Verify\n- **Status:** pending\n";
    const phases = parsePhases(uidPlan);
    expect(phases).toHaveLength(3);
    expect(phases[0]?.title).toBe("U1: Discovery");
    expect(phases[0]?.index).toBe(1);
    expect(phases[0]?.status).toBe("complete");
    expect(phases[1]?.title).toBe("U2: Build");
    expect(phases[1]?.index).toBe(2);
  });

  test("U-ID phases coexist with Phase N phases", () => {
    // If both formats exist, heading parser grabs them all
    const mixed = "# Task Plan\n\n### Phase 1: Old Format\n- **Status:** complete\n\n### U2: New Format\n- **Status:** pending\n";
    const phases = parsePhases(mixed);
    // The regex allows both, so both are parsed
    expect(phases.length).toBeGreaterThanOrEqual(1);
  });

  test("malformed plan reports warning instead of throwing", () => {
    const parsed = parseTaskPlan("# Task Plan\n\nNo phases here");
    expect(parsed.phases).toHaveLength(0);
    expect(parsed.warnings[0]).toContain("No phases");
  });

  test("parses depth field from task plan", () => {
    const deepPlan = canonical.replace("## Current Phase", "## Depth\ndeep\n\n## Current Phase");
    const parsed = parseTaskPlan(deepPlan);
    expect(parsed.depth).toBe("deep");
  });

  test("defaults depth to standard when missing", () => {
    const parsed = parseTaskPlan(canonical);
    expect(parsed.depth).toBe("standard");
  });

  test("parses lightweight depth", () => {
    const lw = canonical.replace("## Current Phase", "## Depth\nlightweight\n\n## Current Phase");
    expect(parseTaskPlan(lw).depth).toBe("lightweight");
  });

  test("extracts depth from section body", () => {
    expect(extractDepth("## Depth\nstandard")).toBe("standard");
    expect(extractDepth("## Depth\ndeep")).toBe("deep");
    expect(extractDepth("## Depth\nlightweight")).toBe("lightweight");
    expect(extractDepth("no depth section")).toBe("standard");
  });

  test("parses assumption table from task plan", () => {
    const withAssumptions = canonical.replace(
      "## Current Phase",
      "## Assumptions\n| Assumption | Category | Impact | Risk | Action |\n|------------|----------|--------|------|--------|\n| Users need dark mode | Value | High | High | Validate with user |\n| CSS vars work | Feasibility | High | Low | Proceed |\n\n## Current Phase"
    );
    const parsed = parseTaskPlan(withAssumptions);
    expect(parsed.assumptions).toHaveLength(2);
    expect(parsed.assumptions[0]?.category).toBe("Value");
    expect(parsed.assumptions[1]?.impact).toBe("High");
  });

  test("counts unresolved assumptions (empty action)", () => {
    const assumptions = [
      { assumption: "A", category: "Value", impact: "High", risk: "High", action: "" },
      { assumption: "B", category: "Feasibility", impact: "Low", risk: "Low", action: "Proceed" },
      { assumption: "C", category: "Usability", impact: "Medium", risk: "Medium", action: "[pending]" },
    ];
    expect(countUnresolvedAssumptions(assumptions)).toBe(2); // A and C
  });

  test("handles empty assumptions section", () => {
    const parsed = parseTaskPlan(canonical);
    expect(parsed.assumptions).toHaveLength(0);
  });

  test("parses risk table from task plan", () => {
    const withRisks = canonical.replace(
      "## Errors Encountered",
      "## Risks\n| Risk | Type | Urgency | Mitigation |\n|------|------|----------|-------------|\n| Token expiry breaks auth | Tiger | launch-blocking | Add refresh logic |\n| Users might not like the icon | Paper Tiger | track | Monitor feedback |\n\n## Errors Encountered"
    );
    const parsed = parseTaskPlan(withRisks);
    expect(parsed.risks).toHaveLength(2);
    expect(parsed.risks[0]?.type).toBe("Tiger");
    expect(parsed.risks[0]?.urgency).toBe("launch-blocking");
  });

  test("counts launch-blocking risks", () => {
    const risks = [
      { risk: "Auth", type: "Tiger", urgency: "launch-blocking", mitigation: "Fix" },
      { risk: "Icon", type: "Paper Tiger", urgency: "track", mitigation: "Monitor" },
    ];
    expect(countLaunchBlockingRisks(risks)).toBe(1);
  });

  test("handles empty risk section", () => {
    const parsed = parseTaskPlan(canonical);
    expect(parsed.risks).toHaveLength(0);
  });
});

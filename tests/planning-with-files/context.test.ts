import { describe, expect, test } from "bun:test";
import { buildActivePlanContext, buildReminderContext, PROGRESS_REMINDER } from "../../extensions/planning-with-files/context.js";
import type { PlanStatus, ReminderState } from "../../extensions/planning-with-files/types.js";

const reminders: ReminderState = {
  progressReminderPending: true,
  findingsReminderPending: false,
  errorReminderPending: false,
  completionReminderCount: 0,
  readLikeToolCount: 0,
  repeatedErrorCount: 0,
};

const status: PlanStatus = {
  exists: true,
  projectDir: "/project",
  currentPhase: "Phase 1: Build",
  goal: "Ship the package",
  depth: "standard",
  assumptions: [],
  unresolvedAssumptionCount: 0,
  phases: [
    { index: 1, title: "Phase 1: Build", status: "in_progress", raw: "### Phase 1: Build\n- **Status:** in_progress\n- [ ] Work" },
  ],
  counts: { total: 1, complete: 0, inProgress: 1, pending: 0, failed: 0, blocked: 0, unknown: 0 },
  files: { taskPlan: true, findings: true, progress: true },
  errorsLogged: 0,
  recentProgress: "Created package skeleton",
  planPreview: "# Task Plan",
  complete: false,
  warnings: [],
};

describe("context builders", () => {
  test("builds reminder context without duplicates", () => {
    expect(buildReminderContext(reminders)).toBe(`- ${PROGRESS_REMINDER}`);
  });

  test("builds active plan context", () => {
    const text = buildActivePlanContext(status, reminders);
    expect(text).toContain("[planning-with-files] ACTIVE PLAN");
    expect(text).toContain("Goal: Ship the package");
    expect(text).toContain("Current phase: Phase 1: Build");
    expect(text).toContain("Created package skeleton");
    expect(text).toContain(PROGRESS_REMINDER);
  });

  test("does not include findings content", () => {
    const text = buildActivePlanContext({ ...status, recentProgress: "safe" }, reminders);
    expect(text).not.toContain("# Findings");
    expect(text).toContain("Read findings.md");
  });

  test("truncates long phase details", () => {
    const longStatus = {
      ...status,
      phases: [{ ...status.phases[0]!, raw: Array.from({ length: 50 }, (_, index) => `line ${index}`).join("\n") }],
    };
    const text = buildActivePlanContext(longStatus, reminders, { planMaxLines: 2 });
    expect(text).toContain("[truncated:");
  });

  test("handles missing active plan", () => {
    expect(buildActivePlanContext({ ...status, exists: false }, reminders)).toContain("No active task_plan.md");
  });
});

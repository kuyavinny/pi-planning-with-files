import { describe, expect, test } from "bun:test";
import { clearPlanningStatus, updatePlanningStatus } from "../../extensions/planning-with-files/ui.js";
import type { PlanStatus } from "../../extensions/planning-with-files/types.js";

const status: PlanStatus = {
  exists: true,
  projectDir: "repo",
  currentPhase: "Phase 1",
  goal: "Goal",
  depth: "standard",
  assumptions: [],
  risks: [],
  unresolvedAssumptionCount: 0,
  launchBlockingRiskCount: 0,
  phases: [],
  counts: { total: 5, complete: 2, inProgress: 1, pending: 2, failed: 0, blocked: 0, unknown: 0 },
  files: { taskPlan: true, findings: true, progress: true },
  errorsLogged: 0,
  recentProgress: "",
  planPreview: "",
  complete: false,
  warnings: [],
};

describe("planning UI", () => {
  test("sets a right-aligned widget with progress data when UI is available", () => {
    const calls: any[] = [];
    const ctx = {
      hasUI: true,
      ui: {
        theme: { fg: (_name: string, text: string) => text },
        setWidget: (...args: any[]) => calls.push(args),
      },
    } as any;

    updatePlanningStatus(ctx, status);

    expect(calls).toHaveLength(1);
    const [key, factory] = calls[0] as [string, any];
    expect(key).toBe("PwF");

    const widget = factory({} as any, ctx.ui.theme);
    const lines = widget.render(40);
    expect(lines[0]?.trimStart()).toBe("📋 PwF • Phase 1");
    expect(lines[1]?.trimStart()).toMatch(/^[█░]+$/);
    expect(lines[2]).toContain("Goal: Goal");
    expect(lines[2]).toContain("40%");
    expect(lines[2]).toContain("A:0");
    expect(lines[2]).toContain("R:0");
  });

  test("clears status when no plan exists", () => {
    const calls: any[] = [];
    const ctx = { hasUI: true, ui: { setWidget: (...args: any[]) => calls.push(args) } } as any;
    clearPlanningStatus(ctx);
    updatePlanningStatus(ctx, null);
    expect(calls).toEqual([
      ["PwF", undefined],
      ["PwF", undefined],
    ]);
  });

  test("does nothing without UI", () => {
    updatePlanningStatus({ hasUI: false } as any, status);
  });
});

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
  test("sets a single-line widget with concise goal and progress bar when UI is available", () => {
    const calls: any[] = [];
    const ctx = {
      hasUI: true,
      ui: {
        theme: { fg: (name: string, text: string) => `<${name}>${text}</${name}>` },
        setWidget: (...args: any[]) => calls.push(args),
      },
    } as any;

    updatePlanningStatus(ctx, status);

    expect(calls).toHaveLength(1);
    const [key, factory] = calls[0] as [string, any];
    expect(key).toBe("PwF");

    const widget = factory({} as any, ctx.ui.theme);
    const lines = widget.render(80);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("📋 ❖ Goal:");
    expect(lines[0]).toContain("Goal");
    expect(lines[0]).not.toContain("A:");
    expect(lines[0]).not.toContain("R:");
    expect(lines[0]).not.toContain("%");
    expect(lines[0]).toContain("<error>");
    expect(lines[0]).toContain("█");
    expect(lines[0]).toContain("░");
  });

  test("uses warning and success colors at the 50 percent boundary", () => {
    const calls: any[] = [];
    const theme = { fg: (name: string, text: string) => `<${name}>${text}</${name}>` };
    const ctx = { hasUI: true, ui: { theme, setWidget: (...args: any[]) => calls.push(args) } } as any;

    updatePlanningStatus(ctx, { ...status, counts: { ...status.counts, complete: 2, total: 4 } });
    const warningWidget = (calls.pop() as any[])[1]({} as any, theme);
    expect(warningWidget.render(80)[0]).toContain("<warning>");

    updatePlanningStatus(ctx, { ...status, counts: { ...status.counts, complete: 3, total: 4 } });
    const successWidget = (calls.pop() as any[])[1]({} as any, theme);
    expect(successWidget.render(80)[0]).toContain("<success>");
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

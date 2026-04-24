import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { PlanDepth } from "./types.js";
import { unlink } from "node:fs/promises";
import { ensurePlanningFiles, getPlanningFilesState } from "./files.js";
import { buildCatchupReport, formatCatchupReport } from "./session-catchup.js";
import { checkComplete, formatStatusForDisplay, summarizeStatus } from "./status.js";
import type { ExtensionState } from "./types.js";
import { clearPlanningStatus, updatePlanningStatus } from "./ui.js";

/** Keywords that suggest a non-trivial planning depth. */
const DEEP_KEYWORDS = [
  "redesign", "refactor", "restructure", "migrate", "overhaul", "rewrite",
  "architecture", "integration", "cross-cutting", "multi-file", 
  "infrastructure", "platform", "framework", "end-to-end",
];

const STANDARD_KEYWORDS = [
  "implement", "build", "add", "create", "develop", "feature", "module",
  "component", "service", "endpoint", "api", "auth", "database", "deploy",
  "setup", "configure", "test", "pipeline",
];

/** Classify task depth from the /plan command args. */
export function classifyDepth(task: string): PlanDepth {
  const lower = task.toLowerCase();
  const wordCount = task.trim().split(/\s+/).length;

  // Explicit depth flags override everything
  if (/\b(lightweight|simple|quick|trivial|minor|small)\b/i.test(task)) return "lightweight";
  if (/\b(deep|complex|major|strategic|comprehensive|thorough)\b/i.test(task)) return "deep";

  // Architecture / cross-cutting keywords → deep
  if (DEEP_KEYWORDS.some((kw) => lower.includes(kw))) return "deep";

  // Feature / implementation keywords → standard
  if (STANDARD_KEYWORDS.some((kw) => lower.includes(kw))) return "standard";

  // Very short tasks with no keywords → lightweight
  if (wordCount <= 5) return "lightweight";

  // Default to standard for anything ambiguous but longer
  return "standard";
}

/** Build the model kickoff message with depth-appropriate guidance. */
export function planningKickoffMessage(task: string, depth?: PlanDepth): string {
  const resolvedDepth = depth ?? classifyDepth(task);
  const lines: string[] = ["Use the planning-with-files workflow for this task:", "", task, ""];

  if (resolvedDepth === "lightweight") {
    lines.push("Depth: lightweight — address these before writing phases:");
    lines.push("  1. Problem: What is the specific issue?");
    lines.push("  2. Behavior: What should happen instead?");
    lines.push("  3. Scope: What files or areas are affected?");
    lines.push("  4. Success: How will you verify it's fixed?");
    lines.push("  5. Blockers: Any assumptions that could be wrong?");
  } else if (resolvedDepth === "deep") {
    lines.push("Depth: deep — produce a thorough plan:");
    lines.push("1. Problem Frame: What is the core problem, for whom, and why now?");
    lines.push("2. Success Criteria: Measurable outcomes that define done.");
    lines.push("3. Assumptions: Scan for Value, Usability, Viability, Feasibility assumptions. Identify which are high-impact and high-risk.");
    lines.push("4. Decomposition: Use Opportunity-Solution Tree — identify desired outcomes, then opportunities (customer needs), then solutions, then experiments. Each solution becomes a phase. Validation phases come before implementation phases.");
    lines.push("5. Risk Analysis: Classify risks as Tiger (real, must act), Paper Tiger (overblown), or Elephant (unspoken, investigate). Mark launch-blocking risks.");
  } else {
    lines.push("Depth: standard — frame before planning:");
    lines.push("1. Problem: What needs to change and why?");
    lines.push("2. Success: How will you verify it's done?");
    lines.push("3. Assumptions: What are you assuming that could be wrong?");
    lines.push("4. Decomposition: Break into phases that validate assumptions before committing to implementation.");
  }

  lines.push("", "Read task_plan.md, findings.md, and progress.md. If the plan is still generic, update it for this task. Then continue from the current phase.");
  return lines.join("\n");
}

export function registerPlanningCommands(pi: ExtensionAPI, getState: () => ExtensionState, setState: (state: ExtensionState) => void): void {
  const startPlan = async (args: string, ctx: any) => {
    const useAnalytics = /--analytics/.test(args);
    const task = args.replace(/--analytics/g, "").trim();
    const template = useAnalytics ? "analytics" : undefined;
    const result = await ensurePlanningFiles(ctx.cwd, { template });
    const status = await summarizeStatus(ctx.cwd);
    setState({ ...getState(), active: true, paused: false, projectDir: ctx.cwd });
    updatePlanningStatus(ctx, status);

    const summary = `Planning files ready. Created: ${result.created.join(", ") || "none"}. Existing: ${result.existing.join(", ") || "none"}.`;
    if (ctx.hasUI) ctx.ui.notify(summary, "info");

    if (task) {
      pi.sendUserMessage(planningKickoffMessage(task), ctx.isIdle?.() ? undefined : { deliverAs: "followUp" });
    } else if (ctx.hasUI) {
      ctx.ui.notify("Planning files are ready. Provide a task with /plan <task>, or ask Pi to continue from task_plan.md.", "info");
    }
  };

  pi.registerCommand("plan", {
    description: "Start or continue a planning-with-files workflow",
    handler: startPlan,
  });

  pi.registerCommand("pwf", {
    description: "Alias for /plan",
    handler: startPlan,
  });

  pi.registerCommand("plan-status", {
    description: "Show current planning-with-files status without invoking the model",
    handler: async (_args, ctx) => {
      const status = await summarizeStatus(ctx.cwd);
      updatePlanningStatus(ctx, status);
      if (ctx.hasUI) ctx.ui.notify(formatStatusForDisplay(status), "info");
    },
  });

  pi.registerCommand("plan-check", {
    description: "Check whether all task_plan.md phases are complete",
    handler: async (_args, ctx) => {
      const status = await summarizeStatus(ctx.cwd);
      const result = checkComplete(status);
      updatePlanningStatus(ctx, status);
      if (ctx.hasUI) ctx.ui.notify(result.message, result.complete ? "info" : "warning");
    },
  });

  pi.registerCommand("plan-off", {
    description: "Pause planning automation without deleting files",
    handler: async (_args, ctx) => {
      const s = getState();
      if (!s.active) {
        if (ctx.hasUI) ctx.ui.notify("No active plan to pause.", "info");
        return;
      }
      setState({ ...s, paused: true });
      clearPlanningStatus(ctx);
      if (ctx.hasUI) ctx.ui.notify("Planning automation paused. Use /plan-on to resume.", "info");
    },
  });

  pi.registerCommand("plan-on", {
    description: "Resume planning automation after /plan-off",
    handler: async (_args, ctx) => {
      const s = getState();
      if (!s.active) {
        if (ctx.hasUI) ctx.ui.notify("No active plan to resume.", "info");
        return;
      }
      setState({ ...s, paused: false });
      const status = await summarizeStatus(ctx.cwd);
      updatePlanningStatus(ctx, status);
      if (ctx.hasUI) ctx.ui.notify("Planning automation resumed.", "info");
    },
  });

  pi.registerCommand("plan-done", {
    description: "Mark plan complete, remove planning files, and clear status",
    handler: async (_args, ctx) => {
      const status = await summarizeStatus(ctx.cwd);
      if (!status.exists) {
        if (ctx.hasUI) ctx.ui.notify("No active plan to clear.", "info");
        return;
      }

      if (!status.complete && ctx.hasUI) {
        ctx.ui.notify(`Plan is not yet complete (${status.counts.complete}/${status.counts.total} phases done). Removing files anyway.`, "warning");
      }

      const state = await getPlanningFilesState(ctx.cwd);
      const removed: string[] = [];
      for (const path of [state.taskPlanPath, state.findingsPath, state.progressPath]) {
        try {
          await unlink(path);
          removed.push(path.split("/").pop()!);
        } catch {
          // file may already be gone
        }
      }

      setState({ ...getState(), active: false, paused: false, projectDir: null });
      clearPlanningStatus(ctx);
      if (ctx.hasUI) ctx.ui.notify(`Plan complete. Removed: ${removed.join(", ") || "none"}.`, "info");
    },
  });

  pi.registerCommand("plan-phases", {
    description: "Show a popup with the full phase checklist",
    handler: async (_args, ctx) => {
      const status = await summarizeStatus(ctx.cwd);
      if (!status.exists) {
        if (ctx.hasUI) ctx.ui.notify("No active plan.", "info");
        return;
      }

      const { DynamicBorder } = await import("@mariozechner/pi-coding-agent");
      const { Container, Text } = await import("@mariozechner/pi-tui");

      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
        container.addChild(new Text(theme.fg("accent", theme.bold("  Plan Phases")), 1, 0));
        container.addChild(new Text(theme.fg("dim", `  ${status.goal ?? "No goal"}`), 1, 0));
        container.addChild(new Text("", 0, 0));

        const icons: Record<string, string> = { complete: "✅", in_progress: "🔄", failed: "❌", blocked: "⛔", pending: "⏸️", unknown: "❓" };
        for (const phase of status.phases) {
          const icon = icons[phase.status] ?? "❓";
          const current = status.currentPhase && phase.title.includes(status.currentPhase) ? theme.fg("accent", " ←") : "";
          const label = phase.status === "complete" ? theme.fg("muted", phase.title) : phase.title;
          container.addChild(new Text(`  ${icon} ${label}${current}`, 1, 0));
        }

        container.addChild(new Text("", 0, 0));
        container.addChild(new Text(theme.fg("dim", `  ${status.counts.complete}/${status.counts.total} complete • esc to close`), 1, 0));
        container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

        return {
          render: (w: number) => container.render(w),
          invalidate: () => container.invalidate(),
          handleInput: (data: string) => {
            if (data === "\x1b" || data === "\r") done();
          },
        };
      });
    },
  });

  pi.registerCommand("plan-catchup", {
    description: "Show unsynced planning context from previous Pi sessions",
    handler: async (_args, ctx) => {
      const currentSessionFile = ctx.sessionManager?.getSessionFile?.();
      const currentBranchEntries = ctx.sessionManager?.getBranch?.();
      const report = await buildCatchupReport(ctx.cwd, { currentSessionFile, currentBranchEntries });
      const message = formatCatchupReport(report);
      if (ctx.hasUI) ctx.ui.notify(message, report.hasReport ? "warning" : "info");
    },
  });
}
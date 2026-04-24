import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { unlink } from "node:fs/promises";
import { ensurePlanningFiles, getPlanningFilesState } from "./files.js";
import { buildCatchupReport, formatCatchupReport } from "./session-catchup.js";
import { checkComplete, formatStatusForDisplay, summarizeStatus } from "./status.js";
import type { ExtensionState } from "./types.js";
import { clearPlanningStatus, updatePlanningStatus } from "./ui.js";

export function planningKickoffMessage(task: string): string {
  return [
    "Use the planning-with-files workflow for this task:",
    "",
    task,
    "",
    "Read task_plan.md, findings.md, and progress.md. If the plan is still generic, update it for this task. Then continue from the current phase.",
  ].join("\n");
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

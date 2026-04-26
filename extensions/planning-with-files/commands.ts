import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { PlanDepth, ParsedTaskPlan } from "./types.js";
import { unlink } from "node:fs/promises";
import { ensurePlanningFiles, getPlanningFilesState } from "./files.js";
import { buildCatchupReport, formatCatchupReport } from "./session-catchup.js";
import { checkComplete, formatStatusForDisplay, parseTaskPlan, summarizeStatus } from "./status.js";
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
    lines.push("6. Durable artifacts: create or update discovery, spec, implementation plan, review, and learnings docs under docs/ as the work progresses.");
    lines.push("7. Research: If this plan depends on facts that change faster than training data (current APIs, library versions, pricing), search the web before finalizing the plan.");
  } else {
    lines.push("Depth: standard — frame before planning:");
    lines.push("1. Problem: What needs to change and why?");
    lines.push("2. Success: How will you verify it's done?");
    lines.push("3. Assumptions: What are you assuming that could be wrong?");
    lines.push("4. Decomposition: Break into phases that validate assumptions before committing to implementation.");
    lines.push("5. Durable artifacts: create or update a spec and implementation plan under docs/ before implementation.");
  }

  if (resolvedDepth !== "lightweight") {
    lines.push("", "Clarifying questions: If 1-3 quick questions would meaningfully improve this plan, ask them before writing phases. Otherwise proceed with reasonable assumptions.");
  }

  lines.push("", "Read task_plan.md, findings.md, and progress.md. If the plan is still generic, update it for this task. Then continue from the current phase.");
  return lines.join("\n");
}

/** Run a confidence check on a parsed plan and return a human-readable report. */
export function confidenceCheck(plan: ParsedTaskPlan): string {
  const sections: Array<{ name: string; score: "strong" | "weak" | "missing"; detail: string }> = [];

  // Goal
  const goal = plan.goal?.trim();
  if (!goal || goal === "[One sentence describing the end state]") {
    sections.push({ name: "Goal", score: "weak", detail: "Goal is missing or still a template placeholder." });
  } else if (goal.split(/\s+/).length < 5) {
    sections.push({ name: "Goal", score: "weak", detail: "Goal is very vague. Add specificity: what, for whom, why." });
  } else {
    sections.push({ name: "Goal", score: "strong", detail: "Goal is specific enough to guide decisions." });
  }

  // Depth
  if (plan.depth === "lightweight") {
    sections.push({ name: "Depth", score: "strong", detail: "Lightweight task — minimal planning is appropriate." });
  } else if (plan.depth === "deep") {
    sections.push({ name: "Depth", score: "strong", detail: "Deep task — full planning methodology expected." });
  } else {
    sections.push({ name: "Depth", score: "strong", detail: "Standard task — moderate planning expected." });
  }

  // Success criteria (check for a success/criteria/outcome section in raw plan)
  const planText = plan.phases.map((p) => p.raw).join("\n");
  const hasSuccessSection = /success\s*criteria|desired\s*outcome|definition\s*of\s*done/i.test(planText);
  if (hasSuccessSection) {
    sections.push({ name: "Success Criteria", score: "strong", detail: "Plan includes success criteria." });
  } else {
    sections.push({ name: "Success Criteria", score: "missing", detail: "No success criteria found. Add a measurable definition of done." });
  }

  // Assumptions
  if (plan.depth === "lightweight") {
    sections.push({ name: "Assumptions", score: "strong", detail: "Skipped for lightweight task (appropriate)." });
  } else if (plan.assumptions.length === 0) {
    sections.push({ name: "Assumptions", score: "missing", detail: "No assumptions listed. Surface value/feasibility assumptions before committing to implementation." });
  } else {
    const unresolved = plan.assumptions.filter((a) => !a.action || a.action === "" || /^\[.*\]$/.test(a.action));
    if (unresolved.length > 0) {
      sections.push({ name: "Assumptions", score: "weak", detail: `${unresolved.length} of ${plan.assumptions.length} assumptions have no validation action. High-risk assumptions need test phases.` });
    } else {
      sections.push({ name: "Assumptions", score: "strong", detail: `${plan.assumptions.length} assumptions with validation actions defined.` });
    }
  }

  // Phases
  if (plan.phases.length === 0) {
    sections.push({ name: "Phases", score: "missing", detail: "No phases defined. Break the task into 3-7 completable phases." });
  } else if (plan.phases.length < 3) {
    sections.push({ name: "Phases", score: "weak", detail: `Only ${plan.phases.length} phases — consider breaking into more granular steps with clear deliverables.` });
  } else {
    const pendingCount = plan.phases.filter((p) => p.status === "pending").length;
    sections.push({ name: "Phases", score: "strong", detail: `${plan.phases.length} phases with clear structure. ${pendingCount} still pending.` });
  }

  // Risks (only for standard/deep)
  if (plan.depth === "lightweight") {
    sections.push({ name: "Risks", score: "strong", detail: "Skipped for lightweight task (appropriate)." });
  } else if (plan.risks === undefined || plan.risks.length === 0) {
    sections.push({ name: "Risks", score: "missing", detail: "No risks identified. Run a pre-mortem: what could go wrong? Classify as Tiger, Paper Tiger, or Elephant." });
  } else {
    sections.push({ name: "Risks", score: "strong", detail: `${plan.risks.length} risks identified.` });
  }

  // Summary
  const strong = sections.filter((s) => s.score === "strong").length;
  const weak = sections.filter((s) => s.score === "weak").length;
  const missing = sections.filter((s) => s.score === "missing").length;

  const lines: string[] = [
    "📋 Confidence Check",
    "",
    `✅ Strong: ${strong}  ⚠️ Weak: ${weak}  ❌ Missing: ${missing}`,
    "",
  ];

  for (const section of sections) {
    const icon = section.score === "strong" ? "✅" : section.score === "weak" ? "⚠️" : "❌";
    lines.push(`${icon} ${section.name}: ${section.detail}`);
  }

  if (missing > 0 || weak > 0) {
    lines.push("", "💡 Strengthen weak sections by:");
    for (const section of sections.filter((s) => s.score !== "strong")) {
      lines.push(`  - ${section.name}: ${section.detail}`);
    }
  } else {
    lines.push("", "✨ Plan looks solid. Proceed with confidence.");
  }

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

  pi.registerCommand("plan-deepen", {
    description: "Run a confidence check on the current plan and report weak sections",
    handler: async (_args, ctx) => {
      const state = await getPlanningFilesState(ctx.cwd);
      if (!state.exists.taskPlan) {
        if (ctx.hasUI) ctx.ui.notify("No active plan. Use /plan <task> to start one.", "info");
        return;
      }

      const { readFile } = await import("node:fs/promises");
      const taskPlan = await readFile(state.taskPlanPath, "utf8");
      const parsed = parseTaskPlan(taskPlan);
      const report = confidenceCheck(parsed);

      if (ctx.hasUI) ctx.ui.notify(report, "info");
    },
  });
}
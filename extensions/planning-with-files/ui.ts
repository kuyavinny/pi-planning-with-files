import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { PlanStatus } from "./types.js";
import { formatStatusForDisplay } from "./status.js";

function truncate(text: string, max: number): string {
  if (max <= 0 || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function rightAlign(text: string, width: number): string {
  return width > text.length ? text.padStart(width) : text;
}

function progressBar(complete: number, total: number, segments = 10): string {
  const safeTotal = Math.max(1, total);
  const filled = Math.max(0, Math.min(segments, Math.round((complete / safeTotal) * segments)));
  return `${"█".repeat(filled)}${"░".repeat(segments - filled)}`;
}

function widgetLines(status: PlanStatus, width: number): string[] {
  const phaseName = status.complete ? "✓" : (status.currentPhase || "unknown");
  const safeTotal = Math.max(1, status.counts.total);
  const percent = Math.round((status.counts.complete / safeTotal) * 100);
  const goal = truncate(status.goal ?? "Unknown", Math.max(0, width - 24));
  const barWidth = Math.max(4, Math.min(18, Math.max(4, width - 10)));
  const bar = progressBar(status.counts.complete, safeTotal, barWidth);

  return [
    rightAlign(`📋 PwF • ${phaseName}`, width),
    rightAlign(bar, width),
    rightAlign(`Goal: ${goal} • ${percent}% • A:${status.unresolvedAssumptionCount} • R:${status.launchBlockingRiskCount}`, width),
  ];
}

export function updatePlanningStatus(ctx: ExtensionContext, status: PlanStatus | null): void {
  if (!ctx.hasUI) return;
  if (!status?.exists) {
    clearPlanningStatus(ctx);
    return;
  }

  ctx.ui.setWidget("PwF", (_tui, theme) => ({
    render: (width: number): string[] => widgetLines(status, width).map((line, index) => {
      if (index === 0) return theme.fg("accent", line);
      if (index === 1) return theme.fg("success", line);
      return theme.fg("dim", line);
    }),
    invalidate: () => {},
  }));
}

export function clearPlanningStatus(ctx: ExtensionContext): void {
  if (!ctx.hasUI) return;
  ctx.ui.setWidget("PwF", undefined);
}

export function showStatusMessage(ctx: ExtensionContext, status: PlanStatus): void {
  const message = formatStatusForDisplay(status);
  if (ctx.hasUI) ctx.ui.notify(message, "info");
}

export function showPlainMessage(ctx: ExtensionContext, message: string, level: "info" | "warning" | "error" = "info"): void {
  if (ctx.hasUI) ctx.ui.notify(message, level);
}

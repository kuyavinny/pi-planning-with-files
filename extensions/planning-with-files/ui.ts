import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { PlanStatus } from "./types.js";
import { formatStatusForDisplay } from "./status.js";

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function truncate(text: string, max: number): string {
  if (max <= 0 || text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function barStyle(complete: number, total: number): "error" | "warning" | "success" {
  if (total > 0 && complete >= total) return "success";
  const ratio = complete / Math.max(1, total);
  return ratio < 0.5 ? "error" : ratio === 0.5 ? "warning" : "success";
}

function progressBar(complete: number, total: number, segments: number, theme: { fg(name: string, text: string): string }): string {
  const safeTotal = Math.max(1, total);
  const ratio = complete / safeTotal;
  const filled = Math.max(0, Math.min(segments, Math.round(ratio * segments)));
  const empty = segments - filled;
  const color = barStyle(complete, total);
  const filledText = theme.fg(color, "█".repeat(filled));
  const emptyText = empty > 0 ? `\x1b[2m${theme.fg(color, "░".repeat(empty))}\x1b[22m` : "";
  return `${filledText}${emptyText}`;
}

function widgetLine(status: PlanStatus, width: number, theme: { fg(name: string, text: string): string }): string {
  const goal = truncateWords(status.goal ?? "Unknown", 5);
  const prefix = "📋 ❖ Goal: ";
  const infix = " ➤ ";
  const minimumBar = 4;
  const available = Math.max(0, width - prefix.length - infix.length);
  const barWidth = Math.max(minimumBar, Math.min(18, available - 1));
  const goalWidth = Math.max(0, available - barWidth);
  const finalGoal = truncate(goal, goalWidth);
  const visible = `${prefix}${finalGoal}${infix}${"█".repeat(barWidth)}`;
  const pad = Math.max(0, width - visible.length);
  return `${" ".repeat(pad)}${theme.fg("accent", `${prefix}${finalGoal}${infix}`)}${progressBar(status.counts.complete, status.counts.total, barWidth, theme)}`;
}

export function updatePlanningStatus(ctx: ExtensionContext, status: PlanStatus | null): void {
  if (!ctx.hasUI) return;
  if (!status?.exists) {
    clearPlanningStatus(ctx);
    return;
  }

  ctx.ui.setWidget("PwF", (_tui, theme) => ({
    render: (width: number): string[] => [widgetLine(status, width, theme)],
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

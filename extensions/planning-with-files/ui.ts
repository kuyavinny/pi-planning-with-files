import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { PlanStatus } from "./types.js";
import { formatStatusForDisplay } from "./status.js";

export function updatePlanningStatus(ctx: ExtensionContext, status: PlanStatus | null): void {
  if (!ctx.hasUI) return;
  if (!status?.exists) {
    ctx.ui.setStatus("PwF", undefined);
    return;
  }
  const phaseName = status.complete ? "✓" : (status.currentPhase || "unknown");
  const count = status.counts.total > 0 ? `${status.counts.complete}/${status.counts.total}` : "active";
  const text = `📋 ❖ ${phaseName} ➤ ${count}`;
  ctx.ui.setStatus("PwF", ctx.ui.theme?.fg ? ctx.ui.theme.fg("accent", text) : text);
}

export function clearPlanningStatus(ctx: ExtensionContext): void {
  if (!ctx.hasUI) return;
  ctx.ui.setStatus("PwF", undefined);
}

export function showStatusMessage(ctx: ExtensionContext, status: PlanStatus): void {
  const message = formatStatusForDisplay(status);
  if (ctx.hasUI) ctx.ui.notify(message, "info");
}

export function showPlainMessage(ctx: ExtensionContext, message: string, level: "info" | "warning" | "error" = "info"): void {
  if (ctx.hasUI) ctx.ui.notify(message, level);
}

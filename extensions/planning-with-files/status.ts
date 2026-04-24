import { readFile } from "node:fs/promises";
import type { AssumptionRow, CompletionCheck, ParsedTaskPlan, PhaseInfo, PhaseStatus, PlanDepth, PlanStatus, RiskRow } from "./types.js";
import { getPlanningFilesState } from "./files.js";
import { truncateForContext } from "./security.js";

const STATUS_VALUES: PhaseStatus[] = ["pending", "in_progress", "complete", "failed", "blocked", "unknown"];

function stripHtmlComments(markdown: string): string {
  return markdown.replace(/<!--[^]*?-->/g, "");
}

function normalizeStatus(value: string): PhaseStatus {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "inprogress") return "in_progress";
  if ((STATUS_VALUES as string[]).includes(normalized)) return normalized as PhaseStatus;
  if (normalized.includes("complete")) return "complete";
  if (normalized.includes("progress")) return "in_progress";
  if (normalized.includes("pending")) return "pending";
  if (normalized.includes("failed")) return "failed";
  if (normalized.includes("blocked")) return "blocked";
  return "unknown";
}

function sectionBody(markdown: string, heading: string): string | null {
  const lines = stripHtmlComments(markdown).split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return null;
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line.trim())) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

export function extractDepth(markdown: string): PlanDepth {
  const body = sectionBody(markdown, "Depth");
  if (!body) return "standard";
  const line = body.split(/\r?\n/).map((item) => item.trim()).find(Boolean) ?? "";
  const normalized = line.toLowerCase();
  if (normalized.includes("lightweight")) return "lightweight";
  if (normalized.includes("deep")) return "deep";
  return "standard";
}

export function extractGoal(markdown: string): string | null {
  const body = sectionBody(markdown, "Goal");
  if (!body) return null;
  const line = body.split(/\r?\n/).map((item) => item.trim()).find(Boolean);
  return line ?? null;
}

function extractCurrentPhaseSection(markdown: string): string | null {
  const body = sectionBody(markdown, "Current Phase");
  if (!body) return null;
  const line = body.split(/\r?\n/).map((item) => item.trim()).find(Boolean);
  return line ?? null;
}

function phaseStatusFromBlock(block: string, fallbackTitle: string): PhaseStatus {
  const inline = fallbackTitle.match(/\[(pending|in_progress|complete|failed|blocked|unknown)\]/i);
  if (inline) return normalizeStatus(inline[1] ?? "unknown");

  const statusLine = block.split(/\r?\n/).find((line) => /\*\*Status:\*\*/i.test(line) || /\bStatus:\b/i.test(line));
  if (!statusLine) return "unknown";
  const value = statusLine.split(/Status:\*\*|Status:/i).pop() ?? "";
  return normalizeStatus(value.replace(/[*`|]/g, ""));
}

function parseHeadingPhases(markdown: string): PhaseInfo[] {
  const lines = markdown.split(/\r?\n/);
  const starts: Array<{ index: number; line: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]?.trim() ?? "";
    // Match both "### Phase N: Title" and "### UN: Title" (U-ID format)
    if (/^###\s+(Phase\s+\d+:|U\d+:)/i.test(trimmed)) {
      starts.push({ index: i, line: trimmed });
    }
  }

  return starts.map((start, idx) => {
    const end = starts[idx + 1]?.index ?? lines.length;
    const raw = lines.slice(start.index, end).join("\n").trim();
    const title = start.line.replace(/^###\s+/, "").replace(/\s+\[(pending|in_progress|complete|failed|blocked|unknown)\]\s*$/i, "").trim();
    // Extract U-ID index from title like "U1: Phase Name"
    const uidMatch = title.match(/^U(\d+):/i);
    const phaseIndex = uidMatch ? parseInt(uidMatch[1]!, 10) : idx + 1;
    return { index: phaseIndex, title, status: phaseStatusFromBlock(raw, start.line), raw };
  });
}

function parseTablePhases(markdown: string): PhaseInfo[] {
  const phases: PhaseInfo[] = [];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const [phase, status] = cells;
    if (!phase || !status) continue;
    if (/^phase$/i.test(phase) || /^-+$/.test(phase) || /^-+$/.test(status)) continue;
    const normalized = normalizeStatus(status);
    if (normalized === "unknown") continue;
    phases.push({ index: phases.length + 1, title: phase, status: normalized, raw: line });
  }
  return phases;
}

export function parsePhases(markdown: string): PhaseInfo[] {
  const headingPhases = parseHeadingPhases(markdown);
  if (headingPhases.length > 0) return headingPhases;
  return parseTablePhases(markdown);
}

export function countErrorRows(markdown: string): number {
  const lines = stripHtmlComments(markdown).split(/\r?\n/);
  let inErrors = false;
  let rows = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Errors Encountered/i.test(trimmed)) {
      inErrors = true;
      continue;
    }
    if (inErrors && /^##\s+/.test(trimmed)) break;
    if (!inErrors || !trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim().toLowerCase());
    if (cells.length === 0 || cells[0] === "error" || cells.every((cell) => /^-+$/.test(cell))) continue;
    if (cells[0]) rows++;
  }
  return rows;
}

export function extractCurrentPhase(markdown: string, phases: PhaseInfo[]): string | null {
  // Prefer the title of the first in-progress phase from parsed headings
  const inProgress = phases.find((phase) => phase.status === "in_progress");
  if (inProgress) return inProgress.title;
  // If all phases are complete, use the last one
  const allComplete = phases.length > 0 && phases.every((phase) => phase.status === "complete");
  if (allComplete) return phases.at(-1)!.title;
  // Fall back to last complete + next
  const lastComplete = [...phases].reverse().find((phase) => phase.status === "complete");
  if (lastComplete) {
    const next = phases.find((phase) => phase.index === lastComplete.index + 1);
    if (next) return next.title;
  }
  // Fall back to the explicit Current Phase section
  const explicit = extractCurrentPhaseSection(markdown);
  if (explicit) return explicit;
  return phases[0]?.title ?? null;
}

export function parseAssumptions(markdown: string): AssumptionRow[] {
  const body = sectionBody(stripHtmlComments(markdown), "Assumptions");
  if (!body) return [];
  const rows: AssumptionRow[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
    if (cells.length < 5) continue;
    const [assumption, category, impact, risk, action] = cells;
    // Skip header and separator rows
    if (!assumption || /^-+$/.test(assumption) || assumption.toLowerCase() === "assumption") continue;
    rows.push({ assumption, category, impact, risk, action });
  }
  return rows;
}

export function countUnresolvedAssumptions(assumptions: AssumptionRow[]): number {
  // An assumption is "unresolved" if its action is empty or still a placeholder
  return assumptions.filter((a) => !a.action || a.action === "" || /^\[.*\]$/.test(a.action)).length;
}

export function parseRisks(markdown: string): RiskRow[] {
  const body = sectionBody(stripHtmlComments(markdown), "Risks");
  if (!body) return [];
  const rows: RiskRow[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
    if (cells.length < 4) continue;
    const [risk, type, urgency, mitigation] = cells;
    // Skip header and separator rows
    if (!risk || /^-+$/.test(risk) || risk.toLowerCase() === "risk") continue;
    rows.push({ risk, type, urgency, mitigation });
  }
  return rows;
}

export function countLaunchBlockingRisks(risks: RiskRow[]): number {
  return risks.filter((r) => /launch-block/i.test(r.urgency) || /block/i.test(r.urgency)).length;
}

export function parseTaskPlan(markdown: string): ParsedTaskPlan {
  const phases = parsePhases(markdown);
  const warnings: string[] = [];
  if (phases.length === 0) warnings.push("No phases found in task_plan.md");
  return {
    goal: extractGoal(markdown),
    currentPhase: extractCurrentPhase(markdown, phases),
    depth: extractDepth(markdown),
    assumptions: parseAssumptions(markdown),
    risks: parseRisks(markdown),
    phases,
    errorsLogged: countErrorRows(markdown),
    warnings,
  };
}

function countsFor(phases: PhaseInfo[]): PlanStatus["counts"] {
  const counts = { total: phases.length, complete: 0, inProgress: 0, pending: 0, failed: 0, blocked: 0, unknown: 0 };
  for (const phase of phases) {
    if (phase.status === "complete") counts.complete++;
    else if (phase.status === "in_progress") counts.inProgress++;
    else counts[phase.status]++;
  }
  return counts;
}

async function readIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

export async function summarizeStatus(projectDir: string): Promise<PlanStatus> {
  const state = await getPlanningFilesState(projectDir);
  const taskPlan = await readIfExists(state.taskPlanPath);
  const progress = await readIfExists(state.progressPath);
  const parsed = taskPlan ? parseTaskPlan(taskPlan) : { goal: null, currentPhase: null, depth: "standard" as PlanDepth, assumptions: [] as AssumptionRow[], risks: [] as RiskRow[], phases: [], errorsLogged: 0, warnings: [] };
  const counts = countsFor(parsed.phases);
  const complete = counts.total > 0 && counts.complete === counts.total;
  const unresolvedAssumptionCount = countUnresolvedAssumptions(parsed.assumptions);
  const launchBlockingRiskCount = countLaunchBlockingRisks(parsed.risks);

  const cleanProgress = stripHtmlComments(progress);

  return {
    exists: state.exists.taskPlan,
    projectDir: state.projectDir,
    currentPhase: parsed.currentPhase,
    goal: parsed.goal,
    depth: parsed.depth,
    assumptions: parsed.assumptions,
    risks: parsed.risks,
    unresolvedAssumptionCount,
    launchBlockingRiskCount,
    phases: parsed.phases,
    counts,
    files: {
      taskPlan: state.exists.taskPlan,
      findings: state.exists.findings,
      progress: state.exists.progress,
    },
    errorsLogged: parsed.errorsLogged,
    recentProgress: truncateForContext(cleanProgress, { maxLines: 30, maxBytes: 4096 }).text,
    planPreview: truncateForContext(taskPlan, { maxLines: 80, maxBytes: 8192 }).text,
    complete,
    warnings: parsed.warnings,
  };
}

export function checkComplete(status: PlanStatus): CompletionCheck {
  const { counts } = status;
  const message = status.complete
    ? `[planning-with-files] ALL PHASES COMPLETE (${counts.complete}/${counts.total}). If the user has additional work, add new phases to task_plan.md before starting.`
    : `[planning-with-files] Task in progress (${counts.complete}/${counts.total} phases complete). Update progress.md before stopping.`;
  return {
    complete: status.complete,
    total: counts.total,
    completeCount: counts.complete,
    inProgress: counts.inProgress,
    pending: counts.pending,
    failed: counts.failed,
    blocked: counts.blocked,
    unknown: counts.unknown,
    message,
  };
}

function iconFor(status: PhaseStatus): string {
  if (status === "complete") return "✅";
  if (status === "in_progress") return "🔄";
  if (status === "failed" || status === "blocked") return "❌";
  return "⏸️";
}

export function formatStatusForDisplay(status: PlanStatus): string {
  if (!status.exists) return "📋 No planning files found\n\nRun /plan <task> to start a planning session.";
  const lines = [
    "📋 Planning Status",
    "",
    `Current: ${status.currentPhase ?? "Unknown"}`,
    `Progress: ${status.counts.complete}/${status.counts.total} complete`,
    "",
  ];
  for (const phase of status.phases) {
    const current = status.currentPhase && phase.title.includes(status.currentPhase) ? " ← current" : "";
    lines.push(`${iconFor(phase.status)} ${phase.title}${current}`);
  }
  lines.push("", `Files: task_plan.md ${status.files.taskPlan ? "✓" : "✗"} | findings.md ${status.files.findings ? "✓" : "✗"} | progress.md ${status.files.progress ? "✓" : "✗"}`);
  lines.push(`Errors logged: ${status.errorsLogged}`);
  return lines.join("\n");
}

export function formatStatusForModel(status: PlanStatus): string {
  if (!status.exists) return "[planning-with-files] No active task_plan.md found.";
  return [
    "[planning-with-files] ACTIVE PLAN",
    `Goal: ${status.goal ?? "Unknown"}`,
    `Depth: ${status.depth}`,
    `Current phase: ${status.currentPhase ?? "Unknown"}`,
    `Progress: ${status.counts.complete}/${status.counts.total} complete, ${status.counts.inProgress} in progress, ${status.counts.pending} pending.`,
    "",
    "Recent progress:",
    status.recentProgress || "(none)",
  ].join("\n");
}

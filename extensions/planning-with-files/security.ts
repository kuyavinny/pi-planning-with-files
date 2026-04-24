import { basename, normalize } from "node:path";
import type { Limits, PlanningFileName, TruncatedText } from "./types.js";
import { PLANNING_FILES } from "./types.js";

const READ_LIKE_TOOLS = new Set([
  "read",
  "grep",
  "find",
  "ls",
  "web_search",
  "fetch_content",
  "code_search",
]);

const MUTATION_TOOLS = new Set(["write", "edit"]);

const STOP_OVERRIDE_PATTERNS = [
  /\bstop anyway\b/i,
  /\bpause(?: here)?\b/i,
  /\bdone for now\b/i,
  /\bdo not continue\b/i,
  /\bdon't continue\b/i,
  /\bjust report status\b/i,
];

export function planningFileFromPath(path: string): PlanningFileName | null {
  const normalized = normalize(path.replace(/^@/, ""));
  const name = basename(normalized);
  return (PLANNING_FILES as readonly string[]).includes(name) ? (name as PlanningFileName) : null;
}

export function isPlanningFile(path: string): boolean {
  return planningFileFromPath(path) !== null;
}

export function isFindingsFile(path: string): boolean {
  return planningFileFromPath(path) === "findings.md";
}

export function isProgressFile(path: string): boolean {
  return planningFileFromPath(path) === "progress.md";
}

export function isTaskPlanFile(path: string): boolean {
  return planningFileFromPath(path) === "task_plan.md";
}

export function isReadLikeTool(toolName: string): boolean {
  return READ_LIKE_TOOLS.has(toolName);
}

export function isMutationTool(toolName: string): boolean {
  return MUTATION_TOOLS.has(toolName);
}

export function isUserStopOverride(text: string): boolean {
  return STOP_OVERRIDE_PATTERNS.some((pattern) => pattern.test(text));
}

export function truncateForContext(text: string, limits: Limits = {}): TruncatedText {
  const maxBytes = limits.maxBytes ?? Number.POSITIVE_INFINITY;
  const maxLines = limits.maxLines ?? Number.POSITIVE_INFINITY;
  const lines = text.split(/\r?\n/);
  const originalLines = lines.length;
  const originalBytes = Buffer.byteLength(text, "utf8");

  let selected = lines.slice(0, maxLines);
  let result = selected.join("\n");

  while (Buffer.byteLength(result, "utf8") > maxBytes && result.length > 0) {
    result = result.slice(0, Math.max(0, result.length - 256));
  }

  const truncated = selected.length < lines.length || Buffer.byteLength(result, "utf8") < originalBytes;
  if (!truncated) {
    return { text: result, truncated: false, originalBytes, originalLines };
  }

  const marker = `[truncated: original ${originalLines} lines, ${originalBytes} bytes]`;
  const withMarker = result.trimEnd() ? `${result.trimEnd()}\n${marker}` : marker;
  return { text: withMarker, truncated: true, originalBytes, originalLines };
}

export function summarizeToolInput(toolName: string, input: unknown): string {
  if (!input || typeof input !== "object") return `${toolName}: <no input>`;
  const data = input as Record<string, unknown>;

  if (typeof data.path === "string") return `${toolName}: ${data.path}`;
  if (typeof data.command === "string") return `${toolName}: ${data.command.slice(0, 160)}`;
  if (typeof data.query === "string") return `${toolName}: ${data.query.slice(0, 160)}`;
  if (typeof data.url === "string") return `${toolName}: ${data.url.slice(0, 160)}`;

  return `${toolName}: ${JSON.stringify(data).slice(0, 160)}`;
}

export function signatureForToolError(toolName: string, input: unknown, content: unknown): string {
  const summarizedInput = summarizeToolInput(toolName, input);
  const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
  const normalizedError = text.replace(/\s+/g, " ").slice(0, 240);
  return `${summarizedInput} :: ${normalizedError}`;
}

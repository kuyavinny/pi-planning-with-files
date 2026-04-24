import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ensurePlanningFiles } from "./files.js";
import { checkComplete, summarizeStatus } from "./status.js";
import type { PlanningTemplate } from "./types.js";

function normalizeTemplate(value: unknown): PlanningTemplate {
  return value === "analytics" ? "analytics" : "default";
}

const cwdTemplateParameters = {
  type: "object",
  properties: {
    cwd: { type: "string", description: "Project directory. Defaults to the current Pi cwd." },
    template: { type: "string", description: "Template to use: default or analytics." },
  },
  additionalProperties: false,
} as any;

const cwdParameters = {
  type: "object",
  properties: {
    cwd: { type: "string", description: "Project directory. Defaults to the current Pi cwd." },
  },
  additionalProperties: false,
} as any;

export function registerPlanningTools(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "planning_with_files_init",
    label: "Planning Init",
    description: "Create missing planning-with-files markdown files in the current project.",
    promptSnippet: "Initialize missing task_plan.md, findings.md, and progress.md files for complex tasks",
    promptGuidelines: [
      "Use planning_with_files_init to initialize missing planning files before complex multi-step work.",
    ],
    parameters: cwdTemplateParameters,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = await ensurePlanningFiles(params.cwd ?? ctx.cwd, { template: normalizeTemplate(params.template) });
      return {
        content: [{ type: "text", text: `Planning files ready in ${result.projectDir}. Created: ${result.created.join(", ") || "none"}. Existing: ${result.existing.join(", ") || "none"}.` }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "planning_with_files_status",
    label: "Planning Status",
    description: "Parse and return the current planning-with-files status.",
    promptSnippet: "Inspect task_plan.md phase status without guessing from memory",
    promptGuidelines: [
      "Use planning_with_files_status to inspect current planning status instead of guessing from memory.",
    ],
    parameters: cwdParameters,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const status = await summarizeStatus(params.cwd ?? ctx.cwd);
      return {
        content: [{ type: "text", text: status.exists ? `Planning status: ${status.counts.complete}/${status.counts.total} phases complete. Current: ${status.currentPhase ?? "unknown"}.` : "No active task_plan.md found." }],
        details: status,
      };
    },
  });

  pi.registerTool({
    name: "planning_with_files_check_complete",
    label: "Planning Complete?",
    description: "Check whether all phases in task_plan.md are complete.",
    promptSnippet: "Check whether all phases in task_plan.md are complete",
    promptGuidelines: [
      "Use planning_with_files_check_complete before declaring a planned task finished.",
    ],
    parameters: cwdParameters,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const status = await summarizeStatus(params.cwd ?? ctx.cwd);
      const result = checkComplete(status);
      return {
        content: [{ type: "text", text: result.message }],
        details: result,
      };
    },
  });
}

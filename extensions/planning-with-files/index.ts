import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { buildActivePlanContext } from "./context.js";
import { registerPlanningCommands } from "./commands.js";
import { summarizeStatus } from "./status.js";
import { isFindingsFile, isMutationTool, isPlanningFile, isProgressFile, isReadLikeTool, isUserStopOverride, signatureForToolError } from "./security.js";
import {
  clearErrorReminder,
  clearFindingsReminder,
  clearProgressReminder,
  defaultExtensionState,
  hasStateChanged,
  incrementCompletionReminder,
  incrementReadLikeCount,
  markProgressReminder,
  markToolError,
  restoreStateFromEntries,
  STATE_CUSTOM_TYPE,
} from "./state.js";
import type { ExtensionState } from "./types.js";
import { registerPlanningTools } from "./tools.js";
import { updatePlanningStatus } from "./ui.js";

function pathFromInput(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const data = input as { path?: unknown };
  return typeof data.path === "string" ? data.path : null;
}

export default function planningWithFilesExtension(pi: ExtensionAPI): void {
  let state: ExtensionState = defaultExtensionState();
  let lastPersistedState: ExtensionState = state;

  const getState = () => state;
  const setState = (next: ExtensionState) => {
    state = next;
  };

  registerPlanningTools(pi);
  registerPlanningCommands(pi, getState, setState);

  pi.on("session_start", async (_event, ctx) => {
    state = restoreStateFromEntries(ctx.sessionManager.getBranch());
    lastPersistedState = state;
    const status = await summarizeStatus(ctx.cwd);
    if (status.exists) {
      state = { ...state, active: true, projectDir: ctx.cwd };
      updatePlanningStatus(ctx, status);
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    state = { ...state, lastUserIntent: isUserStopOverride(event.prompt) ? "pause" : "continue", reminders: { ...state.reminders, completionReminderCount: 0 } };
    const status = await summarizeStatus(ctx.cwd);
    if (!status.exists || state.paused) return;
    state = { ...state, active: true, projectDir: ctx.cwd };
    updatePlanningStatus(ctx, status);
    return {
      message: {
        customType: "planning-with-files-context",
        content: buildActivePlanContext(status, state.reminders),
        display: false,
      },
    };
  });

  pi.on("context", async (event, ctx) => {
    const hasPlanningContext = event.messages.some((message: any) => message.customType === "planning-with-files-context");
    if (hasPlanningContext || state.paused) return;

    const status = await summarizeStatus(ctx.cwd);
    if (!status.exists) return;
    const content = buildActivePlanContext(status, state.reminders, { planMaxLines: 25, progressMaxLines: 12 });
    return {
      messages: [
        ...event.messages,
        {
          role: "custom",
          customType: "planning-with-files-context",
          content,
          display: false,
          timestamp: Date.now(),
        } as any,
      ],
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    const status = await summarizeStatus(ctx.cwd);
    if (!status.exists || state.paused || !isReadLikeTool(event.toolName)) return;
    state = incrementReadLikeCount(state);
  });

  pi.on("tool_result", async (event, ctx) => {
    const status = await summarizeStatus(ctx.cwd);
    if (!status.exists || state.paused) return;

    const path = pathFromInput(event.input);
    if (isMutationTool(event.toolName) && path) {
      if (isProgressFile(path)) state = clearProgressReminder(state);
      else if (isFindingsFile(path)) state = clearFindingsReminder(state);
      else if (isPlanningFile(path)) state = clearErrorReminder(state);
      else state = markProgressReminder(state);
      // Update footer whenever planning files change so phase progress stays current
      updatePlanningStatus(ctx, status);
    }

    if (event.isError) {
      state = markToolError(state, signatureForToolError(event.toolName, event.input, event.content));
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    const status = await summarizeStatus(ctx.cwd);
    updatePlanningStatus(ctx, status);
    if (!status.exists || status.complete || state.paused || state.lastUserIntent === "pause" || state.lastUserIntent === "stop") return;
    if (state.reminders.completionReminderCount > 0) return;
    state = incrementCompletionReminder(state);
    pi.sendMessage(
      {
        customType: "planning-with-files-completion-check",
        content: `[planning-with-files] Task incomplete (${status.counts.complete}/${status.counts.total} phases complete). Update progress.md, read task_plan.md, and continue remaining phases when ready.`,
        display: true,
      },
      { triggerTurn: false },
    );
  });

  pi.on("session_shutdown", async () => {
    if (hasStateChanged(state, lastPersistedState)) {
      pi.appendEntry(STATE_CUSTOM_TYPE, state);
      lastPersistedState = state;
    }
  });
}

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { watch } from "node:fs";
import { buildActivePlanContext } from "./context.js";
import { registerPlanningCommands } from "./commands.js";
import { summarizeStatus } from "./status.js";
import { isFindingsFile, isMutationTool, isPlanningFile, isProgressFile, isReadLikeTool, isUserStopOverride, signatureForToolError } from "./security.js";
import { getPlanningPaths } from "./files.js";
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
  let currentCtx: any = null;
  let fileWatcher: ReturnType<typeof watch> | null = null;
  let watcherDebounce: ReturnType<typeof setTimeout> | null = null;

  const getState = () => state;
  const setState = (next: ExtensionState) => {
    state = next;
  };

  /** Start watching task_plan.md for changes. Debounces rapid events (e.g. save). */
  function startFileWatcher(ctx: any, projectDir: string): void {
    stopFileWatcher();
    currentCtx = ctx;
    const paths = getPlanningPaths(projectDir);

    try {
      fileWatcher = watch(paths.taskPlanPath, (eventType) => {
        if (eventType !== "change") return;
        // Debounce: fs.watch fires multiple events per save on some platforms
        if (watcherDebounce) clearTimeout(watcherDebounce);
        watcherDebounce = setTimeout(async () => {
          watcherDebounce = null;
          if (!currentCtx) return;
          const status = await summarizeStatus(projectDir);
          updatePlanningStatus(currentCtx, status);
        }, 200);
      });
    } catch {
      // File may not exist yet; watcher will start on next session_start or plan init
    }
  }

  function stopFileWatcher(): void {
    if (watcherDebounce) {
      clearTimeout(watcherDebounce);
      watcherDebounce = null;
    }
    if (fileWatcher) {
      fileWatcher.close();
      fileWatcher = null;
    }
  }

  registerPlanningTools(pi);
  registerPlanningCommands(pi, getState, setState);

  pi.on("session_start", async (_event, ctx) => {
    state = restoreStateFromEntries(ctx.sessionManager.getBranch());
    lastPersistedState = state;
    const status = await summarizeStatus(ctx.cwd);
    if (status.exists) {
      state = { ...state, active: true, projectDir: ctx.cwd };
      updatePlanningStatus(ctx, status);
      startFileWatcher(ctx, ctx.cwd);
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    state = { ...state, lastUserIntent: isUserStopOverride(event.prompt) ? "pause" : "continue", reminders: { ...state.reminders, completionReminderCount: 0 } };
    const status = await summarizeStatus(ctx.cwd);
    if (!status.exists || state.paused) return;
    state = { ...state, active: true, projectDir: ctx.cwd };
    updatePlanningStatus(ctx, status);
    // Ensure watcher is running (file may have been created since session_start)
    if (!fileWatcher && status.exists) {
      startFileWatcher(ctx, ctx.cwd);
    }
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
      // Restart watcher if task_plan.md was just created
      if (isPlanningFile(path) && !fileWatcher) {
        startFileWatcher(ctx, ctx.cwd);
      }
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
    stopFileWatcher();
    if (hasStateChanged(state, lastPersistedState)) {
      pi.appendEntry(STATE_CUSTOM_TYPE, state);
      lastPersistedState = state;
    }
  });
}
import type { ExtensionState, PlanDepth, ReminderState } from "./types.js";

export const STATE_CUSTOM_TYPE = "planning-with-files";

export function defaultReminderState(): ReminderState {
  return {
    progressReminderPending: false,
    findingsReminderPending: false,
    errorReminderPending: false,
    completionReminderCount: 0,
    readLikeToolCount: 0,
    repeatedErrorCount: 0,
    errorPatterns: {},
  };
}

export function defaultExtensionState(): ExtensionState {
  return {
    active: false,
    paused: false,
    projectDir: null,
    reminders: defaultReminderState(),
    lastUserIntent: "unknown",
    planDepth: "standard",
  };
}

function normalizeReminderState(value: unknown): ReminderState {
  const input = (value && typeof value === "object" ? value : {}) as Partial<ReminderState>;
  return {
    ...defaultReminderState(),
    ...input,
    progressReminderPending: Boolean(input.progressReminderPending),
    findingsReminderPending: Boolean(input.findingsReminderPending),
    errorReminderPending: Boolean(input.errorReminderPending),
    completionReminderCount: Number.isFinite(input.completionReminderCount) ? Number(input.completionReminderCount) : 0,
    readLikeToolCount: Number.isFinite(input.readLikeToolCount) ? Number(input.readLikeToolCount) : 0,
    repeatedErrorCount: Number.isFinite(input.repeatedErrorCount) ? Number(input.repeatedErrorCount) : 0,
    errorPatterns: (input.errorPatterns && typeof input.errorPatterns === "object" && !Array.isArray(input.errorPatterns)) ? Object.fromEntries(
      Object.entries(input.errorPatterns as Record<string, unknown>).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as string[]).filter((s) => typeof s === "string")])
    ) : {},
  };
}

export function normalizeExtensionState(value: unknown): ExtensionState {
  const input = (value && typeof value === "object" ? value : {}) as Partial<ExtensionState>;
  const lastUserIntent = input.lastUserIntent === "continue" || input.lastUserIntent === "pause" || input.lastUserIntent === "stop"
    ? input.lastUserIntent
    : "unknown";

  const validDepths: PlanDepth[] = ["lightweight", "standard", "deep"];
  const planDepth = validDepths.includes(input.planDepth as PlanDepth) ? input.planDepth as PlanDepth : "standard";

  return {
    active: Boolean(input.active),
    paused: Boolean(input.paused),
    projectDir: typeof input.projectDir === "string" ? input.projectDir : null,
    reminders: normalizeReminderState(input.reminders),
    lastUserIntent,
    planDepth,
  };
}

export function restoreStateFromEntries(entries: unknown[]): ExtensionState {
  const customEntries = entries.filter((entry) => {
    const item = entry as { type?: string; customType?: string };
    return item.type === "custom" && item.customType === STATE_CUSTOM_TYPE;
  });
  const latest = customEntries.at(-1) as { data?: unknown } | undefined;
  return latest ? normalizeExtensionState(latest.data) : defaultExtensionState();
}

export function hasStateChanged(a: ExtensionState, b: ExtensionState): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function markProgressReminder(state: ExtensionState): ExtensionState {
  return { ...state, reminders: { ...state.reminders, progressReminderPending: true } };
}

export function clearProgressReminder(state: ExtensionState): ExtensionState {
  return { ...state, reminders: { ...state.reminders, progressReminderPending: false } };
}

export function markFindingsReminder(state: ExtensionState): ExtensionState {
  return { ...state, reminders: { ...state.reminders, findingsReminderPending: true } };
}

export function clearFindingsReminder(state: ExtensionState): ExtensionState {
  return { ...state, reminders: { ...state.reminders, findingsReminderPending: false, readLikeToolCount: 0 } };
}

export function incrementReadLikeCount(state: ExtensionState): ExtensionState {
  const count = state.reminders.readLikeToolCount + 1;
  return {
    ...state,
    reminders: {
      ...state.reminders,
      readLikeToolCount: count,
      findingsReminderPending: state.reminders.findingsReminderPending || count >= 2,
    },
  };
}

export function markToolError(state: ExtensionState, signature: string): ExtensionState {
  const repeated = state.reminders.lastToolErrorSignature === signature ? state.reminders.repeatedErrorCount + 1 : 1;
  // Track error pattern by tool name
  const toolName = signature.split(":")[0] ?? "unknown";
  const patterns = { ...state.reminders.errorPatterns };
  patterns[toolName] = [...(patterns[toolName] ?? []), signature];
  return {
    ...state,
    reminders: {
      ...state.reminders,
      errorReminderPending: true,
      lastToolErrorSignature: signature,
      repeatedErrorCount: repeated,
      errorPatterns: patterns,
    },
  };
}

export function clearErrorReminder(state: ExtensionState): ExtensionState {
  return { ...state, reminders: { ...state.reminders, errorReminderPending: false, errorPatterns: {} } };
}

export function resetCompletionReminder(state: ExtensionState): ExtensionState {
  return { ...state, reminders: { ...state.reminders, completionReminderCount: 0 } };
}

export function incrementCompletionReminder(state: ExtensionState): ExtensionState {
  return {
    ...state,
    reminders: {
      ...state.reminders,
      completionReminderCount: state.reminders.completionReminderCount + 1,
    },
  };
}

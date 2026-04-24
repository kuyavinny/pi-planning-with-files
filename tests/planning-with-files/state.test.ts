import { describe, expect, test } from "bun:test";
import {
  clearFindingsReminder,
  clearProgressReminder,
  defaultExtensionState,
  incrementCompletionReminder,
  incrementReadLikeCount,
  markFindingsReminder,
  markProgressReminder,
  markToolError,
  restoreStateFromEntries,
  STATE_CUSTOM_TYPE,
} from "../../extensions/planning-with-files/state.js";

describe("extension state", () => {
  test("default state is inactive with clear reminders", () => {
    const state = defaultExtensionState();
    expect(state.active).toBe(false);
    expect(state.reminders.progressReminderPending).toBe(false);
    expect(state.reminders.readLikeToolCount).toBe(0);
  });

  test("restores latest custom state entry", () => {
    const restored = restoreStateFromEntries([
      { type: "custom", customType: "other", data: { active: true } },
      { type: "custom", customType: STATE_CUSTOM_TYPE, data: { active: true, projectDir: "repo", reminders: { progressReminderPending: true } } },
    ]);
    expect(restored.active).toBe(true);
    expect(restored.projectDir).toBe("repo");
    expect(restored.reminders.progressReminderPending).toBe(true);
  });

  test("progress reminder can be set and cleared", () => {
    const marked = markProgressReminder(defaultExtensionState());
    expect(marked.reminders.progressReminderPending).toBe(true);
    expect(clearProgressReminder(marked).reminders.progressReminderPending).toBe(false);
  });

  test("findings reminder clears read-like count", () => {
    const counted = incrementReadLikeCount(incrementReadLikeCount(defaultExtensionState()));
    expect(counted.reminders.findingsReminderPending).toBe(true);
    expect(counted.reminders.readLikeToolCount).toBe(2);
    const cleared = clearFindingsReminder(markFindingsReminder(counted));
    expect(cleared.reminders.findingsReminderPending).toBe(false);
    expect(cleared.reminders.readLikeToolCount).toBe(0);
  });

  test("repeated tool errors increment count", () => {
    const once = markToolError(defaultExtensionState(), "same");
    const twice = markToolError(once, "same");
    const different = markToolError(twice, "different");
    expect(twice.reminders.repeatedErrorCount).toBe(2);
    expect(different.reminders.repeatedErrorCount).toBe(1);
  });

  test("completion reminder increments", () => {
    expect(incrementCompletionReminder(defaultExtensionState()).reminders.completionReminderCount).toBe(1);
  });
});

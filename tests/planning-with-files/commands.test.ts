import { describe, expect, test } from "bun:test";
import { planningKickoffMessage, registerPlanningCommands } from "../../extensions/planning-with-files/commands.js";
import { defaultExtensionState } from "../../extensions/planning-with-files/state.js";

describe("planning commands", () => {
  test("planning kickoff message includes task and required files", () => {
    const message = planningKickoffMessage("Build feature");
    expect(message).toContain("Build feature");
    expect(message).toContain("task_plan.md");
    expect(message).toContain("findings.md");
    expect(message).toContain("progress.md");
  });

  test("registers expected commands", () => {
    const commands: Record<string, any> = {};
    let state = defaultExtensionState();
    registerPlanningCommands(
      {
        registerCommand: (name: string, command: any) => {
          commands[name] = command;
        },
        sendUserMessage: () => {},
      } as any,
      () => state,
      (next) => {
        state = next;
      },
    );
    expect(Object.keys(commands).sort()).toEqual(["plan", "plan-catchup", "plan-check", "plan-done", "plan-off", "plan-on", "plan-phases", "plan-status", "pwf"]);
  });
});

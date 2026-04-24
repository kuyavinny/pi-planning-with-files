import { describe, expect, test } from "bun:test";
import planningWithFilesExtension from "../../extensions/planning-with-files/index.js";

describe("extension lifecycle wiring", () => {
  test("registers tools, commands, and core event handlers", () => {
    const events: string[] = [];
    const commands: string[] = [];
    const tools: string[] = [];
    const pi = {
      registerTool: (tool: any) => tools.push(tool.name),
      registerCommand: (name: string) => commands.push(name),
      on: (name: string) => events.push(name),
      sendMessage: () => {},
      sendUserMessage: () => {},
      appendEntry: () => {},
    } as any;

    planningWithFilesExtension(pi);

    expect(tools.sort()).toEqual([
      "planning_with_files_check_complete",
      "planning_with_files_init",
      "planning_with_files_status",
    ]);
    expect(commands.sort()).toEqual(["plan", "plan-catchup", "plan-check", "plan-done", "plan-off", "plan-on", "plan-phases", "plan-status", "pwf"]);
    expect(events.sort()).toEqual([
      "agent_end",
      "before_agent_start",
      "context",
      "session_shutdown",
      "session_start",
      "tool_call",
      "tool_result",
    ]);
  });

  test("context handler does not duplicate existing planning context", async () => {
    const handlers: Record<string, any> = {};
    const pi = {
      registerTool: () => {},
      registerCommand: () => {},
      on: (name: string, handler: any) => {
        handlers[name] = handler;
      },
      sendMessage: () => {},
      sendUserMessage: () => {},
      appendEntry: () => {},
    } as any;

    planningWithFilesExtension(pi);

    const result = await handlers.context(
      { messages: [{ role: "custom", customType: "planning-with-files-context", content: "existing", display: false }] },
      { cwd: process.cwd() },
    );

    expect(result).toBeUndefined();
  });
});

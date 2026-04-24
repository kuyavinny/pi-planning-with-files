import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import planningWithFilesExtension from "../../extensions/planning-with-files/index.js";

async function withPlan<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "pi-pwf-error-"));
  try {
    await writeFile(join(dir, "task_plan.md"), "### Phase 1: Work\n- **Status:** in_progress\n", "utf8");
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function setupHandlers(): Record<string, any> {
  const handlers: Record<string, any> = {};
  planningWithFilesExtension({
    registerTool: () => {},
    registerCommand: () => {},
    on: (name: string, handler: any) => {
      handlers[name] = handler;
    },
    sendMessage: () => {},
    sendUserMessage: () => {},
    appendEntry: () => {},
  } as any);
  return handlers;
}

describe("error reminders", () => {
  test("failed tool result adds error reminder to context", async () => {
    await withPlan(async (dir) => {
      const handlers = setupHandlers();
      await handlers.tool_result({ toolName: "bash", input: { command: "npm test" }, isError: true, content: "failed" }, { cwd: dir });
      const result = await handlers.context({ messages: [] }, { cwd: dir });
      expect(result.messages.at(-1).content).toContain("Log this error in task_plan.md and progress.md");
    });
  });

  test("three repeated failures add escalation guidance", async () => {
    await withPlan(async (dir) => {
      const handlers = setupHandlers();
      for (let i = 0; i < 3; i++) {
        await handlers.tool_result({ toolName: "bash", input: { command: "npm test" }, isError: true, content: "same failure" }, { cwd: dir });
      }
      const result = await handlers.context({ messages: [] }, { cwd: dir });
      expect(result.messages.at(-1).content).toContain("repeated failure");
    });
  });

  test("editing task_plan.md clears error reminder", async () => {
    await withPlan(async (dir) => {
      const handlers = setupHandlers();
      await handlers.tool_result({ toolName: "bash", input: { command: "npm test" }, isError: true, content: "failed" }, { cwd: dir });
      await handlers.tool_result({ toolName: "edit", input: { path: "task_plan.md" }, isError: false, content: [] }, { cwd: dir });
      const result = await handlers.context({ messages: [] }, { cwd: dir });
      expect(result.messages.at(-1).content).not.toContain("Log this error in task_plan.md and progress.md");
    });
  });
});

import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import planningWithFilesExtension from "../../extensions/planning-with-files/index.js";

async function withPlan<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "pi-pwf-findings-"));
  try {
    await writeFile(join(dir, "task_plan.md"), "### Phase 1: Work\n- **Status:** in_progress\n", "utf8");
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("findings reminder lifecycle", () => {
  test("two read-like tool calls add findings reminder to context", async () => {
    await withPlan(async (dir) => {
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

      await handlers.tool_call({ toolName: "read" }, { cwd: dir });
      await handlers.tool_call({ toolName: "grep" }, { cwd: dir });
      const result = await handlers.context({ messages: [] }, { cwd: dir });
      const contextMessage = result.messages.at(-1).content;
      expect(contextMessage).toContain("Save key findings to findings.md");
    });
  });

  test("editing findings.md clears findings reminder", async () => {
    await withPlan(async (dir) => {
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

      await handlers.tool_call({ toolName: "read" }, { cwd: dir });
      await handlers.tool_call({ toolName: "read" }, { cwd: dir });
      await handlers.tool_result({ toolName: "edit", input: { path: "findings.md" }, isError: false, content: [] }, { cwd: dir });
      const result = await handlers.context({ messages: [] }, { cwd: dir });
      const contextMessage = result.messages.at(-1).content;
      expect(contextMessage).not.toContain("Save key findings to findings.md");
    });
  });
});

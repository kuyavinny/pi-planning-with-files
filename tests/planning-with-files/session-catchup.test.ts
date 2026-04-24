import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCatchupReport,
  extractCatchupMessages,
  findLastPlanningUpdate,
  formatCatchupReport,
  parsePiSessionFile,
} from "../../extensions/planning-with-files/session-catchup.js";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "pi-pwf-session-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function line(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

describe("Pi session catchup", () => {
  test("parses JSONL and skips malformed lines", async () => {
    await withTempDir(async (dir) => {
      const file = join(dir, "session.jsonl");
      await writeFile(file, `${line({ type: "session" })}not-json\n${line({ type: "message", message: { role: "user", content: "hello" } })}`, "utf8");
      const entries = await parsePiSessionFile(file);
      expect(entries).toHaveLength(2);
      expect(entries[1]?._lineNumber).toBe(2);
    });
  });

  test("finds last planning update from assistant tool calls", () => {
    const update = findLastPlanningUpdate([
      { type: "message", id: "1", _lineNumber: 0, message: { role: "assistant", content: [{ type: "toolCall", name: "write", arguments: { path: "task_plan.md" } }] } },
      { type: "message", id: "2", _lineNumber: 1, message: { role: "assistant", content: [{ type: "toolCall", name: "edit", arguments: { path: "progress.md" } }] } },
    ]);
    expect(update).toMatchObject({ file: "progress.md", entryId: "2", lineNumber: 1 });
  });

  test("extracts bounded messages after planning update", () => {
    const entries = [
      { type: "message", id: "1", _lineNumber: 0, message: { role: "assistant", content: [{ type: "toolCall", name: "write", arguments: { path: "task_plan.md" } }] } },
      { type: "message", id: "2", _lineNumber: 1, message: { role: "user", content: "Please also handle blank rows" } },
      { type: "message", id: "3", _lineNumber: 2, message: { role: "assistant", content: [{ type: "text", text: "Added blank-row handling" }] } },
      { type: "message", id: "4", _lineNumber: 3, message: { role: "toolResult", toolName: "edit", content: [{ type: "text", text: "Updated src/import.ts" }], isError: false } },
    ];
    const update = findLastPlanningUpdate(entries)!;
    const messages = extractCatchupMessages(entries, update);
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant", "tool"]);
    expect(messages[0]?.summary).toContain("blank rows");
  });

  test("builds catchup report from previous session and excludes current session", async () => {
    await withTempDir(async (dir) => {
      const previous = join(dir, "previous.jsonl");
      const current = join(dir, "current.jsonl");
      await writeFile(previous, [
        line({ type: "message", id: "1", timestamp: "t1", message: { role: "assistant", content: [{ type: "toolCall", name: "write", arguments: { path: "progress.md" } }] } }),
        line({ type: "message", id: "2", timestamp: "t2", message: { role: "user", content: "Unsynced request after update" } }),
      ].join(""), "utf8");
      await writeFile(current, line({ type: "message", id: "c", message: { role: "user", content: "current" } }), "utf8");

      const report = await buildCatchupReport(dir, { sessionFiles: [current, previous], currentSessionFile: current });
      expect(report.hasReport).toBe(true);
      expect(report.sessionFile).toBe(previous);
      expect(formatCatchupReport(report)).toContain("Previous Pi session context");
      expect(formatCatchupReport(report)).toContain("Unsynced request");
    });
  });

  test("returns no report when no planning update is present", async () => {
    await withTempDir(async (dir) => {
      const previous = join(dir, "previous.jsonl");
      await writeFile(previous, line({ type: "message", id: "1", message: { role: "user", content: "hello" } }), "utf8");
      const report = await buildCatchupReport(dir, { sessionFiles: [previous] });
      expect(report.hasReport).toBe(false);
      expect(formatCatchupReport(report)).toContain("No unsynced");
    });
  });
});

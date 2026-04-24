import { describe, expect, test } from "bun:test";
import {
  isFindingsFile,
  isMutationTool,
  isPlanningFile,
  isReadLikeTool,
  isUserStopOverride,
  planningFileFromPath,
  signatureForToolError,
  truncateForContext,
} from "../../extensions/planning-with-files/security.js";

describe("security helpers", () => {
  test("recognizes planning files by basename", () => {
    expect(planningFileFromPath("task_plan.md")).toBe("task_plan.md");
    expect(planningFileFromPath("docs/findings.md")).toBe("findings.md");
    expect(planningFileFromPath("@progress.md")).toBe("progress.md");
    expect(isPlanningFile("docs/task_plan.md.bak")).toBe(false);
  });

  test("recognizes findings file", () => {
    expect(isFindingsFile("findings.md")).toBe(true);
    expect(isFindingsFile("task_plan.md")).toBe(false);
  });

  test("classifies read-like tools", () => {
    for (const tool of ["read", "grep", "find", "web_search", "fetch_content", "code_search"]) {
      expect(isReadLikeTool(tool), tool).toBe(true);
    }
    expect(isReadLikeTool("write")).toBe(false);
  });

  test("classifies mutation tools", () => {
    expect(isMutationTool("write")).toBe(true);
    expect(isMutationTool("edit")).toBe(true);
    expect(isMutationTool("read")).toBe(false);
  });

  test("detects explicit stop overrides conservatively", () => {
    expect(isUserStopOverride("pause here, I'll continue later")).toBe(true);
    expect(isUserStopOverride("stop anyway")).toBe(true);
    expect(isUserStopOverride("just report status")).toBe(true);
    expect(isUserStopOverride("continue with the next phase")).toBe(false);
  });

  test("truncates long context with marker", () => {
    const result = truncateForContext("a\nb\nc\nd", { maxLines: 2 });
    expect(result.truncated).toBe(true);
    expect(result.text).toContain("[truncated:");
    expect(result.text).toContain("a\nb");
  });

  test("creates stable error signatures", () => {
    const signature = signatureForToolError("bash", { command: "npm test" }, "Error: failed\n  at stack");
    expect(signature).toContain("bash: npm test");
    expect(signature).toContain("Error: failed");
  });
});

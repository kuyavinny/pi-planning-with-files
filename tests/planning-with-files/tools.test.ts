import { describe, expect, test } from "bun:test";
import { registerPlanningTools } from "../../extensions/planning-with-files/tools.js";

describe("planning tools", () => {
  test("registers three model-callable tools", () => {
    const tools: any[] = [];
    registerPlanningTools({ registerTool: (tool: any) => tools.push(tool) } as any);
    expect(tools.map((tool) => tool.name)).toEqual([
      "planning_with_files_init",
      "planning_with_files_status",
      "planning_with_files_check_complete",
    ]);
    expect(tools.every((tool) => tool.promptGuidelines?.[0]?.includes(tool.name))).toBe(true);
  });
});

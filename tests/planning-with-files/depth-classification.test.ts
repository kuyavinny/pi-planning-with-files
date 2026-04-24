import { describe, expect, test } from "bun:test";
import { classifyDepth, planningKickoffMessage } from "../../extensions/planning-with-files/commands.js";

describe("depth classification", () => {
  test("classifies short trivial tasks as lightweight", () => {
    expect(classifyDepth("fix typo")).toBe("lightweight");
  });

  test("classifies short tasks with no keywords as lightweight", () => {
    expect(classifyDepth("update the welcome message")).toBe("lightweight");
  });

  test("respects explicit lightweight keywords", () => {
    expect(classifyDepth("simple bug fix for the login form")).toBe("lightweight");
  });

  test("respects explicit quick keyword", () => {
    expect(classifyDepth("quick patch for the API endpoint")).toBe("lightweight");
  });

  test("classifies feature tasks as standard", () => {
    expect(classifyDepth("implement dark mode")).toBe("standard");
  });

  test("classifies build tasks as standard", () => {
    expect(classifyDepth("build the auth system")).toBe("standard");
  });

  test("classifies add tasks as standard even with short description", () => {
    expect(classifyDepth("add dark mode to settings")).toBe("standard");
  });

  test("classifies architecture tasks as deep", () => {
    expect(classifyDepth("redesign the data layer")).toBe("deep");
  });

  test("classifies refactor tasks as deep", () => {
    expect(classifyDepth("refactor the plugin system")).toBe("deep");
  });

  test("classifies migration tasks as deep", () => {
    expect(classifyDepth("migrate from REST to GraphQL")).toBe("deep");
  });

  test("respects explicit deep keywords", () => {
    expect(classifyDepth("complex feature implementation")).toBe("deep");
  });

  test("respects strategic keyword", () => {
    expect(classifyDepth("strategic overhaul of the deployment process")).toBe("deep");
  });

  test("defaults to lightweight for ambiguous short tasks with no keywords", () => {
    // Short tasks with no keywords default to lightweight
    expect(classifyDepth("improve the dashboard performance")).toBe("lightweight");
  });

  test("defaults to standard for ambiguous longer tasks", () => {
    expect(classifyDepth("improve the dashboard performance by optimizing the rendering pipeline and reducing bundle size")).toBe("standard");
  });

  test("classifies integration tasks as deep", () => {
    expect(classifyDepth("integration with third-party payment provider")).toBe("deep");
  });

  test("classifies end-to-end tasks as deep", () => {
    expect(classifyDepth("end-to-end testing pipeline")).toBe("deep");
  });
});

describe("planning kickoff message with depth", () => {
  test("lightweight tasks get 5-question bootstrap", () => {
    const msg = planningKickoffMessage("fix typo", "lightweight");
    expect(msg).toContain("Depth: lightweight");
    expect(msg).toContain("Problem:");
    expect(msg).toContain("Behavior:");
    expect(msg).toContain("Scope:");
    expect(msg).toContain("Success:");
    expect(msg).toContain("Blockers:");
  });

  test("standard tasks get frame-before-planning guidance", () => {
    const msg = planningKickoffMessage("implement dark mode", "standard");
    expect(msg).toContain("Depth: standard");
    expect(msg).toContain("Problem:");
    expect(msg).toContain("Success:");
    expect(msg).toContain("Assumptions:");
    expect(msg).toContain("Decomposition:");
    expect(msg).toContain("Clarifying questions");
  });

  test("deep tasks get full planning methodology with research gate", () => {
    const msg = planningKickoffMessage("redesign the data layer", "deep");
    expect(msg).toContain("Depth: deep");
    expect(msg).toContain("Problem Frame:");
    expect(msg).toContain("Success Criteria:");
    expect(msg).toContain("Assumptions:");
    expect(msg).toContain("Opportunity-Solution Tree");
    expect(msg).toContain("Tiger");
    expect(msg).toContain("Research:");
    expect(msg).toContain("Clarifying questions");
  });

  test("lightweight tasks do not get clarifying questions", () => {
    const msg = planningKickoffMessage("fix typo", "lightweight");
    expect(msg).not.toContain("Clarifying questions");
  });

  test("auto-classifies when no depth provided", () => {
    const msg = planningKickoffMessage("fix typo");
    expect(msg).toContain("Depth: lightweight");
  });

  test("always includes required files mention", () => {
    const msg = planningKickoffMessage("build feature", "standard");
    expect(msg).toContain("task_plan.md");
    expect(msg).toContain("findings.md");
    expect(msg).toContain("progress.md");
  });
});
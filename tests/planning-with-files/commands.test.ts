import { describe, expect, test } from "bun:test";
import { planningKickoffMessage, classifyDepth, confidenceCheck, registerPlanningCommands } from "../../extensions/planning-with-files/commands.js";
import { defaultExtensionState } from "../../extensions/planning-with-files/state.js";
import type { ParsedTaskPlan } from "../../extensions/planning-with-files/types.js";

describe("planning commands", () => {
  test("planning kickoff message includes task and required files", () => {
    const message = planningKickoffMessage("Build feature");
    expect(message).toContain("Build feature");
    expect(message).toContain("task_plan.md");
    expect(message).toContain("findings.md");
    expect(message).toContain("progress.md");
  });

  test("standard kickoff asks for durable spec and implementation plan", () => {
    const message = planningKickoffMessage("Build feature", "standard");
    expect(message).toContain("Durable artifacts");
    expect(message).toContain("spec and implementation plan");
  });

  test("deep kickoff asks for full durable artifact chain", () => {
    const message = planningKickoffMessage("Redesign architecture", "deep");
    expect(message).toContain("discovery, spec, implementation plan, review, and learnings");
  });

  test("lightweight kickoff stays low ceremony", () => {
    const message = planningKickoffMessage("Fix typo", "lightweight");
    expect(message).not.toContain("Durable artifacts");
    expect(message).not.toContain("implementation plan under docs");
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
    expect(Object.keys(commands).sort()).toEqual(["plan", "plan-catchup", "plan-check", "plan-deepen", "plan-done", "plan-off", "plan-on", "plan-phases", "plan-status", "pwf"]);
  });
});

describe("confidence check", () => {
  const basePlan: ParsedTaskPlan = {
    goal: "Add dark mode to the settings page with toggle persistence",
    currentPhase: "U1: Discovery",
    depth: "standard",
    assumptions: [],
    risks: [],
    phases: [
      { index: 1, title: "U1: Discovery", status: "in_progress", raw: "" },
      { index: 2, title: "U2: Implementation", status: "pending", raw: "" },
      { index: 3, title: "U3: Testing", status: "pending", raw: "" },
    ],
    errorsLogged: 0,
    warnings: [],
  };

  test("reports strong for a plan with specific goal, phases, depth", () => {
    const report = confidenceCheck(basePlan);
    expect(report).toContain("Confidence Check");
    expect(report).toContain("Goal");
    expect(report).toContain("Phases");
    expect(report).toContain("Success Criteria");
  });

  test("reports weak goal for vague or template text", () => {
    const vague: ParsedTaskPlan = { ...basePlan, goal: "[One sentence describing the end state]" };
    const report = confidenceCheck(vague);
    expect(report).toContain("Goal");
    expect(report).toContain("weak");
  });

  test("reports missing assumptions for standard depth without assumptions", () => {
    const report = confidenceCheck(basePlan);
    expect(report).toContain("Assumptions");
    expect(report).toContain("No assumptions listed");
  });

  test("reports strong assumptions when populated with actions", () => {
    const withAssumptions: ParsedTaskPlan = {
      ...basePlan,
      assumptions: [{ assumption: "Users need dark mode", category: "Value", impact: "High", risk: "Medium", action: "Validate with user feedback" }],
      risks: [{ risk: "Y", type: "Tiger", urgency: "track", mitigation: "Monitor" }],
    };
    const report = confidenceCheck(withAssumptions);
    expect(report).toContain("Assumptions");
    expect(report).toContain("assumptions with validation actions");
  });

  test("reports missing risks for standard depth without risks", () => {
    const report = confidenceCheck(basePlan);
    expect(report).toContain("Risks");
    expect(report).toContain("No risks identified");
  });

  test("skips assumption/risk checks for lightweight depth", () => {
    const lightweight: ParsedTaskPlan = { ...basePlan, depth: "lightweight" };
    const report = confidenceCheck(lightweight);
    expect(report).toContain("Skipped for lightweight task");
  });

  test("reports weak phases for fewer than 3 phases", () => {
    const short: ParsedTaskPlan = { ...basePlan, phases: [{ index: 1, title: "U1: Build", status: "in_progress", raw: "" }] };
    const report = confidenceCheck(short);
    expect(report).toContain("Only 1 phase");
  });

  test("suggests strengthening when weak or missing sections exist", () => {
    const report = confidenceCheck(basePlan);
    expect(report).toContain("Strengthen");
  });

  test("celebrates when all sections are strong", () => {
    const strong: ParsedTaskPlan = {
      ...basePlan,
      assumptions: [{ assumption: "X", category: "Value", impact: "High", risk: "Low", action: "Proceed" }],
      risks: [{ risk: "Y", type: "Tiger", urgency: "track", mitigation: "Monitor" }],
    };
    // Add success criteria text to raw
    const withSuccess = { ...strong, phases: strong.phases.map((p) => ({ ...p, raw: "Success criteria: all tests pass" })) };
    const report = confidenceCheck(withSuccess);
    // Should not say "Strengthen" since everything should be strong
    expect(report).toContain("Plan looks solid");
  });
});

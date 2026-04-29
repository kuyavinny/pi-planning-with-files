# PwF Review Protocol — Specification

## Problem
PwF's current review is a single end-of-task `templates/review.md` with a basic checklist.
It does not differentiate:
- When review happens (only at the end)
- Who performs it (no distinction between self-check and handoff review)
- What depth is needed (no conditional perspectives based on content)

This misses issues that gated review catches: planning gaps before execution, scope drift during execution, and role-blind spots after implementation.

## Success Criteria
After implementation, `SKILL.md` and templates support four review gates with optional conditional lenses.

## Assumptions
- Not every task needs all 4 gates (lightweight tasks may skip some)
- Lenses are always available but only used when relevant
- Subagent dispatch is optional but encouraged when a fresh perspective or specialized tooling (e.g. web research) is beneficial
- Background (`async: true`) subagent runs are preferred so the parent session does not block
- This stays lightweight — no JSON schemas, no automated tooling

## Decomposition
1. Map review gates to PwF workflow stages
2. Define conditional lenses (triggers and focus)
3. Design `review.md` as a unified gate-aware template
4. Update `SKILL.md` with protocol guidance
5. Update `implementation_plan.md` to reference checkpoint gates

## Review Gates

| Gate | When | Who | What | Optional Subagent Boost |
|------|------|-----|------|------------------------|
| Self-Check | After brainstorming / before design gate | Agent running the work | Are assumptions mapped? Are requirements clear? Any placeholders? | `oracle` for assumption challenge |
| Plan Sanity | After implementation plan exists / before executing | Agent | Does plan cover spec? Task granularity OK? Verification commands defined? | `reviewer` or `scout` for gap detection |
| Checkpoint | After each U-ID unit during execution | Agent | What was done vs planned? Deviations? Blockers? Risks emerging? | `reviewer` with `async: true` (background) |
| Final Review | After task complete / before handoff | Agent + (optionally) user | All requirements met? Tests pass? Docs updated? Remaining risks acknowledged? | Parallel `reviewer`, `oracle`, or `researcher` |

## Subagent-Assisted Review

When a gate benefits from a second set of eyes or specialized tools, invoke a subagent via the `subagent` tool. Prefer **background** execution (`async: true`) so the parent session continues without waiting.

### Typical subagent calls by gate

**Self-Check**
```typescript
subagent({ agent: "oracle", task: "Challenge the assumptions and requirements in the current brainstorm. What are we missing?", async: true })
```

**Plan Sanity**
```typescript
subagent({ agent: "reviewer", task: "Review the implementation plan for gaps, missing edge cases, and unrealistic estimates.", async: true })
```

**Checkpoint**
```typescript
subagent({ agent: "reviewer", task: "Review the diff for this unit. Check for scope creep and untested paths.", async: true })
```

**Final Review**
```typescript
subagent({
  tasks: [
    { agent: "reviewer", task: "Review implementation correctness, tests, and edge cases." },
    { agent: "oracle", task: "Challenge whether the approach still matches the original requirements." },
    { agent: "researcher", task: "Verify any external API or dependency assumptions are still valid." }
  ],
  async: true
})
```

Use `worktree: true` when parallel reviewers need isolated git checkouts. Use `intercom` if a subagent needs to ask clarifying questions mid-flight.

## Subagent Roles in PwF

Use subagents to isolate context‑heavy work so the main session stays lean. Each subagent produces a file artifact (e.g. `findings.md`, `context.md`, `review.md`) that the main agent reads briefly instead of retaining the full exploration in context.

| PwF Stage | Subagent | Why it fits | Typical output |
|---|---|---|---|
| **0. Start / classify** | `scout` | Quick codebase recon when scope is unclear | `context.md` |
| **1. Discover** | `scout` | Map relevant files, entry points, data flow | `context.md` |
| **1. Discover** | `researcher` | Web/docs research for external dependencies or APIs | `findings.md` |
| **1. Discover** | `context-builder` | Gather deep context and write handoff material | `context.md`, `meta-prompt.md` |
| **2. Frame requirements** | `oracle` | Challenge assumptions and requirements before they harden | advisory notes (record in `findings.md`) |
| **3. Design / spec** | `planner` | Create a concrete implementation plan from gathered context | `plan.md` linked from `task_plan.md` |
| **3. Design / spec** | `oracle` | Review design direction for drift or missed constraints | advisory notes (record in `findings.md`) |
| **4. Plan implementation** | `planner` | Turn spec into a phase‑level plan with verification steps | `implementation_plan.md` |
| **4. Plan implementation** | `scout` | Verify file map and dependencies before committing to plan | updated `context.md` |
| **5. Execute with PwF** | `worker` | Implement an approved unit when the main agent wants to delegate the write path | code + unit test files |
| **5. Execute with PwF** | `delegate` | General‑purpose helper for isolated tasks (e.g. generate config, run a one‑off script) | task‑specific output file |
| **6. Verify / review** | `reviewer` | Code review, edge‑case checks, test coverage | `review.md` |
| **6. Verify / review** | `oracle` | Directional audit: does the result still match the original requirements? | advisory notes (record in `review.md`) |
| **6. Verify / review** | `researcher` | Verify external assumptions still hold (API versions, docs) | `findings.md` |
| **7. Compound learnings** | `delegate` or `reviewer` | Summarize lessons into a compact, durable record | `learnings.md` |

### Context‑isolation rule

When a subagent produces output, write it to a file and **read only the summary** back into the main context. Do not stream the full subagent transcript into the parent session unless the user explicitly asks for it.

### Parallel work via git worktree

When two or more subagents need to modify the same repository in parallel, use `worktree: true` to give each agent an isolated git worktree branched from `HEAD`. This avoids filesystem collisions and lets units or reviews run concurrently.

**Execution example**
```typescript
subagent({
  tasks: [
    { agent: "worker", task: "Implement auth middleware" },
    { agent: "worker", task: "Implement API rate limiting" }
  ],
  worktree: true,
  async: true
})
```

**Review example**
```typescript
subagent({
  tasks: [
    { agent: "reviewer", task: "Review auth middleware correctness" },
    { agent: "reviewer", task: "Review rate limiter tests" }
  ],
  worktree: true,
  async: true
})
```

Requirements for `worktree: true`:
- The project must be inside a git repo.
- The working tree must be clean.
- Each task should use the shared cwd (no conflicting per-task `cwd`).

After completion, per-worktree diff stats are appended to the output and patch files are written to artifacts.
Lenses are optional structured perspectives. The agent applies lenses based on signals in the content being reviewed. Lens findings are recorded in `findings.md` or `progress.md`.

| Lens | Trigger | Focus | Always/Conditional |
|------|---------|-------|------------------|
| Coherence Lens | All reviews | Internal consistency, contradictions, terminology drift | Always |
| Buildability Lens | All reviews | Can this actually be implemented as stated? Dependencies, external blocks | Always |
| Scope Lens | Multiple priorities, new abstractions, unclear boundaries | Right-sizing, over-engineering, scope creep | Conditional |
| Risk Lens | Auth, data handling, external APIs, payments, migrations | Trust boundaries, threat model at plan level, rollback paths | Conditional |
| Completeness Lens | Large plans (>3 phases, >5 artifacts) or complex requirements | Gaps between spec and plan, missing edge cases, untested paths | Conditional |

## Artifact Changes
- `templates/review.md` — redesigned as a unified template with gate sections
- `templates/implementation_plan.md` — add checkpoint review reference between units
- `SKILL.md` — add "Review Protocol" section

## Non-Goals
- No mandatory subagent dispatch (still agent‑discretion, not automated triggers)
- No JSON findings schema
- No CE-style confidence thresholds or severity scoring
- No automated test running as part of review
- No changes to the Pi extension code

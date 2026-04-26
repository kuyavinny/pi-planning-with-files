# PwF Implementation Execution Protocol Spec

Status: draft
Date: 2026-04-26
Scope: clean-room synthesis for Planning-with-Files execution after a durable implementation plan exists

## Goal

Define a PwF-native execution protocol for the stage after a durable implementation plan has been created, so agents execute planned work without drifting, skipping verification, or losing durable context.

## Background

Planning-with-Files already defines an integrated workflow:

```text
0. Start / classify
1. Discover
2. Frame requirements
3. Design / spec
4. Plan implementation
5. Execute with PwF
6. Verify / review
7. Compound learnings
8. Close / archive
```

The existing brainstorming protocol strengthens stages before design/spec and implementation planning. This spec covers the next gap: disciplined execution of an already-created implementation plan.

## Clean-Room Source Synthesis

External workflows are conceptual inspiration only. This design does not copy their code, command names, templates, or prose.

| Source family | Useful execution concept | PwF-native synthesis |
|---|---|---|
| CE-style | Implementation is controlled replay of a plan; deviations must be captured | Treat `docs/plans/...` as the execution contract; deviations update plan/spec, not chat only |
| Superpowers-style | Execute one task at a time; verify before moving on; stop at gates | U-ID phase loop with explicit entry and exit criteria |
| PM-style | Keep outcome, user value, assumptions, and risks visible during delivery | Each phase re-checks success criteria, assumptions, risks, and non-goals before coding |

## Proposed Protocol: PwF Execution Loop

For every implementation phase after the implementation plan exists:

```text
1. Re-anchor
2. Select one unit
3. Preflight
4. Execute surgically
5. Verify
6. Record
7. Gate next step
```

### 1. Re-anchor

Before coding each phase, refresh:

- current `task_plan.md` phase;
- relevant section of `docs/plans/...`;
- relevant spec requirement from `docs/specs/...`;
- recent `progress.md`.

Purpose: prevent drift and restore the execution contract into attention.

Minimum checklist:

```markdown
- Current U-ID:
- Linked spec requirement:
- Planned files:
- Planned verification:
- Known risks/assumptions:
```

### 2. Select One Unit

Execute exactly one U-ID phase or subtask at a time.

If the unit is too large to verify in one pass, split it before coding.

### 3. Preflight

Before edits, check whether anything changed since the plan was written:

- Are planned files still present?
- Has relevant code changed?
- Are assumptions still valid?
- Is the phase still the right next step?
- Is the verification command still correct?

If the answer changes the implementation path, update `task_plan.md` and the durable implementation plan before continuing.

### 4. Execute Surgically

Implementation rules:

- Touch only files required by the phase unless a discovered dependency requires more.
- Prefer the narrowest edit.
- Do not refactor adjacent code unless the phase says so.
- Keep deviations explicit.

If the plan is wrong:

```text
STOP → record deviation → update plan/spec → continue only after the new path is explicit.
```

Suggested deviation record:

```markdown
## Deviations
| Phase | Planned | Actual | Reason | Artifact updated |
|---|---|---|---|---|
```

### 5. Verify

Each phase should have a verification ladder:

```text
narrowest check → targeted tests → broader suite if needed
```

A phase is not complete until its stated verification passes or the failure is explicitly logged and accepted.

### 6. Record

After meaningful action:

- update `progress.md`;
- update phase checklist/status in `task_plan.md`;
- add findings if discovery happened;
- log errors and changed approach;
- update durable plan/spec if execution deviated.

Suggested progress entry:

```markdown
### U3.2: Widget rendering
- Action: Changed `ui.ts` to use single-line progress widget.
- Verification: `bun test tests/planning-with-files/ui.test.ts` passed.
- Files changed:
  - `extensions/planning-with-files/ui.ts`
  - `tests/planning-with-files/ui.test.ts`
- Deviations:
  - None
- Next:
  - Run full suite before commit.
```

### 7. Gate Next Step

Before moving on:

- Did verification pass?
- Did we update progress?
- Did the phase status change?
- Did we introduce or resolve assumptions/risks?
- Is the implementation plan still accurate?

Move on only when the answers are recorded and acceptable.

## Artifact Responsibilities

| Artifact | During execution |
|---|---|
| `task_plan.md` | Active U-ID state, checklist, current phase, blockers |
| `progress.md` | Chronological execution log and verification results |
| `findings.md` | New discoveries, API docs, unexpected behavior |
| `docs/plans/...` | Execution contract; update if plan changes |
| `docs/specs/...` | Update if product/design behavior changes |
| `docs/reviews/...` | Final verification/audit record |

## Design Decision

Recommended implementation path after approval:

| Approach | Pros | Cons | Recommendation |
|---|---|---|---|
| Add only to `SKILL.md` | Small, behavior-focused | Template may not remind enough | Good minimum |
| Add to `SKILL.md` and `implementation_plan.md` | Stronger, still simple | Slightly more docs | Best next step |
| Add slash command automation | Strong UX | More code and premature ceremony | Defer |

## Brainstorming Continuation

This section records both the outputs and the actions performed on this spec. The point is to make the brainstorming protocol auditable, not merely to add headings.

### Context Scan

Action performed on this spec:

- Re-read the active planning files: `task_plan.md`, `findings.md`, and `progress.md`.
- Re-read this durable spec after it was created.
- Read `skills/planning-with-files/SKILL.md` to confirm existing PwF workflow, durable artifact rules, phase format, execution posture, test scenario categories, and critical rules.
- Read `skills/planning-with-files/templates/implementation_plan.md` after the first correction to verify the actual template surface.

Observed PwF assets:

- `SKILL.md` already defines the integrated workflow and current execution rules, but does not yet have a named post-plan execution protocol.
- `templates/implementation_plan.md` already has requirements trace, file map, implementation units, verification fields, review checklist, and deviations-from-spec documentation.
- The template does not yet include explicit re-anchor, preflight, record, and next-step gate prompts.
- `task_plan.md`, `findings.md`, and `progress.md` remain the active execution ledger.
- No new runtime API is required for the first implementation of this protocol.

Spec impact:

- The recommended implementation target is now specifically `SKILL.md` plus `templates/implementation_plan.md`, not runtime code.

### Scope Classification

Action performed on this spec:

- Classified the proposed change against current PwF depth policy and artifact model.
- Checked whether the spec proposes product behavior, runtime extension behavior, or workflow guidance.
- Checked whether the protocol should apply to lightweight tasks.

Classification result:

- Type: standard workflow/guidance feature.
- Primary surface: skill instructions and implementation plan template.
- Runtime extension impact: none for the first pass.
- Applicability: after a durable implementation plan exists; not mandatory for obvious lightweight fixes.

Spec impact:

- The scope is constrained to guidance/template changes unless the user explicitly approves automation later.

### Problem Pressure Test

Action performed on this spec:

- Challenged whether PwF really needs a new execution protocol after implementation planning.
- Compared the proposed protocol against doing nothing and against simply relying on the existing implementation plan template.
- Looked for a simpler framing than “add another workflow stage.”

Pressure-test result:

Problem: PwF can produce good specs and implementation plans, but execution can still drift after planning.

Desired outcome: agents execute implementation plans as controlled, verifiable units and keep durable artifacts accurate when reality differs from the plan.

If we do nothing:

- Plans remain advisory rather than operational.
- Deviations can remain only in chat.
- Verification may be delayed until the end instead of phase-by-phase.
- `progress.md` may become a loose log rather than a gate record.

Simpler framing:

- This is not a new planning stage.
- It is the operating loop inside existing stage 5, `Execute with PwF`.

Spec impact:

- The protocol remains an execution loop, not a new durable artifact category.

### Multi-Perspective Review

Action performed on this spec:

- Reviewed the proposed execution loop from product/user, design/usability, engineering, maintainability, and trust/safety perspectives.
- Checked whether each perspective implies a change to protocol scope or artifact responsibilities.

| Perspective | Concern found | Spec response |
|---|---|---|
| User/product value | Implementation can satisfy code tasks but drift from the intended outcome | Re-anchor on spec requirements and success criteria before each phase |
| Design/usability | Too much execution ceremony could slow small fixes | Trigger the full loop only after a durable implementation plan exists |
| Engineering/feasibility | Agents need concrete file/test guidance at execution time | Use preflight, one-unit execution, and verification ladder |
| Maintainability | Future maintainers need to understand deviations | Record deviations in durable plan/spec, not only chat |
| Trust/safety | Untrusted findings should not become repeated instructions | Keep raw findings in `findings.md`; promote only summarized user-approved decisions |

Spec impact:

- Added/kept the low-ceremony boundary for lightweight work.
- Kept durable deviation recording as a must-have.
- Kept the trust boundary explicit in artifact responsibilities.

### Assumption Mapping

Action performed on this spec:

- Identified assumptions that must hold for the proposed protocol to be useful.
- Categorized them by product/workflow risk.
- Added validation paths that can be tested during implementation.

| Assumption | Category | Risk | Validation |
|---|---|---|---|
| Agents will follow execution gates if guidance is in `SKILL.md` | Usability | Medium | Add concise guidance and tests that assert it is packaged |
| Implementation plans should carry execution-loop reminders | Feasibility | Low | Update `templates/implementation_plan.md` |
| Standard tasks benefit from this only when durable plans exist | Value | Medium | Phrase protocol as “after a durable implementation plan exists” |
| Deviation records improve future maintenance | Viability | Low | Add deviation log to template |
| Runtime automation is not required for first pass | Feasibility | Low | Defer slash commands/tools |

Spec impact:

- The implementation acceptance criteria must include tests for both skill guidance and template content.
- Runtime automation remains deferred until guidance/template behavior is validated.

### Approaches Considered

Action performed on this spec:

- Compared multiple implementation approaches against the pressure-tested problem and assumptions.
- Rejected approaches that only catch drift after the fact or overbuild runtime behavior before protocol validation.

| Approach | Pros | Cons | Decision |
|---|---|---|---|
| Skill guidance only | Minimal and behavior-focused | Easy to forget during execution | Good minimum, but not strongest |
| Skill guidance + implementation plan template | Reinforces behavior where execution starts | Slightly more doc/template surface | Recommended |
| Add command automation for execution gates | Strong UX and consistency | More runtime code; premature for protocol validation | Defer |
| Add review-only guidance | Helps catch issues at end | Does not prevent drift during execution | Reject as insufficient |

Spec impact:

- Recommended design is skill guidance plus implementation plan template reinforcement.
- Slash command/runtime automation is explicitly out of scope for the first pass.

### Requirements Capture

Action performed on this spec:

- Converted the pressure test, perspective review, assumptions, and approach decision into implementation requirements.
- Separated must-haves from non-goals.
- Defined acceptance criteria for the eventual implementation plan.

Must-haves:

- Define a PwF-native execution loop after implementation plan creation.
- Require re-anchoring on `task_plan.md`, durable plan, relevant spec, and recent progress.
- Require one-unit-at-a-time execution.
- Require preflight before edits.
- Require surgical implementation and explicit deviation handling.
- Require phase-level verification before marking complete.
- Require recording in `progress.md`, `task_plan.md`, and durable docs when deviations occur.
- Keep lightweight tasks low ceremony.
- Keep first implementation guidance/template-only; defer runtime automation.

Non-goals:

- Do not add new slash commands in the first pass.
- Do not copy external workflow names, commands, templates, or prose.
- Do not force full durable artifacts for obvious lightweight fixes.

Acceptance criteria for implementation, if approved:

- `SKILL.md` contains an Implementation Execution Protocol section.
- `templates/implementation_plan.md` includes phase preflight, verification ladder, deviation log, and record/gate prompts.
- Tests verify the skill guidance and template assets include the protocol.
- Full test suite passes.

Spec impact:

- U3 implementation planning has concrete files, tests, and boundaries to plan against if the design is approved.

### Design Gate

Action performed on this spec:

- Checked whether the recommendation follows from the context scan, pressure test, assumptions, approaches, and requirements.
- Checked whether any open question blocks implementation planning.
- Identified the explicit approval needed before U3.

Design decision:

- Recommended design: add guidance to `SKILL.md` and reinforce it in `templates/implementation_plan.md`.
- Defer command/runtime automation.
- No open question blocks a guidance/template implementation plan.

Approval question:

- Should PwF implement this recommended design now?

### Open Questions

Open questions from the draft spec:

- Should `/plan` kickoff mention execution loop explicitly, or should it stay in skill/template guidance only?
- Should the implementation plan template require a deviation log even when no deviations occurred, or include it as an optional section?
- Should review templates later audit whether the execution loop was followed?

### Clarifying Dialogue

Question 1: After a durable implementation plan exists, how much execution protocol ceremony should each implementation unit have?
- Asked because the scope classification distinguishes standard/deep from lightweight, but the execution loop could be either always-full or risk-adaptive.
- User answer: **B — Compact loop by default, full loop when risk/complexity is higher.**
- Spec impact:
  - The protocol is now risk-adaptive rather than one-size-fits-all.
  - The implementation plan template should define triggers for escalating from compact to full loop.

Question 2: What should trigger escalating from compact loop to the full execution loop?
- Asked because a risk-adaptive protocol needs explicit escalation criteria.
- User answer: **E — All of the above:** prior errors in this unit, cross-file or cross-module changes, security or trust boundary changes, and user explicitly asked for deep/rigorous execution.
- Spec impact:
  - The implementation plan template must include an escalation checklist.
  - The compact loop is the default; full loop is required when any escalation trigger is present.

### Design Gate

Recommended design: add guidance to `SKILL.md` and reinforce it in `templates/implementation_plan.md`. Defer command/runtime automation.

Approval question: should PwF implement this recommended design now?

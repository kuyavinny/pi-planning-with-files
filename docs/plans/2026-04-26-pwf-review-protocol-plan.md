# PwF Review Protocol — Implementation Plan

## Goal
Update PwF templates and SKILL.md to support the multi-gate review protocol with conditional lenses.

## Spec
`docs/specs/2026-04-26-pwf-review-protocol-spec.md`

## Requirements Trace
| Requirement | Unit | Verification |
|---|---|---|
| R1. Self-Check guidance exists | U1: Update SKILL.md | SKILL.md references self-check with checklist |
| R2. Plan Sanity guidance exists | U1: Update SKILL.md | SKILL.md references plan-sanity with checklist |
| R3. Checkpoint guidance exists | U2: Update implementation_plan.md | Template has checkpoint reference between units |
| R4. Final Review template is gate-aware | U3: Redesign review.md | review.md has gate sections |
| R5. Conditional lens guidance exists | U1: Update SKILL.md | SKILL.md describes lenses and triggers |
| R6. Subagent dispatch guidance exists | U1: Update SKILL.md | SKILL.md contains "Subagent Roles in PwF" and worktree examples |
| R7. Parallel worktree guidance exists | U1: Update SKILL.md | SKILL.md and templates reference `worktree: true` for parallel subagent runs |
| R8. Template tests pass | U4: Tests | bun test passes |

## Implementation Units

### U1: Update SKILL.md with Review Protocol + Subagent Integration
- **Files:** `skills/planning-with-files/SKILL.md`
- **Posture:** default
- **Verification:** SKILL.md contains new "Review Protocol" section with gates and lenses, plus "Subagent Roles in PwF" section with worktree examples

Steps:
- [ ] Add "Review Protocol" section between "Implementation Execution Protocol" and "Critical Rules"
- [ ] Document the four gates with when/who/what
- [ ] Document conditional lenses with triggers/focus
- [ ] Reference review protocol in the Integrated Workflow section (step 6)
- [ ] Add "Subagent Roles in PwF" section after "Integrated Workflow"
- [ ] Map each builtin subagent to a PwF stage and describe context isolation
- [ ] Add parallel work via git worktree subsection with code examples

### U2: Update implementation_plan.md
- **Files:** `skills/planning-with-files/templates/implementation_plan.md`
- **Posture:** default
- **Verification:** Template references checkpoint review

Steps:
- [ ] Add checkpoint review reference in the "PwF Execution Protocol" section
- [ ] Add Checkpoint Review subsection before Deviation Log: "After each unit completes, run a checkpoint review"

### U3: Redesign review.md template
- **Files:** `skills/planning-with-files/templates/review.md`
- **Posture:** default
- **Verification:** Template has sections for all four gates + lens notes

Steps:
- [ ] Rewrite header and intro to describe gate-aware usage
- [ ] Add Self-Check section (used at design gate)
- [ ] Add Plan Sanity section (used before execution)
- [ ] Add Checkpoint Review section (used after each unit)
- [ ] Add Final Review section (used at task completion)
- [ ] Add Conditional Lenses reference with notes on when each applies
- [ ] Keep backward-compatible Verification Run, Requirements Coverage tables

### U4: Write tests
- **Files:** `tests/planning-with-files/package-assets.test.ts`
- **Posture:** default
- **Verification:** `bun test` passes

Steps:
- [ ] Add assertions that review.md template contains expected gate sections
- [ ] Verify SKILL.md contains "Review Protocol" section

## PwF Execution Protocol

### Escalation Checklist
- [ ] Cross-file changes in SKILL.md (one large file)
- [ ] Review protocol is security/trust boundary adjacent (no — it's advisory)
→ Use **compact loop** by default for each unit.

### Compact Loop
For each unit: re-anchor, execute surgically, verify, record.

## Deviation Log
| U-ID | Planned | Actual | Reason | Plan/Spec Updated |

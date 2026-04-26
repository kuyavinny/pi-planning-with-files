# Implementation Plan: PwF Implementation Execution Protocol

## Goal
Add the PwF implementation execution protocol to skill guidance and the implementation plan template, then verify with tests.

## Spec Link
- `docs/specs/2026-04-26-pwf-implementation-execution-protocol-spec.md`

## Requirements Trace
| Requirement | Implementation Unit | Verification |
|---|---|---|
| SKILL.md contains Implementation Execution Protocol section | U3.1 | `rg` search in SKILL.md |
| implementation_plan.md includes execution loop, preflight, escalation checklist, deviation log, record/gate | U3.2 | `rg` search in template |
| Templates are packaged correctly | U3.3 | package-assets tests |
| No regressions in existing tests | U3.4 | `bun test` |

## File Map

### Modify
- `skills/planning-with-files/SKILL.md`
- `skills/planning-with-files/templates/implementation_plan.md`
- `tests/planning-with-files/package-assets.test.ts`

## Implementation Units

### U3.1: Add execution protocol to SKILL.md
- **Files:** `skills/planning-with-files/SKILL.md`
- **Posture:** default
- **Verification:** `rg -n "Implementation Execution Protocol" skills/planning-with-files/SKILL.md`
- [ ] Add "Implementation Execution Protocol" section after "Brainstorming Protocol" or near execution guidance
- [ ] Include compact loop description and full loop escalation triggers
- [ ] Reference `templates/implementation_plan.md` for operational reinforcement

### U3.2: Update implementation_plan.md template
- **Files:** `skills/planning-with-files/templates/implementation_plan.md`
- **Posture:** default
- **Verification:** `rg -n "Execution Loop|Preflight|Escalation|Deviation|Record|Gate" skills/planning-with-files/templates/implementation_plan.md`
- [ ] Add execution loop prompt after implementation units
- [ ] Add preflight checklist before first implementation unit
- [ ] Add escalation checklist (prior errors, cross-file, security/trust, user-requested deep execution)
- [ ] Add deviation log section
- [ ] Add record/gate prompts after each unit or at end

### U3.3: Update package-assets tests
- **Files:** `tests/planning-with-files/package-assets.test.ts`
- **Posture:** default
- **Verification:** `bun test tests/planning-with-files/package-assets.test.ts`
- [ ] Assert `templates/implementation_plan.md` exists in packaged assets
- [ ] Assert `SKILL.md` contains "Implementation Execution Protocol"

### U3.4: Full verification
- **Files:** all changed files
- **Posture:** default
- **Verification:** `bun test`
- [ ] Run full test suite and confirm no regressions

## Review Checklist
- [ ] Requirements covered: SKILL.md section, template reinforcement, tests
- [ ] Tests pass: targeted + full suite
- [ ] No copied external workflow text/commands
- [ ] Deviations from spec documented (none expected for guidance-only change)

## Links
- Active plan: `task_plan.md`
- Progress: `progress.md`
- Findings: `findings.md`

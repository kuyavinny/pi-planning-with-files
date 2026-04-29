# Implementation Plan: [Task or Feature]

## Goal
[What this plan implements]

## Spec Link
- [Path to spec]

## Requirements Trace
| Requirement | Implementation Unit | Verification |
|-------------|---------------------|--------------|
|             |                     |              |

## File Map
### Create
- `path/to/new-file`

### Modify
- `path/to/existing-file`

## Implementation Units

### U1: [Unit Name]
- **Files:** [paths]
- **Posture:** default / test-first / characterization-first
- **Verification:** [command and expected result]
- [ ] Step 1
- [ ] Step 2

### U2: [Unit Name]
- **Files:** [paths]
- **Posture:** default / test-first / characterization-first
- **Verification:** [command and expected result]
- [ ] Step 1
- [ ] Step 2

## Review Checklist
- [ ] Requirements covered
- [ ] Tests or checks run
- [ ] Docs updated if needed
- [ ] Deviations from spec documented

## PwF Execution Protocol

After this implementation plan exists, run each unit with the PwF execution protocol.

### Escalation Checklist

Use the **full execution loop** when this unit involves any of:
- [ ] Prior errors in this unit
- [ ] Cross-file or cross-module changes
- [ ] Security or trust boundary changes
- [ ] User explicitly asked for deep/rigorous execution

If none of the above apply, use the **compact loop**.

### Compact Loop

For each U-ID unit:
1. **Re-anchor** — re-read the current phase, this implementation plan section, linked spec, and recent progress.
2. **Execute surgically** — only change files listed for this unit; defer adjacent refactoring.
3. **Verify** — start with the narrowest check, then broader tests when shared behavior changed.
4. **Record** — update `progress.md`, update phase status in `task_plan.md`, log deviations if the plan changed.

### Full Loop

When escalation is triggered for a unit, use the full loop:
1. **Re-anchor**
2. **Select one unit** — narrow the current task to one phase or subtask
3. **Preflight** — confirm planned files, assumptions, risks, and verification commands are still valid
4. **Execute surgically**
5. **Verify** — run verification ladder: narrowest check → targeted tests → broader suite
6. **Record**
7. **Gate next step** — only proceed when verification passes or deviation/failure is explicitly logged and accepted

If the implementation deviates from the plan, stop and update this implementation plan or the linked spec before continuing.

## Checkpoint Review

After each U-ID unit completes, run a quick checkpoint against this plan:
- What was planned vs what was implemented?
- Any deviations or blockers?
- Any new risks that emerged?
- Did the unit's verification pass?

Record checkpoint findings in `progress.md` before proceeding to the next unit.

**Optional subagent boost**
```typescript
subagent({ agent: "reviewer", task: "Review the diff for this unit. Check for scope creep and untested paths.", async: true })
```

## Parallel Unit Execution

When two or more units are independent and can run concurrently, offload them to parallel `worker` subagents with `worktree: true` so each unit has an isolated git checkout. The main agent merges results after reviewing the output files.

**Example**
```typescript
subagent({
  tasks: [
    { agent: "worker", task: "Implement U3: email notification service" },
    { agent: "worker", task: "Implement U4: push notification service" }
  ],
  worktree: true,
  async: true
})
```

Requirements:
- The project must be inside a git repo with a clean working tree.
- Each task should use the shared cwd (no conflicting per-task `cwd`).
- After completion, review the per-worktree diff output and merge approved changes.

## Deviation Log

| U-ID | Planned | Actual | Reason | Plan/Spec Updated |
|---|---|---|---|---|

## Links
- Active plan: `task_plan.md`
- Findings: `findings.md`
- Progress: `progress.md`

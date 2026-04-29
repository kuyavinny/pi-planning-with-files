> Use the gate that matches the current moment in the task lifecycle.

# Review: [Task or Feature]

## Review Gate Used
<!-- Self-Check / Plan Sanity / Checkpoint / Final Review -->

## Scope Reviewed
[Files, docs, behavior, or implementation units reviewed]

---

## Self-Check
<!-- Use before the design gate, after brainstorming -->
- [ ] Assumptions are mapped and challenged
- [ ] Requirements are clear with acceptance criteria
- [ ] No placeholders or "TODO" left in the plan
- [ ] Success criteria are verifiable
- [ ] Scope is right-sized (not over-engineered)

**Optional subagent boost**
```typescript
subagent({ agent: "oracle", task: "Challenge the assumptions and requirements in the current brainstorm. What are we missing?", async: true })
```

## Plan Sanity
<!-- Use before execution, after the implementation plan exists -->
- [ ] Plan covers all spec requirements
- [ ] Each task is bite-sized (2–5 min steps for implementation plans)
- [ ] Verification commands are defined for each phase
- [ ] File map is complete (create/modify/test paths identified)
- [ ] Risks are documented with mitigations

**Optional subagent boost**
```typescript
subagent({ agent: "reviewer", task: "Review the implementation plan for gaps, missing edge cases, and unrealistic estimates.", async: true })
```

## Checkpoint Review
<!-- Use after each U-ID unit during execution -->
| U-ID | Planned | Actual | Deviation | Blockers | Risks Emerged |
|------|---------|--------|-----------|----------|---------------|
|      |         |        |           |          |               |

**Optional subagent boost**
```typescript
subagent({ agent: "reviewer", task: "Review the diff for this unit. Check for scope creep and untested paths.", async: true })
```

## Final Review
<!-- Use at task completion / handoff -->

### Verification Run
| Check | Command/Input | Expected | Actual | Status |
|-------|---------------|----------|--------|--------|
|       |               |          |        |        |

### Requirements Coverage
| Requirement | Covered? | Evidence |
|-------------|----------|----------|
|             |          |          |

### Issues Found
| Severity | Issue | Disposition |
|----------|-------|-------------|
|          |       |             |

### Remaining Risks
- [Risk]

### Decision
[Ready / needs changes / deferred with rationale]

**Optional subagent boost (parallel)**
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

For parallel reviews that also modify files, add `worktree: true` to isolate each agent in its own git worktree.

---

## Conditional Lenses Applied
<!-- Record which lenses were used and key findings -->

**Coherence Lens**
- [ ] No internal contradictions found
- [ ] Terminology is consistent throughout

**Buildability Lens**
- [ ] All dependencies resolved or documented
- [ ] No external blockers identified

**Scope Lens** (conditional: multiple priorities, new abstractions, unclear boundaries)
- [ ] Scope is right-sized
- [ ] No over-engineering or premature abstractions

**Risk Lens** (conditional: auth, data handling, external APIs, payments, migrations)
- [ ] Trust boundaries considered
- [ ] Rollback path documented if applicable

**Completeness Lens** (conditional: large plans >3 phases or >5 artifacts)
- [ ] No gaps between spec and implementation
- [ ] Edge cases addressed or documented

---

## Links
- Spec: [path]
- Implementation plan: [path]
- Active plan: `task_plan.md`
- Progress: `progress.md`

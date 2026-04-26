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
- This stays lightweight — no subagent dispatch, no JSON schemas, no automated tooling

## Decomposition
1. Map review gates to PwF workflow stages
2. Define conditional lenses (triggers and focus)
3. Design `review.md` as a unified gate-aware template
4. Update `SKILL.md` with protocol guidance
5. Update `implementation_plan.md` to reference checkpoint gates

## Review Gates

| Gate | When | Who | What |
|------|------|-----|------|
| Self-Check | After brainstorming / before design gate | Agent running the work | Are assumptions mapped? Are requirements clear? Any placeholders? |
| Plan Sanity | After implementation plan exists / before executing | Agent | Does plan cover spec? Task granularity OK? Verification commands defined? |
| Checkpoint | After each U-ID unit during execution | Agent | What was done vs planned? Deviations? Blockers? Risks emerging? |
| Final Review | After task complete / before handoff | Agent + (optionally) user | All requirements met? Tests pass? Docs updated? Remaining risks acknowledged? |

## Conditional Review Lenses
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
- No automated subagent dispatch
- No JSON findings schema
- No CE-style confidence thresholds or severity scoring
- No automated test running as part of review
- No changes to the Pi extension code

# Session Learnings: PwF Implementation Execution Protocol

## Date
2026-04-26

## What We Tried
Synthesize and apply a PwF-native implementation execution protocol for the phase after a durable implementation plan has been created.

## What Worked

- **Session log recovery**: `~/.pi/agent/sessions/` contained the earlier `setWidget` implementation when the code was lost. This proved session logs can recover uncommitted work.
- **Durable spec before design gate**: persisting the draft spec under `docs/specs/` before asking clarifying questions allowed the Q&A to be recorded against a real artifact.
- **One question at a time**: asking Q1 (loop level) and Q2 (escalation triggers) separately produced cleaner, more focused answers than a single compound question.
- **Compact vs full loop**: the risk-adaptive model (compact default, full on escalation) was simpler to explain and easier to adopt than a one-size-fits-all full loop.

## What Did Not Work

- **Marked U2 complete without clarifying dialogue**: the brainstorming protocol was treated as complete after section headings were filled, before any questions were asked. The design gate cannot happen before Q&A.
- **Section drafting ≠ action performed**: adding "Context Scan" as a heading with project-file names is not the same as actually reading those files. Each brainstorm section must record the action performed and its result.
- **Direct push to main for a feature**: even standard-depth features should go through a PR so the diff can be reviewed. Direct push skips review and risks regressions.

## Corrective Patterns

- Always include a **Clarifying Dialogue / Q&A gate** in brainstorming before the Design Gate.
- Each brainstorm section must include an **"Action performed"** record: what was actually done, what was found, and what impact it had on the spec.
- Features go through **PR**, not direct-to-main.
- When code is lost, check `~/.pi/agent/sessions/` before rewriting.

## Reusable Decisions

- Compact loop default, full loop on escalation triggers (errors, cross-file, security/trust, user-requested deep execution).
- Execution protocol belongs in skill guidance and templates, not runtime automation for the first pass.

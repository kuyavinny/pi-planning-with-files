# Manual Smoke Checklist

Use this checklist to verify the `pi-planning-with-files` package inside a live Pi session.
Each item should pass before declaring the package release-ready.

## Setup

- [ ] Install the package locally: `pi package add /path/to/pi-pwf`
- [ ] Run `/reload` in Pi
- [ ] Confirm no errors in Pi startup output

## Commands

- [ ] `/plan Test task` — creates `task_plan.md`, `findings.md`, `progress.md` if missing; model receives kickoff message
- [ ] `/pwf Another task` — same behavior as `/plan`
- [ ] `/plan-status` — displays parsed plan status without invoking the model
- [ ] `/plan-check` — displays completeness check result
- [ ] `/plan-catchup` — displays catchup report (or "No unsynced context" if no prior sessions)

## Extension Automation

- [ ] Before each agent turn with an active plan, bounded plan context appears in the conversation (check via `/debug` or model behavior)
- [ ] TUI footer shows `📋 1/3` (or similar) when a plan exists
- [ ] Mutating a source file during an active plan sets a progress reminder in the next context
- [ ] Editing `progress.md` clears the progress reminder
- [ ] After two `read`/`grep`/`glob` calls, a findings reminder appears in the next context
- [ ] Editing `findings.md` clears the findings reminder
- [ ] A failed tool call sets an error reminder in the next context
- [ ] Three repeated failures with the same tool+input produce escalation guidance
- [ ] Editing `task_plan.md` clears the error reminder
- [ ] When the agent stops with an incomplete plan, exactly one visible completion reminder appears
- [ ] Using "stop" or "pause" language in the user prompt suppresses the completion reminder
- [ ] No auto-continue behavior occurs at `agent_end`

## Session Catchup

- [ ] After closing and reopening Pi in the same project, `/plan-catchup` reports unsynced context from the previous session (if any)
- [ ] The catchup report labels historical content as untrusted
- [ ] The catchup report includes recommended next steps

## Deactivation

- [ ] Removing `task_plan.md` from the project root stops all automation
- [ ] Re-creating `task_plan.md` reactivates automation on the next agent turn

## Model-Callable Tools

- [ ] `planning_with_files_init` — creates planning files if missing; returns created/existing lists
- [ ] `planning_with_files_status` — returns current status and phase counts
- [ ] `planning_with_files_check_complete` — returns completeness result message

## Error Handling

- [ ] Malformed `task_plan.md` does not crash the extension; status reports a warning
- [ ] Missing planning files result in silent operation (no errors, no context injection)
- [ ] Invalid `/plan-catchup` session directory does not crash; returns "No unsynced context"

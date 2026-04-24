# Pi Planning-with-Files: Reverse-Engineering Findings

## Purpose

This document captures the reverse-engineering findings for adapting `planning-with-files/` to Pi Coding Agent with high fidelity. It is intentionally analysis-only. It does not prescribe implemented code yet.

## Executive Summary

`planning-with-files` is not only a skill. It is a durable workflow made from four layers:

1. **Skill instructions** teach the model the 3-file pattern.
2. **Templates and scripts** create and inspect persistent planning files.
3. **Lifecycle hooks** repeatedly re-inject plan context and progress reminders.
4. **Commands and status tools** make starting and checking plans easy.

The existing Pi integration in `planning-with-files/.pi/skills/planning-with-files/` is a skills-only port. It explicitly says hooks are not supported in Pi. That is no longer a strong enough approach because Pi has a native TypeScript extension system with lifecycle events, tool interception, session events, commands, custom tools, status UI, and package support.

For parity, the Pi adaptation should be a **Pi package containing both**:

- a Pi skill for progressive-disclosure workflow instructions;
- a Pi extension for hook-equivalent automation;
- optional prompt templates or extension commands for `/plan`, `/plan-status`, and related commands.

The correct target is not a shell-hook port. It should be Pi-native.

---

## 1. Core Skill Module

### Source Files

- `skills/planning-with-files/SKILL.md`
- `.pi/skills/planning-with-files/SKILL.md`
- `skills/planning-with-files/reference.md`
- `skills/planning-with-files/examples.md`

### What It Does

Defines the behavior contract:

- create `task_plan.md`, `findings.md`, and `progress.md`;
- use the filesystem as durable working memory;
- read the plan before major decisions;
- update files after phases;
- log all errors;
- follow the 2-action rule;
- follow the 3-strike error protocol;
- keep untrusted web/search/browser content out of `task_plan.md`.

### Pi Parity Target

Keep this as a Pi skill, but update it:

- Use `name: planning-with-files` unless there is a deliberate reason to keep `pi-planning-with-files`.
- Remove obsolete “hooks unsupported” language.
- Add Pi-specific notes:
  - the extension handles automation;
  - the skill governs model behavior;
  - planning files belong in `ctx.cwd` / project root, not the skill directory;
  - scripts are fallback assets, not the primary automation path.

### Critical Assessment

The current `.pi/skills/planning-with-files/SKILL.md` is insufficient for full parity:

- It relies on manual reminders.
- It says hooks are unsupported.
- Its session recovery instructions do not handle Pi session JSONL format.
- It lacks native Pi commands and extension automation.

---

## 2. Planning File Templates

### Source Files

- `skills/planning-with-files/templates/task_plan.md`
- `skills/planning-with-files/templates/findings.md`
- `skills/planning-with-files/templates/progress.md`
- `templates/analytics_task_plan.md`
- `templates/analytics_findings.md`

### What They Do

They define the durable planning state:

```text
task_plan.md  -> goal, current phase, phases, decisions, errors
findings.md   -> requirements, research, decisions, resources
progress.md   -> chronological work log, tests, errors, reboot check
```

### Pi Parity Target

Bundle these templates unchanged under the Pi package skill directory. The extension should create project-local planning files from these templates.

### Critical Assessment

There are two initialization paths upstream:

- rich template files;
- simplified shell heredocs in `init-session.sh`.

Pi should use the template files as source of truth. Using heredoc templates would reduce fidelity.

---

## 3. Helper Scripts Module

### Source Files

- `skills/planning-with-files/scripts/init-session.sh`
- `skills/planning-with-files/scripts/init-session.ps1`
- `skills/planning-with-files/scripts/check-complete.sh`
- `skills/planning-with-files/scripts/check-complete.ps1`
- `skills/planning-with-files/scripts/session-catchup.py`

### What They Do

- `init-session.*` creates planning files when missing.
- `check-complete.*` counts phase status.
- `session-catchup.py` scans prior sessions for unsynced context after the last planning-file update.

### Pi Parity Target

Implement native TypeScript equivalents in the Pi extension:

```text
files.ts
  ensurePlanningFiles()
  loadTemplate()
  resolveProjectRoot()

status.ts
  parsePhaseCounts()
  extractCurrentPhase()
  countErrorRows()
  checkComplete()

session-catchup.ts
  parsePiSessions()
  findLastPlanningUpdate()
  extractMessagesAfter()
```

Keep scripts only as fallback/manual assets.

### Critical Assessment

Shell and PowerShell scripts have caused repeated portability bugs upstream. For Pi, TypeScript extension logic is safer and more durable. Current `session-catchup.py` supports Claude/Codex patterns, not Pi’s session format.

---

## 4. Hook and Lifecycle Automation Module

### Source Files

- `.cursor/hooks.json`
- `.cursor/hooks/*.sh`
- `.codex/hooks.json`
- `.codex/hooks/*.py`
- `.gemini/settings.json`
- `.github/hooks/planning-with-files.json`
- `.hermes/plugins/planning-with-files/hooks.py`

### Upstream Hook Semantics

| Hook | Behavior |
|---|---|
| `SessionStart` | Run catchup and/or show active plan context |
| `UserPromptSubmit` | Inject active plan and recent progress on each user message |
| `PreToolUse` | Re-read first lines of `task_plan.md` before tool use |
| `PostToolUse` | Remind agent to update `progress.md` after file writes |
| `Stop` / `AgentStop` | Check completion and continue if incomplete |
| `ErrorOccurred` | Remind/log errors |

### Pi-Native Mapping

| Upstream Concept | Pi Event/API |
|---|---|
| `SessionStart` | `pi.on("session_start", ...)` |
| `UserPromptSubmit` | `pi.on("before_agent_start", ...)` |
| Gemini `BeforeModel` | `pi.on("context", ...)` |
| `PreToolUse` | `pi.on("tool_call", ...)` and/or `context` injection |
| `PostToolUse` | `pi.on("tool_result", ...)` |
| `Stop` | `pi.on("agent_end", ...)` |
| `ErrorOccurred` | `tool_result` where `event.isError === true` |
| Hook state | `pi.appendEntry(...)` and session reconstruction |
| Status display | `ctx.ui.setStatus(...)`, `ctx.ui.setWidget(...)` |

### Critical Assessment

Pi should not copy shell hooks. Pi’s extension events can provide cleaner, safer, structured behavior. The closest—and better—equivalent to upstream `PreToolUse` is bounded plan context injection before provider requests plus reminders after tool results.

---

## 5. Command Module

### Source Files

- `commands/plan.md`
- `commands/start.md`
- `commands/status.md`
- `.hermes/commands/plan.md`
- `.hermes/commands/plan-status.md`

### What It Does

Provides slash-command entry points:

- `/plan`
- `/plan:status`
- `/planning-with-files:start`

### Pi Parity Target

Use extension commands:

| Command | Behavior |
|---|---|
| `/plan [task]` | Initialize planning files if missing, inject skill context, ask agent to fill or continue the plan |
| `/plan-status` | Parse `task_plan.md` and show compact status without model inference |
| `/plan-check` | Run native completion check |
| `/plan-catchup` | Run Pi-native session catchup and display/inject bounded report |

### Critical Assessment

Prompt templates alone are weaker because they rely on the model to do everything. Extension commands are more reliable and can operate without a model call where appropriate.

---

## 6. Custom Tool Module

### Source Model

- `.hermes/plugins/planning-with-files/tools.py`

Hermes exposes:

```text
planning_with_files_init
planning_with_files_status
planning_with_files_check_complete
```

### Pi Parity Target

Register equivalent Pi tools:

- `planning_with_files_init`
- `planning_with_files_status`
- `planning_with_files_check_complete`

Commands are for humans. Tools are for the model. Shared internal functions should power both.

### Critical Assessment

Do not overbuild custom tools. Three tools are enough for parity. Avoid structured plan-editing tools unless a real need appears.

---

## 7. Session Recovery Module

### Source Files

- `skills/planning-with-files/scripts/session-catchup.py`
- `tests/test_session_catchup.py`
- `tests/test_clear_recovery.sh`

### Upstream Behavior

1. Find previous session.
2. Find the last write/edit to planning files.
3. Extract later unsynced conversation and tool activity.
4. Print a bounded catchup report.

### Pi Parity Target

Implement Pi-specific session catchup using Pi session JSONL format:

- sessions live under `~/.pi/agent/sessions/--<path>--/*.jsonl`;
- entries are typed and tree-structured;
- assistant messages contain `toolCall` blocks;
- tool results are separate messages.

Detect planning updates from `write` and `edit` tool calls whose path ends in:

- `task_plan.md`
- `findings.md`
- `progress.md`

Prefer Pi’s `SessionManager.list(ctx.cwd)` if available from extension code.

### Critical Assessment

This is the biggest gap. The current Pi skill says session recovery exists, but the bundled script does not parse Pi sessions. Full parity requires native Pi catchup.

---

## 8. Stop / Completion Enforcement Module

### Source Files

- `check-complete.sh`
- `.cursor/hooks/stop.sh`
- `.codex/hooks/stop.py`
- `.github/hooks/scripts/agent-stop.*`

### Upstream Behavior

If phases are incomplete, tell or force the agent to continue. Some integrations block once, then allow re-entry to avoid infinite loops.

### Pi Parity Target

Use `agent_end`:

1. If no active `task_plan.md`, do nothing.
2. Parse phase counts.
3. If incomplete, inject a displayed message or follow-up instruction.
4. Use a loop limiter.
5. Respect explicit user override language such as “stop anyway”, “pause”, or “done for now”.

### Critical Assessment

Exact stop-hook parity can become hostile. Pi should implement bounded continuation and clear user override behavior.

---

## 9. Recitation / Context Injection Module

### Upstream Behavior

Common hook output:

```text
[planning-with-files] ACTIVE PLAN — current state:
<head -50 task_plan.md>

=== recent progress ===
<tail -20 progress.md>

Read findings.md for research context.
```

### Pi Parity Target

Use `context` and `before_agent_start` to inject bounded active-plan context:

- goal;
- current phase;
- phase status counts;
- current in-progress phase block;
- recent progress tail;
- reminder to read `findings.md` before research/technical decisions.

### Critical Assessment

Do not auto-inject full `findings.md`. It may contain untrusted external content. Also avoid repeatedly injecting large raw `task_plan.md`; parse and bound it.

---

## 10. 2-Action Rule Module

### Source Behavior

After every 2 view/browser/search operations, save key findings to `findings.md`.

### Pi Parity Target

Track read/search-like tool calls:

- `read`
- `grep`
- `find`
- `web_search`
- `fetch_content`
- `code_search`
- other browser/search tools if installed

After 2 such operations while a plan is active:

- queue a reminder to update `findings.md`;
- reset the counter after `findings.md` is edited/written.

### Critical Assessment

This should be a reminder, not a hard block. Blocking read/search tools would harm workflow reliability.

---

## 11. Error Logging Module

### Source Behavior

- log all errors in `task_plan.md` and `progress.md`;
- never repeat failed actions;
- after 3 failures, escalate to the user.

### Pi Parity Target

Use `tool_result` where `event.isError` is true:

- capture tool name;
- summarize input;
- capture error output;
- queue reminder to log it;
- track repeated identical failures.

### Critical Assessment

Automatic plan-file editing on every error is risky. Start with reminders and escalation, not autonomous edits.

---

## 12. Status UI Module

### Pi-Native Enhancement

Use Pi TUI APIs:

- `ctx.ui.setStatus("planning-with-files", "📋 2/5")`
- `ctx.ui.setWidget("planning-with-files", [...phase lines])`

### Value

This is not present in most upstream integrations, but it is native to Pi and improves durability. Keep it lightweight and non-invasive.

---

## 13. Packaging Module

### Current Pi Package

`.pi/skills/planning-with-files/package.json` currently declares only:

```json
{
  "pi": {
    "skills": ["SKILL.md"]
  }
}
```

### Pi Parity Target

Use a package structure like:

```text
pi-planning-with-files/
├── package.json
├── extensions/
│   └── planning-with-files/
│       ├── index.ts
│       ├── files.ts
│       ├── status.ts
│       ├── context.ts
│       ├── session-catchup.ts
│       ├── commands.ts
│       ├── tools.ts
│       └── security.ts
├── skills/
│   └── planning-with-files/
│       ├── SKILL.md
│       ├── examples.md
│       ├── reference.md
│       ├── templates/
│       └── scripts/
└── prompts/
```

### Critical Assessment

For Pi, the extension should be the product’s reliability layer. The skill is necessary but not sufficient.

---

## High-Risk Areas

1. **Stop parity** can become annoying or looping if too aggressive.
2. **Session recovery** must be rewritten for Pi session JSONL.
3. **PreToolUse parity** should be interpreted through Pi `context` and `tool_*` events.
4. **Prompt injection amplification** is real because `task_plan.md` is repeatedly trusted.
5. **Parallel tool calls** require care if custom tools mutate files.
6. **Command collisions** may happen with `/plan`; consider aliases or fallback names.

---

## Recommended Strategy

Do not port Claude shell hooks directly. Build a Pi-native package:

1. Keep canonical skill instructions and templates.
2. Add native Pi extension events for hook parity.
3. Add native commands and tools.
4. Rewrite session recovery for Pi.
5. Use Pi UI for status and reminders.
6. Keep shell scripts only as fallback assets.

---

## Acceptance Criteria

A Pi adaptation reaches parity when:

1. `/plan "task"` creates or reuses all three planning files.
2. Each user prompt with an active plan receives bounded plan context.
3. Long tasks refresh plan context before continued model calls.
4. After `write`/`edit`, the agent is reminded to update `progress.md`.
5. After 2 read/search/browser-like operations, the agent is reminded to update `findings.md`.
6. Tool errors trigger logging reminders and repeated-failure escalation.
7. Incomplete phases trigger bounded continuation or a clear reminder.
8. `/plan-status` works without model inference.
9. Session recovery works with Pi JSONL sessions.
10. The package installs through Pi’s package mechanism and survives `/reload`.

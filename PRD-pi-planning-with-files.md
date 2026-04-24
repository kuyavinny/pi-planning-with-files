# PRD: Pi Planning-with-Files

## 1. Summary

Pi Planning-with-Files will bring the `planning-with-files` workflow to Pi Coding Agent with full native support. It will use Pi skills for instructions and Pi extensions for reliable automation, so complex tasks keep durable planning state in `task_plan.md`, `findings.md`, and `progress.md`.

The goal is parity with the best-supported agents in the upstream repo, while using Pi-native commands, lifecycle events, tools, session parsing, and TUI status features.

---

## 2. Contacts

| Name | Role | Comment |
|---|---|---|
| User / Product Owner | Stakeholder | Requested full-fidelity Pi adaptation of `planning-with-files`. |
| Pi Coding Agent maintainer/user | Technical stakeholder | Needs Pi-native package behavior that survives reloads and sessions. |
| Implementing coding agent | Engineering owner | Will design and implement after this PRD is accepted. |
| Future users of Pi Planning-with-Files | End users | Need reliable planning, recovery, and progress tracking in long coding sessions. |

---

## 3. Background

### Context

The upstream `planning-with-files` project helps AI coding agents work on complex tasks by writing important task state to markdown files. It follows a “filesystem as memory” model:

```text
Context window = RAM
Filesystem = disk
Important state belongs on disk
```

For every complex task, the workflow creates three files:

- `task_plan.md` for goals, phases, status, decisions, and errors;
- `findings.md` for research and discoveries;
- `progress.md` for session logs, files touched, tests, and error history.

The upstream repo supports many coding assistants. Strong integrations use hooks to automatically re-read plan context, remind the model to update files, and verify completion.

### Why Now

The existing Pi support is a skills-only adaptation. It says hooks are not supported in Pi, so users must manually ask Pi to re-read the plan and update progress. That misses the most important part of the workflow: reliable automation.

Pi now has native extension capabilities that map well to the upstream hook model:

- lifecycle events;
- tool call and tool result events;
- context injection;
- commands;
- custom tools;
- session state;
- TUI status and widgets;
- package manifests.

This makes full parity possible without copying shell hooks.

### What Changed

Pi’s extension API is strong enough to implement hook-like behavior directly in TypeScript. That is more reliable than shell scripts and better aligned with Pi’s architecture.

---

## 4. Objective

### Objective

Create a Pi-native package that gives Pi Coding Agent the same durable planning workflow as the best-supported `planning-with-files` integrations.

### Why It Matters

For users, long coding tasks often fail because the agent loses track of:

- the original goal;
- the current phase;
- what it already tried;
- what errors happened;
- what research it found;
- what still remains.

This product reduces goal drift and makes long tasks easier to resume, review, and verify.

### Benefits

For customers/users:

- Better continuity across long sessions.
- Easier recovery after context compaction or `/clear`-like resets.
- Less repeated mistakes because errors are logged.
- More transparent progress.
- Better handoff between human and agent.

For Pi:

- Shows off Pi’s extension system.
- Provides a durable, high-value workflow package.
- Improves reliability for complex coding tasks.

### Key Results

| Key Result | Target |
|---|---|
| Planning initialization works | `/plan` creates or reuses all three planning files in the project root. |
| Plan context is refreshed | Active plan context is injected on user prompts and provider turns while bounded in size. |
| Progress reminders work | After file mutations, the agent is reminded to update `progress.md` and phase status. |
| Findings reminders work | After two read/search/browser-like operations, the agent is reminded to update `findings.md`. |
| Completion checks work | Incomplete plans trigger a bounded continuation reminder; complete plans allow normal finish. |
| Pi session catchup works | Prior Pi JSONL sessions can be scanned for unsynced context after the last planning-file update. |
| Status works without model inference | `/plan-status` returns a compact parsed status. |
| Package reliability | The package loads through Pi package discovery and survives `/reload`. |

---

## 5. Market Segment(s)

### Primary Segment

People using Pi Coding Agent for complex coding work that spans many steps or many tool calls.

Their job is:

> “Help me finish a non-trivial coding or research task without losing the thread.”

### Key User Problems

- The agent forgets earlier requirements during long sessions.
- The agent repeats failed actions.
- Context compaction or session changes lose important details.
- Progress is unclear.
- The user cannot easily answer, “Where are we?”
- Existing planning lives in chat, not durable project files.

### Constraints

- Must use Pi-native APIs.
- Must not require Claude/Codex/Gemini hook systems.
- Must not implement broad unrelated planning systems.
- Must not make the workflow annoying for short tasks.
- Must treat external content as untrusted.
- Must avoid infinite stop/continue loops.

---

## 6. Value Proposition(s)

### Main Value Proposition

Pi Planning-with-Files gives Pi users a reliable working memory on disk for complex tasks, with automatic context refresh and progress checks.

### Customer Jobs Addressed

| Job | Product Response |
|---|---|
| Start a complex task safely | `/plan` creates planning files and starts from a clear goal. |
| Keep goals visible | The extension injects bounded plan context during the session. |
| Save research | The extension reminds the model to update `findings.md`. |
| Track what changed | The extension reminds the model to update `progress.md`. |
| Avoid repeated errors | Tool errors trigger reminders and repeated-failure tracking. |
| Resume after lost context | Pi-native session catchup finds unsynced context. |
| Know status quickly | `/plan-status` summarizes phase progress without model guessing. |

### Pains Avoided

- Losing progress after context reset.
- Restarting from scratch after long work.
- Repeating the same failing command.
- Confusing chat history with durable state.
- Manual plan reminders.
- Shell hook portability problems.

### Differentiation

This will be stronger than the current upstream Pi skill because it will use:

- native Pi extension events;
- native Pi session parsing;
- native Pi commands;
- native Pi custom tools;
- native Pi TUI status.

It should also be safer than some upstream hook implementations because context injection can be bounded and structured.

---

## 7. Product Discovery and Prioritized Ideas

This section applies the discovery guidance from the PM brainstorming skill. The product is a new Pi-native planning workflow package.

### 7.1 Product Manager Ideas

1. **One-command start:** `/plan [task]` creates files and starts the workflow.
2. **No-model status:** `/plan-status` gives reliable progress without asking the model to infer it.
3. **Installable Pi package:** A package that bundles skill, extension, templates, and commands.
4. **Safe defaults:** The workflow activates only for complex tasks or explicit commands.
5. **Parity mode:** Document which upstream behaviors are supported and which are intentionally adapted.

### 7.2 Product Designer Ideas

1. **Footer status:** Show active plan progress like `📋 2/5`.
2. **Plan widget:** Show current phase and incomplete phases above/below editor.
3. **Clear reminders:** Use concise reminders that do not overwhelm the chat.
4. **Interactive setup:** `/plan` can ask for missing task details if no task is supplied.
5. **Stop override clarity:** Make it clear how users can pause or stop despite incomplete phases.

### 7.3 Software Engineer Ideas

1. **Native extension hooks:** Implement hook parity with Pi events instead of shell scripts.
2. **Pi session catchup parser:** Parse Pi JSONL sessions for planning-file update points.
3. **Shared parsing library:** One status parser powers commands, tools, UI, and completion checks.
4. **Custom tools:** Expose `planning_with_files_init`, `planning_with_files_status`, and `planning_with_files_check_complete`.
5. **Persistent extension state:** Use `pi.appendEntry()` to track counters, reminders, and loop limits.

### 7.4 Top 5 Prioritized Ideas

| Priority | Idea | Reason | Assumptions to Test |
|---|---|---|---|
| 1 | Native extension hook parity | This is the core reliability layer missing from current Pi support. | Pi events can provide all needed lifecycle points without brittle workarounds. |
| 2 | `/plan` and `/plan-status` commands | These make the workflow easy to start and inspect. | Users prefer simple slash commands over manual skill instructions. |
| 3 | Pi-native session catchup | Recovery is a key upstream promise and current Pi support does not truly cover it. | Pi session JSONL contains enough information to identify unsynced planning context. |
| 4 | Bounded context injection | Keeps goals fresh while reducing prompt injection and context bloat risk. | Parsed summaries are enough; full raw file injection is not needed every turn. |
| 5 | TUI status and reminders | Pi can show workflow state more clearly than shell-hook messages. | Users find compact status helpful and not distracting. |

---

## 8. Solution

### 8.1 UX / User Flows

#### Flow A: Start a New Plan

1. User runs:

   ```text
   /plan Add dark mode to settings page
   ```

2. Pi creates missing files:

   ```text
   task_plan.md
   findings.md
   progress.md
   ```

3. Pi injects planning instructions and asks the model to fill the plan.
4. Footer shows active plan status.
5. Agent begins Phase 1.

#### Flow B: Continue an Existing Plan

1. User sends a normal prompt.
2. Extension detects `task_plan.md`.
3. Extension injects bounded active-plan context:
   - goal;
   - current phase;
   - phase status summary;
   - recent progress.
4. Agent continues from current phase.

#### Flow C: After File Mutation

1. Agent calls `write` or `edit`.
2. Extension detects file mutation.
3. Next model context includes reminder:

   ```text
   Update progress.md with what you just did. If a phase is complete, update task_plan.md status.
   ```

#### Flow D: After Research or Read Operations

1. Agent performs two read/search/browser-like operations.
2. Extension reminds it to update `findings.md`.
3. Counter resets after `findings.md` is edited/written.

#### Flow E: End With Incomplete Phases

1. Agent reaches `agent_end`.
2. Extension checks phase completion.
3. If incomplete, extension gives a bounded continuation reminder or follow-up.
4. User can override with phrases like “pause”, “stop anyway”, or “done for now”.

#### Flow F: Check Status

1. User runs:

   ```text
   /plan-status
   ```

2. Extension parses files and displays:

   ```text
   📋 Planning Status
   Current: Phase 2 of 5
   Complete: 1/5
   Files: task_plan.md ✓ | findings.md ✓ | progress.md ✓
   Errors logged: 0
   ```

### 8.2 Key Features

#### Feature 1: Pi Skill Bundle

The package includes a `planning-with-files` skill with:

- canonical instructions;
- examples;
- reference documentation;
- templates;
- fallback scripts.

#### Feature 2: Native Pi Extension

The extension implements hook-equivalent behavior through Pi events:

- `session_start`
- `before_agent_start`
- `context`
- `tool_call`
- `tool_result`
- `agent_end`
- `session_shutdown`

#### Feature 3: Planning Commands

Commands:

- `/plan [task]`
- `/plan-status`
- `/plan-check`
- `/plan-catchup`

#### Feature 4: Model-Callable Tools

Tools:

- `planning_with_files_init`
- `planning_with_files_status`
- `planning_with_files_check_complete`

#### Feature 5: Bounded Plan Context Injection

The extension injects a concise plan context rather than dumping full files every time.

It should include:

- goal;
- current phase;
- phase counts;
- current phase details;
- recent progress tail;
- safety reminders.

#### Feature 6: Progress and Findings Reminders

The extension tracks tool activity and queues reminders:

- update `progress.md` after file mutations;
- update `findings.md` after two read/search/browser-like operations.

#### Feature 7: Error Logging Reminders

The extension detects failed tool results and reminds the agent to log errors and avoid repeated failures.

#### Feature 8: Completion Check

The extension parses `task_plan.md` and checks whether all phases are complete.

It should be bounded and user-respectful.

#### Feature 9: Pi Session Catchup

The extension scans prior Pi sessions for unsynced context after the last planning file update.

This must understand Pi session JSONL and branching as well as practical constraints allow.

#### Feature 10: TUI Status

When UI is available, show lightweight status:

- footer status;
- optional widget with current phase / progress.

### 8.3 Technology

Recommended package layout:

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
│       ├── state.ts
│       ├── ui.ts
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

Recommended manifest direction:

```json
{
  "keywords": ["pi-package", "planning", "manus", "agent"],
  "pi": {
    "extensions": ["extensions/planning-with-files/index.ts"],
    "skills": ["skills/planning-with-files"],
    "prompts": ["prompts"]
  }
}
```

### 8.4 Assumptions

| Assumption | Risk | Validation |
|---|---|---|
| Pi extension events can cover all important hook moments. | Some upstream behavior may not map exactly. | Build event-level tests and manual session tests. |
| Bounded parsed context is enough to keep the model oriented. | The model may need more raw detail. | Compare behavior with raw `head -50` injection. |
| Users want `/plan` as command name. | Command collision with other extensions. | Consider aliases or namespaced fallback. |
| Session catchup can be reliable with Pi JSONL. | Branching and compaction may complicate parsing. | Start with active-branch/recent-session recovery. |
| Reminders improve behavior without annoying users. | Too many reminders may reduce UX quality. | Keep reminders deduplicated and bounded. |

### 8.5 Non-Goals

This PRD does not include:

- implementing the package yet;
- building a general project-management system;
- replacing Pi’s existing session compaction;
- forcing the workflow on simple one-step tasks;
- auto-writing external web content into `task_plan.md`;
- copying Claude/Codex shell hook files into Pi as the primary mechanism.

---

## 9. Release

### Version 0: Design and Review

Scope:

- Reverse-engineering findings.
- PRD.
- Architecture decision.
- Acceptance criteria.

Status: this document.

### Version 1: Minimum Useful Pi Parity

Scope:

- Pi skill bundle.
- Native extension package.
- `/plan` and `/plan-status`.
- Native planning file initialization.
- Bounded plan context injection.
- Progress reminder after `write`/`edit`.
- Completion check at `agent_end`.

Out of scope for v1:

- full session catchup;
- advanced TUI widgets;
- repeated-failure analytics.

### Version 2: Recovery and Reliability

Scope:

- Pi-native session catchup.
- 2-action rule tracking.
- error logging reminders.
- loop limits and override detection.
- package-level tests.

### Version 3: Polished Pi Experience

Scope:

- footer status and optional widget.
- command aliases if needed.
- analytics template support.
- richer status parsing.
- documentation and migration guide.

---

## 10. Open Questions

1. Should the primary command be `/plan`, `/pwf`, or both?
2. Should active plan detection be automatic whenever `task_plan.md` exists, or only after `/plan` activation?
3. How aggressive should `agent_end` continuation be?
4. Should the extension ever edit planning files automatically, or only remind the agent?
5. How should session catchup handle Pi branches and compaction summaries?
6. Should planning files always live in project root, or should users be allowed to configure a subdirectory?

---

## 11. Acceptance Criteria

The product is ready when:

- [ ] Installing the package loads both skill and extension.
- [ ] `/plan [task]` creates missing planning files in the current project.
- [ ] `/plan-status` works without invoking the model.
- [ ] Existing planning files are never overwritten without explicit consent.
- [ ] Active plan context is injected in a bounded way.
- [ ] File mutations trigger progress reminders.
- [ ] Two read/search/browser-like operations trigger findings reminders.
- [ ] Tool errors trigger logging reminders.
- [ ] Incomplete plans trigger bounded completion checks.
- [ ] Users can pause/stop without fighting the extension.
- [ ] Pi session catchup can detect unsynced context after the last planning-file update.
- [ ] The package survives `/reload`.
- [ ] The behavior is documented clearly.

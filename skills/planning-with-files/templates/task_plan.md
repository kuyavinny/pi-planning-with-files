# Task Plan: [Brief Description]
<!-- 
  WHAT: This is your roadmap for the entire task. Think of it as your "working memory on disk."
  WHY: After 50+ tool calls, your original goals can get forgotten. This file keeps them fresh.
  WHEN: Create this FIRST, before starting any work. Update after each phase completes.
-->

## Goal
<!-- 
  WHAT: One clear sentence describing what you're trying to achieve.
  WHY: This is your north star. Re-reading this keeps you focused on the end state.
  EXAMPLE: "Create a Python CLI todo app with add, list, and delete functionality."
-->
[One sentence describing the end state]

## Depth
<!-- 
  WHAT: How rigorous this plan should be.
  VALUES: lightweight (quick fixes, trivial tasks) | standard (features, implementations) | deep (architecture, cross-cutting changes)
  WHY: Depth gates how much planning overhead to apply. Lightweight tasks skip assumption scanning and pre-mortem.
-->
standard

## Assumptions
<!-- 
  WHAT: Assumptions that could invalidate this plan if wrong.
  WHY: Surfacing assumptions before implementation prevents building on false premises.
  WHEN: Fill in for standard and deep plans. Skip for lightweight tasks.
  CATEGORIES for coding tasks:
    - Value: Does the user actually need this? Will it solve the stated problem?
    - Usability: Will users be able to use this? Is the UX clear?
    - Viability: Is this feasible given constraints (time, budget, dependencies)?
    - Feasibility: Can we technically build this? Are the required APIs/libs available?
  RISK LEVELS:
    - High Impact, High Risk → Test first (put validation phases before implementation)
    - High Impact, Low Risk → Proceed with confidence
    - Low Impact, High Risk → Reject or defer
    - Low Impact, Low Risk → Ignore
-->
| Assumption | Category | Impact | Risk | Action |
|------------|----------|--------|------|--------|
|            |          |        |      |        |

## Current Phase
<!-- 
  WHAT: Which phase you're currently working on (e.g., "Phase 1", "Phase 3").
  WHY: Quick reference for where you are in the task. Update this as you progress.
-->
Phase 1

## Phases
<!-- 
  WHAT: Break your task into 3-7 logical phases. Each phase should be completable.
  WHY: Breaking work into phases prevents overwhelm and makes progress visible.
  WHEN: Update status after completing each phase: pending → in_progress → complete
  FORMAT: Use U-ID headings (U1, U2, ...) for stable IDs that survive reordering.
         Legacy "Phase N" format is also supported for backward compatibility.
         For standard/deep plans, each phase should include:
           - Goal: What this phase validates or delivers
           - Dependencies: None or reference to U-ID
           - Test scenarios: How to verify this phase
-->

### U1: Requirements & Discovery
<!-- 
  WHAT: Understand what needs to be done and gather initial information.
  WHY: Starting without understanding leads to wasted effort. This phase prevents that.
-->
- [ ] Understand user intent
- [ ] Identify constraints and requirements
- [ ] Document findings in findings.md
- **Status:** in_progress
<!-- 
  STATUS VALUES:
  - pending: Not started yet
  - in_progress: Currently working on this
  - complete: Finished this phase
-->

### U2: Planning & Structure
<!-- 
  WHAT: Decide how you'll approach the problem and what structure you'll use.
  WHY: Good planning prevents rework. Document decisions so you remember why you chose them.
-->
- [ ] Define technical approach
- [ ] Create project structure if needed
- [ ] Document decisions with rationale
- **Status:** pending

### U3: Implementation
<!-- 
  WHAT: Actually build/create/write the solution.
  WHY: This is where the work happens. Break into smaller sub-tasks if needed.
-->
- [ ] Execute the plan step by step
- [ ] Write code to files before executing
- [ ] Test incrementally
- **Status:** pending

### U4: Testing & Verification
<!-- 
  WHAT: Verify everything works and meets requirements.
  WHY: Catching issues early saves time. Document test results in progress.md.
-->
- [ ] Verify all requirements met
- [ ] Document test results in progress.md
- [ ] Fix any issues found
- **Status:** pending

### U5: Delivery
<!-- 
  WHAT: Final review and handoff to user.
  WHY: Ensures nothing is forgotten and deliverables are complete.
-->
- [ ] Review all output files
- [ ] Ensure deliverables are complete
- [ ] Deliver to user
- **Status:** pending

## Risks
<!-- 
  WHAT: Proactive risk identification before errors happen.
  WHY: Pre-mortems catch problems early. Tiger risks need action, Paper Tigers are overblown, Elephants need investigation.
  WHEN: Fill in for standard and deep plans. Skip for lightweight tasks.
  RISK TYPES:
    - Tiger: Real problem that needs action now
    - Paper Tiger: Overblown concern — monitor but don't act yet
    - Elephant: Unspoken risk that needs investigation
  URGENCY LEVELS:
    - launch-blocking: Must resolve before shipping
    - fast-follow: Resolve soon after shipping
    - track: Monitor, no action needed now
-->
| Risk | Type (Tiger/Paper Tiger/Elephant) | Urgency | Mitigation |
|------|-------------------------------------|---------|------------|
|      |                                     |         |            |

## Key Questions
<!-- 
  WHAT: Important questions you need to answer during the task.
  WHY: These guide your research and decision-making. Answer them as you go.
  EXAMPLE: 
    1. Should tasks persist between sessions? (Yes - need file storage)
    2. What format for storing tasks? (JSON file)
-->
1. [Question to answer]
2. [Question to answer]

## Decisions Made
<!-- 
  WHAT: Technical and design decisions you've made, with the reasoning behind them.
  WHY: You'll forget why you made choices. This table helps you remember and justify decisions.
  WHEN: Update whenever you make a significant choice (technology, approach, structure).
  EXAMPLE:
    | Use JSON for storage | Simple, human-readable, built-in Python support |
-->
| Decision | Rationale |
|----------|-----------|
|          |           |

## Errors Encountered
<!-- 
  WHAT: Every error you encounter, what attempt number it was, and how you resolved it.
  WHY: Logging errors prevents repeating the same mistakes. This is critical for learning.
  WHEN: Add immediately when an error occurs, even if you fix it quickly.
  EXAMPLE:
    | FileNotFoundError | 1 | Check if file exists, create empty list if not |
    | JSONDecodeError | 2 | Handle empty file case explicitly |
-->
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
<!-- 
  REMINDERS:
  - Update phase status as you progress: pending → in_progress → complete
  - Re-read this plan before major decisions (attention manipulation)
  - Log ALL errors - they help avoid repetition
  - Never repeat a failed action - mutate your approach instead
-->
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors - they help avoid repetition

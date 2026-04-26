# PwF Review Protocol Learnings

## What Worked

1. **Clean-room synthesis from evidence** — Recording actual research findings in `findings.md` (files read, patterns found, impact) before design prevented speculative feature creep.
2. **The clarifying question gate** — Asking whether scope was "lightweight enrich" vs "lifecycle protocol" before design saved from building the wrong thing. User chose "Both" which still needed design to reconcile.
3. **Mapping external patterns to PwF natively** — CE's personas became "review lenses" with triggers. Superpowers' self-review became gate-specific checklists. PM Skills' checklist became backward-compatible Final Review tables. No code/commands/prose was copied.
4. **Gate-oriented design** — Review happening at four moments (Self-Check, Plan Sanity, Checkpoint, Final Review) maps naturally to PwF's existing workflow stages. The agent already knows where they are in the lifecycle.
5. **Conditional lenses as optional depth** — Making lenses optional with clear triggers keeps lightweight tasks fast while offering deeper review when needed.

## What Could Be Better

1. **Review.md is information-dense** — The unified template has many sections; lightweight tasks will only use one gate. A future improvement could be a compact single-gate variant.
2. **No automated enforcement** — The review protocol is advisory, not enforced by the extension. The extension's execution protocol already has checkpoints; this is a template/protocol layer addition.
3. **Lens triggers are heuristic** — "Large plans (>3 phases, >5 artifacts)" is fuzzy. In practice the agent decides which lenses to apply; future work could add concrete signals.

## Decisions Made

| Decision | Tradeoff |
|---|---|
| Unified review.md over multiple templates | Simpler maintenance; one file handles all gates. Cost: more initial content in the file. |
| No severity scoring / JSON schema | Keeps PwF lightweight and markdown-native. Cost: less precise tracking than CE's structured pipeline. |
| Advisory lenses, not personas | No subagent dispatch means no extra tool calls. Cost: agent must self-apply lenses. |
| Checkpoint Review in progress.md style | Uses the existing execution protocol's "Record" step rather than adding a new file. Cost: progress.md gets longer. |

## Clean-Room Boundary

No code, commands, prose, templates, or structural patterns were copied from Compound Engineering, Superpowers, or PM Skills. The synthesis used the following inspiration only:
- **CE**: the *idea* of multiple reviewer perspectives with conditional activation
- **Superpowers**: the *idea* of a self-review checklist before proceeding
- **PM Skills**: the *idea* of a checklist-based final review

All artifact design, terminology ("gates", "lenses"), trigger heuristics, and template structure are PwF-native.

---
phase: {phase}
plan: {plan_name}
wave: {current_wave}
total_waves: {total_waves}
tasks_done: {tasks_done}
tasks_total: {tasks_total}
started: {started_at}
last_updated: {last_updated_at}
---

# Execution State — {feature_name}

## Progress

[{progress_bar}] {percentage}% ({tasks_done}/{tasks_total} tasks)

## Current Wave — Wave {current_wave}/{total_waves}

Tasks this wave:

- [ ] {task_1_name}  <- CURRENT
- [ ] {task_2_name}
- [ ] {task_3_name}

## Decisions Made

- {decision_1} ({reason_1})
- {decision_2} ({reason_2})

## Blockers

{blockers_or_none}

## Next Session

**Done:** {what_is_done}

**Next:** {what_to_do_next}

**Key state:** {relevant_context_for_resumption}

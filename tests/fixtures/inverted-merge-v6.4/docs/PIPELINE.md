# Pipeline

The anti-vibe-coding plugin enforces XP discipline for AI-assisted development.

## Flow

```
/grill-me → /write-prd → /plan-feature → /execute-plan → /verify-work → iterate
```

### Phase 1: Grill Me

Before writing code, the AI interviews the developer to surface hidden constraints,
define acceptance criteria, and identify risks. Output: a structured spec.

### Phase 2: Write PRD

Converts the interview output into a formal Product Requirements Document with
CAs (Acceptance Criteria), non-goals, and technical constraints.

### Phase 3: Plan Feature

Breaks the PRD into execution plans with vertical slices, wave-based subagent
execution, and clear exit criteria per phase.

### Phase 4: Execute Plan

Wave-based execution with subagents. Each wave is independent; gates between waves
prevent partial states from propagating.

### Phase 5: Verify Work

Post-implementation audit comparing actual output against PRD CAs. Catches drift,
missing coverage, and quality regressions.

# Architecture

## Plugin Structure

This plugin enforces XP discipline for AI-assisted development.

### Core Skills
- `grill-me`: Pre-implementation interview
- `write-prd`: PRD generation
- `plan-feature`: Execution plan generation
- `execute-plan`: Hierarchical plan execution
- `verify-work`: Post-execution verification

### Pipeline Flow

```
grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate
```

## Module Boundaries

Skills are self-contained. They import from `skills/*/lib/` but not from each other.

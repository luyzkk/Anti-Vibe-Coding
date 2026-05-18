# Pipeline — Anti-Vibe Coding Plugin v6

The plugin provides a linear pipeline connecting skills in sequence. Each skill works standalone;
the pipeline is a shortcut, not a requirement.

## Skill Pipeline

```
grill-me -> write-prd -> plan-feature -> execute-plan -> verify-work -> iterate
```

- **grill-me** — ruthless pre-implementation interview; surfaces assumptions and edge cases
- **write-prd** — interactive feature specification; output: PRD.md in a dated folder
- **plan-feature** — hierarchical plan with semantic complexity analysis
- **execute-plan** — plan execution with memory and interactive transitions
- **verify-work** — post-execution audit (harness:validate, compound:check, tests, lint)
- **iterate** — post-deploy cycle: incident response + defensive hardening

Post-deploy cycle (v5.2+): `verify-work -> iterate` — regression fixes and hardening in production.

## Artifact Structure (v6)

Each PRD lives in its own dated folder. Plans are generated on demand.

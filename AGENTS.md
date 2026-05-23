# Anti-Vibe Coding Plugin — Agent Index

This plugin enforces XP discipline for AI-assisted development. Human navigates, agent pilots.

## Pipeline de Trabalho

Novo ao repo? Comece aqui. Cada fase do trabalho tem uma skill canonica — invoque na ordem.

| Fase do trabalho | Skill a invocar | O que entrega |
|------------------|------------------|---------------|
| **Define** | `/anti-vibe-coding:write-prd`, `/anti-vibe-coding:grill-me` | PRD aprovado, ambiguidade zero |
| **Plan** | `/anti-vibe-coding:plan-feature`, `/anti-vibe-coding:quick-plan` | Plano executavel hierarquico (PLAN.md + fases) |
| **Build** | `/anti-vibe-coding:tdd-workflow`, `/anti-vibe-coding:execute-plan` | Implementacao fase-a-fase em ciclo RED/GREEN |
| **Verify** | `/anti-vibe-coding:verify-work`, `/anti-vibe-coding:security` | Testes verdes + auditoria multi-agente |
| **Review** | `/anti-vibe-coding:verify-work` (canonico), `/anti-vibe-review (DEPRECADO → use /verify-work)` | Quality score + checklist de release |
| **Ship** | `/anti-vibe-coding:lessons-learned`, `/anti-vibe-coding:iterate` | Compound capturado + ciclo pos-deploy aberto |

Fluxo canonico:

```
Define ---> Plan ---> Build ---> Verify ---> Review ---> Ship
                                                            |
                                                            v
                                                      (loop iterativo)
```

Skills auxiliares (chamaveis de qualquer fase): `/anti-vibe-coding:consultant`,
`/anti-vibe-coding:decision-registry`, `/anti-vibe-coding:design-twice`,
`/anti-vibe-coding:code-simplification`, `/anti-vibe-coding:learn`.

---

## Core Beliefs

Plan before code. Test before implement. Capture lessons after merge. Discipline beats speed.

## When to Read What

| Situation | Read |
|---|---|
| Understanding the plugin pipeline (grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate) | `docs/PIPELINE.md` |
| Configuring model profiles per agent (quality/balanced/budget) | `docs/MODEL_PROFILES.md` |
| Listing available subagent auditors | `docs/AGENTS_LIST.md` |
| Versioning, manifest checksums, update strategies | `docs/UPGRADE.md` |
| Senior principles (security, quality, architecture defaults) | `docs/design-docs/core-beliefs.md` |
| Past architectural decisions with rationale | `docs/design-docs/ADR-*.md` |
| Lessons captured from real bugs | `docs/compound/*.md` |
| Active execution plans | `docs/exec-plans/active/` |
| Completed plans (historical reference) | `docs/exec-plans/completed/` |
| Plugin architecture (skills/hooks/scripts/lib layout) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Quality score rubric (review checklist scoring) | [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) |
| Product sense (when to push back on requirements) | [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) |
| PR gates, TDD enforcement, quality checklist | [docs/MERGE_GATES.md](./docs/MERGE_GATES.md) |
| Compound engineering and lessons capture | [docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md) |
| Pre-merge review checklists by domain | [docs/review-checklists/](./docs/review-checklists/) |
| Critical user flows for smoke testing | [docs/smoke-flows/](./docs/smoke-flows/) |

## Compound Decision Gate

Before reporting completion: did this work teach the repo something durable?
If yes, ask the human to run `/anti-vibe-coding:lessons-learned` so the lesson gets captured in `docs/compound/`.
If no, log why no capture was needed in the plan's Lessons Captured section.

## Validation

Run `bun run harness:validate` before any commit that touches `docs/` structure.
Run `bun run compound:check` after adding/editing compound notes.

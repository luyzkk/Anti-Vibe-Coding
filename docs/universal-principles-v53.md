# 5 Princípios Universais (v5.3)

5 princípios cross-cutting integrados nas skills consultivas e templates.
Não dependem do perfil arquitetural — sempre aplicam quando a skill é invocada.

| # | Nome | Onde aplica | Tipo |
|---|------|-------------|------|
| 1 | Context-First / 10 Questions Test | `consultant`, `grill-me` | Prompt instruction |
| 5 | Comment Provenance | `prd-template.md`, `fase-template.md` | Template instruction |
| 7 | Declarative-first specs | `prd-template.md` (seção "Solução") | Template structure |
| 9 | Fresh-context review | `verify-work` (fase final) | Subagent spawn |
| 10 | YAGNI checklist | `consultant` (pós-análise) | Prompt checklist |

## Princípios adiados (Onda 2+)

- #3 — Token Tax audit: depende de baseline da telemetria (Plano 03 + Plano 05)
- #8 — Comprehension Debt tracking: precisa design dedicado

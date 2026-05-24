# Plano 03 — Skill Enhancements

## Objetivo

Adicionar `## Common Rationalizations` + `## Red Flags` nas 5 skills críticas do plugin + refactoring de `grill-me` com padrão Hypothesis+Confidence+GUESS.

## Fases

| # | Fase | Skills | Sizing |
|---|------|--------|--------|
| 01 | Common Rationalizations em tdd-workflow + security | 2 skills | ~1h |
| 02 | Common Rationalizations em plan-feature + execute-plan | 2 skills | ~1h |
| 03 | Common Rationalizations em grill-me + Hypothesis refactor | 1 skill | ~1h |

**Total estimado:** ~3h

## Dependências

- Plano 01 completo (registry limpo)
- Independente do Plano 02 (pode rodar em paralelo ou depois)

## Exit Criteria

- [ ] `grep -r "## Common Rationalizations" skills/` retorna 5+ matches (tdd-workflow, security, plan-feature, execute-plan, grill-me)
- [ ] `grep -r "## Red Flags" skills/` retorna 5+ matches
- [ ] `skills/grill-me/SKILL.md` contém `HYPOTHESIS:`, `CONFIDENCE:` e `GUESS:`
- [ ] Passo 1 e Passo 2 originais do grill-me intactos
- [ ] `bun run harness:validate` verde após cada fase

## Princípio

Conteúdo das seções é específico do domínio de cada skill — não usar texto genérico. Reler o arquivo completo antes de editar.

# PLAN: Agent-Skills Import — Wave 1

**PRD:** [PRD.md](./PRD.md)
**Date:** 2026-05-22
**Status:** planned
**Total:** 3 planos | 8 fases | ~7h

---

## Goal

Entregar os 6 quick wins da Wave 1 — melhorias táticas que adicionam valor imediato sem risco de regressão: CI para instalação do plugin, Common Rationalizations nas 5 skills críticas, 2 skills novas portadas, refactor de grill-me e bootstrap de docs/references/.

---

## Scope

**Em scope:**
- `.github/workflows/test-plugin-install.yml` (Plano 01)
- `docs/references/` bootstrap: 3 seed files externos (security-checklist, accessibility-checklist, testing-patterns) + README.md atualizado (Plano 01)
- `skills/incremental-implementation/SKILL.md` — skill nova portada (Plano 02)
- `skills/code-simplification/SKILL.md` — skill nova portada (Plano 02)
- `plugin-manifest.json` + `.claude-plugin/plugin.json` — checksums regenerados (Plano 02)
- Seções `## Common Rationalizations` + `## Red Flags` em 5 skills: tdd-workflow, security, plan-feature, grill-me, execute-plan (Plano 03)
- Refactoring de `skills/grill-me/SKILL.md` com padrão Hypothesis+Confidence%+GUESS no Passo 1 (Plano 03)

**Fora de scope:** Wave 2 (agentes), Wave 3 (consolidação). Não tocar em arquivos de agents/.

---

## Assumptions

1. `Infos/agent-skills-main/` existe e contém as skills-fonte (confirmado em análise).
2. `bun run harness:validate` passa atualmente (baseline verde antes das edições).
3. `claude plugin install` funciona localmente (R-01 do PRD — validar antes de commitar o YAML).
4. O campo `referenced-by` nos compound notes não é requisito desta Wave (Wave 3).
5. `docs/references/v5-legacy/` pode ser mantido como está — não conflita com novos seeds.

---

## Risks

| Risco | Mitigação |
|-------|-----------|
| `claude plugin install` não disponível na CI | Testar localmente primeiro (PRD R-01); se não funcionar, simplificar job para `bun run harness:validate` apenas |
| Edição cirúrgica em skills 346+ linhas causar perda de conteúdo | Reler arquivo antes de cada Edit; verificar seção adicionada após edição |
| Checksums desatualizados quebrarem harness | Regenerar manifest no final de cada plano que toca skills/agents |
| Common Rationalizations copiadas textualmente → perder PT-BR do plugin | Adaptar linguagem (não traduzir, mas manter consistência com tom do plugin) |

---

## Execution Steps

### Dependências entre Planos

```
Plano 01 (Infrastructure)
    ↓ independente dos outros, mas deve ser o primeiro
Plano 02 (New Skills)
    ↓ requer Plano 01 completo (referencias/ bootstrapada)
Plano 03 (Skill Enhancements)
    ↓ independente do Plano 02, requer apenas Plano 01
```

### Plano 01 — Infrastructure (Tracer Bullet)

> **Tracer Bullet:** `test-plugin-install.yml` — provará que o plugin ainda instala e que a CI existe end-to-end.

| # | Fase | Sizing |
|---|------|--------|
| 01 | GH Actions `test-plugin-install.yml` | S (~1h) |
| 02 | Bootstrap `docs/references/` (3 seeds + README) | S (~1h) |

### Plano 02 — New Skills

| # | Fase | Sizing |
|---|------|--------|
| 01 | Port `incremental-implementation` (copy+improve+manifest) | S (~1h) |
| 02 | Port `code-simplification` (copy+improve+manifest) | S (~1h) |
| 03 | Regenerar manifest + harness:validate | XS (~30min) |

### Plano 03 — Skill Enhancements

| # | Fase | Sizing |
|---|------|--------|
| 01 | Common Rationalizations + Red Flags em tdd-workflow + security | S (~1h) |
| 02 | Common Rationalizations + Red Flags em plan-feature + execute-plan | S (~1h) |
| 03 | Common Rationalizations + Red Flags + Hypothesis em grill-me | S (~1h) |

---

## Review Checklist

- [ ] `bun run harness:validate` verde após cada plano
- [ ] `bun run test` verde após cada plano
- [ ] `bun run lint` verde após Plano 02 e 03 (skills novas)
- [ ] Nenhum arquivo fora de escopo foi tocado
- [ ] Cada skill nova tem frontmatter completo (name, description, user-invocable, disable-model-invocation, allowed-tools, argument-hint)
- [ ] Checksums SHA-256 regenerados após adição de skills
- [ ] Common Rationalizations em todas as 5 skills verificado via grep
- [ ] grill-me contém padrão `HYPOTHESIS:` + `CONFIDENCE:` + `GUESS:` após refactor

---

## Validation Log

*(preenchido durante execução via /execute-plan)*

---

## Compound Opportunity

*(avaliar ao fechar cada plano — se algo ensinou o repo, propor /lessons-learned)*

---

## Lessons Captured

*(preenchido ao fechar a Wave)*

---

## Exit Criteria

- [ ] `test-plugin-install.yml` existe e passa em GH Actions
- [ ] 3 seed files em `docs/references/` (security-checklist.md, accessibility-checklist.md, testing-patterns.md)
- [ ] `skills/incremental-implementation/SKILL.md` e `skills/code-simplification/SKILL.md` existem com frontmatter válido
- [ ] Ambas as skills novas em `plugin-manifest.json` com checksums válidos
- [ ] 5 skills (tdd-workflow, security, plan-feature, grill-me, execute-plan) contêm `## Common Rationalizations` e `## Red Flags`
- [ ] `skills/grill-me/SKILL.md` contém padrão `HYPOTHESIS:` / `CONFIDENCE:` / `GUESS:`
- [ ] `bun run harness:validate && bun run test` verde na branch final

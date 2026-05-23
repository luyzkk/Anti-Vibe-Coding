---
title: "Agent-Skills Import — Wave 3 (Estrategico)"
mode: full
status: active
created: 2026-05-23
---

# Exec Plan: Agent-Skills Import — Wave 3

**PRD:** [PRD.md](./PRD.md)
**Date:** 2026-05-23
**Status:** planned
**Total:** 4 planos | 16 fases | ~10.5h
**Depende de:** Wave 2 (`../2026-05-22-agent-skills-import-wave2/`) — aprovado, planejado, nao mergeado

---

## Goal

Entregar os 5 itens estrategicos da Wave 3: (1) consolidar `/anti-vibe-review` em `/verify-work` com grace period funcional, (2) adicionar modo `prove-it` no `tdd-verifier` com guardrail `already_green`, (3) documentar e executar pipeline de promocao compound -> reference (criterio numerico + 3 references operacionais), (4) refatorar `tdd-workflow` e `plan-feature` com conceitos ausentes (Test Sizes, DAMP, Test-Doubles, Task Sizing, Dependency Graph ASCII), (5) adicionar flowchart `Define -> Plan -> Build -> Verify -> Review -> Ship` no `AGENTS.md`.

---

## Scope

**Em scope:**
- [skills/anti-vibe-review/SKILL.md](../../../../skills/anti-vibe-review/SKILL.md) — deprecation notice no topo (Plano 01)
- [skills/verify-work/SKILL.md](../../../../skills/verify-work/SKILL.md) — absorcao de delta de `anti-vibe-review` (Plano 01)
- [agents/tdd-verifier.md](../../../../agents/tdd-verifier.md) — secao `## Prove-It Mode` (Plano 02)
- [docs/compound/README.md](../../../compound/README.md) — secao `## Quando promover para reference` (Plano 03)
- `docs/references/init-step-contract.md`, `docs/references/hooks-checklist.md`, `docs/references/tdd-cycle-checklist.md` — 3 references operacionais novos (Plano 03)
- Frontmatter `referenced-by:` em compound notes-origem (Plano 03)
- [skills/tdd-workflow/SKILL.md](../../../../skills/tdd-workflow/SKILL.md) — secoes `## Test Sizes`, `## DAMP vs DRY em Testes`, `## Test-Doubles Reference` (Plano 04)
- [skills/plan-feature/SKILL.md](../../../../skills/plan-feature/SKILL.md) — secoes `## Task Sizing`, `## Dependency Graph (ASCII)` (Plano 04)
- [AGENTS.md](../../../../AGENTS.md) — secao `## Pipeline de Trabalho` com flowchart (Plano 04)
- `plugin-manifest.json` + `.claude-plugin/plugin.json` — checksums regenerados (Plano 04)

**Fora de scope:** Wave 1 e Wave 2 (nao tocadas). Could-haves CH-01..CH-04 do PRD. Delete fisico de `anti-vibe-review` (apenas deprecation nesta wave). Invocacao cross-model. Tier-2 multi-IDE. Commit-msg hook bloqueante. Pipeline compound->reference automatizado.

---

## Assumptions

1. Wave 2 esta aprovada e planejada. Para esta Wave 3, presumimos estado **pos-Wave-2** dos arquivos:
   - `agents/tdd-verifier.md` ja refinado com 5 patterns + `contract_version: "2.0.0"` (Plano 02 fase-01 valida antes de editar)
   - `skills/decision-registry/SKILL.md` ja tem `## When to Write an ADR` (nao tocado aqui)
   - 3 skills novas da Wave 2 (`source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning`) ja existem (sem impacto direto na Wave 3)
2. `bun run harness:validate && bun run test && bun run lint` passam atualmente (baseline verde) — validacao pre-execucao do Plano 01.
3. Compound notes-origem citadas no PRD existem no repo. **EXCECAO confirmada:** `2026-05-18-init-cascade-fix.md` NAO EXISTE (R-NEW-01 abaixo) — Plano 03 fase-02 usa nota substituta.
4. `docs/references/` ja tem README + 3 seeds da Wave 1 (security-checklist, accessibility-checklist, testing-patterns).
5. Script `scripts/generate-manifest.js` (ou comando `bun run generate:manifest`) existe e regenera checksums dos arquivos de skills/agents alterados.

---

## Risks

| Risco (do PRD ou novo) | Mitigacao no plano |
|------------------------|--------------------|
| **R-01 (Media/Medio):** Gap analysis revela conteudo dificil de absorver entre `anti-vibe-review` e `verify-work` | Plano 01 fase-01 produz mapa explicito de delta ANTES de editar; fase-03 absorve apenas itens nao-duplicados; em conflito, `verify-work` e a autoridade |
| **R-02 (Media/Medio):** Prove-It gera testes que passam imediatamente | Plano 02 fase-02 inclui guardrail `already_green` mandatory; fase-03 fixture cobre os 3 estados (`red_confirmed`, `already_green`, `inconclusive`) |
| **R-03 (Baixa/Medio):** Compound notes promovidas perdem contexto narrativo | Plano 03 fases 02-04 preservam notas-origem; references citam compound-origem no header; checklist e destilacao operacional |
| **R-04 (Baixa/Baixo):** Secoes novas em skills quebram harness | Plano 04 fase-04 roda `harness:validate` apos cada edicao; cada fase tem checklist de verificacao individual |
| **R-05 (Media/Baixo):** Flowchart fica desatualizado rapidamente | Plano 04 fase-03 usa nomes canonicos de skills (slug); mudanca de slug ja exige atualizacao de plugin.json |
| **R-06 (Baixa/Baixo):** Grace period gera confusao | Plano 01 fase-02 usa linguagem clara: "migre agora, sem data de remocao definida" |
| **R-07 (Media/Baixo):** References duplicam compound notes-origem | Plano 03 fases 02-04: reference cita compound-origem; nao copia paragrafos narrativos; formato e checklist |
| **R-NEW-01 (Confirmado/Medio):** `2026-05-18-init-cascade-fix.md` NAO existe no repo (PRD Item 3b cita) | Plano 03 fase-02 substitui por `2026-05-18-detector-parser-narrow-happy-path.md` (mesmo dia, dominio init); MEMORY do Plano 03 documenta substituicao |
| **R-NEW-02 (Media/Medio):** `tdd-verifier.md` pode estar em estado intermediario se Wave 2 nao foi mergeada antes de Wave 3 executar | Plano 02 fase-01 verifica `contract_version` atual e presenca das 5 secoes Wave-2 (Output Contract additions, Anti-Degeneration, Composition); se 1.0/sem secoes, pausa e alerta dev |
| **R-NEW-03 (Baixa/Medio):** Refactor de `plan-feature/SKILL.md` pode quebrar blocos TypeScript de telemetria | Plano 04 fase-02 usa Edit cirurgico em secoes markdown puras; bloco `typescript` no topo/fundo do arquivo NAO e tocado |

---

## Execution Steps

### Dependencias entre Planos

```
Plano 01 (Consolidacao /anti-vibe-review -> /verify-work) ─── TRACER BULLET
                                                                  \
                                                                   \
Plano 02 (Prove-It Mode tdd-verifier) ─────────────────────────────→ Plano 04 (Refactor + Flowchart + Manifest)
                                                                   /
Plano 03 (Compound -> Reference) ─────────────────────────────────/
```

**Paralelismo possivel:** Planos 02 e 03 sao **independentes entre si** e podem ser executados em paralelo apos Plano 01 estar completo. Plano 04 depende dos 3 anteriores (flowchart referencia `/anti-vibe-review (DEPRECADO)` do Plano 01; manifest final consolida tudo).

### Plano 01 — Consolidacao /anti-vibe-review -> /verify-work (Tracer Bullet, ~2.5h)

> **Tracer Bullet:** Provar que e possivel consolidar 2 skills com grace period funcional em UM par antes de qualquer outra alteracao. Cobre CA-01, CA-02 e CA-10 (backward-compat) — os criterios mais sensiveis a regressao.

| # | Fase | Sizing |
|---|------|--------|
| 01 | Gap analysis `anti-vibe-review` vs `verify-work` -> mapa de delta documentado | XS (~30min) |
| 02 | Adicionar `## ⚠️ Deprecation Notice` no topo de `anti-vibe-review/SKILL.md` | XS (~30min) |
| 03 | **TB:** Absorver delta em `verify-work/SKILL.md` (apenas itens nao-duplicados) + regenerar manifest | S (~1h) |
| 04 | Validar CA-10 (anti-vibe-review continua funcional) + CA-02 (delta absorvido) | XS (~30min) |

### Plano 02 — Prove-It Mode no tdd-verifier (~2h)

| # | Fase | Sizing |
|---|------|--------|
| 01 | Auditar estado atual de `agents/tdd-verifier.md` (contract version, secoes Wave-2) | XS (~30min) |
| 02 | Adicionar `## Prove-It Mode` + payload `test_status`/`failing_test_snippet`/`failure_message` + guardrail `already_green` | S (~1h) |
| 03 | Fixture cobrindo 3 estados: `red_confirmed`, `already_green`, `inconclusive` (CA-03 + CA-04) | XS (~30min) |

### Plano 03 — Pipeline Compound -> Reference (~3h, independente do Plano 02)

| # | Fase | Sizing |
|---|------|--------|
| 01 | Adicionar `## Quando promover para reference` em `docs/compound/README.md` (criterio ≥3 OU ≥2 OU obrigatorio) | XS (~30min) |
| 02 | Criar `docs/references/init-step-contract.md` extraido de 2 compound notes-origem + 1 substituta (R-NEW-01) | S (~1h) |
| 03 | Criar `docs/references/hooks-checklist.md` extraido de `prompt-hook-includes-no-loop` + compound notes de hooks | S (~45min) |
| 04 | Criar `docs/references/tdd-cycle-checklist.md` extraido de `tdd-gate-needs-stub-first` | S (~45min) |
| 05 | Adicionar frontmatter `referenced-by:` nas compound notes-origem (SH-04) | XS (~30min) |

### Plano 04 — Refactor Skills + Flowchart AGENTS.md + Manifest Final (~3h)

| # | Fase | Sizing |
|---|------|--------|
| 01 | Refatorar `tdd-workflow/SKILL.md` (`## Test Sizes`, `## DAMP vs DRY em Testes`, `## Test-Doubles Reference`) | S (~1h) |
| 02 | Refatorar `plan-feature/SKILL.md` (`## Task Sizing`, `## Dependency Graph (ASCII)`) | S (~1h) |
| 03 | Adicionar `## Pipeline de Trabalho` em `AGENTS.md` com flowchart `Define -> Plan -> Build -> Verify -> Review -> Ship` | XS (~30min) |
| 04 | Regenerar manifest final + `bun run harness:validate && bun run test && bun run lint` verde (SH-05, CA-11) | XS (~30min) |

---

## Review Checklist

- [ ] `bun run harness:validate` verde apos cada plano
- [ ] `bun run test && bun run lint` verde apos cada plano
- [ ] Nenhum arquivo fora do escopo desta Wave foi tocado
- [ ] `anti-vibe-review/SKILL.md` contem `## ⚠️ Deprecation Notice` como PRIMEIRA secao apos frontmatter (CA-01)
- [ ] `verify-work/SKILL.md` contem todo conceito de `anti-vibe-review` nao-duplicado (CA-02)
- [ ] `anti-vibe-review` continua executando fluxo completo durante grace period (CA-10)
- [ ] `tdd-verifier.md` contem `## Prove-It Mode` com 3 campos novos em payload (`test_status`, `failing_test_snippet`, `failure_message`) (CA-03)
- [ ] Guardrail `already_green` documentado e testado em fixture (CA-04)
- [ ] `docs/references/` contem 3 arquivos novos: `init-step-contract.md`, `hooks-checklist.md`, `tdd-cycle-checklist.md` (CA-05)
- [ ] `docs/compound/README.md` contem `## Quando promover para reference` com criterio numerico (CA-06)
- [ ] `tdd-workflow/SKILL.md` contem `## Test Sizes` com ≥3 tamanhos distintos (CA-07)
- [ ] `plan-feature/SKILL.md` contem `## Task Sizing` com ≥4 tamanhos (XS/S/M/L) e corte de L (CA-08)
- [ ] `AGENTS.md` contem `## Pipeline de Trabalho` com ≥5 fases mapeadas para skills (CA-09)
- [ ] Compound notes-origem das 3 references tem campo `referenced-by:` no frontmatter (SH-04)
- [ ] Checksums SHA-256 regenerados em `plugin-manifest.json` e `.claude-plugin/plugin.json` (SH-05)
- [ ] `bun run harness:validate && bun run test && bun run lint` verde na branch final (CA-11)

---

## Validation Log

*(preenchido durante execucao via /execute-plan)*

---

## Compound Opportunity

*(avaliar ao fechar cada plano — patterns como "deprecation com grace period funcional", "guardrail anti-falso-positivo em ciclo TDD", "criterio numerico para promocao de knowledge", "refactor por adicao nao-substituicao" podem virar compound notes)*

---

## Lessons Captured

*(preenchido ao fechar a Wave)*

---

## Exit Criteria

- [ ] **CA-01 a CA-11** do PRD verificados (11 criterios de aceite)
- [ ] `/anti-vibe-review` deprecado com notice + grace period funcional
- [ ] `tdd-verifier` com modo `prove-it` opt-in + 3 estados de payload + guardrail
- [ ] Pipeline compound -> reference documentado com criterio numerico
- [ ] 3 references operacionais em `docs/references/`
- [ ] `tdd-workflow` e `plan-feature` refatorados com adicoes (sem substituir conteudo existente)
- [ ] `AGENTS.md` com flowchart `Define -> Plan -> Build -> Verify -> Review -> Ship`
- [ ] Compound notes-origem com `referenced-by:` no frontmatter
- [ ] Manifest SHA-256 regenerado e validado
- [ ] `bun run harness:validate && bun run test && bun run lint` verde na branch final
- [ ] Backward-compat total: nenhum caller existente de `/anti-vibe-review` ou `tdd-verifier` (modo padrao) precisou ser tocado

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|----------------|
| DT-1 — Deprecation com grace period funcional (nao delete) | Plano 01 fase-02 (notice no topo + skill continua funcional) |
| DT-2 — Prove-It como MODO no agente existente (nao 14o agente) | Plano 02 fase-02 (secao no `tdd-verifier.md`, ativada via `mode: "prove-it"`) |
| DT-3 — Pipeline compound -> reference manual com criterio numerico | Plano 03 fase-01 (criterio em README, sem script automatizado) |
| DT-4 — Flowchart no `AGENTS.md` (nao `CLAUDE.md`) | Plano 04 fase-03 (secao nova ANTES da listagem de agentes) |
| DT-5 — Refactor de skills por ADICAO (nao substituicao) | Plano 04 fases 01-02 (Edit cirurgico adicionando secoes novas, sem remover existentes) |
| DT-6 — Grace period indefinido (Wave 4 decide delete) | Plano 01 fase-02 (notice sem data de remocao) |

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

# Summary: Refatoracao da Estrutura de Pastas por PRD

**Completed:** 2026-04-20
**Duration:** 2026-04-20 → 2026-04-20
**Planos:** 4 (4 completed, 0 skipped)
**Fases Total:** 18 (18 done, 0 skipped, 0 blocked)

---

## O que foi construido

### Plano 01 — Nova estrutura (fundacao + tracer bullet)
- `/write-prd` cria pasta datada `YYYY-MM-DD-{slug}/` + `PRD.md` nu + move `CONTEXT-*.md` para dentro da pasta
- `/plan-feature` le `PRD.md` da PASTA_ATIVA e salva `PLAN.md`, `STATE.md`, `planoNN/` dentro
- `/execute-plan` le `STATE.md` local, navega `planoNN/` relativo, passa `PASTA_ATIVA` absoluto aos subagentes
- Templates atualizados: frontmatter YAML em `prd-template`, paths relativos em overview e readme templates, `state-template.md` criado
- Fluxo FLAT (backward compat v1) preservado operando dentro de PASTA_ATIVA
- Commits: 0c73cd3, 6a030b1, 6d4cb11, 2c13b66, af96598

### Plano 02 — Deteccao legacy e migracao on-detect
- `skills/lib/legacy-detector.md` criado: algoritmo de 3 sinais (A: PRD-*.md solto, B: planoNN/ com fases, C: auxiliar) com pseudocodigo, falsos-positivos e regras de slug
- `skills/lib/legacy-migrator.md` criado: algoritmo STAGE/MOVE/CONFIRM/ROLLBACK com deteccao de log orfao
- `plan-feature/SKILL.md`: Step 0 inserido no topo (deteccao + oferta de migracao)
- `execute-plan/SKILL.md`: Step 0 inserido no topo com fluxo identico
- CA-12 validado via dogfooding bash (6/6 cenarios PASS): detectar sem migrar, migrar com STATE preservado, flat v1, ambiguous, etc.
- Commits: bf9a5ec, e outros

### Plano 03 — Multi-PRD, ciclo de vida e consolidacao
- Discovery interativo: `/execute-plan` e `/plan-feature` sem argumento listam PRDs ativos com status (filtro default: planned/in-progress/paused; `--all` inclui completed)
- `/write-prd`: colisao mesmo-dia → pergunta atualizar/v2/cancelar (sufixo -v2 com fallback EEXIST)
- `/verify-work`: arquivamento real via `mv` para `.planning/_archive/` com verificacao de estado terminal via regex (antes era pseudocodigo)
- Template `memory-prd-template.md` criado; `/verify-work` recebeu logica `gerarMEMORYConsolidado` com filtros de relevancia
- `anti-vibe-coding/CLAUDE.md` atualizado com nova estrutura hierarquica v2, `_archive/`, discovery interativo e legacy on-detect

### Plano 04 — Extras (Could Have)
- `prd-template.md`: campo `requires: []` adicionado ao frontmatter YAML existente (opcional, comentado)
- `/plan-feature` Step 1: parser de frontmatter extrai `prd_requires` (tolerante a ausencia — legacy PRDs retornam `[]`)
- `/execute-plan` Step 2.5 (novo): verifica dependencias `requires:` antes de confirmar com dev — resolve slug→pasta, le STATE.md de cada dep, aviso NAO-BLOQUEANTE + AskUserQuestion se alguma nao `completed`
- `/plan-feature` Step 1.5 (novo): DFS com 3 cores (branco/cinza/preto) sobre grafo de `requires:` — detecta ciclos diretos, indiretos e auto-referencia; aviso informativo sem bloqueio
- `/lessons-learned` Passo 4b (novo): ao `add`, infere PRD de origem via sort lexicografico de `.planning/_archive/YYYY-MM-DD-*/`, injeta linha `**Origem:** .planning/_archive/{pasta}/SUMMARY.md` apos `**Contexto:**`
- Commits: c8d5520 (fase-01 + fase-03 bundladas), c425644 (fase-02)

---

## Decisoes de Implementacao (consolidado)

| ID | Decisao | Plano |
|----|---------|-------|
| DI-01 | Bloco legacy deixado como comentario HTML marcador (nao deletado) para sinalizar Plano 02 | P01 |
| DI-02 | Sub-step 5.5 dentro do Step 5 do write-prd (preserva numeracao existente) | P01 |
| DI-03 | Step 2-FLAT preservado sem edicao — herda PASTA_ATIVA do contexto ja estabelecido | P01 |
| DI-04 | Instrucao separacao codigo/artefatos como diretiva positiva (mais facil seguir que negacao) | P01 |
| DI-05 | execute-plan nao explicita "pasta sem STATE.md = planned" — Step 2 ja trata | P03 |
| DI-06 | `prd-template.md` ja tinha frontmatter com campos; `requires: []` adicionado ao bloco existente (G-PLAN-13 estava desatualizado) | P04 |

---

## Bugs e Gotchas (consolidado — generalizaveis)

| ID | Gotcha | Origem |
|----|--------|--------|
| GT-1 | `anti-vibe-coding/` eh repo git independente. Commits precisam de CWD nessa pasta | P01 F01 |
| GT-2 | Instrucoes executaveis em SKILL.md dentro de blocos de codigo; NOTAs decorativas fora | P01 F04 |
| GT-3 | `state-utils.md` tinha referencia legacy `STATE-{featureName}.md` — corrigida no P02 | P01 F05 |
| GT-4 | `mv dir/` em bash faz MERGE (nao falha se destino existe); algoritmo real precisa de `fs.rename` ou criar pasta explicitamente | P02 F05 |
| GT-5 | STATE.md usa `**Phase:**` em negrito — grep literal por `Phase:` falha silenciosamente; usar regex `Phase:` que captura texto em negrito | P02 F05 |
| GT-6 | Agentes paralelos com `git add` simultâneo geram commits agrupados — verificar `git diff --staged` antes de commitar para atomicidade por fase | P03 F01 |

---

## Desvios dos Planos

| ID | O que mudou | Plano |
|----|-------------|-------|
| DEV-1 | fase-02 (write-prd) bundled com fase-01 (plan-feature) em commit 036315a — agentes paralelos com git staging simultaneo | P03 |
| DEV-2 | fase-01 e fase-03 do P04 bundladas em commit c8d5520 — mesmo padrao DI-2 realizado novamente | P04 |

---

## Metricas Consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 4 |
| Fases total | 18 |
| Fases done | 18 |
| Fases skipped | 0 |
| Fases blocked | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Desvios | 2 |
| Decisoes de implementacao | 6 |
| Gotchas documentados | 6 |

---

<!-- Gerado por /anti-vibe-coding:execute-plan em 2026-04-20 -->

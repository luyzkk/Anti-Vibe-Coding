# State: Refatoracao da Estrutura de Pastas por PRD

**Plan:** [.planning/PLAN-refatoracao-prd-folders.md](PLAN-refatoracao-prd-folders.md)
**Phase:** completed
**Current Plan:** 04/04
**Last Updated:** 2026-04-20

---

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Nova estrutura (fundacao + tracer bullet) | 5 | 5/5 | completed |
| 02 | Deteccao legacy e migracao on-detect | 5 | 5/5 | completed |
| 03 | Multi-PRD, ciclo de vida e consolidacao | 5 | 5/5 | completed |
| 04 | Extras (requires, lessons-learned origem) | 3 | 3/3 | completed |

## Progress Global

Tasks done: 18/18 (100%)

```
[####################] 100%
```

## Log

- 2026-04-20: CONTEXT gerado via `/grill-me` (15 decisoes indexadas D1-D15)
- 2026-04-20: PRD formal gerado via `/write-prd` e aprovado pelo dev
- 2026-04-20: PLAN overview gerado via `/plan-feature` (4 planos, 18 fases, ~21h)
- 2026-04-20: Plano 01 detalhado via subagente isolado (5 fases geradas)
- 2026-04-20: Plano 02 detalhado via subagente isolado (5 fases geradas — incluem `lib/legacy-detector.md` e `lib/legacy-migrator.md` como referencias)
- 2026-04-20: Plano 03 detalhado via subagente isolado (5 fases geradas — inclui atualizacao de verify-work e CLAUDE.md do plugin)
- 2026-04-20: Plano 04 detalhado via subagente isolado (3 fases — Could Have, cortaveis)
- 2026-04-20: TODOS os 4 planos planejados (18 fases, ~21h totais). Pronto para /execute-plan.
- 2026-04-20: Execucao iniciada — Plano 01, fase-01 (tracer bullet)
- 2026-04-20: fase-01 concluida (commit 0c73cd3 no repo anti-vibe-coding). GT-1 descoberto: anti-vibe-coding/ e repo git independente (relevante para fases 02-05). Aguardando VERIFY manual do dev.
- 2026-04-20: fase-01 VERIFY manual passou (confirmado pelo dev).
- 2026-04-20: fase-02 concluida (commit 6a030b1). plan-feature opera dentro de PASTA_ATIVA.
- 2026-04-20: fase-04 concluida (commit 6d4cb11). write-prd move CONTEXT-*.md para dentro da pasta. GT-2 descoberto: NOTAs executaveis devem ficar dentro de blocos de codigo. Aguardando VERIFY manual do dev das duas fases.
- 2026-04-20: fase-02 e fase-04 VERIFY manual passaram (confirmado pelo dev).
- 2026-04-20: fase-03 concluida (commit 2c13b66). execute-plan navega dentro de PASTA_ATIVA. STATE.md com referencia relativa ./PLAN.md (pasta movel).
- 2026-04-20: fase-05 concluida (commit af96598). 4 templates atualizados + state-template.md criado. GT-3 descoberto: skills/lib/state-utils.md tem referencia legacy (acao diferida para Plano 02).
- 2026-04-20: PLANO 01 COMPLETED (5/5 fases). Aguardando VERIFY manual final do dev antes de transicao para Plano 02.
- 2026-04-20: Transicao para Plano 02 iniciada (dev confirmou via /execute-plan).
- 2026-04-20: Plano 02 fase-01 concluida (commit bf9a5ec). legacy-detector.md criado + referencias em plan-feature e execute-plan. Gotcha: plan-feature/SKILL.md nao tinha secao Referencias (criada).
- 2026-04-20: Plano 02 fase-02 concluida. legacy-migrator.md criado (STAGE/MOVE/CONFIRM/ROLLBACK + orfao detection). Sem desvios. Iniciando fase-03 e fase-04 em paralelo.
- 2026-04-20: fase-03 concluida (commit 3476f34). Step 0 inserido em plan-feature/SKILL.md. Pipeline Integration renumerada (### 0. → ### 1. Importar PRD).
- 2026-04-20: fase-04 concluida (commit 008f9ae). Step 0 inserido em execute-plan/SKILL.md. Step 2-FLAT tem secao "Contexto de operacao". Plano 01 ja havia ajustado Step 2-FLAT para PASTA_ATIVA — sem bloqueador.
- 2026-04-20: fase-05 concluida (commit 99e8f46). CA-12 validated — 6/6 cenarios PASS. GT novo: mv dir/ em bash faz merge em vez de falhar; algoritmo real usa fs.rename. GT novo: STATE.md usa **Phase:** bold — grep literal falha silenciosamente.
- 2026-04-20: PLANO 02 COMPLETED (5/5 fases).
- 2026-04-20: Transicao para Plano 03 iniciada. Wave 1 (fase-01, fase-02, fase-03) lancadas em paralelo.
- 2026-04-20: Plano 03 fase-01 concluida (commits bb2171b + 036315a). Descoberta interativa de PRDs em execute-plan e plan-feature. DI-1: execute-plan nao explicita "pasta sem STATE.md=planned" (Step 2 ja trata).
- 2026-04-20: Plano 03 fase-02 concluida (bundled em 036315a). write-prd: colisao mesmo-dia → pergunta atualizar/v2/cancelar. G-PLAN-1 (codigo morto) ja havia sido removido antes desta fase.
- 2026-04-20: Plano 03 fase-03 concluida (commit d98c667). verify-work: arquivamento real para _archive/ com verificacao de estado terminal via regex.
- 2026-04-20: Plano 03 fase-04 concluida (commits c064832 + d2afc2b). Template memory-prd-template.md criado. verify-work recebeu logica gerarMEMORYConsolidado com filtros de relevancia.
- 2026-04-20: Plano 03 fase-05 concluida (commit c4b84c8). CLAUDE.md do plugin atualizado com nova estrutura hierarquica v2 (pastas datadas, _archive/, discovery interativo, legacy on-detect).
- 2026-04-20: PLANO 03 COMPLETED (5/5 fases).
- 2026-04-20: Execucao pausada pelo dev (Plano 04 e Could Have — cortavel). Retomar com /execute-plan.
- 2026-04-20: Plano 04 execucao retomada (legacy v1 mode — dev optou por nao migrar nesta invocacao).
- 2026-04-20: fase-01 e fase-03 concluidas em paralelo (commit c8d5520). GT: DI-2 realizado — commits bundlados; DI-1: prd-template.md ja tinha frontmatter, requires adicionado ao bloco existente. Lancando fase-02.
- 2026-04-20: fase-02 concluida (commit c425644). DFS com 3 cores implementado em plan-feature/SKILL.md (Step 1.5).
- 2026-04-20: PLANO 04 COMPLETED (3/3 fases). TODOS OS PLANOS CONCLUIDOS (18/18 fases, 100%).
- 2026-04-20: SUMMARY.md gerado. 3 licoes destiladas e salvas em anti-vibe-coding/CLAUDE.md (commit d872217).
- 2026-05-14T00:00:02.000Z: migracao legacy — 9 artefatos movidos de .planning/ raiz (signals: A,B,C). Ver .migration-log.json para detalhes.

---

## Notas de Planejamento

### Gotchas detectados durante planejamento do Plano 01 (nao previstos no PRD)

- **G-PLAN-1:** `write-prd/SKILL.md` tem logica legacy "atualizar ou criar v2" para PRDs soltos (linhas ~174-179). Pos-refactor isso vira codigo morto. Plano 02 eh responsavel por limpar.
- **G-PLAN-2:** Step 2-FLAT do `execute-plan` (backward compat v1) continua valido mas precisa operar DENTRO de PASTA_ATIVA. Se `.planning/` tiver `PLAN.md` SOLTO sem pasta, eh Plano 02.
- **G-PLAN-3:** Referencia `**Context:**` no PRD template eh caminho absoluto — apos mv do CONTEXT (fase-04), a fase-05 precisa consolidar para `./CONTEXT.md` relativo. Dependencia leve entre fase-04 e fase-05.

### Gotchas detectados durante planejamento do Plano 02

- **G-PLAN-4:** `mv` cross-filesystem no Windows pode falhar. Pre-requisito: `.planning/` tem que estar no mesmo filesystem do projeto. Documentar no README do Plano 02.
- **G-PLAN-5:** Inserir "Step 0 — Deteccao de Legacy" no topo das SKILLs preserva a numeracao existente (Steps 1-11 do `plan-feature`, 1-7 do `execute-plan`). Evita renumerar 18+ Steps.
- **G-PLAN-6:** Sinal C isolado — se `.planning/` tem apenas `PLAN.md` e/ou `STATE.md` solto SEM `PRD-*.md` nem `planoNN/`, NAO eh legacy (pode ser transicao valida ou projeto incompleto). So disparar migracao com sinal A (PRD-*.md solto) OU sinal B (planoNN/ com fase-*.md).
- **G-PLAN-7:** Dogfooding skill-em-skill (fase-05 do Plano 02) requer backup/restore de `.planning/` real para nao contaminar trabalho em andamento. Protocolo documentado na fase.
- **G-PLAN-8:** Log de migracao (`.migration-log.json` temporario da fase-02) pode ficar orfao se a skill crashear entre MOVE e CONFIRM. Backstop: na proxima invocacao, detectar log orfao e oferecer rollback automaticamente.

### Gotchas detectados durante planejamento do Plano 03

- **G-PLAN-9:** `verify-work/SKILL.md` ja tem secao "Cleanup de Artefatos" (linhas ~358-369) com 3 opcoes textuais (archive/keep/remove). Plano 03 fase-03 SUBSTITUI essa logica pseudo por mv real para `_archive/` (G11 do Plano 03).
- **G-PLAN-10:** `anti-vibe-coding/CLAUDE.md` usa estrategia MERGE no `/anti-vibe-coding:update`. Para o merge funcionar, a fase-05 do Plano 03 precisa PRESERVAR headings exatos ("Estrutura hierarquica (v2)", "Artefatos de Pipeline:"); mudar o texto do heading duplica em vez de substituir.
- **G-PLAN-11:** Edge case — plano sem `MEMORY.md` (MEMORY removida ou nunca criada). Agregacao da fase-04 deve tratar gracefully com marcador "sem memoria registrada".
- **G-PLAN-12:** Sufixo `-vN` na fase-02: limite seguro de 99 versoes + fallback para EEXIST em paralelismo (duas sessoes tentando v2 simultaneamente).

### Gotchas detectados durante planejamento do Plano 04

- **G-PLAN-13 (CRITICO):** `prd-template.md` NAO tem frontmatter YAML hoje — comeca direto com `# PRD: {Feature Name}`. Plano 04 fase-01 precisa ADICIONAR bloco `---\nrequires: []\n---` no topo do template + parser tolerante a ausencia em PRDs legacy (pre-refactor).
- **G-PLAN-14:** `lessons-learned/SKILL.md` nao tem parametro de path. Plano 04 fase-03 infere origem via glob + sort lexicografico em `_archive/` (YYYY-MM-DD permite isso sem parsing de data).
- **G-PLAN-15:** Licoes existentes seguem formato `[Categoria] + Regra + Contexto`. Linha `**Origem:**` entra como TERCEIRO campo (apos Contexto), sem tocar em categorias ou filtro de qualidade.
- **G-PLAN-16:** `requires:` aceita slug curto OU pasta completa. Resolucao por sufixo com aviso de ambiguidade se `>1` match. Parser normaliza string unica e array YAML na mesma lista interna.

### Dogfooding intencional

Este proprio PRD/PLAN eh o TESTE de backward compat: foi criado na estrutura ANTIGA (`.planning/PRD-*.md`, `.planning/PLAN-*.md`, `.planning/plano01/` solto). Quando o Plano 02 ficar pronto, a migracao on-detect deve capturar esses arquivos e move-los para `.planning/2026-04-20-refatoracao-prd-folders/`. Servirá como validacao real de CA-04 e CA-12.

---

<!-- Atualizado automaticamente por /execute-plan -->

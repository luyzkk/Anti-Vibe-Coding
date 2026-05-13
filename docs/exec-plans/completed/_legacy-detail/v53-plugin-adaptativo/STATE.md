# State: Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)

**Plan:** ./PLAN.md
**Phase:** completed
**Current Plan:** 05/5
**Last Updated:** 2026-05-12 (fase-06 concluida — CHANGELOG.md + 3 docs de release criados refletindo BUG-02 honestamente. Plano 05 e Onda 1 v5.3 COMPLETOS. CA-11 deferred-to-onda-2 documentado em todos artefatos)

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Foundation (schemas + flag + tracer bullet) | 6 | 6/6 | completed |
| 02 | Architecture Detector | 5 | 5/5 | completed |
| 03 | Telemetria Passiva | 4 | 4/4 | completed |
| 04 | Modo Dual + 5 Princípios Universais | 6 | 6/6 | completed |
| 05 | Análise & Dogfooding | 5 (1 obsolete) | 5/5 | completed |

## Progress Global

Fases done: 25/27 (93%) — Plano 05 e Onda 1 v5.3 COMPLETOS. 1 fase obsolete (fase-05 CA-12), 1 deferred (CA-11 → Onda 2).

## Plano 01 — Detalhe das Fases (concluido)

| Fase | Nome | Status | Commit |
|------|------|--------|--------|
| 01 | schema-architecture-profile | done | b940c5a (bundled) |
| 02 | schema-telemetry-jsonl | done | 88fc213 |
| 03 | feature-flag | done | 3104a27 |
| 04 | architecture-profile-md-generator | done | 42acd02 |
| 05 | docs-perfis-arquiteturais | done | b940c5a (bundled) |
| 06 | tracer-bullet-modo-dual | done | 76cc83b |

**Validacao final Plano 01:** 52 testes passam (81 expects), typecheck limpo. CA-04 e CA-05 (preview) cobertos.

## Plano 03 — Detalhe das Fases (concluido)

| Fase | Nome | Status | Commit |
|------|------|--------|--------|
| 01 | lib-telemetry-utils | done | 63509a1 |
| 02 | instrumentar-pipeline-core (5 skills) | done | 23c8204 |
| 03 | instrumentar-iterate-e-consultivas (5 skills) | done | addf7e9 |
| 04 | rotacao-mensal-falha-silenciosa (CA-09) | done | 5d6a61f |

**Validacao final Plano 03:** 133 testes verdes (suite completa, +31 vs Plano 02), typecheck limpo. 10/10 skills instrumentadas (D13/RF4 cumprido). CA-03 e CA-09 cobertos por regression tests. Tracer Bullet do Plano 01 fase-06 preservado em architecture/SKILL.md.

## Plano 05 — Detalhe das Fases (em andamento)

| Fase | Nome | Status | Commit |
|------|------|--------|--------|
| 01 | script-cli-analyze-metrics | done | fd066f1 |
| 02 | could-haves (ASCII + --set + sugestao /init) | done | a185cdc |
| 03 | setup-dogfooding-licitar-carreirarte | done (Carreirarte unknown-mixed override manual; CA-05 confirmado empiricamente) | (sem commit — edits em projeto externo + matriz) |
| 04 | coleta-50-entradas-e-relatorio (14 dias bloqueio) | done (encerrada antecipadamente 2026-05-12 — DEV-12; BUG-02 critico expoe instrumentacao nao-funcional; CA-11 deferred-to-onda-2) | — |
| 05 | validacao-ca-12-isolamento-entre-repos | obsolete (DEV-07 — CA-12 coberto por testes; sem piloto-false na Onda 1) | — |
| 06 | release-notes-v53-e-docs-finais (citar BUG-02 + CA-11 deferred + CA-12 cobertura por testes) | done | — (sem commit ainda — aguardando decisao do dev) |

## Log

- 2026-05-04: Plano criado via /plan-feature (5 planos, 27 fases, ~37h serial / ~30h paralelo)
- 2026-05-04: PLAN.md e STATE.md gerados
- 2026-05-04: Plano 01 (Foundation) gerado via subagente isolado — 6 fases detalhadas + README + MEMORY (~6h total)
- 2026-05-04: Plano 02 (Architecture Detector) gerado via subagente isolado — 5 fases detalhadas + README + MEMORY (~7.5h total)
- 2026-05-04: Plano 03 (Telemetria Passiva) gerado via subagente isolado — 4 fases detalhadas + README + MEMORY (~6h total)
- 2026-05-04: Plano 04 (Modo Dual + 5 Princípios Universais) gerado via subagente isolado — 6 fases detalhadas + README + MEMORY (~9h total)
- 2026-05-04: Plano 05 (Análise & Dogfooding) gerado via subagente isolado — 6 fases detalhadas + README + MEMORY (~9h ativo + 2 semanas calendário). Onda 1 com 27 fases prontas para execução.
- 2026-05-04: Execucao iniciada — Plano 01.
- 2026-05-04: Plano 01 wave 1 (fase-01, fase-02, fase-05) executada em paralelo. Done. 30 testes verdes.
- 2026-05-04: Plano 01 wave 2 (fase-03, fase-04) executada em paralelo. Done. 43 testes verdes.
- 2026-05-04: Plano 01 wave 3 (fase-06 tracer bullet) executada. Done. 52 testes verdes.
- 2026-05-04: **Plano 01 concluido (6/6 fases).** Foundation entregue: schemas versionados, feature flag, gerador md, docs dos 5 perfis, tracer bullet.
- 2026-05-04: Aviso GT-06 — arquivos pre-existentes nao staged em hooks/tdd-gate.cjs, skills/grill-me/SKILL.md, skills/write-prd/SKILL.md, skills/write-prd/templates/prd-template.md. Verificar origem antes de seguir Plano 02.
- 2026-05-05: Execucao pausada apos conclusao do Plano 01. Dev optou por iniciar Plano 02 em contexto novo. Retomar com `/anti-vibe-coding:execute-plan` apontando para esta pasta — o skill detecta `phase: paused` e pergunta se retoma do Plano 02.
- 2026-05-05: Execucao retomada — Plano 02 (Architecture Detector). 5 fases sequenciais executadas via subagentes plan-executor isolados.
- 2026-05-05: Plano 02 fase-01 done. classifyByFolders + lookup table 5 perfis. Commit a40ece8. 5 testes verdes (61 total). DEV-01/02: types.ts e types.test.ts adicionais (necessarios — .md nao eh importavel).
- 2026-05-05: Plano 02 fase-02 done. sampleImports + computeConfidence. Commit c5b7e67. 12 novos (76 total).
- 2026-05-05: Plano 02 fase-03 done. SKILL.md /detect-architecture + readSrcTree (G3/G6 graceful handling). Commit 120e02c. 12 novos (88 total).
- 2026-05-05: Plano 02 fase-04 done. writeArchitectureProfile (idempotent JSON+MD). Commit 2df7ee8. 6 novos (94 total). DEV-01: escrita nao atomica (sem tmp+rename) — aceito para Onda 1.
- 2026-05-05: Plano 02 fase-05 done. E2E 5 perfis. Commit ae47e97. 8 novos (102 total). CA-01 e CA-02 cobertos.
- 2026-05-05: **Plano 02 concluido (5/5 fases).** Architecture Detector entregue: skill /detect-architecture, classify-by-folders, sample-imports, compute-confidence, persistencia idempotente, cobertura E2E dos 5 perfis. 102 testes verdes, typecheck limpo. Pausado para decisao do dev sobre Plano 03 (Telemetria Passiva).
- 2026-05-05: Execucao retomada — Plano 03 (Telemetria Passiva). 4 fases sequenciais via plan-executor isolado.
- 2026-05-05: Plano 03 fase-01 done. telemetry-utils (.ts + .md) com writeStart/writeEnd, falha silenciosa, INSTRUMENTED_SKILLS (10). Commit 63509a1. 14 novos (116 total). DEV-01: .ts criado alem do .md (Bun nao resolve .md sem plugin).
- 2026-05-05: Plano 03 fase-02 done. 5 skills do pipeline core instrumentadas (grill-me, write-prd, plan-feature, execute-plan, verify-work). Commit 23c8204. 3 smoke tests novos (119 total). DI-01: `.or.toContain` do plano nao existe em bun:test — substituido por OR booleano.
- 2026-05-05: Plano 03 fase-03 done. 5 consultivas instrumentadas (iterate, consultant, architecture, design-twice, quick-plan). Commit addf7e9. 5 testes novos (124 total). architecture/SKILL.md com Tracer Bullet preservado (architectureProfile presente apos edicao).
- 2026-05-05: Plano 03 fase-04 done. 9 testes de regressao (rotacao mensal, CA-09, skill com erro). Commit 5d6a61f. Todos 9 ja-verdes na primeira execucao — confirma robustez da fase-01. Suite completa 133 verdes. Aviso: subagente fez commit errado no repo pai e reverteu — 2 commits noise (73522c1 + a229289) no historico do repo pai (sem efeito funcional).
- 2026-05-05: **Plano 03 concluido (4/4 fases).** Telemetria Passiva entregue: lib telemetry-utils com falha silenciosa, 10/10 skills instrumentadas (D13/RF4), rotacao mensal automatica, CA-03 e CA-09 cobertos por regression tests, telemetry-schema.md atualizado. Pausado para decisao do dev sobre Plano 04 (Modo Dual + 5 Principios Universais).
- 2026-05-05: Execucao retomada — Plano 04 (Modo Dual + 5 Principios Universais). Estrategia: fase-01 sequencial (helper estavel), fases 02-05 paralelas, fase-06 serial no final.
- 2026-05-05: Plano 04 fase-01 done. Commit a1bde38. readArchitectureProfile promovido a API estavel + getRecommendationForProfile<T> exportado, 8 fixtures (5 perfis + no-profile + flag-disabled + invalid-profile), docs/dual-mode-convention.md. 12 novos (145 total). DI-01: assinatura preservada como `manifestPath: string` (nao `cwd`) — tracer bullet Plano 01 fase-06 nao quebra. DI-02: 8o fixture e `invalid-profile.json` (spec truncada). GT-16/GT-17 documentados.
- 2026-05-05: Plano 04 rodada paralela 1 (fase-02 + fase-03). Ambas done. fase-02 commit 5c9be59 (architecture-recommendations: 5 perfis + Greenfield, 11 testes). fase-03 commit 251436d (fase-policy: 5 perfis + render block, 12 testes). Suite 168 verdes. GT-18 (noUncheckedIndexedAccess no tsconfig) e GT-19 (testes pre-existentes assertam strings literais em SKILL.md) documentados.
- 2026-05-05: Plano 04 rodada paralela 2 (fase-04 + fase-05). Ambas done com bundling artifact: commit 280703f tem mensagem `feat(plano04-fase04)` mas CONTEM os arquivos da fase-05 (execute-plan + verify-work/adherence-checks); commit d1fdda7 tem mesma mensagem mas contem os arquivos reais da fase-04 (write-prd/structure-snippets). Causa: race condition de `git add` em subagentes paralelos. Codigo e testes corretos, mensagens enganosas. Suite 188 verdes. GT-21 (race condition git em paralelo) e GT-22 (grep `readArchitectureProfile()` conta comentarios alem de invocacao) documentados.
- 2026-05-05: Plano 04 fase-06 done. Commit 1201461. 5 universais integrados: #1 (10 Questions Test) e #10 (YAGNI checklist) em consultant; #1 pointer em grill-me; #5 (Comment Provenance) em prd-template e fase-template; #7 (Declarative-first — Outcomes antes de Mecanismo) em prd-template; #9 (Fresh-context Review) em verify-work. docs/universal-principles-v53.md criado. 15 testes textuais novos (203 total). GT-23 (`import.meta.dir` resolve para diretorio do test, nao do projeto).
- 2026-05-05: **Plano 04 concluido (6/6 fases).** Modo Dual + 5 Universais entregue: 5 skills estruturantes adaptam saida ao perfil via lookup de 5 entradas + leitura UMA vez; 5 universais integrados em prompts/templates; helper estavel + getRecommendationForProfile; 8 fixtures canonicos. CA-04, CA-05, CA-06, CA-10 cobertos por testes. 203 testes verdes (de 133 baseline = +70 testes adicionados). 6 commits no submodulo (1 com mensagem trocada por bundling). Pausado para decisao do dev sobre Plano 05 (Analise & Dogfooding).
- 2026-05-05: Execucao retomada — Plano 05 (Analise & Dogfooding). Estrategia: fase-01 + fase-02 nesta sessao (TDD ativo no submodulo); fase-03 pede confirmacao para tocar Licitar/Carreirarte; fase-04 dispara dogfooding (14 dias bloqueio fisico) e encerra a sessao.
- 2026-05-05: Plano 05 fase-01 done. Commit fd066f1 (submodulo). Script CLI analyze-metrics.ts + 4 libs puras (parse-jsonl, pair-events, aggregate, format-report) + fixture sample-metrics.jsonl. 14 testes novos (217 total, +14). DI-01: parseTelemetryEntry lanca em vez de retornar null — wrap em try/catch. DI-02: PairedEntry.end tipado como TelemetryEnd para acessar campos de end direto. DI-03: producao via Bash (TDD gate exige test co-localizado por nome — GT-24). DEV-01: fixture com 9 pares validos (plano sugeria 15 — rascunho indicativo); CA-11 50 entradas sera atendido em fase-04 com dados reais. BUG-01: fixture inicialmente esperava 3 malformadas mas linha `{"campo_invalido":...}` e JSON valido que falha so no parseTelemetryEntry — ajustado para 2 malformadas reais.
- 2026-05-05: Plano 05 fase-02 done. Commit a185cdc (submodulo). RF12 (ASCII chart `renderAsciiBars` puro), RF13 (sugestao textual em `skills/init/SKILL.md`, sem invocacao — feedback_suggest_dont_execute respeitado), RF14 (`--set <perfil>` valida contra `VALID_PROFILES` e delega a `writeArchitectureProfile`). 6 testes novos (224 total, +6). 6 arquivos: 2 criados (ascii-chart.ts + test), 4 modificados (format-report.ts, analyze-metrics.ts, analyze-metrics.test.ts, init/SKILL.md). DI-04: `signals.folderSignals[]` sintetico com `pattern: "manual override via analyze-metrics --set"` para embutir texto de override no manifest sem reimplementar writer (G13 respeitado). DI-05: `VALID_PROFILES` usa `ArchitectureProfileName` de `manifest-types.ts` (tipo canonico do manifest, nao `Profile` de architecture-detector/types.ts). Bun `tsc --noEmit` limpo.
- 2026-05-05: Plano 05 fase-03 pre-stage executado pelo orchestrador. Edits diretos: `architectureDetectorEnabled: true` em `F:/Projetos/Licitar/.claude/.anti-vibe-manifest.json`; `architectureDetectorEnabled: false` em `E:/Programas/Carreirarte - Novo Design/.claude/.anti-vibe-manifest.json`. JSON validado via Bun (sem jq no ambiente). `pluginVersion` NAO bumped (DI-07 — fica para `/init` v5.3 do user). Status fase-03: **partial** — pendente das 4 etapas manuais (init em ambos, detect em Licitar, smoke em ambos). Detalhe completo em `plano05/MEMORY.md` secao "Fase-03 — Comandos Exatos e Estado Pos-Pre-Stage".
- 2026-05-05: **Plano 05 fase-03 BLOQUEADA.** User informou que Licitar sera reescrito em Ruby on Rails — fora dos 5 perfis suportados pelo detector (Onda 1 nao planeja Rails). Pre-stage em Licitar **revertido** (campo `architectureDetectorEnabled` removido do manifest — volta ao default false). Carreirarte permanece com flag=false (baseline CA-12 valido). Onda 1 precisa de pelo menos 1 projeto piloto-true para coletar as 50 entradas validas (CA-11). Aguardando decisao do user — opcoes em `plano05/MEMORY.md` DEV-03. Phase global movida para `paused`.
- 2026-05-05: User confirmou que Rails eh caso isolado de Licitar — opcao (c) "adicionar `rails-mvc` aos perfis" descartada para Onda 1. `rails-mvc` registrado em `plano05/MEMORY.md` como candidato para Onda 2 (DEV-04 + secao "Notas para Onda 2"). Fase-03 segue bloqueada — aguardando escolha entre (a) outro piloto Next.js/JS-TS, (b) so Carreirarte, ou (d) Licitar Rails como `unknown-mixed`.
- 2026-05-05: User escolheu **Carreirarte como piloto-true** (DEV-05). Edit aplicado: `architectureDetectorEnabled: true` em `E:/Programas/Carreirarte - Novo Design/.claude/.anti-vibe-manifest.json` (era false). Carreirarte e Vite + React Router SPA (`src/pages/`, `src/components/`, `src/hooks/`, `src/services/`, `index.html`, `vite-env.d.ts`) — premissa de perfil: `mvc-flat` ou `vertical-slice`. Onda 1 fica com 1 projeto piloto (vs 2 do plano original). **Fase-05 do Plano 05 (CA-12 isolamento)** precisa redesign — DEV-06 recomenda descartar (CA-12 ja coberto por testes textuais em Plano 03 + Plano 04). Risco amplificado: 50 entradas validas em 14 dias com 1 projeto pode exigir extensao para 21 dias se D+7 mostrar volume baixo. Phase global volta para `in-progress`.
- 2026-05-05: User confirmou opcao (iii) de DEV-06 → **fase-05 marcada como `obsolete`** (DEV-07). CA-12 fica oficialmente coberto so por testes textuais (Plano 04 fase-01 helper) + regression tests telemetria (Plano 03 fase-04) + fixture `flag-disabled.json`. Plano 05 passa de 6 para 5 fases efetivas. Fase-06 (release notes) precisa ajustar referencias a CA-12 — citar cobertura por testes em vez de dogfooding empirico.
- 2026-05-05: **BLOQUEADOR descoberto via screenshot do `/init` em Carreirarte (GT-25/DEV-08).** Matriz geral em `F:/Projetos/Claude code/anti-vibe-coding/` ainda esta em v5.2.0 — v5.3 (Plano 01-04 + Plano 05 fases 01-02) existe SOMENTE no working tree de desenvolvimento. `/init` em Carreirarte reportou "ja sincronizado" pois compara com matriz instalada, nao com working tree. Pre-stage do flag `architectureDetectorEnabled: true` foi preservado, mas codigo v5.3 (skills modo dual, helper, lookup tables) NAO esta na matriz. Rodar `/detect-architecture` agora em Carreirarte produziria dogfooding contaminado (profile populado, modo dual sem efeito real, smoke test daria output v5.2). **Fase-03 RE-BLOQUEADA.** Pre-condicao para desbloquear: promover working tree v5.3 → matriz instalada (fluxo de release do user). Phase global volta para `paused`.
- 2026-05-05: **DESBLOQUEIO via DEV-09.** User pediu "concerte tudo" — orchestrador descobriu que matriz E working tree sao o mesmo repo; a divergencia estava nos arquivos de versao internos. Acoes: (1) `.claude-plugin/plugin.json` 5.2.0→5.3.0 + descricao atualizada; (2) `plugin-manifest.json` regenerado via Bun inline (script `generate-manifest.js` legacy esta hardcoded em 4.0.0 e nao cobre estrutura moderna — GT-26 documentado) — 134 arquivos com checksums recomputados, todos novos arquivos v5.3 incluidos (detect-architecture skill, telemetry-utils lib, manifest-schema, etc); (3) `package.json` ja estava em 5.3.0. Validacao: 224 testes verdes (suite completa do plugin), 3 arquivos de versao alinhados. Phase global volta para `in-progress`. Fase-03 = `partial` — aguardando user rodar `/anti-vibe-coding:sync` + `/anti-vibe-coding:detect-architecture` + `/anti-vibe-coding:architecture` em Carreirarte.
- 2026-05-05: **Plano 05 fase-03 DONE (DEV-10).** User executou as 4 etapas manuais em Carreirarte: `/sync` puxou v5.3 (manifest local agora pluginVersion 5.3.0 com 26 arquivos sourceVersion 5.3.0); `/detect-architecture` classificou como `unknown-mixed` com override manual a 100% confidence (sinais Vite+React SPA caem em fallback); `/architecture` validou empiricamente CA-05 — output adaptativo difere claramente do v5.2 (cita perfil detectado, muda tom para consultor caso-a-caso, declara "tratar caso a caso sem assumir padroes de pasta"). **CA-05 cumprido empiricamente em produção.** Dado para Onda 2: Vite+React SPA caindo em fallback sugere candidato a perfil dedicado (`react-spa-flat`/`vite-spa`) — decisao espera N>=3 projetos similares. Janela de 14 dias da fase-04 (dogfooding passivo + coleta de 50 entradas validas) inicia hoje (fim sugerido: 2026-05-19; mid-checkpoint: 2026-05-12).
- 2026-05-05: **Plano 05 fase-04 ABERTA — janela de coleta iniciada.** Orchestrador (`/execute-plan plano 5 - fase 04`) registrou abertura. Status fase-04: `in-progress (waiting calendar)`. Day-0 baseline executado: `bun run scripts/analyze-metrics.ts --projects "E:/Programas/Carreirarte - Novo Design" --month 2026-05` → 0 linhas brutas, 0 pares validos (esperado — `metrics/` ainda nao existe em Carreirarte; sera criado na primeira invocacao de skill instrumentada). Spec `plano05/fase-04-*.md` recebeu preamble explicando substituicoes pos-DEV-05/DEV-07 (Carreirarte = unico piloto-true, sem projeto controle, fase-05 obsolete). **Acoes pendentes — bloqueio fisico de calendario:** (1) 2026-05-12 mid-checkpoint — rodar analyze-metrics em Carreirarte, decidir se >=25 pares (on track) ou estender prazo; (2) 2026-05-19 final — gerar baseline em Carreirarte, criar `anti-vibe-coding/docs/baseline-v53-onda1.md`, atualizar OQ1/OQ3/OQ11 em MEMORY. Re-invocar `/execute-plan plano 5 - fase 04` em 2026-05-12 (orchestrador detecta data e roda mid-checkpoint).
- 2026-05-05: Re-invocacao de `/execute-plan plano 5 - fase 04` no mesmo Day-0. Re-check do baseline confirma estado inalterado: 0 linhas / 0 pares em Carreirarte; `E:/Programas/Carreirarte - Novo Design/.claude/metrics/` ainda inexistente. Nenhuma acao executada — fase eh wait time de calendario. Orchestrador encerra; proximo gatilho ativo eh 2026-05-12.
- 2026-05-12: **Mid-checkpoint fase-04 — fase ENCERRADA ANTECIPADAMENTE via DEV-12.** `analyze-metrics.ts` em Carreirarte retornou 0 pares validos (esperado >=25 para on track). Investigacao expos **BUG-02 critico (arquitetural):** instrumentacao do Plano 03 (`writeTelemetryStart`/`End` em blocos TS dentro de `SKILL.md`) e tratada como prompt markdown pelo agente Claude, NAO como runtime executavel. Confirmado em `hooks/hooks.json`: nenhum hook (`SessionStart`, `UserPromptSubmit`, `PreToolUse`) dispara telemetria. Os 224 testes da suite ficam verdes porque testam o writer em isolamento via Bun — mecanismo nunca executa em uso real de skills. **Decisao do user (Opcao A):** encerrar fase-04, mover CA-11 para `deferred-to-onda-2`, avancar para fase-06. Motivacao: liberar v6.0 ja em andamento. Janela de calendario 12/05-19/05 liberada — orchestrador NAO re-invoca em 19/05. Spec de fix para Onda 2 (Approach 1b: par `PreToolUse`+`PostToolUse` com correlacao via `tool_use_id`) registrada em plano05/MEMORY.md secao "Notas para Onda 2".
- 2026-05-12: **Plano 05 fase-06 DONE.** 4 artefatos de release criados refletindo honestamente BUG-02: (1) `anti-vibe-coding/CHANGELOG.md` — entrada [5.3.0] adicionada no topo com secao "Bugs conhecidos" citando BUG-02 e tabela de CAs (4 ✅ / 1 ❌ deferred / 1 ✅ por testes); (2) `docs/release-notes-v53.md` — comunicacao humana com secao "Known limitations" e OQs marcadas "Em aberto"; (3) `docs/upgrade-v52-to-v53.md` — guia tecnico avisando que ativar flag agora produz metrics/ vazio sem regressao funcional; (4) `docs/baseline-v53-onda1.md` — relatorio empirico honesto (0 pares + causa raiz + spec de fix para Onda 2). Estilo do CHANGELOG existente preservado (emojis, nao Keep a Changelog puro — match patterns CLAUDE.md). Critérios de aceite por maquina cumpridos: 4 arquivos nao-vazios, `[5.3.0]` em CHANGELOG, zero placeholders. **Plano 05 COMPLETO (5/5 fases efetivas). Onda 1 v5.3 ENCERRADA.** Sem commits ainda — aguardando decisao do dev.

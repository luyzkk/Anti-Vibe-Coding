# Plano 04: Atoms T3 + INDEX Final + Audit Humano + E2E Full

**Feature:** Stack Knowledge Python ([PLAN overview](../PLAN.md))
**Fases:** 7 (fase-01 a fase-07)
**Sizing total:** ~10.5h nominal (envelope ~10-12h do PLAN; fase-06 depende da agenda do dev)
**Depende de:** Plano 03 (15 átomos T1+T2 commitados, verifier-report-plano03 como formato, protocolo calibrado por 3 planos)
**Desbloqueia:** — (é o plano que FECHA a entrega v7.7.0)

---

## O que este plano entrega

A feature completa e mergeável: os 3 átomos T3 (`background-jobs-and-queues`,
`debugging-pdb-debugpy`, `graphql-grpc-contracts`) fecham os 18/18; o `INDEX.md` final
consolidado roteia as 7 skills cross-stack (CA-05) e alimenta o preview de keywords (RF15);
a entrada MIT do python-debugpy entra no NOTICES (RF7); o audit humano dos 3 átomos D11 é
assinado no STATE.md (RF5/CA-08); e o e2e full + regressão global + CHANGELOG v7.7.0 +
migração para `completed/` encerram os 4 planos com PR final.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| 15 átomos commitados (piloto + 5 T1 + 9 T2) em `knowledge/python/atoms/` | Planos 01-03 | pendente (verificar com `ls` + `git log`) |
| `verifier-report-plano03.md` (formato de relatório a reusar na fase-05) | Plano 03 fase-10 | pendente |
| Protocolo extrator + verifier calibrado (ajustes registrados) | `plano03/MEMORY.md` "Notas para Planos Seguintes" | pendente |
| Resultado do rastreio ECC (RF12) — o closeout da fase-07 cita | `plano02/MEMORY.md` | pendente |
| Fixtures Python + tracer e2e (`python-fastapi-fixture`, `python-requirements-fixture`) | Plano 01 fase-04 | pendente |
| Warning legado + campo `warnings` no result (o RF14 estende a mesma região) | Plano 01 fase-05 | pendente |
| Átomos flagged `security-fastapi-owasp` e `sqlalchemy-async-and-orm` (audit D11) | Plano 02 fase-05 + Plano 03 fase-03 | pendente |
| Fontes T3 congeladas em `Infos/knowledge/Python/` (gitignored) | Triagem do PRD | pronto |
| Compound lessons anti-drift + verifier refined | `docs/compound/2026-05-16-*.md` | pronto (regression obrigatória) |

**Pré-flight obrigatório** (lição `feedback_verify_memory_vs_code`): antes da Wave 1, verificar
NO CÓDIGO que as precondições dos Planos 01-03 foram commitadas — `git log --oneline` na branch
base + `ls knowledge/python/atoms/` (15 átomos presentes) + `bun test` verde + grep
`flagged_for_human_audit: true` retornando exatamente 2 átomos (security + sqlalchemy).
Não confiar apenas nos MEMORYs.

### Produz para (quem consome o output deste plano)

| O que | Quem consome |
|-------|-------------|
| 18/18 átomos + INDEX final em `knowledge/python/` | Todo `/init` em projeto Python (v7.7.0) |
| `tests/e2e/stack-knowledge-python-full.test.ts` | Suite de regressão permanente (CA-09 das próximas stacks) |
| Entrada MIT python-debugpy no `THIRD-PARTY-NOTICES.md` | Obrigação de licença (RF7) |
| Assinaturas de audit no STATE.md + `verifier-report-plano04.md` | Rastreabilidade CA-08 |
| Débito RF17 (schema Next) no TODO.md + avaliação de tier RF16 no MEMORY | Backlog pós-feature |
| CHANGELOG v7.7.0 + bump + pasta migrada para `completed/` | Release da versão |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-background-jobs-and-queues.md | Átomo T3 filas/jobs (3 fontes; dedup piloto async + errors) | S ~1.5h | Plano 03 (Wave 1 — independente de 02-03) |
| 02 | fase-02-debugging-pdb-debugpy.md | Átomo T3 debugging (**flagged audit D11**, limpeza Hermes R6/CA-10) + entrada MIT no NOTICES (RF7) | S ~1.5h | Plano 03 (Wave 1) |
| 03 | fase-03-graphql-grpc-contracts.md | Átomo T3 GraphQL/gRPC/tRPC (D6) + flag revisão de tier (RF16) | S ~1h | Plano 03 (Wave 1) |
| 04 | fase-04-index-final-e-nota-django-flask.md | INDEX.md final consolidado (RF1/CA-05) + nota Django/Flask (RF14, could-have) + teste preview keywords (RF15) | M ~2h | fases 01-03 (INDEX lista os 18) |
| 05 | fase-05-verifier-batch-t3.md | Verifier refined 3/3 ≥80% + checks direcionados + `verifier-report-plano04.md` | ~1.5h | fases 01-03 (paralelizável com a 04) |
| 06 | fase-06-audit-humano-luiz.md | Audit humano dos 3 átomos D11 + assinaturas no STATE.md + remoção das flags (RF5/CA-08) | ~1h (interação com dev) | fase-05 (verifier ANTES do audit) |
| 07 | fase-07-e2e-full-regressao-e-closeout.md | E2E full 18/18 (RF9) + regressão global (CA-09) + RF17 + CHANGELOG v7.7.0 + STATE + migração + PR final | M ~2h | fase-04 + fase-06 (fan-in final) |

Sizing nominal: ~10.5h. G12 (gate de loop do verifier) protege o envelope na fase-05; a
fase-06 é o único ponto com dependência humana síncrona — agendar com o dev antes de iniciar.

---

## Grafo de Fases

```
                 Plano 03 completo (15/18 átomos + verifier calibrado)
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
          v                           v                           v
      fase-01                     fase-02                     fase-03        <-- WAVE 1 (paralela)
   (jobs/queues)          (debugging + NOTICES,           (graphql/grpc,        commit 1
                              audit D11)                    RF16)
          |                           |                           |
          +---------------------------+---------------------------+
                     |                              |
                     v                              v
                 fase-04                        fase-05          <-- paralelizáveis entre si
          (INDEX final + RF14/RF15)        (verifier batch T3)       commit 2 | commit 3 (parcial)
                     |                              |
                     |                              v
                     |                          fase-06          <-- audit humano (dev na sessão)
                     |                    (assinaturas STATE.md)
                     |                              |
                     +---------------+--------------+
                                     |
                                     v
                                 fase-07                         <-- FAN-IN FINAL
                  (e2e full + regressão + CHANGELOG + closeout)      commit 4 + PR
```

**Paralelismo possivel:**
- **Wave 1 = fases 01-03** — cada fase de átomo escreve 1 arquivo próprio em
  `knowledge/python/atoms/` (categoria "seguro paralelizar"); a fase-02 também toca
  `THIRD-PARTY-NOTICES.md` (arquivo exclusivo dela na wave — sem conflito).
- **fase-04 e fase-05 podem rodar em paralelo** — a 04 escreve INDEX + código RF14/RF15; a 05
  é read-only sobre os átomos + escreve o report. Zero interseção de arquivos.
- **fase-06 é sequencial após a 05** (verifier fecha antes do humano entrar) e **interativa** —
  não delegar a subagente em background (G21).
- **fase-07 é fan-in final** — só inicia com 04 e 06 fechadas.
- `bun run harness:validate` verde após a Wave 1 e após cada fase que commita (G10).

---

## TDD Strategy

```
Fases 01-03 (conteúdo — test-after com gate próprio):
1. EXTRAIR: subagente com anti-drift clause VERBATIM escreve o átomo
2. CHECK ESTRUTURAL: cap 200, 4 seções, frontmatter, zero placeholders (por máquina, na fase)
3. GATE DE FIDELIDADE: verifier refined batch na fase-05 (≥80% por átomo) + checks direcionados
4. GATE HUMANO: fase-06 audita os 3 átomos D11 (fecha o loop R3)

Fase-04 (código RF14 + teste RF15): RED → GREEN clássico (helper de nota Django/Flask)
Fase-07 (e2e): espelho do rails-full — nasce contra código pronto; VERMELHO = defeito real
```

- **Tracer Bullet deste plano:** N/A (tracer foi Plano 01; este plano fecha contra o e2e full).

---

## Gotchas Conhecidos

G1-G17 herdados dos Planos 02-03 (mesma numeração — as fases referenciam por ID);
G18-G26 são novos deste plano.

- **G1 — `Infos/` é gitignored:** fontes ficam locais; só o destilado vai ao repo. Nunca
  `git add Infos/` (lição feedback_git_repo_scope). Paths em `sources:` referenciam arquivos
  gitignored de propósito — audit trail local (RF13).
- **G2 — Anti-drift + verifier VERBATIM (R8):** os textos das duas compound lessons entram
  copiados literalmente em TODOS os prompts de extrator (fases 01-03) e no prompt do verifier
  (fase-05) — não parafrasear. Fontes canônicas:
  `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` +
  `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`.
- **G3 — Claims "contestado" nunca viram regra dura:** vira nota em Critérios de decisão ou é
  omitida. Neste plano os casos visíveis são os Conflitos abertos das fontes (REST vs GraphQL,
  REST vs gRPC, BackgroundTasks vs fila) — viram Critérios de decisão honestos, sem threshold
  inventado.
- **G4 — Normalização de versões:** divergência entre fontes → a mais recente citada; conflito
  real vira nota em Critérios de decisão. Versões FastAPI inline no corpo (D9).
- **G5 — Cap 200 hard:** verifier rejeita corpo >200 linhas. Excedente → `TODO.md` (precedente
  R8 Next).
- **G7 — `updated:` com data real de execução:** não copiar `2026-08-30` do planejamento.
- **G8 — Campo extra `flagged_for_human_audit` passa no validador** (ignora campos
  desconhecidos). A fase-02 usa; a fase-06 REMOVE das aprovadas.
- **G9 — Branch + PR sempre:** todo o plano roda em `feat/stack-knowledge-python-plano04`;
  nunca commit direto na main. PR final na fase-07.
- **G10 — `bun run harness:validate` após cada wave/fase que commita, antes do commit.**
- **G11 (encerrado nesta fase-04):** nas fases 01-03 continua valendo — átomo NÃO toca o
  INDEX.md. A fase-04 é a DONA do INDEX e o consolida de uma vez.
- **G12 — Gate de loop do verifier:** se ≥2 dos 3 átomos falharem a v1 na fase-05, PARAR e
  revisar prompt do verifier / suspeitar de drift de extrator antes de v2.
- **G15 (espelhado) — Fronteira GraphQL:** no Plano 03 a regra era "GraphQL NÃO entra no
  api-design"; aqui é o inverso — a fase-03 destila SÓ a seção `## GraphQL e RPC` do report3
  e NADA de REST genérico. Grep de conferência na fase e na fase-05.
- **G17 — Dedup cross-átomo referencia, não duplica:** mapa deste plano —
  fase-01 → piloto `async-and-concurrency` (mecanismo TaskGroup/event loop/threadpool fica lá;
  aqui o ECOSSISTEMA de filas/jobs) + `errors-logging-observability` (compass 9b12d328 §14 é
  fonte compartilhada: lá o ângulo de error handling; aqui a configuração operacional de fila);
  fase-02 → `pytest-and-testing-strategy` (estratégia de teste fica lá; aqui só o gancho
  `--pdb`/`--trace`);
  fase-03 → `api-design-and-contracts` (REST/versionamento/paginação REST ficam lá).
- **G18 — INDEX final DEVE começar com H1 na linha 1:** `getStackKnowledgePreface`
  (`skills/security/lib/stack-aware-preface.ts:37`) retorna `''` se o arquivo não começar com
  `# `. O INDEX Rails começa com comentário HTML e perde o preface (defeito documentado no
  rails-full CA-05). O INDEX Python final corrige isso: H1 primeiro, comentário de provenance
  DEPOIS. CA-05 e o e2e full da fase-07 dependem disso.
- **G19 — Orçamento de linhas do INDEX:** cap ≤100 hard com 18 átomos (Rails: 98 linhas com
  14). Entradas de 1 linha por átomo em cada seção; sem prosa redundante entre seções.
- **G20 — Limpeza Hermes (fase-02):** a fonte MIT mistura conteúdo genérico aproveitável com
  contexto proprietário (runner, gateway, workers). Remoção TOTAL das referências proprietárias
  + generalização dos recipes; CA-10 grep = zero é gate da fase E recheck na fase-05.
- **G21 — Audit humano é interativo:** fase-06 exige o dev na sessão, 1 átomo por vez, com as
  fontes abertas. NÃO rodar como subagente batch; não "aprovar em nome do dev".
- **G22 — E2E full asserta 18 hardcoded:** diferente do tracer (G5 do Plano 01: `>=1`), o
  e2e full valida a contagem exata 18 + INDEX ≤100 linhas. É a fotografia final da matrix.
- **G23 — Migração para `completed/` valida depois do move:** rodar `bun run harness:validate`
  APÓS mover a pasta (link checker + orphan-plan-detector reagem a paths). Ajustar links
  relativos se o validador apontar.
- **G24 — Lacuna declarada da fonte de jobs:** report2 registra explicitamente que "fila
  dominante" NÃO é demonstrável — a única regra forte é "BackgroundTasks não substitui fila
  durável". O átomo da fase-01 não pode afirmar superioridade de Celery/Dramatiq/etc.
- **G25 — RF16 é flag, não re-extração:** a avaliação de tier do `graphql-grpc-contracts`
  (manter T3 / propor T2) é registrada no MEMORY.md pelo executor da fase-03; a decisão de
  promover é do dev e, se ocorrer, muda só frontmatter `tier:` + INDEX (fase-04 confere).
- **G26 — RF14 é could-have:** se o envelope apertar, cortar a nota Django/Flask INTEIRA sem
  afetar o core (registrar DEV no MEMORY). Nunca entregar RF14 pela metade (helper sem
  integração ou vice-versa).

---

## Commits deste plano

| Commit | Conteúdo | Pré-condição |
|--------|----------|--------------|
| 1 | Wave 1: átomos das fases 01-03 + entrada MIT no NOTICES (fase-02) + TODO.md (excedentes de cap, se houver) | `bun run harness:validate` verde + checks estruturais das 3 fases + grep CA-10 zero |
| 2 | fase-04: INDEX final + helper/teste RF14 + teste RF15 | INDEX ≤100 linhas + `bun test` + typecheck verdes |
| 3 | fases 05-06: `verifier-report-plano04.md` + rework pós-verifier + fixes de audit + STATE.md assinado + remoção de flags | verifier 3/3 PASS + audit APROVADO nos 3 átomos |
| 4 | fase-07: e2e full + CHANGELOG v7.7.0 + bump + TODO.md (RF17) + STATE.md final + migração `completed/` | suite completa verde (CA-09) + Exit Criteria do PLAN fechado |

Commits 3 e 4 podem fundir num único commit de fechamento se os diffs forem pequenos
(regra do PLAN: fases 05-07 em 1-2 commits). Branch única
`feat/stack-knowledge-python-plano04` → PR final ao fim da fase-07.

---

<!-- Gerado por /plan-feature em 2026-08-30 -->

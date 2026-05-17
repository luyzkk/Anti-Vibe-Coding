# Plano 06: Atom Batch C + INDEX + Polish — 3 átomos tier 3 + CA-01..10

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2) ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~6-8h
**Depende de:** Plano 02 (`/init` multi-stack + telemetria + `--refresh-knowledge`), Plano 03 (7 skills wired com `stack-aware-preface`), Plano 04 (5 átomos Batch A populados), Plano 05 (5 átomos Batch B populados + RF8 primordials migrado)
**Desbloqueia:** Exit Criteria do PLAN.md (releases v6.3.2) — este é o último plano da feature; nenhum plano subsequente depende dele dentro deste PRD.

---

## O que este plano entrega

Fecha a v6.3.2: escreve os 3 átomos tier 3 (`performance-and-internals`, `operations-and-deploy`, `tooling`) totalizando os 14 átomos do matrix; substitui o INDEX skeleton do Plano 01 por um INDEX final consolidado com mapas por keyword, layer e tier; implementa os 2 Could Haves (RF10 preview de keywords no `/init`, RF11 audit-trail paths no frontmatter `sources:`); roda a matriz E2E completa de CA-01..CA-10 com gate `bun run harness:validate`; remove os work artifacts `_catalog.md` e `_topic-plan.md` apenas após todos os gates ficarem verdes.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| 11 átomos populados em `docs/knowledge/nodejs-typescript/atoms/` (1 piloto + 5 Batch A + 5 Batch B) | Plano 01 fase-02, Plano 04 fases 01-05, Plano 05 fases 01-05 | pendente |
| Verifier subagente PASS + auditoria humana OK para Batch A (DI-4 Plano 04 fase-06) | Plano 04 fase-06 | pendente |
| Verifier subagente PASS + auditoria humana OK para Batch B + RF8 primordials migrado (DI-5 Plano 05 fase-06) | Plano 05 fase-06 | pendente |
| `/init` multi-stack production-grade (primary+secondary, anchor_files, `--refresh-knowledge`, telemetria) | Plano 02 fases 01-05 | pendente |
| 7 skills cross-stack wired com `stack-aware-preface` (security do Plano 01 + 6 do Plano 03) | Plano 01 fase-04 + Plano 03 fases 01-02 | pendente |
| INDEX skeleton do Plano 01 em `docs/knowledge/nodejs-typescript/INDEX.md` | Plano 01 fase-01 | pendente |
| Schema final `.claude/stack.json` (primary, secondary, anchor_files, detected_at ISO 8601) | Plano 02 fase-02 | pendente |
| `STACK_ID_TO_MATRIX_FOLDER` estendido com todos os ids | Plano 02 fase-01 | pendente |
| Fontes em `claude-code/knowledge/Nodejs/wf-{compass-id}.md` para Batch C: `55c3ca89` (performance), `21a08436` (operations), `0058a9e6` (tooling) + rules v8-*/native-memory | `_catalog.md` | pronto |
| Skill `/init` (`skills/init/SKILL.md`) com pontos de extensão pós-`knowledge_copied` para RF10 | codebase v6.3.1 + extensões Plano 01/02 | pendente |
| `bun run harness:validate` aceitando subárvore `docs/knowledge/` | codebase v6.3.1 (suposição em PLAN.md§Assumptions) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| **Nenhum plano subsequente neste PRD.** Plano 06 fecha o ciclo da feature v6.3.2. | — |
| Padrão de INDEX consolidado (mapas keyword/layer/tier) | Stacks futuras Rails/Python/Go (v6.3.3+) replicarão este formato |
| Telemetria preview de keywords (RF10) | Pode virar base para futura skill `/show-stack-knowledge` ou similar (out-of-scope desta versão) |
| Veredito final v6.3.2 + lessons captured | `docs/compound/` (CLAUDE.md compound gate) — qualquer aprendizado durável do verifier false-positive ou drift de fonte vira lesson |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-performance-and-internals.md | átomo tier 3 ~150-180 ln (event loop deep, V8 hot paths, GC tuning, profiling, native-memory) | 1.5-2h | piloto (Plano 01 fase-02) |
| 02 | fase-02-operations-and-deploy.md | átomo tier 3 ~130-150 ln (PM2 vs systemd vs Docker, Cluster, graceful shutdown, 12-factor Node) | 1.5h | piloto |
| 03 | fase-03-tooling.md | átomo tier 3 ~120-140 ln (tsc/tsx/Bun/esbuild, biome vs eslint+prettier, monorepo tools, watch mode) | 1-1.5h | piloto |
| 04 | fase-04-index-final.md | INDEX.md final ≤100 ln (mapas por keyword/layer/tier dos 14 átomos) substituindo skeleton do Plano 01 | 1.5-2h | fase-01, 02, 03 + Planos 04 + 05 (todos os 14 átomos) |
| 05 | fase-05-rf10-rf11-could-haves.md | RF10 (preview top-N keywords no output `/init`) + RF11 (audit-trail paths em `sources:` verificado nos 14 átomos) | 1-1.5h | fase-04 + Plano 02 fase-04 (writer `/init`) |
| 06 | fase-06-e2e-and-cleanup.md | E2E CA-01..CA-10 + `bun run harness:validate` + cleanup destrutivo de `_catalog.md`/`_topic-plan.md` | 1-1.5h | fase-01..05 + todos os planos anteriores |

---

## Grafo de Fases

```
piloto (Plano 01 fase-02) + 10 átomos (Planos 04 + 05)
                       |
   +-------------------+-------------------+
   |                   |                   |
   v                   v                   v
fase-01            fase-02             fase-03
(performance)    (operations)         (tooling)
   |                   |                   |
   +-------------------+-------------------+
                       |
                       v
                  fase-04 (INDEX final consolidado — 14 átomos)
                       |
                       v
                  fase-05 (RF10 preview + RF11 audit-trail)
                       |
                       v
                  fase-06 (E2E CA-01..CA-10 + cleanup)
```

**Paralelismo possivel:** fases 01, 02 e 03 são independentes — todas dependem apenas do piloto e podem ser executadas em paralelo por subagentes extratores. Fase-04 só pode rodar após os 3 átomos tier 3 estarem escritos (e os 10 anteriores já aprovados nos Planos 04/05). Fases 05 e 06 são sequenciais (RF10 lê keywords do INDEX final; E2E precisa de todos os artefatos prontos).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Fases 01-03 são **content-only** (markdown puro, sem código TS novo): usam checklist de validação de conteúdo em vez de RED→GREEN, idêntico aos Planos 04-05 e à fase-02 do Plano 01 (átomo piloto).

Fase-04 é **content-only com gate por máquina** (INDEX gerado por agregação de frontmatters; verificação via `wc -l ≤100` + grep de cobertura de cada um dos 14 átomos em pelo menos uma seção; nenhum keyword órfão).

Fase-05 envolve **código TS real** no módulo do `/init` que renderiza o output do `knowledge_copied` → segue TDD rigoroso (RED escreve teste asserindo preview de keywords no output; GREEN implementa parser de INDEX + format; REFACTOR mantém ≤10ms de overhead). RF11 é validação por snapshot — se os Planos 04/05 já preencheram audit-trail paths em `sources:`, RF11 vira no-op verificável; se não, fase-05 adiciona.

Fase-06 é **gate de processo** (executa E2E pré-existentes + asserta cleanup) — checklist de comandos com critério de aceite por máquina.

**Tracer Bullet deste plano:** N/A — o tracer arquitetural vive no Plano 01 fase-05 e já validou matrix → init → projeto → skill end-to-end. Plano 06 é fechamento (escala em conteúdo + INDEX + Could Haves + E2E final).

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases. **G1, G2, G3, G6 herdados de planos anteriores** reaparecem como pilares; G7-G10 são novos do polish/cleanup.

- **G1 — Formato copiado do piloto (zero drift, herdado de Planos 04/05 G1):** qualquer divergência em frontmatter (8 campos na ordem `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`) ou nas 5 seções do corpo (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas) invalida CA-01. Manter verbatim com o piloto (`docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md`). Aplica-se às fases 01, 02 e 03.

- **G2 — Cap de 200 linhas é asserado em cada átomo (herdado de Plano 04 G2):** se um átomo tier 3 passar de 200 linhas, sinal de granularidade errada — split em outro átomo ou condensar. Faixa saudável tier 3 deste batch: 120-180 linhas (per `_topic-plan.md:53-66`). Tooling tende a ser mais focado (~110-140); performance-and-internals é o maior risco de inchaço (cluster Q internals foi consolidado aqui).

- **G3 — Fontes brutas em `claude-code/knowledge/Nodejs/wf-{compass-id}.md` (herdado de Planos 04/05 G6):** frontmatter `sources:` aponta para o **compass-id** (sem path), não para o caminho do arquivo. O path absoluto é citado **no corpo** em "Referências externas" como audit trail (RF11). Para sources que são rules de skill package (ex: `v8-garbage-collection.md`), usar `- skill: nodejs-core/rules/{nome}.md`.

- **G6 — Overlaps com skills cross-stack (herdado de Planos 04/05 G5):** cada átomo cita `/skill-relacionada` em "Referências externas" para evitar duplicação. `performance-and-internals` complementa `/system-design` (princípios cross-stack de caching/scaling) e `/api-design` (N+1). `operations-and-deploy` complementa `/infrastructure` (12-factor, deploy patterns). `tooling` complementa `/architecture` e `/infrastructure` (CI cache, monorepo). Sempre que um pattern parecer cross-stack genérico, parar e linkar a skill — átomo deve ficar com ângulo Node+TS-específico.

- **G7 (novo) — INDEX final cobre exatamente 14 átomos, não 13 nem 15:** após Plano 04 (5), Plano 05 (5), piloto (1) e Plano 06 fases 01-03 (3), há **14** átomos. Se o INDEX final listar 13 (esqueceu o piloto na consolidação) ou 15 (incluiu um átomo fantasma — ex: primordials, que foi migrado inline em security-stack-specific, NÃO virou átomo separado em RF8/D12), CA-01 falha. Fase-04 começa por `ls docs/knowledge/nodejs-typescript/atoms/*.md | wc -l` e asserta `14`.

- **G8 (novo) — Verifier dos Planos 04+05 NÃO cobre os tier 3 deste plano:** o verifier subagente rodou em Batch A (5 átomos) e Batch B (5 átomos) com auditoria humana parcial. **Plano 06 cobre apenas os 3 tier 3 escritos aqui** (fase-01..03) via verifier opcional + auditoria humana CA-08 com a regra **literal do PRD**: 1 tier 1 (reusar amostra do Batch A) + 1 tier 2 (reusar amostra do Batch A ou B) + 1 tier 3 (escolher 1 dos 3 escritos aqui — sugestão: `performance-and-internals` por maior risco de drift de internals). Documentar em MEMORY.md como DI-1 ao executar a fase-06.

- **G9 (novo) — Remoção de `_catalog.md` e `_topic-plan.md` é destrutiva e final:** os work artifacts vivem em `docs/knowledge/nodejs-typescript/_catalog.md` e `_topic-plan.md`. Eles são referenciados durante toda a feature como fonte de verdade para cluster→skill e tamanho-alvo. **Só deletar após CA-01..10 verdes E `bun run harness:validate` verde E DI-1 (auditoria humana CA-08) aprovada**. Se algum gate falhar, **NÃO deletar** — registrar falha em MEMORY.md e abrir retrabalho. Cleanup é o último passo da fase-06.

- **G10 (novo) — CA-10 regression coverage exige fixture de baseline pré-v6.3.2:** CA-10 ("`/init` mantém UX atual além do output novo sobre stack") só é validável se houver baseline observável. Fase-06 cria fixture mínima de projeto sem nenhuma das mudanças (greenfield TS) e roda `/init` capturando output; compara contra snapshot da UX pré-v6.3.2 (texto esperado: scaffold de `docs/`, mensagem de `detected_stack: node-ts` em STATE.md, sem crashes). O delta esperado é **apenas adição** das linhas novas (`stack.json created`, `Knowledge copied: 14 atoms`, preview de keywords RF10). Qualquer remoção/alteração de linha existente = regressão.

- **G11 (novo) — RF11 pode já ter sido cumprido nos Planos 04/05:** quando os átomos foram escritos, o frontmatter `sources:` provavelmente já recebeu audit-trail-paths (`- research: 55c3ca89 (claude-code/knowledge/Nodejs/wf-55c3ca89.md)`). Fase-05 começa por **auditar** se RF11 já está cumprido. Se sim, RF11 vira no-op verificável (snapshot test confirmando que todos os 14 átomos têm path absoluto nas sources). Se não, fase-05 adiciona — sem reescrever frontmatter, apenas anexando o caminho entre parênteses no value de cada source.

### Nota explícita sobre auditoria humana CA-08 (registrar em MEMORY.md como DI-1 ao executar)

PRD CA-08 (linha 242) usa regra literal: **"1 tier 1 + 1 tier 2 + 1 tier 3"**.

- **Plano 04 fase-06** operacionalizou como "1 tier 1 + 1 tier 2 + 1 tier 2 alternativo" (DI-3 do Plano 04) porque Batch A não tem tier 3.
- **Plano 05 fase-06** operacionalizou como "1 thin + 2 tier 2 distintos" (DI-3 do Plano 05) porque Batch B não tem tier 1 nem tier 3.
- **Plano 06 fase-06** é o ÚNICO momento onde a regra literal do PRD pode ser cumprida — Batch C tem 3 tier 3.

Operacionalização para Plano 06 fase-06:
- **Tier 3** (obrigatório, originário deste plano): escolher 1 dos 3 átomos escritos aqui — sugestão `performance-and-internals.md` (cluster Q internals + V8 + GC tem maior risco de drift de fonte vs claim).
- **Tier 1 reusada** (por amostragem cruzada, do Batch A — não re-auditar arquivo, apenas conferir que o DI-4 Plano 04 marcou PASS e a amostra usada lá serve aqui): `async-concurrency-streams.md` OU `error-handling-observability.md` (cobertos pelo verifier Batch A). O piloto `type-system-idioms.md` (também tier 1) também é elegível se a auditoria do Plano 04 não cobriu ele.
- **Tier 2 reusada** (por amostragem cruzada, do Batch A ou Batch B): qualquer um dos átomos tier 2 já auditados nos Planos 04 ou 05 — preferir um que NÃO tenha sido amostrado anteriormente para alargar cobertura.
- DI-1 do Plano 06 registra: amostragem escolhida + data + auditor + veredito final v6.3.2.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

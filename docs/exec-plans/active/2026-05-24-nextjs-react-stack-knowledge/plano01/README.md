# Plano 01: Infra + Detector + Tracer Bullet (com fase-00 pré-RED + piloto + anti-drift regression)

**Feature:** Next.js + React Stack Knowledge ([PLAN overview](../PLAN.md))
**Fases:** 6 (fase-00 a fase-05)
**Sizing total:** ~12.5h
**Depende de:** Nenhum (primeiro plano da feature)
**Desbloqueia:** Plano 02 (Atoms Feature-driven Next — 6 atoms em EN) e Plano 03 (Cross-cutting + React + Integrations + INDEX final)

---

## O que este plano entrega

Slice end-to-end mínimo: fase-00 pré-RED audita ~9 testes que assertam `'nodejs-typescript'`/`'node-ts'` em projeto Next.js (resolve R1 via D17); scaffold `knowledge/nextjs/` com INDEX skeleton em EN (D15/D16); `THIRD-PARTY-NOTICES.md` com texto MIT verbatim (D14/RF-15, resolve R6); piloto T1 `app-router-and-layouts.md` em EN com anti-drift clause + verifier refined como regression desde aqui (R3-A); detector ajuste **atômico** em 4 arquivos coordenados (RF-02/03/04, mitiga R4); fixture `nextjs-app-router-fixture/` Next 14 mínimo + E2E `init-v7-nextjs-tracer-bullet.test.ts` provando `primary='nextjs'` e cópia de `INDEX.md` + piloto para `.claude/knowledge/`. Valida arquitetura ponta-a-ponta ANTES de investir nos 14 atoms restantes.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| PRD aprovado com 17 decisões (D1-D17) | [../PRD.md](../PRD.md) + [../CONTEXT.md](../CONTEXT.md) | pronto |
| Infra Node v6.3.3 (`runStackKnowledgeInit`, `copyKnowledge`, `getStackKnowledgePreface`, telemetria, `MATRIX_FOLDER_VALUES`, `--refresh-knowledge`) | `docs/exec-plans/completed/2026-05-16-stack-knowledge-nodejs-typescript/` + `2026-05-18-stack-knowledge-rails/` | pronto |
| Helper `NEXTJS_CANDIDATES` em [stack-aware-input-paths.ts](../../../../skills/init/lib/stack-aware-input-paths.ts) | codebase | pronto (linha 52 — apenas precisa `pickStaticMap('react')` ramificar para ele em fase-04) |
| Probe `probeNextjs` em [detect-stack.ts](../../../../skills/init/lib/detect-stack.ts) (regex `'next' in deps`, linha 71-82) | codebase | pronto — RF-03 adiciona `probeReact` sem mexer em probeNextjs |
| Compound lesson anti-drift | [docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md](../../../../docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md) | pronto (regra cole-literalmente no prompt do extrator em fase-03) |
| Compound lesson verifier refined | [docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md](../../../../docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md) | pronto (regra cole-literalmente no prompt do verifier em fase-03) |
| Padrão de E2E tracer | [tests/e2e/init-v7-tracer-bullet.test.ts](../../../../tests/e2e/init-v7-tracer-bullet.test.ts) + [tests/e2e/stack-knowledge-tracer-bullet.test.ts](../../../../tests/e2e/stack-knowledge-tracer-bullet.test.ts) | pronto — molde para fase-05 |
| Padrão de atom Rails (molde EN-adaptado) | [knowledge/rails/atoms/rails-conventions-and-magic.md](../../../../knowledge/rails/atoms/rails-conventions-and-magic.md) | pronto |
| Fonte MIT para NOTICES | [Infos/knowledge/NextJS/agent-skills-main/LICENSE](../../../../Infos/knowledge/NextJS/agent-skills-main/LICENSE) (note: `Infos/` está no .gitignore — verificado localmente) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `knowledge/nextjs/` (matrix folder + INDEX.md skeleton EN + `atoms/` populável) | Plano 02 (6 atoms feature-driven em EN) + Plano 03 (8 atoms cross-cutting/React/Integrations + INDEX final consolidado) |
| `THIRD-PARTY-NOTICES.md` (MIT + Copyright Addy Osmani + lista das 6 SKILL.md V2) | Já satisfaz CA-11 — nenhum plano subsequente toca o arquivo |
| `app-router-and-layouts.md` piloto T1 (≤200 linhas) + verifier report (≥80% rastreabilidade) | Plano 02 (não destila novamente este atom — apenas usa como referência de padrão); Plano 03 fase-06 (INDEX final referencia atom em `## By Cross-Stack Skill` → `/api-design`) |
| Anti-drift clause + verifier refined protocol validados no piloto (regression desde fase-03) | Plano 02 fase-01..06 (todos os prompts de extratores reusam o bloco verbatim); Plano 03 fase-01..05 (idem); Plano 02 fase-07 + Plano 03 fase-07 (verifier batch reusa protocolo) |
| Detector ajustado (StackId `'react'`, `probeReact`, mapping `nextjs→nextjs` e `react→nextjs`, `pickStaticMap('react')→NEXTJS_CANDIDATES`) | Plano 02 + Plano 03 (qualquer fixture Next/React detecta corretamente; pré-requisito para todos os E2E posteriores) |
| `tests/fixtures/nextjs-app-router-fixture/` (Next 14 mínimo, 5 arquivos) | Plano 03 fase-05 (fixture `nextjs-supabase-fixture/` deriva dela acrescentando `supabase/` + `@supabase/ssr`) |
| `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` (CA-01 + CA-02 + CA-03) | Plano 03 fase-07 (E2E supabase CA-06 reusa helpers); ZERO regressão validada por CA-10 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 00 | fase-00-pre-red-audit.md | `audit-report-fase00.md` (catálogo de ~9 arquivos) + assertions ajustadas ANTES do mapping change; suite verde no estado intermediário (esta fase NÃO toca código de produção) | 2h | — |
| 01 | fase-01-scaffold-nextjs-matrix.md | `knowledge/nextjs/INDEX.md` skeleton EN (cabeçalho `# Next.js + React Knowledge — Index`) + `knowledge/nextjs/atoms/.gitkeep` | 1h | — (paralela a fase-00 em teoria; sequencial na prática para clareza) |
| 02 | fase-02-third-party-notices.md | `THIRD-PARTY-NOTICES.md` na raiz do plugin com texto MIT verbatim + Copyright Addy Osmani + lista das 6 SKILL.md V2 (CA-11) | 0.5h | fase-01 |
| 03 | fase-03-pilot-atom-app-router.md | `knowledge/nextjs/atoms/app-router-and-layouts.md` (T1, ≤200 linhas, em EN, frontmatter completo) + verifier report ≥80% rastreabilidade (anti-drift + verifier refined regression desde aqui) | 3h | fase-01 |
| 04 | fase-04-detector-atomic-changes.md | 4 arquivos coordenados num único phase atômico: `stack-id-map.ts` + `detect-stack.ts` + `detect-multi-stack.ts` + `stack-aware-input-paths.ts` (RF-02/03/04); unit tests novos (probeReact, precedência, pickStaticMap('react')); zero regressão graças à fase-00 | 3h | fase-00 (testes ajustados), fase-01 (matrix folder existe para mapping resolver) |
| 05 | fase-05-fixture-and-tracer-bullet-e2e.md | `tests/fixtures/nextjs-app-router-fixture/` (5 arquivos Next 14) + `tests/e2e/init-v7-nextjs-tracer-bullet.test.ts` (CA-01 + CA-02 + CA-03; <500ms) | 3h | fase-01, fase-03 (piloto para copyKnowledge ter o que copiar), fase-04 (detector funciona) |

---

## Grafo de Fases

```
fase-00 (pre-RED audit)         fase-01 (scaffold knowledge/nextjs/)
       |                                       |
       |                                       v
       |                              fase-02 (THIRD-PARTY-NOTICES.md)
       |                                       |
       |                                       v
       |                              fase-03 (pilot atom + anti-drift regression)
       |                                       |
       +---------+ -------------+--------------+
                 |              |
                 v              v
              fase-04 (detector atomic changes — 4 arquivos)
                                |
                                v
                  fase-05 (fixture nextjs-app-router-fixture/ + E2E tracer)
```

**Paralelismo possivel:** fase-00 e fase-01 podem ser estudadas em paralelo (não compartilham arquivos — fase-00 toca tests/assertions, fase-01 cria diretório novo). Recomendação prática: sequencial fase-00 → fase-01 para clareza de fluxo. Fase-02 depende de fase-01 (NOTICES está acoplado à matrix; alternativa "raiz do plugin" também é OK). Fase-03 depende apenas de fase-01 (markdown puro). Fase-04 depende de fase-00 (testes ajustados ANTES) E fase-01 (matrix folder existe). Fase-05 fecha o ciclo e exige fase-01 + fase-03 (piloto existe) + fase-04 (detector funciona).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

Fases 01 e 02 são **content-only** (scaffold de markdown + NOTICES): usam checklist de validação em vez de RED→GREEN clássico. Fase-03 é content-only com verifier refined em vez de TDD. Fases 00, 04 e 05 seguem TDD rigoroso com `bun:test`:
- **fase-00:** RED inicial é o estado pós-grep (assertions atuais assertam mapping antigo); GREEN é ajustar assertions para o mapping futuro (`nextjs→nextjs`) MAS preservando comportamento atual (mapping change só ocorre em fase-04). O truque é desacoplar assertions para que aceitem o estado intermediário sem regredir.
- **fase-04:** RED = unit tests novos (probeReact, precedência, pickStaticMap('react')) falham; GREEN = aplicar as 4 mudanças coordenadas; REFACTOR = comments de provenance.
- **fase-05:** RED = E2E novo falha (fixture e teste não existem); GREEN = criar fixture + teste; assertions passam.

**Tracer Bullet deste plano:** fase-05 — o E2E fecha o ciclo (matrix populada → detector → init → projeto Next 14 recebe knowledge). Se fase-05 verde, arquitetura validada e Planos 02/03 podem escalar com segurança.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Anti-drift clause regression desde fase-03 (R3-A, compound lesson 2026-05-16):** o prompt do extrator do piloto DEVE conter o bloco "REGRA DE FIDELIDADE" colado verbatim do compound lesson [`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`](../../../../docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md). Não parafrasear, não resumir, não simplificar. Subagentes paralelos do Plano 02/03 herdam essa cláusula — fase-03 estabelece o protocolo, todas as próximas reusam. Se subagente entrega átomo com claims plausíveis mas não-rastreáveis, blocker: rework do prompt antes de re-rodar (verifier rejeita em fase-03 e em todos os batches subsequentes).

- **G2 — Hard cap 200 linhas é absoluto (R3-C):** o piloto `app-router-and-layouts.md` DEVE ter ≤200 linhas no total (frontmatter + corpo). Se extrator entrega 230 linhas, NÃO "aceitar com nota". Re-rodar com instrução de cortar (priorizar Senior patterns + Anti-patterns + Decision criteria; encolher When to consult + footers). Conteúdo excedente vira backlog em `TODO.md` futuro (R3-C — herança v6.4+). Verifier em fase-03 conta linhas e rejeita.

- **G3 — Precedência probeNextjs > probeReact é OBRIGATÓRIA (D6):** todo projeto Next.js tem typescript em devDeps E pode ter vite como dep transitiva (ex: storybook-vite). Sem precedência correta, projeto Next vira `primary: 'react'`. A ordem em `PROBES` deve ser literalmente `[probeNextjs, probeReact, probeNodeTs, probeRails, probeLaravel, probePython]` — nessa ordem exata. Teste explícito em fase-04: `'probeNextjs wins over probeReact when both present (monorepo edge)'`.

- **G4 — Monorepo Next+Vite gera `secondary: ['react']` redundante e isso É COMPORTAMENTO ESPERADO (R5, CA-03):** quando projeto tem `package.json#next` E `vite.config.ts` na raiz (caso raro de monorepo onde a raiz hosta um Next mas há packages vite-react), `probeNextjs` vence (primary='nextjs') E `probeReact` também bate (entra em secondary). O atom `app-router-and-layouts.md` documenta esta heurística como edge case esperado na seção dedicada. CA-03 assert `secondary inclui 'react'`. Telemetria captura ruído antes de codar fix — não tentar "consertar" desta vez.

- **G5 — `pickStaticMap('react')` DEVE retornar `NEXTJS_CANDIDATES` (R4):** se em fase-04 o switch case `'react'` for esquecido, projeto detectado como React puro (Vite) recebe paths vazios — `stackAwareInputPaths` retorna mapa vazio e os populate steps geram docs sem inputs. Mitigação: **unit test explícito** em fase-04 (`'pickStaticMap("react") returns NEXTJS_CANDIDATES'`) — entra no Review Checklist do plano (item R4 reforço).

- **G6 — fase-04 é ATÔMICA (não permitir merge parcial dos 4 arquivos):** as 4 mudanças (`stack-id-map.ts` + `detect-stack.ts` + `detect-multi-stack.ts` + `stack-aware-input-paths.ts`) precisam entrar juntas no mesmo commit. Se merger só `stack-id-map.ts` (que muda `STACK_ID_TO_MATRIX_FOLDER['nextjs']` de `'nodejs-typescript'` para `'nextjs'`), o sistema fica em estado inconsistente — projetos Next param de receber atoms Node-TS sem ter ainda atoms Next disponíveis. Resolva mergeando os 4 juntos. Se isso for inviável (revisão fragmentada), aplicar feature flag temporária — mas Plano 01 prefere atomicidade.

- **G7 — fase-00 ajusta APENAS testes/assertions, NÃO código de produção:** o objetivo de fase-00 é parametrizar/desacoplar assertions para que aceitem o mapping intermediário (`nextjs→nodejs-typescript` atual) E o futuro (`nextjs→nextjs`). A mudança de mapping só ocorre em fase-04. Se em fase-00 algum teste exigir mudança em código de produção para passar, RECUAR — provavelmente é um teste que já estava acoplado a um anti-padrão; tratar separadamente ou marcar `.skip` documentando como TODO da fase-04.

- **G8 — `probeReact` requer `react` em deps SEM `next` (D12 anchor refinado):** `vite.config.{ts,js,mjs}` isolado pode bater em projetos vue-vite, svelte-vite, etc. O probe DEVE confirmar `react` em `dependencies` ou `devDependencies` antes de retornar. Caso contrário, falso-positivo. Teste explícito em fase-04: `'probeReact does NOT match vite.config without react in deps'`.

- **G9 — Frontmatter `sources:` deve referenciar paths reais em `Infos/knowledge/NextJS/...` (audit trail):** o piloto cita as fontes destiladas. Importante: `Infos/` está no `.gitignore`, mas os paths no frontmatter funcionam como audit trail textual (não precisa do arquivo no repo para validar referência). Verifier checa que cada claim técnica é rastreável até ali — mesmo que o arquivo não esteja committado, o subagente extrator tem acesso local.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->

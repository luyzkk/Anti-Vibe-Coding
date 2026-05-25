# Plano 03: Cross-cutting + React + Integrations + INDEX final + audit humano

**Feature:** Next.js + React Stack Knowledge ([PLAN overview](../PLAN.md))
**Fases:** 7 (fase-01 a fase-07)
**Sizing total:** ~12-13h (7 extracoes content-only + 1 fixture+E2E + 1 INDEX final + 1 verifier batch + 1 audit humano)
**Depende de:** Plano 02 (Atoms Feature-driven Next em EN) — completo
**Desbloqueia:** Feature entregue (closeout — 15 atoms + INDEX final + NOTICES + tracer + fixture supabase, todos commitados)

---

## O que este plano entrega

Os 8 atoms restantes em `knowledge/nextjs/atoms/` (em **EN** per D15) cobrindo cross-cutting (security, performance, testing, ui, error-handling) + React conceitual (hooks-and-state, suspense-patterns) + Supabase integration T3; fixture variante `tests/fixtures/nextjs-supabase-fixture/` derivada da fixture base (Plano 01 fase-05) + E2E `init-v7-nextjs-supabase.test.ts` validando CA-06 (atom supabase carregado quando `hasSupabaseSignal()` bate); `INDEX.md` final consolidado em EN com `## By Cross-Stack Skill` (>=2 atoms por skill nas 4 skills cross-stack — CA-09), `## By Tier`, `## By keyword` (e parser `formatKnowledgePreview` ajustado para aceitar `By keyword` em EN — RF-11); verifier refined batch C audita os 8 atoms; audit humano Luiz dos 3 atoms flagged R3-B (`react-server-components` do Plano 02 fase-01 + `security-stack-specific` desta fase-01 + `supabase-integration` desta fase-05) com signature `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global da feature.

Resultado: feature completa (15 atoms + INDEX final + NOTICES + 2 fixtures + 2 tracers E2E) pronta para `/iterate` e cutover para `docs/exec-plans/completed/`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Matrix folder `knowledge/nextjs/` + `INDEX.md` skeleton EN (cabecalho `# Next.js + React Knowledge — Index` per D16) + `atoms/` populavel | Plano 01 fase-01 | esperado pronto |
| `THIRD-PARTY-NOTICES.md` (texto MIT + Copyright 2025 Addy Osmani + lista das 6 SKILL.md V2) | Plano 01 fase-02 | esperado pronto — Plano 03 NAO toca este arquivo |
| Detector ajustado (StackId `'react'`, `probeReact`, mapping `nextjs->nextjs`/`react->nextjs`, `pickStaticMap('react')->NEXTJS_CANDIDATES`) | Plano 01 fase-04 | esperado pronto — fixture supabase desta fase-05 e E2E CA-06 dependem |
| Fixture base `tests/fixtures/nextjs-app-router-fixture/` (Next 14 minimo, 5 arquivos) | Plano 01 fase-05 | esperado pronto — fixture supabase desta fase-05 deriva acrescentando `supabase/` + `@supabase/ssr` em deps |
| Piloto `app-router-and-layouts.md` (T1, <=200 linhas, EN, frontmatter completo) | Plano 01 fase-03 | esperado pronto — molde de tom/densidade/estrutura para os 8 atoms desta wave |
| 6 atoms feature-driven do Plano 02 (`react-server-components.md`, `server-actions-and-mutations.md`, `middleware-and-edge.md`, `data-fetching-and-cache.md`, `rendering-strategies.md`, `pages-router-migration-tips.md`) | Plano 02 fase-01..06 + verifier batch fase-07 | esperado pronto — INDEX final da fase-06 mapeia estes em `## By Cross-Stack Skill` |
| Verifier report do Plano 02 (`verifier-report-plano02.md`) | Plano 02 fase-07 | esperado pronto — input para audit humano de `react-server-components` na fase-07 deste plano |
| Anti-drift clause + verifier refined protocol regression (compound lessons 2026-05-16) | Plano 01 fase-03 (introduziu) | esperado pronto — Plano 03 reusa bloco VERBATIM em TODOS os prompts (extratores 01-05 + verifier batch 07) |
| Helper `hasSupabaseSignal()` em [`skills/init/lib/stack-aware-input-paths.ts:446`](../../../../skills/init/lib/stack-aware-input-paths.ts#L446) (detecta pasta `supabase/` OU dep `@supabase/*`) | codebase | pronto |
| Helper `formatKnowledgePreview` + `parseTopKeywords` em [`skills/init/lib/format-knowledge-preview.ts`](../../../../skills/init/lib/format-knowledge-preview.ts) (regex atual: `## Por keyword` PT-BR only) | codebase | pronto — fase-06 atualiza regex para aceitar `Por\|By` (RF-11) |
| Padrao de E2E supabase (molde) | [`tests/e2e/init-v7-tracer-bullet.test.ts`](../../../../tests/e2e/init-v7-tracer-bullet.test.ts) + tracer Next base (Plano 01 fase-05) | pronto |
| Compound lessons (cole VERBATIM nos prompts) | [`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`](../../../../docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md) + [`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md`](../../../../docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md) | pronto |
| Material fonte (~900KB em `Infos/knowledge/NextJS/` — 14 deep-research + 6 SKILL.md V2; `nextjs-supabase-auth/SKILL.md` e fonte primaria para supabase atom) | repo local (`Infos/` no .gitignore) | pronto |
| Padrao de atom EN (frontmatter + 4 secoes) | Plano 01 fase-03 piloto + [`knowledge/nodejs-typescript/atoms/security-stack-specific.md`](../../../../knowledge/nodejs-typescript/atoms/security-stack-specific.md) (referencia de `sources:` frontmatter) + [`knowledge/rails/atoms/rails-conventions-and-magic.md`](../../../../knowledge/rails/atoms/rails-conventions-and-magic.md) (referencia de estrutura) + [`knowledge/rails/INDEX.md`](../../../../knowledge/rails/INDEX.md) (molde de layout INDEX final) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 8 atoms restantes em `knowledge/nextjs/atoms/` (security-stack-specific, react-hooks-and-state, performance-and-turbopack, testing-strategy, ui-and-styling, error-handling-observability, react-suspense-patterns, supabase-integration) | Feature entregue — nenhum plano consome diretamente |
| `INDEX.md` final consolidado em EN com mapping `## By Cross-Stack Skill` (>=2 atoms por skill nas 4 skills) | Skills cross-stack `/security`, `/react-patterns`, `/api-design`, `/system-design` via `getStackKnowledgePreface()` (sem mudanca de codigo nas skills — consumo agnostic) |
| `tests/fixtures/nextjs-supabase-fixture/` + `tests/e2e/init-v7-nextjs-supabase.test.ts` (CA-06) | CI/CD — zero regressao em re-execucoes futuras |
| Parser `parseTopKeywords` ajustado para aceitar `Por\|By` (RF-11) | `formatKnowledgePreview` chamada pelo `runStackKnowledgeInit` em qualquer projeto (preserva backward compat com Rails/Node-TS PT-BR) |
| STATE.md global da feature com `Aprovado por Luiz em YYYY-MM-DD` para 3 atoms flagged R3-B | Closeout `/iterate` — CHANGELOG + cutover para `docs/exec-plans/completed/` |
| Conteudo excedente >200 linhas (se houver — R3-C hard cap) — backlog em `TODO.md` | Iteracoes futuras |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-security-and-react-hooks.md | `knowledge/nextjs/atoms/security-stack-specific.md` (T1, EN, <=200 linhas, **flagged R3-B**) + `knowledge/nextjs/atoms/react-hooks-and-state.md` (T1, EN, <=200 linhas) | M (~2h) | Plano 02 (concluido — molde + protocolos) |
| 02 | fase-02-performance-and-testing.md | `knowledge/nextjs/atoms/performance-and-turbopack.md` (T2, EN, <=200 linhas) + `knowledge/nextjs/atoms/testing-strategy.md` (T2, EN, <=200 linhas) | M (~2h) | Plano 02 |
| 03 | fase-03-ui-styling-and-error-handling.md | `knowledge/nextjs/atoms/ui-and-styling.md` (T2, EN, <=200 linhas) + `knowledge/nextjs/atoms/error-handling-observability.md` (T2, EN, <=200 linhas) | M (~2h) | Plano 02 |
| 04 | fase-04-react-suspense-patterns.md | `knowledge/nextjs/atoms/react-suspense-patterns.md` (T2, EN, <=200 linhas) | S (~1.5h) | Plano 02 |
| 05 | fase-05-supabase-integration-and-fixture.md | `knowledge/nextjs/atoms/supabase-integration.md` (T3, EN, <=200 linhas, **flagged R3-B**) + `tests/fixtures/nextjs-supabase-fixture/` (derivada da fixture base; `supabase/` + `@supabase/ssr` em deps) + `tests/e2e/init-v7-nextjs-supabase.test.ts` (CA-06) | M (~2h) | Plano 01 fase-05 (fixture base + tracer molde) + Plano 02 |
| 06 | fase-06-index-final-consolidado.md | `knowledge/nextjs/INDEX.md` final (substitui skeleton; `## By Cross-Stack Skill` >=2 atoms por skill nas 4 skills cross-stack — CA-09; `## By Tier` + `## By keyword` em EN) + `skills/init/lib/format-knowledge-preview.ts` regex ajustada para aceitar `Por\|By` (RF-11) + teste novo em `format-knowledge-preview.test.ts` para `By keyword` | S (~1.5h) | fase-01..05 (todos os 8 atoms presentes para mapping) |
| 07 | fase-07-verifier-batch-and-human-audit.md | `verifier-report-plano03.md` (audita 8 atoms desta wave — APPROVE/REWORK) + STATE.md global da feature atualizado com signature humana `Aprovado por Luiz em YYYY-MM-DD` nos 3 atoms flagged R3-B (`react-server-components`, `security-stack-specific`, `supabase-integration`) | S (~1h verifier batch + sessao humana sincrona) | fase-01..06 (8 atoms + INDEX final presentes); fase-06 garante INDEX final que o verifier referencia |

**Sizing total:** 4 fases M (8h) + 3 fases S (4h) = **~12h** (alinhado com PLAN.md "12-14h"; ja inclui buffer).

**Sizing notation (skill "Task Sizing"):** XS=0.5h / S=1-1.5h / M=2h / L proibido. Atoms que combinam 2+ sources (SKILL.md V2 + deep-research; ex.: security combina nextjs-supabase-auth + compass artifact de security) = M. Atoms de 1 source curto ou audit/INDEX-only = S. Fase-05 inclui atom + fixture + E2E (3 entregaveis em sequencia) = M no limite superior.

---

## Grafo de Fases

```
fase-01 (security + hooks)   fase-02 (perf + testing)   fase-03 (ui + errors)   fase-04 (suspense)   fase-05 (supabase + fixture + E2E)
    |                              |                            |                       |                          |
    +------------------------------+----------------------------+-----------------------+--------------------------+
                                                          |
                                                          v
                                              fase-06 (INDEX final + parser RF-11)
                                                          |
                                                          v
                            fase-07 (verifier batch C + audit humano Luiz dos 3 atoms flagged R3-B)
```

**Paralelismo possivel:** fases 01-05 sao INDEPENDENTES e podem rodar em paralelo via `/execute-plan` wave (subagentes extrator paralelos, cada um isolado com seu source + frontmatter alvo + anti-drift clause verbatim — G1 e G8 do PRD). NAO compartilham arquivos. fase-05 cria fixture + E2E adicionalmente ao atom, mas independente das outras extracoes. fase-06 e SEQUENCIAL: aguarda os 8 atoms existirem em disco para o mapping `## By Cross-Stack Skill` ser construido. fase-07 e SEQUENCIAL: aguarda INDEX final + 8 atoms existirem; verifier batch C audita os 8 + sessao humana sincrona para os 3 atoms flagged.

**Recomendacao pratica:** se executar paralelo, lancar fases 01+02+03 num wave (3 extratores), depois 04+05 num segundo wave (limita carga e da espaco a fixture+E2E da fase-05 que e mais pesada). Se sequencial, ordem livre — sem dependencias entre extracoes 01-05.

---

## TDD Strategy

```
Atoms content-only NAO usam ciclo RED-GREEN-REFACTOR classico.
Em vez disso: extracao -> verifier refined -> APPROVE/REWORK por atom.

Ciclo por fase (01-04, e atom-only de 05):
1. EXTRACT: subagente extrator le source(s) + frontmatter alvo + anti-drift clause VERBATIM
            -> produz atom markdown em knowledge/nextjs/atoms/{nome}.md
2. SELF-CHECK: extrator confirma <=200 linhas + 4 secoes presentes + sources: aponta paths reais
3. (verifier consolidado roda na fase-07)

Ciclo da fase-05 (atom + fixture + E2E):
1. EXTRACT atom supabase-integration.md (mesmo padrao das fases 01-04)
2. RED: criar fixture nextjs-supabase-fixture/ minima; escrever E2E init-v7-nextjs-supabase.test.ts
        com assert `atoms/supabase-integration.md` existe em `.claude/knowledge/atoms/` quando
        hasSupabaseSignal() bate; rodar `bun test init-v7-nextjs-supabase` -> FALHA porque
        atom ainda nao esta em copyKnowledge target (ou fixture nao tem supabase/)
3. GREEN: ajustar fixture (adicionar pasta supabase/ + @supabase/ssr em package.json deps);
        confirmar copyKnowledge copia o atom porque hasSupabaseSignal() retorna true; teste passa
4. REFACTOR: provenance comment no E2E (// 2026-05-24 (Luiz/dev): CA-06 do PRD)

Ciclo da fase-06 (INDEX + parser):
1. RED: novo teste em format-knowledge-preview.test.ts que escreve INDEX com `## By keyword`
        em vez de `## Por keyword` e chama parseTopKeywords -> FALHA porque regex atual e PT-BR only
2. GREEN: ajustar regex em format-knowledge-preview.ts de
        /##\s+Por\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i
        para
        /##\s+(?:Por|By)\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i
        Teste passa. Tests pre-existentes (PT-BR) continuam verdes.
3. REFACTOR: provenance comment + atualizar JSDoc do parseTopKeywords mencionando suporte EN
4. Escrever INDEX final consolidado mapeando os 15 atoms nas 4 skills cross-stack (CA-09)

Ciclo da fase-07 (verifier batch + audit humano):
1. AUDIT (verifier batch C): subagente verifier le os 8 atoms desta wave + compound lesson verbatim
          -> audita APENAS Senior patterns + Anti-patterns + Decision criteria
          -> amostra >=5 claims tecnicas por atom; tenta rastrear cada uma
          -> meta >=80% rastreaveis por atom
2. REPORT (verifier): gera verifier-report-plano03.md com 1 secao por atom (APPROVE ou REWORK)
3. DECIDE: APPROVE -> STATE.md global marca `verified`; REWORK -> volta a fase correspondente
4. HUMAN AUDIT: sessao sincrona com Luiz revisando os 3 atoms flagged R3-B:
   - react-server-components (Plano 02 fase-01)
   - security-stack-specific (Plano 03 fase-01)
   - supabase-integration (Plano 03 fase-05)
   Luiz le cada um, valida que claims tecnicas (RSC boundaries, CSRF/auth patterns, RLS via SSR)
   correspondem ao seu entendimento + ao material em Infos/knowledge/NextJS/. Se aprovado, anota
   signature `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global da feature (3 linhas, uma por atom).
   Se rework, mesma instrucao cirurgica do fluxo verifier.
```

**Tracer Bullet deste plano:** N/A — o tracer bullet da feature inteira ja foi entregue no Plano 01 fase-05. Plano 03 e closeout (8 atoms restantes + INDEX final + audit humano + fixture supabase). Fase-05 atua como tracer parcial do caminho supabase (validando CA-06).

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases. Reusa nomenclatura dos Planos 01/02 quando aplicavel (G1=anti-drift, G2=hard cap, G3=idioma EN, G6=verifier-3-secoes, G7=Infos/ paths, G8=paralelismo).

- **G1 — Anti-drift clause regression desde Plano 01 fase-03 (R3-A, compound lesson 2026-05-16):** o prompt de TODOS os 7 subagentes extratores (fases 01 entrega 2 atoms = 2 extratores; fase-02 = 2; fase-03 = 2; fase-04 = 1; fase-05 = 1; total 8 extratores nesta wave) DEVE conter o bloco "REGRA DE FIDELIDADE" colado VERBATIM do compound lesson [`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`](../../../../docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md). NAO parafrasear, NAO resumir, NAO simplificar. Se subagente entrega atom com claims plausiveis mas nao-rastreaveis, blocker: rework do prompt antes de re-rodar. Verifier batch da fase-07 rejeita se claims falham >20% rastreabilidade.

- **G2 — Hard cap 200 linhas absoluto (R3-C):** cada atom DEVE ter <=200 linhas (frontmatter + corpo). Se extrator entrega 230 linhas, NAO "aceitar com nota". Re-rodar com instrucao de cortar (priorizar Senior patterns + Anti-patterns + Decision criteria; encolher When to consult + footers). Conteudo excedente vira backlog em `TODO.md` futuro (R3-C — heranca v6.4+). Verifier conta linhas e rejeita.

- **G3 — Idioma EN per D15:** atoms, INDEX final, e todas as 4 secoes em EN. Comentarios `.ts` em codigo de producao (RF-11 em format-knowledge-preview.ts, E2E supabase) permanecem PT-BR (padrao do plugin Anti-Vibe-Coding) seguindo formato `// 2026-05-24 (Luiz/dev): rationale + ref PRD`. Heterogeneidade Rails/Node-TS PT-BR + Next/React EN documentada no preambulo do INDEX final (Plano 01 fase-01 ja estabeleceu o preambulo; fase-06 deste plano apenas substitui o body).

- **G4 — Audit humano R3-B (3 atoms flagged):** resolvidos JUNTOS na fase-07 deste plano. Sao: `react-server-components` (vem do Plano 02 fase-01), `security-stack-specific` (desta fase-01) e `supabase-integration` (desta fase-05). Razao do flag: cada um cobre area onde claims plausiveis-mas-nao-rastreaveis sao mais provaveis mesmo com anti-drift clause (RSC e o conceito mais novo/contraintuitivo do Next; security cobre supercie ampla com vocabulario consagrado mas detalhes faceis de inventar; supabase e BaaS com APIs especificas onde sintaxes podem ser confundidas entre versoes). Signature `Aprovado por Luiz em YYYY-MM-DD` vai em STATE.md global da feature (NAO neste README ou MEMORY) — 3 linhas, uma por atom.

- **G5 — Frontmatter `next_versions` NAO se aplica em Plano 03:** todos atoms desta wave cobrem Next 14+ universalmente (security, performance, testing, ui, errors, hooks, suspense, supabase). Nenhum atom recebe `next_versions: ['>=15']` no frontmatter. Se algum atom desta wave tiver UMA claim Next 15-only (ex.: PPR mencionado de raspao em performance), marcar com comentario HTML inline `<!-- next_versions: >=15 -->` no inicio da claim/paragrafo — NAO inflar o frontmatter inteiro (D13 mantem `next_versions` no atom inteiro APENAS quando >=30% do conteudo e version-specific; ai entra rendering-strategies do Plano 02 fase-05).

- **G6 — Verifier audita APENAS 3 secoes tecnicas (compound lesson 2026-05-16-verifier-protocol-technical-sections-only):** "When to consult" e "Referencias externas" sao metadata editorial (use-case framing + audit trail) — NAO entram no audit de source-traceability. Verifier amostra >=5 claims SOMENTE de Senior patterns + Anti-patterns + Decision criteria por atom. Threshold: >=80% rastreaveis ao source declarado em `sources:`. Se verifier marcar false-negatives em When to consult, ajustar prompt do verifier (loop foi observado em Plano 04 do Node-TS wave — heranca). O prompt do verifier batch da fase-07 cola VERBATIM essa compound lesson.

- **G7 — `sources:` no frontmatter aponta para `Infos/knowledge/NextJS/...` mesmo com `Infos/` no .gitignore:** funciona como audit trail textual (paths nao precisam estar committados para a referencia ser valida). Subagente extrator tem acesso local ao material; verifier idem. Documentado em Plano 01 fase-03 G9 e Plano 02 G7. Formato: `sources:` aceita lista YAML com `- skill: <name> (caminho relativo da raiz do plugin)` para SKILL.md V2 e `- research: <wf-id> (caminho relativo)` para compass artifacts.

- **G8 — Paralelismo via /execute-plan wave herda anti-drift clause:** cada subagente extrator paralelo recebe sua copia do prompt (inclusive bloco verbatim da compound lesson). Plan-verifier do pipeline confere a presenca do bloco antes de aceitar batch. Se algum subagente "perde" o bloco (truncamento de contexto, edicao manual do prompt antes do lancamento), TODOS os 8 atoms desta wave precisam re-verificacao. Regressao desde piloto = pre-requisito nao-negociavel.

- **G9 — RF-11 parser regex e PT-BR only HOJE (descoberto durante planejamento):** `skills/init/lib/format-knowledge-preview.ts:29` usa regex `/##\s+Por\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i`. INDEX em EN com `## By keyword` NAO casa. Fase-06 deste plano AJUSTA o regex para aceitar `Por|By` (`/##\s+(?:Por|By)\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i`) E adiciona teste novo em `format-knowledge-preview.test.ts` validando o caminho EN. Backward compat: regex `(?:Por|By)` preserva matching para Rails/Node-TS INDEX PT-BR existentes (tests pre-existentes continuam verdes). Provenance comment obrigatorio no arquivo modificado: `// 2026-05-24 (Luiz/dev): aceitar 'By keyword' (EN) alem de 'Por keyword' (PT-BR) — RF-11 do PRD next-stack`.

- **G10 — `hasSupabaseSignal()` ja existe e e usado SO para Next (`primary === 'nextjs'`):** [`skills/init/lib/stack-aware-input-paths.ts:529`](../../../../skills/init/lib/stack-aware-input-paths.ts#L529) ja faz `primary === 'nextjs' && (await hasSupabaseSignal(cwd))`. NAO mudar este predicate na fase-05. A fixture supabase desta fase-05 deve resolver `primary === 'nextjs'` (via `package.json#dependencies.next` presente) E ativar o signal (via pasta `supabase/` na raiz OU dep `@supabase/ssr`). E2E asserta que `atoms/supabase-integration.md` aparece em `.claude/knowledge/atoms/` apos `runInit([])`. Atencao: o helper detecta pasta `supabase/` (sinal 1) OU dep `@supabase/*` (sinal 2) — fixture pode usar QUALQUER um dos dois; recomendacao: usar AMBOS (pasta vazia `supabase/.gitkeep` + dep `@supabase/ssr` no package.json) para cobrir os 2 codepaths num so teste.

- **G11 — Mapping `## By Cross-Stack Skill` deve ter >=2 atoms POR SKILL nas 4 skills (CA-09):** o INDEX final da fase-06 lista subsections `### For /security`, `### For /react-patterns`, `### For /api-design`, `### For /system-design`, cada uma com >=2 atoms. Mapping de referencia (validar contra os 15 atoms reais antes de escrever):
  - **/security:** `middleware-and-edge` (P02 fase-03) + `security-stack-specific` (P03 fase-01) — 2 atoms minimo ✓
  - **/react-patterns:** `react-server-components` (P02 fase-01) + `react-hooks-and-state` (P03 fase-01) + `react-suspense-patterns` (P03 fase-04) + `rendering-strategies` (P02 fase-05) — 4 atoms ✓
  - **/api-design:** `server-actions-and-mutations` (P02 fase-02) + `data-fetching-and-cache` (P02 fase-04) + `app-router-and-layouts` (P01 fase-03 piloto) — 3 atoms ✓
  - **/system-design:** `data-fetching-and-cache` (P02 fase-04) + `rendering-strategies` (P02 fase-05) + `performance-and-turbopack` (P03 fase-02) + `error-handling-observability` (P03 fase-03) — 4 atoms ✓
  Atoms podem aparecer em MAIS DE UMA skill (data-fetching aparece em /api-design E /system-design — esperado). Atoms T3 standalone (supabase-integration, pages-router-migration-tips) ficam apenas em `## By Tier` — sem skill cross-stack direta. Mapping completo cobrindo todas as 4 skills com folga acima do minimo (CA-09 cumprido).

- **G12 — Provenance comment OBRIGATORIO em mudancas .ts (Princípio universal #5):** fase-05 (E2E `init-v7-nextjs-supabase.test.ts`) e fase-06 (parser `format-knowledge-preview.ts`) tocam arquivos `.ts`. Cada bloco modificado leva comentario formato `// 2026-05-24 (Luiz/dev): rationale + ref PRD`. Sem isso, plan-verifier do pipeline rejeita a fase. Markdown (atoms + INDEX) NAO requer provenance comment porque ja tem frontmatter `updated:` cumprindo a mesma funcao.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-24 -->

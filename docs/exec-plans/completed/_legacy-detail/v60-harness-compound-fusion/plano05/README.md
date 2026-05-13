# Plano 05: Skill Migration + Hooks (6 skills + pre-mutation-gate + Compound Gate)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion ([PLAN overview](../PLAN.md))
**Fases:** 8
**Sizing total:** ~13.5h
**Depende de:** Plano 02 (Full Scaffold — manifest de templates v6, `docs/exec-plans/`, `docs/compound/`, `docs/design-docs/` ja existem no scaffold; `lib/scaffold-templates.ts`, `lib/inject-optional-section.ts` disponiveis)
**Desbloqueia:** Plano 06 (Agent-Native — D31 CRUD/D32 STATE.md/D33 completion signal estende as 6 skills migradas), Plano 07 (TODO.md + /todo-pick reusa helpers desta migracao), Plano 08 (Dog-food roda as 6 skills migradas no proprio plugin)

---

## O que este plano entrega

**6 skills migradas com zero breaking change de interface (D10)** + 1 hook novo + 1 gate convencional novo. Apos este plano, qualquer projeto recem-init no formato v6 (entregue por Plano 02) consegue rodar o pipeline completo `/lessons-learned`, `/decision-registry`, `/plan-feature`, `/quick-plan`, `/execute-plan`, `/iterate` escrevendo nos paths v6 (`docs/compound/`, `docs/design-docs/`, `docs/exec-plans/active|completed/`). Comandos antigos continuam funcionando — so o destino mudou. Pre-Mutation Gate (`hooks/pre-mutation-gate.cjs`, D4/M9) sugere skill apropriada quando detecta verbo de implementacao + ausencia de plano ativo, **sem bloquear** (R6). Compound Decision Gate (D17) integrado em `/iterate` pergunta se trabalho recem-concluido merece virar compound note antes de mover o plano para `completed/`.

Gating end-to-end (fase-08): script script-de-fuzz invocando as 6 skills com sintaxe v5.x retorna sucesso e produz output em paths v6 (CA-17 verbatim).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Estrutura `docs/exec-plans/{active,completed}/`, `docs/compound/`, `docs/design-docs/` no scaffold | Plano 02 fase-01 + fase-02 | pendente |
| Template manifest com paths v6 (define onde cada skill escreve) | Plano 02 fase-01 | pendente |
| Helper `lib/scaffold-templates.ts` (token replacement) | Plano 02 fase-02 | pendente |
| Helper `lib/inject-optional-section.ts` (Delivery Loop) — base para gate convencional injetar bloco em SKILL.md | Plano 02 fase-05 | pendente |
| Skill `/init` v6 funcional (rodar fixtures via init para validar zero breaking change) | Plano 02 fase-02 | pendente |
| `scripts/harness-validate.ts` minimal (rodar apos cada teste de skill para garantir estado valido) | Plano 01 fase-04 | pendente |
| 32 skills atuais com codigo TS+SKILL.md existente (sera modificado) | repo atual (`anti-vibe-coding/skills/`) | pronto |
| Fonte canonica das 4 sub-skills migrar: `skills/lessons-learned/`, `skills/decision-registry/`, `skills/iterate/`, `skills/plan-feature/`, `skills/quick-plan/`, `skills/execute-plan/` | repo atual | pronto |
| PRD com CA-14, CA-15, CA-16, CA-17, CA-18, CA-23, CA-24, CA-25, R5, R6, D4, D10, D17, D18, D26 | `../PRD.md` | pronto |
| Hook infraestrutura existente: `hooks/user-prompt-gate.cjs`, `hooks/hooks.json` registry | repo atual (`anti-vibe-coding/hooks/`) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|--------------|
| `lib/path-resolver-v6.ts` (resolve `docs/compound/`, `docs/design-docs/`, `docs/exec-plans/active|completed/` com fallback v5.x se path nao existe) | Plano 06 fase-05/06/07 (CRUD precisa do mesmo resolver), Plano 07 (todo-pick precisa de raiz do projeto) |
| 6 skills migradas (`skills/{lessons-learned,decision-registry,iterate,plan-feature,quick-plan,execute-plan}/SKILL.md` + helpers TS) | Plano 06 (estende com `--update`/`--delete`/`--revoke`), Plano 08 fase-04..07 (dog-food roda contra o proprio plugin) |
| `hooks/pre-mutation-gate.cjs` + registro em `hooks/hooks.json` | Plano 08 fase-01 (Camada 1 D29 ja contempla este hook) |
| Helper `lib/compound-decision-gate.ts` (texto + fluxo do gate em `/iterate`) | Plano 06 fase-02 (skills emitem completion signal que pode encadear com compound gate), Plano 08 fase-08 (validar exec-plans completados no dog-food disparam o gate) |
| Helper `lib/exec-plan-template.ts` (renderiza plano com 10 secoes D18) | Plano 06 fase-03 (STATE.md le secao "Validation Log" do template) |
| Template harmonizado (.tpl) com 10 secoes para `/plan-feature` + variante reduzida para `/quick-plan` | Plano 08 fase-04 (migracao de planos historicos preserva as 10 secoes ao reescrever) |
| Fixture `tests/fixtures/v6-with-plan/` (projeto v6 com plano ativo populado) | Plano 06 fase-04 (testa hook STATE.md em projeto com planos), Plano 07 fase-03 (todo-pick precisa de fixture realista) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-lessons-learned-migracao.md | `/lessons-learned` escreve em `docs/compound/YYYY-MM-DD-{slug}.md` com frontmatter `title/category/tags/created` + secoes Problem/Solution/Prevention (CA-14) | 1.5h | — (independente; helper `lib/path-resolver-v6.ts` criado aqui) |
| 02 | fase-02-decision-registry-migracao.md | `/decision-registry` escreve em `docs/design-docs/ADR-NNNN-{slug}.md` com numeracao monotonica (CA-15) | 1.5h | fase-01 (compartilha `lib/path-resolver-v6.ts`) |
| 03 | fase-03-plan-feature-template-harmonizado.md | `/plan-feature` gera plano em `docs/exec-plans/active/` com **10 secoes** D18 (Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria) (CA-18) | 2h | fase-02 (path-resolver consolidado) |
| 04 | fase-04-quick-plan-template-harmonizado.md | `/quick-plan` gera mini-plano com **7 secoes reduzidas** (versao light do template fase-03) | 1h | fase-03 (reusa `lib/exec-plan-template.ts`) |
| 05 | fase-05-execute-plan-paths-novos.md | `/execute-plan` le de `docs/exec-plans/active/`, ao concluir move arquivo para `docs/exec-plans/completed/` (mantem nome) | 2h | fase-03 (consome templates) |
| 06 | fase-06-iterate-compound-gate.md | `/iterate` dispara Compound Decision Gate antes de mover plano para `completed/`: pergunta "vale virar compound note?" (CA-16, CA-25) | 2h | fase-01 (cria compound note), fase-05 (move plano) |
| 07 | fase-07-pre-mutation-gate-hook.md | `hooks/pre-mutation-gate.cjs` UserPromptSubmit com heuristica D26 (verbos + paths + negative list); registrado em `hooks/hooks.json`; sugestivo, nao bloqueante (CA-23, CA-24) | 2h | — (independente; precisa apenas conhecer paths v6 — usa `lib/path-resolver-v6.ts` de fase-01) |
| 08 | fase-08-zero-breaking-change-tests.md | Script E2E `tests/zero-breaking-change.test.ts` invoca as 6 skills com sintaxe v5.x em fixture v6, valida que cada uma produz output em path v6 sem erro de interface (CA-17) | 1.5h | fase-01, 02, 03, 04, 05, 06 |

**Total:** 13.5h.

---

## Grafo de Fases

```
                    Plano 02 (Full Scaffold) — manifest + scaffold tree + helpers
                              |
                              v
          fase-01 (lessons-learned-migracao) ──┐
                              |                │ (path-resolver compartilhado)
                              v                │
          fase-02 (decision-registry-migracao) │
                              |                │
                              v                │
          fase-03 (plan-feature template 10s)  │     fase-07 (pre-mutation-gate-hook)
                              |                │           │
                              +-------+--------+           │ (independente)
                              |       |                    │
                              v       v                    │
                       fase-04   fase-05                   │
                       (quick-   (execute-plan paths)      │
                        plan)         |                    │
                              |       |                    │
                              |       v                    │
                              | fase-06 (iterate-compound-gate)
                              |       |                    │
                              +-------+--------------------+
                                              |
                                              v
                              fase-08 (zero-breaking-change-tests) ← GATING (CA-17)
```

**Paralelismo possivel:**
- **fase-01 e fase-07 sao 100% paralelas** (sub-agentes independentes). fase-07 (hook) so consome `lib/path-resolver-v6.ts` apos fase-01 criar — mas a interface do helper pode ser stub em paralelo. Recomendado: rodar fase-01 e fase-07 simultaneamente.
- **fase-02 serial apos fase-01** (path-resolver consolidado).
- **fase-04 paralela com fase-05** apos fase-03 (escrevem em arquivos disjuntos: `skills/quick-plan/` vs `skills/execute-plan/`).
- **fase-06 serial apos fase-05** (precisa do helper de mover plano para `completed/`).
- **fase-08 serial no final** (consome tudo).

### Decisao de ordem: por que fase-07 (hook) nao fica no fim

Hook eh estruturalmente independente das 6 skills (le filesystem, nao chama codigo de skill). Colocar fase-07 mais cedo permite:
1. Validar telemetria do hook em paralelo com migracao das skills (rate-limit, falsos positivos).
2. Dev pode rodar `/init` em fixture, abrir Claude Code e ver o hook injetando sugestao **antes** das skills estarem migradas — feedback rapido em UX.
3. Mitigacao R6 (fricção do hook) precisa de tempo de uso real — quanto antes integrado, mais cedo se ajusta a heuristica.

Trade-off: fase-08 (E2E) precisa do hook **desativado** durante testes (senao injeta sugestao em meio a fluxo automatizado). Documentar em fase-08 a flag `ANTI_VIBE_DISABLE_HOOKS=1`.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**TDD natural neste plano:**

- **fase-01 (lessons-learned)** — RED: fixture v6 com `docs/compound/` vazia, rodar `lessonsLearned.add({ title: 'foo', body: '...' })`, esperar arquivo `docs/compound/2026-05-12-foo.md` com frontmatter `title/category/tags/created`. Falha porque versao atual ainda escreve em `lessons-learned.md`. GREEN: detectar projeto v6 via `lib/path-resolver-v6.ts`, escrever no novo path com frontmatter.
- **fase-02 (decision-registry)** — RED: fixture com `docs/design-docs/` vazio, rodar `addDecision({ title: 'x', ... })`, esperar `ADR-0001-x.md`. Segundo add: `ADR-0002-y.md`. Falha porque counter colide ou path errado. GREEN: counter monotonico via leitura do diretorio.
- **fase-03 (plan-feature template)** — RED: rodar `/plan-feature` em fixture v6 e contar secoes H2 (`## `) do plano gerado — esperar **exatamente 10** matchs. Falha porque template atual tem ~6 secoes. GREEN: substituir template por harmonizado.
- **fase-04 (quick-plan)** — RED: rodar `/quick-plan` e contar secoes — esperar 7 (versao reduzida). Falha. GREEN: template light.
- **fase-05 (execute-plan)** — RED: simular conclusao de plano em `docs/exec-plans/active/foo.md`, esperar arquivo aparecer em `docs/exec-plans/completed/foo.md` e desaparecer de `active/`. Falha porque versao atual nao move. GREEN: `fs.rename` apos exit criteria check.
- **fase-06 (iterate-compound-gate)** — RED: simular `/iterate` em plano com `Exit Criteria` marcado, esperar prompt do compound gate (mock do user input retorna "Sim"); esperar criacao de `docs/compound/{date}-{slug}.md` E movimentacao para `completed/`. Falha porque gate nao existe. GREEN: integrar `lib/compound-decision-gate.ts` no fluxo.
- **fase-07 (pre-mutation-gate)** — RED: stdin do hook recebe `{ prompt: "implementar sistema de notificacoes", project_v6: true, active_plans: [] }`, esperar stdout JSON `{ inject: true, message: '...recomendo /plan-feature...' }`. Falha porque hook nao existe. GREEN: heuristica verbos + paths + negative list.
- **fase-08 (zero-breaking-change)** — RED: script invoca `lessonsLearned.add("foo")` (sintaxe v5.x — string posicional), esperar zero exception e arquivo criado em `docs/compound/`. Falha se algum parser pediu opcoes novas. GREEN: backward-compat na assinatura (`add(stringOrOpts)`).

**Tracer Bullet deste plano:** fase-08 (CA-17 verbatim — prova D10 funcionando para todas as 6 skills).

---

## Gotchas Conhecidos

- **G1 (D10 — zero breaking change preserva assinatura):** Skills atuais tem assinaturas como `lessonsLearned.add(title: string)` ou `decisionRegistry.add({ title, alternatives, ... })`. Mudar para forma so-object (`{ title, body, tags }`) quebra D10. **Politica:** aceitar **ambas** as assinaturas — se primeiro arg eh `string`, tratar como title posicional v5.x (defaults para `body=''`, `tags=[]`, `category='general'`); se eh objeto, usar v6. Documentar via JSDoc + provenance comment `// 2026-05-11 (Luiz/dev): backward-compat D10 — string posicional eh forma v5.x`.

- **G2 (path-resolver detecta v6 vs v5):** Helper `lib/path-resolver-v6.ts` precisa detectar se projeto eh v6 (`docs/compound/` existe) ou v5 (so `lessons-learned.md` ou nada). Se v6 → escreve no novo path. Se v5 → comportamento legado (appenda em `lessons-learned.md`). Se nenhum dos dois (projeto cru sem `/init`) → escreve em **v5 mode como default** (D10 puro: nao forcar v6 num projeto que nao optou). Documentar matriz: `[v6=docs/, v5=lessons-learned.md, cru=v5-default]`.

- **G3 (heuristica de skill-advisor pode duplicar com pre-mutation-gate):** Hook existente `hooks/user-prompt-gate.cjs` ja sugere skills em alguns padroes. **Politica em fase-07:** novo hook `pre-mutation-gate.cjs` so dispara se `user-prompt-gate.cjs` NAO disparou neste prompt. Mecanismo: shared lock file `~/.claude/cache/last-hook-fire.json` com timestamp + hook name, TTL 5s. Se ja houve fire recente, pre-mutation skip. Mitiga R6 (fricção dupla).

- **G4 (D26 heuristica do hook — verbos + paths + negative-list):** Heuristica de fase-07 detecta "trabalho substancial" via:
  1. **Verbos positivos:** `implementar`, `construir`, `criar`, `adicionar feature`, `desenvolver`, `migrar`, `refatorar`.
  2. **Paths positivos:** prompt menciona `src/`, `lib/`, `components/`, `api/`, `services/` ou nomes de modulo (heuristica por extensao `.ts`, `.tsx`, `.py`).
  3. **Negative-list (NAO sugere):** prompt comeca com `explique`, `como funciona`, `o que e`, `ensine`, `me ajude a entender`, `documente`, `revise`, `analise`, `pesquise`. Evita falso-positivo educacional. (D26 explicito)
  
  Logica: `(verb positivo OR path positivo) AND NOT negative-list`. Documentar matriz de exemplos no JSDoc.

- **G5 (R6 mitigacao — hook NAO bloqueia):** Hook UserPromptSubmit emite **stdout JSON** com `{ inject: true, message: "..." }` mas o prompt do usuario passa adiante. Nunca retornar `{ block: true }`. CA-23 exige isso. Validar via teste com `expect(stdoutJson.block).toBeUndefined()`. Mensagem do hook eh maxima de **2 linhas curtas** — Plugin user-prompt-gate existente eh referencia de tom.

- **G6 (CA-16 + CA-25 fluxo do Compound Gate em /iterate):** `/iterate` (v5.2) atualmente faz incident-response + hardening. v6 **adiciona** o Compound Decision Gate ANTES do encerramento. Ordem do novo fluxo: (1) detecta plano em `active/` com Exit Criteria marcado; (2) executa incident-response/hardening tradicional; (3) **NOVO:** Compound Gate pergunta `"Esse trabalho ensinou algo durável? [Sim e capturar / Nao - 'no capture needed' + razao / Pensar mais]"`; (4) se "Sim": gera compound note via `/lessons-learned` interno + move plano para `completed/`; (5) se "Nao": registra evento de telemetria `iterate.no_capture_needed` com razao + move plano; (6) se "Pensar mais": deixa plano em `active/` com tag `pending-capture`. Documentar como pseudo-codigo em SKILL.md.

- **G7 (D18 — 10 secoes do template exec-plans):** Ordem exata e nome **case-sensitive** das 10 secoes harmonizadas (fase-03):
  1. `## Goal`
  2. `## Scope`
  3. `## Assumptions`
  4. `## Risks`
  5. `## Execution Steps`
  6. `## Review Checklist`
  7. `## Validation Log`
  8. `## Compound Opportunity`
  9. `## Lessons Captured`
  10. `## Exit Criteria`
  
  Validador `harness:validate` (Plano 04 fase-03) pode futuramente checar essas secoes em planos ativos. CA-18 verbatim: "todas as 10 secoes presentes". Em fase-04 (quick-plan reduzido), manter 7: Goal, Scope, Execution Steps, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria (omite Assumptions, Risks, Review Checklist — sao para planos grandes).

- **G8 (cross-platform paths — herdado de Plano 01/02):** `path.join` em todos os helpers. `lib/path-resolver-v6.ts` retorna paths absolutos via `path.resolve(projectRoot, 'docs', 'compound')`. Hook em Node CJS (`pre-mutation-gate.cjs`) tambem usa `path.join` — `require('path').join(homedir, '.claude', 'cache', 'last-hook-fire.json')`.

- **G9 (telemetria do hook — S5 + R6):** Cada disparo do `pre-mutation-gate.cjs` emite evento `pre_mutation_gate.suggested` ou `pre_mutation_gate.skipped` com `{ verb_matched, path_matched, negative_matched, hook_lock_skipped }` para o telemetry-utils local. Rate-limit: maximo 1 evento por minuto por workspace (evita poluicao em sessoes longas). Documentar como o usuario inspeciona: `cat ~/.claude/projects/{proj}/memory/telemetry.jsonl | grep pre_mutation`.

- **G10 (provenance comments):** Toda linha TS gerada neste plano leva `// 2026-05-11 (Luiz/dev): why...`. Templates `.md` gerados pelas skills (compound notes, ADRs, exec-plans) **nao** levam provenance — sao output usuario. `pre-mutation-gate.cjs` (CJS) leva `// 2026-05-11 (Luiz/dev): ...` mesmo sendo `.cjs`.

- **G11 (interacao com plugin externo do andre):** O harness do Andre tinha skill propria `/init` independente. v6.0.0 absorve em uma so (D9). Risco: usuario que tinha `skills/harness-engineering/` instalado por fora pode ter colisao de comando `/init`. **Politica em fase-08:** teste de zero-breaking-change NAO testa contra harness-engineering — escopo eh anti-vibe-coding apenas. Documentar limitacao em CHANGELOG (Plano 09).

### Ambiguidades sinalizadas (precisa resposta antes de executar)

- **Ambiguity 05-A1 (escopo de "6 skills"):** PRD M7 lista `/lessons-learned`, `/decision-registry`, `/iterate`, `/plan-feature`, `/quick-plan`, `/execute-plan` (6 skills). **Decisao assumida:** essas 6 exatamente. Outras skills que tocam `.planning/` (ex: `/grill-me` gera `CONTEXT-*.md`, `/write-prd` cria pasta datada) **NAO** sao migradas neste plano — ficam em Plano 06 ou ficam compatibilidade dual ate v6.1+. Validar com user antes de executar: faz sentido manter `/grill-me` escrevendo em `.planning/` mesmo em projeto v6? Decisao assumida: **sim** — `.planning/` continua para artefatos transitorios pre-PRD; `docs/exec-plans/` eh post-PRD. Documentar em SKILL.md das skills nao-migradas.

- **Ambiguity 05-A2 (path-resolver fallback v5):** Se projeto eh v5 puro (sem `docs/compound/`) e usuario invoca `/lessons-learned add "foo"`, a skill **deve** appender em `lessons-learned.md` (legado) ou **deve** oferecer `/init migrate` antes? **Decisao assumida em fase-01:** escreve em legado silenciosamente E injeta linha curta no output: `"Tip: rode /anti-vibe-coding:init para migrar para layout v6 (docs/compound/)"`. Nao bloqueia. Se rejeitado, virar prompt `"Migrar agora? [Sim/Nao/Mais tarde]"`.

- **Ambiguity 05-A3 (CA-17 escopo do teste de breaking change):** Que "sintaxe v5.x" precisa funcionar? **Decisao assumida em fase-08:** as 3 formas mais comuns por skill:
  1. **Posicional simples:** `/lessons-learned add "titulo livre"` (input string puro).
  2. **Sub-comando + posicional:** `/decision-registry add "decidi usar X"`.
  3. **Sem args:** `/iterate` (interactive).
  
  Total: 18 chamadas (3 formas x 6 skills). Cada uma deve completar sem exception. Documentar lista exata no teste. Se Andre/PRD tiver formas adicionais documentadas, expandir.

- **Ambiguity 05-A4 (Compound Gate fluxo "Pensar mais"):** CA-25 cita 3 opcoes (capturar / no-capture-needed / postergar). **Decisao assumida em fase-06:** "Pensar mais" deixa plano em `active/` MAS adiciona tag `pending-capture` ao frontmatter do plano (campo novo). Validator `harness:validate` (Plano 04) NAO rejeita planos com `pending-capture` (eh estado legitimo). Proxima vez que `/iterate` rodar e detectar esse plano, oferece o gate novamente. Se PRD prefere bloquear nova invocacao ate decisao, reverter.

- **Ambiguity 05-A5 (template quick-plan — 7 secoes quais):** PRD nao detalha as 7. **Decisao assumida em fase-04:** Goal, Scope, Execution Steps, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria. Justifica: quick-plan e para tasks medias (3-7 passos) — Assumptions/Risks/Review Checklist sao overhead para esse caso. Se PRD especificar quais 7, substituir.

- **Ambiguity 05-A6 (hook discoverability):** Como o usuario sabe que o hook existe? **Decisao assumida em fase-07:** registrado em `hooks/hooks.json` (descoberto automaticamente pelo harness Claude Code) + linha no `CHANGELOG.md` (Plano 09) + secao "Hooks" em `anti-vibe-coding/AGENTS.md` (Plano 08 dog-food). Sem doc extra dedicada. Se PRD prefere "/init" oferecer ativar/desativar interativamente, virar prompt opcional em `/init` v6 — afetaria Plano 02 (nao Plano 05).

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

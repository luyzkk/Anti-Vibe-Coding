# Plano 03: Batch C T2 (2 átomos) + Batch C T3 (3 átomos) + INDEX final consolidado + E2E completo CA-01..CA-11 + hardening leve

**Feature:** Stack Knowledge Layer — Rails (v6.3.3) ([PLAN overview](../PLAN.md))
**Fases:** 10
**Sizing total:** ~12.5-14.5h
**Depende de:** Plano 02 (8 átomos populados — 5 T1 + 3 T2 backend-heavy, todos verificados pelo verifier refined; audit humano Luiz aprovado em `active-record-fundamentals` e `action-view-and-hotwire`; schema `rails_versions` e anti-drift como regression já validados)
**Desbloqueia:** Merge para `main` (último plano da feature — fim de v6.3.3)

---

## O que este plano entrega

Fechamento da camada de knowledge Rails: 5 átomos restantes em `docs/knowledge/rails/atoms/` (2 T2 — `performance-and-tuning`, `deployment-with-kamal`; 3 T3 — `action-cable-and-realtime`, `action-mailer-and-mailbox`, `active-storage`), INDEX.md final consolidado seguindo layout D9 (por skill cross-stack + por tier), verifier refined sobre Batch C + audit humano Luiz do átomo flagged (`action-cable-and-realtime`, T3 — D14, D19), **RF11 (warning Rails legado <7.1) implementado em fase-08 ANTES do E2E (D23 — evita RED cross-phase)**, E2E completo cobrindo CA-01..CA-11 com 5 fixtures (Rails 8.x moderno, Sinatra, Rails 7.0 legacy, monorepo Rails+Node, Node-only) — CA-02 perf <200ms per D24 — e hardening leve com content auditors + polish RF12 (preview de keywords no output) + flag de revisão de tier de `active-storage` (RF13 — dev decide se sobe para T2 após escrita). Se fase-10 verde, feature v6.3.3 entra em condição de merge.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| 8 átomos do Plano 02 populados em `docs/knowledge/rails/atoms/` (5 T1 + 3 T2 backend-heavy) com frontmatter completo e verifier refined PASS (≥80% claims rastreáveis) | Plano 02 fase-01..09 | bloqueia fases 01-05 (extratores leem template) e fase-06 (INDEX consolida slug/tier/triggers/related_skills dos 14 átomos finais) |
| Audit humano Luiz aprovado em `active-record-fundamentals` (T1) e `action-view-and-hotwire` (T2) — assinatura `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global | Plano 02 fase-09 | bloqueia fase-06 (INDEX só consolida átomos com gate humano onde aplicável) |
| Schema `rails_versions` ativo no validator + regression test combinada Node+Rails passando | Plano 01 fase-02 | bloqueia fases 01-05 (cada novo átomo terá o campo); valida CA-10 em fase-09 |
| Contrato multi-stack `DetectedStack { primary, secondary, signalSource, anchorFiles }` (D22) | Plano 01 fase-03 | bloqueia fase-09 (E2E usa `result.primary` em vez de `result.id`); auditado em fase-10 |
| Anti-drift clause + verifier refined protocol como cláusulas obrigatórias nos prompts dos subagentes (D12) | Plano 01 fase-05 (extrator) + fase-06 (verifier) — reaplicado em Plano 02 | bloqueia fases 01-05 (extratores) e fase-07 (verifier batch C) |
| Piloto `rails-conventions-and-magic.md` como template de frontmatter (8 campos base + `rails_versions`) e skeleton (5 seções) | Plano 01 fase-05 | informacional — extratores deste plano copiam formato verbatim |
| Regression test do detector Rails (CA-03 fallback Sinatra, CA-04 Rails legado) sobre contrato multi-stack | Plano 01 fase-04 | bloqueia fase-09 (E2E completo reusa fixtures de Sinatra e Rails 7.0 legacy) |
| Compound lessons capturadas: anti-drift (`2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`) e verifier refined (`2026-05-16-verifier-protocol-technical-sections-only.md`) | `docs/compound/` | bloqueia fases 01-05 e fase-07 (cláusulas LITERAIS coladas nos prompts — G2/G3) |
| Infra Node v6.3.2 (`runStackKnowledgeInit`, `copyKnowledge`, `getStackKnowledgePreface`, telemetria, `MATRIX_FOLDER_VALUES`) | `docs/exec-plans/completed/2026-05-16-stack-knowledge-nodejs-typescript/` | informacional — fase-09 E2E exerce essa infra com 5 fixtures distintas |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 14 átomos Rails completos em `docs/knowledge/rails/atoms/` (6 T1 + 5 T2 + 3 T3) — matrix Rails finalizado | Projetos Rails que rodam `/init` após merge: recebem matrix completo via `copyKnowledge` |
| `docs/knowledge/rails/INDEX.md` final (layout D9, ≤100 linhas, seções "Para /security", "Para /api-design", "Para /system-design", "Para /design-patterns", "Para /architecture", "Para /infrastructure", "Para /tdd-workflow" + mapa por tier T1/T2/T3) | 7 skills cross-stack que invocam `getStackKnowledgePreface()` em projetos Rails populados |
| Suite E2E `tests/e2e/stack-knowledge-rails-full.test.ts` cobrindo CA-01..CA-11 com 5 fixtures (Rails 8.x, Sinatra, Rails 7.0 legacy, monorepo Rails+Node, Node-only) — CA-02 com perf <200ms (D24) | Regressão futura — qualquer feature que toque `detect-stack.ts`, `copy-knowledge.ts` ou `run-stack-knowledge-init.ts` roda essa suite |
| Audit humano CA-08 completo para os 3 átomos flagged (D14, D19): `active-record-fundamentals` (T1, em P02) + `action-view-and-hotwire` (T2, em P02) + `action-cable-and-realtime` (T3, neste plano fase-07) — assinatura `Aprovado por Luiz em YYYY-MM-DD` em STATE.md global | Merge gate da feature — sem assinatura completa, `/execute-plan` não conclui |
| RF11 warning Rails legado (<7.1) implementado em `format-knowledge-preview.ts` ANTES do E2E (fase-08, D23) | fase-09 E2E (CA-04 GREEN imediato, sem RED cross-phase); fase-10 hardening auditing |
| Hardening report com findings de `security-auditor` + `code-smell-detector` sobre delta de código (~10 linhas — RF11 helper+caller, schema validator, refactor multi-stack D22) | Compound futuro — formato serve para próximas stacks (Python, Go) reutilizarem hardening leve quando delta de código é pequeno (D15) |
| Polish RF12 (preview keywords no `/init`) — output do `/init` exibe top-N keywords humanizadas | UX final — dev Rails vê keywords preview no init de Rails moderno |
| Tier de `active-storage` decidido empiricamente após escrita (RF13 — T3 mantido ou T2 promovido) | INDEX final (fase-06) reflete a decisão; tabela "Por Tier" inclui `active-storage` no tier escolhido |
| TODO.md raiz com átomos que estouraram 200 linhas (D25 — backlog v6.3.4+) | Roadmap v6.3.4+ — split planejado mas não bloqueia v6.3.3 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-performance-and-tuning.md | átomo T2 `performance-and-tuning.md` (~150 ln) — N+1 angle Rails (includes/preload/eager_load profile com bullet), threading (Puma workers/threads), scout_apm/skylight, GC tuning, memory bloat | 1.5h | Plano 02 (todos blocos) |
| 02 | fase-02-deployment-with-kamal.md | átomo T2 `deployment-with-kamal.md` (~140 ln) — Kamal 2 default Rails 8 (Docker single-host), `bin/kamal deploy`, asset compilation, secrets (`kamal secrets`), nota sobre Capistrano (D16). `rails_versions: ['>=8.0']` para padrões Kamal 2 nativos | 1.5h | Plano 02 |
| 03 | fase-03-action-cable-and-realtime.md | átomo T3 `action-cable-and-realtime.md` (~140 ln) — channels, Solid Cable (default Rails 8), Turbo Streams broadcast, performance gotchas (broadcast em loop, N+1 em subscribers). **FLAGGED CA-08 audit humano** (D14, D19) | 1.5h | Plano 02 |
| 04 | fase-04-action-mailer-and-mailbox.md | átomo T3 `action-mailer-and-mailbox.md` (~150 ln) — outbound (`deliver_later`, layouts, multipart), inbound (ActionMailbox routing) + **absorve ActionText** (D16) com seção rich content / trix editor breve | 1.5h | Plano 02 |
| 05 | fase-05-active-storage.md | átomo T3 `active-storage.md` (~140 ln) — file uploads, S3/disk backends, variants, direct uploads, signed URLs. **RF13 — flag de revisão de tier** ao final: dev decide se sobe para T2 ou mantém T3 (atualiza frontmatter `tier:` se promovido) | 1.5h | Plano 02 |
| 06 | fase-06-index-final-consolidado.md | `docs/knowledge/rails/INDEX.md` final (≤100 ln) — layout D9: 7 seções "Para /skill" + mapa "Por Tier" T1/T2/T3. Substitui o skeleton mínimo do Plano 01 fase-05 | 1.5h | fase-01..05 (precisa de todos os 14 slugs + tiers finais) |
| 07 | fase-07-verifier-refined-e-audit-humano.md | 5 invocações de verifier refined em paralelo (1 por átomo do Batch C) + audit humano Luiz de `action-cable-and-realtime` (T3 flagged) com assinatura em STATE.md global. Veredito em `plano03/MEMORY.md` como DI-1 | 2h | fase-01..05 |
| 08 | fase-08-rf11-warning-rails-legado.md | Helper `extractRailsVersionWarning` + caller em `run-stack-knowledge-init.ts` (~10 linhas TS + 5 tests). Estabelece warning ANTES do E2E para que CA-04 vire GREEN imediato (D23). | 0.5h | fase-06 (INDEX final consolidado) |
| 09 | fase-09-e2e-completo-ca-01-a-ca-11.md | Suite E2E `tests/e2e/stack-knowledge-rails-full.test.ts` com 5 fixtures cobrindo CA-01..CA-11 (Rails moderno, Sinatra, Rails 7.0 legacy, monorepo, Node-only). Asserts: detector D22, copy, telemetria, preview keywords, warning legado (já GREEN porque fase-08 implementou). CA-02 perf <200ms (D24) | 2h | fase-06 (INDEX final), fase-07 (átomos aprovados), fase-08 (RF11 GREEN) |
| 10 | fase-10-hardening-leve-e-polish-rf12.md | `security-auditor` + `code-smell-detector` spawnados em paralelo sobre delta de código (~10 ln: RF11 helper+caller, schema validator, refactor multi-stack D22); content audit de frontmatter 14/14 + cap 200 ln (D25 hard cap, backlog v6.3.4+ se estourou); polish RF12 (preview keywords) | 1-1.5h | fase-09 (E2E verde — sem regressão antes de polir) |

**Soma:** 14-14.5h (range planejado 12.5-14.5h, dentro do alvo — limite superior absorvido por buffer de retrabalho do verifier/audit em fase-07).

---

## Grafo de Fases

```
                       Plano 02 (8 átomos aprovados)
                                  |
       +----+----+----+----+----+
       |    |    |    |    |
       v    v    v    v    v
   fase-01 fase-02 fase-03 fase-04 fase-05
   (Perf+  (Kamal) (Action (Mailer (ActiveStorage
   Tuning)         Cable   +Mailbox flag RF13)
                   flagged) +Text)
       |    |    |    |    |
       +----+----+----+----+
                  |
                  v
            fase-06 (INDEX final D9)
                  |
                  +-----------------+
                  |                 |
                  v                 v
            fase-07 (verifier  fase-08 (RF11 warning
            Batch C + audit    Rails legado — D23,
            humano Luiz CA-08) GREEN antes do E2E)
                  |                 |
                  +-----------------+
                          |
                          v
                  fase-09 (E2E completo CA-01..CA-11
                           com 5 fixtures; CA-04 GREEN
                           imediato graças à fase-08;
                           CA-02 perf <200ms — D24)
                          |
                          v
                  fase-10 (hardening leve content auditors
                           + polish RF12 + audit do delta
                           RF11/D22; D25 hard cap atoms)
                          |
                          v
                    Merge v6.3.3
```

**Paralelismo possivel:** fases 01-05 (Batch C completo — 2 T2 + 3 T3) podem ser executadas em paralelo por 5 subagentes extratores independentes — nenhuma compartilha arquivos (cada uma escreve um átomo diferente em `atoms/`). `/execute-plan` despacha como batch único ou 2 sub-batches (T2 + T3) por orçamento de tokens. Fase-06 (INDEX) é sequencial e precisa dos 14 slugs/tiers finais. Depois de fase-06, fase-07 (verifier+audit humano) e fase-08 (RF11) podem rodar em paralelo (verifier toca markdown; RF11 toca TS isolado). Fase-09 (E2E) é sequencial — depende de fase-06 + fase-07 + fase-08. Fase-10 (hardening) roda 2 subagentes auditores em paralelo (`security-auditor` + `code-smell-detector`) sobre delta de código, polish RF12 sequencial ao final.

---

## TDD Strategy

```
Ciclo por fase (mix content-only + TDD code):

Fases 01-06 (content-only):
1. PLAN: extrator lê fonte canônica + frontmatter alvo + skeleton fixo
2. WRITE: subagente extrator escreve o átomo com anti-drift clause literal
3. CHECK: checklist de validação de conteúdo (wc -l ≤ 200, frontmatter completo,
          zero placeholders, harness:validate passa)
4. GATE (fase-07): subagente verifier refined audita só seções técnicas;
          humano audita átomo flagged (Action Cable)

Fases 08-10 (TDD code):
1. RED: escrever teste que falha (helper inexistente / fixture ausente / assertion)
2. GREEN: criar implementação mínima + fixture, teste PASSA
3. REFACTOR: extrair helpers comuns (sem duplicar setup)
4. VERIFY: bun run test && bun run lint (cobre toda a feature)
```

Fases 01-06 são **content-only** (markdown puro — átomos + INDEX): usam checklist de validação de conteúdo em vez de RED→GREEN. Fase-07 é gate de qualidade (subagente verifier + audit humano) cujo veredito é registrado em `plano03/MEMORY.md` como DI-1. Fase-08 (RF11), fase-09 (E2E) e fase-10 (hardening + RF12) seguem TDD rigoroso com `bun:test` — fase-08 implementa helper + caller, fase-09 escreve a suite E2E completa (5 fixtures, 11 assertions de CA), fase-10 audita o delta e implementa RF12 se necessário.

**Tracer Bullet deste plano:** N/A — o tracer vive no Plano 01 fase-06. Plano 03 escala em conteúdo (5 átomos + INDEX) e fecha o loop em RF11 + E2E + hardening. Nenhuma fase abre arquitetura nova.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Cap de 200 linhas é HARD CAP D25 (regressão de G1 do Plano 02):** o verifier refined da fase-07 (e o `harness:validate`) rejeita átomo > 200. Para o Batch C, alvos são mais apertados — `performance-and-tuning` e `action-mailer-and-mailbox` podem encostar no cap por absorverem temas adjacentes (ActionText em Mailer, GC/threading em Performance). Se um extrator entrega 195+, sinalizar risco. Conteúdo excedente NÃO infla outra seção — vira backlog `v6.3.4+ (Rails knowledge expansion)` em `TODO.md` raiz (D25 explicito). Alvos por fase: 140-160 linhas.

- **G2 — Anti-drift como REGRESSION-TEST (D12), não guideline:** o prompt de cada extrator (fases 01-05) DEVE incluir o **texto LITERAL** da compound lesson `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (cole verbatim no prompt, não parafraseie). Sem o gate, blocker — Plano 04 do Node teve rework loop por não ter aplicado. Para `action-cable-and-realtime` (T3 com fontes menos densas), o risco de drift é ESPECIALMENTE alto: subagente tende a "completar" com conhecimento prévio. Verifier refined em fase-07 + audit humano CA-08 mitigam, mas anti-drift no extrator é a primeira linha.

- **G3 — Verifier refined audita APENAS Padrões sênior + Anti-padrões + Critérios de decisão (D12):** a fase-07 cola o **texto LITERAL** da compound lesson `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` no prompt do verifier. Auditar `Quando consultar` ou `Referências externas` gera false-positive de "claim genérica não tem fonte" — esses são scaffolding editorial, não claims técnicas.

- **G4 — Frontmatter `rails_versions` é array de ranges semver-style (D18):** padrões Rails 8 exclusivos (Kamal 2 default na fase-02, Solid Cable na fase-03) ganham `rails_versions: ['>=8.0']`. Padrões disponíveis desde 7.1 (ActionMailer/Mailbox, ActiveStorage core, profile com bullet) ganham `rails_versions: ['>=7.1']`. Validator em fase-02 do Plano 01 já aceita o campo OPCIONAL — não retocar schema neste plano.

- **G5 — `action-cable-and-realtime` é FLAGGED CA-08 (T3 audit humano):** D14 + D19 obrigam Luiz a revisar pessoalmente após verifier refined. T3 escolhido especificamente porque fontes Rails para ActionCable são mais escassas — valida que extração funciona em domínio com menor densidade de fonte. Audit humano notifica Luiz com link absoluto para átomo + para sources citados. Se Luiz reprovar, retrabalho da fase-03 + re-verifier sobre o átomo específico.

- **G6 — INDEX final consolida 14 slugs/tiers (D9):** fase-06 NÃO pode rodar antes de fase-01..05 — precisa ler os 14 átomos finais (5 do Plano 01+02 que já existem, 5 novos do Batch C) para extrair `topic`, `tier`, `triggers`, `related_skills`. Layout fixo: 7 seções "Para /skill" (uma por cross-stack skill) + 3 seções "Tier 1/2/3". Cap ≤ 100 linhas. Se um átomo aparece em 2+ seções "Para /skill", listar em ambas (não duplica frontmatter, só roteamento). `active-storage` aparece no tier decidido pelo dev em fase-05 (RF13).

- **G7 — RF13 flag de revisão de tier de `active-storage`:** ao final da fase-05, dev avalia se `active-storage` sobe para T2 (uso comum em apps modernas) ou mantém T3 (conservador, niche). Critério: se o átomo escrito mostra padrões críticos para apps de produção (signed URLs, direct uploads, variants para imagens UX), sobe. Se cobre majoritariamente niche (preview deps, complex backends multi-cloud), mantém. Decisão registrada em `plano03/MEMORY.md` como DI-N + atualiza `tier:` no frontmatter do átomo + atualiza INDEX em fase-06.

- **G8 — E2E completo precisa de 5 fixtures distintas (fase-09):** não basta UM projeto Rails — CA-01..CA-11 exigem variantes. Fixtures em `tests/fixtures/`:
  - `tests/fixtures/rails-modern-8x/` (CA-01, CA-02 — perf <200ms D24, CA-05 — Rails 8.x com `Gemfile` declarando `gem 'rails', '~> 8.0'`)
  - `tests/fixtures/sinatra-no-rails/` (CA-03, CA-06 — Gemfile sem `gem 'rails'`, deve cair em `primary: null` graceful)
  - `tests/fixtures/rails-legacy-70/` (CA-04 — Gemfile com `gem 'rails', '~> 7.0'`, deve copiar knowledge + exibir warning RF11 — GREEN imediato graças à fase-08)
  - `tests/fixtures/monorepo-rails-node/` (CA-07 — Gemfile + package.json, maioria `.rb`, primary=rails, secondary=nodejs-typescript, Node knowledge NÃO copiado)
  - `tests/fixtures/node-only/` (CA-11 — sem Gemfile, regressão Node v6.3.2 intacta)
  Cada fixture é diretório isolado com `Gemfile`/`package.json` mínimo. Test scaffolding via `tmpdir + copyTree` (padrão Node v6.3.2 reusado).

- **G9 — Hardening leve, não completo (D15):** fase-10 NÃO replica os 6 auditores do Node hardening em 2 rodadas. Spawna APENAS `security-auditor` + `code-smell-detector` em paralelo sobre delta de código (~10 linhas — RF11 helper+caller da fase-08, schema validator, refactor multi-stack D22 do Plano01 fase-03). Content audit de frontmatter (todos os 14 átomos têm 8 campos base + `rails_versions` quando aplicável) e cap 200 linhas roda como checklist humano + `bun run harness:validate` — não como subagente. Auditores de SOLID/database/API/infra ficam IDLE (sem delta significativo para auditar). RF12 polish entra ao final da fase-10, depois dos findings críticos resolvidos. RF11 NÃO é polish — foi promovido para fase-08 (D23).

- **G10 — Fontes canônicas vêm da decisão do Plano 01 fase-01 (regressão de G6 do Plano 02):** cada extrator do Batch C DEVE primeiro `Read` o STATE.md global da feature, extrair a decisão de dedup aprovada (ex: `rails-tdd-slices` é canônico → `rails-tdd-slices copy` foi deletado) e usar APENAS o lado canônico em `sources:`. Para os átomos do Batch C, pares relevantes incluem:
  - `performance-and-tuning` → `rails-stack-conventions{v2?}` + `rails-expert`
  - `deployment-with-kamal` → `rails-stack-conventions{v2?}` + compass artifacts
  - `action-cable-and-realtime` → `rails-stack-conventions{v2?}` + compass + deep-research
  - `action-mailer-and-mailbox` → `rails-expert` + compass + (ActionText absorvido sem fonte dedicada — extrair de stack-conventions)
  - `active-storage` → `rails-expert` + compass artifact dedicado se existir
  Se STATE.md não tem decisão aprovada para um par que afeta um átomo, BLOQUEAR a fase e escalar.

- **G11 — RF11 (warning Rails <7.1) implementado em fase-08 ANTES do E2E (D23):** RF11 exige que o output do `/init` exiba `"⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar."` quando o Gemfile declara `gem 'rails', '~> 7.0'` ou inferior. Foi promovido para fase dedicada (fase-08, ~0.5h) para que CA-04 da fase-09 vire GREEN imediato — sem RED cross-phase como o desenho 9-fases anterior tinha. Parser de versão usa regex simples `/gem\s+['"]rails['"]\s*,\s*['"]([~^>=<]*\s*)?(\d+)\.(\d+)/` extraindo major.minor — sem dependência de gem version DSL completa. Não toca em `detect-stack.ts`. Implementação em `skills/init/lib/format-knowledge-preview.ts` (export `extractRailsVersionWarning`) + caller em `run-stack-knowledge-init.ts`.

- **G12 — Polish RF12 (preview keywords no `/init`) é regressão do Node:** Node v6.3.2 já implementou preview de top-N keywords no output (RF10 do Node). RF12 do Rails é regressão automática se a infra do Node estiver agnóstica de stack. Verificar em fase-10 que o output do `/init` Rails exibe top-N keywords extraídas dos `triggers:` de cada átomo Rails (não dos Node). Se infra Node hardcode "nodejs-typescript" em algum ponto, abrir bug — não deveria. Aceitação: dev Rails roda `/init` e vê `"Knowledge contém átomos sobre: Active Record, Hotwire, Solid Queue, RSpec, Brakeman, Kamal, Zeitwerk, ActiveSupport, ..."` (top-8 keywords agregadas dos triggers dos 14 átomos).

- **G13 — D24 perf <200ms no CA-02 (não <100ms PRD):** D24 do CONTEXT relaxou o limite na suite real depois de observar flakiness em CI Windows com cold I/O. PRD continua pedindo <100ms como meta de produto; teste cobre <200ms para CI estável. Comentário inline no test cita D24 e contexto Windows.

<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado deste plano seguem: autor + papel, YYYY-MM-DD, razão/decisão.
Fases 01-07 são markdown puro; fases 08-10 tocam código TS (RF11 helper+caller, E2E suite, RF12 formatter).
Apenas estes pontos exigem comentário inline com linhagem.
-->

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

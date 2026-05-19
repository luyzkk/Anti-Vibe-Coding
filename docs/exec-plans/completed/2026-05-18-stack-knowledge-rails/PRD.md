---
slug: stack-knowledge-rails
date: 2026-05-18
status: draft
requires: [2026-05-16-stack-knowledge-nodejs-typescript]
---

<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado deste PRD seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-05-18 (Luiz/dev): rails_versions field — alinhado com D13 do CONTEXT`
-->

# PRD: Stack Knowledge Layer — Rails (v6.3.3)

**Status:** Draft
**Author:** Luiz Felipe + AI (grill-me + write-prd)
**Date:** 2026-05-18
**Context:** ./CONTEXT.md (16 decisões capturadas via `/grill-me`)
**Reuses infra from:** [2026-05-16-stack-knowledge-nodejs-typescript](../../completed/2026-05-16-stack-knowledge-nodejs-typescript/) (init multi-stack, copy-knowledge, getStackKnowledgePreface, telemetria, schema `.claude/stack.json` v1, MATRIX_FOLDER_VALUES já inclui `'rails'`)

---

## Problema

A camada de knowledge stack-specific entregue em v6.3.2 (Node+TS) só cobre uma stack. Devs que rodam `/init` em projeto Rails recebem `stack.json.primary = "rails"` (detector já mapeia) mas `.claude/knowledge/` fica vazio — `copyKnowledge` retorna status `no-matrix` porque `docs/knowledge/rails/` não existe no plugin.

Resultado: skills cross-stack (`/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`) em projeto Rails entregam consultoria **genérica cross-stack** (OWASP geral, REST geral, cache geral) quando padrões Rails-específicos seriam superiores:

- `/security` cobre XSS/CSRF em geral, não fala de **strong parameters**, **mass-assignment**, **Brakeman**, **content security policy do Rails**
- `/api-design` cobre N+1 em geral, não fala de **`includes` vs `preload` vs `eager_load`** do ActiveRecord
- `/system-design` cobre cache, não fala de **Solid Cache** (default Rails 8) ou **Russian doll caching**
- `/tdd-workflow` cobre Red-Green-Refactor, não fala de **RSpec `let!` vs `let`**, **factories vs fixtures**, **system tests com Capybara**

Existe ~13.800 linhas de fonte coletada em `claude-code/knowledge/Rails/` (9 compass artifacts + 13 skill packages + 7 deep-research-reports) prontas para condensar em ~1.700 linhas de átomos (~8× compressão).

A v6.3.2 deixou explicitamente esta lacuna como follow-up (SUMMARY.md linha 152): "v6.3.3 — Stacks adicionais: Rails, Python, Go. Cada uma vira PRD próprio reusando o formato".

---

## Solução

### Outcomes

- Ao rodar `/init` em projeto Rails (com `Gemfile` contendo `gem 'rails'`), o projeto recebe `.claude/knowledge/INDEX.md` + 14 átomos Rails-native automaticamente em < 100ms
- Skills cross-stack invocadas em projeto Rails populado citam o `.claude/knowledge/INDEX.md` antes do corpo genérico, e o agente encontra o átomo Rails relevante via roteamento por skill cross-stack + tier
- Knowledge Rails é **idiomático ao framework** (organizado por Active Record / Action Pack / Action View+Hotwire / Active Job+Solid Queue etc.), não tradução artificial dos átomos Node
- Detector de stack distingue **Rails** de Sinatra/Hanami/Roda via match `gem 'rails'` no Gemfile (zero falso-positivo)
- Frontmatter `rails_versions` documenta compat por padrão (ex: Solid Queue é `>=8.0`, ActionCable é `>=5.0`)
- Devs com projeto Rails legado (< 7.1) recebem `stack.json.primary = "rails"` mas com nota explícita "knowledge cobre Rails 7.1+ — alguns padrões podem não se aplicar"

### Mecanismo

**Plugin matrix (este repo) após v6.3.3:**
```
docs/knowledge/
├── nodejs-typescript/             (entregue em v6.3.2)
│   ├── INDEX.md
│   └── atoms/*.md (14 átomos)
└── rails/                         (NOVO em v6.3.3)
    ├── INDEX.md                   (organizado por skill cross-stack + tier)
    └── atoms/
        ├── active-record-fundamentals.md       (T1)
        ├── active-record-migrations-safety.md  (T1)
        ├── action-controller-and-routing.md    (T1)
        ├── action-view-and-hotwire.md          (T2)
        ├── active-job-and-solid-queue.md       (T2)
        ├── action-cable-and-realtime.md        (T3)
        ├── action-mailer-and-mailbox.md        (T3)
        ├── active-storage.md                   (T3, flag de revisão para T2)
        ├── rspec-and-minitest.md               (T1)
        ├── security-csrf-and-brakeman.md       (T1)
        ├── caching-with-rails.md               (T2)
        ├── performance-and-tuning.md           (T2)
        ├── deployment-with-kamal.md            (T2)
        └── rails-conventions-and-magic.md      (T1)
```

**Projeto Rails após `/init` (sem mudança no fluxo do dev — só o conteúdo da pasta):**
```
.claude/
├── knowledge/
│   ├── INDEX.md
│   └── atoms/*.md       (14 átomos Rails copiados de docs/knowledge/rails/)
└── stack.json           ({"primary": "rails", "secondary": [...], "schema_version": "1", ...})
```

**Detector Rails atualizado (`skills/init/lib/detect-stack.ts`):**

Anchor passa de "Gemfile exists" → "Gemfile contains `gem 'rails'`". Match regex simples:
```typescript
// 2026-05-18 (Luiz/dev): D10 — robustez contra Sinatra/Hanami/Roda que também usam Gemfile
const gemfileContent = readFileSync(gemfilePath, 'utf8')
const RAILS_DECLARATION = /^\s*gem\s+['"]rails['"]/m
if (!RAILS_DECLARATION.test(gemfileContent)) {
  // Gemfile presente mas sem rails → não classifica como Rails
  // Telemetria registra anchor_file detectado mesmo assim
}
```

**Frontmatter schema estendido:**

Schema atual (Node v6.3.2):
```yaml
topic: {slug}
stack: {nodejs-typescript|rails|python|...}
layer: {backend|frontend|both}
sources: [...]
tier: 1|2|3
triggers: [...]
related_skills: [...]
updated: YYYY-MM-DD
```

Adição em v6.3.3 (opcional, retrocompatível com átomos Node):
```yaml
rails_versions: ['>=7.1']            # ou ['>=8.0'] quando padrão é Rails-8-only
```

`harness:validate` deve aceitar o campo NOVO sem quebrar validação de átomos existentes (que não têm).

**INDEX.md layout (D9 — por skill cross-stack + por tier):**

```markdown
# Rails Knowledge — Index

## Por Skill Cross-Stack

### Para /security
- security-csrf-and-brakeman (T1) — strong params, CSRF, mass-assignment, Brakeman, CSP
- action-controller-and-routing (T1) — sessions, before_actions, route constraints

### Para /api-design
- action-controller-and-routing (T1) — RESTful, API-only mode, versioning
- active-record-fundamentals (T1) — querying, includes vs preload vs eager_load

### Para /system-design
- caching-with-rails (T2) — Solid Cache, Russian doll, HTTP caching
- performance-and-tuning (T2) — N+1, threading, scout_apm

### Para /design-patterns
- rails-conventions-and-magic (T1) — CoC, DRY, callbacks, decorators
- code-smells em Rails (ver active-record-fundamentals + action-controller-and-routing)

### Para /architecture
- rails-conventions-and-magic (T1) — Zeitwerk, ActiveSupport core extensions
- active-record-fundamentals (T1) — STI, polymorphic associations, multi-DB

### Para /infrastructure
- deployment-with-kamal (T2) — Kamal 2, Docker, asset compilation
- active-job-and-solid-queue (T2) — Solid Queue (Rails 8 default), Sidekiq fallback

### Para /tdd-workflow
- rspec-and-minitest (T1) — factories vs fixtures, system tests, Capybara

## Por Tier

### Tier 1 (mandatory para qualquer Rails sr — 6 átomos)
[lista T1]

### Tier 2 (comum em apps de médio porte — 5 átomos)
[lista T2]

### Tier 3 (niche/opcional — 3 átomos)
[lista T3]
```

**Skill wire-up:** ZERO mudança. As 7 skills cross-stack já consomem `.claude/knowledge/INDEX.md` via `getStackKnowledgePreface()` (helper genérico, agnóstico de stack). O INDEX.md Rails-native faz todo o roteamento.

**Atom skeleton (corpo, mesmo do Node + seção opcional API-only quando aplicável):**

- **Quando consultar** (3-5 bullets de cenário)
- **Padrões sênior** (3-7 patterns: problema → padrão → quando usar → quando NÃO usar)
- **Anti-padrões** (2-5 armadilhas com correção)
- **Critérios de decisão** (tabela/bullets "se X, então Y")
- **API-only mode** (opcional — apenas em átomos relevantes: action-controller-and-routing, security-csrf-and-brakeman)
- **Referências externas** (skills relacionadas + source path com audit trail RF11)

---

## Fluxos UX por Ator

Feature backend-only (plugin internals). Único ator: **dev que roda `/init` em projeto Rails**.

### Dev Rails (uso típico — Rails 7.1+ ou 8.x)

1. Dev clona projeto Rails, instala plugin Anti-Vibe-Coding
2. Dev roda `/init` (slash command no Claude Code)
3. Detector lê `Gemfile`, encontra `gem 'rails'` → grava `.claude/stack.json` com `primary: "rails"`
4. Init copia `docs/knowledge/rails/` (INDEX + 14 átomos) → `.claude/knowledge/`
5. Dev vê output: `"Stack detected: rails. Knowledge copied: 14 atoms. Top keywords: Active Record, Hotwire, Solid Queue, RSpec, Brakeman, Kamal, Zeitwerk, ActiveSupport"`
6. Dev usa skills cross-stack normalmente — preface aponta para `.claude/knowledge/INDEX.md`, agente segue rota

### Edge cases visíveis ao dev

- **Projeto Sinatra/Hanami/Roda** (Gemfile presente mas sem `gem 'rails'`): `stack.json.primary = null`, knowledge não copiado. Init informa `"Gemfile detectado mas sem declaração 'gem rails'. Stack: unknown."` (D10)
- **Projeto Rails legado** (Rails < 7.1, detector ainda classifica como rails): knowledge copiado normalmente, mas dev vê warning `"⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar à sua versão."` (mitigação de risco — campo `rails_versions` no frontmatter)
- **`.claude/knowledge/` já existe**: preservado intacto, init informa `"Knowledge já existe. Use --refresh-knowledge para re-copiar."` (regressão da infra Node)
- **Multi-stack (Rails + Node frontend monorepo)**: `primary = "rails"` (mais arquivos `.rb` que `.ts`), `secondary = ["nodejs-typescript"]`, knowledge Rails copiado, Node knowledge não (regressão Node CA-07)

---

## Requisitos Funcionais

### Must Have (7 itens — 37% do total de 19)

- [ ] **RF1** — `docs/knowledge/rails/INDEX.md` criado com layout por skill cross-stack + por tier (D9), ≤ 100 linhas
- [ ] **RF2** — 14 átomos escritos em `docs/knowledge/rails/atoms/*.md` seguindo lista exata de D5, cada um com frontmatter completo (8 campos base + `rails_versions` quando aplicável — formato **array de ranges semver-style**, ex: `rails_versions: ['>=7.1']` ou `rails_versions: ['>=8.0']` ou `rails_versions: ['>=7.1', '<8.0']` para padrões exclusivos 7.x), corpo ≤ 200 linhas, zero placeholders `[A DEFINIR]`. Átomo `rspec-and-minitest` segue layout **padrões framework-agnostic + snippets duplos** (cada padrão tem snippet RSpec + Minitest, sem duplicação de explicação) (D18, D21)
- [ ] **RF3** — `skills/init/lib/detect-stack.ts` atualizado: anchor Rails passa de "Gemfile exists" para "Gemfile contains `gem 'rails'`" via regex `/^\s*gem\s+['"]rails['"]/m` (D10)
- [ ] **RF4** — Schema de validação de frontmatter (`harness:validate` ou test `atoms-rf11-audit.test.ts` análogo) atualizado para reconhecer `rails_versions` opcional, mantendo átomos Node existentes válidos (D13)
- [ ] **RF5** — Plano01 fase01: dedup auditada dos 8 pares `rails-X` vs `rails-X copy` em `claude-code/knowledge/Rails/`. Subagente entrega **tabela markdown por par** com colunas: nome, mtime de cada lado, diff de linhas (resumido), conteúdo novo vs comum, recomendação do subagente (`manter X / deletar copy` ou vice-versa) com justificativa. Dev aprova linha por linha no STATE.md do Plano01. Relatório commitado como `dedup-report.md` (D3, D20)
- [ ] **RF6** — Anti-drift clause + verifier refined protocol aplicados desde Plano01 fase tracer. Prompt do extrator inclui anti-drift literal; prompt do verifier audita APENAS `Padrões sênior` + `Anti-padrões` + `Critérios de decisão` (D12)
- [ ] **RF7** — Audit humano CA-08: **Luiz** revisa pessoalmente 3 átomos após o subagente verifier rodar, lendo cada átomo + comparando com fontes citadas em `sources:` do frontmatter. Assinatura em STATE.md (`Aprovado por Luiz em YYYY-MM-DD`). Bloqueia `/execute-plan` se reprovar. Átomos: `active-record-fundamentals` (T1), `action-view-and-hotwire` (T2), `action-cable-and-realtime` (T3) (D14, D19)

### Should Have

- [ ] **RF8** — Plano01 fase tracer valida E2E que `runStackKnowledgeInit()` funciona com `primary = "rails"` sem mudança de código (regressão da infra Node). Test fixture: projeto Rails dummy com `Gemfile` válido contendo `gem 'rails'` → `.claude/knowledge/` recebe pelo menos o **átomo piloto `rails-conventions-and-magic`** (T1 transversal — CoC, DRY, Zeitwerk, ActiveSupport — escolhido por cobrir tópicos centrais com fonte densa em `rails-stack-conventions` skill + compass artifacts, bom para validar anti-drift) (D17)
- [ ] **RF9** — Telemetria Rails emitida automaticamente via infra existente: `stack_detected: { primary: "rails", anchor_files: ["Gemfile"] }` + `knowledge_copied: { stack: "rails", atom_count: 14 }`
- [ ] **RF10** — Hardening leve pós-Plano03 com content auditors (anti-drift de fontes, completude de frontmatter, qualidade dos padrões). Pula auditores de código que não têm delta significativo (D15)
- [ ] **RF11** — Warning explícito no output do `/init` quando Gemfile tem `gem 'rails', '~> 7.0'` ou inferior: `"⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar."` (mitigação do risco "projeto Rails legado")

### Could Have

- [ ] **RF12** — Output de `/init` mostra preview das top-N keywords Rails: "Knowledge contém átomos sobre: Active Record, Hotwire, Solid Queue, RSpec, Brakeman, Kamal, Zeitwerk, ActiveSupport, ..." (regressão automática da feature RF10 do Node)
- [ ] **RF13** — Após escrita do batch B, dev revisa classificação tier de `active-storage` e decide se sobe para T2 (uso comum em apps modernas) — flag de revisão sem custo de re-extração
- [ ] **RF14** — Frontmatter `sources:` com paths absolutos em `claude-code/knowledge/Rails/` (audit trail RF11 do Node aplicado a Rails)

### Won't Have (v6.3.3)

- **Rails < 7.1** — legado distante; cobertura padrão é 7.1+
- **Sorbet / RBS / type system Ruby** — opcional, nicho; átomos não dependem de typing estático
- **Deploy via Capistrano / Heroku / EC2-manual** — foco é Kamal 2 (Rails 8 default). Capistrano vira nota em `deployment-with-kamal.md` se houver fonte rastreável, não átomo dedicado
- **Frontend full-SPA (React/Vue/Angular substituindo Hotwire)** — caso de uso já coberto pelo knowledge Node de v6.3.2; combinar usando multi-stack secondary
- **ActionText / ActionMailbox como átomos dedicados** — absorvidos em `action-mailer-and-mailbox.md` (linhas ≤ 200 totais)
- **Rails Engines** — gem-internal architecture, nicho de quem mantém biblioteca
- **GraphQL com graphql-ruby** — REST first; GraphQL fica para v6.3.4+ se houver demanda
- **Stacks adicionais (Python, Go, Laravel)** — cada uma vira PRD próprio
- **Drift detection automática de fontes** — frontmatter `sources:` é audit trail; refresh manual
- **Update flow propagando knowledge para projetos instalados** — projeto preservado por default; `--refresh-knowledge` cobre quem quiser

---

## Requisitos Nao-Funcionais

- **Performance:** Detector Rails com leitura de `Gemfile` < 50ms. Cópia de 14 átomos < 100ms (regressão da infra Node — sem nova medição necessária). Match regex `gem 'rails'` é O(n) sobre tamanho do Gemfile típico (< 200 linhas).
- **Segurança:** N/A — markdown estático, sem execução runtime. Reuso automático das proteções S1/S3 do Node (symlink reject via `lstat()` em `copyTree`, TOCTOU eliminado). Leitura nova de Gemfile usa `readFileSync` com encoding explícito (UTF-8) e tratamento de erro (Gemfile ausente/illegível → fallback `unknown`).
- **Acessibilidade:** N/A — arquivos lidos por agente, não UI human-facing.
- **Observabilidade:** Telemetria via padrão existente (`writeTelemetryDomainEvent`); eventos `stack_detected` e `knowledge_copied` já implementados — Rails herda automaticamente.
- **Manutenibilidade:** Cada átomo ≤ 200 linhas (hard cap, verifier rejeita se ultrapassa). INDEX.md ≤ 100 linhas. Frontmatter consistente em 14/14 átomos. Schema check via `harness:validate`. Campo `rails_versions` opcional e validado.
- **Compat retroativa:** Schema estendido NÃO quebra átomos Node existentes (que não têm `rails_versions`). Test fixture explícita valida ambos.

---

## Decisoes Tecnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---|---|---|---|
| 1 | Estrutura dos átomos | **Rails-native** por sub-framework (Active Record, Action Pack, Hotwire, etc.) | Adaptar lista Node 1:1; híbrido | Knowledge perde valor quando força paridade artificial — quem usa Rails quer arquitetura Rails (CONTEXT D4) |
| 2 | Fonte primária dos átomos | Skill packages + compass como complemento | Compass como fonte principal; peso igual | Skill packages pré-curados; anti-drift mais fácil sobre fonte estruturada (CONTEXT D2) |
| 3 | Detector Rails — robustez | Verificar `gem 'rails'` no Gemfile via regex | Verificar `Gemfile.lock` + `bin/rails`; manter só "Gemfile exists" | Robusto sem exigir `bundle install` state; ~5ms extra; zero falso-positivo Sinatra/Hanami (CONTEXT D10) |
| 4 | Versionamento Rails no frontmatter | Adicionar campo `rails_versions` opcional | Notas inline; sem versioning | Audit trail validado; atomic source-of-truth para "este padrão exige Rails 8" (CONTEXT D13) |
| 5 | Layout do INDEX.md | Por skill cross-stack + por tier | Por sub-framework; flat por keyword | Pragmatismo cross-stack: agente seguindo a skill encontra o átomo em 1 leitura; compatível com átomos Rails-named (CONTEXT D9) |
| 6 | Dedup de fontes duplicadas | Subagente audita em Plano01 fase01, dev aprova | Dev limpa antes manualmente; extrator ignora `* copy` | Audit trail completo; zero perda acidental (CONTEXT D3) |
| 7 | Estrutura dos planos | 3 planos (dedup+tracer / batch A+B / batch C+INDEX+E2E) | 6 planos espelhando Node; 1 plano único | Infra Node já entrega init/wire-up; estrutura minimalista que reflete trabalho real (CONTEXT D8) |
| 8 | Compound lessons como regression | Anti-drift + verifier refined desde Plano01 | Aplicar como guideline leve; reavaliar caso-a-caso | Lessons existem para virar regression; Plano 04 Node sem elas teve rework, 05/06 com elas passou first-try (CONTEXT D12) |
| 9 | Tier de `active-storage` | T3 com flag de revisão para T2 no batch B | T2 direto; sem revisão | Cap de T1/T2 enxuto; revisar empiricamente após escrita (CONTEXT D11 + RF13) |
| 10 | Intensidade do hardening | Leve — apenas content auditors | Igual Node (6 auditores em 2 rodadas); nenhum | Escopo é majoritariamente markdown; auditores de código quase não têm o que dizer (CONTEXT D15) |
| 11 | Átomo piloto do Plano01 fase tracer | `rails-conventions-and-magic` | `active-record-fundamentals` (risco de estourar 200 linhas); `security-csrf-and-brakeman` (menor escopo) | T1 transversal com fonte densa mas estruturada (rails-stack-conventions + compass); bom para validar anti-drift em conteúdo conceitual (D17) |
| 12 | Formato `rails_versions` | Array de ranges semver-style: `['>=7.1']`, `['>=8.0']`, `['>=7.1', '<8.0']` | String range simples; array literal de versões cobertas | Flexível, parseável, compatível com gem version DSL; expressa intervalos compostos (D18) |
| 13 | Gate de aprovação CA-08 | Luiz revisa pessoalmente os 3 átomos + assina STATE.md após verifier rodar | Apenas subagente verifier; audit humano em todos os 14 | Subagente pode injetar verdade fora da fonte e não detectar — humano fecha o loop. 3 átomos balanceia rigor vs tempo (D19) |
| 14 | Formato relatório dedup | Tabela markdown por par com mtime, diff resumido, recomendação justificada | Diff completo verbose; só recomendação terse | Suficiente para decisão informada; não aprova às cegas mas não polui com noise (D20) |
| 15 | Layout `rspec-and-minitest` | Padrões framework-agnostic + snippets duplos (RSpec + Minitest por padrão) | Seções separadas RSpec/Minitest; RSpec primário | Melhor compressão sem duplicar explicação; respeita cap de 200 linhas (D21) |

---

## Criterios de Aceite

- [ ] **CA-01:** Dado o plugin matrix populado com `docs/knowledge/rails/{INDEX.md, atoms/*.md}`, quando dev clona o plugin, então os 14 átomos + INDEX estão presentes; cada átomo tem frontmatter completo (`topic, stack, layer, sources, tier, triggers, related_skills, updated` + `rails_versions` quando aplicável), corpo ≤ 200 linhas, e zero placeholders `[A DEFINIR]`.

- [ ] **CA-02:** Dado projeto Rails recém-instalado com plugin (com `Gemfile` contendo `gem 'rails'`), quando dev roda `/init`, então `.claude/stack.json` é criado com `primary: "rails"` e `.claude/knowledge/` recebe cópia de INDEX + 14 átomos em ≤ 100ms.

- [ ] **CA-03:** Dado projeto Sinatra (com `Gemfile` mas sem `gem 'rails'`), quando dev roda `/init`, então `.claude/stack.json` é criado com `primary: null` (ou `"unknown"`), `.claude/knowledge/` NÃO recebe átomos Rails, e init informa `"Gemfile detectado mas sem declaração 'gem rails'. Stack: unknown."`.

- [ ] **CA-04:** Dado projeto Rails legado (Gemfile com `gem 'rails', '~> 7.0'` ou inferior), quando dev roda `/init`, então knowledge é copiado normalmente E init exibe warning `"⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar."`.

- [ ] **CA-05:** Dado projeto com `.claude/knowledge/INDEX.md` Rails populado, quando agente invoca `/security` (ou qualquer das 6 outras cross-stack skills), então a resposta começa com preface citando `.claude/knowledge/INDEX.md` antes do corpo da skill, e o INDEX permite localizar o átomo `security-csrf-and-brakeman` via seção "Para /security".

- [ ] **CA-06 (edge case):** Dado projeto com Gemfile sem `gem 'rails'`, quando dev roda `/init`, então telemetria `stack_detected` ainda é emitida com `anchor_files: ["Gemfile"]` e `primary: null` — visibilidade preservada mesmo em fallback.

- [ ] **CA-07 (multi-stack):** Dado projeto monorepo Rails + Node (Gemfile com `gem 'rails'` + package.json com TS, maioria dos arquivos é `.rb`), quando dev roda `/init`, então `stack.json.primary == "rails"`, `secondary == ["nodejs-typescript"]`, knowledge Rails é copiado, knowledge Node NÃO é copiado.

- [ ] **CA-08 (qualidade):** Para cada átomo escrito pelo subagente extrator, quando subagente verifier rodar audit refined (apenas `Padrões sênior` + `Anti-padrões` + `Critérios de decisão`), então pelo menos 80% das claims dessas seções são rastreáveis para passagens específicas das fontes listadas no frontmatter `sources:`. Audit humano obrigatório de 3 átomos antes de aprovar batch: `active-record-fundamentals` (T1), `action-view-and-hotwire` (T2), `action-cable-and-realtime` (T3).

- [ ] **CA-09:** Skills cross-stack mantêm comportamento original quando `.claude/knowledge/INDEX.md` não existe — graceful degradation, sem warnings ou erros (regressão CA-09 do Node, valida que mudança em `detect-stack.ts` não quebra projetos não-Rails).

- [ ] **CA-10 (regressão):** Schema estendido com `rails_versions` opcional NÃO invalida átomos Node existentes (que não têm o campo). Test fixture roda `harness:validate` sobre Node atoms + Rails atoms — 100% pass.

- [ ] **CA-11 (regressão Node):** `/init` em projeto Node+TS puro (sem Gemfile) continua entregando knowledge Node sem regressão visível para o dev — fluxo do Node v6.3.2 intacto.

---

## Out of Scope

Ver "Won't Have" acima. Resumo: outras stacks (Python, Go, Laravel), drift detection automática, update flow para projetos instalados, ActionText/Mailbox dedicados, Rails Engines, GraphQL, frontend full-SPA, Sorbet/RBS, Capistrano/Heroku como átomo dedicado.

---

## Dependencias

| Tipo | Dependência | Status |
|---|---|---|
| Feature pré-requisito | `2026-05-16-stack-knowledge-nodejs-typescript` (v6.3.2) | ✅ Completed 2026-05-17 |
| Skill existente | `/init` (`skills/init/SKILL.md`) | ✅ Disponível, regressão de `detect-stack.ts` |
| Padrão existente | `MATRIX_FOLDER_VALUES` em `skills/init/lib/stack-id-map.ts` | ✅ Já inclui `'rails'` |
| Padrão existente | `STACK_ID_TO_MATRIX_FOLDER['rails']` | ✅ Já mapeado para `'rails'` |
| Padrão existente | `runStackKnowledgeInit` em `skills/init/lib/run-stack-knowledge-init.ts` | ✅ Stack-agnostic |
| Padrão existente | `getStackKnowledgePreface` em `skills/security/lib/stack-aware-preface.ts` | ✅ Lê INDEX.md genérico |
| Lib interna | `lib/telemetry-utils.ts` (`writeTelemetryDomainEvent`) | ✅ Stack-agnostic |
| Fonte de conteúdo | `claude-code/knowledge/Rails/` (9 compass + 13 skill packages + 7 deep-research) | ✅ Disponível; dedup em Plano01 fase01 |
| Validação | `harness:validate` | ✅ Disponível, regressão para `rails_versions` |
| Compound lesson | `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` | ✅ Disponível, referência em prompt do extrator |
| Compound lesson | `docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` | ✅ Disponível, referência em prompt do verifier |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Compressão excessiva perde nuance crítica (~13.8k → ~1.7k linhas, 8× compressão) | Média | Médio | Átomo piloto no Plano01 + revisão de tamanho real; anti-drift clause evita inflar com claims fora da fonte |
| Subagente verifier entrega false-positive "tudo OK" sem checar de verdade | Média | **Alto** | Verifier refined protocol obrigatório (regressão Node); audit humano de 3 átomos antes de aprovar batch (CA-08) |
| Dedup auditada decide ficar com a versão errada do par `* copy` | Média | Médio | Subagente gera diff legível; dev aprova explicitamente; relatório `dedup-report.md` commitado para audit trail futuro |
| Conteúdo Rails-native difere tanto do Node que skills cross-stack não acham átomo via INDEX | Baixa | Alto | D9: INDEX organizado por skill cross-stack + tier (não por sub-framework); E2E em Plano03 valida `/security` → encontra `security-csrf-and-brakeman` |
| Schema `rails_versions` quebra átomos Node existentes (sem o campo) | Baixa | Alto | RF4 + CA-10: campo OPCIONAL no schema; test fixture explícita valida Node atoms + Rails atoms juntos |
| `active-storage` mal classificado como T3 cria fricção em apps modernas que dependem dele | Média | Baixo | RF13: flag de revisão no batch B; pode subir para T2 sem custo de re-extração |
| Detector update em `detect-stack.ts` introduz regressão para projetos Rails atípicos (sem `gem 'rails'` literal mas usando Rails via path local, fork, etc.) | Baixa | Médio | CA-06: fallback gracioso para `'unknown'`; telemetria registra anchor encontrado mesmo no fallback; corner case raríssimo |
| Compass artifacts contradizem skill packages (versão/opinião divergente) | Média | Médio | D2 + D12: skill packages = autoridade primária; se contradição, escolher skill package e documentar nota em "Critérios de decisão" do átomo |
| Volume real de ~13.800 linhas tenta inflar átomos acima de 200 | Alta | Médio | Hard cap mantido; verifier rejeita átomo > 200; conteúdo excedente vira follow-up para v6.3.4+ |
| Hardening leve perde finding crítico que hardening completo do Node teria pego | Baixa | Médio | Content auditors cobrem onde há risco real (markdown drift); auditores de código têm ~5 linhas de delta (regex em `detect-stack.ts` + schema update) — risco genuinamente baixo |
| Rails 7.1 vs 8.x divergência cria átomos confusos misturando "padrão Rails 8" com "fallback 7.1" | Média | Médio | Frontmatter `rails_versions` por átomo; corpo do átomo separa "Padrão Rails 8" (default) e "Compat Rails 7.x" (callout) — verifier refined audita só sênior+anti+critérios, não a callout box |

---

<!-- Gerado por /anti-vibe-coding:write-prd em 2026-05-18 importando CONTEXT.md (16 decisões via /grill-me) -->

<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only. Layout único (D21): padrões framework-agnostic com snippets duplos.
-->

# Fase 05: Átomo `rspec-and-minitest.md` (T1) — layout snippets duplos (D21)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 2h (snippets duplos consomem mais tempo de extração)
**Depende de:** Plano 01 fase-01 (dedup), fase-02 (schema), fase-04 (piloto)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 1 `docs/knowledge/rails/atoms/rspec-and-minitest.md` (~160 linhas), condensando testing patterns **framework-agnostic** com snippets duplos: cada padrão tem explicação genérica + snippet RSpec + snippet Minitest (D21). Cobre isolation com `let!`/`setup`, factories vs fixtures (FactoryBot vs Rails fixtures), system tests com Capybara, stubbing time/IO, database cleaner strategy, parallel testing. Cobre o ângulo Rails-specific (RSpec rails matchers, Minitest assertions, `rails test:system`) que `/tdd-workflow` cobre como ciclo cross-stack Red-Green-Refactor.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/rspec-and-minitest.md` | Create | Átomo completo (~160 linhas) com layout snippets duplos (D21) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar dedup para `rails-tdd-slices` vs `rails-tdd-slices copy` |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` STATE.md global. Confirmar decisão para `rails-tdd-slices` vs `rails-tdd-slices copy`. Sem decisão aprovada, **BLOQUEAR**.

### Passo 2: Frontmatter exato

```yaml
---
topic: rspec-and-minitest
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-tdd-slices/PATTERNS.md
  - claude-code/knowledge/Rails/rails-tdd-slices/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-expert/PITFALLS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-61b9b080-e1e9-41f8-8268-b0fe0d1b305a_text_markdown.md
tier: 1
triggers: [test, rspec, minitest, factory_bot, fixtures, capybara, system test, stubbing, database cleaner, parallel testing, let, setup]
related_skills: [/tdd-workflow, /design-patterns]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

Substituir `rails-tdd-slices` por `copy` se decisão foi `copy`.

### Passo 3: Corpo seguindo skeleton fixo do piloto (LAYOUT ÚNICO D21)

**Seções (5 — sem API-only):**

1. `# RSpec and Minitest` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns **framework-agnostic** com snippets duplos
4. `## Anti-padrões` — 3-5 armadilhas com correção
5. `## Critérios de decisão` — tabela
6. `## Referências externas`

**LAYOUT D21:** cada pattern tem estrutura única (NÃO criar seções separadas RSpec/Minitest):

```markdown
### Pattern: {nome framework-agnostic}

**Problema:** {explicação genérica do problema, independente de framework}

**Padrão:** {abordagem técnica abstrata}

**RSpec:**
```ruby
{snippet curto — 4-6 linhas}
```

**Minitest:**
```ruby
{snippet curto — 4-6 linhas}
```

**Quando usar:** {condição}
**Quando NÃO usar:** {condição}
```

### Passo 4: Patterns recomendados (guia editorial — framework-agnostic D21)

Mínimo 5, máximo 7:

- **Pattern: Isolation com `let!` (RSpec) / `setup` (Minitest)** — Problema: setup compartilhado entre testes vaza estado; Padrão: cada teste cria seu próprio data setup com cleanup automático. RSpec: `let!(:user) { create(:user) }`. Minitest: `def setup; @user = users(:admin); end`. Quando usar: data necessário por todos os testes do bloco. Quando NÃO: data único de um teste → criar inline.

- **Pattern: Factories (FactoryBot) vs Fixtures (Rails)** — Problema: data de teste manual vira boilerplate; Padrão: factories são lazy + customizáveis; fixtures são carregadas no DB no início do test run (rápidas, mas estáticas). RSpec/FactoryBot: `create(:user, email: 'a@b.com')`. Minitest/fixtures: `users(:admin)` lendo `test/fixtures/users.yml`. Quando usar factories: cenários variados (a maioria). Quando usar fixtures: data lookup ref + suite test grande (fixtures são MUITO mais rápidas).

- **Pattern: System tests com Capybara (`rails test:system`)** — Problema: integration entre controllers/views/JS; Padrão: Rails 5.1+ inclui Capybara por padrão. RSpec: `describe 'Login', type: :system do; it { visit '/login'; ... }; end`. Minitest: `class LoginTest < ApplicationSystemTestCase; test 'logs in' do; visit '/login'; end; end`. Quando usar: fluxos críticos end-to-end (signup, checkout). Quando NÃO usar: lógica isolada — preferir unit/request tests (mais rápidos).

- **Pattern: Stubbing time (`travel_to`, `freeze_time`)** — Problema: testes time-dependent flaky; Padrão: ActiveSupport `travel_to` + `travel_back`. RSpec: `before { travel_to Time.zone.local(2026, 1, 1) }; after { travel_back }`. Minitest: `setup { travel_to Time.zone.local(2026, 1, 1) }; teardown { travel_back }`. Quando usar: validações de expiração, cron, billing. Quando NÃO usar: testes que envolvem real timing (latency, race) — usar fake timer não resolve.

- **Pattern: Database cleaner strategy (transactional vs truncation)** — Problema: data de teste vaza entre exemplos; Padrão: Rails 5.1+ usa **transactional fixtures** por padrão (rollback automático). System tests com JS exigem truncation (DB cleaner gem) porque rodam em outra thread. RSpec: config em `spec/rails_helper.rb`. Minitest: padrão é transactional via `ActiveRecord::TestFixtures`. Quando NÃO usar transactional: tests com Capybara + JS driver (Selenium, Cuprite).

- **Pattern: Request tests vs Controller tests (deprecated)** — Problema: controller tests não exercitam routing/middleware; Padrão: usar request tests (`get '/users/1'`) que sobem o middleware stack completo. RSpec: `describe 'GET /users/1', type: :request do; it { get '/users/1'; expect(response).to be_successful }; end`. Minitest: `class UsersControllerTest < ActionDispatch::IntegrationTest; test 'shows user' do; get user_path(@user); assert_response :success; end; end`. Quando NÃO usar request: lógica de model — unit test direto no model é mais barato.

- **Pattern: Parallel testing (`rails test -p` / `parallel_tests`)** — Problema: suite test cresce > 5min, feedback loop quebrado; Padrão: Rails 6+ paraleliza por processos (DB isolation via schema multi-tenant). RSpec: `parallel_tests` gem. Minitest: built-in `parallelize(workers: :number_of_processors)` em `test_helper.rb`. Quando NÃO usar: suite < 100 testes — overhead de spawn > ganho.

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: `let` (lazy) quando teste depende de criação no DB** — Sintoma: `let(:user) { create(:user) }` não é avaliado até referenciado; se teste valida `User.count`, `user` não existe; Correção: usar `let!` (eager).
- **Anti-pattern: Test pollution via `Time.now` real** — Sintoma: testes verde de manhã, vermelho à noite (timezone, business hours); Correção: `travel_to` em qualquer teste time-dependent.
- **Anti-pattern: `before(:all)` (RSpec) compartilhando state mutável** — Sintoma: teste 1 modifica `@user`, teste 2 falha; Correção: usar `before(:each)` (default) ou `let` — isolamento por teste.
- **Anti-pattern: Mock excessivo do próprio model** — Sintoma: `allow(User).to receive(:find).and_return(...)`; teste passa mas refactor de User quebra produção; Correção: testar com instância real; mock só boundary externa (HTTP, mail).

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Setup compartilhado por todos os testes do bloco | `let!` (RSpec) / `setup` (Minitest) |
| Setup variável por teste | Inline na lambda do teste |
| Data de teste customizável | Factories (FactoryBot) |
| Data lookup ref + suite grande | Fixtures (Rails YAML) |
| Test end-to-end com browser | System test + Capybara |
| Validação time-dependent | `travel_to` + `travel_back` |
| Suite > 5min | Parallel testing (`parallelize`) |
| Controller test | Request test (`type: :request`) |

### Passo 7: Referências externas

- Skill: `/tdd-workflow` para ciclo Red-Green-Refactor cross-stack
- Skill: `/design-patterns` para isolation, dependency injection em tests
- Source: paths absolutos listados em `sources:`

### Passo 8: Comando para invocar extrator (anti-drift literal)

````
Você é um subagente extrator isolado.
Tarefa: escrever `docs/knowledge/rails/atoms/rspec-and-minitest.md` seguindo template piloto +
Passo 2 da fase-05.

LAYOUT D21 (CRÍTICO):
- Padrões framework-agnostic — explicação genérica única, NÃO duplicada por framework.
- Cada padrão expõe snippet RSpec + snippet Minitest após o "Padrão:".
- NÃO criar seções separadas "## RSpec" / "## Minitest". UMA seção Padrões sênior com layout único.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: arquivo gravado em `docs/knowledge/rails/atoms/rspec-and-minitest.md`. Cap ≤ 200 ln; alvo ~160.
````

---

## Gotchas

- **G1 (cap 200):** snippets duplos comprimem texto mas adicionam linhas de código (8-12 ln por pattern com 2 snippets). Alvo 160 ln — patterns precisam ficar em ~22 ln cada para acomodar 6 patterns. Se exceder, cortar 1 pattern (Parallel testing — niche em suite pequena).
- **G2 (anti-drift):** APIs específicas (`travel_to` está em ActiveSupport desde Rails 5.2; `parallelize` desde Rails 6.0) DEVEM estar na fonte. Se source não cita, descrever qualitativamente.
- **G5 (D21 layout):** se subagente entregar seções separadas RSpec/Minitest (violação D21), retrabalho obrigatório. Validar via grep no checklist.
- **G6 (fonte canônica):** `rails-tdd-slices` vs `copy`. Confirme.
- **G8 (paths absolutos):** sources a partir de `claude-code/knowledge/Rails/`.
- **Local — snippets curtos:** snippets DEVEM ser 4-6 ln cada. Snippets longos (15+ ln) violam cap 200 e diluem o pattern. Se exemplo precisa ser longo, ele é exemplo errado — escolher caso mais simples.

---

## Verificacao

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/rspec-and-minitest.md`
- [ ] Frontmatter 8 campos + `rails_versions: ['>=7.1']`
- [ ] `topic: rspec-and-minitest`, `stack: rails`, `layer: backend`, `tier: 1`
- [ ] `sources:` apontam para arquivos existentes
- [ ] 5 seções (sem API-only)
- [ ] ≥5 patterns em "Padrões sênior" com layout D21: explicação única + snippet RSpec + snippet Minitest
- [ ] NÃO existe seção `## RSpec` separada da `## Minitest` (`grep -c '^## RSpec$'` retorna 0)
- [ ] NÃO existe seção `## Minitest` separada (`grep -c '^## Minitest$'` retorna 0)
- [ ] ≥3 anti-padrões
- [ ] Triggers contém: `test`, `rspec`, `minitest`, `factory_bot`, `capybara`, `system test`
- [ ] `wc -l` entre 140 e 200 (alvo ~160)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/rspec-and-minitest.md` exit 0
- `wc -l` retorna entre 140 e 200
- `grep -c '^## RSpec$' docs/knowledge/rails/atoms/rspec-and-minitest.md` retorna 0 (validação D21)
- `grep -c '^## Minitest$' docs/knowledge/rails/atoms/rspec-and-minitest.md` retorna 0 (validação D21)
- `grep -c '\*\*RSpec:\*\*' docs/knowledge/rails/atoms/rspec-and-minitest.md` retorna ≥5 (snippets duplos por pattern)
- `grep -c '\*\*Minitest:\*\*' docs/knowledge/rails/atoms/rspec-and-minitest.md` retorna ≥5
- `grep -c '\[A DEFINIR\]'` retorna 0
- `bun run harness:validate` passa

**Por humano:**

- Não flagged CA-08 humano. Verifier refined da fase-09 valida — audita só padrões abstratos + anti-padrões + critérios. Os snippets contam como ilustração técnica do pattern abstrato — não claim independente para audit.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

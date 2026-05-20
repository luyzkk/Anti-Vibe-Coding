---
topic: rspec-and-minitest
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-tdd-slices/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md
tier: 1
triggers: [test, rspec, minitest, factory_bot, fixtures, capybara, system test, stubbing, database cleaner, parallel testing, let, setup, request spec, build_stubbed]
related_skills: [/tdd-workflow, /design-patterns]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# RSpec and Minitest

## Quando consultar

- Ao escolher onde comecar um novo teste (request, model, system, service)
- Ao decidir entre FactoryBot e fixtures YAML para dados de teste
- Ao testar fluxos com browser (system tests) vs HTTP puro (request specs)
- Ao estubar tempo, jobs ou dependencias externas em testes
- Ao otimizar suite lenta com paralelizacao ou DatabaseCleaner

## Padroes senior

### Pattern: Escolha de boundary — onde comecou o primeiro teste

- **Problema:** primeiro teste escrito na camada errada (ex: controller spec para comportamento HTTP) desperdicando ciclos com boundary fraco
- **Padrao:** comecar no nivel mais alto que captura o risco sem acoplar ao detalhe; request spec prova contrato HTTP completo (routing + middleware); model spec prova regra de dominio isolada; system spec so quando o risco e browser/JS

**RSpec:**
```ruby
RSpec.describe "POST /orders", type: :request do
  it "creates an order and returns 201" do
    post orders_path, params: { order: { sku: "A" } }, as: :json
    expect(response).to have_http_status(:created)
  end
end
```

**Minitest:**
```ruby
class OrdersTest < ActionDispatch::IntegrationTest
  test "creates an order and returns 201" do
    post orders_url, params: { order: { sku: "A" } }, as: :json
    assert_response :created
  end
end
```

- **Quando usar request spec:** endpoint HTTP, validacao de params, JSON shape, autorizacao
- **Quando NAO usar system spec:** logica de controller ou dominio isolado — request spec e significativamente mais rapida

### Pattern: Factories vs Fixtures — estrategia de dados de teste

- **Problema:** dados de teste manual viram boilerplate; factories infladas criam dependencias implicitas e inserem dezenas de registros por exemplo
- **Padrao:** FactoryBot para variacao por teste (traits, cenarios de borda); fixtures YAML para dados canonicos estaveis reutilizados em > 50% dos testes (carregadas em bulk, revertidas via transacao — sem overhead de INSERT por exemplo); `build_stubbed` quando o teste nao precisa do DB

**RSpec:**
```ruby
user = build_stubbed(:user, role: "admin")   # sem hit no DB
user = create(:user, :with_orders)           # factory com trait
```

**Minitest:**
```ruby
# test/fixtures/users.yml: admin: { email: admin@ex.com, role: admin }
user = users(:admin)   # lookup de fixture — zero INSERT
```

- **Quando usar factories:** variacao por teste, grafos complexos, cenarios de borda
- **Quando usar fixtures:** dados canonicos estaveis (roles, paises, tipos) + suite grande onde performance importa

### Pattern: System tests com Capybara — apenas fluxos criticos com JS

- **Problema:** system tests adicionam custo de browser; usar para tudo torna a suite lenta e fragil
- **Padrao:** Rails 5.1+ inclui Capybara por padrao; `ApplicationSystemTestCase` (Minitest) e `type: :system` (RSpec) disparam browser real; reservar para fluxos criticos multi-pagina com JS (login, checkout); API-only nao usa system tests

**RSpec:**
```ruby
describe "Login flow", type: :system do
  it "redirects to dashboard after login" do
    visit new_session_path
    fill_in "Email", with: "a@b.com"
    click_button "Login"
    expect(page).to have_text("Dashboard")
  end
end
```

**Minitest:**
```ruby
class LoginTest < ApplicationSystemTestCase
  test "redirects to dashboard after login" do
    visit new_session_path
    fill_in "Email", with: "a@b.com"
    click_button "Login"
    assert_text "Dashboard"
  end
end
```

- **Quando usar:** fluxos criticos end-to-end com JS, Turbo Stream, drag-and-drop
- **Quando NAO usar:** logica HTTP sem JS — request spec prova o mesmo com custo de browser zero

### Pattern: Stubbing de tempo com `travel_to`

- **Problema:** testes time-dependent sao flaky (verde de manha, vermelho a noite); `Time.now` nao respeita `Time.zone`
- **Padrao:** `ActiveSupport::Testing::TimeHelpers#travel_to` e nativo; no RSpec requer include explicito; no Minitest ja incluido por padrao; nunca usar gem `timecop` em codigo novo

**RSpec:**
```ruby
RSpec.configure { |c| c.include ActiveSupport::Testing::TimeHelpers }

travel_to Time.zone.local(2026, 1, 1) do
  expect(subscription.next_billing).to eq(Date.new(2026, 2, 1))
end
```

**Minitest:**
```ruby
# TimeHelpers incluido por padrao
travel_to Time.zone.local(2026, 1, 1) do
  assert_equal Date.new(2026, 2, 1), subscription.next_billing
end
```

- **Quando usar:** validacoes de expiracao, billing, cron, janelas de tempo
- **Quando NAO usar:** testes de latencia real ou race conditions — congelar tempo nao resolve

### Pattern: Mock de fronteiras externas, nao internos estaveis

- **Problema:** stubar ActiveRecord esconde N+1, validacoes e bugs de query; mock excessivo acopla testes ao design interno
- **Padrao:** mocke apenas fronteiras externas (HTTP client, SDK, mailer gateway); use objeto real com `build_stubbed` ou `create` para AR; `instance_double` (RSpec) verifica aridade e existencia do metodo ao contrario de `double` anonimo

**RSpec:**
```ruby
payment = instance_double(PaymentGateway, charge!: true)  # verifying double
allow(payment).to receive(:charge!).and_return(true)
# AR real, nao mockado:
user = build_stubbed(:user, role: "admin")
```

**Minitest:**
```ruby
mock = Minitest::Mock.new
mock.expect(:charge!, true, [amount])
PaymentGateway.stub(:new, mock) { subject.call }
mock.verify
```

- **Quando usar mock:** gateway HTTP, SDK externo, mailer — fronteiras que custam dinheiro ou introduzem flakiness
- **Quando NAO usar mock:** AR models estaveis, POROs proprios — use objeto real

## Anti-padroes

### `let` lazy quando teste depende de criacao no DB

- **Sintoma:** `let(:user) { create(:user) }` nao e avaliado ate ser referenciado; `User.count` retorna 0 no before
- **Correcao:** usar `let!` (eager) ou criar inline no teste

### Controller specs como proxy HTTP

- **Sintoma:** `type: :controller` testando routing, middleware, autorizacao — boundary incompleto
- **Correcao:** request specs (RSpec `type: :request`) e integration tests (Minitest `ActionDispatch::IntegrationTest`) que exercitam routing e middleware stack completo; controller specs sao desencorajados desde RSpec 3.5 / Rails 5

### `before(:all)` (RSpec) ou setup global com estado mutavel

- **Sintoma:** teste 1 modifica `@user`; teste 2 falha por vazamento de estado
- **Correcao:** `before(:each)` (default) ou `let` — cada exemplo cria seu proprio estado isolado; para performance sem isolamento comprometido, usar `before_all` do TestProf

### Mock do proprio model AR

- **Sintoma:** `allow(User).to receive(:find).and_return(...)` — teste passa mas refactor de User quebra producao
- **Correcao:** usar instancia real com `build_stubbed` ou `create`; reservar mock para fronteiras externas

## Criterios de decisao

| Cenario | Escolha |
|---|---|
| Endpoint HTTP, params, JSON shape | Request spec / Integration test |
| Regra de dominio pura, validacao AR | Model spec / ActiveSupport::TestCase |
| Fluxo critico com JS no browser | System spec / ApplicationSystemTestCase |
| Dados compartilhados por > 50% dos testes | Fixtures YAML |
| Dados variaveis por teste | FactoryBot com traits |
| Objeto sem necessidade de DB | `build_stubbed` |
| Teste time-dependent | `travel_to` / `freeze_time` |
| Boundary HTTP externo | WebMock + stub explicito |
| Suite > 5min | `parallelize(workers: :number_of_processors)` |

## Referencias externas

- Skill: `/tdd-workflow` — ciclo Red-Green-Refactor cross-stack
- Skill: `/design-patterns` — isolamento, dependency injection em testes
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-tdd-slices/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md

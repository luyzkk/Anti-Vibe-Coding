---
topic: rails-conventions-and-magic
stack: rails
layer: both
sources:
  - skill: rails-stack-conventions (claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md)
  - research: wf-0deebe76 (claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md)
  - research: wf-3e82e3be (claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md)
tier: 1
triggers: [CoC, DRY, Zeitwerk, ActiveSupport, metaprogramming, conventions, autoloading]
related_skills: [/architecture, /design-patterns]
updated: 2026-05-19
rails_versions: ['>=7.1']
---

# Rails Conventions and Magic

## Quando consultar

- Ao criar novos arquivos ou pastas fora dos defaults Rails (`app/models`, `app/controllers`, etc.)
- Antes de adicionar configuracao customizada de autoloading (`config.autoload_paths`, `Zeitwerk::Loader` manual)
- Ao decidir entre concern, PORO, service object ou instance method no modelo
- Ao usar `method_missing`, `define_method`, `class_eval` ou `Module#prepend`
- Ao duvidar se uma convencao Rails (naming, rotas REST, callbacks) deve ser quebrada

## Padroes senior

### Pattern: Convention over Configuration — siga antes de inventar

- **Problema:** impulso de mover pastas, renomear classes contra inflexao ou configurar autoload paths customizados
- **Padrao:** use os generators (`bin/rails g model|controller|migration`); o arquivo `app/models/billing/invoice.rb` vira `Billing::Invoice` automaticamente via Zeitwerk sem configuracao adicional
- **Quando usar:** sempre que houver impulso de criar estrutura fora dos defaults Rails
- **Quando NAO usar:** acrônimos de domínio (CNPJ, IBAN, SKU) podem ser declarados; engines precisam de `isolate_namespace`

### Pattern: Zeitwerk — naming resolve, nao configuracao

- **Problema:** `config/initializers/zeitwerk.rb` com `push_dir`, `require_dependency` e inflexoes customizadas espalhados
- **Padrao:** Xavier Noria (autor do Zeitwerk, Fukuoka Ruby Award 2022): "With Zeitwerk, you just name things following conventions and done. Things are available everywhere, and descend is always orderly." Quebrar isso quebra reload, eager loading e generators
- **Quando usar:** autoloading Zeitwerk e o default para todo Rails 7.x/8.x — apenas siga naming conventions
- **Quando NAO usar:** `require_dependency` e `config.autoload_paths` customizados so quando documentado em ADR com problema concreto

### Pattern: ActiveSupport extensions — use livremente

- **Problema:** reinventar utilitarios que o framework ja provê
- **Padrao:** `Array.wrap`, `Hash#deep_symbolize_keys`, `String#squish`, `Object#presence`, `Numeric#minutes`, `Date.current`; nunca `Time.now` em codigo Rails — `Time.current` respeita `Time.zone`; `present?`/`blank?`/`presence` do ActiveSupport em vez de checks manuais
- **Quando usar:** sempre que o metodo existir no ActiveSupport — consulte antes de escrever o equivalente manual
- **Quando NAO usar:** sem restricao; sao parte do framework

### Pattern: Metaprogramming idiomatico — use com contexto, nao como default

- **Problema:** uso irrestrito de `method_missing`, `eval` ou `class_eval` sem disciplina
- **Padrao:** `define_method` e aceitavel em DSLs declarativas (model macros, ActiveRecord-style); `class_eval`/`instance_eval` em metaprogramming controlada (geracao de scopes, attribute DSL); `Module#prepend` para hooks de framework/instrumentacao; `method_missing` SEMPRE acompanhado de `respond_to_missing?` — jamais um sem o outro
- **Quando usar:** geracao de API declarativa tipo ActiveRecord (macros, has_many, validates)
- **Quando NAO usar:** `eval` com input nao-controlado (risco de seguranca); `ObjectSpace` em producao; Refinements (`using Foo`) confundem tooling e tem pegadinhas de escopo

### Pattern: Concerns capturam um trait, nao fatiam um god model

- **Problema:** concerns como lixeira para quebrar modelos grandes sem coesao real
- **Padrao:** Manrubia (37signals): "each concern should be a cohesive unit that captures a trait of the host model. They need to feature a genuine *has trait* or *acts as* semantics to work." Concern compartilhado: `app/models/concerns/searchable.rb`; concern especifico do model: `app/models/recording/completable.rb`
- **Quando usar:** capacidade compartilhada entre 2+ modelos (`Closable`, `Searchable`, `Completable`)
- **Quando NAO usar:** concern incluido em uma unica classe (sintoma de junk drawer); Bryan Helmkamp (Code Climate): "I discourage pulling sets of methods out of a large ActiveRecord class into 'concerns' that are then mixed in to only one model"

## Anti-padroes

### Anti-pattern: Zeitwerk com configuracao manual

- **Sintoma:** `config/initializers/zeitwerk.rb` instanciando `Rails.autoloaders.main.push_dir`, `require_dependency` espalhado, inflexoes personalizadas para nomes comuns
- **Por que e ruim:** quebra reload em desenvolvimento, eager loading em producao, e os generators Rails passam a nao encontrar arquivos onde esperam
- **Correcao:** seguir naming conventions (`snake_case` arquivo → `CamelCase` classe); declarar apenas acrônimos reais do domínio no inflector

### Anti-pattern: Monkey patching de classes Ruby core

- **Sintoma:** `String`, `Hash`, `Array` sendo reabertos em `config/initializers/` ou `lib/` com metodos novos
- **Por que e ruim:** colide com futuras versoes do Ruby e outras gems; ActiveSupport ja oferece extensoes seguras e versionadas
- **Correcao:** usar metodos ActiveSupport equivalentes; se nenhum existe, encapsular em PORO ou modulo explicito sem reabrir o core

### Anti-pattern: `method_missing` sem `respond_to_missing?`

- **Sintoma:** classe define `method_missing` mas nao define `respond_to_missing?`
- **Por que e ruim:** `respond_to?`, introspeccao e duck typing quebram — o objeto mente sobre sua propria interface
- **Correcao:** sempre implementar os dois juntos; se a interface e estatica, prefira `define_method` em loop no boot

### Anti-pattern: DI container e interfaces simuladas

- **Sintoma:** `IUserNotifier`, `AbstractBaseFooController`, DI container injetando dependencias
- **Por que e ruim:** DHH ("Dependency injection is not a virtue in Ruby", dhh.dk, 2013): "As has unfortunately happened with a variety of patterns that originate from rigid languages like Java, Dependency Injection has spread and been advocated as a cross-language best practice on trumped up benefits." Rails usa hard-coded references; em testes, stubbing de constantes e `ActiveSupport::Testing::TimeHelpers`
- **Correcao:** duck typing; stub de constantes em testes; sem container

## Criterios de decisao

| Se... | Entao... |
|---|---|
| Novo arquivo em `app/` segue `NomeClasse` CamelCase | Nomeie o arquivo `nome_classe.rb` — Zeitwerk resolve automaticamente |
| Preciso de utilitario de string, data ou array | Consulte ActiveSupport antes de escrever metodo proprio |
| Comportamento compartilhado entre 2+ modelos | Use `ActiveSupport::Concern` com semantica *has-trait* |
| Comportamento exclusivo de um modelo | Instance method no proprio modelo, nao concern |
| Quero gerar metodos dinamicamente em DSL | `define_method` com contexto; documente o motivo |
| Tentado a usar `method_missing` | Implemente `respond_to_missing?` junto; considere `define_method` se o conjunto e finito |
| Precisar de extensao de String/Hash/Array | Use metodo ActiveSupport equivalente; nunca reabra o core no app |
| Quero quebrar convencao Rails (pasta, naming, autoload) | Escreva ADR com problema concreto antes de tocar na configuracao |

## Referencias externas

- Skills relacionadas: /architecture, /design-patterns
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md
  - claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md

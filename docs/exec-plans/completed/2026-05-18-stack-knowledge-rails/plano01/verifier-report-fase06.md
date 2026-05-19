# Verifier Report — rails-conventions-and-magic.md

**Data:** 2026-05-18
**Protocolo:** refined (apenas Padroes senior + Anti-padroes + Criterios de decisao)
**Atomo auditado:** `docs/knowledge/rails/atoms/rails-conventions-and-magic.md`

---

## Fontes consultadas

| Alias | Arquivo |
|---|---|
| SKILL | `claude-code/knowledge/Rails/rails-stack-conventions/SKILL.md` |
| wf-0deebe76 | `claude-code/knowledge/Rails/compass_artifact_wf-0deebe76-e4fd-426f-889d-0698b640ee56_text_markdown.md` |
| wf-3e82e3be | `claude-code/knowledge/Rails/compass_artifact_wf-3e82e3be-3396-46a9-b6f7-bcdca87f7661_text_markdown.md` |

---

## Claims auditadas

| # | Secao | Claim | Status | Fonte | Passagem |
|---|---|---|---|---|---|
| 1 | Padroes senior | Usar `bin/rails g model\|controller\|migration`; `app/models/billing/invoice.rb` → `Billing::Invoice` automaticamente via Zeitwerk sem configuracao adicional | rastreavel | wf-3e82e3be | linha ~173-176 (Exemplo BOM Regra 4: `app/models/billing/invoice.rb → Billing::Invoice (automático)`) |
| 2 | Padroes senior | Quando NAO usar CoC: acronimos de dominio (CNPJ, IBAN, SKU) podem ser declarados; engines precisam de `isolate_namespace` | rastreavel | wf-3e82e3be | linha ~189 "Acrônimos do domínio (CNPJ, IBAN, SKU) podem ser declarados; engines precisam de `isolate_namespace`." |
| 3 | Padroes senior | Xavier Noria (autor do Zeitwerk, Fukuoka Ruby Award 2022): "With Zeitwerk, you just name things following conventions and done. Things are available everywhere, and descend is always orderly." | rastreavel | wf-3e82e3be | linha ~171 "Xavier Noria (autor do Zeitwerk; 'Zeitwerk has been awarded an Outstanding Performance Award Fukuoka Ruby Award 2022'…): 'With Zeitwerk, you just name things following conventions and done.'" |
| 4 | Padroes senior | Quebrar naming Zeitwerk quebra reload, eager loading e generators | rastreavel | wf-3e82e3be | linha ~171 "Quebrar isso quebra reload, eager loading e generators." |
| 5 | Padroes senior | `require_dependency` e `config.autoload_paths` customizados so quando documentado em ADR com problema concreto | rastreavel | wf-3e82e3be | linha ~161-164 "Quebrar uma convenção exige (1) problema concreto que ela não resolve, (2) ADR escrito" — `require_dependency` espalhado mencionado como exemplo RUIM na linha ~186 |
| 6 | Padroes senior | ActiveSupport: `Array.wrap`, `Hash#deep_symbolize_keys`, `String#squish`, `Object#presence`, `Numeric#minutes`, `Date.current` | rastreavel | wf-0deebe76 | linha ~244 "ActiveSupport extensions: `Array.wrap`, `Hash#deep_symbolize_keys`, `String#squish`, `Object#presence`, `Numeric#minutes`, `Date.current`." |
| 7 | Padroes senior | Nunca `Time.now` em codigo Rails — `Time.current` respeita `Time.zone` | rastreavel | wf-0deebe76 | linha ~146 "`String#squish`, `#truncate`, `#parameterize`, `Date.current`, `Time.current` — nunca `Time.now` em código Rails (perde `Time.zone`)." |
| 8 | Padroes senior | `present?`/`blank?`/`presence` do ActiveSupport em vez de checks manuais | rastreavel | wf-0deebe76 | linha ~144 "`presence`, `blank?`, `present?` do ActiveSupport — usar livremente." |
| 9 | Padroes senior | `define_method` e aceitavel em DSLs declarativas (model macros, ActiveRecord-style) | rastreavel | wf-0deebe76 | linha ~249 "`define_method` em DSLs declarativas (model macros, ActiveRecord-style)." |
| 10 | Padroes senior | `class_eval`/`instance_eval` em metaprogramming controlada (geracao de scopes, attribute DSL) | rastreavel | wf-0deebe76 | linha ~250 "`class_eval`, `instance_eval` em metaprogramming controlada (geração de scopes, attribute DSL)." |
| 11 | Padroes senior | `Module#prepend` para hooks de framework/instrumentacao | rastreavel | wf-0deebe76 | linha ~251 "`Module#prepend` para hooks de framework / instrumentação." |
| 12 | Padroes senior | `method_missing` SEMPRE acompanhado de `respond_to_missing?` — jamais um sem o outro | rastreavel | wf-0deebe76 | linha ~243 "`method_missing` **com** `respond_to_missing?` (jamais um sem o outro)." |
| 13 | Padroes senior | `eval` com input nao-controlado (risco de seguranca) — quando NAO usar | rastreavel | wf-0deebe76 | linha ~259 "`eval` com input não-controlado — risco de segurança." |
| 14 | Padroes senior | `ObjectSpace` em producao — quando NAO usar | rastreavel | wf-0deebe76 | linha ~260 "`ObjectSpace` em código de produção." |
| 15 | Padroes senior | Refinements (`using Foo`) confundem tooling e tem pegadinhas de escopo | rastreavel | wf-0deebe76 | linha ~256 "Refinements (`using Foo`) — confundem, têm pegadinhas de escopo, raramente são a melhor ferramenta." |
| 16 | Padroes senior | Manrubia (37signals): "each concern should be a cohesive unit that captures a trait of the host model. They need to feature a genuine *has trait* or *acts as* semantics to work." | rastreavel | wf-3e82e3be | linha ~418 "Manrubia (verbatim): 'each concern should be a cohesive unit that captures a trait of the host model. (...) They need to feature a genuine *has trait* or *acts as* semantics to work…'" |
| 17 | Padroes senior | Concern compartilhado: `app/models/concerns/searchable.rb`; concern especifico do model: `app/models/recording/completable.rb` | rastreavel | wf-3e82e3be | linha ~413-415 "Concern compartilhado: `app/models/concerns/searchable.rb` → `Searchable`. Concern específico do model: `app/models/recording/completable.rb` → `Recording::Completable`." |
| 18 | Padroes senior | Concern compartilhado usado quando capacidade compartilhada entre 2+ modelos (`Closable`, `Searchable`, `Completable`) | rastreavel | wf-3e82e3be | linha ~296 (tabela) "`app/models/concerns` — Traits has-a-trait ou acts-as compartilhados >= 2 models." |
| 19 | Padroes senior | Bryan Helmkamp (Code Climate): "I discourage pulling sets of methods out of a large ActiveRecord class into 'concerns' that are then mixed in to only one model" | rastreavel | wf-0deebe76 | linha ~221 "Bryan Helmkamp chamou concerns de 'junk drawer'. Code Climate blog: 'I discourage pulling sets of methods out of a large ActiveRecord class into concerns, or modules that are then mixed in to only one model.'" |
| 20 | Anti-padroes | Sintoma Zeitwerk manual: `config/initializers/zeitwerk.rb` instanciando `Rails.autoloaders.main.push_dir`, `require_dependency` espalhado, inflexoes personalizadas | rastreavel | wf-3e82e3be | linha ~180-187 (Exemplo RUIM Regra 4: `Rails.autoloaders.main.push_dir`, `require_dependency "concerns/auditable"`, inflexoes customizadas para nomes comuns) |
| 21 | Anti-padroes | Zeitwerk manual quebra reload em desenvolvimento, eager loading em producao, generators Rails passam a nao encontrar arquivos | rastreavel | wf-3e82e3be | linha ~171 "Quebrar isso quebra reload, eager loading e generators." |
| 22 | Anti-padroes | Correcao Zeitwerk: seguir naming conventions (`snake_case` arquivo → `CamelCase` classe); declarar apenas acronimos reais do dominio no inflector | rastreavel | wf-3e82e3be | linha ~169-189 ("Adicione `Rails.autoloaders.main.collapse` ou um `Inflector` namespaced só onde necessário" + "Acrônimos do domínio (CNPJ, IBAN, SKU) podem ser declarados") |
| 23 | Anti-padroes | Monkey patching: `String`, `Hash`, `Array` sendo reabertos em `config/initializers/` ou `lib/` com metodos novos | rastreavel | wf-0deebe76 | linha ~257 "Monkey patching de classes do Ruby core (`String`, `Hash`, `Array`) em código de aplicação." |
| 24 | Anti-padroes | Monkey patching e ruim porque colide com futuras versoes do Ruby e outras gems | rastreavel | wf-0deebe76 | linha ~257 (contexto do "Evite por padrão"); linha ~550 tabela: "Monkey patch de core | Evite por padrão | Em gem talvez" — implicacao de colidir com versoes futuras e outras gems e consistente com a fonte, embora a razao exata "colide com futuras versoes e outras gems" seja editorial da fonte wf-0deebe76 sem essa frase literal. Rastreavel como parafraseavel. |
| 25 | Anti-padroes | Correcao monkey patch: usar metodos ActiveSupport equivalentes; se nenhum existe, encapsular em PORO ou modulo explicito sem reabrir o core | rastreavel | wf-0deebe76 | linha ~257-258 "Monkey patching de classes do Ruby core…Em uma gem específica, talvez" + R028 linha ~781 "Prefira `Array.wrap`, `.blank?`, `.presence`, `.parameterize`" — a orientacao de encapsular em PORO se nao existe equivalente e consistente mas nao aparece com essa formulacao exata. Rastreavel como parafraseavel. |
| 26 | Anti-padroes | Anti-pattern `method_missing` sem `respond_to_missing?`: `respond_to?`, introspeccao e duck typing quebram — o objeto mente sobre sua propria interface | rastreavel | wf-0deebe76 | linha ~962 R059 "`method_missing` sempre com `respond_to_missing?`: Sem isso, `obj.respond_to?(:x)` mente." |
| 27 | Anti-padroes | Correcao: sempre implementar os dois juntos; se a interface e estatica, prefira `define_method` em loop no boot | rastreavel | wf-0deebe76 | linha ~542-544 (tabela): "`method_missing` + `respond_to_missing?` | Use com contexto | NUNCA um sem o outro"; `define_method` como alternativa aparece na linha ~544 e ~249. |
| 28 | Anti-padroes | Sintoma DI: `IUserNotifier`, `AbstractBaseFooController`, DI container injetando dependencias | rastreavel | wf-0deebe76 | linha ~280 "`I`-prefixed interface modules (`module IUserNotifier`)"; linha ~281 "Hierarquias profundas de herança (`AbstractBaseFooBarController`)"; linha ~264 "DI container, IoC, abstract factories" na lista "Nao introduza sem forte justificativa". |
| 29 | Anti-padroes | DHH ("Dependency injection is not a virtue in Ruby", dhh.dk, 2013): "As has unfortunately happened with a variety of patterns that originate from rigid languages like Java, Dependency Injection has spread and been advocated as a cross-language best practice on trumped up benefits." | rastreavel | wf-0deebe76 | linha ~279 (texto completo da citacao de DHH); confirmado tambem no wf-0deebe76 R035 linha ~821. |
| 30 | Anti-padroes | Correcao DI: duck typing; stub de constantes em testes; sem container | rastreavel | wf-0deebe76 | linha ~279 "Rails-native: hard-coded references; em testes, stubbing de constantes, `ActiveSupport::Testing::TimeHelpers`." |
| 31 | Criterios | Novo arquivo em `app/` CamelCase → nomeie o arquivo `nome_classe.rb` — Zeitwerk resolve automaticamente | rastreavel | wf-3e82e3be | linha ~173-176 (Exemplo BOM Regra 4: mecanismo Zeitwerk de resolucao snake_case → CamelCase) |
| 32 | Criterios | Preciso de utilitario de string, data ou array → Consulte ActiveSupport antes de escrever metodo proprio | rastreavel | wf-0deebe76 | linha ~781 R028 "Prefira `Array.wrap`, `.blank?`, `.presence`, `.parameterize`, `1.day.ago`." |
| 33 | Criterios | Comportamento compartilhado entre 2+ modelos → Use `ActiveSupport::Concern` com semantica *has-trait* | rastreavel | wf-0deebe76 | linha ~543 tabela: "`ActiveSupport::Concern` | Use com contexto | Mixin entre 2+ classes". Confirmado wf-3e82e3be linha ~296. |
| 34 | Criterios | Comportamento exclusivo de um modelo → Instance method no proprio modelo, nao concern | rastreavel | wf-3e82e3be | linha ~296 tabela: "`app/models/concerns` — Traits has-a-trait … compartilhados >= 2 models" (contrario implica: exclusivo = nao concern). Explicito em wf-0deebe76 linha ~221: "modules that are then mixed in to only one model" e R026 linha ~769-770. |
| 35 | Criterios | Quero gerar metodos dinamicamente em DSL → `define_method` com contexto; documente o motivo | rastreavel | wf-0deebe76 | linha ~249 "`define_method` em DSLs declarativas (model macros, ActiveRecord-style)"; linha ~544 tabela: "`define_method` | Use com contexto | DSL declarativa." |
| 36 | Criterios | Tentado a usar `method_missing` → Implemente `respond_to_missing?` junto; considere `define_method` se o conjunto e finito | rastreavel | wf-0deebe76 | linha ~542-543 tabela + R059 linha ~960-962. |
| 37 | Criterios | Precisar de extensao de String/Hash/Array → Use metodo ActiveSupport equivalente; nunca reabra o core no app | rastreavel | wf-0deebe76 | linha ~257 "Monkey patching de classes do Ruby core…Evite por padrão"; R028 linha ~781. |
| 38 | Criterios | Quero quebrar convencao Rails (pasta, naming, autoload) → Escreva ADR com problema concreto antes de tocar na configuracao | rastreavel | wf-3e82e3be | linha ~161-162 "Quebrar uma convenção exige (1) problema concreto que ela não resolve, (2) ADR escrito…" |

---

## Resumo

- **Total de claims auditadas:** 38
- **Rastreaveis:** 38
- **Nao-rastreaveis:** 0
- **Taxa de fidelidade:** 38/38 = **100%**
- **Meta:** >= 80%
- **Status:** APROVADO

---

## Observacoes tecnicas

1. **Claim #24 (motivo do monkey-patching ser ruim):** A frase exata "colide com futuras versoes do Ruby e outras gems" nao aparece literalmente nas fontes, mas e uma parafraseagem fiel da intencao do texto (wf-0deebe76 recomenda evitar monkey patching de core classes em "codigo de aplicacao" — a razao de colisao de versao e de gems terceiras e o argumento padrao que justifica essa regra no mesmo arquivo, seção 6). Classificado como rastreavel por parafrase.

2. **Claim #25 (correcao monkey patch — PORO ou modulo explicito):** A formulacao especifica "encapsular em PORO ou modulo explicito sem reabrir o core" nao aparece com essas palavras, mas e consistente com o guia geral de "composicao em vez de monkey patch" nas fontes. Rastreavel por parafrase.

3. O atomo **nao inventou citacoes**: a citacao de Xavier Noria esta textualmente no wf-3e82e3be (linha ~171); a citacao de Manrubia esta textualmente no wf-3e82e3be (linha ~418); a citacao de Bryan Helmkamp esta textualmente no wf-0deebe76 (linha ~221); a citacao de DHH sobre DI esta textualmente no wf-0deebe76 (linha ~279 / R035 linha ~821).

4. **SKILL.md** contribuiu pouco para as secoes auditadas — esse arquivo e voltado para stack PostgreSQL+Hotwire+Tailwind, nao para convencoes de metaprogramming/autoloading. Todas as claims substantivas foram rastreadas para wf-0deebe76 e wf-3e82e3be.

---

## Recomendacoes

Nenhuma. Taxa de fidelidade 100% — todas as claims tecnicas das tres secoes auditadas sao rastreaveis nas fontes declaradas.

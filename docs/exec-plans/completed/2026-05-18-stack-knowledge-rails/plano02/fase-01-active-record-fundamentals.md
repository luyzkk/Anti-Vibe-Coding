<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, não há comentário inline em runtime.
O prompt do extrator vive nesta fase como spec, não como código de execução.
-->

# Fase 01: Átomo `active-record-fundamentals.md` (T1) — FLAGGED CA-08 audit humano

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida — fontes canônicas), fase-02 (schema `rails_versions`), fase-04 (piloto como template de frontmatter), fase-05 (anti-drift como regression)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 1 `docs/knowledge/rails/atoms/active-record-fundamentals.md` (~150 linhas), condensando querying (includes vs preload vs eager_load), callbacks ordering, validations vs DB constraints, associations (has_many through, polymorphic, STI), encryption (Rails 7+) e multiple DBs (Rails 6.1+) no idioma Rails 7.1+/8.x. Cobre o ângulo Rails-specific de cada padrão (lazy loading do AR, `inverse_of`, scopes vs class methods) que `/api-design` cobre apenas como princípio cross-stack de query optimization e N+1. **Átomo flagged CA-08 (D14, D19): após verifier refined da fase-09, Luiz revisa pessoalmente e assina em STATE.md global da feature.**

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/active-record-fundamentals.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~150 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup aprovada para `rails-code-review`, `rails-stack-conventions`, `rails-expert` (fontes do átomo) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o `STATE.md` global da feature (`f:/Projetos/Anti-Vibe-Coding/docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md`) e extrair a decisão aprovada para os 6 pares duplicados. Para este átomo, importam:

- `rails-code-review` vs `rails-code-review copy` (querying patterns, N+1 review)
- `rails-stack-conventions` vs `rails-stack-conventions v2` (idiomatic AR)
- `rails-expert` (sem duplicata — fonte primária)

Se STATE.md NÃO tem bloco `## Dedup decisions (Plano 01 fase-01)` aprovado para esses 3 itens, **BLOQUEAR a fase** e escalar para o orquestrador. Não chutar — anti-drift começa pela fonte certa.

### Passo 2: Frontmatter exato (8 campos base + `rails_versions`, verbatim com piloto)

```yaml
---
topic: active-record-fundamentals
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-expert/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-code-review/PITFALLS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md
tier: 1
triggers: [active record, querying, includes, preload, eager_load, N+1, callbacks, validations, associations, STI, polymorphic, encryption, multiple databases]
related_skills: [/api-design, /architecture, /design-patterns]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

**Notas sobre o frontmatter:**

- `sources:` listam paths absolutos a partir de `claude-code/knowledge/Rails/` (RF14). O subagente extrator deve confirmar que cada arquivo existe via `Read` antes de escrever (zero source fantasma).
- Substituir nomes de pasta acima pelos lados canônicos decididos no Plano 01 fase-01. Se `rails-stack-conventions v2` foi escolhido em vez de `rails-stack-conventions`, ajustar o path.
- `triggers` ≤ 13 keywords coerentes com o conteúdo — palavras que dev sr Rails digitaria. Sem inventar termos.
- `related_skills:` lista 3 skills cross-stack que mais consomem este átomo via INDEX (D9). NÃO listar todas as 7.
- `rails_versions: ['>=7.1']` cobre callbacks, validations, associations modernas, encryption (Rails 7+), multiple DBs (Rails 6.1+ mas mainstream 7.1+).

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem (verbatim com piloto `rails-conventions-and-magic`):

1. `# Active Record — Fundamentals` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenário (use-case framing — editorial, não rastreável)
3. `## Padrões sênior` — 5-7 patterns (sub-seções `### Pattern: {nome}` com Problema / Padrão / Quando usar / Quando NÃO usar)
4. `## Anti-padrões` — 3-5 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (audit trail RF14)

**NÃO incluir** seção API-only mode neste átomo (somente fases 03 e 04 a têm — G7 do README).

### Passo 4: Patterns recomendados (guia editorial — extrator expande de 1 linha em sub-seção completa)

Mínimo 5, máximo 7 — extrair do source canônico decidido no Plano 01. Lista Rails-native:

- **Pattern: `includes` vs `preload` vs `eager_load`** — Problema: N+1 ou JOIN desnecessário; Padrão: `includes` (Rails decide), `preload` (separate query forced), `eager_load` (single LEFT OUTER JOIN forced); Quando usar `eager_load`: ao filtrar por coluna da associação no `WHERE`; Quando NÃO usar: associações que sempre são acessadas em loop — `preload` evita JOIN cardinality blow-up.
- **Pattern: Scopes vs class methods** — Problema: queries reutilizadas espalhadas; Padrão: `scope :active, -> { where(active: true) }` para chains compostáveis; class method para lógica condicional complexa (`def self.search(q); ... end`); Quando NÃO usar scope: lógica precisa de early return ou raise.
- **Pattern: Callbacks ordering + `before_validation` vs `before_save`** — Problema: side effects acoplados ao lifecycle; Padrão: usar callbacks só para normalização de dado do próprio model (downcase email, trim strings); Quando NÃO usar: side effects cross-model (criar notificação ao salvar Post) — extrair para service object ou Event ouvido por job.
- **Pattern: Validations vs database constraints** — Problema: race condition entre `valid?` e `save`; Padrão: validation no Rails (UX, mensagens i18n) + constraint no DB (`NOT NULL`, `UNIQUE INDEX`, `CHECK`) como defesa final; Quando usar só validation: regras de negócio que mudam (ex: "telefone obrigatório só se país == BR"); Quando usar só constraint: integridade referencial (FK).
- **Pattern: `has_many :through` vs polymorphic associations** — Problema: relacionamento muitos-para-muitos com atributos; Padrão: `has_many :through` para join table com atributos (`Membership` entre `User` e `Group`); polymorphic (`belongs_to :commentable, polymorphic: true`) quando o lado pai pode ser de tipos diferentes; Quando NÃO usar polymorphic: se você precisa de FK no DB — polymorphic perde integridade referencial.
- **Pattern: STI (Single Table Inheritance)** — Problema: hierarquia de model com campos comuns; Padrão: uma tabela + coluna `type` + subclasses Ruby (`class Admin < User`); Quando usar: subclasses com ≥80% de campos compartilhados; Quando NÃO usar: subclasses com schemas divergentes — vira tabela com 30 colunas opcionais (preferir tabelas separadas com module compartilhado).
- **Pattern: Active Record Encryption (Rails 7+)** — Problema: PII sensível (CPF, telefone) em texto plano no DB; Padrão: `encrypts :document, deterministic: true` (deterministic só se precisar query por igualdade); Quando NÃO usar deterministic: tokens de sessão, secrets — usar não-deterministic (mais seguro mas não queryable).
- **Pattern: Multiple databases (Rails 6.1+)** — Problema: shard ou read replica; Padrão: `connects_to database: { writing: :primary, reading: :replica }` + `ActiveRecord::Base.connected_to(role: :reading) { ... }`; Quando NÃO usar: bases < 10GB — overhead de roteamento > ganho.

Extrator pode escolher 5-7 destes. Se source canônico cobrir todos os 8, priorizar os que tiverem maior densidade na fonte (mais parágrafos = menos drift).

### Passo 5: Anti-padrões (3-5 armadilhas com correção)

Exemplos Rails-specific (extrator escolhe os que estão na fonte):

- **Anti-pattern: `.includes` sem `references` quando filtra por coluna da associação** — Sintoma: `Post.includes(:author).where("authors.name = ?", q)` gera 2 queries em vez de JOIN; Correção: `.includes(:author).references(:authors)` ou usar `.eager_load(:author)`.
- **Anti-pattern: callbacks chamando outros models (cascata invisível)** — Sintoma: `after_save :notify_admin` em `Post` cria `Notification`, `Email`, `AuditLog`; Correção: extrair para service object (`PostPublisher.new(post).call`) ou disparar evento via `ActiveSupport::Notifications`.
- **Anti-pattern: `validates :email, uniqueness: true` sem UNIQUE INDEX no DB** — Sintoma: race condition em signup paralelo cria duplicatas; Correção: validation + `add_index :users, :email, unique: true` na migration.
- **Anti-pattern: `has_many :posts, dependent: :destroy` em model com 100k+ posts** — Sintoma: `user.destroy` carrega todos os posts em memória + roda callbacks por linha; Correção: `dependent: :destroy_async` (Rails 6.1+) ou job de cleanup em batch (`delete_all` se sem callbacks).
- **Anti-pattern: scope com lógica de autorização** — Sintoma: `scope :for_user, ->(user) { where(...) }` esconde regra de acesso na query layer; Correção: extrair para policy object (Pundit, Action Policy) — separa "o que consultar" de "quem pode consultar".

### Passo 6: Critérios de decisão (tabela "se X então Y")

| Cenário | Escolha |
|---|---|
| Query usa associação no WHERE | `eager_load` (single JOIN) |
| Query carrega associação para uso em loop sem filtro | `preload` (separate query, evita JOIN cartesian) |
| Side effect cross-model no callback | Service object ou ActiveSupport::Notifications |
| Validar PII com UI feedback | Validation Rails + DB constraint |
| Subclasses com >80% campos comuns | STI (`type` column) |
| Subclasses com schemas divergentes | Tabelas separadas + module compartilhado |
| Read replica para query analítica | `connects_to` + `connected_to(role: :reading)` |

### Passo 7: Referências externas

- Skill: `/api-design` para princípios cross-stack de query optimization, N+1, pagination
- Skill: `/architecture` para SOLID em models (Single Responsibility — Active Record vs service objects)
- Skill: `/design-patterns` para callbacks como observer pattern + alternativas (events, services)
- Source canônica (audit trail RF14): paths absolutos listados em `sources:` no frontmatter

### Passo 8: Comando para invocar extrator (referência para /execute-plan)

`/execute-plan` spawna o subagente extrator com este prompt (anti-drift LITERAL — texto da compound lesson colado verbatim):

````
Você é um subagente extrator isolado, sem contexto prévio do projeto.
Sua tarefa: escrever o átomo `docs/knowledge/rails/atoms/active-record-fundamentals.md`
seguindo o template piloto (`docs/knowledge/rails/atoms/rails-conventions-and-magic.md`).

INPUT:
- Fontes canônicas (`sources:` decididos em Plano 01 fase-01):
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md  (ajustar para v2 se decisão foi v2)
  - claude-code/knowledge/Rails/rails-expert/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-code-review/PITFALLS.md  (ajustar para copy se decisão foi copy)
  - claude-code/knowledge/Rails/compass_artifact_wf-cb73df7d-c2b5-45b7-826c-358b9bafed4d_text_markdown.md
- Template piloto: docs/knowledge/rails/atoms/rails-conventions-and-magic.md (frontmatter + 5 seções)
- Cap: ≤ 200 linhas. Alvo: ~150.
- Frontmatter exato: ver fase-01-active-record-fundamentals.md Passo 2.
- Skeleton fixo: ver fase-01-active-record-fundamentals.md Passo 3.

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

Em paralelo: você tem liberdade explícita de NÃO cobrir tudo do template se source não fornece
material. Se source não documenta o overhead quantitativo de uma API, descreva a API qualitativamente
(como a fonte faz) — não estime números próprios.

OUTPUT: arquivo markdown completo gravado em `docs/knowledge/rails/atoms/active-record-fundamentals.md`.
````

---

## Gotchas

- **G1 do plano (cap 200 ln):** Active Record é o maior tópico Rails — fácil estourar. Estratégia: se Passo 4 entrega 7 patterns e cada um pesa ~25 ln, total 175 ln + cabeçalho = ~190. Margem apertada. Se exceder, cortar o último pattern (Multiple DBs — niche em apps pequenos) e mover para backlog v6.3.4+ como nota no `active-record-fundamentals` ou átomo dedicado futuro.
- **G2 do plano (anti-drift literal):** o texto da compound lesson `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` DEVE estar verbatim no prompt do extrator. Cole entre aspas, não parafraseie. Plano 04 do Node teve rework em `state-and-caching` e `code-smells-catalog` por não ter colado literal.
- **G6 do plano (fonte canônica):** Read STATE.md global ANTES de chamar extrator. Se `rails-stack-conventions v2` foi decidido como canônico, usar v2 em todos os paths (não a versão sem sufixo). Substituir literalmente no Passo 2 e Passo 8 antes de spawnar.
- **G8 do plano (paths absolutos):** `sources:` listam `claude-code/knowledge/Rails/{pasta-canônica}/{arquivo}.md` (do root do repo). Sem o caminho absoluto a partir do root, audit trail RF14 quebra.
- **Local — átomo flagged CA-08:** após verifier refined na fase-09, Luiz revisa pessoalmente. Notificar Luiz com link absoluto para o átomo + para os sources citados. Audit humano valida 3 claims aleatórias contra source — se Luiz reprovar, retrabalho desta fase + re-verifier.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro — sem ciclo RED→GREEN. Checklist de validação de conteúdo:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/active-record-fundamentals.md`
- [ ] Frontmatter contém **todos** os 8 campos base na ordem: `topic`, `stack`, `layer`, `sources`, `tier`, `triggers`, `related_skills`, `updated`
- [ ] Campo opcional `rails_versions: ['>=7.1']` presente
- [ ] `topic: active-record-fundamentals` (literal, kebab-case, igual ao filename sem `.md`)
- [ ] `stack: rails`
- [ ] `layer: backend`
- [ ] `tier: 1`
- [ ] `updated: 2026-05-18`
- [ ] Cada path em `sources:` aponta para arquivo que **existe** em `claude-code/knowledge/Rails/{pasta-canonica}/...`
- [ ] Corpo tem as 5 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] `wc -l docs/knowledge/rails/atoms/active-record-fundamentals.md` retorna entre 120 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/active-record-fundamentals.md` retorna 0
- [ ] Triggers contém pelo menos: `active record`, `querying`, `includes`, `N+1`, `callbacks`, `validations`, `associations`
- [ ] `bun run harness:validate` (ou `atoms-rf11-audit.test.ts` análogo) passa sobre o novo átomo
- [ ] Skeleton match — 5 seções (sem API-only mode neste átomo)

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/active-record-fundamentals.md` exit 0
- `wc -l docs/knowledge/rails/atoms/active-record-fundamentals.md` retorna número entre 120 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/active-record-fundamentals.md` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos base idêntica ao piloto
- `bun run harness:validate` passa

**Por humano (CA-08 obrigatório):**

- Subagente verifier refined (fase-09) reporta ≥80% das 5 claims auditadas das seções `Padrões sênior` + `Anti-padrões` + `Critérios de decisão` como rastreáveis para passagem específica das fontes em `sources:`.
- **Luiz** (audit humano flagged CA-08) lê o átomo + cross-check de 3 claims aleatórias contra paths citados em `sources:`. Assinatura em STATE.md global da feature: bloco `## Audit Humano CA-08 (Plano 02)` com linha `active-record-fundamentals | T1 | Aprovado por Luiz em YYYY-MM-DD | Notas: ...`.
- Leitor sênior em Rails reconhece os patterns como decisões de produção, não bullets genéricos de tutorial Rails Guides.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

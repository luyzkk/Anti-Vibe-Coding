<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only. Inclui seção API-only mode (D7).
-->

# Fase 04: Átomo `security-csrf-and-brakeman.md` (T1) — inclui seção API-only mode (D7)

**Plano:** 02 — Batch A T1 + Batch B parcial T2
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup), fase-02 (schema), fase-04 (piloto)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 1 `docs/knowledge/rails/atoms/security-csrf-and-brakeman.md` (~150 linhas), condensando strong parameters (mass-assignment), CSRF protection, SQL injection (parametrized queries), Brakeman scan no CI, Content Security Policy (CSP), encrypted credentials. **Inclui seção `## API-only mode` (D7)** com deltas para apps sem cookies (CSRF skip + Authorization header). Cobre o ângulo Rails-specific (rails 7+ CSP DSL, encrypted credentials, Brakeman) que `/security` cobre como princípio cross-stack OWASP.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/security-csrf-and-brakeman.md` | Create | Átomo completo (~150 linhas) com seção API-only mode |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar dedup para `rails-security-review` vs `v2` |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` STATE.md global. Confirmar decisão para `rails-security-review` vs `rails-security-review v2`. Sem decisão aprovada, **BLOQUEAR**.

### Passo 2: Frontmatter exato

```yaml
---
topic: security-csrf-and-brakeman
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-security-review/PATTERNS.md
  - claude-code/knowledge/Rails/rails-security-review/REVIEW_CHECKLIST.md
  - claude-code/knowledge/Rails/rails-security-review/PITFALLS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-fd78fcce-943b-47c2-94e8-32415141c3fe_text_markdown.md
tier: 1
triggers: [security, CSRF, strong params, mass-assignment, SQL injection, Brakeman, CSP, content security policy, encrypted credentials, parametrized query, OWASP]
related_skills: [/security, /api-design, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

Substituir `rails-security-review` por `v2` se decisão foi v2.

### Passo 3: Corpo seguindo skeleton fixo do piloto

**Seções (6 — inclui API-only mode):**

1. `# Security — CSRF and Brakeman` (título)
2. `## Quando consultar` — 3-5 bullets
3. `## Padrões sênior` — 5-7 patterns
4. `## Anti-padrões` — 3-5 armadilhas
5. `## Critérios de decisão` — tabela
6. `## API-only mode` — deltas (D7)
7. `## Referências externas`

### Passo 4: Patterns recomendados

Mínimo 5, máximo 7:

- **Pattern: Strong parameters como defesa contra mass-assignment** — Problema: `User.new(params[:user])` permite `admin: true` injetado; Padrão: `params.require(:user).permit(:name, :email)` whitelist explícita; Quando NÃO usar: nunca dispense — primeira linha de defesa.
- **Pattern: CSRF token via `protect_from_forgery` (default Rails)** — Problema: cross-site request forgery em forms autenticados; Padrão: `protect_from_forgery with: :exception` no `ApplicationController`; Quando NÃO usar: API-only mode (sem cookie auth) — usar token auth via header.
- **Pattern: SQL injection — parametrização** — Problema: `User.where("name = '#{params[:q]}'")` permite injection; Padrão: `User.where(name: params[:q])` ou `User.where("name = ?", params[:q])`; Quando NÃO usar parametrização: jamais — sempre parametrizar input externo.
- **Pattern: Brakeman scan no CI** — Problema: dev sr esquece pattern em PR (mass-assignment, raw SQL, command injection); Padrão: `bundle exec brakeman --no-pager` como step obrigatório no CI; falha de severity ≥ medium bloqueia merge; Quando NÃO usar: app prototype < 1 semana de vida.
- **Pattern: Content Security Policy (CSP) — Rails 7+ DSL** — Problema: XSS via inline script ou third-party CDN comprometido; Padrão: `config.content_security_policy do |p|; p.default_src :self; p.script_src :self, '...'; end`; Quando NÃO usar: app exclusivamente API JSON — CSP é para apps que servem HTML.
- **Pattern: Encrypted credentials (`rails credentials:edit`)** — Problema: secrets em `.env` ou repo; Padrão: `config/credentials.yml.enc` + `config/master.key` (gitignored ou via `RAILS_MASTER_KEY` env); Quando NÃO usar: secrets de runtime que variam por instância (use env diretamente — DB URL, REDIS_URL).
- **Pattern: Active Record Encryption para PII (Rails 7+)** — Problema: leak de DB expõe CPF/email; Padrão: `encrypts :document, deterministic: true` (apenas se precisar query); Quando NÃO usar: dados não-sensíveis — overhead de criptografia desnecessário.

### Passo 5: Anti-padrões (3-5 armadilhas)

- **Anti-pattern: Raw SQL com interpolação string** — Sintoma: `Article.where("title = '#{params[:q]}'")` permite SQL injection; Correção: `Article.where(title: params[:q])` ou `Article.where("title = ?", params[:q])`.
- **Anti-pattern: `params.permit!` (permite tudo)** — Sintoma: mass-assignment; Correção: whitelist explícita.
- **Anti-pattern: `skip_before_action :verify_authenticity_token` em controller que aceita HTML** — Sintoma: CSRF wide open; Correção: deixar default; apenas skip em controller dedicado a webhooks externos com auth alternativa (signature HMAC).
- **Anti-pattern: `eval`/`send` com input do usuário** — Sintoma: code injection; Correção: case + lista branca explícita (`%w[admin user moderator].include?(params[:role])`).
- **Anti-pattern: Secrets commitados em `config/secrets.yml` (legacy)** — Sintoma: chaves vazadas em repo público; Correção: migrar para `credentials.yml.enc` + `RAILS_MASTER_KEY` no env de produção.

### Passo 6: Critérios de decisão (tabela)

| Cenário | Escolha |
|---|---|
| Permitir params em controller | Strong params `permit(:campo)` |
| Form HTML com autenticação | `protect_from_forgery with: :exception` |
| Query com input externo | `where(col: val)` ou `where("col = ?", val)` |
| CI security gate | Brakeman + falha em severity ≥ medium |
| App HTML público | CSP via `config.content_security_policy` |
| Secret de aplicação | `credentials.yml.enc` + `RAILS_MASTER_KEY` |
| PII queryable por igualdade | `encrypts :col, deterministic: true` |

### Passo 7: API-only mode (D7 — seção embutida)

```markdown
## API-only mode

Para apps Rails API-only (`rails new --api`):

- **CSRF:** desabilitado por padrão em `ActionController::API`. NÃO chame `protect_from_forgery`.
- **Auth:** token via `Authorization: Bearer ...` header (Devise + JWT, `doorkeeper`, ou `authenticate_with_http_token`)
- **CSP:** não aplicável (sem HTML servido); pular configuração
- **Strong params:** mantém — primeira linha contra mass-assignment continua válida
- **Brakeman:** mantém no CI — cobre SQL injection, command injection, mass-assignment regardless of mode
- **Encrypted credentials:** mantém — secrets sempre via `credentials.yml.enc`
- **Pular se:** app monolítico full-stack com cookies + forms HTML
```

Esta seção é **scaffolding editorial** (D7 + G7). Verifier refined NÃO audita.

### Passo 8: Referências externas

- Skill: `/security` para OWASP Top 10 + princípios cross-stack
- Skill: `/api-design` cross-link com `action-controller-and-routing` para API auth
- Skill: `/infrastructure` para gestão de `RAILS_MASTER_KEY` em deploy
- Source: paths absolutos em `sources:`

### Passo 9: Comando para invocar extrator (anti-drift literal)

````
Você é um subagente extrator isolado.
Tarefa: escrever `docs/knowledge/rails/atoms/security-csrf-and-brakeman.md` seguindo o template
piloto + Passo 2 da fase-04. Incluir seção `## API-only mode` (D7).

REGRA DE FIDELIDADE (anti-drift — copy verbatim da compound lesson
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`):

> "REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente
> na fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
> gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará tempo
> no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou re-leia
> o source para confirmar."

OUTPUT: arquivo gravado em `docs/knowledge/rails/atoms/security-csrf-and-brakeman.md`. Cap ≤ 200 ln; alvo ~150.
````

---

## Gotchas

- **G1 (cap 200):** seção API-only ~12 ln + 6 patterns + 4 anti-padrões = ~145 ln. Margem ok.
- **G2 (anti-drift):** versões específicas (Rails 7+ CSP DSL) DEVEM estar na fonte. Se source não cita versão, descrever qualitativamente.
- **G6 (fonte canônica):** `rails-security-review` vs `v2`. Confirme.
- **G7 (API-only scaffolding):** verifier NÃO audita seção API-only. Não esconder claim técnica importante nela.
- **G8 (paths absolutos):** sources a partir de `claude-code/knowledge/Rails/`.
- **Local — Brakeman version:** se fonte cita versão específica do Brakeman, refletir no pattern; senão descrever a gem qualitativamente.

---

## Verificacao

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/security-csrf-and-brakeman.md`
- [ ] Frontmatter 8 campos + `rails_versions: ['>=7.1']`
- [ ] `topic: security-csrf-and-brakeman`, `stack: rails`, `layer: backend`, `tier: 1`
- [ ] `sources:` apontam para arquivos existentes
- [ ] 6 seções na ordem: Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / **API-only mode** / Referências externas
- [ ] ≥5 patterns em "Padrões sênior"
- [ ] ≥3 anti-padrões
- [ ] Seção API-only com 5-6 bullets (≤15 ln)
- [ ] Triggers contém: `security`, `CSRF`, `strong params`, `Brakeman`, `CSP`, `SQL injection`
- [ ] `wc -l` entre 130 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]'` retorna 0
- [ ] `bun run harness:validate` passa

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/security-csrf-and-brakeman.md` exit 0
- `wc -l` retorna entre 130 e 200
- `grep '## API-only mode'` retorna 1 match
- `grep -c '\[A DEFINIR\]'` retorna 0
- `bun run harness:validate` passa

**Por humano:**

- Não flagged CA-08 humano. Verifier refined da fase-09 valida — audita só seções técnicas; API-only é scaffolding.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

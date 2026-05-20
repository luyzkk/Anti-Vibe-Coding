---
topic: security-csrf-and-brakeman
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-security-review/SKILL.md
  - claude-code/knowledge/Rails/rails-security-review/PITFALLS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-8afc0f40-76b2-414c-bc2c-d344997397e4_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md
tier: 1
triggers: [security, CSRF, strong params, mass-assignment, SQL injection, Brakeman, CSP, content security policy, encrypted credentials, parametrized query, OWASP, permit!, protect_from_forgery]
related_skills: [/security, /api-design, /infrastructure]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Security — CSRF and Brakeman

## Quando consultar

- Ao escrever ou revisar parameter handling em controllers (`permit`, `permit!`, `to_unsafe_h`)
- Ao configurar ou desativar `protect_from_forgery` em qualquer controller
- Ao escrever queries com input externo — risco de SQL injection
- Ao definir secrets, credentials ou variáveis sensíveis no projeto
- Ao configurar CI sem gate de segurança estático

## Padrões sênior

### Pattern: Strong params com whitelist explícita — defesa contra mass-assignment

- **Problema:** `params.permit!` ou `Model.new(params[:user])` permite `admin: true`, `role: :superuser` injetado via form; caso Egor Homakov/GitHub 2012 — Tom Preston-Werner: "The root cause of the vulnerability was a failure to properly check incoming form parameters, a problem known as the mass-assignment vulnerability."
- **Padrão:** `params.require(:user).permit(:name, :email)` — whitelist explícita; Rails 8 alternativa: `params.expect(user: [:name, :email])`
- **Quando NAO usar:** nunca dispense — `permit!` é red flag crítico; atributos sensíveis (`role`, `admin`, `tenant_id`, `balance`) devem ser controlados server-side
- **Fonte:** wf-8afc0f40 RAILS-SEC-060, RAILS-SEC-061; SKILL.md Quick Reference

### Pattern: CSRF via `protect_from_forgery` (default Rails)

- **Problema:** forms cross-site fazem ações autenticadas em nome do usuário com cookie de sessão válido; `skip_before_action :verify_authenticity_token` global abre o vetor
- **Padrão:** `protect_from_forgery with: :exception` no `ApplicationController` (default Rails 5.2+); para webhooks externos, controller dedicado com HMAC do header validado por `ActiveSupport::SecurityUtils.secure_compare`
- **Quando NAO usar `protect_from_forgery`:** API-only com Bearer token (sem cookie session) — ver seção API-only mode
- **Fonte:** wf-8afc0f40 RAILS-SEC-040; PITFALLS.md "Rails handles CSRF automatically"

### Pattern: SQL injection — sempre parametrizar input externo

- **Problema:** `User.where("email = '#{params[:email]}'")` permite dump de tabelas, bypass de autenticação
- **Padrão:** forma de hash `where(email: params[:email])` ou placeholders posicionais `where("email = ?", params[:email])`; nunca interpolação de string em `where`, `order`, `group`, `select`, `find_by_sql`
- **Quando NAO usar interpolação:** jamais com input externo; constantes do próprio app são seguras
- **Fonte:** wf-8afc0f40 RAILS-SEC-001; SKILL.md Quick Reference "Queries — Parameterized"

### Pattern: Brakeman no CI como gate obrigatório

- **Problema:** dev esquece pattern em PR — mass-assignment, raw SQL, command injection; ausência de Brakeman/bundler-audit no CI é sinal de dívida técnica de risco
- **Padrão:** `bundle exec brakeman -q --no-summary --confidence-level=2`; baseline em `config/brakeman.ignore` com nota justificando cada fingerprint ignorado; bloquear merge em qualquer warning não-ignorado
- **Quando NAO usar:** sem exceção — Brakeman é essencial em todo app Rails (útil até em API-only)
- **Fonte:** wf-8afc0f40 RAILS-SEC-141; wf-a0aa55c4 RAILS-SEC-001, sec.1 "Brakeman (versão estável 8.0.x)"

### Pattern: Content Security Policy (CSP) via DSL Rails 5.2+

- **Problema:** XSS via inline script ou CDN comprometido; CSP ausente ou `unsafe-inline`/`unsafe-eval` é severity Alta (RAILS-SEC-080)
- **Padrão:** `Rails.application.config.content_security_policy do |p|; p.default_src :self, :https; p.script_src :self, :https; p.object_src :none; end`; nonce generator para scripts dinâmicos
- **Quando NAO usar:** app exclusivamente API-only sem HTML servido — pular configuração CSP
- **Fonte:** wf-8afc0f40 RAILS-SEC-080; tabela sec.3 "CSP — DSL nativo (5.2+)"

### Pattern: Encrypted credentials para secrets de aplicação

- **Problema:** `config/master.key` comitado no Git expõe todas as credenciais; secrets em `.env` commitado ou hardcoded em código
- **Padrão:** `config/credentials.yml.enc` + `config/master.key` (gitignored); `RAILS_MASTER_KEY` como env var em produção; se vazado: `bin/rails credentials:edit --force` + rotação imediata
- **Quando usar env direto:** secrets de runtime que variam por instância (DATABASE_URL, REDIS_URL) ficam em env; credentials para API keys, `secret_key_base`, tokens fixos
- **Fonte:** wf-8afc0f40 RAILS-SEC-070, RAILS-SEC-071; PITFALLS.md "Secrets in committed files"

## Anti-padrões

### Anti-pattern: Raw SQL com interpolação de string

- **Sintoma:** `Article.where("title = '#{params[:q]}'")` — SQL injection crítico
- **Correção:** `Article.where(title: params[:q])` ou `Article.where("title = ?", params[:q])`
- **Fonte:** SKILL.md Quick Reference; PITFALLS.md "String interpolation in SQL"

### Anti-pattern: `params.permit!` — permite tudo

- **Sintoma:** mass-assignment de campos sensíveis (`role`, `admin`, `balance`)
- **Correção:** whitelist explícita `params.require(:user).permit(:campo1, :campo2)`; nunca em código de produção
- **Fonte:** PITFALLS.md "`permit!` just for now"; wf-8afc0f40 RAILS-SEC-060

### Anti-pattern: `skip_before_action :verify_authenticity_token` em controller com cookie session

- **Sintoma:** CSRF wide open; apps híbridas com cookie session precisam de CSRF mesmo com JSON
- **Correção:** manter default; `skip` somente em controller dedicado a webhooks externos com autenticação HMAC alternativa
- **Fonte:** wf-8afc0f40 RAILS-SEC-040; PITFALLS.md "Rails handles CSRF automatically"

### Anti-pattern: Brakeman ausente do CI

- **Sintoma:** PRs com SQL injection, mass-assignment ou command injection passam sem alerta
- **Correção:** adicionar step `brakeman -q --no-summary --confidence-level=2`; fingerprints ignorados exigem `note` justificativa
- **Fonte:** wf-8afc0f40 RAILS-SEC-141; wf-a0aa55c4 RAILS-SEC-005

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Whitelist de params em controller | `params.require(:recurso).permit(:campo1, :campo2)` |
| Form HTML com cookie session | `protect_from_forgery with: :exception` (default) |
| Webhook externo sem cookie | Controller dedicado com HMAC + `secure_compare`; skip CSRF |
| Query com input externo | `where(col: val)` ou `where("col = ?", val)` |
| Gate de segurança em CI | `brakeman -q --no-summary --confidence-level=2` |
| App HTML com JavaScript | CSP via `config.content_security_policy` + nonce |
| Secret de aplicação fixo | `credentials.yml.enc` + `RAILS_MASTER_KEY` no deploy |

## API-only mode

Para apps Rails API-only (`rails new --api`):

- **CSRF:** desabilitado por padrão em `ActionController::API`; NÃO chamar `protect_from_forgery`
- **Auth:** token via `Authorization: Bearer ...` header; ausência de cookie session torna CSRF irrelevante
- **CSP:** não aplicável — sem HTML servido; pular configuração
- **Strong params:** mantém — primeira linha contra mass-assignment continua válida
- **Brakeman:** mantém no CI — cobre SQL injection, command injection, mass-assignment independente do modo
- **Encrypted credentials:** mantém — secrets sempre via `credentials.yml.enc`

## Referências externas

- Skill: `/security` para OWASP Top 10 e princípios cross-stack
- Skill: `/api-design` para auth via Bearer token em APIs
- Skill: `/infrastructure` para gestão de `RAILS_MASTER_KEY` em deploy
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-security-review/SKILL.md
  - claude-code/knowledge/Rails/rails-security-review/PITFALLS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-8afc0f40-76b2-414c-bc2c-d344997397e4_text_markdown.md
  - claude-code/knowledge/Rails/compass_artifact_wf-a0aa55c4-3acc-47fc-9d85-f573bafc27b0_text_markdown.md

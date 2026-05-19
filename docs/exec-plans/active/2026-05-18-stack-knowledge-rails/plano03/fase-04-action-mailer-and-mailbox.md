<!--
Princípio universal #5 — Comment Provenance.
Esta fase é content-only (markdown). Sem código TS, sem comentário inline em runtime.
O prompt do extrator vive nesta fase como spec, não como código de execução.
-->

# Fase 04: Átomo `action-mailer-and-mailbox.md` (T3) — absorve ActionText (D16)

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-01 (dedup decidida), fase-02 (schema `rails_versions`), fase-04 (piloto como template); Plano 02 fase-09 (verifier refined + audit humano aprovados)
**Visual:** false

---

## O que esta fase entrega

Átomo Tier 3 `docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` (~150 linhas), condensando ActionMailer outbound (templates, multipart, `deliver_later`, layouts/previews) + ActionMailbox inbound (routing via `application_mailbox.rb`, ingress de Postmark/SendGrid/Mailgun) + **absorve ActionText** (D16) com sub-seção curta sobre `has_rich_text` e Trix editor para rich content em forms. T3 = niche/opcional — apps Rails sem feature de email/inbound não consultam. Cap apertado dado que o átomo cobre 3 sub-frameworks correlatos.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` | Create | Átomo completo (frontmatter + 5 seções de corpo, ~150 linhas) |
| `docs/exec-plans/active/2026-05-18-stack-knowledge-rails/STATE.md` | Read | Confirmar decisão de dedup aprovada para `rails-stack-conventions`, `rails-expert` (fontes do átomo) |

---

## Implementacao

### Passo 1: Validação de fonte canônica (BLOQUEADOR)

`Read` o STATE.md global da feature e extrair a decisão aprovada para os pares duplicados. Para este átomo, importam:

- `rails-stack-conventions` vs `rails-stack-conventions v2` (mailer patterns, layout conventions)
- `rails-expert` (sem duplicata — patterns sêniores para inbound routing)
- compass artifact sobre ActionText (D16 — ActionText absorvido sem fonte dedicada; pegar seção rich content de stack-conventions)

Se STATE.md NÃO tem bloco `## Dedup decisions (Plano 01 fase-01)` aprovado, **BLOQUEAR a fase** e escalar.

### Passo 2: Frontmatter exato (8 campos base + `rails_versions`, verbatim com piloto)

```yaml
---
topic: action-mailer-and-mailbox
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-stack-conventions/PATTERNS.md
  - claude-code/knowledge/Rails/rails-expert/BACKENDS.md
  - claude-code/knowledge/Rails/compass_artifact_wf-rails-mailer-mailbox_text_markdown.md
tier: 3
triggers: [action mailer, action mailbox, deliver_later, mailer templates, action text, has_rich_text, trix editor, inbound email, postmark, sendgrid, mailgun]
related_skills: [/api-design, /system-design, /architecture]
updated: 2026-05-18
rails_versions: ['>=7.1']
---
```

**Notas sobre o frontmatter:**

- `rails_versions: ['>=7.1']` — ActionMailer existe desde 1.0, ActionMailbox e ActionText desde Rails 6.0. Cobertura 7.1+ alinha com escopo da feature (PRD D1).
- `triggers` inclui `action text`, `has_rich_text`, `trix editor` para que devs procurando rich content cheguem ao átomo (D16 — ActionText absorvido).
- Compass artifact UUID acima é placeholder — extrator confirma via `ls claude-code/knowledge/Rails/compass_artifact_*`.
- `related_skills:` lista 3 skills cross-stack. `/architecture` por causa de boundaries (mailbox routing vs domain logic).

### Passo 3: Corpo seguindo skeleton fixo do piloto

Seções obrigatórias na ordem:

1. `# ActionMailer & ActionMailbox` (título H1)
2. `## Quando consultar` — 3-5 bullets de cenário
3. `## Padrões sênior` — 5-6 patterns + 1 sub-seção curta sobre ActionText (4-5 linhas)
4. `## Anti-padrões` — 3-4 armadilhas com correção
5. `## Critérios de decisão` — tabela "se X, então Y"
6. `## Referências externas` — skills relacionadas + paths das fontes (audit trail RF14)

**NÃO incluir** seção API-only mode.

### Passo 4: Patterns recomendados (guia editorial)

Mínimo 5, máximo 6 — extrair do source canônico. Lista Rails-native:

- **Pattern: `deliver_later` como default** — Problema: `deliver_now` bloqueia o request enquanto SMTP envia; Padrão: 100% das mailers chamam `deliver_later` em controllers/services — job (Solid Queue/Sidekiq) faz o trabalho assíncrono; retries automáticos via job retry; Quando usar: produção sempre; Quando NÃO usar: scripts manuais, rake tasks one-off — `deliver_now` permitido com observação inline (`# 2026-XX-XX: deliver_now ok porque é script offline`).
- **Pattern: Mailer layouts e templates duplos (HTML + text)** — Problema: clientes de email variam (Outlook quebra CSS moderno, mobile prefere text fallback); Padrão: cada mailer tem `app/views/{mailer_name}/{action_name}.html.erb` + `.text.erb`; layout em `app/views/layouts/mailer.html.erb` + `mailer.text.erb`; preview em `test/mailers/previews/` para checagem visual local; Quando usar: todos os mailers de produção; Quando NÃO usar: mailer puramente transacional com texto simples — só `.text.erb` resolve.
- **Pattern: ActionMailbox routing centralizado** — Problema: ingress de emails inbound (suporte, comandos via email) precisa rotear para handlers; Padrão: `app/mailboxes/application_mailbox.rb` define `routing /support@/i => :support`, `routing :all => :inbox`; ingress (Postmark/SendGrid/Mailgun) configurado em `config/environments/production.rb` (`config.action_mailbox.ingress = :postmark`); validate webhook signature obrigatório; Quando usar: features inbound (helpdesk, comandos por email); Quando NÃO usar: apps sem necessidade inbound — não habilitar acessório.
- **Pattern: Idempotência em mailers transacionais** — Problema: retry de job dispara email duplicado; Padrão: registrar `email_id` (UUID gerado no service antes do `deliver_later`) em tabela `delivered_emails` com unique constraint; mailer pula envio se `email_id` já existe; Quando usar: emails críticos (pagamento, reset de senha); Quando NÃO usar: emails transacionais leves (newsletter, notificações batch) — duplicata aceitável.
- **Pattern: Preview em desenvolvimento + testes com `ActionMailer::TestHelper`** — Problema: testar mailers exige envio real ou inspeção manual; Padrão: previews em `test/mailers/previews/welcome_mailer_preview.rb` permitem ver em `/rails/mailers` no browser; testes com `assert_emails 1 do ... end` e inspect `ActionMailer::Base.deliveries.last`; Quando usar: todo mailer novo; Quando NÃO usar: nunca — sem preview/test, drift de template silencioso.
- **Pattern: ActionText com `has_rich_text` (sub-seção curta, D16)** — Problema: forms precisam de WYSIWYG sem dependência externa; Padrão: model `has_rich_text :body`; form usa `<%= form.rich_text_area :body %>` (renderiza Trix editor); attachments via ActiveStorage; Quando usar: forms admin/CMS-like com conteúdo formatado; Quando NÃO usar: textos simples (Markdown render basta) ou conteúdo gerado por IA (parse próprio).

Extrator escolhe 5 desses 6.

### Passo 5: Anti-padrões (3-4 armadilhas com correção)

- **Anti-pattern: `deliver_now` no controller** — Sintoma: request fica lento sob carga, P99 de 200ms vai para 2s; Correção: trocar por `deliver_later` (ActiveJob async); job fica responsável pelo retry e visibilidade.
- **Anti-pattern: webhook de ingress sem validação de signature** — Sintoma: spoofing — qualquer um pode injetar email no inbox; Correção: configurar password/signing key em `config/environments/production.rb` (`config.action_mailbox.ingress_password = ENV['...']`) e validar via header HMAC.
- **Anti-pattern: template HTML sem fallback `.text.erb`** — Sintoma: clientes em modo "text only" recebem email vazio ou raw HTML; Correção: sempre escrever ambos os templates; mailer auto-multipart quando ambos existem.
- **Anti-pattern: `Mailer.notify(user).deliver_later` em loop sobre milhares** — Sintoma: gera 10k jobs em segundos, fila satura; Correção: batch via `Mailer.notify(user)` enfileirado em chunks ou usar mailer com bulk recipient (`bcc:` ou single email com CC controlado).

### Passo 6: Critérios de decisão (tabela "se X então Y")

| Cenário | Escolha |
|---|---|
| Email transacional em controller/service | `deliver_later` (sempre) |
| Email em rake/script offline | `deliver_now` permitido com comentário inline |
| Template para clientes mistos (Outlook + mobile) | HTML + text duplo |
| Reset de senha, recibo de pagamento | Mailer + idempotência via `email_id` |
| Inbound de suporte | ActionMailbox routing por regex + ingress assinado |
| Form com WYSIWYG | ActionText `has_rich_text` + Trix |
| Texto simples gerado por IA | Render direto (não ActionText) |
| Mailer batch >100 destinatários | Chunk em lotes + job por chunk |

### Passo 7: Referências externas

- Skill: `/api-design` para webhook design (ingress validation, idempotency keys)
- Skill: `/system-design` para queueing async, retry semantics, fan-out
- Skill: `/architecture` para mailbox routing como boundary externa (DDD anti-corruption layer)
- Nota sobre absorção (D16): ActionText absorvido neste átomo com sub-seção curta de 4-5 linhas. ActionMailbox absorvido no mesmo átomo. Sem átomos dedicados em v6.3.3 — backlog v6.3.4+ se demanda surgir.
- Source canônica (audit trail RF14): paths absolutos listados em `sources:` no frontmatter

### Passo 8: Comando para invocar extrator (referência para /execute-plan)

`/execute-plan` spawna o subagente extrator com prompt incluindo anti-drift LITERAL. ActionText absorvido sem fonte dedicada — extrator deve EXPLICITAMENTE puxar passagem de rich content de `rails-stack-conventions` (não inventar do conhecimento prévio). Substituir nomes de pasta canônica pelos decididos no STATE.md. Output: arquivo markdown completo em `docs/knowledge/rails/atoms/action-mailer-and-mailbox.md`.

---

## Gotchas

- **G1 do plano (cap 200 ln):** átomo cobre 3 sub-frameworks (Mailer + Mailbox + Text). Alvo 140-160. ActionText fica em sub-seção curta (4-5 linhas) — qualquer expansão estoura cap. Se mailer + mailbox sozinhos passarem 150, cortar o pattern de preview/test (último — é "qualidade", core fica).
- **G2 do plano (anti-drift literal):** prompt do extrator inclui texto da compound lesson verbatim. ActionText absorvido sem fonte dedicada é zona de risco — extrator pode "completar" com conhecimento prévio. Se source de stack-conventions não cobre Trix, omitir Trix do átomo (anti-drift > completude).
- **G4 do plano (`rails_versions`):** `['>=7.1']` — ActionText/Mailbox existem desde 6.0, mas cobertura alinhada com escopo 7.1+ da feature.
- **G10 do plano (fonte canônica via STATE.md):** Read STATE.md ANTES de chamar extrator.

---

## Verificacao

### Conteúdo (content-only, sem TDD code)

Esta fase é markdown puro. Checklist de validação:

### Checklist

- [ ] Arquivo existe em `docs/knowledge/rails/atoms/action-mailer-and-mailbox.md`
- [ ] Frontmatter contém todos os 8 campos base na ordem correta
- [ ] Campo opcional `rails_versions: ['>=7.1']` presente
- [ ] `topic: action-mailer-and-mailbox` (literal, kebab-case)
- [ ] `stack: rails`, `layer: backend`, `tier: 3`, `updated: 2026-05-18`
- [ ] Cada path em `sources:` aponta para arquivo existente em `claude-code/knowledge/Rails/{pasta-canonica}/...`
- [ ] Corpo tem as 5 seções na ordem correta
- [ ] Pelo menos 5 patterns em "Padrões sênior" com sub-seções Problema/Padrão/Quando usar/Quando NÃO usar
- [ ] Sub-seção sobre ActionText (`has_rich_text`, Trix) presente em "Padrões sênior" — 4-5 linhas (D16)
- [ ] Pelo menos 3 anti-padrões com correção
- [ ] `wc -l docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` retorna entre 130 e 200 (alvo ~150)
- [ ] `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` retorna 0
- [ ] Triggers contém pelo menos: `action mailer`, `action mailbox`, `deliver_later`, `action text`, `has_rich_text`
- [ ] `bun run harness:validate` passa sobre o novo átomo

---

## Criterio de Aceite

**Por maquina:**

- `test -f docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` exit 0
- `wc -l docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` retorna número entre 130 e 200
- `grep -c '\[A DEFINIR\]' docs/knowledge/rails/atoms/action-mailer-and-mailbox.md` retorna 0
- Frontmatter parseável como YAML; ordem dos 8 campos base idêntica ao piloto
- `bun run harness:validate` passa

**Por humano:**

- Subagente verifier refined (fase-07) reporta ≥80% das 5 claims auditadas das seções técnicas como rastreáveis.
- Leitor sênior Rails reconhece os patterns como decisões de produção (deliver_later default, ingress signature, idempotência por email_id), não bullets de tutorial.
- ActionText absorvido em sub-seção curta — não infla átomo, não compete com átomos dedicados (D16).

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->

---
topic: action-mailer-and-mailbox
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-guides/references/action_mailer_basics.md
  - claude-code/knowledge/Rails/rails-guides/references/action_mailbox_basics.md
  - claude-code/knowledge/Rails/rails-guides/references/action_text_overview.md
  - claude-code/knowledge/Rails/rails-expert/SKILL.md
tier: 3
triggers: [action mailer, action mailbox, deliver_later, mailer templates, action text, has_rich_text, trix editor, inbound email, postmark, sendgrid, mailgun, multipart email, mailer layout, mailer preview, ingress password]
related_skills: [/api-design, /system-design, /architecture]
updated: 2026-05-19
rails_versions: ['>=7.1']
---

# ActionMailer & ActionMailbox

## Quando consultar

- Ao adicionar envio de email transacional (confirmação, reset de senha, notificações) a controllers ou service objects
- Ao configurar templates multipart (HTML + text) ou layouts de mailer reutilizáveis
- Ao implementar recebimento de email inbound (helpdesk, comandos por email) com ActionMailbox
- Ao integrar ingress de provedor externo (Postmark, SendGrid, Mailgun) com autenticação segura
- Ao adicionar campo WYSIWYG a um form Rails com ActionText e Trix

## Padrões sênior

### Pattern: `deliver_later` como default em controllers e services

- **Problema:** chamar `deliver_now` no controller bloqueia a request enquanto o envio SMTP ocorre; a action não continua até o email ser entregue
- **Padrão:** usar `deliver_later` — o Rails enfileira um `ActionMailer::MailDeliveryJob` via Active Job; a action continua imediatamente; retries automáticos via job retry. O guia descreve: "We use `deliver_later` to enqueue the email to be sent later. This way, the controller action will continue without waiting for the email sending code to run."
  ```ruby
  UserMailer.with(user: @user).welcome_email.deliver_later
  ```
- **Quando usar:** produção — qualquer email disparado de um request HTTP
- **Quando NÃO usar:** scripts offline, rake tasks one-off — `deliver_now` é permitido fora do request cycle (guia demonstra `deliver_now` em `SendWeeklySummary#run`)

### Pattern: Templates duplos HTML + text com multipart automático

- **Problema:** clientes de email variam; sem fallback text, clientes em modo "text only" recebem conteúdo ilegível
- **Padrão:** criar `welcome_email.html.erb` e `welcome_email.text.erb` em `app/views/user_mailer/`; "when you call the `mail` method, Action Mailer will detect the two templates (text and HTML) and automatically generate a `multipart/alternative` email"; "Sending both formats is considered best practice because, in case of HTML rendering issues, the text version can serve as a reliable fallback"
- **Layout:** `app/views/layouts/mailer.html.erb` + `mailer.text.erb`; `ApplicationMailer` declara `layout "mailer"` e todas as subclasses herdam
- **Quando usar:** todos os mailers de produção
- **Quando NÃO usar:** email puramente textual simples — só `.text.erb` resolve

### Pattern: Mailer previews em desenvolvimento

- **Problema:** testar templates sem envio real exige inspeção manual ou setup de sandbox
- **Padrão:** criar `UserMailerPreview` em `test/mailers/previews/user_mailer_preview.rb`; preview disponível em `/rails/mailers/user_mailer/welcome_email`; a lista de previews fica em `/rails/mailers`; "if you change something in the mailer view [...], the preview will automatically be updated"
  ```ruby
  class UserMailerPreview < ActionMailer::Preview
    def welcome_email
      UserMailer.with(user: User.first).welcome_email
    end
  end
  ```
- **Quando usar:** todo mailer novo — drift de template sem preview é silencioso
- **Quando NÃO usar:** nunca omitir em produção-bound mailers

### Pattern: ActionMailbox routing centralizado em `application_mailbox.rb`

- **Problema:** emails inbound (suporte, comandos) chegam sem dispatcher; cada mailbox teria que verificar a origem manualmente
- **Padrão:** rotas definidas com regex em `app/mailboxes/application_mailbox.rb`; "routes are added to the `application_mailbox.rb` file using regular expressions"; ingress declarado em `config/environments/production.rb`
  ```ruby
  class ApplicationMailbox < ActionMailbox::Base
    routing(/^save@/i     => :forwards)
    routing(/@replies\./i => :replies)
  end
  ```
  ```ruby
  # config/environments/production.rb
  config.action_mailbox.ingress = :postmark  # ou :sendgrid, :mailgun, :relay
  ```
- **Quando usar:** features inbound (helpdesk, comandos por email, encaminhamento automático)
- **Quando NÃO usar:** apps sem necessidade inbound — não instalar ActionMailbox desnecessariamente

### Pattern: Credenciais de ingress via `credentials:edit` (não variável de ambiente hardcoded)

- **Problema:** senha de webhook exposta em código ou em variável de ambiente sem auditoria
- **Padrão:** usar `bin/rails credentials:edit` para adicionar a password sob `action_mailbox.ingress_password`; "Action Mailbox will automatically find it"; alternativa: `RAILS_INBOUND_EMAIL_PASSWORD` env var; para Mailgun: `action_mailbox.mailgun_signing_key`; para Mandrill: `action_mailbox.mandrill_api_key`
  ```yaml
  action_mailbox:
    ingress_password: ...
    mailgun_signing_key: ...
  ```
- **Quando usar:** qualquer ingress em produção — obrigatório para autenticar requisições do provider
- **Quando NÃO usar:** desenvolvimento local com conductor (`/rails/conductor/action_mailbox/inbound_emails`) — sem ingress password necessária

### ActionText — `has_rich_text` e Trix (D16)

- **Problema:** forms precisam de editor WYSIWYG sem dependência externa
- **Padrão:** `has_rich_text :content` no model; form usa `form.rich_textarea :content` (renderiza Trix); content stored na tabela `action_text_rich_texts` via associação polimórfica; N+1 evitado com `Article.all.with_rich_text_content`
- **Quando usar:** forms admin/CMS com conteúdo formatado; conteúdo gerado pelo usuário
- **Quando NÃO usar:** textos simples ou conteúdo gerado programaticamente — `has_rich_text` não adiciona coluna na tabela do model, mas cria join; overhead desnecessário para plain text

## Anti-padrões

### Anti-pattern: `deliver_now` em controller action

- **Sintoma:** request lento sob carga; envio SMTP bloqueia a response
- **Por que é ruim:** rails-expert documenta "Offload slow operations to Sidekiq — never run them synchronously in a request cycle"; `deliver_now` viola esse princípio em qualquer envio via SMTP externo
- **Correção:** substituir por `deliver_later` — Active Job assume o envio assíncrono com retry automático

### Anti-pattern: Ingress sem credenciais configuradas

- **Sintoma:** qualquer POST para `/rails/action_mailbox/postmark/inbound_emails` é aceito sem autenticação
- **Por que é ruim:** sem `ingress_password` nas credentials, endpoint fica aberto; a guia especifica que cada provider exige credenciais configuradas para que Action Mailbox autentique as requests
- **Correção:** adicionar password via `bin/rails credentials:edit` sob `action_mailbox.ingress_password` (ou a chave específica do provider)

### Anti-pattern: Template HTML sem `.text.erb`

- **Sintoma:** clientes em modo "text only" recebem email vazio ou com HTML bruto
- **Por que é ruim:** o guia afirma que enviar ambos os formatos "is considered best practice because, in case of HTML rendering issues, the text version can serve as a reliable fallback"
- **Correção:** criar sempre o par `action_name.html.erb` + `action_name.text.erb`; Action Mailer gera multipart automaticamente quando os dois templates existem

### Anti-pattern: `with_rich_text_content` omitido em listagens

- **Sintoma:** N+1 query ao renderizar lista de records com `has_rich_text`
- **Por que é ruim:** cada record dispara query separada para `action_text_rich_texts`
- **Correção:** usar `Article.all.with_rich_text_content` para preload sem attachments, ou `with_rich_text_content_and_embeds` quando attachments precisam ser renderizados

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Email em controller/service (produção) | `deliver_later` (sempre) |
| Email em rake task ou script offline | `deliver_now` permitido |
| Templates para clientes mistos | HTML + text duplo (multipart automático) |
| Checagem visual de template sem envio real | Preview em `test/mailers/previews/` |
| Receber email inbound de provider externo | ActionMailbox + routing regex + ingress credencial |
| Ingress de Postmark/SendGrid/Mailgun | `config.action_mailbox.ingress = :postmark/:sendgrid/:mailgun` |
| Credencial de ingress/signing key | `bin/rails credentials:edit` sob `action_mailbox.*` |
| Form com WYSIWYG (usuário gera conteúdo formatado) | ActionText `has_rich_text` + `rich_textarea` |
| Texto simples ou conteúdo gerado por código | Sem ActionText — campo string/text comum |
| Listagem de records com campo rich text | `with_rich_text_content` ou `with_rich_text_content_and_embeds` |

## Referências externas

- Skills relacionadas: /api-design (webhook design, credenciais de ingress), /system-design (async delivery, retry semantics), /architecture (ActionMailbox como boundary de domínio)
- Nota D16: ActionText absorvido neste átomo com sub-seção curta. Sem átomo dedicado em v6.3.3.
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-guides/references/action_mailer_basics.md
  - claude-code/knowledge/Rails/rails-guides/references/action_mailbox_basics.md
  - claude-code/knowledge/Rails/rails-guides/references/action_text_overview.md
  - claude-code/knowledge/Rails/rails-expert/SKILL.md

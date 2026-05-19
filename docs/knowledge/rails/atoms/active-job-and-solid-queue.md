---
topic: active-job-and-solid-queue
stack: rails
layer: backend
sources:
  - claude-code/knowledge/Rails/rails-background-jobs/SKILL.md
  - claude-code/knowledge/Rails/rails-background-jobs/BACKENDS.md
  - claude-code/knowledge/Rails/rails-background-jobs/assets/job_patterns.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md
tier: 2
triggers: [active job, solid queue, sidekiq, background job, perform_later, retry_on, discard_on, idempotency, queue adapter, recurring job]
related_skills: [/infrastructure, /system-design, /api-design]
updated: 2026-05-18
rails_versions: ['>=7.1']
---

# Active Job and Solid Queue

## Quando consultar

- Ao adicionar qualquer operação lenta (envio de email, chamada de API externa, processamento de arquivo) a uma action de controller
- Ao configurar o queue adapter em um app Rails novo ou ao migrar de Sidekiq para Solid Queue
- Ao definir estratégia de retry/discard para falhas transitórias vs. permanentes
- Ao implementar job com side effect externo (cobrança, email, webhook) que exige idempotência
- Ao criar recurring jobs (relatórios noturnos, sincronizações periódicas)

## Padrões sênior

### Pattern: Thin perform — load, guard, delegate

- **Problema:** `perform` com lógica de negócio longa, condicional complexa ou múltiplos side effects
- **Padrão:** `perform` faz exatamente três coisas: (1) carrega o record pelo ID passado; (2) guarda condição de no-op (idempotência); (3) delega o side effect a um service object
- **Exemplo:**
  ```ruby
  class SendInvoiceReminderJob < ApplicationJob
    queue_as :default
    retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 5
    discard_on ActiveRecord::RecordNotFound

    def perform(invoice_id)
      invoice = Invoice.find(invoice_id)
      return if invoice.reminder_sent_at?
      InvoiceReminders::Send.call(invoice:)
    end
  end
  ```
- **Quando não usar:** se `perform` precisa de mais do que load + guard + delegate, extraia um service object

### Pattern: Passar IDs, não objetos

- **Problema:** `MyJob.perform_later(@order)` serializa o record via GlobalID; se o record for deletado antes do `perform`, o lookup falha com `ActiveJob::DeserializationError`
- **Padrão:** passar `@order.id` e re-fetch dentro do `perform`: `order = Order.find(order_id)`
- **Quando não usar:** argumentos primitivos (strings, ints, hashes simples) — passar direto

### Pattern: Solid Queue — default Rails 8+ (sem Redis)

- **Problema:** dependência de Redis para Sidekiq em apps que não precisam de throughput extremo
- **Padrão (Rails 8+):** Solid Queue é database-backed e vem como default. Instalação: `rails solid_queue:install && rails db:migrate`. Dashboard via `gem "mission_control-jobs"` montado em `/jobs`
- **Configuração:**
  ```ruby
  config.active_job.queue_adapter = :solid_queue
  ```
- **Quando usar:** Rails 8 greenfield, app sem Redis pré-existente, throughput moderado
- **Quando não usar:** throughput muito alto ou Redis já presente no stack — use Sidekiq

### Pattern: Sidekiq — fallback Rails 7.x ou alta escala

- **Problema:** Rails 7.x não tem Solid Queue built-in; ou app precisa de throughput máximo
- **Padrão:** `gem 'sidekiq'` + `config.active_job.queue_adapter = :sidekiq`; requer Redis
- **Quando usar:** Rails 7.x, app com Redis estabelecido, ou quando throughput muito alto (benchmarks Sinenko 2026: Sidekiq ~5× mais rápido que Solid Queue em 10k jobs leves)
- **Quando não usar:** Rails 8 greenfield sem Redis — Solid Queue é o default e elimina a dependência

### Pattern: `retry_on` para transiente, `discard_on` para permanente

- **Problema:** falhas transitórias (timeout) e permanentes (record deletado) tratadas igual
- **Padrão:** `retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 5` para erros transitórios; `discard_on ActiveRecord::RecordNotFound` para erros onde retry nunca resolve
- **Quando não usar retry:** erros que dependem de fix de código (`NoMethodError`) — deixe a exceção subir e gerar alerta

### Pattern: Recurring jobs via `recurring.yml` (Rails 8+) ou sidekiq-cron

- **Padrão Rails 8+:** declarar em `config/recurring.yml`:
  ```yaml
  production:
    nightly_cleanup:
      class: "NightlyCleanupJob"
      schedule: "0 2 * * *"
    hourly_sync:
      class: "HourlySyncJob"
      schedule: "every 1 hour"
      queue: low
  ```
- **Padrão Rails 7.x (Sidekiq):** `config/sidekiq.yml` com chave `:schedule:` e sidekiq-cron
- **Quando não usar:** job one-off ou disparado por evento — `perform_later` direto

## Anti-padrões

### Anti-pattern: Sem idempotência em jobs com side effects externos

- **Sintoma:** job de envio de email ou cobrança pode rodar 2× em retry — cliente cobra duas vezes ou recebe dois emails
- **Por que é ruim:** Active Job é at-least-once; retries são garantidos
- **Correção:** guard no início do `perform` verificando estado já aplicado (ex: `return if invoice.reminder_sent_at?`); para coordenação mais explícita, usar campo de status no DB como sentinel

### Anti-pattern: `retry_on` sem `attempts:` explícito

- **Sintoma:** `retry_on Net::OpenTimeout` sem `attempts:` — retries potencialmente infinitos em erro persistente
- **Por que é ruim:** job nunca descarta; fila cresce; workers bloqueados
- **Correção:** sempre declarar `attempts:` e cobrir o erro permanente correspondente com `discard_on`

### Anti-pattern: Lógica de negócio dentro do `perform`

- **Sintoma:** `perform` com 40+ linhas, múltiplos `if`, chamadas de serviço diretamente
- **Por que é ruim:** jobs difíceis de testar; lógica duplicada; `perform` não pode ser re-usado
- **Correção:** `perform` só faz load + guard + delegate; o service object carrega a lógica

### Anti-pattern: `:inline` ou `:async` adapter em produção

- **Sintoma:** `config.active_job.queue_adapter = :inline` ou `:async` em ambiente não-test
- **Por que é ruim:** sem persistência, sem retry, sem monitoramento; falhas são silenciosas
- **Correção:** usar Solid Queue (Rails 8+) ou Sidekiq (Rails 7.x / alta escala)

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Rails 8 greenfield, sem Redis | Solid Queue (default) |
| Rails 7.x ou Redis já no stack | Sidekiq |
| Throughput muito alto (Sidekiq 5× mais rápido que Solid Queue em workloads leves) | Sidekiq direto |
| Side effect externo (email, cobrança, webhook) | Guard de idempotência antes do side effect |
| Falha transitória (timeout, 5xx) | `retry_on` com `attempts:` explícito |
| Falha permanente (record deletado, erro de deserialização) | `discard_on` |
| Argumentos do `perform` | IDs, não records ActiveRecord |
| Recurring jobs (Rails 8+) | `config/recurring.yml` + Mission Control Jobs |
| Recurring jobs (Rails 7.x) | sidekiq-cron + `config/sidekiq.yml` |

## Referências externas

- Skills relacionadas: /infrastructure (queue management cross-stack), /system-design (async workload, backpressure), /api-design (idempotency)
- Source paths (audit trail RF14):
  - claude-code/knowledge/Rails/rails-background-jobs/SKILL.md
  - claude-code/knowledge/Rails/rails-background-jobs/BACKENDS.md
  - claude-code/knowledge/Rails/rails-background-jobs/assets/job_patterns.md
  - claude-code/knowledge/Rails/compass_artifact_wf-1d48ebbc-37c7-489c-a0ac-802e2133c81c_text_markdown.md

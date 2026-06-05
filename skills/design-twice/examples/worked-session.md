# Sessao Exemplo — Design Twice

Transcricao completa de uma sessao de design-twice. Mostra o ritmo real: codebase-aware → restricoes genuinas → propostas divergentes → pushback honesto → convergencia → registro DT-.

---

## Contexto da Sessao

**Problema recebido via $ARGUMENTS:**
> "Precisamos de um sistema de notificacoes para nosso app Rails. Usuarios precisam receber alertas quando um pedido muda de status. Hoje mandamos email, mas queremos adicionar push e in-app."

---

## Step 1 — Entendimento do Problema

Argumento recebido. Verificando: o dev tem preferencia por uma abordagem?

Nao ha preferencia declarada. Prosseguindo com design-twice.

---

## Step 2 — Identificar Constraints e Requisitos

Explorando o codebase:

```
Glob: app/jobs/*.rb        → encontrado: OrderMailerJob, ApplicationJob
Glob: app/models/*.rb      → encontrado: Order, User, Notification (model vazio, criado ontem)
Grep: "Sidekiq|redis"      → Gemfile: sidekiq ~> 7.0, redis ~> 5.0 (ja no projeto)
Grep: "ActionCable"        → nenhum resultado
Grep: "push|FCM|APN"       → nenhum resultado
Read: package.json         → nao existe (Rails puro, sem Node na raiz)
Read: Gemfile              → Rails 7.1, Sidekiq, Redis, Devise (auth), Noticed (gem de notificacoes — comentada, "tentativa anterior")
```

**Constraints Compartilhadas:**
- Stack: Rails 7.1 + Sidekiq + Redis (ja disponivel)
- Must have: usuarios recebem alerta quando pedido muda de status (Order#status)
- Must have: suporte a email (ja existe via OrderMailerJob)
- Should have: suporte a in-app (sem especificacao de UI ainda)
- Might have: push (FCM/APN) — mencionado, sem spec
- Constraints tecnicas: Redis disponivel; Sidekiq disponivel; sem ActionCable configurado
- Constraints de negocio: equipe de 2 devs; sem data de prazo
- Contexto relevante: gem `noticed` comentada no Gemfile — tentativa anterior abandonada

**Dominio identificado:** Arquitetura de Codigo (decisao sobre estrutura e camadas, nao sobre qual lib)

Selecionando restricoes para os 3 subagentes.

---

## Step 3 — Restricoes dos Subagentes

```
Agente A — KISS radical:
  "Minimize complexity. Use only what's already in the project.
   No new gems. No ActionCable. Deliver the simplest notification system
   that handles email + a in-app flag stored in the database."

Agente B — Extensibility-first:
  "Design for future extension. The system must support adding new channels
   (push, SMS, Slack) without touching core notification logic.
   Use an abstraction layer. The Noticed gem in the Gemfile is available — evaluate it."

Agente C — Event-driven:
  "Model notifications as domain events. OrderStatusChanged is an event;
   notifications are side effects. Optimize for auditability and replay.
   Full audit trail of what was sent, when, and to whom."
```

---

## Step 4 — Comparacao de Propostas

Resultado dos 3 subagentes apos consolidacao via `consolidateProposals()`:

### Comparacao de Propostas

| Aspecto | Proposta A (KISS) | Proposta B (Extensivel) | Proposta C (Event-driven) |
|---------|------------------|------------------------|--------------------------|
| **Titulo** | Notificacoes diretas via Sidekiq | Sistema extensivel com Noticed | Notificacoes como eventos de dominio |
| **Resumo** | Job por canal, logica inline, tabela notifications simples | Noticed gem como backbone, Notifier classes por evento, multi-canal por config | OrderStatusChanged event, handlers desacoplados, tabela de audit completa |
| **Recomendacao** | Comecar aqui se o escopo for apenas email + in-app agora | Escolher se push/SMS virao em < 3 meses | Escolher se auditoria de entrega for requisito de negocio |
| **Tradeoffs chave** | Simplicidade vs extensibilidade | Extensibilidade vs curva da gem | Rastreabilidade vs complexidade operacional |
| **Alternativas rej.** | 2 | 1 | 3 |

---

### Detalhamento Completo

**Proposta A — Notificacoes diretas via Sidekiq**

```json
{
  "kind": "proposal",
  "payload": {
    "proposal": {
      "title": "Notificacoes diretas via Sidekiq",
      "summary": "Uma tabela notifications simples, um job por canal (EmailNotificationJob, InAppNotificationJob), chamados diretamente no Order model via callback after_save. Zero novas gems.",
      "constraints": [
        "Apenas gems ja no projeto",
        "Sem ActionCable",
        "Sem abstracao de canal"
      ],
      "tradeoffs": [
        { "axis": "complexidade", "choice": "minima — 3 arquivos novos" },
        { "axis": "extensibilidade", "choice": "baixa — adicionar SMS requer editar Order model" },
        { "axis": "rastreabilidade", "choice": "basica — coluna delivered_at na tabela" }
      ],
      "recommendation": "Ideal para escopo atual (email + in-app). Se push vier, refatorar entao.",
      "alternatives": [
        { "id": "noticed", "title": "Usar gem Noticed", "rejected_because": "Adiciona dependencia para um problema que 50 linhas resolvem agora" },
        { "id": "events", "title": "Event sourcing", "rejected_because": "Overhead de infra injustificado para 2 canais" }
      ]
    }
  }
}
```

**Proposta B — Sistema extensivel com Noticed**

```json
{
  "kind": "proposal",
  "payload": {
    "proposal": {
      "title": "Sistema extensivel com Noticed",
      "summary": "Reativar gem Noticed (ja estava no Gemfile, comentada). Criar OrderStatusNotifier com deliveries por canal. Adicionar novo canal = criar novo delivery method sem tocar logica existente.",
      "constraints": [
        "Noticed gem como backbone",
        "Notifier classes por tipo de evento",
        "Canal como plugin"
      ],
      "tradeoffs": [
        { "axis": "extensibilidade", "choice": "alta — canal novo e um arquivo" },
        { "axis": "curva de aprendizado", "choice": "media — API da Noticed e simples mas requer leitura" },
        { "axis": "complexidade inicial", "choice": "moderada — mais estrutura que A para o mesmo escopo hoje" }
      ],
      "recommendation": "Ideal se push ou SMS vierem nos proximos meses. A gem ja estava no projeto — alguem ja avaliou isso antes.",
      "alternatives": [
        { "id": "custom-abstraction", "title": "Abstracao propria em vez de Noticed", "rejected_because": "Reinventar o que Noticed ja faz testado" }
      ]
    }
  }
}
```

**Proposta C — Notificacoes como eventos de dominio**

```json
{
  "kind": "proposal",
  "payload": {
    "proposal": {
      "title": "Notificacoes como eventos de dominio",
      "summary": "OrderStatusChanged e um evento de dominio publicado via Wisper ou equivalent. Handlers desacoplados consomem o evento e disparam canais. Tabela notification_events com payload completo para replay e auditoria.",
      "constraints": [
        "Notificacoes sao side effects de eventos, nao chamadas diretas",
        "Audit trail completo por design",
        "Handlers desacoplados do Order model"
      ],
      "tradeoffs": [
        { "axis": "rastreabilidade", "choice": "maxima — cada notificacao tem payload, timestamp, status de entrega" },
        { "axis": "complexidade operacional", "choice": "alta — 2 novas gems, novo padrao no projeto" },
        { "axis": "extensibilidade", "choice": "maxima — novo handler = novo arquivo, zero acoplamento" }
      ],
      "recommendation": "Escolher apenas se auditoria de entrega for requisito regulatorio ou de negocio explicito.",
      "alternatives": [
        { "id": "noticed-with-logging", "title": "Noticed + logging estruturado", "rejected_because": "Noticed com ActiveRecord delivery ja da rastreabilidade suficiente para 80% dos casos" },
        { "id": "sidekiq-with-logging", "title": "Sidekiq + logs", "rejected_because": "Logs nao sao auditoria — nao sao queryaveis da mesma forma" },
        { "id": "outbox-pattern", "title": "Outbox pattern completo", "rejected_because": "Para 2 devs, overhead de outbox e prematuro" }
      ]
    }
  }
}
```

---

## Step 5 — Apresentar ao Dev (Ramo DIVERGENTE)

Analisando convergencia:
- Estrutura diferente: A usa callbacks diretos; B usa Notifier classes; C usa event handlers. **Divergente.**
- Lib escolhida: A rejeita Noticed; B adota Noticed; C usa Wisper. **Divergente.**
- Abordagem de dados: A = coluna simples; B = tabela noticed_notifications; C = tabela de eventos com payload. **Divergente.**

**Resultado: DIVERGENTE.** As 3 propostas oferecem direcoes genuinamente diferentes.

---

Apresentando ao dev:

> As 3 propostas oferecem direcoes genuinamente diferentes.
>
> **Proposta A (KISS)** resolve o escopo de hoje com minima complexidade. Escolha se push/SMS sao incertos ou distantes.
>
> **Proposta B (Noticed)** — aqui esta o ponto que merece atencao: a gem `noticed` estava comentada no Gemfile, o que sugere que alguem ja tentou esse caminho. Isso pode ser sinal de problema anterior ou simplesmente prioridade. Vale investigar o motivo antes de adotar. Se o bloqueador anterior foi superado, B e a aposta mais nitida: extensibilidade real sem reinventar a roda, e a gem ja foi avaliada pelo time.
>
> **Proposta C (Event-driven)** e mais segura em termos de rastreabilidade, mas menos diferenciada do ponto de vista de negocio — auditoria de entrega raramente e requisito nos estagios iniciais de um produto. Adiciona 2 gems e um padrao novo que o time precisara aprender.
>
> **Recomendacao:** Proposta B, com uma condicao — verificar por que `noticed` foi comentada. Se o bloqueador foi "nao tinhamos tempo de configurar", B e o caminho. Se foi "testamos e nao funcionou para nosso caso", A e mais seguro.
>
> Qual voce prefere? Ou quer investigar o historico da gem antes de decidir?

---

**Resposta do dev:**

> "Lembrei: a gem foi comentada porque a gente nao tinha Redis configurado na epoca. Agora temos. Vamos com B."

---

## Step 6 — Registrar Decisao

Salvando em `.claude/decisions.md`:

### DT-001: Arquitetura do sistema de notificacoes

**Data:** 2026-06-05
**Metodo:** Design Twice (3 propostas)
**Dominio:** Arquitetura de Codigo
**Escolha:** Proposta B — Sistema extensivel com Noticed
**Razao:** Gem ja estava avaliada no projeto (estava comentada por falta de Redis, nao por problema tecnico). Redis agora disponivel. Extensibilidade real para push/SMS sem reinventar abstracao de canal.

**Alternativas rejeitadas:**
- Proposta A (KISS direto): Rejeitada porque push/SMS virao nos proximos 2 meses — refatorar depois custaria mais do que a estrutura adicional de B agora.
- Proposta C (Event-driven): Rejeitada porque auditoria de entrega nao e requisito de negocio atual; overhead de 2 gems e novo padrao nao justificado para equipe de 2 devs.

**Convergencia:** nao — 3 direcoes estruturalmente diferentes

---

## Step 7 — Learn Point

> "Quer entender por que a Proposta B (extensibilidade via Noticed) tem o trade-off de complexidade inicial maior, mesmo sendo a escolha correta para este contexto? Posso explicar o principio Open-Closed em termos praticos — quando a abstracao de canal vale o custo e quando e prematuro — via /learn."

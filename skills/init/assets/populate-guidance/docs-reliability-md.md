# Guidance: docs/RELIABILITY.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/RELIABILITY.md documenta a **postura de confiabilidade do projeto em producao**: como erros sao tratados, quais ferramentas de observabilidade estao configuradas, quais sao os SLOs definidos (ou que deveriam ser), e o que acontece quando algo quebra em producao. NAO eh um runbook operacional detalhado — eh o mapa que aponta para onde o runbook vive.

O publico primario eh engenheiros investigando um incidente ou adicionando codigo que pode falhar em producao.

## Espirito do doc (tom esperado)

Honesto e especifico. Se o projeto nao tem observabilidade configurada, o doc deve dizer isso claramente com um TODO — nao fingir que existe. "Usamos Sentry para captura de exceptions com DSN configurado em SENTRY_DSN" eh bom. "Temos boas praticas de logging" eh ruim. Cada afirmacao deve ter uma ancora verificavel no codebase ou na infra.

## Sinais a procurar no codebase

- `try\s*\{` e `catch\s*(` — frequencia e profundidade do tratamento de erros. Muitos catch vazios sao red flag.
- `logger\.` ou `console.error` — indica que logging existe. Mas `console.log` misturado com `console.error` em producao eh sinal de logging inconsistente.
- `Sentry`, `pino`, `winston`, `datadog` — ferramentas de observabilidade declaradas. Verifica configuracao (DSN, sample rate).
- `.env.example` com `SENTRY_DSN`, `LOG_LEVEL`, `DD_API_KEY` — confirmacao de que a ferramenta esta integrada.
- `uncaughtException`, `unhandledRejection` — handlers globais de erro em Node. Ausencia eh red flag.

## Por H2 — o que escrever

### Error Handling
Descreve a convencao de tratamento de erros do projeto: como erros sao propagados (throw vs return Result), onde erros sao convertidos para respostas HTTP, e o que acontece com erros nao tratados. Inclui link para o codigo de inicializacao de tratamento global de erros se existir.

**Cubra:** convencao de propagacao de erros, tratamento de unhandled promise rejections, onde errors sao convertidos para HTTP responses
**NAO escreva:** lista de todos os try/catch do projeto — link para o pattern, nao para cada instancia

### Observability
Quais ferramentas de logging, tracing e metricas estao configuradas, e como usa-las. Link para o codigo de inicializacao do logger/tracer. Se nenhuma ferramenta esta configurada, TODO explicito eh obrigatorio — nao descrever um sistema que nao existe.

**Cubra:** ferramentas de observabilidade (nome, link para config), nivel de log em producao vs desenvolvimento
**NAO escreva:** tutorial de uso das ferramentas — link para documentacao oficial

### SLO Targets
Os Service Level Objectives do projeto: uptime esperado, latencia maxima aceitavel, taxa de erro tolerada. Se o projeto nao tem SLOs definidos, esta secao deve ter um TODO explicito — SLOs indefinidos sao riscos de confiabilidade real. Inclui quem monitora e com qual frequencia.

**Cubra:** uptime target numerico, latencia budget se definido, responsavel por monitoramento
**NAO escreva:** SLOs aspiracionais sem acordo do time — SLO sem acordo nao eh SLO

### Incident Response
O processo basico quando algo quebra em producao: como um incidente eh detectado, quem e acionado, onde o runbook operacional vive. Esta secao nao eh o runbook — eh o ponteiro para ele. Se nao existe runbook, TODO.

**Cubra:** processo de on-call, link para runbook operacional, como incidentes sao escalados
**NAO escreva:** conteudo do runbook aqui — link para onde ele vive

## Stack-specific

### Rails
`Rails.logger` eh o logger default. Para producao, considera-se Sentry via `sentry-ruby` e `sentry-rails`. Tratamento global de erros via `rescue_from` em ApplicationController para erros HTTP, e `config.exceptions_app` para erros de routing.

### Next + React
Server Actions e API Routes devem ter tratamento de erros explicito — o erro nao borbulha automaticamente para um handler global. Sentry se integra via `@sentry/nextjs`. Error Boundaries no client-side capturam erros de renderizacao.

### Node + TypeScript
`process.on('uncaughtException')` e `process.on('unhandledRejection')` devem estar configurados como safety net. `pino` ou `winston` para logging estruturado. Express middleware de erro (`(err, req, res, next)`) como ultimo recurso.

## Links obrigatorios

`docs/SECURITY.md` — incidentes de seguranca tem um processo especifico que pode diferir do processo de incidente tecnico generico. O link garante que o leitor saiba que existe uma camada adicional para incidentes de seguranca.

`ARCHITECTURE.md` — para entender onde um componente confiavel termina e onde comecam os pontos de falha externos (APIs de terceiros, DB, workers).

## Quando deixar TODO

Se nenhuma ferramenta de observabilidade for encontrada apos grep dos signals, deixe `TODO(<observability-setup needed>): nenhuma ferramenta de observabilidade identificada — configurar antes de ir para producao`. NAO documente observabilidade que nao existe.

## Anti-patterns

- NAO descrever SLOs que nao foram acordados pelo time — SLO ficticio eh pior do que ausencia de SLO
- NAO omitir a secao Observability mesmo se vazia — um TODO explicito eh mais honesto do que silencio
- NAO misturar runbook operacional com esta documentacao — pertence a docs separados de operacao
- NAO usar metricas vagas ("alta disponibilidade") sem numero — "99.9% uptime" eh um SLO, "alta disponibilidade" nao eh

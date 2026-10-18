---
name: api-design
description: "Roteiro de decisão de API: faz até 3 perguntas que só o usuário sabe, mostra 2 ou 3 opções com prós, contras e custo, recomenda e registra a escolha. Use ao decidir estabilidade e versionamento de contrato, problema N+1, idempotência, DTOs, webhooks vs WebSockets vs SSE, SQL vs NoSQL, concorrência na API, protocolo (REST, gRPC, AMQP), GraphQL, ou URLs, paginação e status codes."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch, AskUserQuestion
argument-hint: "[decisão de API ou endpoint a analisar]"
---

<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-01 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G1 do plano: bloco verbatim do Plano 01 fase-04 (security wire). Path fixo .claude/knowledge/INDEX.md (D11).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.

import { getStackKnowledgePreface } from '../security/lib/stack-aware-preface'

const stackKnowledgePreface = getStackKnowledgePreface(process.cwd())
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta. Se vazio, ignore — a skill segue sem mudança (CA-09).
<!-- stack-aware-preface:end -->

<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.
// SYNC: logica espelhada em skills/lib/__tests__/stale-warning.test.ts:checkStaleCapabilities.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->

# API Design — Roteiro de Decisão

Decidir como a API conversa com quem a usa: o contrato, o formato e o comportamento quando algo se repete ou atrasa. A skill **conduz a decisão**: pergunta o que só o usuário sabe (quem consome, o que custa um erro, quanto volume), mostra as opções com prós e contras em português simples e registra a escolha. Também analisa endpoints existentes. Não gera código; para implementar depois, direcione para `/anti-vibe-coding:tdd-workflow`.

## Como Operar

1. **Diga a decisão em uma frase**, sem jargão: "Vamos decidir o que acontece se o mesmo pagamento chegar duas vezes."
2. **Leia o projeto antes de perguntar** (`Read`, `Grep`): rotas, ORM, como os erros são devolvidos hoje. Depois **faça até 3 perguntas numa tela só** (`AskUserQuestion`, uma pergunta por item), só do que o usuário sabe: quem consome a API, o que acontece se der errado, quanto volume.
3. **Mostre 2 ou 3 opções**, cada uma com: o que é (uma linha), prós, contras, custo (de construir e de manter) e quando seria a escolha errada.
4. **Recomende uma**, ligando a recomendação às respostas dele: "Recomendo a chave de idempotência porque você disse que o botão de pagar pode ser clicado duas vezes."
5. **Se o usuário não souber responder**, use o padrão de um sênior para aquela decisão (catálogo abaixo) e diga qual usou e o que mudaria a resposta.
6. **Registre a escolha** (seção Registro) e só então encerre.

Pedido de explicação completa ou de aprofundamento ("me explica de verdade", "quero o texto completo"): leia `references/guia-completo.md`, e o arquivo do tópico quando houver. Esse texto longo só é lido quando o usuário pedir; o roteiro não depende dele.

## Catálogo de decisões

Cada bloco diz o que perguntar, as opções, o padrão de um sênior e quando ele erra. Use o bloco da decisão em discussão; não percorra todos.

### Mudar um contrato que já tem consumidores
- **Perguntas:** (1) Quem consome essa API hoje: só o seu site, um app publicado na loja, parceiros? (2) Dá para atualizar todos os consumidores ao mesmo tempo? (3) O que acontece se um consumidor antigo quebrar?
- **Opções:** A) Estender sem quebrar: campo novo opcional, com valor padrão. B) Deprecar com prazo e migrar todos em sequência. C) Nova versão (`/api/v2`) em paralelo.
- **Padrão:** estender, não bifurcar. Lei de Hyrum: com usuários suficientes, todo comportamento observável vira dependência de alguém, documentado ou não. Então exponha só o necessário (cada campo público é promessa permanente), não vaze detalhe de implementação (nome de tabela, id interno) e planeje a deprecação já no design. Versão nova só quando a quebra é inevitável, com migração sequencial.
- **Errada quando:** mudar ou remover campo sem versionar (quebra em silêncio); manter duas versões em paralelo sem prazo (custo dobrado e consumidores presos no meio).
- **Referência:** `references/rest-advanced.md` (versionamento), `references/dtos.md`

### Lista lenta porque busca um por um (N+1)
- **Perguntas:** (1) Que tela ou endpoint lista itens com dados relacionados (pedido com cliente, aluno com turma)? (2) Quantos itens a lista mostra, em ordem de grandeza? (3) A tela usa sempre os mesmos dados relacionados?
- **Opções:** A) Carregar junto na mesma consulta (eager loading: `include`, `with`). B) Buscar em lote (DataLoader, `WHERE IN`). C) JOIN explícito ou subconsulta.
- **Padrão:** consulta dentro de loop é N+1. Relação conhecida na hora da consulta: A. Vários itens precisam da mesma relação: B. Em GraphQL, DataLoader é obrigatório.
- **Errada quando:** lazy loading dentro de loop; carregar junto relação que a tela não usa (traz dado demais).
- **Referência:** `references/n-plus-one.md`

### A mesma requisição chegar duas vezes (idempotência)
- **Perguntas:** (1) A operação envolve dinheiro? (2) Tem efeito que não se desfaz (e-mail, SMS, mensagem de WhatsApp)? (3) Quem pode repetir a chamada: o usuário clicando duas vezes, um retry automático, o webhook reenviado?
- **Opções:** A) Chave de idempotência enviada pelo cliente, reservada antes de executar. B) Restrição de unicidade no banco sobre uma chave natural (ex.: o id do evento do provedor). C) Nada: a operação já é idempotente por natureza.
- **Padrão:** dinheiro: obrigatória. Efeito irreversível: recomendada. Reserve a chave primeiro, com `UNIQUE`, e responda 409 para chave ainda em andamento. Webhook usa o id do evento do provedor. Confira a implementação, não o verbo: um `PUT` que soma ao valor atual não é idempotente.
- **Errada quando:** confiar no verbo HTTP; conferir e depois gravar sem restrição única (duas requisições passam juntas).
- **Referência:** `references/idempotency.md`

### O que entra e o que sai da API (DTOs)
- **Perguntas:** (1) A API é pública ou usada por terceiros? (2) O modelo tem campo sensível (senha, token, id interno)? (3) O usuário consegue mandar campo que não deveria controlar (papel, `isAdmin`, preço)?
- **Opções:** A) DTO de entrada e de saída separados, com versionamento. B) Só DTO de saída. C) Só DTO de entrada.
- **Padrão:** API pública: A. Campo sensível: DTO de saída no mínimo. Campo que o usuário não deve controlar: DTO de entrada no mínimo (Mass Assignment é vulnerabilidade real). Instancie o DTO antes de persistir, rejeite campos extras, valide sempre no back-end. DTO é o contrato; o modelo de domínio é a regra de negócio.
- **Errada quando:** passar o body cru para o banco; validar só no front-end (qualquer `curl` ignora o front).
- **Referência:** `references/dtos.md`, `references/typescript-contracts.md` (contrato em tempo de compilação, com unions e ids marcados)

### Avisos e tempo real: webhook, WebSocket ou SSE
- **Perguntas:** (1) Quem inicia a conversa: um sistema de fora (Stripe, GitHub) ou o seu? (2) O cliente também precisa mandar mensagens (mão dupla)? (3) Com que frequência chegam os eventos?
- **Opções:** A) Webhook: o sistema de fora avisa você. B) SSE: o servidor empurra para o cliente (notificação, progresso). C) WebSocket: mão dupla (chat, painel em tempo real).
- **Padrão:** sistema externo: webhook, com assinatura validada sobre o corpo cru, id do evento único, resposta 200 rápida e processamento depois. Mão dupla ou muitos eventos por segundo: WebSocket. Só servidor para cliente, a cada poucos segundos: SSE. Esporádico: consulta periódica.
- **Errada quando:** webhook sem validar a assinatura (o endpoint é público, e qualquer um simula um pagamento); WebSocket para notificação de mão única.
- **Referência:** `references/communication-patterns.md` (e `/anti-vibe-coding:security` para a assinatura)

### Banco de dados para a API (SQL ou NoSQL)
- **Perguntas:** (1) Os dados se relacionam entre si (cliente, pedido, item)? (2) Precisa de transação (dinheiro, estoque)? (3) Qual o acesso principal: chave e valor, documento, grafo ou escrita massiva com análise no tempo?
- **Opções:** A) PostgreSQL. B) PostgreSQL mais um complemento (Redis para cache e sessão). C) NoSQL específico (MongoDB, Neo4j, Cassandra ou ClickHouse).
- **Padrão:** PostgreSQL; sem certeza, PostgreSQL. Ele cobre JSON, busca textual e extensões, e migrar de SQL para NoSQL é mais fácil que o contrário.
- **Errada quando:** NoSQL sem problema comprovado; abrir mão de ACID em dinheiro.
- **Referência:** `references/database-selection.md` (e `/anti-vibe-coding:system-design` quando o banco precisa escalar)

### O usuário precisa esperar? (concorrência)
- **Perguntas:** (1) O usuário precisa do resultado para continuar? (2) As tarefas da mesma requisição dependem umas das outras? (3) Mais de um sistema precisa reagir ao mesmo evento?
- **Opções:** A) Na hora: em paralelo (`Promise.all`) ou em série. B) Tarefa em segundo plano (job). C) Evento publicado para vários consumidores (PubSub ou fila de eventos).
- **Padrão:** não precisa esperar: segundo plano. Tarefas independentes: em paralelo. Vários sistemas reagem: PubSub. Resultado aos poucos: streaming (SSE).
- **Errada quando:** e-mail ou processamento de imagem dentro da requisição; `await` em série de coisas independentes.
- **Referência:** `references/api-concurrency.md`

### Protocolo: REST, gRPC ou fila
- **Perguntas:** (1) Quem é o cliente: navegador, app ou outro servidor? (2) A mensagem precisa chegar mesmo se o consumidor estiver fora do ar? (3) É servidor a servidor, com volume alto?
- **Opções:** A) HTTP/REST. B) gRPC (servidor a servidor, alta performance). C) Fila com AMQP (RabbitMQ, SQS) para entrega garantida e assíncrona.
- **Padrão:** REST mais WebSocket cobrem 90% dos casos. Navegador como cliente: REST ou WebSocket, nunca gRPC. gRPC e AMQP só com necessidade comprovada.
- **Errada quando:** gRPC para cliente de navegador; fila onde uma chamada direta resolve.
- **Referência:** `references/api-protocols.md`

### GraphQL: quando adotar e como proteger
- **Perguntas:** (1) Há vários clientes com necessidades diferentes? (2) Os endpoints atuais trazem dado de mais ou de menos, comprovadamente? (3) A API é pública para terceiros?
- **Opções:** A) REST. B) GraphQL com limites de profundidade e de complexidade, e DataLoader. C) Híbrido: REST na maioria, GraphQL nas telas complexas.
- **Padrão:** CRUD simples e API pública: REST. Se for GraphQL: limite de profundidade (6 a 7 níveis), análise de complexidade por campo, DataLoader, input types nas mutations, erros monitorados no campo `errors` (GraphQL sempre responde 200) e schema dividido por domínio.
- **Errada quando:** GraphQL sem limite de profundidade (uma consulta aninhada derruba o servidor); monitorar só o status code.
- **Referência:** `references/graphql-patterns.md` (a escolha REST ou GraphQL também está em `/anti-vibe-coding:architecture`)

### URLs, paginação e status
- **Perguntas:** (1) A coleção pode passar de 10 mil registros? (2) O usuário precisa pular direto para "a página 7"? (3) Os dados mudam enquanto alguém navega?
- **Opções:** A) Paginação por página (`?page=3`). B) Por offset (`?offset=20`). C) Por cursor (`?cursor=abc`).
- **Padrão:** toda coleção é paginada, nunca devolve tudo. Grande ou mutável: cursor. Precisa de "ir para a página X": página. URLs com substantivo no plural, `kebab-case`, até 3 níveis aninhados, versão no path. Status com significado: 201 criou, 204 sem corpo, 400 inválido, 401 sem login, 403 sem permissão, 404 não existe, 429 limite; nunca 200 para tudo.
- **Errada quando:** coleção sem paginação (adicionar depois quebra consumidor); verbo na URL (`/getUser`); formato de erro diferente em cada endpoint.
- **Referência:** `references/rest-advanced.md`

## Registro

Depois que o usuário escolher, registre numa destas duas:

- **Há uma feature em andamento** (`docs/exec-plans/active/<pasta>/DESIGN.md`; se houver mais de uma, pergunte qual): acrescente uma linha na tabela `## Decisões` — `| N | decisão | opções | escolha | por quê |`. Escreva o "por quê" com as respostas do usuário.
- **A decisão muda um contrato que já tem consumidores, ou vale para o projeto inteiro** (estilo de API, formato de erro, estratégia de versão), **ou não há feature em andamento:** crie um ADR com `/anti-vibe-coding:decision-registry`. Pela Lei de Hyrum, mudança de contrato sem registro vira surpresa para quem consome.

## Sinais de alerta

- O mesmo endpoint devolve formatos diferentes conforme o caso (`{ data }` no sucesso, `{ error }` solto na falha).
- Cada endpoint tem um formato de erro diferente.
- Validação espalhada em funções internas, em vez de concentrada na entrada da API.
- Resposta de terceiro usada direto, sem validar.
- "Documento os contratos depois", "API interna não precisa de contrato", "mantemos as duas versões para não quebrar ninguém".

$ARGUMENTS

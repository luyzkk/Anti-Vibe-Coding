---
name: system-design
description: "Roteiro de decisão de system design: faz até 3 perguntas que só o usuário sabe, mostra 2 ou 3 opções com prós, contras e custo, recomenda e registra a escolha. Use ao decidir CAP/consistência, escala, cache, banco de dados, replicação e sharding, CDN, serverless vs servidor fixo, filas, consulta SQL lenta ou resiliência — por conceito ou por nome (Redis, RabbitMQ, BullMQ, Lambda, EC2, SQLite, EXPLAIN, WAL, DLQ)."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch, AskUserQuestion
argument-hint: "[decisão de system design: escala, cache, banco, fila...]"
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


# System Design — Roteiro de Decisão

Decidir como o sistema vai se comportar sob carga, falha e crescimento. A skill **conduz a decisão**: pergunta o que só o usuário sabe, mostra as opções com prós e contras em português simples e registra a escolha. Não escreve código; para implementar depois, direcione para `/anti-vibe-coding:tdd-workflow`.

## Como Operar

1. **Diga a decisão em uma frase**, sem jargão: "Vamos decidir se a lista de planos do quiz fica em cache."
2. **Pergunte até 3 perguntas numa tela só** (`AskUserQuestion`, uma pergunta por item). Só o que o usuário sabe e o código não mostra: valor de negócio, tamanho do pico, o que acontece se der errado. Nunca pergunte o que dá para descobrir lendo o projeto; leia primeiro (`Read`, `Grep`).
3. **Mostre 2 ou 3 opções**, cada uma com: o que é (uma linha), prós, contras, custo (dinheiro, tempo de manutenção, complexidade) e quando seria a escolha errada. Não invente uma terceira opção só para fechar número.
4. **Recomende uma**, ligando a recomendação às respostas dele: "Recomendo B porque você disse que preço velho vira cobrança errada."
5. **Se o usuário não souber responder**, use o padrão de um sênior para aquela decisão (catálogo abaixo) e diga qual usou e o que mudaria a resposta: "Usei o padrão 'vertical primeiro' porque você não soube o tamanho do pico; se passar de 70% de CPU de forma sustentada, reveja."
6. **Registre a escolha** (seção Registro) e só então encerre.

Pedido de explicação completa ou de aprofundamento ("me explica de verdade", "quero o texto completo"): leia `references/guia-completo.md`, e o arquivo do tópico quando houver. Esse texto longo só é lido quando o usuário pedir; o roteiro não depende dele.

## Catálogo de decisões

Cada bloco diz o que perguntar, as opções, o padrão de um sênior e quando ele erra. Use o bloco da decisão em discussão; não percorra todos.

### CAP — consistência ou disponibilidade
- **Perguntas:** (1) Se esse dado aparecer errado por alguns segundos, alguém perde dinheiro, paga errado ou tem problema legal, ou só estranha? (2) Se o sistema ficar fora do ar por alguns minutos numa falha, o que o usuário perde?
- **Opções:** A) Consistência forte: tudo sempre certo, pode ficar fora do ar numa falha. B) Disponibilidade: sempre responde, pode mostrar dado de segundos atrás. C) Meio-termo: disponível com prazo curto de atualização (TTL curto).
- **Padrão:** A para dinheiro, estoque e dado legal; B para conteúdo, feed e contador.
- **Errada quando:** A em conteúdo que pode atrasar (derruba sem necessidade); B em saldo ou cobrança.
- **Referência:** `references/cap-theorem.md`

### Escala — aguentar mais gente
- **Perguntas:** (1) Quanta gente usa ao mesmo tempo no pico (ex.: anúncio no ar) e quanto isso cresce em 6 meses? (2) Quanto custa o sistema ficar fora do ar por 1 hora? (3) O servidor passa de 70% de CPU de forma sustentada hoje?
- **Opções:** A) Máquina maior (vertical). B) Mais máquinas atrás de um balanceador (horizontal). C) Nada agora: medir antes.
- **Padrão:** vertical primeiro. Horizontal só com limite atingido ou disponibilidade de 99,9%+ (mínimo 2 máquinas em zonas diferentes, aplicação sem estado). Balanceador: Round Robin; Least Connections se os pedidos têm duração muito variada; health check sempre; o balanceador vira ponto único de falha, então duplique.
- **Errada quando:** horizontal sem necessidade (custo e complexidade sem ganho); vertical quando o requisito é redundância.
- **Referência:** `references/scalability.md`, `references/load-balancing.md`

### Cache — guardar para responder mais rápido
- **Perguntas:** (1) Se o dado aparecer desatualizado por alguns minutos, alguém paga errado ou só estranha? (2) A consulta é lenta hoje (passa de ~100 ms) ou é só suspeita? (3) A resposta muda conforme quem pediu (preço por plano, dado pessoal)?
- **Opções:** A) Sem cache. B) Cache com validade curta (cache-aside + TTL). C) Cache que se apaga quando o dado muda (invalidação explícita).
- **Padrão:** cache-aside + TTL de 5 a 60 min + invalidar na escrita. Dado financeiro ou de estoque: TTL abaixo de 10 s com invalidação, ou sem cache. Consulta abaixo de 100 ms: sem cache.
- **Errada quando:** cache num dado que muda a cada minuto com consulta barata; resposta que varia por usuário em cache compartilhado (entrega o dado de A para B; ver Defaults seguros).
- **Referência:** `references/cache-strategies.md`

### Banco de dados — qual usar
- **Perguntas:** (1) Que problema concreto você já teve com o banco atual (lento, não cabe, o formato muda toda semana), ou ainda nenhum? (2) Esses dados envolvem dinheiro, saldo ou estoque? (3) Quantas gravações por segundo no pico, em ordem de grandeza?
- **Opções:** A) PostgreSQL (relacional) e só. B) PostgreSQL mais um complemento para um problema específico (Redis para cache, Elasticsearch para busca). C) Banco NoSQL como principal (Mongo, Dynamo, Cassandra).
- **Padrão:** PostgreSQL até haver problema comprovado; formato mutável cabe em JSONB antes de pensar em Mongo; mais de 100 mil gravações por segundo é onde Cassandra ou Dynamo começam a fazer sentido.
- **Errada quando:** NoSQL "porque é moderno"; abrir mão de transação ACID em dinheiro.
- **Referência:** `references/database-selection.md`

### Banco lento ou crescendo — réplica e sharding
- **Perguntas:** (1) O banco está lento hoje, e como você sabe (medição, não palpite)? (2) O gargalo é ler (telas, relatórios) ou gravar (pedidos entrando)? (3) Quanto de dado e de gravação, em ordem de grandeza?
- **Opções:** A) Otimizar consultas e índices. B) Cache mais réplica de leitura. C) Sharding (dividir os dados em bancos separados).
- **Padrão:** a escada, sem pular degrau: otimizar, cache, réplica de leitura, sharding. Sharding só com mais de 100 mil gravações por segundo ou mais de 10 TB. Banco não está lento: não mude nada.
- **Errada quando:** pular degraus; réplica de leitura sem as mesmas regras de acesso da primária (vazamento com outro nome).
- **Referência:** `references/replication-sharding.md`

### CDN — entregar de perto
- **Perguntas:** (1) De que regiões vêm os usuários? (2) O que é servido: imagem e arquivo estático, ou página personalizada por usuário? (3) Há conteúdo atrás de login?
- **Opções:** A) Sem CDN. B) CDN para estáticos. C) CDN também para páginas e API, com cache por segmento.
- **Padrão:** B, com nome de arquivo versionado (`app.abc123.js`, cache longo) e HTML com cache curto. Conteúdo autenticado: `Cache-Control: private` ou `no-store`.
- **Errada quando:** `public` num endpoint autenticado (vaza para todos, pelo tempo do TTL); CDN com um usuário só numa região.
- **Referência:** `references/cdn-mechanics.md`

### Serverless ou servidor fixo
- **Perguntas:** (1) A carga é constante ou em picos e esporádica? (2) Algum processo passa de 15 minutos, ou usa conexão aberta (chat, WebSocket)? (3) Latência estável importa mais que custo zero quando ninguém usa?
- **Opções:** A) Serverless (paga por uso, tem cold start). B) Servidor fixo (24/7, latência estável). C) Misto: web em servidor fixo, webhooks e tarefas em serverless.
- **Padrão:** MVP, carga esporádica e webhooks: serverless. Carga alta e constante, WebSocket e execução longa: servidor fixo.
- **Errada quando:** serverless abrindo conexão direta ao banco sem pooler (esgota conexões); servidor fixo ocioso pago o mês inteiro.
- **Referência:** `references/serverless-vs-serverfull.md`

### Filas e tarefas em segundo plano
- **Perguntas:** (1) O usuário precisa do resultado na hora ou pode receber depois? (2) Se a mesma tarefa rodar duas vezes (cobrar duas vezes, mandar duas mensagens), qual o estrago? (3) Quantas tarefas por minuto, e perder uma é aceitável?
- **Opções:** A) Fazer na hora, sem fila. B) Fila no próprio banco (Postgres, Solid Queue). C) Broker dedicado (SQS, RabbitMQ, Kafka).
- **Padrão:** entrega "pelo menos uma vez" com consumidor idempotente (reprocessar não tem efeito extra); fila no banco quando o volume é baixo ou médio; DLQ (fila de mensagens que falham) obrigatória; retry com espera crescente e jitter, em uma camada só. Efeito fora do banco (API de terceiro, cobrança): chave de idempotência ou outbox.
- **Errada quando:** fila para algo que o usuário espera na hora (só soma latência); confiar em "exactly-once" prometido pelo broker.
- **Referência:** `references/messaging-models.md`, `references/messaging-reliability.md`, `references/messaging-operations.md`

### Consulta lenta (SQL)
- **Perguntas:** (1) Qual tela ou relatório está lento, e quanto demora hoje? (2) Quantas linhas tem a tabela, em ordem de grandeza? (3) A consulta roda o tempo todo ou de vez em quando?
- **Opções:** A) Ler o plano (EXPLAIN) e criar o índice que falta. B) Reescrever a consulta ou criar índice composto (filtro e ordenação juntos). C) Particionar a tabela.
- **Padrão:** EXPLAIN antes de mexer. B+tree como índice padrão. Cada índice custa escrita, então índice sem uso é custo puro. Particionar só tabela muito grande. Dinheiro: transação ACID.
- **Errada quando:** criar índice no escuro; particionar tabela pequena.
- **Referência:** `references/sql-indexing-and-storage.md`, `references/sql-acid-and-durability.md`, `references/sql-query-planning.md`

### Falhas e sobrecarga (resiliência)
- **Perguntas:** (1) Se um serviço de fora (pagamento, WhatsApp) não responder, o que o usuário deve ver? (2) Se chegar 10 vezes mais gente do que o sistema aguenta, tudo fica lento ou parte dos pedidos é recusada? (3) Uma chamada que deu timeout pode ter feito efeito (cobrança, envio)?
- **Opções:** A) Falhar rápido e avisar o usuário. B) Tentar de novo com espera (retry) e idempotência. C) Recusar o excesso cedo (load shedding) e isolar clientes problemáticos.
- **Padrão:** timeout em toda chamada para fora. Timeout não é falha: o resultado é desconhecido, então exija idempotência antes de tentar de novo. Em cadeia de chamadas, propague o prazo restante em vez de um timeout fixo por serviço. Nunca descarte o health check do balanceador. Antes de distribuir, pergunte se precisa mesmo.
- **Errada quando:** retry cego em cobrança (duplica); load shedding sem instrumentação.
- **Referência:** `references/guia-completo.md` §11; padrões do serviço em `/anti-vibe-coding:defensive-patterns`

## Defaults seguros (passe por eles antes de fechar qualquer decisão)

| Decisão | Default seguro |
|---|---|
| Cache de resposta | Se o conteúdo varia por ator, a chave inclui o ator. Conteúdo por ator nunca em cache compartilhado |
| Fila ou worker | O payload leva o `id` do ator e o consumidor reautoriza. Nunca "já autorizado" congelado na mensagem |
| Réplica de leitura | Herda a mesma fronteira de tenant da primária (RLS ou filtro), não só o schema |
| CDN | Conteúdo autenticado fora de cache compartilhado (`private` ou `no-store`) |
| Secrets em serverless | Injetados pelo ambiente do provedor; nunca no bundle, nunca em log |

Resposta que muda conforme quem pediu, e é dado sensível: não cacheie em camada compartilhada; se a latência exigir, cache no cliente com `no-store` no proxy.

## Registro

Depois que o usuário escolher, registre numa destas duas:

- **Há uma feature em andamento** (`docs/exec-plans/active/<pasta>/DESIGN.md`; se houver mais de uma, pergunte qual): acrescente uma linha na tabela `## Decisões` do desenho — `| N | decisão | opções | escolha | por quê |`. Escreva o "por quê" com as respostas do usuário, não com a teoria.
- **A decisão vale para o projeto inteiro** (banco, hospedagem, padrão de fila) **ou não há feature em andamento:** crie um ADR com `/anti-vibe-coding:decision-registry`, que guarda as alternativas e a justificativa.

Sem registro, a escolha vira esquecimento com aparência de decisão. Se o usuário recusar um default seguro, registre a recusa e o motivo.

## Armadilhas que atravessam todas as decisões

- Otimizar antes de ter problema comprovado: cache, réplica e sharding sem medição.
- Escolher tecnologia por moda.
- Pular degraus da escada de escala.
- Decidir sem dado: latência, taxa de acerto do cache, atraso da réplica.
- Over-engineering desde o dia 1: microsserviços, sharding e vários bancos para um MVP.

$ARGUMENTS

---
name: api-design
description: "This skill should be used when the user asks about 'API design', 'N+1 problem', 'idempotency', 'idempotent APIs', 'DTOs', 'data transfer objects', 'webhooks', 'websockets', 'SSE', 'REST vs GraphQL', 'SQL vs NoSQL', 'race conditions in APIs', 'API concurrency', 'gRPC', 'AMQP', 'RabbitMQ', 'message queue', 'GraphQL schema', 'GraphQL depth', 'DataLoader', 'pagination', 'cursor pagination', 'keyset pagination', 'REST URL design', 'status codes', 'API versioning', 'HATEOAS', 'filtering', 'sorting', 'Protocol Buffers', or needs to analyze and audit API endpoints. Provides expert consultation on API design patterns, protocols, anti-patterns, and best practices."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[API design question or endpoint to analyze]"
---

<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-01 — profile-aware-preface (PRD §RF-MH-05).
// Lê context UMA vez via readPrefaceContext (Plano 01). Lookup table per-skill (G3).
// Quando ctx.profile === null: fallback default = comportamento v6.2 intacto (CA-02).

import { readPrefaceContext } from '../lib/preface-context'
import { API_DESIGN_PREFACE_BY_PROFILE, DEFAULT_API_DESIGN_PREFACE } from './lib/api-design-prefaces'

const ctx = readPrefaceContext(process.cwd())
const preface = ctx.profile
  ? (API_DESIGN_PREFACE_BY_PROFILE[ctx.profile] ?? DEFAULT_API_DESIGN_PREFACE)
  : DEFAULT_API_DESIGN_PREFACE

// Quando ctx.profile é não-nulo, prepend preface ao corpo da skill.
// Quando null, behavior idêntico a v6.2 (CA-02).
```

Se `preface` for não-vazio, inicie sua resposta com o conteúdo de `preface` e em seguida proceda com a consulta de API design normal.
Se `preface` for vazio (profile null), comportamento v6.2 intacto — sem preface, ir direto ao corpo.
<!-- profile-aware-preface:end -->

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

# API Design — Anti-Vibe Coding

Modo **Consultor de API Design**. Neste modo, ENSINAR e ANALISAR — nunca gerar codigo.

Usar este conhecimento para responder perguntas, auditar endpoints existentes e guiar decisoes de design de APIs.

---

## 1. Problema N+1

O problema N+1 ocorre quando uma query inicial busca N itens e, para cada item, dispara uma query adicional para dados relacionados. Resultado: 1 + N queries ao banco.

**Quando acontece:**
- Lazy loading em loops (ORM carrega relacao sob demanda)
- Iteracao manual sobre resultados sem pre-carregar relacoes
- APIs REST que retornam IDs e forcam o client a buscar cada recurso

**Regra de ouro:** query dentro de loop = N+1.

### Decision Tree: Resolver N+1

```
Relacao e conhecida no momento da query?
  SIM → Eager Loading (select_related, include, with)
  NAO →
    Multiplos itens precisam da mesma relacao?
      SIM → Batch Loading (DataLoader, WHERE IN)
      NAO → JOIN explicito ou Subquery
```

> **Referencia completa:** `references/n-plus-one.md` — tabela de estrategias, exemplos de codigo, deteccao, checklist de verificacao.

---

## 2. Idempotencia

Uma operacao idempotente produz o mesmo resultado independente de quantas vezes for executada. Critico para sistemas distribuidos onde retries sao inevitaveis.

**Principio fundamental:** NAO confiar apenas na spec REST. Verificar a implementacao real. Um PUT que faz `counter = counter + 1` NAO e idempotente, apesar de PUT ser "idempotente por spec".

### Decision Tree: Preciso de Idempotencia?

```
Operacao envolve dinheiro?
  SIM → Idempotencia OBRIGATORIA (chave UUID ou composta)
  NAO →
    Operacao tem side-effects irreversiveis? (email, SMS)
      SIM → Idempotencia RECOMENDADA
      NAO →
        Operacao e naturalmente idempotente? (GET, PUT, DELETE)
          SIM → Apenas validar a implementacao
          NAO → Avaliar caso a caso (POST com unique constraint pode bastar)
```

> **Referencia completa:** `references/idempotency.md` — tabela de verbos HTTP, estrategias de implementacao, anti-patterns, checklist.

---

## 3. DTOs (Data Transfer Objects)

DTOs definem EXATAMENTE quais dados entram e saem da API. Criam barreira de seguranca entre o mundo externo e o modelo de dominio.

**Regras fundamentais:**
1. Instanciar DTO ANTES de persistir — nunca passar body cru para o banco
2. Rejeitar campos extras — Mass Assignment e vulnerabilidade real
3. Validacao SEMPRE no back-end — front-end e UX, nao seguranca
4. DTO != Modelo de Dominio — DTO e contrato da API; modelo e regra de negocio

### Decision Tree: Preciso de DTOs Separados?

```
API e publica ou consumida por terceiros?
  SIM → DTOs separados OBRIGATORIOS (input + output + versionamento)
  NAO →
    Modelo tem campos sensiveis? (password, tokens, internal IDs)
      SIM → Output DTO OBRIGATORIO (no minimo)
      NAO →
        Modelo aceita campos que o usuario NAO deveria controlar? (role, isAdmin)
          SIM → Input DTO OBRIGATORIO (no minimo)
          NAO → Avaliar se a complexidade justifica
```

> **Referencia completa:** `references/dtos.md` — tabela input vs output, regras, anti-patterns, checklist.

---

## 4. Webhooks vs WebSockets vs SSE

### Decision Tree: Qual Padrao de Comunicacao?

```
Quem inicia a comunicacao?
  SERVIDOR EXTERNO (Stripe, GitHub) → Webhook
  SEU SISTEMA →
    Comunicacao precisa ser bidirecional?
      SIM → WebSocket
      NAO →
        Frequencia de eventos?
          ALTA (multiplas/segundo) → WebSocket
          MEDIA (a cada poucos segundos) → SSE
          BAIXA (esporadica) → Polling ou Webhook interno
```

**Resumo rapido:**

| Padrao | Direcao | Caso de uso tipico |
|--------|---------|--------------------|
| **Webhook** | Externo → Voce | Pagamento aprovado, deploy concluido |
| **WebSocket** | Bidirecional | Chat, jogos, dashboards tempo real |
| **SSE** | Servidor → Cliente | Notificacoes, feeds, progresso |

**Seguranca critica em Webhooks:** SEMPRE validar HMAC signature. Endpoint de webhook e PUBLICO — sem validacao, qualquer atacante simula eventos.

> **Referencia completa:** `references/communication-patterns.md` — seguranca detalhada, boas praticas, escalabilidade, checklists.

---

## 5. SQL vs NoSQL

### REGRA DE OURO

**Comecar com SQL (PostgreSQL).** Migrar para NoSQL apenas com problema comprovado que SQL nao resolve eficientemente.

Justificativa: SQL resolve 90%+ dos casos; PostgreSQL suporta JSON, full-text search, extensoes; migrar SQL→NoSQL e mais facil que o contrario; ACID e crucial.

### Decision Tree: Qual Banco Usar?

```
Dados sao relacionais com integridade referencial?
  SIM → SQL (PostgreSQL)
  NAO →
    Precisa de ACID / transacoes?
      SIM → SQL (PostgreSQL)
      NAO →
        Padrao de acesso principal?
          KEY-VALUE simples (cache, sessao) → Redis
          DOCUMENTOS com schema variavel → MongoDB/Firestore
          GRAFOS com traversal profundo → Neo4j
          ESCRITA MASSIVA + analise temporal → Cassandra/ClickHouse
          NAO TEM CERTEZA → SQL (PostgreSQL)
```

> **Referencia completa:** `references/database-selection.md` — comparativo detalhado, ACID vs BASE, polyglot persistence, anti-patterns, checklist.

---

## 6. Concorrencia em APIs

### Pergunta-Chave

> "O usuario PRECISA esperar por esta operacao para continuar?"

Se a resposta e NAO, mover para background.

### Decision Tree: Sincrono ou Background?

```
Usuario precisa do resultado para continuar?
  SIM →
    Operacoes sao independentes entre si?
      SIM → Promise.all (paralelo)
      NAO → Sequencial (await em serie)
  NAO →
    Multiplos consumers precisam reagir?
      SIM → PubSub / Event Queue
      NAO → Background Job simples
```

**Resumo de estrategias:**

| Estrategia | Quando usar |
|------------|-------------|
| **Background Job** | Operacao unica demorada (email, imagem) |
| **PubSub / Event Queue** | Multiplos consumers independentes |
| **Promise.all** | Operacoes independentes no mesmo request |
| **Streaming (SSE)** | Resultado progressivo ao cliente |

> **Referencia completa:** `references/api-concurrency.md` — exemplos praticos, identificacao de oportunidades, anti-patterns, checklist.

---

## 7. Protocolos de API

> Referencia completa: `references/api-protocols.md`

### Decision Tree

```
Request-response CRUD? → HTTP/REST ✓ (padrao)
Bidirecional real-time? → WebSockets
Garantia de entrega assincrona? → AMQP (RabbitMQ, SQS)
Server-to-server alta performance? → gRPC
Browser como cliente? → HTTP/REST ou WebSocket (NAO gRPC)
```

**Resumo:**

| Protocolo | Caso de uso | Formato |
|-----------|-------------|---------|
| HTTP/REST | CRUD, APIs publicas | JSON |
| WebSocket | Chat, jogos, dashboards | JSON/binario |
| AMQP | Filas, processamento assincrono | Qualquer |
| gRPC | Microservicos server-to-server | Protocol Buffers |

**Regra:** HTTP/REST + WebSocket cobre 90% dos casos. gRPC e AMQP para cenarios especificos com necessidade comprovada.

---

## 8. GraphQL Best Practices

> Referencia completa: `references/graphql-patterns.md`

**Quando usar GraphQL (e quando NAO):**

```
Multiplos clientes com necessidades diferentes? → GraphQL
Overfetching/underfetching comprovado? → GraphQL
CRUD simples sem relacoes complexas? → REST ✓
API publica para terceiros? → REST ✓
```

**Regras essenciais:**

- **Depth limits OBRIGATORIOS** — max 6-7 niveis. Sem limite, queries aninhadas derrubam o servidor
- **DataLoader para N+1** — resolvers GraphQL sao ESPECIALMENTE vulneraveis. Batch loading e obrigatorio
- **Input types para mutations** — agrupar parametros em input types, nao passar individuais
- **Error handling: campo `errors`, nao status code** — GraphQL sempre retorna 200. Monitorar campo `errors`
- **Schema modular** — dividir por dominio, nao monolito gigante
- **Query complexity analysis** — atribuir custo por field, rejeitar queries acima do limite

---

## 9. REST URL Design & Pagination

> Referencia completa: `references/rest-advanced.md`

### URL Design — Regras

1. **Nouns, nao verbs:** `GET /products` (nao `/getProducts`)
2. **Plural sempre:** `/products` (nao `/product`)
3. **Nested max 3 niveis:** `/users/:id/orders/:orderId/items`
4. **Versionamento no path:** `/api/v1/products`
5. **kebab-case:** `/order-items` (nao `/orderItems`)

### Pagination — Decision Tree

```
Dataset grande (>10K registros)? → Cursor pagination ✓
Precisa de "ir para pagina X"? → Offset/Page pagination
Dados mudam frequentemente? → Cursor pagination ✓
Caso simples? → Page pagination (intuitivo)
```

| Tipo | Exemplo | Pro | Contra |
|------|---------|-----|--------|
| Page | `?page=3&limit=10` | Intuitivo, "pagina X de Y" | Inconsistente com dados mutaveis |
| Offset | `?offset=20&limit=10` | Flexivel | Performance degrada em datasets grandes |
| Cursor | `?cursor=abc&limit=10` | Consistente, performante | Sem "ir para pagina X" |

**REGRA CRITICA:** SEMPRE paginar endpoints de colecao. NUNCA retornar todos os registros.

### Status Codes — Resumo

| Operacao | Status Code |
|----------|-------------|
| GET com dados | 200 OK |
| POST criou recurso | 201 Created |
| DELETE sem body | 204 No Content |
| Validacao falhou | 400 Bad Request |
| Nao autenticado | 401 Unauthorized |
| Sem permissao | 403 Forbidden |
| Nao encontrado | 404 Not Found |
| Rate limit | 429 Too Many Requests |

**NUNCA retornar 200 para tudo.** Status codes semanticos sao obrigatorios.

---

## Modo de Operacao

Ao receber uma pergunta ou pedido de analise:

1. **Identificar** qual(is) secao(oes) se aplica(m)
2. **Explicar** o conceito relevante usando linguagem acessivel
3. **Apresentar** o decision tree se houver escolha a fazer
4. **Consultar** a referencia detalhada quando necessario (`references/`)
5. **Apontar** anti-patterns especificos ao caso do desenvolvedor
6. **Fornecer** o checklist de verificacao aplicavel
7. **Sugerir** registrar decisoes com `/anti-vibe-coding:decision-registry add` se for decisao arquitetural

**NUNCA gerar codigo neste modo.** Apenas ensinar, analisar e recomendar.

Direcionar para implementacao:
- `/anti-vibe-coding:tdd-workflow` para iniciar implementacao
- `/anti-vibe-coding:consultant` para decisoes mais amplas

---

## Contexto da Consulta

$ARGUMENTS

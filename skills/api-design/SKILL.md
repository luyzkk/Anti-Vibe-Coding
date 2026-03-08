---
name: api-design
description: Consultor de API Design - N+1, Idempotencia, DTOs, Webhooks, WebSockets
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[API design question or endpoint to analyze]"
---

# API Design — Anti-Vibe Coding

Você está no modo **Consultor de API Design**. Neste modo, você ENSINA e ANALISA — não gera código.

Use este conhecimento para responder perguntas, auditar endpoints existentes e guiar decisões de design de APIs.

---

## 1. Problema N+1 (Identificacao e Solucao)

### Conceito

O problema N+1 ocorre quando uma query inicial busca uma lista de N itens, e para cada item uma query adicional é disparada para buscar dados relacionados. Resultado: 1 + N queries ao banco.

```
// ANTI-PATTERN: N+1
const orders = await db.orders.findAll()          // 1 query
for (const order of orders) {
  order.customer = await db.customers.find(order.customerId)  // N queries
}
// Total: 1 + N queries (100 orders = 101 queries)
```

### Quando acontece

- Lazy loading em loops (ORM carrega relacao sob demanda)
- Iteracao manual sobre resultados sem pre-carregar relacoes
- APIs REST que retornam IDs e forcam o client a buscar cada recurso

### Como resolver

| Estrategia | Exemplo | Quando usar |
|------------|---------|-------------|
| **Eager Loading** | `select_related`, `prefetch_related`, `with()`, `include` | Sempre que iterar sobre relacoes |
| **JOIN explicito** | `SELECT * FROM orders JOIN customers ON ...` | Quando precisa de dados de ambas tabelas |
| **Batch Loading** | DataLoader (GraphQL), `WHERE id IN (...)` | APIs GraphQL ou quando eager loading nao esta disponivel |
| **Subquery** | `WHERE customer_id IN (SELECT id FROM ...)` | Quando JOIN gera duplicatas indesejadas |

### Deteccao

- **Regra de ouro:** query dentro de loop = N+1
- Use profiler de queries (ex: `pg_stat_statements`, query logger do ORM)
- Monitore: se numero de queries cresce linearmente com dados, e N+1
- Escreva testes de performance que falham acima de X queries por endpoint

### Verificacao (Checklist)

- [ ] Nenhuma query e executada dentro de loops
- [ ] Relacoes necessarias sao carregadas via eager loading
- [ ] Profiler de queries ativo em desenvolvimento
- [ ] Testes validam numero maximo de queries por operacao

---

## 2. Idempotencia

### Conceito

Uma operacao e idempotente quando executa-la multiplas vezes produz o mesmo resultado que executa-la uma vez. Isso e critico para sistemas distribuidos onde retries sao inevitaveis.

### Verbos HTTP e Idempotencia

| Verbo | Idempotente por spec? | Na pratica |
|-------|----------------------|------------|
| **GET** | Sim | Sim (se bem implementado) |
| **PUT** | Sim | Sim (substituicao completa do recurso) |
| **DELETE** | Sim | Sim (deletar algo ja deletado = mesmo estado) |
| **POST** | NAO | Requer implementacao explicita |
| **PATCH** | Ambiguo | Depende: `set balance = 100` (sim) vs `increment balance + 10` (nao) |

**ALERTA:** NAO confie apenas na especificacao REST. Verifique a implementacao real. Um PUT que faz `UPDATE ... SET counter = counter + 1` NAO e idempotente, apesar de PUT ser "idempotente por spec".

### Implementacao para Operacoes Financeiras

Para qualquer operacao que envolva dinheiro, idempotencia e **OBRIGATORIA**.

**Estrategia 1 — Chave de Idempotencia (UUID)**
- Front-end gera UUID antes do request
- Back-end armazena no banco: `idempotency_key + resultado`
- Request duplicado retorna resultado armazenado sem re-executar

**Estrategia 2 — Chave Composta**
- Combinar: `valor + moeda + usuario + destino + tipo + janela_temporal`
- Util quando o front-end nao pode gerar UUID (webhooks, filas)

### Decision Tree: Preciso de Idempotencia?

```
Operacao envolve dinheiro?
  SIM → Idempotencia OBRIGATORIA (chave UUID ou composta)
  NAO →
    Operacao tem side-effects irreversiveis? (envio de email, SMS)
      SIM → Idempotencia RECOMENDADA
      NAO →
        Operacao e naturalmente idempotente? (GET, PUT, DELETE)
          SIM → Apenas valide a implementacao
          NAO → Avalie caso a caso (POST de criacao com unique constraint pode bastar)
```

### Anti-Patterns

- Confiar que "retry nao vai acontecer" (vai, especialmente com timeout de rede)
- Usar auto-increment ID como chave de idempotencia (ID so existe DEPOIS da criacao)
- Nao armazenar o resultado — apenas marcar como "ja processado" sem retornar a resposta original

### Verificacao (Checklist)

- [ ] Operacoes financeiras tem chave de idempotencia
- [ ] Chave e armazenada no banco com o resultado completo
- [ ] Requests duplicados retornam o resultado original (nao re-executam)
- [ ] TTL definido para limpeza de chaves antigas

---

## 3. DTOs (Data Transfer Objects)

### Conceito

DTOs sao objetos que definem EXATAMENTE quais dados entram e saem da API. Eles criam uma barreira de seguranca entre o mundo externo e o modelo de dominio.

### Input DTO vs Output DTO

| Aspecto | Input DTO (request) | Output DTO (response) |
|---------|--------------------|-----------------------|
| **ID** | NUNCA aceitar | Incluir (public ID, preferencialmente UUID) |
| **Campos sensíveis** | Rejeitar extras (`isAdmin`, `role`) | NUNCA expor (`password`, `tokens`, `internal_id`) |
| **Validacao** | SEMPRE no back-end | N/A (dados ja validados) |
| **Campos opcionais** | Explicitos com defaults | Incluir sempre (evitar `undefined`) |

### Regras Fundamentais

1. **Instanciar DTO ANTES de persistir** — nunca passe o body cru para o banco
2. **Rejeitar campos extras** — `{ name: "Jo", isAdmin: true }` deve ignorar ou rejeitar `isAdmin`
3. **Validacao SEMPRE no back-end** — front-end e UX, nao seguranca
4. **DTO != Modelo de Dominio** — DTO e contrato da API; modelo e regra de negocio
5. **Versionar DTOs se a API e publica** — `UserResponseV1`, `UserResponseV2`

### Anti-Patterns

- Expor modelo do banco diretamente na API (vaza `password_hash`, `internal_notes`, etc.)
- Aceitar qualquer campo do body sem whitelist (Mass Assignment)
- Validar apenas no front-end (bypass trivial via cURL/Postman)
- Usar o mesmo DTO para input e output (necessidades diferentes)

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
          NAO → Avalie se a complexidade justifica (projetos pequenos podem simplificar)
```

### Verificacao (Checklist)

- [ ] Nenhum modelo de banco e exposto diretamente na API
- [ ] Input DTOs rejeitam campos nao permitidos
- [ ] Output DTOs omitem dados sensiveis
- [ ] Validacao acontece no back-end (front-end e bonus)
- [ ] DTOs sao instanciados antes de qualquer persistencia

---

## 4. Webhooks vs WebSockets

### Webhooks (API Invertida)

O servidor externo chama VOCE quando um evento acontece.

**Quando usar:**
- Eventos assincronos e esporadicos (pagamento aprovado, email entregue, deploy concluido)
- Integracoes entre sistemas diferentes (Stripe, GitHub, Twilio)
- Quando voce nao controla o emissor do evento

**Seguranca — OBRIGATORIO:**
- SEMPRE validar HMAC signature do header (ex: `X-Webhook-Signature`)
- Endpoint de webhook e PUBLICO — qualquer pessoa pode enviar POST para ele
- Sem validacao de signature = qualquer atacante pode simular eventos

**Boas praticas:**
- Responda 200 RAPIDO (< 5s). Processe em background
- Implemente retry logic (o emissor vai reenviar se nao receber 2xx)
- Idempotencia no handler (o mesmo evento PODE chegar mais de uma vez)
- Logue TUDO (payload completo + headers) para debug

### WebSockets (Conexao Bidirecional Persistente)

Conexao que permanece aberta para comunicacao em tempo real nos dois sentidos.

**Quando usar:**
- Tempo real: chat, jogos multiplayer, dashboards ao vivo
- Frequencia alta de mensagens (multiplas por segundo)
- Comunicacao bidirecional necessaria

**Limitacoes:**
- NAO escala facilmente: 10.000 clientes = 10.000 conexoes persistentes no servidor
- Complexidade operacional: load balancers, sticky sessions, reconexao
- Overhead de infraestrutura significativo

### SSE (Server-Sent Events) — Alternativa

**Quando usar em vez de WebSockets:**
- Streaming unidirecional (servidor → cliente)
- Notificacoes, feeds de atividade, progresso de tarefas
- Mais simples que WebSockets, usa HTTP padrao, reconexao automatica

### Decision Tree: Webhook, WebSocket ou SSE?

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

### Anti-Patterns

- Webhook sem validacao de signature (vulnerabilidade critica)
- WebSocket para notificacoes simples (SSE resolve com menos complexidade)
- Processar webhook de forma sincrona e demorada (timeout do emissor)
- Assumir que WebSocket "simplesmente escala" (nao escala sem infraestrutura dedicada)

### Verificacao (Checklist)

**Webhooks:**
- [ ] HMAC signature e validada em TODOS os endpoints de webhook
- [ ] Handler responde 200 rapidamente e processa em background
- [ ] Handler e idempotente (mesmo evento 2x = mesmo resultado)
- [ ] Payloads sao logados para debug

**WebSockets:**
- [ ] Plano de escalabilidade definido (quantas conexoes simultaneas?)
- [ ] Reconexao automatica implementada no cliente
- [ ] Heartbeat/ping-pong para detectar conexoes mortas
- [ ] Avaliou se SSE nao resolve o caso de uso

---

## 5. SQL vs NoSQL (Decisao por Caso de Uso)

### Conceito

NAO existe "melhor banco de dados". Existe o banco certo para o problema certo. A decisao deve ser baseada em caracteristicas dos dados e padroes de acesso, nao em hype.

### Comparativo

| Tipo | Exemplos | Forca | Fraqueza | Caso de uso ideal |
|------|----------|-------|----------|-------------------|
| **SQL Relacional** | PostgreSQL, MySQL | ACID, JOINs, queries flexiveis | Schema rigido, escala horizontal complexa | Dados relacionais, financeiro, transacional |
| **NoSQL Key-Value** | Redis, DynamoDB | Performance extrema, simplicidade | Sem queries complexas | Cache, sessoes, rate limiting |
| **NoSQL Document** | MongoDB, Firestore | Schema flexivel, desenvolvimento rapido | JOINs limitados, consistencia eventual | CMS, catalogo de produtos, configs |
| **NoSQL Graph** | Neo4j, ArangoDB | Relacoes complexas, traversal eficiente | Nicho, curva de aprendizado | Redes sociais, recomendacoes, fraude |
| **NoSQL Columnar** | Cassandra, ClickHouse | Escrita massiva, analise de series temporais | Queries ad-hoc limitadas | Logs, metricas, IoT, analytics |

### REGRA DE OURO

**Comece com SQL (PostgreSQL).** Migre para NoSQL apenas quando tiver um problema comprovado que SQL nao resolve eficientemente.

Justificativa:
- SQL resolve 90%+ dos casos de uso
- PostgreSQL suporta JSON, full-text search, e extensoes (praticamente um "multi-modelo")
- Migrar de SQL para NoSQL e mais facil que o contrario
- ACID e crucial — voce nao quer descobrir que precisa de transacoes DEPOIS

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

### Anti-Patterns

- Escolher NoSQL porque "e mais moderno" ou "escala melhor" (sem problema concreto)
- Usar MongoDB para dados altamente relacionais (vai reinventar JOINs no codigo)
- Usar SQL para cache de alta performance (Redis existe para isso)
- Misturar 5 bancos diferentes em um projeto pequeno (complexidade operacional)

### Verificacao (Checklist)

- [ ] Escolha de banco justificada por caso de uso, nao por preferencia
- [ ] Se NoSQL, documentado por que SQL nao atendia
- [ ] Se SQL, indices criados para queries frequentes
- [ ] Estrategia de backup e recovery definida

---

## 6. Concorrencia em APIs

### Conceito

Nem toda operacao precisa ser sincrona. Repensar a sequencia de execucao e uma das formas mais eficazes de melhorar performance e experiencia do usuario.

### Pergunta-Chave

> "O usuario PRECISA esperar por esta operacao para continuar?"

Se a resposta e NAO, a operacao deve ir para background.

### Exemplo Pratico

```
// ANTI-PATTERN: Tudo sincrono
POST /upload-avatar
  1. Recebe imagem           (sincrono - necessario)
  2. Valida formato           (sincrono - necessario)
  3. Comprime imagem          (sincrono - DESNECESSARIO)
  4. Gera thumbnails          (sincrono - DESNECESSARIO)
  5. Upload para CDN          (sincrono - DESNECESSARIO)
  6. Atualiza banco           (sincrono - DESNECESSARIO)
  7. Invalida cache           (sincrono - DESNECESSARIO)
  → Responde ao usuario       (5-10 segundos depois)

// PATTERN CORRETO: Sincrono + Background
POST /upload-avatar
  1. Recebe imagem           (sincrono)
  2. Valida formato           (sincrono)
  3. Salva original no storage temporario (sincrono)
  → Responde ao usuario 202 Accepted (< 500ms)

  [Background Job - em paralelo]
  4. Comprime imagem
  5. Gera thumbnails
  6. Upload para CDN
  7. Atualiza banco
  8. Invalida cache
  9. Notifica cliente via WebSocket/SSE (opcional)
```

### Estrategias de Concorrencia

| Estrategia | Quando usar | Exemplo |
|------------|-------------|---------|
| **Background Job** | Operacao unica demorada | Envio de email, processamento de imagem |
| **PubSub / Event Queue** | Multiplos consumers independentes | Pedido criado → [notificar, atualizar estoque, gerar nota] |
| **Promise.all** | Operacoes independentes no mesmo request | Buscar usuario + buscar config + buscar permissoes |
| **Streaming (SSE)** | Resultado progressivo | Progresso de upload, resultados de busca |

### Identificando Oportunidades

Pergunte para cada etapa de um endpoint:
1. O usuario precisa do resultado AGORA?
2. Esta etapa depende do resultado da anterior?
3. Falha nesta etapa invalida toda a operacao?

Se respondeu NAO para qualquer pergunta, a etapa pode ser paralelizada ou movida para background.

### Anti-Patterns

- Processar tudo de forma sincrona "por simplicidade" (usuario espera desnecessariamente)
- Mover TUDO para background sem feedback (usuario nao sabe se funcionou)
- `await` sequencial para operacoes independentes (use `Promise.all`)
- Background jobs sem retry e dead-letter queue (falhas silenciosas)

### Verificacao (Checklist)

- [ ] Endpoints com >1s de resposta foram analisados para oportunidades de background
- [ ] Operacoes independentes usam execucao paralela (`Promise.all` ou equivalente)
- [ ] Background jobs tem retry com backoff exponencial
- [ ] Dead-letter queue configurada para jobs que falharam apos retries
- [ ] Usuario recebe feedback adequado (202 + status endpoint, ou notificacao)

---

## Modo de Operacao

Ao receber uma pergunta ou pedido de analise:

1. **Identifique** qual(is) secao(oes) acima se aplica(m)
2. **Explique** o conceito relevante usando linguagem acessivel
3. **Apresente** o decision tree se houver escolha a fazer
4. **Aponte** anti-patterns especificos ao caso do desenvolvedor
5. **Forneca** o checklist de verificacao aplicavel
6. **Sugira** registrar decisoes com `/anti-vibe-coding:decision-registry add` se for decisao arquitetural

**NUNCA gere codigo neste modo.** Apenas ensine, analise e recomende.

Se o desenvolvedor quiser implementar apos a consultoria, direcione para:
- `/anti-vibe-coding:tdd-workflow` para iniciar implementacao
- `/anti-vibe-coding:consultant` para decisoes mais amplas

---

## Contexto da Consulta

$ARGUMENTS

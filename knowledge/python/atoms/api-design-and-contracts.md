---
topic: api-design-and-contracts
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report3.md
  - Infos/knowledge/Python/deep-research-report2.md
tier: 2
triggers: [api design, REST, versionamento, contrato, paginação, cursor, offset, idempotency, RFC 9457, problem details, ETag, If-Match, OpenAPI, operationId, webhook, assinatura, 202, LRO, JWT, rate limiting, SlowAPI, response_model, include_router]
related_skills: [/api-design, /security]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Design de API e Contratos

## Quando consultar

- Ao desenhar rotas REST novas ou decidir se uma operação deveria ser um método customizado em vez de forçar CRUD
- Ao mudar um response model — adicionar/remover campo, mudar tipo — ou decidir se isso cabe na mesma versão da API
- Ao expor paginação, filtros, sort ou seleção parcial de campos num endpoint de listagem
- Ao implementar um POST que o cliente pode reenviar (retry automático, timeout, double-click)
- Ao escolher o status HTTP de uma resposta ou desenhar o envelope de erro da API
- Ao permitir edição concorrente de um recurso por múltiplos clientes (`PUT`/`PATCH`)
- Ao estabilizar OpenAPI/`operationId` para geração de SDK, ou decidir entre schema-first e code-first
- Ao receber ou produzir webhooks, ou implementar uma operação que não termina dentro do ciclo HTTP normal
- Ao declarar autenticação, validar JWT ou aplicar rate limiting numa API pública

## Padrões sênior

### Pattern: REST resource-oriented design com `APIRouter`

- **Problema:** handlers viram uma coleção de verbos RPC disfarçados (`/createOrder`, `/getOrder`), acoplando a URI a detalhes de implementação e dificultando aplicar prefixo/tags/dependencies de forma coerente.
- **Padrão:** modele rotas por recursos (`/v1/orders/{order_id}`) e componha a API com `APIRouter`; IDs e relações ficam estáveis enquanto a implementação interna muda.
- **Quando usar:** toda rota que representa um recurso do domínio — CRUD ou operação que mapeia para um recurso identificável.
- **Quando NÃO usar:** operações que não são CRUD legítimo podem ser métodos customizados explícitos — convenção de design, não exigência do FastAPI ou do HTTP; não force toda operação a parecer CRUD.

### Pattern: Routing no nível certo, sem mexer em `router.routes`

- **Problema:** desde FastAPI 0.137.0, `include_router()` preserva a árvore de routers em vez de clonar tudo para uma lista plana — código que itera/muta `router.routes` diretamente pode deixar de encontrar rotas ou encontrar objetos de outro tipo; repetir `Depends`, tags ou prefixo endpoint por endpoint diverge quando alguém esquece de replicar.
- **Padrão:** defina comportamento transversal (auth, tags, prefixo) no nível do `APIRouter` ou da aplicação, não repetido por operação; para introspecção avançada pós-0.137.2, use `iter_route_contexts()` em vez de percorrer `router.routes`.
- **Quando usar:** agrupar rotas que compartilham a mesma dependency/tag/prefixo sob um `APIRouter` — essa é também a fonte usada para montar o OpenAPI.
- **Quando NÃO usar:** não eleve uma dependency para o nível do router quando só parte das rotas precisa dela; e não construa routing por header/versionamento apoiado em `.matches()`/`.handle()` customizados de `APIRouter` — são recurso alpha (0.137.0), não documentado oficialmente e potencialmente breaking.

### Pattern: `response_model`/return type como contrato de saída

- **Problema:** handler retornando `dict` arbitrário, objeto ORM ou `Any` deixa qualquer campo interno futuro (senha, flag, score) vazar como parte do contrato público por acidente.
- **Padrão:** declare `response_model` ou um return type Pydantic explícito em todo endpoint contratual — FastAPI usa esse modelo para validar a saída, gerar o JSON Schema/OpenAPI e filtrar campos que não pertencem ao contrato; desde FastAPI 0.130.0 essa serialização roda no caminho rápido Pydantic/Rust, reduzindo a justificativa histórica de contornar o response model por performance.
- **Quando usar:** todo endpoint que retorna dado vindo de model interno, ORM ou fonte que pode ganhar campos novos no futuro.
- **Quando NÃO usar sem compensar:** `response_model=None` é apropriado para arquivos, streams, SSE, redirects e respostas com media type especial — documente a resposta explicitamente no OpenAPI, porque remover o modelo também remove validação/filtragem daquele contrato.

### Pattern: Versionamento e depreciação

- **Problema:** renomear/remover campo, mudar tipo, tornar opcional obrigatório ou trocar unidade dentro da mesma versão quebra clientes; apagar um endpoint legado sem aviso surpreende integrações em produção.
- **Padrão:** evolua a mesma versão de forma aditiva (campo novo opcional, default seguro); abra uma nova versão (ex.: `/v1` e `/v2` com prefixos distintos via `include_router`) só quando a mudança é semanticamente incompatível e não pode coexistir; para depreciar contrato público, sinalize no runtime com os headers `Deprecation` (RFC 9745) e `Sunset` (RFC 8594) antes de remover.
- **Quando usar nova versão:** rename equivale semanticamente a remove+add (AIP-180) — trate sempre como breaking, mesmo quando parece cosmético.
- **Quando NÃO usar:** o local da versão (path vs header vs media-type) é contestado entre guidelines — preserve a estratégia já estabelecida no projeto em vez de migrar por preferência estilística.

### Pattern: Compatibilidade comportamental além do diff de schema

- **Problema:** "só adicionei um campo" ou "o diff do OpenAPI mostra só ADD" não garante que a mudança é segura para clientes existentes.
- **Padrão:** teste também mudanças comportamentais, não só diff de schema — adicionar paginação depois quebra clientes que esperavam a coleção inteira (AIP-158); adicionar um valor de enum pode quebrar `switch`/`else` que presumem enum fechado (AIP-216); renomear ou mover definições pode quebrar imports de SDKs gerados (AIP-180).
- **Quando usar:** antes de qualquer mudança "aditiva" em contrato com consumidores externos — audite SDKs gerados, exhaustive switches e o comportamento diante de valores desconhecidos.
- **Quando NÃO usar como bloqueio absoluto:** um ecossistema controlado pode coordenar migrações que uma API pública não pode — a política de compatibilidade depende dos clientes suportados.

### Pattern: Paginação — cursor/keyset vs offset

- **Problema:** introduzir paginação depois que clientes já esperam "a coleção inteira" é mudança comportamental incompatível; paginar por offset em coleções grandes/mutáveis pode gerar páginas inconsistentes sob inserts/deletes e ficar caro em offsets elevados.
- **Padrão:** pagine coleções desde o primeiro contrato público; use cursor/keyset com desempate único na ordenação (ex.: `created_at` mais `id`), tratando o token como opaco para o consumidor.
- **Quando usar offset:** backoffices pequenos, resultados estáticos, UIs que realmente precisam de "página N".
- **Quando NÃO usar offset:** coleções grandes ou mutáveis — cursor/keyset é mais adequado; bibliotecas como `fastapi-pagination` cobrem Page, LimitOffset e Cursor, mas paginação em memória ainda carrega a coleção inteira, então integrações de banco devem paginar na própria query.

### Pattern: Filtros, sort e sparse fieldsets como schema validado

- **Problema:** encaminhar nomes arbitrários enviados pelo cliente direto ao ORM aceita parâmetros desconhecidos silenciosamente e acopla nomes públicos a colunas internas; seleção parcial de campos sem validação vira acesso arbitrário ao modelo de banco.
- **Padrão:** modele filtros e ordenação como Pydantic model validado proibindo campos extra desconhecidos (query parameter models, FastAPI >= 0.115.0); trate sparse fieldsets como parte estável e documentada do contrato, não como projeção livre.
- **Quando usar:** qualquer listagem com filtro, sort ou fieldset exposto a cliente externo.
- **Quando NÃO usar sintaxe própria sem necessidade:** se a API declara conformidade JSON:API, siga as convenções JSON:API de sort, filtro e sparse fieldsets em vez de uma variante quase compatível — só colocar a resposta dentro de `data` não equivale a implementar JSON:API.

### Pattern: Idempotência em POST — claim atômico

- **Problema:** em POST com efeito externo (cobrança, criação de pedido, provisionamento) que o cliente pode repetir após timeout, ler-depois-gravar cria uma janela de corrida entre requisições concorrentes.
- **Padrão:** aceite uma chave de idempotência, vincule-a a principal, operação e fingerprint do corpo da requisição, e faça o claim atomicamente (ex.: `SET` com `NX` no Redis) antes de executar o efeito; rejeite reutilização da mesma chave com parâmetros incompatíveis.
- **Quando usar:** POSTs onde duplicação causa efeito material — cobrança, criação de pedido, provisionamento, qualquer fluxo com retry automático.
- **Quando NÃO usar como regra rígida de TTL/status:** não existe RFC final para `Idempotency-Key` (o Internet-Draft expirou em abril de 2026) nem status/TTL universal para uma segunda requisição chegar enquanto a primeira está pendente — isso é contrato local; não copie políticas específicas de um provedor como padrão universal.

### Pattern: Status HTTP — codifique o estado protocolar real

- **Problema:** retornar `200` com um envelope de erro próprio, ou usar `403` para ausência de autenticação, esconde o estado real atrás de uma convenção interna e quebra expectativas de clientes/infra que leem o status HTTP.
- **Padrão:** use o status HTTP para o estado protocolar real — `201` para criado, `202` para aceito para processamento posterior, `204` para sucesso sem corpo, `409` para conflito, `422` para conteúdo semanticamente inválido; desde FastAPI 0.122.0 as security utilities retornam `401` com `WWW-Authenticate` quando a credencial está ausente, no lugar do antigo `403` legado.
- **Quando usar `409` vs `422`:** `409` quando o request conflita com o estado atual do recurso; `422` quando o conteúdo é compreendido mas semanticamente inválido — FastAPI usa `422` para erros de request validation, mas isso não resolve todo caso de negócio; mantenha a escolha estável por categoria de erro.
- **Quando NÃO usar:** não retorne `200` com um envelope de erro customizado nem reutilize `403` para credencial ausente — código/teste que cristalizou o `403` antigo precisa migrar.

### Pattern: Erros — envelope RFC 9457 único

- **Problema:** múltiplos formatos de erro por endpoint (`{"message": ...}`, `{"error": {"code": ...}}`, `HTTPException` cru) obrigam cada SDK a ter um parser próprio.
- **Padrão:** exponha um envelope RFC 9457 único — `application/problem+json` com `type`, `title`, `status`, `detail`, `instance` e extensões próprias — para erros HTTP da API, e adapte `RequestValidationError` ao mesmo formato via exception handler customizado do FastAPI. RFC 9457 substituiu a RFC 7807, hoje obsoleta.
- **Quando usar:** todo `HTTPException` e toda validação de request devem passar pelo mesmo formato de envelope.
- **Quando NÃO usar `detail` como chave programática:** RFC 9457 não define catálogo de códigos de negócio — isso é responsabilidade da API; não torne o texto humano de `detail` a única chave que o consumidor usa para decidir comportamento, porque mensagens podem mudar ou ser localizadas.

### Pattern: Concorrência otimista — `ETag`/`If-Match`

- **Problema:** em recursos mutáveis por múltiplos clientes (`PUT`/`PATCH`), aceitar a gravação sem checar a versão lida permite lost update — a última escrita vence silenciosamente.
- **Padrão:** use validators HTTP — `ETag` na leitura, `If-Match` na escrita — para que o servidor responda `412 Precondition Failed` quando a representação mudou desde a leitura do cliente.
- **Quando usar:** recursos mutáveis por múltiplos clientes, onde perder uma atualização concorrente é inaceitável.
- **Quando NÃO usar:** recursos append-only, ou quando last-write-wins é conscientemente parte da semântica do recurso.

### Pattern: Auth como dependency de segurança

- **Problema:** ler `Authorization`/`X-API-Key` manualmente em cada handler duplica a regra de auth e pode divergir do que o OpenAPI documenta — a documentação declara uma proteção e a rota executa outra.
- **Padrão:** declare autenticação como dependency de segurança do FastAPI (`Security`/`Depends` com `APIKeyHeader`, `OAuth2PasswordBearer` etc.) para que execução e a descrição OpenAPI (Security Scheme/Requirement) compartilhem a mesma definição.
- **Quando usar:** toda rota protegida — extraia a credencial de uma dependency, nunca de leitura ad hoc de header dentro do handler.
- **Quando NÃO usar como prova de origem:** proxies/API gateways podem autenticar antes do FastAPI, mas o trust boundary entre gateway e aplicação deve ficar explícito — a existência de um header não prova por si só que ele veio do gateway.

### Pattern: JWT — validação completa, não apenas decode

- **Problema:** tratar "decode" como sinônimo de autenticação, ou derivar a lista de algoritmos aceitos do próprio `alg` presente no token, abre espaço para um JWT forjado ser aceito como válido.
- **Padrão:** ao aceitar JWT, valide assinatura, algoritmo esperado — fixo pela aplicação, nunca lido do token —, issuer, audience e claims temporais exigidos; `jwt.decode` do PyJWT aceita `algorithms`, `audience` e `issuer`, além de exigir claims obrigatórias, conforme RFC 8725.
- **Quando usar:** qualquer aceitação de JWT como prova de identidade.
- **Quando NÃO usar JWT ou fluxo antigo:** nem todo API token precisa ser JWT — tokens opacos simplificam revogação centralizada; para novas integrações OAuth2, aplique o Security BCP atual (RFC 9700) em vez de copiar fluxos de tutoriais baseados na RFC 6749 antiga.

### Pattern: Webhooks — assinatura sobre bytes crus e dedupe

- **Problema:** assinar/validar um JSON reserializado pode gerar bytes diferentes dos assinados pelo provedor (whitespace, ordering); processar um evento sem checar se já foi entregue antes duplica efeitos, porque provedores fazem retry e eventos duplicados podem chegar.
- **Padrão:** verifique a assinatura HMAC sobre o corpo bruto da requisição antes de qualquer parsing, comparando o MAC em tempo constante; depois deduplique por event/delivery ID antes de aplicar o efeito.
- **Quando usar:** todo endpoint de webhook que recebe eventos de terceiros com segredo compartilhado; documente também o formato de webhooks que sua própria API produz via OpenAPI em vez de deixá-los só em prose.
- **Quando NÃO usar um esquema HMAC improvisado:** implemente exatamente a canonicalização/esquema de assinatura do fornecedor — cada provedor define o seu; não invente um formato incompatível quando o protocolo já especifica a assinatura.

### Pattern: LRO e processamento assíncrono fora do ciclo HTTP

- **Problema:** manter a conexão HTTP aberta por uma operação de minutos não cabe no lifecycle HTTP normal; tratar `BackgroundTasks` como um broker de mensagens ignora que ele roda no mesmo processo, após a resposta — se o processo cai, o trabalho pendente se perde.
- **Padrão:** quando a operação não pode terminar dentro do ciclo HTTP, responda `202 Accepted` e crie um recurso de operação consultável, com `status` e resultado/erro; reserve `BackgroundTasks` para side-effects curtos e não-críticos cuja perda é tolerável, e use fila dedicada para trabalho pesado ou distribuído entre processos/servidores.
- **Quando usar:** exportação, provisioning, batch import, ou um webhook que dispara chamadas externas lentas — responda rápido após persistir/aceitar a entrega.
- **Quando NÃO usar polling como único caminho:** operações curtas continuam síncronas e polling não é obrigatório quando callback/webhook é mais adequado — uma API pode suportar ambos; o schema da operação também é contrato público, então trocar o tipo do resultado ou o significado dos estados é breaking change.

### Pattern: OpenAPI — `operationId` estável como contrato de SDK

- **Problema:** FastAPI gera `operationId` a partir de detalhes da operação por default; renomear uma função/rota pode mudar o `operationId` mesmo sem alterar URI ou método HTTP, e geradores de SDK usam esse ID para nomear métodos — uma mudança cosmética no Python vira rename de método no SDK.
- **Padrão:** estabilize `operationId` (`operation_id` explícito ou uma função própria de geração de ID) em operações consumidas por SDK gerado; trate o OpenAPI gerado como artefato versionado e rode um diff contra um baseline congelado em CI; gere SDKs somente de uma versão congelada do OpenAPI, não do que a produção retorna no momento do build.
- **Quando usar:** qualquer API com SDK gerado ou consumidores independentes do time — inclusive projetos internos, como detecção precoce de regressão de contrato via snapshot/diff.
- **Quando NÃO usar:** projetos internos sem SDK nem consumidores independentes podem aceitar IDs automáticos, mas o diff do OpenAPI ainda ajuda a pegar regressões cedo.

### Pattern: Schema-first vs code-first — ownership do contrato

- **Problema:** gerar um OpenAPI a partir do código sem compará-lo com um contrato normativo já publicado por outro time cria duas fontes de verdade.
- **Padrão:** use code-first — o default ergonômico do FastAPI, em que types, decorators e Pydantic geram o OpenAPI — quando o próprio serviço é dono do contrato; quando outro time ou especificação externa governa o contrato, faça o OpenAPI externo vencer o código, com CI de compatibilidade validando a implementação antes de gerar SDKs.
- **Quando usar code-first:** serviço único, dono do próprio contrato, sem múltiplas linguagens ou times competindo pela definição.
- **Quando NÃO usar code-first:** contrato publicado antes da implementação, múltiplas linguagens, API governance central ou OpenAPI entregue por um parceiro — não há orientação oficial do FastAPI dizendo que um dos dois é superior; é decisão de ownership, não de framework.

### Pattern: Rate limiting — storage compartilhado e `429`

- **Problema:** um contador em memória por processo cria limites diferentes por worker/réplica — cada instância aplica sua própria janela em vez de um limite único e compartilhado.
- **Padrão:** aplique limites em storage compartilhado (ex.: Redis) quando houver múltiplas instâncias, com uma estratégia como fixed window, moving window ou sliding-window counter; retorne `429 Too Many Requests` e informe `Retry-After` para orientar quando o cliente pode tentar de novo.
- **Quando usar:** qualquer API com múltiplos workers/réplicas e necessidade de limite efetivo global.
- **Quando NÃO usar SlowAPI sem avaliar risco:** o próprio projeto se descreve como alpha-quality — aceite esse risco explicitamente antes de tratá-lo como primitive estável; os headers `RateLimit`/`RateLimit-Policy` ainda são Internet-Draft, diferente de `429`/`Retry-After`, que já têm base em RFC.

## Anti-padrões

### `ORJSONResponse` como otimização automática

- **Sintoma:** configurar `ORJSONResponse`/`UJSONResponse` ou serializar manualmente presumindo que essa é a forma rápida de responder JSON no FastAPI.
- **Correção:** desde FastAPI 0.130.0 os response models Pydantic serializam pelo caminho rápido Pydantic/Rust — as release notes reportam 2x ou mais de ganho nesse caminho — e 0.131.0 depreciou `ORJSONResponse` e `UJSONResponse`; deixe o response model serializar.

### Documentação automática tratada como suficiente

- **Sintoma:** endpoint com `summary`/`description` vazios, contrato "autogerado" que não explica retry policy, consistência eventual, lifecycle de idempotency key ou SLA de webhook.
- **Correção:** o schema OpenAPI não infere essas semânticas — use `summary`, `description`, `responses` e examples para tornar workflows explícitos; a prosa deve explicar semântica, não reescrever tipos que o schema já descreve.

### JSON:API meia-boca

- **Sintoma:** colocar a resposta dentro de um envelope `data` e chamar isso de "JSON:API", sem seguir relacionamentos, formato de erros, paginação e sparse fieldsets da especificação.
- **Correção:** adote JSON:API inteiro — media type próprio e convenções completas de documento — ou não anuncie conformidade; JSON simples mais OpenAPI é uma superfície menor e igualmente válida.

### Strict mode ausente onde a coerção mascara um cliente quebrado

- **Sintoma:** um campo como `retries: int` aceita silenciosamente uma string numérica coagida num protocolo onde o valor deveria chegar como inteiro real — Pydantic v2 é lax por default.
- **Correção:** ative strict mode no model ou no field quando uma coerção silenciosa mudaria o significado do contrato; APIs voltadas a forms/query strings/integração legada frequentemente querem a coerção, então avalie o protocolo antes de aplicar strict globalmente.

### Schema OpenAPI customizado reconstruído a cada chamada

- **Sintoma:** sobrescrever `app.openapi` gerando o schema do zero toda vez que a rota de documentação é acessada.
- **Correção:** gere o schema uma vez e armazene-o em `app.openapi_schema` na primeira chamada, reutilizando o resultado nas seguintes — schema genuinamente variável por tenant exige outra arquitetura, não isso.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Recurso criado | `201 Created` |
| Aceito para execução assíncrona (LRO) | `202 Accepted` |
| Credencial ausente ou inválida | `401 Unauthorized` + `WWW-Authenticate` |
| Autenticado mas sem permissão | `403 Forbidden` |
| Conflito com o estado atual do recurso | `409 Conflict` |
| Precondição `If-Match` falhou | `412 Precondition Failed` |
| Conteúdo compreendido mas semanticamente inválido | `422 Unprocessable Content` |
| Limite de requisições excedido | `429 Too Many Requests` + `Retry-After` |
| Contrato exige substituir toda a representação | `PUT` |
| Recurso evolutivo, update parcial esperado | `PATCH` |
| Coleção grande ou mutável | Paginação cursor/keyset |
| Backoffice pequeno, resultado estático | Paginação offset |
| Contrato negociado externamente ou multi-linguagem | Schema-first — OpenAPI externo vence o código em CI |
| Serviço único, dono do próprio contrato | Code-first — default do FastAPI |
| Streaming (SSE/WebSocket) ou fila vs `BackgroundTasks` | Ver átomo `async-and-concurrency` |

## Referências externas

- Skill: `/api-design` — contratos REST, paginação e versionamento cross-stack
- Skill: `/security` — validação de JWT, HMAC e auth como dependency
- Átomo relacionado: `async-and-concurrency` — streaming (SSE/WebSockets), `BackgroundTasks` vs filas duráveis, `TaskGroup` (conteúdo não duplicado neste átomo)
- Átomo relacionado: `security-fastapi-owasp` — hardening OWASP de JWT/auth, a partir de uma fonte distinta
- Source paths (audit trail):
  - Infos/knowledge/Python/deep-research-report3.md
  - Infos/knowledge/Python/deep-research-report2.md

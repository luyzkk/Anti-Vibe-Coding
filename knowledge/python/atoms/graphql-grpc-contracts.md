---
topic: graphql-grpc-contracts
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report3.md
tier: 3
triggers: [GraphQL, Strawberry, GraphQLRouter, resolver, DataLoader, N+1, schema evolution, cursor pagination, connection, gRPC, Protobuf, protobuf, field number, reserved, deadline, cancelamento, tRPC, RPC, contrato]
related_skills: [/api-design, /architecture]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# GraphQL e RPC

## Quando consultar

- Ao expor GraphQL num backend FastAPI e decidir entre Strawberry, parsing manual ou outra lib
- Ao escrever resolvers que acessam associações em nested fields (risco de N+1)
- Ao evoluir um schema GraphQL já publicado — rename de campo, mudança de nullability, remoção de enum/argument
- Ao expor uma relação GraphQL que pode crescer sem limite
- Ao decidir onde colocar uma checagem de autorização de negócio dentro de um resolver
- Ao escolher entre REST, GraphQL e gRPC para um novo serviço, ou entre compartilhar domínio e traduzir handlers entre protocolos
- Ao configurar ou revisar deadlines e cancelamento em chamadas gRPC service-to-service
- Ao adicionar, remover ou renomear um field number numa mensagem Protobuf já distribuída
- Ao avaliar se tRPC faz sentido na borda de um backend Python

## Padrões sênior

### Pattern: GraphQL tipado com Strawberry + `GraphQLRouter`

- **Problema:** implementar parsing/execução GraphQL manual sobre um `POST` cru (parser, auth e execution caseiros) duplica trabalho que a lib já resolve e não se integra ao dependency system do FastAPI.
- **Padrão:** monte um `GraphQLRouter` (Strawberry) e compartilhe dependências/contexto via `context_getter`, que se integra ao dependency system do FastAPI; a própria documentação FastAPI aponta Strawberry como biblioteca alinhada ao seu sistema de type annotations.
- **Quando usar:** exposição de GraphQL tipado em FastAPI — a documentação Strawberry consultada estava na linha `0.324.0`; fixe a versão porque a lib evolui rapidamente.
- **Quando NÃO usar:** quando cache HTTP, recursos simples ou interoperabilidade com tooling HTTP for prioridade, REST continua melhor; FastAPI não obriga Strawberry, outras bibliotecas GraphQL são válidas.

### Pattern: DataLoader por-requisição para resolver N+1

- **Problema:** resolver acessando o banco dentro de um loop de nested fields gera N chamadas.
- **Padrão:** coloque DataLoaders no contexto da requisição (via `context_getter`) e faça batch por entidade; Strawberry fornece seu próprio DataLoader assíncrono.
- **Quando usar:** todo campo aninhado resolvido individualmente que dependeria de uma query por item.
- **Quando NÃO usar:** se o ORM já prefetch/join-loads exatamente a árvore necessária, um DataLoader adicional pode ser redundante.
- **Regra crítica:** o cache do DataLoader é per-request memoization, nunca um cache global entre usuários — reutilizar um loader entre requisições pode misturar dados entre principals e produzir resultado stale ou exposição entre contextos.

### Pattern: Evolução de schema GraphQL sem versionar o endpoint

- **Problema:** renomear campo, mudar nullability ou remover enum/argument quebra queries existentes que os referenciam.
- **Padrão:** não versione o endpoint GraphQL por padrão — evolua o schema de forma aditiva e deprecie campos (`deprecation_reason`) antes de removê-los; adicionar um campo opcionalmente consumível não modifica queries existentes.
- **Quando usar:** toda mudança num schema já publicado com consumidores.
- **Quando NÃO usar evolução no mesmo schema:** uma ruptura semântica ampla, impossível de coexistir no mesmo schema, pode justificar um novo endpoint ou serviço — mas isso não é o default.

### Pattern: Paginação por conexão/cursor em relações grandes

- **Problema:** devolver uma lista sem limite superior numa relação potencialmente grande.
- **Padrão:** exponha paginação baseada em conexão/cursor — `edges`, `node`, `cursor` e `pageInfo` com `hasNextPage`/`endCursor` — permitindo paginação estável sem amarrar o cliente a offsets físicos.
- **Quando usar:** relações potencialmente grandes.
- **Quando NÃO usar:** listas intrinsicamente pequenas e limitadas pelo domínio não precisam do envelope de connection.

### Pattern: Autorização de negócio fora do resolver

- **Problema:** concentrar toda checagem de ACL apenas no resolver GraphQL deixa a mesma operação, quando executada por REST, job ou gRPC, sem a regra que só existia ali.
- **Padrão:** use contexto/dependencies para identificar o principal, mas aplique a autorização de negócio na camada que conhece o recurso (business logic), não espalhada em decorators de resolver.
- **Quando usar:** toda regra de autorização que depende do recurso/domínio, não só do transporte.
- **Quando NÃO usar (fica na borda):** autorização puramente transport-level — "este token pode usar GraphQL?" — pertence naturalmente à borda, não à camada de domínio.

### Pattern: gRPC quando Protobuf, streaming e deadlines justificam um segundo protocolo

- **Problema:** traduzir handlers REST em handlers gRPC, ou o inverso via chamada HTTP interna, como arquitetura padrão dentro do mesmo processo espalha lógica de domínio pela camada de transporte.
- **Padrão:** escolha gRPC quando o contrato Protobuf, streaming, deadlines e stubs tipados entre serviços justificarem um segundo protocolo; compartilhe a camada de domínio com FastAPI em vez de traduzir handlers de um transporte para o outro.
- **Quando usar:** serviço interno polyglot, streaming, alta frequência de chamadas, necessidade de stubs gerados.
- **Quando NÃO usar:** para APIs browser/publicamente exploráveis, JSON/HTTP tende a ter menor atrito; para um serviço único simples, introduzir Protobuf, codegen e HTTP/2 pode não se pagar — o limiar econômico exato é contextual, sem recomendação oficial de "quando migrar".
- **Nota de versão:** `grpcio` é biblioteca separada do FastAPI — valide a compatibilidade da versão escolhida com Python 3.13 antes de adotar.

### Pattern: Deadlines e cancelamento em chamadas gRPC

- **Problema:** por default, um cliente gRPC pode esperar indefinidamente por uma chamada sem deadline.
- **Padrão:** configure deadline (`timeout`) em toda chamada de stub e preserve cancelamento/status — cancelamento permite parar trabalho que o consumidor já abandonou, e status codes dão semântica RPC padronizada.
- **Quando usar:** toda chamada service-to-service via `grpc.aio`.
- **Quando NÃO usar um timeout único global:** o deadline adequado depende do SLO e da operação — um timeout global arbitrário é apenas outro tipo de bug.

### Pattern: Evolução aditiva de mensagens Protobuf com `reserved`

- **Problema:** o número do campo é parte do wire format; reutilizar o field number de um campo removido pode fazer mensagens antigas — bytes já persistidos ou stubs antigos — serem interpretadas como dados de um campo novo.
- **Padrão:** nunca reutilize field numbers removidos — reserve os números e nomes de campos deletados (`reserved N;`, `reserved "nome";`) e evolua mensagens de forma aditiva.
- **Quando usar:** qualquer delete/rename de field num `.proto` já distribuído.
- **Quando NÃO usar `reserved`:** schema experimental nunca publicado, sem consumidores — pode ser recriado livremente; a regra vale a partir do momento em que stubs foram distribuídos ou bytes persistidos.

### Pattern: tRPC pertence ao lado TypeScript, não ao backend Python

- **Problema:** introduzir tRPC como camada RPC nativa de um backend FastAPI/Python via um adaptador custom, buscando "tipos end-to-end", perde a vantagem central do tRPC.
- **Padrão:** tRPC se define oficialmente como RPC para aplicações TypeScript, com inferência de tipos entre client e server sem codegen — essa vantagem desaparece quando o servidor é Python; não introduza tRPC nativamente no lado Python.
- **Quando usar:** quando a superfície RPC estiver efetivamente em TypeScript — inclusive um BFF TypeScript/tRPC na frente do FastAPI, mas nesse caso tRPC pertence ao BFF, e o contrato Python-BFF ainda precisa de outra interface.
- **Quando NÃO usar:** backend Python puro tentando expor tRPC diretamente — o pacote tRPC OpenAPI encontrado estava marcado como alpha, reforçando que não resolve naturalmente o lado Python.

## Anti-padrões

### Parsing GraphQL manual sobre `POST` cru

- **Sintoma:** endpoint `@app.post("/graphql")` lendo `query` do corpo da requisição e implementando parser, auth e execution próprios.
- **Correção:** use `GraphQLRouter` (Strawberry) com `context_getter` integrado ao dependency system do FastAPI.

### Cache de DataLoader global entre requisições

- **Sintoma:** `DataLoader` instanciado no nível de módulo e reutilizado por múltiplas requisições, misturando dados entre usuários.
- **Correção:** instancie o DataLoader dentro do `context_getter`, por requisição — o cache é per-request memoization, não application-level.

### Remover campo GraphQL sem depreciar antes

- **Sintoma:** campo referenciado por queries existentes desaparece do schema de um dia para o outro, sem `deprecation_reason` prévio.
- **Correção:** marque o campo com `deprecation_reason` e mantenha-o disponível até a migração dos consumidores; só então remova.

### Relação GraphQL sem paginação

- **Sintoma:** campo retornando uma coleção inteira sem limite superior, presumindo que a relação nunca vai crescer.
- **Correção:** exponha o envelope de connection (`edges`, `node`, `cursor`, `pageInfo`) para relações potencialmente grandes.

### Reutilizar field number de campo Protobuf removido

- **Sintoma:** campo antigo deletado e um campo novo criado reaproveitando o mesmo número de tag.
- **Correção:** use `reserved N;` e `reserved "nome_antigo";` para bloquear o reuso — o número do campo é parte do wire format.

### Chamada gRPC sem deadline

- **Sintoma:** `stub.Method(request)` chamado sem `timeout`, esperando indefinidamente por resposta.
- **Correção:** sempre passe `timeout` na chamada do stub e trate cancelamento/status explicitamente.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Cache HTTP, recursos simples, interoperabilidade com tooling HTTP é prioridade | REST em vez de GraphQL |
| GraphQL tipado num backend FastAPI | Strawberry + `GraphQLRouter`, contexto via `context_getter` |
| Campo aninhado resolvido individualmente (risco de N+1) | DataLoader por requisição, nunca global |
| ORM já prefetch/join-loads a árvore necessária | DataLoader adicional pode ser redundante |
| Mudança em schema GraphQL já publicado | Evolução aditiva + `deprecation_reason`, sem versionar endpoint |
| Ruptura semântica ampla, incompatível com o schema atual | Novo endpoint/serviço — exceção, não default |
| Relação GraphQL potencialmente grande | Paginação por conexão/cursor (`edges`, `pageInfo`) |
| Autorização de regra de negócio em GraphQL | Camada de domínio/business logic, não só o resolver |
| Serviço interno polyglot, streaming, alta frequência, stubs tipados | gRPC/Protobuf |
| API browser/publicamente explorável, ou serviço único simples | REST/HTTP JSON — Protobuf/codegen pode não se pagar |
| Chamada service-to-service via `grpc.aio` | Deadline (`timeout`) explícito sempre |
| Delete/rename de field já distribuído em `.proto` | `reserved` number + `reserved` name |
| Superfície RPC efetivamente em TypeScript | tRPC — não em backend Python puro |

## Referências externas

- Skill: `/api-design` — contratos REST, paginação e versionamento cross-stack
- Skill: `/architecture` — separação entre camada de domínio e camada de transporte (REST/GraphQL/gRPC)
- Átomo relacionado: `api-design-and-contracts` — REST resource design, versionamento REST, paginação REST, idempotency keys, RFC 9457, ETag, OpenAPI/`operationId`, webhooks e rate limiting (conteúdo não duplicado neste átomo)
- Source path (audit trail): Infos/knowledge/Python/deep-research-report3.md (seção "GraphQL e RPC")

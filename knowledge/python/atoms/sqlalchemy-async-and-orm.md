---
topic: sqlalchemy-async-and-orm
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report.md
tier: 2
triggers: [sqlalchemy, orm, async session, MissingGreenlet, lazy loading, selectinload, N+1, pool_size, max_overflow, deadlock, RLS, multi-tenancy, read replica, repository, bulk, soft delete, optimistic locking, JSONB, StreamingResponse]
related_skills: [/api-design, /system-design]
updated: 2026-08-30
python_versions: ['>=3.11']
flagged_for_human_audit: true
---

# SQLAlchemy — Sessões Async e ORM em Runtime

> **Audit humano obrigatório (D11):** este átomo será revisado por Luiz contra a fonte antes da aprovação do batch final.

## Quando consultar

- Ao decidir o lifecycle de uma `AsyncSession` num endpoint com fan-out concorrente (`gather`, `TaskGroup`) que toca o banco
- Ao acessar uma relação lazy depois de uma query async e ver `MissingGreenlet`
- Ao serializar uma lista de objetos onde cada item vai acessar uma relação (risco de N+1)
- Ao dimensionar `pool_size`/`max_overflow` para múltiplos workers/réplicas, ou decidir entre pool próprio e `NullPool` atrás de um pooler externo
- Ao desenhar retry de transação sob `40001`/`40P01`, ou ordenar locks entre code paths concorrentes
- Ao decidir se uma tabela compartilhada entre tenants precisa de RLS além do filtro `tenant_id`, ou se uma leitura pode ir para replica
- Ao modelar soft delete com unicidade, optimistic locking, coluna JSONB mutável, ou um endpoint `StreamingResponse` que também usa o banco

## Padrões sênior

### Pattern: AsyncSession por unidade de trabalho

- **Problema:** `AsyncSession` é um objeto mutável/stateful; usar a mesma instância em tasks concorrentes (por exemplo dentro de `asyncio.gather`) não é seguro.
- **Padrão:** crie o Engine/session factory uma vez como recurso de aplicação e abra uma `AsyncSession` nova por unidade de trabalho (request/task); combine com `expire_on_commit=False` para acessar atributos após commit sem I/O implícito adicional.
- **Quando usar:** qualquer fan-out concorrente (`gather`, `TaskGroup`) que toca o banco — cada task abre sua própria sessão.
- **Quando NÃO usar:** dentro de uma única task sequencial — reaproveitar a mesma Session para múltiplas operações da mesma unidade de trabalho é o uso pretendido, não um problema.

### Pattern: Boundary transacional centralizado

- **Problema:** se cada helper/repository faz seu próprio `commit()`, uma operação de negócio composta por vários passos pode ficar parcialmente persistida quando um passo falha depois que outro já commitou.
- **Padrão:** delimite commit/rollback com `Session.begin()` (ou `sessionmaker.begin()`) no nível do serviço/unidade de trabalho; em SQLAlchemy 2.0, `Session.commit()` sempre se refere à transação mais externa, e SAVEPOINTs são fechados pelo objeto retornado por `begin_nested()`.
- **Quando usar:** qualquer sequência de gravações que precisa ser atômica como um todo (ex: débito + crédito + ledger).
- **Quando NÃO usar:** endpoint CRUD com uma única operação já atômica — um commit simples corresponde à unidade de consistência.

### Pattern: Retry de deadlock e serialization failure

- **Problema:** sob REPEATABLE READ/SERIALIZABLE (PostgreSQL usa Read Committed por padrão) a transação pode abortar com `40001` (serialization_failure); deadlocks (`40P01`) podem ocorrer mesmo sob isolamento mais fraco quando duas transações disputam os mesmos locks. Repetir só o último `UPDATE` pode reaplicar uma decisão de negócio calculada sobre estado obsoleto.
- **Padrão:** ao receber `40001`, reexecute a transação inteira — inclusive a lógica que escolheu os comandos e valores; para `40P01` a fonte recomenda considerar retry também, com a mesma reexecução completa.
- **Quando usar:** overselling, allocation, qualquer fluxo com isolamento elevado ou contenção de lock conhecida.
- **Quando NÃO usar:** não trate todo `IntegrityError` como retryable — `23505`/`23P01` só são retryable em cenários específicos e podem representar erro permanente de entrada.

### Pattern: Ordem determinística de locks

- **Problema:** duas transações que travam as mesmas linhas em ordem inversa uma da outra podem gerar deadlock; o banco detecta o ciclo e aborta uma das transações.
- **Padrão:** adquira locks (`SELECT ... FOR UPDATE`) em ordem determinística — por exemplo, ordenando os IDs envolvidos — em todos os code paths que tocam os mesmos registros.
- **Quando usar:** transferências (A→B e B→A), múltiplos workers competindo pelos mesmos registros.
- **Quando NÃO usar como garantia total:** ordenação reduz ciclos, mas não elimina todas as formas possíveis de deadlock — mantenha o retry de `40P01` do pattern anterior como rede de segurança.

### Pattern: Dimensionar o pool de conexões deliberadamente

- **Problema:** os defaults do `QueuePool` (`pool_size=5`, `max_overflow=10`, `timeout=30s`) somam até 15 conexões por Engine; tratar isso como capacidade "grátis" estoura o limite de conexões do banco quando há vários processos/workers, cada um com seu próprio pool.
- **Padrão:** dimensione `pool_size`/`max_overflow`/`pool_timeout` a partir do orçamento real de conexões do banco, no nível do deployment inteiro (não de um processo isolado); use `pool_pre_ping=True` contra conexões mortas; atrás de um pooler externo (ex: PgBouncer em transaction pooling) que já controla o reuse, avalie `NullPool` em vez de empilhar outro pool.
- **Quando usar:** todo `create_engine`/`create_async_engine` em produção, antes de bater em `QueuePool limit ... reached`.
- **Quando NÃO usar sem medir:** aumentar o pool pode só deslocar o gargalo para o servidor; `pool_recycle`, `pool_timeout` e `max_overflow` resolvem problemas diferentes — não ajuste como um único "performance knob" (a medição fina de saturação é assunto do átomo de performance).

### Pattern: Read replicas só para leitura tolerante a staleness

- **Problema:** streaming/cascading replication pode ser assíncrona; existe uma janela em que uma escrita confirmada no primary ainda não está visível na replica, e o lag exposto pelas métricas do banco não é uma previsão simples de "tempo até ficar atualizado".
- **Padrão:** envie para replica somente leituras que toleram staleness; mantenha read-after-write e decisões transacionais no primary, salvo quando houver um mecanismo explícito de consistência; SQLAlchemy permite customizar `Session.get_bind()` para esse roteamento — não existe routing automático embutido no framework (a fonte marca a política de routing como contestada, ainda que a staleness da replicação assíncrona seja consenso).
- **Quando usar:** dashboards, relatórios, qualquer leitura que não precisa refletir a escrita mais recente.
- **Quando NÃO usar:** logo após criar ou atualizar um registro e precisar lê-lo de volta na mesma operação — leia do primary.

### Pattern: RLS como segunda barreira em multi-tenancy compartilhado

- **Problema:** depender só de `WHERE tenant_id = ...` na aplicação significa que uma única query esquecendo o filtro vaza dados entre tenants.
- **Padrão:** quando o nível de risco justificar (a fonte marca a escolha de adotar RLS como contestada), habilite PostgreSQL RLS com policy sobre `tenant_id` e injete o tenant no escopo da transação (`SET LOCAL` ou `set_config(..., true)`) — nunca com `SET` normal numa conexão pooled, cuja configuração de sessão pode sobreviver ao commit e contaminar a próxima unidade de trabalho.
- **Quando usar:** SaaS multi-tenant com tabelas compartilhadas entre tenants e risco relevante de vazamento entre eles.
- **Quando NÃO usar sem validar:** superusers, roles com `BYPASSRLS` e, por padrão, o dono da tabela contornam as policies; o owner só passa a ser submetido a elas com `FORCE ROW LEVEL SECURITY` — sem essa validação, RLS pode dar falsa sensação de segurança.

### Pattern: `selectinload`/`raiseload` para evitar N+1

- **Problema:** lazy loading padrão (`lazy="select"`) pode emitir um SELECT por objeto ao acessar uma relação dentro de um loop.
- **Padrão:** escolha a loading strategy na própria query — `selectinload()` para coleções gerais (roda uma segunda consulta com `IN (...)` e carrega os relacionados em batch); `raiseload()` em paths críticos para transformar lazy load inesperado em erro observável em vez de silêncio.
- **Quando usar:** query lista pais e o endpoint acessa a relação para cada item (serializer, loop de resposta).
- **Quando NÃO usar:** eager loading de relação que nunca será usada também desperdiça I/O; `joinedload()` pode ser preferível em relações many-to-one/pequenas, mas exige `Result.unique()` quando faz eager loading de uma coleção.

### Pattern: Lazy loading explícito em `AsyncSession`

- **Problema:** acesso normal a atributo Python não contém `await`; se o atributo é uma relação lazy que precisa executar SQL, o SQLAlchemy não tem como fazer esse I/O implícito dentro de um `AsyncSession`, e a exceção característica é `MissingGreenlet`.
- **Padrão:** carregue relações explicitamente na query (ex: `selectinload`) antes de acessá-las, ou use a API `AsyncAttrs` quando acesso lazy-like é realmente desejado; combine com `expire_on_commit=False` para não expirar atributos automaticamente após o commit.
- **Quando usar:** toda query feita via `AsyncSession` cujo resultado será serializado ou terá relações acessadas depois.
- **Quando NÃO usar eager load em tudo:** eager load não é obrigatório em toda relação — é obrigatório ter uma estratégia consciente de onde o I/O vai acontecer (o modelo de event loop/await em si pertence ao átomo `async-and-concurrency`).

### Pattern: Bulk insert/update via statement único

- **Problema:** um loop de `session.add()`/`session.flush()` por linha força um round-trip deliberado por item em operações de massa (import, seed volumoso, milhares de eventos).
- **Padrão:** passe uma lista de dicts para um statement `insert()`/`update()` (ex: `session.execute(insert(Event), rows)`) para acionar o caminho ORM-enabled bulk INSERT/UPDATE/DELETE do SQLAlchemy 2.x.
- **Quando usar:** DML em massa onde não é preciso o fluxo individual completo de cada entidade no identity map.
- **Quando NÃO usar:** não descarte `session.add_all()` por padrão — SQLAlchemy 2.0 melhorou os INSERTs do ORM; reserve o bulk explícito para quando o volume realmente justifica abrir mão do tracking por entidade.

### Pattern: Repository só quando esconde uma fronteira real (contestado)

- **Problema:** uma classe Repository que só renomeia métodos da Session (`add`/`get`/`commit` delegando 1:1) não agrega abstração real, só indireção.
- **Padrão:** crie Repository quando ele representar uma fronteira de domínio (linguagem do domínio, query encapsulada) ou esconder uma estratégia de persistência que pode variar; para CRUD pequeno, Session direta reduz indireção.
- **Quando usar:** domínio rico, onde Repository evita que SQLAlchemy penetre toda a lógica central e facilita fakes/adapters em teste.
- **Quando NÃO usar:** não introduza Repository por reflexo — a fonte marca essa escolha como contestada entre arquiteturas (ver nota em Critérios de decisão); o benefício precisa superar o custo de mais uma camada.

### Pattern: Soft delete com partial unique index

- **Problema:** se soft delete permite reutilizar uma chave lógica (ex: e-mail) depois do "delete", checar `WHERE deleted_at IS NULL` antes do insert só na aplicação tem a mesma race condition de qualquer "check then insert".
- **Padrão:** mova a unicidade para um unique partial index no banco (ex: `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL`), preservando o histórico soft-deleted sem abrir a race condition.
- **Quando usar:** a chave lógica pode ser reaproveitada por um novo registro depois que o antigo foi soft-deleted.
- **Quando NÃO usar:** se a chave nunca pode ser reutilizada mesmo após o delete lógico, uma `UNIQUE` normal é mais simples; a fonte não estabelece um padrão canônico único para esconder linhas soft-deleted de todas as queries — trate como decisão de projeto (contestado).

### Pattern: Optimistic locking com `version_id_col`

- **Problema:** duas requisições carregam o mesmo registro, editam e salvam; sem detecção, a segunda gravação sobrescreve a primeira silenciosamente (lost update).
- **Padrão:** configure `__mapper_args__` com `version_id_col`; o UPDATE passa a incluir a versão esperada e falha quando o registro mudou desde que a Session o carregou.
- **Quando usar:** você precisa de controle otimista por linha sem elevar o isolamento de toda a transação.
- **Quando NÃO usar como substituto:** `version_id_col` não é audit log — não reconstrói quem mudou o quê nem versões históricas; operações bulk que não passam pelo tracking por entidade não recebem a mesma checagem de versão automaticamente.

### Pattern: JSONB mutável com extensão `Mutable`

- **Problema:** persistir um dict numa coluna JSONB não significa que qualquer alteração in-place posterior (ex: `payload["x"] = ...`) será detectada como mudança de atributo.
- **Padrão:** mapeie a coluna com `MutableDict.as_mutable(JSONB)` quando mutação in-place fizer parte do modelo; alternativamente, reatribua o valor completo do dict em vez de mutar in-place.
- **Quando usar:** payload semi-estruturado que o código atualiza campo a campo depois de carregado.
- **Quando NÃO usar instrumentação:** para payload tratado como imutável, reatribuir o dicionário inteiro é mais simples e evita instrumentação adicional.

### Pattern: `StreamingResponse` e sessão viva durante o stream

- **Problema:** desde a mudança de lifecycle de dependencies com `yield`, o cleanup de uma dependency acontece depois que a response é enviada; uma `AsyncSession` dependente do request pode permanecer aberta durante todo o stream, retendo conexão/pool slot por muito mais tempo que um request normal.
- **Padrão:** se o generator não precisa do banco depois do lookup inicial, abra e feche a Session antes de retornar o `StreamingResponse`; se o stream realmente precisa consultar o banco durante a geração, reserve esse recurso conscientemente e dimensione o pool para isso.
- **Quando usar:** endpoint que usa a Session só para autenticação/lookup inicial e depois faz um stream longo.
- **Quando NÃO usar fechamento antecipado:** se o generator consulta o banco a cada chunk, fechar a Session antes é incorreto — nesse caso a retenção do recurso é esperada, não um bug.

## Anti-padrões

### RLS contornada por superuser/owner sem `FORCE`

- **Sintoma:** as policies parecem configuradas, mas a aplicação ainda vê dados de outros tenants porque conecta com um role que tem `BYPASSRLS`, ou é o próprio dono da tabela (que por padrão contorna RLS).
- **Correção:** use uma role de aplicação sem `BYPASSRLS` e aplique `FORCE ROW LEVEL SECURITY` quando o dono da tabela também precisa respeitar a policy.

### `SET` de sessão em vez de `SET LOCAL` para tenant em conexão pooled

- **Sintoma:** `SET app.tenant_id = 'tenant-a'` funciona no teste, mas numa conexão pooled a configuração de sessão sobrevive ao commit e vaza para a próxima unidade de trabalho que reusar essa conexão física.
- **Correção:** use `SET LOCAL` ou `set_config('app.tenant_id', valor, true)` dentro da transação — o valor morre no commit/rollback.

### Repository que só reencaminha 1:1 para a Session

- **Sintoma:** `UserRepository.add()`/`get()`/`commit()`, cada método chamando o equivalente da Session sem nenhuma lógica de domínio — zero abstração real, só indireção.
- **Correção:** ou remova a camada e use Session direta, ou faça o Repository expressar linguagem de domínio e encapsular queries reais (ex: `get_allocatable(sku)`).

### Ler da replica logo após escrever no primary

- **Sintoma:** um fluxo cria/atualiza no primary e imediatamente lê de uma replica qualquer — o registro recém-gravado pode "sumir" temporariamente por causa do lag de replicação assíncrona.
- **Correção:** leia do primary imediatamente após escrever (read-your-own-writes), ou adote um mecanismo explícito de consistência antes de rotear esse read para replica.

### Mutação in-place de dict JSONB sem `Mutable`

- **Sintoma:** `obj.payload["status"] = "done"` seguido de commit, mas a mudança não é persistida porque a coluna JSONB comum não instrumenta mutação in-place.
- **Correção:** mapeie com `MutableDict.as_mutable(JSONB)`, ou reatribua o dict inteiro em vez de mutar uma chave.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Query lista pais e o endpoint acessa a relação para cada item | `selectinload()` na query, não lazy load implícito |
| Path crítico onde lazy load implícito não pode passar despercebido | `raiseload("*")` combinado com o eager load necessário |
| AsyncSession será usada por múltiplas tasks concorrentes | Uma AsyncSession nova por task — nunca compartilhar a mesma instância |
| Sequência de gravações precisa ser atômica como um todo | Boundary único com `Session.begin()`, sem `commit()` espalhado por helper |
| Erro `40001` (serialization_failure) ou `40P01` (deadlock_detected) | Reexecutar a transação inteira, incluindo a lógica de negócio que gerou o SQL |
| Múltiplas linhas/objetos precisam de lock na mesma operação | Locks em ordem determinística (ex: IDs ordenados) em todos os code paths |
| App atrás de PgBouncer/pooler externo que já controla reuse | `NullPool` no Engine, sem empilhar outro pool |
| Leitura tolera staleness (dashboard, relatório) | Replica de leitura |
| Leitura precisa refletir a escrita imediatamente anterior | Primary, salvo mecanismo explícito de consistência |
| Múltiplos tenants compartilhando tabela, risco de vazamento relevante | RLS como segunda barreira + tenant via `SET LOCAL`/`set_config(..., true)` |
| Repository representa fronteira de domínio real | Criar Repository — ver nota abaixo (contestado na fonte) |
| CRUD simples sem lógica de domínio relevante | Session direta, sem camada Repository |
| Milhares de inserts/updates em lote | `insert()`/`update()` com lista de dicts, não `flush()` por linha |
| Chave lógica pode ser reaproveitada após soft delete | Unique partial index (`WHERE deleted_at IS NULL`), não checagem só na aplicação |
| Detectar update concorrente sem elevar isolamento da transação inteira | `version_id_col` (optimistic locking) |
| Campo JSON mutado in-place pelo código | `MutableDict.as_mutable(JSONB)` ou reatribuição do dict completo |
| Endpoint `StreamingResponse` que não usa o DB durante o stream | Fechar a Session antes de iniciar o stream |

> Nota (contestado na fonte): o tutorial oficial do FastAPI (*SQL Databases*) injeta a Session diretamente no endpoint/CRUD, sem camada Repository. Percival e Gregory, em *Architecture Patterns with Python*, defendem Repository + Unit of Work para isolar um domínio relevante da persistência. A fonte não declara vencedor entre as duas posições — trate como trade-off arquitetural: não introduza Repository por reflexo, mas também não remova uma fronteira de domínio existente só porque SQLAlchemy já é uma abstração.

## Referências externas

- Skill: `/api-design` — pooling e limites de concorrência em endpoints que expõem dados via API
- Skill: `/system-design` — dimensionamento de pool/replica como decisão de arquitetura de dados
- Átomo `async-and-concurrency` (mesma stack) — modelo de event loop, `TaskGroup`, dimensionamento de workers; aqui o foco é sessão/ORM, não o modelo de concorrência
- Átomo `migrations-and-schema-evolution` (mesma stack) — Alembic, expand/migrate/contract, backfill; fora do escopo deste átomo
- Source path (audit trail): `Infos/knowledge/Python/deep-research-report.md`

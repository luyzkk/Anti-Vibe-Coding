---
topic: migrations-and-schema-evolution
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/deep-research-report.md
tier: 2
triggers: [alembic, migration, autogenerate, alembic check, zero downtime, expand contract, rename column, drop column, CREATE INDEX CONCURRENTLY, backfill, constraint, default, polimorfismo, schema]
related_skills: [/system-design, /architecture]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Migrations e Evolução de Schema

*Os padrões abaixo assumem PostgreSQL — é o SGBD que a fonte pesquisou explicitamente para regras dependentes de banco (zero-downtime, `CONCURRENTLY`, `NOT VALID`, defaults). Não há pesquisa equivalente para MySQL/MariaDB, SQLite, SQL Server ou Oracle nesta fonte.*

## Quando consultar

- Ao revisar uma migration gerada por `alembic revision --autogenerate` antes do merge
- Ao planejar rename, drop ou mudança de tipo de coluna em produção com rolling deploy
- Ao adicionar coluna com default, constraint (`CHECK`/FK) ou índice numa tabela grande com tráfego de escrita
- Ao decidir como fazer backfill de uma transformação de dados em massa
- Ao modelar um relacionamento polimórfico (`target_type`/`target_id`) ou volume temporal alto
- Ao escolher isolamento de schema por tenant

## Padrões sênior

### Pattern: `autogenerate` é rascunho, não migration pronta

- **Problema:** autogenerate não detecta rename de coluna como rename — a diferença tende a aparecer semanticamente como remoção + adição, o que pode transformar uma refatoração inofensiva em perda de dados se o diff for aceito sem revisão.
- **Padrão:** trate `alembic revision --autogenerate` como gerador de rascunho; revise manualmente toda operação destrutiva, rename, constraint, default, lock e backfill antes do merge. Em CI, `alembic check` (desde 1.9) reusa o mesmo mecanismo de comparação para falhar o build quando os models mudaram sem migration, mas herda as mesmas limitações do autogenerate.
- **Quando usar:** sempre — autogenerate acelera alterações mecânicas e é um bom ponto de partida.
- **Quando NÃO usar sem revisão:** nunca aceitar o diff quando ele mostra `drop_column` + `add_column` para o que deveria ser um `alter_column(new_column_name=...)`; um `alembic check` verde não substitui a revisão — significa apenas que autogenerate não produziria novas operações.

### Pattern: expand → migrate → contract para rename, drop e mudança de tipo

- **Problema:** durante rolling deploy, versões antiga e nova da aplicação coexistem; um rename ou drop atômico de coluna quebra a versão antiga que ainda lê o nome/tipo anterior — e o drop ainda elimina os dados.
- **Padrão:** decomponha em múltiplos deploys: expandir (nova coluna, aplicação lê/escreve ambas), fazer backfill, migrar a leitura para a nova coluna e só então contrair (drop da antiga) num deploy posterior.
- **Quando usar:** rename, remoção ou mudança de tipo incompatível de coluna, mudança de enum/schema compartilhado, rolling deploy ou múltiplas réplicas da API.
- **Quando NÃO usar todas as etapas:** com parada coordenada, em que nenhuma instância antiga ou job assíncrono continuará rodando, um rename direto pode ser aceitável; em tabela pequena o custo de copiar dados é irrelevante, mas o problema de compatibilidade entre versões da aplicação continua existindo enquanto houver rolling deploy.

```text
deploy A: ADD COLUMN handle NULL; código lê handle ?? username e escreve ambos
job:      backfill username -> handle
deploy B: lê/escreve só handle
deploy C: DROP COLUMN username
```

### Pattern: `ADD COLUMN` — default não-volátil é metadata-only, volátil não é

- **Problema:** a crença de que qualquer `ADD COLUMN ... DEFAULT` reescreve a tabela inteira está desatualizada para PostgreSQL moderno (11+).
- **Padrão:** um default não-volátil (ex.: uma constante) é avaliado na alteração e o resultado fica em metadata, sem reescrever imediatamente as linhas — o `ALTER TABLE` é rápido mesmo em tabela grande. Um default volátil (ex.: `clock_timestamp()`) ainda exige atualizar cada linha; nesse caso, adicione a coluna sem default, faça o backfill controlado e só depois defina o default.
- **Quando usar direto:** default constante/não-volátil — `ADD COLUMN status text DEFAULT 'active'` sem decompor.
- **Quando NÃO usar direto:** default volátil em tabela grande — decompor em `ADD COLUMN` sem default, backfill em lotes, depois `ALTER COLUMN ... SET DEFAULT`. Nota: `default=` do SQLAlchemy é diferente de `server_default=` — um default que deve existir no banco precisa ser especificado como server-side default no Alembic; essa otimização é específica do PostgreSQL moderno, não a transfira para outro backend sem checar a doc dele.

### Pattern: constraints pesadas como `NOT VALID` + `VALIDATE CONSTRAINT` separado

- **Problema:** validar uma FK ou `CHECK` nova pode escanear uma tabela grande inteira e bloquear atualizações enquanto o `ALTER TABLE ADD CONSTRAINT` não termina.
- **Padrão:** adicione a constraint como `NOT VALID` — evita o scan inicial, e novas linhas já ficam sujeitas a ela — e rode `VALIDATE CONSTRAINT` num passo separado, que adquire um lock mais fraco (`SHARE UPDATE EXCLUSIVE`).
- **Quando usar:** FK, `CHECK` ou `NOT NULL` retroativo em tabela grande com tráfego de escrita em produção.
- **Quando NÃO usar:** tabela pequena, onde o custo de dois passos pode não valer a complexidade. `NOT VALID` não é "constraint opcional" — é uma estratégia para separar enforcement futuro de validação histórica. PostgreSQL 18 acrescentou `NOT ENFORCED` para `CHECK`/FK, evoluiu constraints `NOT NULL`, ampliou `NOT VALID` para novos cenários e adicionou constraints temporais (`WITHOUT OVERLAPS`/`PERIOD`) — confirme a sintaxe em versões anteriores do PostgreSQL.

```sql
ALTER TABLE orders ADD CONSTRAINT orders_customer_fk
FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;

ALTER TABLE orders VALIDATE CONSTRAINT orders_customer_fk;
```

### Pattern: constraint no banco como árbitro atômico, não só validação na aplicação

- **Problema:** um "check then insert" na aplicação — por exemplo, um `SELECT` para checar e-mail único antes do `INSERT`, ou verificar saldo/faixa válida antes de gravar — roda dentro de uma transação/snapshot e não impede outra requisição concorrente de passar pela mesma checagem antes do primeiro `INSERT`; não há garantia atômica.
- **Padrão:** coloque invariantes concorrentes e relacionais no banco — `UNIQUE`, FK, `NOT NULL`, `CHECK` — e trate a constraint como o árbitro atômico no momento em que a escrita é aceita; duplique a mesma regra na aplicação somente para UX, mensagens precoces ou validação local.
- **Quando usar validação na aplicação:** para formato, parsing e mensagens de API — Pydantic/FastAPI continuam sendo o lugar certo para isso, como camada adicional, não substituta.
- **Quando NÃO usar validação exclusivamente na aplicação:** quando a invariante precisa permanecer verdadeira independentemente de qual worker, script ou serviço escreve os dados — validação duplicada é útil, validação **exclusivamente** na aplicação é o problema.

```python
# BOM — a constraint decide atomicamente
try:
    session.add(User(email=email))
    session.commit()  # UNIQUE(email) decide atomicamente
except IntegrityError:
    session.rollback()
    raise EmailAlreadyExists()

# RUIM como única proteção
exists = session.scalar(select(User.id).where(User.email == email))
if not exists:
    session.add(User(email=email))
    session.commit()
```

### Pattern: `CREATE INDEX CONCURRENTLY` fora do transaction block

- **Problema:** um `CREATE INDEX` normal bloqueia writes durante toda a construção do índice.
- **Padrão:** `CREATE INDEX CONCURRENTLY` permite inserts/updates/deletes simultâneos, ao custo de mais trabalho, duas varreduras e espera por transações concorrentes; PostgreSQL exige que essa operação rode fora de transaction blocks. No Alembic, use `MigrationContext.autocommit_block()` para esse DDL — entrar no bloco força commit da transação anterior.
- **Quando usar:** tabela de produção grande ou quente, com escrita concorrente.
- **Quando NÃO usar:** tabelas novas, vazias, temporárias, ou durante manutenção controlada — o índice normal pode ser preferível. Trate a migration como operação observável: uma tentativa concorrente malsucedida pode exigir inspeção/limpeza antes de um retry.

```python
def upgrade():
    with op.get_context().autocommit_block():
        op.execute("CREATE INDEX CONCURRENTLY ix_orders_customer_id ON orders (customer_id)")
```

### Pattern: backfill em job idempotente e batched, fora da migration crítica

- **Problema:** um `UPDATE` grande sem filtro seletivo dentro da própria migration amplia a duração da transação, aumenta o tempo de locks e acopla a disponibilidade do deploy ao tempo de transformação dos dados.
- **Padrão:** separe a migration de schema do backfill de dados — mova a transformação para um job idempotente e batched (por faixa de id, ou condição "ainda não migrado"), fora do arquivo crítico de schema migration.
- **Quando usar:** milhões de linhas, backfill após `ADD COLUMN`, transformação de tipo ou layout.
- **Quando NÃO usar (DML direto na migration é aceitável):** dados seed minúsculos e estáticos — Alembic tem `bulk_insert()` para isso. A distinção relevante é volume/tempo/lock imprevisível, não uma proibição absoluta de DML no Alembic.

### Pattern: polimorfismo — FK real ou association object em vez de generic FK sem integridade

- **Problema:** uma referência polimórfica do tipo `target_type`/`target_id` sem FK real não tem integridade garantida pelo banco — a aplicação decide qual tabela é referenciada, o que permite referências órfãs.
- **Padrão:** se a integridade importa, modele FKs reais, um association object (para many-to-many com atributos próprios na tabela de junção) ou uma hierarquia relacional explícita — SQLAlchemy oferece single-table, joined-table e concrete-table inheritance; single-table e joined-table são as formas mais comuns, concrete exige configuração adicional.
- **Quando usar:** comments, attachments ou entidades que apontam para múltiplas tabelas, quando a integridade referencial é um requisito real.
- **Quando NÃO usar generic FK:** quando referências fracas ou logs toleram dangling references — nesse caso a perda de integridade deve ser uma escolha explícita do design, não um acidente; não introduza hierarquia ORM só para fugir do problema se ela não representar de fato a persistência desejada.

### Pattern: particionamento nativo do banco em vez de inheritance ORM para volume temporal

- **Problema:** usar STI/JTI/concrete inheritance do SQLAlchemy como substituto de partitioning confunde dois mecanismos independentes — inheritance descreve hierarquia de classes persistentes, não estratégia de armazenamento físico.
- **Padrão:** escolha a estratégia de particionamento no próprio banco — PostgreSQL tem particionamento declarativo, com regras e caveats próprios para constraints e índices — e deixe o ORM mapear esse desenho normalmente.
- **Quando usar:** volume de eventos alto, retenção temporal, quando "tipos de evento" tentam virar subclasses ORM (`Event2026Jan(Event)`, `Event2026Feb(Event)`...).
- **Quando NÃO usar como regra fixa:** a fonte não estabelece um threshold quantitativo em que particionamento passa a valer a pena — trate como decisão orientada por workload, não como regra automática.

### Pattern: schema-per-tenant como fan-out explícito de migration

- **Problema:** a receita de cookbook do Alembic para schema-per-tenant aplica a migration ao schema selecionado via `-x tenant=...`; um único `alembic upgrade head` não migra todos os schemas automaticamente.
- **Padrão:** trate migration de tenants como uma operação de fan-out explícita — valide o identificador do tenant e itere `alembic -x tenant=<tenant> upgrade head` por tenant, registrando sucesso/falha de cada execução.
- **Quando usar:** schema por cliente, `search_path` por tenant, centenas ou milhares de schemas.
- **Quando NÃO usar sem orquestração adicional:** não eleve a receita de cookbook a suporte multi-tenant turnkey — não existe orchestrator oficial para milhares de schemas com tracking parcial, retries e rollout gradual. A escolha entre schema-per-tenant e uma alternativa de schema único é tratada como contestada pela própria fonte — nenhuma das duas é declarada universalmente superior.

## Anti-padrões

### Aceitar diff de autogenerate como "rename" sem revisar

- **Sintoma:** a migration gerada mostra `op.drop_column` seguido de `op.add_column` para o que deveria ser um simples rename de coluna.
- **Correção:** reescrever manualmente para `op.alter_column(tabela, coluna, new_column_name=...)` antes do merge.

### `CREATE INDEX` padrão em tabela de produção quente

- **Sintoma:** `op.create_index` roda a construção normal do índice numa tabela com tráfego de escrita ativo — writes ficam bloqueados até terminar.
- **Correção:** usar `op.get_context().autocommit_block()` e emitir `CREATE INDEX CONCURRENTLY` via `op.execute`.

### `UPDATE` em massa dentro do `upgrade()`

- **Sintoma:** `op.execute("UPDATE tabela SET ... WHERE ...")` sem filtro de faixa, dentro da própria migration — transação longa, locks prolongados, deploy acoplado ao tempo do backfill.
- **Correção:** mover a transformação para um job idempotente e batched, executado fora do arquivo crítico de schema migration.

### `ADD CONSTRAINT` de FK/`CHECK` direto em tabela grande e quente

- **Sintoma:** `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` sem `NOT VALID` — escaneia a tabela inteira e bloqueia updates até terminar.
- **Correção:** `ADD CONSTRAINT ... NOT VALID`, seguido de `VALIDATE CONSTRAINT` num passo separado.

### Assumir que `alembic upgrade head` migrou todos os tenants

- **Sintoma:** rodar `alembic upgrade head` uma vez num ambiente schema-per-tenant e assumir que todos os schemas foram atualizados.
- **Correção:** iterar `alembic -x tenant=<tenant> upgrade head` explicitamente por tenant, registrando sucesso/falha de cada execução.

### Confiar que a FK cria índice nos dois lados

- **Sintoma:** nenhuma coluna referenciadora é indexada, na crença de que a FK cria índice automaticamente em ambos os lados.
- **Correção:** indexar a coluna referenciadora explicitamente quando útil — apenas o lado referenciado precisa ser PK/unique/non-partial unique index; indexar o lado referenciador costuma ajudar deletes/updates na tabela referenciada.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Diff de autogenerate mostra rename de coluna | Reescrever para `op.alter_column(new_column_name=...)` — nunca aceitar drop+add |
| CI precisa falhar quando models mudaram sem migration | `alembic check` — não substitui revisão manual do diff |
| Rename/drop/mudança de tipo com rolling deploy | Expand → migrate → contract em múltiplos deploys |
| Rename/drop com parada coordenada, sem instância antiga rodando | Alteração direta num único deploy pode ser aceitável |
| `ADD COLUMN ... DEFAULT` com valor constante/não-volátil | Direto — metadata-only desde PostgreSQL 11+ |
| `ADD COLUMN` com default volátil em tabela grande | Sem default + backfill em lotes + `SET DEFAULT` depois |
| FK/`CHECK`/`NOT NULL` retroativo em tabela grande com escrita ativa | `ADD CONSTRAINT ... NOT VALID` + `VALIDATE CONSTRAINT` separado |
| Índice novo em tabela de produção grande/quente | `CREATE INDEX CONCURRENTLY` dentro de `autocommit_block()` |
| Índice em tabela nova, vazia ou sob manutenção controlada | `CREATE INDEX` normal |
| Backfill de milhões de linhas | Job idempotente e batched, fora da migration |
| Seed de dados pequeno e estático | DML direto na migration (`op.bulk_insert()`) |
| Referência polimórfica onde integridade é requisito real | FK real, association object ou hierarquia relacional explícita |
| Referência polimórfica onde dangling reference é tolerável | Generic FK como escolha explícita, não acidental |
| Volume temporal alto virando subclasses ORM por período | Particionamento nativo do PostgreSQL — ORM mapeia normalmente |
| Precisa compactar todo o histórico de migrations numa só | Sem operação oficial de squash — `alembic merge` só resolve branches divergentes |
| Migration destrutiva já aplicada, dados já removidos | `downgrade()` não garante reversibilidade — rollback vs forward-fix é decisão operacional |
| Isolamento por schema, dezenas/centenas de tenants | Fan-out explícito por tenant — sem orchestrator oficial turnkey |

## Referências externas

- Skill: `/system-design` — trade-offs de particionamento, multi-tenancy e evolução de schema em arquitetura de dados
- Skill: `/architecture` — separação entre schema migration e transformação de dados (backfill), fronteira entre banco e aplicação
- Átomo `sqlalchemy-async-and-orm` — sessões, locking otimista, soft delete, JSONB e demais tópicos de runtime do ORM não cobertos aqui
- Átomo `deployment-and-production` — gate de migração no pipeline de deploy; aqui cobre-se apenas a mecânica da migração em si
- Source path (audit trail): `Infos/knowledge/Python/deep-research-report.md`

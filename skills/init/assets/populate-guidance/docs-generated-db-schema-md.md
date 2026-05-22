# Guidance: docs/generated/db-schema.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/generated/db-schema.md eh um **snapshot legivel do schema do banco de dados**: tabelas, colunas principais, relacionamentos e hints de indice para otimizacao de queries. NAO eh o schema autoritativo (esse vive nas migrations ou no arquivo de schema do ORM). Eh a versao legivel para humanos e agentes que precisam entender a estrutura dos dados sem abrir o Prisma Studio ou executar uma query de introspeccao.

O publico primario sao engenheiros escrevendo queries, agentes decidindo onde persistir dados, e revisores de PR verificando se novas migrations sao consistentes com o schema documentado.

## Espirito do doc (tom esperado)

Gerado, nao narrativo. Deve ser marcado explicitamente como "gerado em [data]" para que o leitor saiba que pode estar desatualizado apos migrations. Estrutura tabular e mais legivel do que prosa para esta informacao. Cada tabela deve ter: nome, descricao em 1 linha, lista de colunas com tipo e descricao breve, e chaves primarias/estrangeiras destacadas.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `CREATE TABLE` em arquivos SQL — schema declarativo direto. Mapeia todas as tabelas com colunas e tipos.
- `db/migrate/` (Rails) — diretorio de migrations. O numero de arquivos indica maturidade do schema.
- `prisma/schema.prisma` — schema declarativo do Prisma com modelos, fields e relations.
- `schema.rb` — versao compilada do schema Rails, mais legivel do que as migrations individuais.
- `migrations/` ou `db/` em projetos Node/Python — local convencional de migrations.

## Por H2 — o que escrever

### Tables
Lista todas as tabelas do banco com descricao de responsabilidade em 1 linha e a lista de colunas principais (nao precisa ser exaustiva — foque nas colunas que engenheiros consultam com frequencia). Destaque a chave primaria e qualquer coluna com restricao unica. Nao precisa listar colunas de auditoria genericas (created_at, updated_at) em cada tabela — mencione uma vez como convencao.

**Cubra:** nome da tabela com descricao, colunas principais com tipo, chaves primarias destacadas
**NAO escreva:** SQL completo de CREATE TABLE — o schema file ja tem isso

### Relationships
Como as tabelas se relacionam: foreign keys, tabelas de join (N:N), e relacoes polimorficas se existirem. Um diagrama ER em mermaid ou texto eh muito mais util do que lista de constraints. Se o projeto usa soft deletes, explique a convencao aqui.

**Cubra:** foreign key relationships, semantica das tabelas de join, relacoes polimorficas se houver
**NAO escreva:** definicoes SQL de FOREIGN KEY — o schema file ja tem isso

### Indexes
Quais indices existem alem do default de primary key, e qual query cada indice foi criado para otimizar. Um indice sem contexto de uso eh metadado inutil — "INDEX em users(email) para login lookup" eh mais valioso do que apenas listar o indice.

**Cubra:** lista de indices com contexto de uso, hints de query optimization para joins frequentes
**NAO escreva:** indices de primary key e unique constraint (redundante com a secao Tables)

### Migration History
Um ponteiro para o diretorio de migrations e a versao atual do schema. Se o projeto usa versionamento de schema (Rails schema_version, Prisma migrations), documente o numero da ultima migracao rodada em producao. Mencione se existe processo de rollback documentado.

**Cubra:** link para diretorio de migrations, versao atual do schema, ultima migracao em producao
**NAO escreva:** historico completo de todas as migrations — aponte para o diretorio

## Stack-specific

### Rails
`db/schema.rb` eh a fonte mais legivel — prefer-o sobre as migrations individuais para entender o estado atual. `db/migrate/` contem o historico de mudancas. `ActiveRecord::Schema.define(version:)` da a versao atual.

### Next + React
Geralmente Prisma com `prisma/schema.prisma`. O modelo Prisma define tabelas (model), campos e relacoes. `prisma migrate status` da o estado das migrations. Se usa Drizzle, o schema fica em arquivos TypeScript tipicamente em `db/` ou `drizzle/`.

### Node + TypeScript
Prisma, Drizzle, ou Knex sao os mais comuns. Knex usa `knexfile.ts` + migrations em `migrations/`. Drizzle usa `drizzle.config.ts` com schema em TypeScript. Verifique package.json para identificar qual ORM esta sendo usado.

## Links obrigatorios

`ARCHITECTURE.md` — o banco de dados eh um componente do sistema. O link entre o schema e a arquitetura ajuda o leitor a entender qual parte do sistema possui cada conjunto de dados.

`docs/SECURITY.md` — dados sensiveis (PII, credenciais, tokens) que aparecem no schema devem ser mapeados na postura de seguranca. O link garante que colunas com dados sensiveis estejam documentadas nos dois lugares.

## Quando deixar TODO

Se o projeto nao usa banco relacional (usa somente Redis, DynamoDB, ou outro NoSQL), deixe `TODO(<non-relational-db>): projeto nao usa banco relacional — este doc pode ser adaptado para documentar o schema NoSQL ou removido`. NAO tente documentar schema SQL para um projeto que nao tem.

## Anti-patterns

- NAO manter este doc desatualizado por mais de uma sprint apos migrations — marque a data de geracao explicitamente
- NAO incluir dados de seed ou dados de teste aqui — pertence a scripts de seed
- NAO repetir a definicao completa de cada tabela em SQL — link para o schema file
- NAO descrever indices sem contexto de qual query eles servem — indice sem contexto nao guia ninguem

# Query Planning, Particionamento e Detecção de Gap — Referência Detalhada

Diagnosticar e moldar como o banco executa uma query: ler o plano que o planner escolheu (`EXPLAIN`), dividir uma tabela grande em partições físicas para que o planner toque só o relevante (partition pruning), e reconstruir um universo esperado para isolar o que está faltando (recursive CTE + anti-join). Três camadas do mesmo problema — entender e controlar o trabalho que o banco faz por baixo do SQL.

Esta reference cobre **plano, layout físico e geração de séries**. Para *índices* — por que existem, tipos e o trade-off read↔write que decide se uma condição vira Index Cond ou Filter — remeta a `sql-indexing-and-storage.md` (irmã). Para *garantias transacionais e durabilidade* (o que `EXPLAIN ANALYZE UPDATE` modifica de verdade, o que um commit garante) remeta a `sql-acid-and-durability.md` (irmã).

---

## Ler o plano — EXPLAIN

> ✅ **Referência oficial PostgreSQL.** Conteúdo extraído de docs.postgresql.org e conferido contra a doc oficial (sign-off humano, 2026-06-17).

O plano é uma árvore de custos estimados que o planner minimiza; o que importa diagnosticar é se as estimativas batem com a realidade — e saber quais divergências são erro e quais são só artefato de exibição.

### O conceito

Todo query recebido pelo PostgreSQL ganha um **query plan**: o planner escolhe como executar a query a partir da estrutura dela e das propriedades dos dados. `EXPLAIN` mostra esse plano sem rodar a query. Ler plano "é uma arte que exige experiência" — mas a base é mecânica.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

A estrutura é uma **árvore de plan nodes**. Na base ficam os scan nodes (retornam linhas cruas da tabela); acima deles, nós que fazem join, agregação, ordenação. Cada nó vira uma linha na saída, e a indentação (`->`) reflete a hierarquia. A primeira linha — o nó topo — carrega o custo total estimado do plano inteiro, e **é esse número que o planner busca minimizar**.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

**REGRA:** o custo de um nó superior inclui o custo de todos os seus filhos. Então o custo "próprio" de um nível é a diferença entre ele e o filho. Leia de baixo (scans) para cima (operações compostas).
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

Por padrão a saída é o formato `text`, compacto para humanos; para alimentar um programa, use os formatos machine-readable (XML, JSON, YAML).
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1. Using EXPLAIN

### Anatomia da linha de custo

```
Seq Scan on tenk1 (cost=0.00..445.00 rows=10000 width=244)
```

Os quatro números, da esquerda para a direita:
- **cost=startup..total** — `startup` é o tempo antes de a primeira linha sair (ex.: ordenar num sort node); `total` assume o nó rodando até o fim (todas as linhas recuperadas).
- **rows** — número estimado de linhas **emitidas** pelo nó. Esse é o ponto que mais confunde: **não é o número escaneado**, e sim o emitido após filtragem — frequentemente menor que o escaneado.
- **width** — largura média estimada das linhas, em bytes.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

**REGRA:** custos são unidades arbitrárias, não milissegundos. A prática tradicional mede em disk page fetches: `seq_page_cost` = 1.0 por convenção, os outros parâmetros relativos a ele (`cpu_tuple_cost` = 0.01 default). O custo só reflete o que o planner controla — **não** inclui converter saída para texto nem transmitir ao cliente, porque o planner não muda esses fatores alterando o plano. Use o custo para **comparar planos**, nunca como estimativa de tempo de relógio.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

### Tipos de scan node

O tipo de scan diz o que está acontecendo na base da árvore:

- **Seq Scan** — varre toda a tabela sequencialmente. Aparece sem WHERE ou quando o filtro casa muitas linhas. Um WHERE vira uma linha `Filter:` anexada: checa a condição linha a linha, reduz as linhas **emitidas**, mas **não reduz o custo** (ainda visita todas) — e até sobe um pouco pelo CPU extra.
- **Bitmap Heap Scan** (com **Bitmap Index Scan** filho) — plano de dois passos: o filho visita o índice para achar as localizações, o nó superior busca as linhas; o "bitmap" ordena as localizações em ordem física antes de ler, para minimizar o custo de fetches separados. Mais caro que sequencial por página, mas mais barato que Seq Scan porque visita menos páginas.
- **Index Scan** — busca as linhas em ordem de índice. Surge para pouquíssimas linhas (tipicamente uma), onde ordenar localizações não compensa; também quando há `ORDER BY` que casa a ordem do índice (dispensa um Sort extra).
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

### Filter × Index Cond — onde a condição cai

A mesma condição WHERE aparece como `Index Cond:` (resolvida **dentro** do índice, restringe o que é lido) ou como `Filter:` (checada nas linhas já buscadas). Se a coluna não está no índice, ela vira **Filter** — reduz linhas emitidas mas não o trabalho de leitura, e até sobe o custo. É a explicação concreta para "tenho índice mas a query continua lenta": a condição virou Filter, não Index Cond. (Decisão de mover uma condição de Filter para Index Cond e o trade-off read↔write: ver `sql-indexing-and-storage.md`.)
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

### O planner já escolheu o menor custo que conhecia

O planner gera variantes (Seq/Index/Bitmap Scan, Nested Loop, Hash Join, Merge Join) e seleciona a de menor custo total estimado. Mudar a seletividade do WHERE ou adicionar LIMIT pode fazê-lo trocar de plano. Para inspecionar uma alternativa, force-o com as enable/disable flags (ex.: `SET enable_seqscan = off`) — ferramenta crua mas útil; muitas flags só **desencorajam** o nó (não proíbem), e quando um nó desabilitado aparece o EXPLAIN sinaliza com `Disabled: true`.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics

### EXPLAIN × EXPLAIN ANALYZE

`EXPLAIN` sozinho mostra **só estimativas** e não roda a query. `EXPLAIN ANALYZE` **executa a query** e adiciona, por nó, os valores reais ao lado das estimativas:

```
Nested Loop (cost=4.65..118.50 rows=10 width=488) (actual time=0.017..0.051 rows=10.00 loops=1)
```

O `actual time` está em milissegundos reais; o `cost` em unidades arbitrárias — **por isso não se correspondem**. A coisa mais importante a olhar geralmente é se as contagens de linhas **estimadas** estão próximas das **reais**. ANALYZE também expõe `Planning Time` (gerar/otimizar o plano, sem parsing/rewriting) e `Execution Time` (inclui start-up/shutdown do executor e triggers, sem parsing/rewriting/planning).
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE

**REGRA — `loops > 1`:** no lado interno de um nested loop, que roda uma vez por linha externa, os valores de `actual time` e `rows` exibidos são **médias por execução** — multiplique por `loops` para o total real.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE

**REGRA — divergência estimado × real = sinal de estatística ruim.** As estimativas vêm de estatísticas amostrais geradas pelo comando `ANALYZE` (amostras aleatórias, não exatas) e podem mudar a cada ANALYZE. No exemplo da doc as estimativas estavam exatas, mas isso "é bem incomum na prática". Uma divergência grande num nó aponta estatísticas desatualizadas ou estimativa de seletividade ruim — que levam o planner a escolher o plano errado. O primeiro reflexo: rodar `ANALYZE` na tabela e re-verificar.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE

**BUFFERS — I/O por nó.** A opção `BUFFERS` mostra buffers `hit` (cache), `read` (disco), `dirtied` e `written` para o nó e seus filhos. ANALYZE habilita BUFFERS implicitamente; desligue com `EXPLAIN (ANALYZE, BUFFERS OFF)`. Comparar `read` (disco) contra `hit` (cache) revela se a lentidão é cache miss.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE

### Caveats — a parte que mais engana

**1. ANALYZE roda a query de verdade.** Efeitos colaterais acontecem normalmente, mesmo com os resultados descartados. Para analisar uma query que modifica dados sem alterar as tabelas, envolva em transação: `BEGIN; EXPLAIN ANALYZE UPDATE ...; ROLLBACK;`. (Em comandos de modificação, o trabalho real é feito por um nó topo Insert/Update/Delete/Merge, mas o planner **não soma** esse custo às estimativas, porque é o mesmo para todo plano correto.) (Garantias da transação e do ROLLBACK: ver `sql-acid-and-durability.md`.)
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE

**2. Overhead de medição.** Tempos do EXPLAIN ANALYZE divergem da execução normal de duas formas: custos de transmissão de rede **não** são incluídos (nenhuma linha vai ao cliente; nem conversão de I/O salvo se `SERIALIZE`); e o overhead de instrumentação pode ser significativo, especialmente onde `gettimeofday()` é lento — meça com `pg_test_timing`.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.3. Caveats

**3. Não extrapole de tabela-brinquedo.** Resultados numa tabela pequena não se aplicam a tabelas grandes — as estimativas de custo do planner não são lineares, e ele pode escolher um plano diferente conforme o tamanho. Caso extremo: numa tabela que ocupa uma só página de disco, quase sempre se obtém Seq Scan, haja índice ou não.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.3. Caveats

**REGRA — 4. Discrepâncias estimado×real que NÃO são erro** (só forma de exibir):
- **LIMIT / parada antecipada:** o custo e as linhas estimados do nó são mostrados como se rodasse até o fim, mas o nó parou cedo — actual fica menor; é discrepância de exibição, não erro.
- **Merge join:** pode parar de ler uma entrada quando a outra se esgota, ou re-escanear o filho interno para chaves duplicadas da externa — o ANALYZE conta essas re-emissões como linhas reais adicionais, inflando a contagem do filho interno.
- **BitmapAnd / BitmapOr** sempre reportam `rows=0` real, por limitação de implementação.
- Nós que o executor determinou não rodar (filhos de Append/MergeAppend sobre tabela particionada) são omitidos, com a anotação `Subplans Removed: N`.
> fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.3. Caveats

### Anti-patterns — EXPLAIN

- **Ler `rows` como linhas escaneadas** quando é o número emitido (pós-filtro) — leva a interpretar mal a seletividade.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics
- **Tratar `cost` como milissegundos** ou somar custos esperando obter duração — é unidade arbitrária; tempo real só com ANALYZE.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics
- **Esperar que adicionar WHERE com Filter reduza o custo do Seq Scan** — o filtro reduz linhas emitidas, não escaneadas, e o custo até sobe pelo CPU extra.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics
- **Assumir que "tenho índice na query" basta** — se a coluna do WHERE não está no índice, vira Filter (não Index Cond) e o ganho de leitura não acontece.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.1. EXPLAIN Basics
- **Ler `rows` do lado interno de um nested loop como total** sem multiplicar pelos `loops` — são médias por execução.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE
- **Rodar `EXPLAIN ANALYZE UPDATE/DELETE` esperando simulação** — os dados são modificados de verdade salvo se houver ROLLBACK.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.2. EXPLAIN ANALYZE
- **Extrapolar plano/custo de tabela de teste pequena para produção grande** — o planner pode escolher outro plano em volume diferente.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.3. Caveats
- **Concluir "erro de estimativa" ao ver actual < estimated sob LIMIT, actual inflado num merge join com duplicatas, ou rows=0 num BitmapAnd/BitmapOr** — são artefatos de exibição conhecidos.
  > fonte: PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html | seção: 14.1.3. Caveats

---

## Particionar a tabela — Table Partitioning

> ✅ **Referência oficial PostgreSQL.** Conteúdo extraído de docs.postgresql.org e conferido contra a doc oficial (sign-off humano, 2026-06-17).

Particionar troca a complexidade de gerir N tabelas físicas pelo ganho de só tocar as partições relevantes — vale apenas quando a tabela é grande o suficiente e as queries filtram pela partition key.

### O conceito

Particionamento é dividir o que é **logicamente uma tabela única** em **peças físicas menores**. A tabela "particionada" vira virtual (sem storage próprio); o storage vive nas partições, que são tabelas comuns. Cada linha inserida é roteada para a partição certa pelo valor da partition key.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.2. Declarative Partitioning

Os benefícios que a doc enumera, em ordem de peso prático:

- **Performance de query via pruning.** Quando a maioria das linhas acessadas está em uma ou poucas partições, o particionamento substitui os níveis superiores da árvore de índices, aumentando a chance de as partes mais usadas caberem em memória.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview
- **Seq scan barato em vez de index scan caro** quando a query acessa grande parte de uma única partição — evita o random-access espalhado pela tabela inteira.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview
- **Bulk load/delete instantâneo.** Dropar uma partição com `DROP TABLE` ou `ALTER TABLE DETACH PARTITION` é muito mais rápido que um DELETE em massa — e evita inteiramente o overhead de VACUUM que um bulk DELETE causaria.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview
- **Tiering de storage.** Dados pouco usados podem migrar para mídia mais barata e lenta.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

**REGRA:** esses benefícios só compensam normalmente quando a tabela seria de outra forma muito grande. O limiar exato depende da aplicação, mas a regra de bolso é que o tamanho da tabela deve exceder a memória física do servidor. (O argumento working set × RAM — fazer as partes mais usadas dos índices caberem em memória: ver `sql-indexing-and-storage.md`.)
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

### As 3 formas

**Range** — partições por faixas contíguas e **não-sobrepostas** de uma chave (datas, faixas de IDs). Limites são inclusivos embaixo e **exclusivos em cima**: se uma partição vai de 1 a 10 e a próxima de 10 a 20, o valor 10 cai na segunda.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

**List** — particiona **listando explicitamente** quais valores de chave aparecem em cada partição (regiões, status, categorias).
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

**Hash** — particiona por **modulus + remainder**: cada partição guarda as linhas cujo hash da chave dividido pelo modulus produz o remainder especificado.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

Se nenhuma dessas formas serve, a doc aponta `inheritance` e views `UNION ALL` como alternativas — mais flexíveis, mas sem alguns benefícios de performance da declarative built-in.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

### Declarative vs inheritance

A **declarative** é a forma recomendada para a maioria dos casos: roteamento automático de linhas, índices e constraints "virtuais" propagados às partições. A limitação é rigidez — partições devem ter exatamente as mesmas colunas do pai, e não dá para converter tabela regular em particionada (mas dá para `ATTACH`/`DETACH PARTITION`).
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.2. Declarative Partitioning

A **inheritance** só se justifica quando você precisa de colunas extras nas filhas, herança múltipla, ou um esquema de divisão fora de range/list/hash — ao custo de DDL substancial, CHECK constraints manuais e roteamento via trigger/rule, que é **muito mais lento** que o tuple routing interno da declarative.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.3. Partitioning Using Inheritance

### Partition pruning

Pruning é a técnica que entrega o ganho de performance: o planner examina a definição de cada partição e **prova** que ela não pode conter linhas que satisfaçam o WHERE — quando prova, exclui (prunes) a partição do plano. Sem pruning, a query escanearia todas as partições.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.4. Partition Pruning

Dois fatos não-óbvios:

1. **O pruning é dirigido pelos partition bounds, não por índices.** Não é preciso criar índice na partition key só para o pruning funcionar; índice ajuda apenas se a query lê uma parte pequena de uma partição.
   > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.4. Partition Pruning
2. **Pruning roda no plan-time E no execution-time.** O pruning em execução cobre valores só conhecidos em runtime (parâmetros de PREPARE, subqueries, nested loop joins parametrizados). Partições podadas na init não aparecem no EXPLAIN (vê-se via "Subplans Removed"), mas continuam locked no começo da execução.
   > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.4. Partition Pruning

**REGRA:** controla-se com `enable_partition_pruning` (default `on`). Desligá-lo faz a query escanear tudo. Para verificar se o pruning está ocorrendo, use `EXPLAIN`/`EXPLAIN ANALYZE` comparando os planos — a anotação `Subplans Removed: N` é a evidência (ver a seção EXPLAIN acima).
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.4. Partition Pruning

**Constraint exclusion** é o primo do pruning para inheritance: usa as **CHECK constraints** (não os bounds), só roda no plan-time, e é mais lenta. O default recomendado de `constraint_exclusion` é o valor intermediário `partition`. Só funciona com WHERE de constantes/parâmetros externos — uma comparação contra `CURRENT_TIMESTAMP` (não-imutável) não otimiza.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.5. Partitioning and Constraint Exclusion

### Quando particionar

Particione quando a tabela for **grande o suficiente** para justificar e as queries filtrarem pela partition key:

- A tabela seria de outra forma muito grande — regra de bolso: maior que a RAM física do servidor.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview
- As linhas mais acessadas se concentram em poucas partições (pruning entrega o ganho).
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview
- O padrão de uso envolve **remover/adicionar blocos periodicamente** — desenhe a partição de forma que todo dado a remover de uma vez esteja em uma única partição, para dropar/detach em vez de DELETE.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

**REGRA — a partition key é a decisão mais crítica:** priorize as colunas que mais aparecem em WHERE (para o pruning disparar), respeitando requisitos de PK/UNIQUE e o padrão de remoção de dados.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning

### Quando NÃO particionar

A doc é explícita: **os benefícios só compensam quando a tabela seria de outra forma muito grande.** Abaixo desse limiar, o overhead não se paga.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview

E partições **demais** trazem o custo oposto: planning mais longo, maior consumo de memória durante planning e execution, e crescimento do consumo de memória do servidor ao longo do tempo — porque **os metadados de cada partição são carregados na memória local de cada sessão que a toca**. O planner lida bem com até alguns milhares de partições *desde que* as queries permitam podar tudo menos um pequeno número.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning

**REGRA anti-dogma:** **"never just assume that more partitions are better than fewer partitions, nor vice-versa."** Workloads data-warehouse toleram mais partições que OLTP (planning é fração menor do tempo total). E decida cedo: re-particionar grandes volumes é dolorosamente lento.
> fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning

### Árvore de decisão — particionar?

```
Particionar esta tabela?
│
├── A tabela é grande o suficiente? (regra de bolso: > RAM física do servidor)
│     NÃO → NÃO PARTICIONE. O overhead de planning/memória não se paga.
│     SIM ↓
│
├── As queries filtram por alguma coluna de forma que poucas partições
│   sejam tocadas por vez?
│     NÃO → particionamento não vai podar nada; reconsidere (sem pruning não há ganho).
│     SIM ↓
│
├── Precisa de colunas extras nas filhas / herança múltipla / divisão fora de range-list-hash?
│     SIM → INHERITANCE (DDL manual, triggers/rules lentos, CHECK manuais).
│     NÃO → DECLARATIVE (recomendado) ↓
│
├── Que forma? (escolha a partition key pelas colunas mais frequentes em WHERE)
│     ├── chave ordenável, queries por intervalo (datas, IDs), dropar blocos contíguos
│     │     → RANGE (limite inferior inclusivo, superior exclusivo)
│     ├── conjunto discreto e fechado de valores (regiões, status)
│     │     → LIST
│     └── distribuição uniforme, sem fronteiras naturais, cardinal pode crescer muito
│           → HASH (modulus + remainder, número razoável de partições)
│
└── Quantas partições?
      · poucas demais → índices grandes, baixa localidade, cache hit ruim
      · muitas demais → planning longo + memória (metadados por partição por sessão)
      → alvo: queries típicas podam tudo menos um pequeno número.
        OLTP tende a menos; data-warehouse tolera mais. Simule o workload.
        Decida CEDO — re-particionar grandes volumes é muito lento.
```
> fonte (toda a árvore): PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview + 5.12.6. Best Practices for Declarative Partitioning

### Anti-patterns — particionamento

- **Particionar uma tabela que não é grande o suficiente.** Os benefícios só compensam quando a tabela seria de outra forma muito grande; abaixo do limiar (regra de bolso: RAM física do servidor), só sobra overhead.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.1. Overview
- **Assumir cegamente que "mais partições é melhor" (ou o contrário).** A doc rejeita os dois dogmas — partições demais custam planning e memória (metadados por sessão).
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning
- **Escolher a partition key por uma coluna que raramente aparece no WHERE** — o pruning não dispara e o overhead não se paga.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning
- **Particionar por LIST numa dimensão cujo cardinal pode explodir** (ex.: um cliente por partição, com risco de virar muitos clientes pequenos) — a doc recomenda HASH com número razoável de partições nesse caso.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning
- **Definir faixas sobrepostas no range partitioning** (ou usar `BETWEEN` nas CHECK do inheritance, ex.: 100–200 e 200–300) — fica ambíguo a qual partição o valor de borda pertence; use limite superior exclusivo.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.3. Partitioning Using Inheritance
- **Deixar `enable_partition_pruning` desabilitado em produção** — a query escaneia todas as partições; o default é `on` por boa razão.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.4. Partition Pruning
- **Criar índice na partition key "só para o pruning funcionar"** — o pruning depende dos bounds, não de índices.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.4. Partition Pruning
- **Fazer `ATTACH PARTITION` sem CHECK constraint pré-existente casando o bound** — força um scan da tabela inteira sob ACCESS EXCLUSIVE lock.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.2. Declarative Partitioning
- **Adiar a decisão de particionamento até a tabela já estar enorme** — re-particionar grandes volumes é dolorosamente lento; decida cedo e simule o workload.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.6. Best Practices for Declarative Partitioning
- **Usar muitos milhares de filhos no inheritance partitioning** — funciona bem até ~100 filhos; examinar CHECK de todos faz o planning escalar mal.
  > fonte: PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html · seção: 5.12.5. Partitioning and Constraint Exclusion

---

## Detectar o que falta — recursive CTE + anti-join

O banco gera o universo esperado e elimina o que existe — o que sobra é o gap. Uma query, sem loop na aplicação.

### O conceito

O problema é "o que está faltando": você tem N registros esperados numa sequência externamente controlada (webhooks, pedidos de plataforma SaaS, IDs sequenciais) mas só N−k aparecem na tabela. Falta achar os k ausentes. A técnica tem dois movimentos: (1) gerar o universo completo de valores esperados com `WITH RECURSIVE`; (2) aplicar um anti-join (`LEFT JOIN ... WHERE IS NULL`) contra a tabela real para isolar os ausentes.
> fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

**REGRA — a pré-condição é forte:** a sequência precisa ser contígua e reconstruível por fórmula, e você precisa conhecer N (o total esperado). Sem isso, não há "gap" reconstruível para detectar.
> fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

Um detalhe do caso real que motiva a fórmula: serviços externos (ex.: LemonSqueezy) geram o número de pedido como concatenação `<store_id><n>`, onde `n` é um contador sequencial — um namespacing multi-tenant, cada loja com seu próprio espaço de sequência. O formato aparentemente estranho (`010` depois de `09`) é consequência de concatenar a *string* do store ID com um *inteiro* crescente, não de zero-padding.
> fonte: Aaron Francis | SQL for fun and profit | seção: The externally generated order numbers

Por isso a reconstrução usa `CONCAT(store_id, n)` com `n` inteiro — nunca tratar o número completo como inteiro nem ordená-lo lexicograficamente (`09` > `010` na ordem de string).
> fonte: Aaron Francis | SQL for fun and profit | seção: The externally generated order numbers

### A técnica

`WITH RECURSIVE` declara uma CTE autorreferente — mesma sintaxe em SQLite, MySQL e Postgres. A palavra `RECURSIVE` é o que instrui o banco a tratar a CTE como autorreferente.
> fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

A CTE recursiva tem duas partes ligadas por `UNION ALL`:

- **Anchor row** — o primeiro `SELECT`. Define o ponto de partida e os nomes/tipos de coluna de toda a CTE. Deve retornar **exatamente uma linha** com os valores iniciais de todos os contadores/estados. Aqui: `order_number` é o primeiro número real, `n` é o contador que começa em 1.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **Passo recursivo** — o segundo bloco, que faz `SELECT ... FROM <nome_da_cte>`: lê da própria tabela em construção. Em cada iteração acessa apenas as linhas geradas na iteração anterior (não o acumulado inteiro): lê `n` da iteração anterior e produz `n+1`. O `WHERE n < N` é o critério de parada.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

Gerado o universo, o **anti-join** isola o que falta. `LEFT JOIN` preserva todas as linhas do universo esperado; quando não há match na tabela real, as colunas dela ficam NULL. Filtrar por `orders.id IS NULL` isola exatamente os números sem pedido correspondente. **Use uma coluna NOT NULL (a PK) no `IS NULL`** — nunca uma coluna que possa ser genuinamente NULL mesmo em linhas com match.
> fonte: Aaron Francis | SQL for fun and profit | seção: Joining to find the gap

O padrão completo (gera os 741 números esperados e retorna só o que não tem correspondência; roda igual em SQLite, MySQL e Postgres):
> fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

```sql
WITH RECURSIVE all_order_numbers AS (
  SELECT
    <first_order_number> AS order_number,
    1 AS n
  UNION ALL
  SELECT
    CONCAT(<store_number>, n + 1),
    n + 1
  FROM all_order_numbers
  WHERE n < 741
)
SELECT *
FROM all_order_numbers
LEFT JOIN orders
  ON all_order_numbers.order_number = orders.order_number
WHERE orders.id IS NULL;
```

**Generalização — datas.** O mesmo padrão vale para qualquer sequência contígua esperada, não só números. Para gaps de datas: gerar com `WITH RECURSIVE` todas as datas do período (incrementando dia a dia, com `DATE_ADD` ou `date(date, '+1 day')` conforme o banco) e fazer `LEFT JOIN` na tabela de fatos. Dias sem dados ficam `IS NULL` e aparecem no resultado — útil em séries temporais onde **ausência de dado é dado relevante** (um dia sem vendas deve aparecer como zero, não sumir).
> fonte: Aaron Francis | SQL for fun and profit | seção: Generalization

### Quando usar

- Há suspeita de registro faltante em sequência externamente controlada (webhook perdido, pedido ausente de plataforma SaaS, IDs sequenciais) **e** a sequência pode ser reconstruída por fórmula conhecida.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- Relatórios de série temporal onde dias/semanas/meses sem evento devem aparecer explicitamente (com zero ou NULL) em vez de serem omitidos; e auditoria de completude de dados.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Generalization
- Genericamente, sempre que precisar achar "o que está faltando": registros de um universo esperado que não existem na tabela real. O anti-join `LEFT JOIN ... WHERE B.<pk> IS NULL` é a forma legível e portável — alternativa a `NOT IN` e `NOT EXISTS`.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Joining to find the gap
- Para gerar a sequência: quando precisar de valores que não existem como tabela física **e** o banco não oferece `generate_series` — aí `WITH RECURSIVE` é a ferramenta.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

### Quando NÃO usar

- **Sequência não-contígua por design** (IDs com gaps intencionais, UUIDs): não há "gap" a detectar.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **N (total esperado) é desconhecido**: o `WHERE n < N` exige conhecer N. Se N for dinâmico (o número de pedidos cresce), a query precisa ser parametrizada ou o `WHERE` atualizado.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **Gaps são esperados e irrelevantes** (log de eventos pontuais, sem expectativa de continuidade diária): não force a série completa.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Generalization
- **A coluna do `WHERE IS NULL` pode ser genuinamente NULL mesmo com match**: nesse caso use a PK (nunca nullable) ou prefira `NOT EXISTS`.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Joining to find the gap
- **Para gerar a série, quando os dados já existem como tabela física** ou podem vir de uma função nativa (ex.: `generate_series` no Postgres): a CTE recursiva só adiciona complexidade.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE

### Anti-patterns — recursive CTE / anti-join

- **Omitir o `WHERE` no passo recursivo** → loop infinito: a CTE nunca para de gerar linhas.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **Autorreferenciar a CTE no anchor row** — só o passo recursivo pode fazer `FROM <própria_cte>`; o anchor define os valores iniciais.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **Anchor com tipo errado** (inteiro vs. string): o anchor fixa os tipos de coluna para toda a CTE — tipo errado faz o passo recursivo falhar com erro de tipo.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **`WHERE B.coluna IS NULL` numa coluna nullable** — produz falsos positivos: linhas que têm match aparecem como ausentes. Filtre sempre pela PK.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Joining to find the gap
- **Encontrar o gap "no olho"** (ordenar e inspecionar visualmente) — não escala. Pior ainda: múltiplas queries iterativas em código da aplicação quando uma única query SQL resolve.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Building the recursive CTE
- **Gerar a série de datas em loop na aplicação** (Python/JS) e disparar várias queries — desnecessário quando o banco resolve em uma só.
  > fonte: Aaron Francis | SQL for fun and profit | seção: Generalization
- **Tratar o número de pedido externo `<store_id><n>` como inteiro** ou ordená-lo lexicograficamente sem entender o prefixo — ordenação errada (`09` > `010`). Reconstrua com `CONCAT(store_id, n)`, `n` inteiro.
  > fonte: Aaron Francis | SQL for fun and profit | seção: The externally generated order numbers

---

## Cross-refs

- `sql-indexing-and-storage.md` (irmã) — por que índices existem e o problema do full table scan que o Seq Scan materializa; tipos de índice e o trade-off read↔write que complementa a leitura de Index Scan/Bitmap Scan e a decisão de mover uma condição de Filter para Index Cond; o argumento working set × RAM que define o limiar de particionar.
- `sql-acid-and-durability.md` (irmã) — o que `EXPLAIN ANALYZE UPDATE` modifica de verdade e o que o `ROLLBACK` garante; durabilidade do commit.

## Fontes

- **EXPLAIN** — fonte única oficial: `PostgreSQL Docs | Using EXPLAIN | https://www.postgresql.org/docs/current/using-explain.html` — estrutura do plano como árvore de nodes; anatomia da linha de custo (startup..total / rows / width); custos em unidades arbitrárias; Seq/Index/Bitmap Scan e Filter×Index Cond; planner minimiza custo total e enable/disable flags (14.1.1); EXPLAIN ANALYZE com actual time/rows/loops, divergência estimado×real por estatística amostral, BUFFERS, ANALYZE roda a query (14.1.2); overhead de medição, não-extrapolar de tabela pequena, e discrepâncias legítimas — LIMIT, merge join, BitmapAnd/Or, Subplans Removed (14.1.3). ✅ extraído de doc oficial, conferido contra a doc (sign-off humano, 2026-06-17).
- **Particionamento** — fonte única oficial: `PostgreSQL Docs | Table Partitioning | https://www.postgresql.org/docs/current/ddl-partitioning.html` — conceito e os 4 benefícios, limiar "> RAM física", as 3 formas, inheritance/UNION ALL como alternativas (5.12.1); tabela particionada virtual, ATTACH/DETACH (5.12.2); inheritance e a armadilha do BETWEEN (5.12.3); pruning dirigido por bounds, plan-time E execution-time, `enable_partition_pruning` (5.12.4); constraint exclusion via CHECK, default `partition`, ~100 filhos (5.12.5); escolha da partition key, número de partições, OLTP × data-warehouse, decidir cedo (5.12.6). ✅ extraído de doc oficial, conferido contra a doc (sign-off humano, 2026-06-17).
- **Recursive CTE + anti-join** — fonte única coesa: `Aaron Francis | SQL for fun and profit` — caso real de webhook/pedido perdido resolvido em uma query. Cobre `WITH RECURSIVE` (sintaxe portável SQLite/MySQL/Postgres), anchor row + passo recursivo, anti-join `LEFT JOIN ... WHERE PK IS NULL`, o padrão completo (gerar universo + isolar ausentes), a generalização para sequências de datas, e o formato `<store_id><n>` dos números de pedido externos.

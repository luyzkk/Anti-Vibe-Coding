# Indexação e Storage em SQL — Referência Detalhada

Como o banco evita tocar nas linhas que não importam (índices), que estrutura faz a busca ser logarítmica (B-tree × B+tree), quanto custa manter um índice, e em que substrato físico tudo isso roda (IOPS, NVMe × EBS, storage co-localizado × desagregado).

Esta reference cobre **índices e o storage por baixo deles**. Para *ACID, WAL e durabilidade do SQLite* remeta a `sql-acid-and-durability.md` (irmã). Para *EXPLAIN, plano de query e particionamento na prática* remeta a `sql-query-planning.md` (irmã). Replicação de três cópias e `semi-sync` vivem em `replication-sharding.md`; escolha de banco (SQL × NoSQL) em `database-selection.md`; escala horizontal/vertical em `scalability.md`. Aponte, não repita.

**REGRA central:** o índice não existe para processar linhas mais rápido — existe para que o banco **não toque** nas linhas que comprovadamente não podem conter o resultado. A única otimização que escala é eliminar antes de processar; índice, partição e paralelismo são a mesma ideia vestida de forma diferente.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve

---

## Por que indexar — reduzir o espaço de busca, não acelerar o processamento

O princípio fundamental de performance em banco não é velocidade de processamento das linhas — é **redução do espaço de busca**. Para trabalhar com bilhões de linhas, evite trabalhar com bilhões de linhas: segmente e elimine o que comprovadamente não pode conter o resultado.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve

O problema concreto que o índice resolve é o **full table scan**: sem índice, buscar uma linha em milhões de registros exige percorrer cada página sequencialmente. Para chave única o scan para na primeira ocorrência; para chave não-única percorre tudo — **O(n) no pior caso**. Full scan não é uma estratégia a adotar; é o problema a evitar.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve

O índice é uma **estrutura de dados separada e compacta** que elimina o scan. Ele não guarda os dados completos — guarda chaves organizadas para busca rápida, com ponteiros para onde os dados estão. O fluxo é: buscar no índice (operação rápida numa estrutura pequena) e depois fazer **um único IO** para a página apontada, em vez de ler todas as páginas.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve

### Índice é um dos três mecanismos de redução — não o único

Existem três abordagens distintas para evitar o full scan, cada uma reduzindo o espaço de busca por um mecanismo diferente:
- **Paralelismo** — distribui a busca por threads/máquinas. Custo: coordenação.
- **Particionamento** — divide a tabela por faixas de chave em sub-tabelas, eliminando partições inteiras. Custo: roteamento de query.
- **Índice** — cria a estrutura pequena que aponta direto para a página. Custo: overhead de escrita e espaço em disco.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve

**REGRA de seleção entre os três:** é por gargalo, não por hábito. Se o gargalo é **latência de busca por chave**, o índice é o mais direto; se o gargalo é **volume total de dados**, avalie particionamento antes do índice; se é coordenação/CPU do processamento, paralelismo. Qualquer proposta de otimização que **não reduz o número de linhas/páginas acessadas** está resolvendo o problema errado.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve

### Quando usar índice

- **Busca por valor específico em coluna de alta cardinalidade, em tabela grande.** Caso canônico: muitos valores distintos + volume alto = o índice corta drasticamente as páginas lidas.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
- **Query que hoje faz full scan numa tabela com tendência de crescimento.** Avalie criar o índice **antes** que o volume torne o scan inaceitável — não depois da crise de latência. Use o full scan atual (EXPLAIN mostrando Seq Scan — ver `sql-query-planning.md`) como baseline para medir o ganho.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
- **Constraint de unicidade.** Garantir unicidade (ex.: e-mail único) sem índice custaria O(n) por write. O banco mantém um índice (hash) e a verificação cai para O(1). A constraint *é* um índice por baixo; aqui o índice não é opcional, é o que torna a constraint viável.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega

Nota de substrato: o ganho de uma busca indexada se materializa em **IO aleatório de baixa latência** — o índice te leva a *uma* página, e ler essa página é um acesso aleatório, não sequencial. É por isso que storage rápido para IO aleatório (NVMe/SSD) importa tanto para o padrão que o índice cria (detalhe na seção de storage abaixo).
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

### Quando NÃO usar índice

O índice é sempre um trade-off explícito entre performance de **write** e de **read**. Há casos onde o full scan ganha:

- **Tabela muito pequena** (poucos milhares de linhas). O overhead de manter o índice supera o custo do scan; o banco às vezes prefere o Seq Scan mesmo havendo índice.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
- **Baixa seletividade / baixa cardinalidade.** Índice em coluna com poucos valores distintos (ex.: boolean) pode ser **menos eficiente que o full scan** — se a query retorna metade da tabela, saltar página a página via índice é pior que ler tudo sequencialmente.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
- **Coluna com escrita intensa onde o read não justifica.** Cada índice penaliza todo insert/update. Índice "de graça" não existe.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega
- **O índice (ou índice + dados) não cabe mais em RAM.** Limite onde o índice *para de entregar*: se o traversal precisa ir ao disco, a latência de busca vira imprevisível. Foi o que aconteceu com o Discord em nov/2015 — com 100M de mensagens, dados e índice deixaram de caber em RAM, motivando a migração do MongoDB. Projete a estrutura **antes** do crescimento que excederá a RAM, não depois.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study

Nuance de hardware que reabre o caso "não cabe em RAM": com NVMe local sub-milissegundo para IO aleatório, o working set pode exceder a RAM em 2-5x sem a penalidade histórica. A regra de ouro "nunca deixe o índice ir ao disco" perde força — mas não some: RAM ainda é ~1000x mais rápida que NVMe (~100ns × ~100µs). O limiar de "precisa caber em RAM" sobe; não desaparece.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

### Árvore de decisão — criar índice?

```
Uma query busca por uma coluna e está lenta. Criar índice?
│
├── A tabela é pequena (< alguns milhares de linhas)?
│     → NÃO. O overhead do índice supera o custo do scan. Deixe o Seq Scan.
│
├── O gargalo real é VOLUME TOTAL de dados (não busca por chave)?
│     → Índice não resolve o problema certo. Avalie PARTICIONAMENTO antes.
│       (paralelismo se o gargalo for coordenação/CPU do processamento)
│
└── O gargalo é LATÊNCIA de busca por chave → índice é o mecanismo direto. Continue:
      │
      ├── ALTA cardinalidade (muitos valores distintos) e query seletiva?
      │     ├── SIM → índice justificado. Ganho: 1 busca + 1 IO, em vez de O(n) páginas.
      │     └── NÃO (baixa cardinalidade; query retorna grande % da tabela)
      │           → índice pode ser PIOR que full scan. Não crie por reflexo.
      │
      ├── É constraint de UNICIDADE?
      │     → o índice não é opcional — torna a verificação O(1) em vez de O(n)
      │       por write. Aceite o custo de write.
      │
      └── A coluna sofre escrita intensa?
            → pese: cada índice penaliza TODO insert/update.
              Só crie se o ganho de read justificar (detalhe do custo: seção abaixo).

Em qualquer ramo, projete o CRESCIMENTO:
  · o índice (ou índice+dados) vai exceder a RAM? → latência vira imprevisível.
    Resolva a estrutura ANTES do crescimento (caso Discord/MongoDB), não depois.

Teste de sanidade final (vale para QUALQUER otimização, não só índice):
  · a mudança REDUZ o número de linhas/páginas acessadas?
    → SIM: ataca a causa (espaço de busca).  → NÃO: otimiza o passo errado.
```
> fonte do critério "reduz linhas/páginas acessadas": Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
> fonte do ramo "não cabe em RAM": Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study

**Anti-patterns do porquê:**
- **Otimizar o processamento das linhas encontradas** (ex.: paralelizar o resultado) sem primeiro reduzir quantas linhas chegam. Ataca o sintoma, não o espaço de busca.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
- **Criar índice em toda coluna que aparece em WHERE** sem avaliar seletividade e frequência de escrita.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
- **Começar projeto assumindo "depois eu migro/indexo se precisar"** sem avaliar a estrutura de índice contra o crescimento — caminho direto para a crise tipo Discord/MongoDB, com custo de migração embutido.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study
- **Escolher um índice/estrutura "porque é o que se usa"** sem entender o problema que ele resolve no contexto. Aplicação cega de padrão produz design errado.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why data structures matter (engineering, not interviews)

---

## A estrutura — B-tree × B+tree (a tensão C9)

A escolha da estrutura de índice é um problema de engenharia, não de memorização. Entender *por que* a estrutura existe e que problema resolve é o que permite decidir quando usá-la.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why data structures matter (engineering, not interviews)

### Por que não árvore binária

A árvore binária não se auto-balanceia: inserir em ordem crescente (1, 2, 3, 4…) degenera numa lista encadeada — cada nó só tem filho à direita, O(n) de busca. Como índices reais recebem IDs auto-incremento e timestamps (dados semi-ordenados), o pior caso vira o caso comum.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Binary trees and the balancing problem

A **B-tree** resolve isso: generalização da binária que se reequilibra a cada inserção (todas as folhas no mesmo nível) e admite N filhos por nó, não 2. O grau não é arbitrário: o objetivo é maximizar elementos por página de IO. Postgres deriva o grau do **tipo de dado** da coluna indexada (página típica de 8KB) — índice em INTEGER tem grau diferente de um em UUID/TEXT: tipo largo → menos chaves por página → árvore mais profunda. (Grau 3 é didático e inútil em produção.)
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-trees
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Conclusion

Esse balanceamento tem preço de **escrita**: cada inserção que estoura a capacidade de um nó provoca um *split* — a mediana sobe ao pai, os filhos se redistribuem, gerando IO de página.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-trees

### A tensão C9 — o "absolutismo B+tree" (não a achate)

A crença comum é que **B+tree é sempre superior para bancos**. Ela tem fundamento real — mas a própria fonte trata "B+tree always wins" como conclusão *em evolução*, não axioma fechado, e aponta um contraexemplo concreto: MongoDB usa B-tree. Os dois lados são verdadeiros; a variável que decide qual vence é uma só — **se o índice cabe ou não em RAM**.

#### Lado padrão — por que B+tree é o default em RDBMS

A B-tree tem dois custos estruturais que a B+tree foi criada para eliminar.

**Custo 1 — cada chave carrega seu valor.** No nó B-tree, cada chave guarda chave + valor (ponteiro para o dado). Esse valor ocupa espaço dentro do nó; com página de 8KB, sobra menos espaço para chaves → grau efetivo menor → árvore mais profunda → mais IOs por traversal.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value

**Custo 2 — range queries exigem traversals independentes.** Achar o valor 1 e depois o 3 são dois traversals separados: depois de achar 1, volta-se à raiz e desce de novo para 3. 100 valores → 100 traversals → potencialmente 100 IOs, mesmo logicamente adjacentes. A ordenação lógica na árvore **não** implica sequencialidade no acesso físico.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Range-query problem in B-trees

A **B+tree** ataca os dois:

- **Valores só nas folhas.** Nós intermediários guardam *apenas chaves*; os valores (ponteiros) ficam exclusivamente nas folhas. Isso exige duplicar a chave (aparece no intermediário E na folha), mas os intermediários ficam muito menores → mais chaves por página → traversal mais raso. A duplicação é intencional e seu custo é negligenciável diante do ganho.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B+ trees
- **Folhas ligadas em linked list.** Achado o início do range, segue-se o ponteiro folha→folha sem voltar à raiz: 1→2→3→4→5, potencialmente em páginas contíguas. O custo passa a ser proporcional ao número de **páginas do range**, não ao número de valores.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B+ tree benefit: range queries via leaf pointers

O argumento decisivo é o **RAM-fit**, e é quantitativo. Segundo Postgres, ~99% do custo de um índice B+tree está nas folhas; os nós intermediários (que fazem o traversal) são ~1%. Índice de 100GB → ~1GB de intermediários; índice de 1TB → ~10GB. Um servidor com 256GB de RAM mantém em cache **todos** os nós de traversal de um índice de 1TB — cada busca vira um único IO (para a folha) em vez de vários IOs de traversal.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win

E o reverso é o ponto fino: a B-tree tem problema **"all-or-nothing" de RAM**. Como os valores estão misturados às chaves em todos os níveis, não dá para isolar "qual 1% cachear". Ou se mantém o índice inteiro em RAM, ou queries aleatórias vão buscar valores em disco *durante* o traversal — latência imprevisível. A B+tree é transparente para caching; a B-tree é opaca.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win

#### Lado contra-absolutismo — quando o B-tree poderia ganhar (e o MongoDB)

A própria fonte recusa o axioma. O **único** cenário onde a B-tree poderia ser considerada sobre a B+tree é um workload **estritamente key-value**: sempre buscar exatamente um valor por chave, **nunca** range. Aí a B-tree evita a duplicação de chave e o overhead do linked list. Mesmo assim "B+tree raramente perde" — porque o problema de RAM-fit persiste: a B-tree carrega valores nos nós intermediários, e isso só não dói se o índice couber **inteiro** em memória.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win

O contraexemplo real é o **MongoDB**: a documentação especifica **B-tree** (não B+tree), mesmo sendo considerado primariamente um armazenamento key-value. A fonte lê isso como evidência de que o MongoDB pode ter dificuldade em manter o índice eficientemente em RAM — porque valores misturados com chaves nos intermediários é exatamente o que torna o RAM-fit mais difícil.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study

O caso que materializa o risco é o **Discord**: em novembro de 2015, com ~100 milhões de mensagens, dados e índice deixaram de caber em RAM e a latência ficou imprevisível — levando à migração de MongoDB para Cassandra/ScyllaDB. Sem separação entre nós de traversal e dados, não dá para cachear seletivamente o traversal; qualquer parte do índice pode ir ao disco numa busca.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study

**A resolução de C9 (não achatar):** os dois lados estão certos sob a mesma régua. B+tree é o default correto porque, em quase todo workload de banco (que tem ranges, ORDER BY, ou índices grandes que não cabem em RAM), o RAM-fit previsível e o range sequencial vencem. A B-tree não é "errada" — ela é válida no recorte estreito **key-value puro + índice que cabe inteiro em RAM**, e a escolha do MongoDB só vira problema *quando esse recorte se rompe* (índice excede a RAM). Não é "B+tree ganhou sempre"; é "B+tree ganha exceto num caso que raramente se sustenta em escala". O erro não é usar B-tree — é usá-la **sem verificar RAM-fit** e sem confirmar que o workload nunca terá range.

**REGRA (resolução C9 em uma linha):**
> SE o workload é exclusivamente key-value (nunca range) E o índice cabe completamente em RAM, ENTÃO B-tree é uma alternativa válida. SE qualquer uma dessas condições não se confirmar, ENTÃO B+tree é a escolha mais segura — e é por isso que é o default dos RDBMS.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win

Corolário de produção: na prática você raramente escolhe a estrutura diretamente — Postgres/MySQL já usam B+tree. A decisão real é **dimensionar RAM para os ~1% de nós intermediários** e **não escolher um engine B-tree (MongoDB) para índices que vão exceder a RAM** sem antes medir latência sob pressão de memória.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study

### Árvore de decisão — B-tree × B+tree

```
Preciso indexar uma coluna para evitar full table scan?
│
├── Os dados têm tendência de ordenação (auto-increment, timestamps)?
│     → NÃO use árvore binária simples (degenera p/ O(n)).
│       Use estrutura auto-balanceada (B-tree / B+tree).
│
└── B-tree ou B+tree? — a régua é RAM-fit + presença de range queries.
      │
      ├── O workload tem range queries / BETWEEN / IN contíguo / ORDER BY+LIMIT?
      │     → B+tree. Folhas ligadas = range sequencial sem voltar à raiz.
      │       (custo ∝ páginas do range, não nº de valores)
      │
      ├── O índice NÃO cabe inteiro em RAM?
      │     → B+tree. Intermediários ~1% cabem em cache (traversal em memória,
      │       1 IO p/ folha). B-tree é "all-or-nothing": cache impreciso,
      │       latência imprevisível (ver Discord/MongoDB).
      │
      └── Workload é EXCLUSIVAMENTE key-value (nunca range)
          E o índice cabe COMPLETAMENTE em RAM?
            ├── SIM → B-tree é alternativa válida. Recorte estreito — confirme
            │         que o workload REALMENTE nunca terá range.
            └── NÃO (qualquer condição falha) → B+tree (escolha segura / default RDBMS).

Lembre sempre:
  · Na prática Postgres/MySQL JÁ usam B+tree — a decisão vira dimensionar
    RAM p/ os ~1% de nós intermediários do índice.
  · O grau não é arbitrário: Postgres deriva do TIPO DE DADO (8KB/página).
    Tipo largo (UUID/TEXT) → árvore mais profunda → mais IOs.
```
> fonte do ramo binária: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Binary trees and the balancing problem
> fonte do ramo RAM-fit: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win
> fonte do ramo grau/tipo: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Conclusion

**Anti-patterns de estrutura:**
- **Concluir "meu sistema é key-value, então B-tree"** sem verificar RAM-fit e se o workload *realmente* nunca terá range — o coração de C9.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win
- **Assumir que o buffer pool vai cachear "as partes certas" de um índice B-tree** — sem separação estrutural entre traversal e dados, o cache não tem como priorizar.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Why B+ trees almost always win
- **Assumir que B-tree suporta range eficientemente "porque está ordenada"** — a ordenação lógica não implica sequencialidade física; cada valor é um traversal novo.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Range-query problem in B-trees
- **Tratar "duplicar a chave" na B+tree como problema de redundância** — é intencional, e o custo é negligenciável diante de intermediários compactos.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B+ trees
- **Visualizar B-tree com grau 3 e extrapolar para produção** — em produção o nº de elementos por nó é ordens de magnitude maior; subestima a profundidade real.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: Walkthrough (degree/order 3)

---

## Tipos de índice e seu custo — clustered × secondary, write amplification

Índice acelera leitura ao custo de **espaço + manutenção por escrita**. A semântica do ponteiro (clustered vs secondary) define o tamanho do índice; o rebalanceamento da árvore define o custo por insert. Os dois somados são a "amplificação de escrita" que você paga por linha gravada.

### Clustered × secondary — e o que o ponteiro carrega

A distinção que mais impacta o custo de armazenamento é **o que cada entrada do índice aponta** — e isso difere entre engines:

- **Postgres trata todos os índices como secundários.** Cada entrada aponta para o **tuple ID** (a localização física na heap). Não há índice clustered no sentido do MySQL — o dado vive separado em todos os casos.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value
- **MySQL (InnoDB) tem clustered index:** o dado real fica armazenado **nas folhas do índice primário**. Os índices **secundários** não apontam para o dado — armazenam a **primary key** como ponteiro, e fazem um segundo lookup pela PK para chegar ao dado.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value

A consequência prática é o ponto não-óbvio: no MySQL, **o tamanho da primary key se propaga para todos os índices secundários**. Se a PK for um GUID de 16 bytes, cada índice secundário fica proporcionalmente maior, porque cada entrada secundária carrega a PK inteira como ponteiro. PK inteira sequencial (BIGINT AUTO_INCREMENT) mantém os secundários compactos.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value

**REGRA:** em MySQL, escolher a PK é escolher o overhead de todos os índices da tabela. Em Postgres essa preocupação não aparece (ponteiro é sempre o tuple ID, tamanho fixo).

### O valor dentro do nó evita o segundo IO (mecanismo "covering")

Quando o **valor** (ou o dado necessário) já está armazenado junto da chave no nó, a busca **acessa o dado direto, sem precisar fazer o lookup extra** — eliminando o segundo IO (pela PK no MySQL, ou o salto à heap no Postgres). O custo simétrico: carregar valor no nó reduz quantas chaves cabem por página.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value

> **Nota de terminologia:** a fonte **não usa o termo "covering index"** — ela descreve o *mecanismo* (valor no nó dispensa o lookup). "Covering index" é o nome consagrado desse mecanismo quando o índice contém todas as colunas que a query precisa (a query é respondida só pelo índice). Use o termo como ponte para a literatura, não como afirmação citada da fonte.

### Índice composto e range — o que torna um índice "ordenável"

Um índice (em B+tree) não serve só para igualdade. As folhas são encadeadas em linked list, então depois de achar o início de um range você segue sequencialmente sem voltar à raiz — o custo de um range vira função do **número de páginas do range**, não do número de valores. É isso que faz índice servir para `BETWEEN`, `IN` com valores contíguos e `ORDER BY ... LIMIT`.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B+ tree benefit: range queries via leaf pointers

Implicação para índice composto: a ordem das colunas no índice define quais ranges e ordenações ele cobre sequencialmente — a propriedade de "seguir o ponteiro entre folhas" só vale na ordem em que o índice foi construído.

### O custo: write amplification

Ler é o lado barato. O preço do índice é pago **toda vez que você escreve**, e vem de duas fontes que se somam.

**Fonte 1 — rebalanceamento (page splits).** Cada inserção que excede a capacidade de um nó provoca um **split** — a mediana sobe ao pai, os filhos são redistribuídos, e isso é **IO de página adicional**. O anti-pattern de fundo é assumir que "a árvore se auto-balanceia" significa escrita grátis — a frase esconde o custo real de IO nos splits.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-trees

**Fonte 2 — cada índice é mais uma estrutura a manter.** Cada índice secundário é uma cópia ordenada que precisa ser atualizada a cada insert/update/delete da coluna indexada. No MySQL isso é amplificado pela escolha de PK: PK grande (GUID) infla **cada** secundário, então a amplificação escala com o número de índices × o tamanho da PK. E há o custo dentro do nó: carregar valor junto da chave (o que viabiliza covering) **reduz o grau efetivo da árvore** — menos chaves por página, mais profundidade, mais IOs por traversal.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value

**A unidade física do custo: a página.** Toda essa amplificação é medida em **páginas inteiras**, não em bytes. A unidade de I/O de um engine SQL é a página de tamanho fixo — leitura e escrita operam sobre a página inteira. Modificar uma linha indexada reescreve a(s) página(s) do índice afetada(s) por completo. (Mecânica de WAL e como a página é persistida: ver `sql-acid-and-durability.md`.)
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: What is WAL mode

### Tabela-resumo — tipos de índice

| Eixo | Postgres | MySQL (InnoDB) |
|---|---|---|
| O que o ponteiro carrega | tuple ID (localização na heap), tamanho fixo | dado nas folhas do clustered; secundários carregam a **PK** |
| PK grande (GUID) infla secundários? | não (ponteiro independe da PK) | **sim** — cada secundário cresce com a PK |
| Covering possível? | sim (dado da query no próprio índice → sem salto à heap) | sim (evita o segundo lookup pela PK) |
| Custo por write | split + atualização de cada índice afetado | split + atualização de N secundários × tamanho da PK |

> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value

**Caveat MongoDB (B-tree).** O MongoDB documenta uso de **B-tree, não B+tree** — valores misturados às chaves nos nós intermediários, o que torna o índice mais difícil de manter em RAM em escala. Aqui isso é só uma ressalva ao custo: a estrutura escolhida muda quanto do índice precisa caber em memória. O debate estrutural completo está na seção C9 acima.
> fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: MongoDB, Discord case study

### Árvore de decisão — criar/manter este índice

```
Vou criar / manter este índice?
│
├── 1. A query é seletiva? (ALTA cardinalidade, poucos resultados / total)
│     ├── NÃO (boolean, status, baixa cardinalidade) → NÃO indexe.
│     │      full scan pode ser mais barato; índice penaliza write sem pagar read.
│     └── SIM → continue.
│
├── 2. A coluna sofre escrita intensa (insert/update frequente)?
│     ├── SIM → conte o custo: cada write = split possível + atualização de N secundários.
│     │         Monitore page splits. Indexe só se a leitura justificar a amplificação.
│     └── NÃO (read-mostly) → índice é barato de manter. Siga.
│
├── 3. Que TIPO de acesso a query faz?
│     ├── Igualdade por chave única → índice simples basta.
│     ├── Range / ORDER BY / BETWEEN → índice B+tree (folhas em linked list);
│     │      em índice COMPOSTO, ordene as colunas pela ordem do range/sort.
│     └── Lê sempre as mesmas poucas colunas → considere COVERING
│            (todas as colunas no índice; elimina o lookup ao dado),
│            aceitando nó mais gordo (menos chaves/página, +profundidade).
│
└── 4. É MySQL com vários índices secundários?
      → a PRIMARY KEY é o multiplicador do custo:
        ├── PK = BIGINT sequencial → secundários compactos. OK.
        └── PK = GUID (16 bytes)   → cada secundário incha proporcionalmente.
                                     Reavalie a PK ANTES de adicionar índices.
      (Postgres: ponteiro é sempre o tuple ID — este passo não se aplica.)

Lembrete de custo: a unidade de write amplification é a PÁGINA inteira,
  não o byte. NVMe subiu o limiar de "precisa caber em RAM" (2-5× além da RAM),
  mas não o eliminou — RAM ainda é ~1000× mais rápida.
```
> fonte do ramo seletividade/cardinalidade: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: The use case B-trees solve
> fonte do ramo range/folhas: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B+ tree benefit: range queries via leaf pointers
> fonte do ramo PK MySQL: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value
> fonte do lembrete NVMe/RAM: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

**Anti-patterns de custo:**
- **Usar GUID como primary key no MySQL** sem contabilizar que ele incha **todos** os índices secundários (cada entrada secundária carrega a PK inteira).
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value
- **Subestimar a profundidade da árvore ao estimar IOs** ignorando o espaço que os valores consomem por página — menos chaves/página = árvore mais profunda do que se imaginou.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-tree search and the hidden value
- **Tratar índice como "grátis em escrita"** porque "a árvore se auto-balanceia" — a frase esconde o IO real dos page splits.
  > fonte: Hussein Nasser | B-tree vs B+ tree in Database Systems | seção: B-trees

---

## Storage & hardware — IOPS, IO aleatório, NVMe × EBS, working set × RAM

Os fundamentos de storage mudaram em 30 anos (~100 IOPS → ~1M IOPS) e isso reescreve as regras de tunagem, sizing e escolha de instância para OLTP — mas só se você medir a métrica certa (IOPS aleatório, não MB/s sequencial) e souber onde o ganho real mora (latência por operação individual).

### O conceito

A premissa de design do MySQL é histórica e datada. Havia um comentário no `my.cnf` indicando que o MySQL foi projetado em torno de **~100 IOPS**; instâncias EC2 commodity modernas chegam perto de **1 milhão de IOPS** — uma diferença de 10.000x em 30 anos. Isso muda a *natureza* do gargalo: bancos **nunca eram CPU-bound** até os SSDs chegarem; agora podem ser muito CPU-bound.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

**REGRA de medição:** OLTP não precisa de throughput sequencial, precisa de **IO aleatório de baixa latência**. Em OLTP você lê um registro de usuário que nem chega a megabytes — não há sequencialidade. Throughput razoável pode ser obtido de sistemas de alta latência via *pipelining* de requests, mas **IO aleatório não pode ser pipelined da mesma forma**. SSDs foram o avanço transformador especificamente para IO aleatório.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

Daí o teste decisivo de storage: a diferença entre dois tipos de disco em OLTP aparece na **latência da operação individual aleatória**, não no MB/s. NVMe localmente conectado opera na ordem de **~100 microssegundos** de write latency; EBS de rede opera na ordem de **milissegundos** — uma ordem de magnitude. Em produção isso virou latência de query direta: uma migração de 1.000 nós reduziu **p99 de 50ms para 5ms apenas trocando a tecnologia de storage**, sem mudança de código.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

A consequência arquitetural mais subestimada é sobre RAM. Com NVMe local sub-milissegundo, você pode ter um **working set muito maior que a memória principal** sem a penalidade histórica. A regra de ouro "nunca deixe o banco ir ao disco" perde força. Mas com limite: RAM ~100ns × NVMe ~100µs — NVMe ainda é **1000x mais lento que RAM**. O limiar de "preciso que caiba em RAM" **sobe drasticamente** (working set pode exceder RAM em 2-5x), não desaparece.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

Aviso anti-marketing antes de qualquer capacity planning: "IOPS ilimitados" é **meia-verdade**. As instâncias têm spec máximo de IO, mas o **MySQL não consegue saturar todo o IO disponível** — o teto de performance é definido pelo *software* (locking, buffer pool, paths single-threaded), não pelo hardware.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Future plans

### Quando usar cada storage

**NVMe local / Metal — quando o gargalo é storage e a workload é OLTP:**
- **Diagnóstico de p99 alto sem causa de schema/query.** Se queries têm p99 alto sem explicação de índice/lock/CPU, investigue latência de IO (EBS × NVMe local) **antes** de otimizar SQL.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **OLTP puro** — muitas queries pequenas e aleatórias em registros individuais, onde cada microssegundo de latência de IO importa.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Storage architecture: disaggregated vs co-located
- **Acima do threshold de IOPS de EBS.** EBS GP3 dá 3.000 IOPS baseline (provisionável até 16.000 antes de precisar do IO2 caro). Acima de ~3.000 IOPS, Metal é simultaneamente **mais rápido E mais barato**; acima de ~6.000 IOPS, Metal é **quase certamente mais barato**; na classe IO2 (>16.000 IOPS ou durabilidade five-nines), Metal é dramaticamente mais econômico.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal
- **Adiar sharding via escala vertical.** Mais performance num único nó (via NVMe) adia a necessidade de shardar e preserva flexibilidade de indexação/queries que o sharding elimina. (Ver `replication-sharding.md` e `scalability.md`.)
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal

**EBS — onde a flexibilidade operacional supera a performance de pico:**
- **Padrão archival** — muito dado, pouquíssimo tráfego de query. É a única exceção onde EBS é mais compelling que Metal: o custo fixo do Metal não se justifica com tráfego mínimo. Mas é raro — assim que a escala cabe em qualquer Metal, Metal vence quase imediatamente.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal
- **Sizing preciso e elasticidade operacional.** EBS dá três benefícios genuínos: resize de volume online, detach/reattach entre instâncias (troca de EC2 em segundos sem restaurar backup) e flexibilidade de ratio (muito storage com pouco CPU/RAM ou vice-versa). Metal tem ratio fixo com jumps grandes.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Why everyone (including PlanetScale) chose EBS

### Quando NÃO usar

- **Não troque storage quando o gargalo não é storage.** NVMe não ajuda em queries sem índice, lock contention, ou CPU-bound em tabelas pequenas. E ironicamente: com IO barato, o **CPU vira o novo gargalo** — o perfil de tunagem muda de "nunca vá ao disco" para "deixe o storage trabalhar".
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **Não meça storage OLTP com benchmark sequencial.** `dd`/`fio` com reads sequenciais não captura o gargalo real do OLTP (IO aleatório).
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **Não use NVMe local para analytics/OLAP** — scans de tabela inteira são dominados por throughput sequencial, onde EBS é adequado.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Storage architecture: disaggregated vs co-located
- **Não aplique tunagem de 100-IOPS em ambiente NVMe.** Buffer pool gigantesco "para evitar todo IO a disco" foi desenhado para storage caro; em NVMe otimiza o gargalo errado. (Inversamente: em EBS, minimizar IO ainda se aplica.)
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **Não use o spec de hardware como teto de capacity planning.** O MySQL não satura o NVMe; planeje contra benchmarks de MySQL no tipo de instância alvo.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Future plans

### Árvore de decisão — storage de hardware

```
A workload é OLTP (queries pequenas, aleatórias, latência crítica)?
│
├── NÃO → analytics/OLAP/scan de tabela (throughput sequencial domina)
│         → EBS é adequado; storage desagregado/elasticidade pode valer mais que latência.
│
└── SIM → o gargalo atual é mesmo storage? (p99 alto SEM causa de schema/query/lock/CPU?)
      │
      ├── NÃO → não troque storage. Investigue índice/lock; e lembre: com IO barato
      │          o CPU pode ser o novo gargalo. Reveja tunagem de "evitar IO".
      │
      └── SIM → mede a métrica certa: IOPS ALEATÓRIO, nunca MB/s sequencial.
            │   Quanto IOPS observado/provisionado?
            │
            ├── < 3.000 IOPS E muito dado / pouco tráfego (archival)
            │     → EBS GP3 baseline: mais econômico e flexível. Exceção legítima.
            │
            ├── 3.000–6.000 IOPS
            │     → calcular custo Metal × EBS-com-IOPS-provisionados;
            │       Metal já tende a ser mais rápido E mais barato.
            │
            └── > 6.000 IOPS  (ou classe IO2 / >16.000)
                  → Metal quase certamente mais barato E muito mais rápido.
                    Aceite jumps grossos de SKU (ratio fixo) como preço da performance.

Sempre lembre:
  · O ganho de NVMe mora na LATÊNCIA aleatória individual (~100µs × ~ms do EBS),
    não no throughput. p99 50ms→5ms vem disso.
  · NVMe afrouxa "tudo em RAM" mas NÃO elimina: NVMe é 1000x mais lento que RAM.
  · "IOPS ilimitados" é teto de SOFTWARE (MySQL), não de hardware.
  · Adiar sharding via Metal preserva flexibilidade de índice. Storage rápido troca
    complexidade horizontal por escala vertical.
```
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal

**Anti-patterns de hardware:**
- **Mascarar latência de EBS com tunagem de query / índices extras** quando o gargalo real é o hop de rede até o storage.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **Aplicar tunagem de 100-IOPS (buffer pool gigante) em ambiente NVMe** — IO é barato lá; o CPU pode ser o real gargalo.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **Eliminar completamente a preocupação com buffer pool sizing por usar NVMe** — RAM ainda é 1000x mais rápida; o limiar sobe, não desaparece.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
- **Pagar IOPS provisionados de EBS GP3 acima de ~6.000 (ou IO2) sem comparar com Metal** — frequentemente o Metal é mais barato nesse range.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal
- **Assumir que "IOPS ilimitados" significa que qualquer workload MySQL satura o hardware** — gargalos de software limitam antes do IO.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Future plans

---

## Storage desagregado × co-localizado (a tensão C6)

Última decisão de storage: **os dados moram junto da compute ou do outro lado da rede?** A latência diz "co-localize"; a operabilidade diz "desagregue" — a clivagem real é OLTP-latency-crítico × elasticidade/archival, não preferência.

- **Co-localizado:** MySQL + InnoDB + storage local (NVMe) no mesmo chassi. Os *tight loops* de IO e computação acontecem localmente, sem hop de rede. É o desenho do PlanetScale Metal.
- **Desagregado (Aurora-style):** o processamento de queries é separado do storage via rede. Cada IO atravessa a rede até o storage.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Storage architecture: disaggregated vs co-located

O eixo dominante é o **perfil de IO da workload**. OLTP é IO aleatório de baixa latência, e IO aleatório **não pode ser pipelined** como reads sequenciais. É por isso que a latência por operação — não o throughput agregado — é o que separa os dois desenhos para OLTP.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

### A tensão C6 (não a achate)

Os dois lados têm razão em domínios diferentes. Não é "Metal venceu Aurora" — é "qual eixo domina a sua workload".

#### Lado co-localizado (PlanetScale Metal): a latência manda

Cada IO que atravessa a rede paga em latência. Write latencies de EBS estão na ordem de **milissegundos**; NVMe localmente conectado opera na ordem de **100 microssegundos** — uma ordem de magnitude melhor — e isso se traduz diretamente em latência de query: a migração de 1.000 nós derrubou o p99 de **50ms para 5ms apenas trocando o storage**, sem mudar uma linha de código.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics

Para OLTP, co-localizar maximiza performance porque os *tight loops* de IO e computação ficam locais. Quando cada microssegundo importa, a desagregação é um imposto pago em toda operação.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Storage architecture: disaggregated vs co-located

Há ainda um ganho de **operabilidade de falha** a favor do local: EBS, quando o hardware por trás do volume falha, **fica lento** (copia dados das cópias restantes para restaurar redundância) — o pior modo de falha para um banco, difícil de detectar. NVMe local falha de forma **binária**: funciona ou para. "Não quero coisas ficando lentas. Quero que parem de funcionar totalmente." Em sistemas distribuídos com replicação, a falha preto-no-branco é preferível.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Reliability motivation for Metal

#### Lado desagregado (Aurora-style / EBS): elasticidade e flexibilidade

O storage desagregado não é inferior — ele otimiza **flexibilidade operacional**. EBS oferece três benefícios genuínos que o NVMe local não dá:
- **Resize de storage online** — cresce o volume com a carga sem engenharia adicional, sem os *jumps* grandes entre SKUs Metal (ratio fixo de storage por CPU/RAM definido pela AWS).
- **Detach/reattach de volume** entre instâncias EC2 — troca a instância sem restaurar backup, operação em segundos.
- **Ratio CPU/RAM × storage desacoplado** — muito storage com pouco compute (ou vice-versa).
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Why everyone (including PlanetScale) chose EBS

E há um caso onde o desagregado é **a escolha mais econômica**: o padrão **archival** — volume enorme de dados frios com tráfego de query mínimo. Manter histórico em MySQL sobre EBS GP3 barato, sem fazer a engenharia de expirar para S3, "é *money in the bank, time in the books*". Aí o custo fixo de Metal não se justifica.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal

Também há um custo de capacidade no lado co-localizado: instâncias com storage local são "rarefeitas" — a AWS não mantém capacidade ociosa, e erros de *insufficient instance capacity* são frequentes em escala. EBS-backed compute é funcionalmente ilimitado.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Capacity limits — the cloud is not infinite

#### A nuance de durabilidade (não confunda com o eixo de performance)

Um erro recorrente é tratar storage durável como se fosse replicação. EBS IO2 oferece **five-nines de durabilidade por volume** — protege contra falha de hardware de storage, **não** contra falha de instância, bug que corrompe dados, ou erro humano. Storage durável ≠ replicação.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy

Pior: combinar EBS durável **com** replicação própria é **redundância redundante** — pagar duas vezes pela mesma proteção. Quem já roda três cópias por shard não precisa de IO2; quem é standalone precisa. (A estratégia de *disponibilidade* via replicação de três cópias + `semi-sync` + surge-replacement é propriedade de `replication-sharding.md`. Aqui só decidimos onde os dados moram.)
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy

### A regra prática (resolução de C6)

**REGRA (C6 em uma linha):** co-localização compra latência ao custo de flexibilidade operacional; desagregação compra flexibilidade ao custo de latência.
> SE a workload é OLTP de alta frequência (queries pequenas e aleatórias, latência por operação crítica) ENTÃO co-localize (NVMe local). SE o padrão é analytics/OLAP (throughput de scans domina) OU a elasticidade do desagregado — resize online, detach/reattach, ratio storage/compute flexível — vale mais que a performance de pico, OU é archival (muito dado, pouquíssimo tráfego) ENTÃO storage desagregado é preferível.
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Storage architecture: disaggregated vs co-located
> fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal

O cruzamento prático tende a inclinar para Metal assim que a workload é OLTP real e a escala cabe numa instância Metal — archival é a exceção que sobra para o desagregado.

### Árvore de decisão — co-localizado × desagregado

```
A workload é OLTP de alta frequência (queries pequenas, aleatórias, latência por operação crítica)?
│
├── SIM → o gargalo é mesmo storage (p99 alto sem explicação de schema/query)?
│         ├── SIM → CO-LOCALIZADO (NVMe local).
│         │         IO aleatório local = ~100µs vs ~ms de EBS; p99 cai (ex.: 50ms→5ms).
│         │         Bônus operacional: falha binária do NVMe é mais fácil de operar
│         │         que a degradação lenta do EBS — desde que haja replicação.
│         │         ⚠️ planeje capacidade: instâncias storage-attached são rarefeitas.
│         └── NÃO (índice ausente / lock / CPU-bound em tabela pequena)
│                   → desagregação não resolve; conserte schema/query primeiro.
│
└── NÃO → o que domina?
      ├── Analytics/OLAP (scans sequenciais, throughput > latência individual)
      │     → DESAGREGADO (EBS) é adequado.
      ├── Elasticidade vale mais que pico de performance
      │   (resize online · detach/reattach em segundos · ratio storage/compute flexível)
      │     → DESAGREGADO (EBS).
      └── Archival (muito dado frio, < 3.000 IOPS, tráfego mínimo)
            → DESAGREGADO (EBS GP3): mais barato, evita tiering p/ S3.

Sempre lembre:
  · storage durável (EBS IO2 five-nines) ≠ replicação.
    Cobre falha de hardware de storage; NÃO cobre falha de instância, bug ou erro humano.
  · durável + replicação própria de 3 cópias = redundância redundante (paga 2x).
    Tem replicação ativa? GP3/NVMe basta. É standalone? Aí IO2 faz sentido.
```
> fonte do ramo OLTP/latência: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Performance characteristics
> fonte do ramo falha binária: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Reliability motivation for Metal
> fonte do ramo archival/elasticidade: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Market reaction and when to choose Metal
> fonte do ramo durável≠replicação: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy

**Anti-patterns de arquitetura de storage:**
- **Usar storage desagregado (Aurora-style) para OLTP de alta frequência** assumindo que a latência de rede é desprezível — write latencies de EBS são milissegundos vs 100µs de NVMe local.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Storage architecture: disaggregated vs co-located
- **Assumir que "cloud é infinito"** e não planejar capacidade ao depender de instâncias storage-attached que escalam rápido — risco de não conseguir provisionar no pico.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Capacity limits — the cloud is not infinite
- **Confundir five-nines de durabilidade de EBS com alta disponibilidade** — durabilidade de dados e disponibilidade de serviço são métricas diferentes; EBS pode estar "durável" mas lento o bastante para degradar o SLA.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: Reliability motivation for Metal
- **Usar EBS IO2 como substituto de replicação adequada** — protege contra falha de hardware de storage, não contra falha de instância, bug de app que corrompe dados, ou erro humano.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy
- **Especificar EBS IO2 para todos os nós "por segurança" tendo replicação ativa de 3 cópias** — redundância redundante, custo muito maior sem benefício proporcional.
  > fonte: Aaron Francis & Richard Crowley | Making MySQL faster (PlanetScale Metal) | seção: EBS durability vs PlanetScale's own redundancy

---

## Cross-refs

- `sql-acid-and-durability.md` (irmã) — ACID, WAL, fsync, durabilidade do SQLite. A unidade "página inteira" do write amplification e o mecanismo de persistência moram lá em detalhe; aqui usamos só o fato.
- `sql-query-planning.md` (irmã) — EXPLAIN/Seq Scan como baseline, plano de query e particionamento na prática. O índice como uma das três estratégias de redução (vs particionamento) é decidido aqui; o *como ler o plano* fica lá.
- `replication-sharding.md` — replicação de três cópias, `semi-sync`, failover, surge-replacement. "Storage durável ≠ replicação" aponta para lá; sharding como alternativa à escala vertical via NVMe também.
- `scalability.md` — escala horizontal × vertical; adiar sharding via NVMe é um caso dessa decisão.
- `database-selection.md` — SQL × NoSQL, escolha de engine (e o que o caso MongoDB/B-tree implica para a seleção).

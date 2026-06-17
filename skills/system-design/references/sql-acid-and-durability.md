# ACID, Durabilidade e SQLite em Produção — Referência Detalhada

ACID é o conjunto de garantias que um banco relacional entrega por padrão — e a decisão de fundo é sempre um trade-off entre **corretude forte** e **disponibilidade/escalabilidade**. Esta reference cobre a jornada inteira: as definições de ACID e BASE, a tensão real de "ACID para dinheiro", a mecânica dos journal modes do SQLite (WAL × rollback), como operar o SQLite em produção sob carga, e o nugget Pixeltable — ACID não como durabilidade isolada, mas como substrato que faz um pipeline de dados computar tudo-ou-nada.

Esta reference é sobre **garantias e mecânica de durabilidade transacional**. Para o lado de *escolha de tecnologia* (SQL × NoSQL) remeta a `database-selection.md` (irmã); para o trade-off *consistência × disponibilidade sob partição* no nível distribuído remeta a `cap-theorem.md` (irmã) — **o C de ACID não é o C de CAP**, e nenhum dos dois é re-derivado aqui. Para *organização física de pages em índices* (B-tree, custo de índice) remeta a `sql-indexing-and-storage.md` (irmã); para *como o planejador escolhe acessar os dados* remeta a `sql-query-planning.md` (irmã). A durabilidade de **fila/broker** (fsync antes do confirm, WAL de broker, Raft) é de `messaging-operations.md` (Onda 1) — aponte para lá nesse ângulo, não duplicado aqui.

**REGRA:** não existe opção universalmente melhor entre ACID e BASE — o domínio determina qual lado vale mais. Defina o que o dado representa (consequência física/financeira real × dado de engajamento) PRIMEIRO; só então escolha o nível de garantia.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega

---

## ACID e BASE — as definições

**ACID** é o conjunto de garantias que bancos relacionais (SQL) oferecem por padrão — Postgres, MySQL, Oracle, SQL Server, SQLite. É o que se espera e pode confiar ao usar um banco relacional.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: ACID vs BASE — onde cada um aparece

As quatro letras, cada uma com seu mecanismo:

- **A — Atomicidade**: a transação é indivisível — acontece por inteiro ou não acontece. Não existe meia transação; se qualquer parte falhar, tudo é cancelado (rollback). Salvo falha gravíssima de hardware, nunca é comitada pela metade.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Atomicidade
- **C — Consistência (ACID)**: o banco sempre transita de um estado válido para outro estado válido, respeitando todas as constraints (estoque não-negativo, loja não existe sem dono). **Não é o C do CAP** — o C do ACID é integridade de dados, não acordo entre réplicas.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Consistência
- **I — Isolamento**: transações concorrentes não interferem entre si. Se duas tentam comprar o último item do estoque, uma passa e a outra falha — o resultado final é o de **uma OU de outra**, nunca um valor mesclado corrompido. Isolamento não impede que ambas rodem; impede o estado mesclado inválido.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Isolamento
- **D — Durabilidade**: se o banco confirmou o commit, os dados estão salvos e sobrevivem a crash/restart (sem falha catastrófica de hardware).
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Durabilidade

**BASE** (Basically Available, Soft State, Eventual Consistency) é o conjunto de garantias **mais fracas** típico de NoSQL — Cassandra, Mongo, Dynamo —, priorizando disponibilidade e escalabilidade sobre corretude. Não é uma garantia explícita sempre presente, mas o comportamento esperado e para o qual se projeta o sistema.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que BASE significa

As três letras de BASE:

- **Basically Available**: o sistema tenta responder mesmo com partes falhando. Um banco ACID não consegue isso — se parte falha, ele prefere **rejeitar** a operação a arriscar inconsistência, porque não pode garantir atomicidade. "Basically available" não é 100% uptime; é "faz o melhor possível para responder".
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Basically Available (geralmente disponível)
- **Soft State**: o estado interno pode mudar **sem novo input externo**, porque réplicas se sincronizam de forma assíncrona. O estado é "fluido" — não garantidamente estável em qualquer instante.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Soft State (estado fluido)
- **Eventual Consistency**: após uma escrita, todas as réplicas **convergem** para o mesmo valor — mas não imediatamente. Há uma janela em que é possível escrever um valor novo e ler o antigo de uma réplica que ainda não recebeu a propagação. "Eventual" não é instantâneo na prática: a propagação pode ser perceptível.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Eventual Consistency (consistência eventual)

**REGRA:** ACID entrega corretude mas dificulta escala horizontal; BASE entrega disponibilidade e escala massiva mas abre mão de corretude absoluta. O custo do ACID é estrutural, não acidental — constraints, locking e durabilidade síncrona impõem custo de performance por write. Até a unicidade tem preço: uma constraint de e-mail único é mantida por um **hash index** consultado em O(1), mas o índice é atualizado a cada insert/update; em escala muito alta esse custo de write contribui para a dificuldade de escalar bancos ACID.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega

**D9 — cross-link, não re-derivar aqui:** o lado BASE/eventual-consistency deste conceito é a face de aplicação do trade-off que o **CAP formaliza no nível distribuído** (consistência × disponibilidade sob partição) — ver `cap-theorem.md`. A decisão ACID-vs-BASE é o lado de *garantias* da escolha de banco; a seleção de tecnologia **SQL × NoSQL** é coberta por `database-selection.md`. Lembrete deliberado, que a própria síntese carrega: **o C do CAP ≠ o C do ACID** — o do CAP é acordo entre réplicas, o do ACID é integridade de constraints.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Consistência

---

## A tensão C7 — ACID para dinheiro?

**REGRA (C7):** o conflito não tem "vencedor" — é a diferença entre **o que é academicamente correto** e **o que se vê em produção em escala extrema**. Os dois lados estão certos em regimes de escala diferentes. Não achate em "depende": a resolução é uma regra SE/ENTÃO de duas condições conjuntas (abaixo).

### Lado ortodoxo — dinheiro exige ACID

A regra de ouro do domínio: dados que mapeiam para consequências **físicas ou financeiras reais** (pagamentos, estoque, tickets, assentos de avião) requerem ACID. O critério é "isto pode ser vendido duas vezes ou ter valor errado?".
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um

A razão técnica é a própria semântica do ACID aplicada a dinheiro:

- **Atomicidade** é o que torna uma transferência bancária segura — débito + crédito são uma unidade; ou os dois ocorrem, ou nenhum. Executar os passos em chamadas separadas sem transação expõe o sistema a estados parcialmente aplicados (debitou e não creditou).
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Atomicidade
- **Isolamento** é o que impede vender o último item duas vezes sob concorrência — uma transação passa, a outra falha, sem valor mesclado corrompido.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Isolamento
- **Basically Available invertido**: um banco ACID **prefere rejeitar** a operação a processá-la sem garantias. Para dinheiro, rejeitar é exatamente o comportamento desejado — uma transação financeira não deve ser aceita se não há como garantir atomicidade.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Basically Available (geralmente disponível)

E o lado-espelho: aplicar BASE a domínio que exige corretude forte (débito/crédito) **sem mecanismos compensatórios explícitos** é anti-pattern. Eventual consistency é inaceitável quando a lógica depende de ler-a-própria-escrita imediatamente (saldo bancário, inventário). Por isso o **default do domínio financeiro continua sendo ACID** — em pequena e média escala, NoSQL em pagamentos sem justificativa técnica clara é o erro.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que BASE significa
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Eventual Consistency (consistência eventual)
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático

### Lado pragmático — NoSQL é usado em pagamentos na prática

O que é academicamente correto nem sempre reflete o que se vê na prática: bancos NoSQL (BASE) **são usados até em instituições de pagamentos**, especialmente quando a escala é muito grande.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático

O ponto de virada é a escala. Ao escalar para ~100 milhões de usuários, **disponibilidade e escalabilidade passam a ser prioridade e o ACID vira obstáculo** — a corretude deixa de ser garantida pelo banco e passa a ser tratada de outras formas na camada de aplicação: **reconciliação, idempotência, compensação**.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático

Isso é coerente com o custo estrutural do ACID: em escala muito alta de writes/s, as garantias (constraints, locking, durabilidade síncrona, manutenção de índices de unicidade) **viram gargalos reais** que exigem sharding, read replicas e caching. Quando o banco relacional é o gargalo, a pergunta legítima é se *todos* os dados precisam de ACID ou se dá para segregar críticos (ACID) de alta-escala (BASE).
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega

**REGRA — a trava decisiva (o que separa uso legítimo de abuso):** o trade-off é **escala+disponibilidade em troca de complexidade adicional para garantir corretude por mecanismos compensatórios na aplicação.** Citar "grandes empresas usam NoSQL em pagamentos" para justificar a escolha **sem implementar os mecanismos compensatórios que essas empresas também implementam** é o anti-pattern central de C7.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático

### A regra prática (resolução de C7)

A tensão se fecha numa regra de duas condições conjuntas — não basta a escala, é preciso a *capacidade de compensar*:

> **SE a escala é tal que o ACID se tornou um gargalo operacional real E existe capacidade comprovada de implementar idempotência, reconciliação e compensação na aplicação ENTÃO NoSQL em domínio financeiro pode ser avaliado; caso contrário, prefira ACID.**
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático

Duas leituras embutidas que evitam o erro mais comum:

1. **A divisão não é binária por sistema — é por entidade.** Em sistemas grandes, partes do mesmo sistema usam ACID para operações críticas e BASE para dados de suporte. Usar o mesmo banco e nível de consistência para *tudo*, sem perguntar o que de fato precisa de corretude forte, é anti-pattern.
   > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um
2. **"Eventual" custa caro só quando o usuário precisa ver a própria escrita.** A linha divisória operacional é read-your-own-writes: saldo e inventário exigem; like e contador de visualização não.
   > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Eventual Consistency (consistência eventual)

### Quando usar ACID

Use consistência forte quando o dado representa algo físico/financeiro que **não pode ser vendido duas vezes ou ter valor errado**:

- **Saldo, débito/crédito, pagamentos** — a transferência precisa de atomicidade; rejeitar é melhor que processar pela metade.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um
- **Estoque físico, assentos de avião, ingressos, reservas únicas** — o mesmo recurso não pode ser alocado duas vezes; é o caso-modelo do isolamento.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Isolamento
- **Regras de negócio invioláveis** (e-mail único, estoque nunca negativo, integridade referencial) — implemente como constraint no banco e confie na consistência ACID.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Consistência
- **Quando rejeitar a operação é preferível a aceitá-la sem garantias** — domínio onde "não fiz" é mais seguro que "talvez fiz".
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Basically Available (geralmente disponível)

**REGRA-base:** **SE o banco é relacional ENTÃO conte com ACID por padrão**; e **SE uma operação tem múltiplos passos que devem todos ocorrer ou nenhum ENTÃO envolva-os numa transação.**
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: ACID vs BASE — onde cada um aparece
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Atomicidade

### Quando BASE/eventual basta

Use garantias fracas quando uma contagem **levemente errada não causa dano real** e o sistema precisa de escala/disponibilidade:

- **Likes, analytics, logs, cache, recomendações** — precisão absoluta em tempo real não importa.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um
- **Leituras rápidas sem coordenação entre réplicas**, onde uma janela de milissegundos a segundos de valor desatualizado é tolerável.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Eventual Consistency (consistência eventual)
- **Escala global multi-região onde uma falha parcial de réplica/shard não deve derrubar o sistema inteiro** — Basically Available é o modelo adequado.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Basically Available (geralmente disponível)
- **Dados de suporte dentro de um sistema majoritariamente ACID** — segregue o crítico (ACID) do auxiliar de alta escala (BASE) em vez de uniformizar.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega

**REGRA-base:** **SE o domínio tolera leitura levemente desatualizada E precisa de escala massiva ENTÃO BASE é suficiente** — mas assuma que o estado lido pode estar em sincronização (soft state) e não o trate como definitivo.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que BASE significa
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Soft State (estado fluido)

### Árvore de decisão — ACID × BASE

```
O dado mapeia para consequência física/financeira real
(saldo, estoque, assento, ingresso — "pode ser vendido 2x ou ter valor errado")?
│
├── NÃO (like, analytics, log, cache, recomendação, métrica de engajamento)
│     → BASE / eventual consistency basta.
│       Aceite read levemente desatualizado; trate estado como soft (pode estar sincronizando).
│
└── SIM → domínio crítico. É pagamento/financeiro?
      │
      ├── Escala pequena/média (ACID NÃO é gargalo operacional real)
      │     → ACID, sem exceção. NoSQL aqui sem justificativa técnica = anti-pattern.
      │       Atomicidade p/ a transação, isolamento p/ concorrência, constraints p/ invariantes.
      │
      └── Escala extrema (~100M usuários; ACID virou gargalo de write/disponibilidade real)
            → pergunte: existe capacidade de implementar idempotência + reconciliação
              + compensação na CAMADA DE APLICAÇÃO?
              │
              ├── NÃO → continue em ACID (ou shard/replica o relacional).
              │         Citar "big tech usa NoSQL em pagamento" SEM os mecanismos = anti-pattern.
              │
              └── SIM → NoSQL/BASE pode ser AVALIADO para as partes de alta escala;
                        mantenha ACID nas operações nucleares de dinheiro.
                        A divisão é por ENTIDADE, não por sistema inteiro.

Sempre: a corretude que o banco deixa de garantir vira RESPONSABILIDADE da aplicação.
        BASE não remove a necessidade de corretude — desloca quem a garante.
```
> fonte do ramo de domínio: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um
> fonte do ramo de escala/compensação: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático

---

## Journal modes do SQLite — WAL × rollback (a mecânica de A e D)

Saindo do julgamento para a mecânica concreta: como um banco relacional (SQLite) *implementa* atomicidade e durabilidade. Um banco SQLite é um único arquivo dividido em blocos de tamanho fixo chamados **pages**. Toda leitura e escrita opera sobre pages inteiras, nunca sobre bytes soltos — a page é a unidade atômica de I/O.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: What is WAL mode

Esse detalhe não é trivia: ele explica o custo dos dois journal modes. Tanto o rollback journal quanto o WAL existem para garantir **atomicidade** — a transação acontece por inteiro ou não acontece, sem commit pela metade (salvo falha gravíssima de hardware) — e **durabilidade** após o commit. O que muda entre os dois modos é *qual page é movida, para onde, e quando*. Como a unidade é sempre a page inteira, mover pages para o lugar errado na hora errada é o que custa I/O.
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Atomicidade
> fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Durabilidade

**REGRA central:** os dois modos **invertem quem é a fonte da verdade durante a escrita.** No rollback journal, o arquivo principal é mutado durante a transação e o original é preservado fora dele. No WAL, o arquivo principal fica intacto e a mudança vive num log separado. Essa inversão é a raiz de tudo o que vem depois. (O modo padrão do SQLite é `delete` — rollback journal — por retrocompatibilidade histórica, não por ser superior; o WAL existe desde 2010 e "você provavelmente quer WAL mode para tudo".)
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Recommendation

### Rollback journal: muta o principal, guarda o original fora

No rollback journal, antes de sobrescrever uma page no arquivo principal, o SQLite **copia a page original para um arquivo de journal separado** (safekeeping). Aí escreve os dados novos no arquivo principal. No commit, ele **destrói o journal** — delete, truncate ou zero-out.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Rollback journal

A sutileza que define o modo: **a destruição do journal É o que finaliza o commit.** O SQLite usa a presença/ausência do journal file como flag de atomicidade — journal presente significa commit em andamento ou transação abortada; journal destruído significa commit finalizado. Enquanto o journal existe, a transação está em voo, e isso garante que nunca se leia dados semi-commitados. Daí dois custos estruturais: **rollback exige restaurar o principal** (copiar as pages de volta do journal, porque o principal já foi mutado) e **leitores são bloqueados** (o writer precisa de lock exclusivo no principal; todos os leitores esperam). A invariante de recuperação cai de graça: se ocorrer crash e o journal file ainda existir na próxima abertura, o SQLite faz rollback automático restaurando as pages originais.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Rollback journal

### WAL: deixa o principal intacto, escreve a mudança num log

O WAL inverte a lógica. A page original **permanece intocada no arquivo principal**; as mudanças vão para um arquivo separado, o write-ahead log (`-wal`). O arquivo de banco principal só é alterado depois, no checkpoint.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)

Essa inversão paga três dividendos diretos:

**1. Leitura concorrente sem bloqueio mútuo.** Leitores continuam lendo o arquivo principal enquanto o escritor escreve no `-wal` — os dois caminhos de I/O são independentes. Isso elimina o reader×writer lock do rollback journal. (Atenção ao limite: continua **single-writer** — WAL resolve contenção leitor×escritor, não escritor×escritor; múltiplos escritores ainda serializam. Esse limite, e o que fazer com ele, estão na seção *SQLite em produção* abaixo.)
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput

**2. Rollback praticamente grátis.** Para abortar uma transação, o WAL apenas **descarta as entradas não commitadas do final do log** — não toca o arquivo principal, porque o principal nunca foi modificado durante a escrita. Não há nada para desfazer nele.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)

**3. Crash-safety natural.** Se um crash interrompe uma escrita WAL, o arquivo principal está íntegro por construção; as entradas não commitadas no `-wal` são simplesmente ignoradas na próxima abertura.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)

O custo do WAL: **dois arquivos auxiliares no filesystem** (`-wal` e `-shm`) onde antes havia um. Eles precisam entrar em backups e deploys, e a leitura pode precisar mesclar dados do arquivo principal com entradas pendentes do WAL.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Setup: two databases, two journal modes

### O resultado em número: >10x

A inversão não é só elegante — é mensurável. Com 2.000 queries em 25 processos separados (mix ~95% leitura / 5% escrita), o WAL completou em **568 ms contra 7,2 s do rollback** — mais de 10x em leituras (83 k/s vs 6–6,5 k/s) e mais de 10x em escritas (4.300/s vs ~300/s). Ressalva honesta: o mix é sintético e fixo (95/5); carga com escrita pesada pode mostrar ganho menor, porque o checkpoint periódico tem custo próprio.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Benchmark results

### Tabela: o trade-off page-a-page

| Dimensão | Rollback journal (`delete`) | WAL |
|---|---|---|
| Quem é mutado na escrita | arquivo **principal** (original vai pro journal) | arquivo **`-wal`** (principal intacto) |
| O que finaliza o commit | **destruir** o journal file | número de transação registrado no WAL |
| Custo do rollback | restaurar pages do journal → principal | descartar o **final** do WAL (principal não tocado) |
| Leitores durante escrita | **bloqueados** (lock exclusivo no principal) | **leem o principal** em paralelo |
| Arquivos no filesystem | 1 (+ journal transitório) | 1 + `-wal` + `-shm` |
| Throughput concorrente | baseline | **>10x** |
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Rollback journal
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Benchmark results

### Checkpoint: quando o WAL "vira" o banco

O `-wal` não cresce para sempre. O **checkpoint** é a operação que mescla o conteúdo do write-ahead log de volta no arquivo principal e reinicia o WAL do zero. É o momento em que as escritas WAL se tornam parte permanente do arquivo `.sqlite`. Roda periodicamente (configurável), tipicamente quando um writer termina e o WAL está grande.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput

**REGRA — o checkpoint é um trade-off de frequência:** muito frequente → overhead de I/O alto (mesclar custa I/O); muito raro → o `-wal` cresce e as **leituras ficam mais lentas**, porque cada leitura precisa percorrer mais entradas do WAL antes de chegar ao dado. Heurística de diagnóstico: se o arquivo `-wal` está crescendo além do esperado, investigue a frequência/config de checkpoint **antes** de tunar qualquer outro parâmetro — o sintoma quase sempre aponta para checkpoint que não roda.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput

### Snapshot isolation: o leitor vê um universo congelado

No WAL, cada leitor obtém um **snapshot da última transação commitada no momento em que abre o banco**. Ao abrir, ele consulta o WAL para descobrir qual foi a última transação commitada (digamos, número 5); durante toda a leitura, o universo dele fica limitado até essa transação — ele lê o principal + o WAL, mas **nunca avança além do ponto de snapshot**. Não vê transações posteriores nem dados parcialmente escritos. É isto que dá isolamento **sem bloquear o escritor**: o leitor não precisa de lock porque tem uma visão estável; o escritor pode adicionar a transação 6 ao WAL sem que o leitor da transação 5 enxergue ou se importe.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)

**REGRA operacional que pega gente desprevenida:** **o snapshot é por abertura de conexão, não por `BEGIN` explícito.** Aplicações que reabrem conexões com frequência veem dados frescos; aplicações com **conexões longas** podem ver dados "velhos" — o snapshot está congelado no instante em que a conexão abriu. Se uma leitura WAL retorna dado desatualizado, o suspeito número um é uma conexão aberta antes da última escrita ter commitado. E cuidado ao equiparar com bancos relacionais completos: antes de chamar isso de "REPEATABLE READ do Postgres", verifique se a semântica é idêntica — não assuma equivalência só pelo nome.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)

### Quando usar / NÃO usar cada modo

- **Qualquer banco SQLite novo** → defina `PRAGMA journal_mode = WAL` como primeira operação de setup, **antes de inserir dados**. Verifica-se com `PRAGMA journal_mode;` (retorna `wal`). O modo persiste; não precisa redefinir por conexão.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Setup: two databases, two journal modes
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Recommendation
- **Aplicação com concorrência real** (múltiplos processos/threads lendo enquanto há escritas periódicas — o caso mais comum de SQLite em produção web) → o ganho é o >10x do benchmark; ativar WAL é a primeira otimização a fazer.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Benchmark results
- **Projeto novo, decidindo entre os modos** → trate rollback journal como **legado**. libSQL/Turso (fork moderno do SQLite) só suporta WAL; muitas ofertas modernas "altamente sugerem ou forçam" WAL. O ecossistema convergiu para WAL como padrão de fato.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Recommendation
- **Dados efêmeros onde a perda é tolerável e latência é crítica** (cache, sessões temporárias) → `PRAGMA journal_mode = MEMORY` sacrifica durabilidade por performance, de propósito. Escolha legítima quando recalcular é preferível a persistir.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Durabilidade
- **Já em libSQL/Turso** → WAL é forçado; não há escolha de modo a fazer. **Deploy proíbe arquivos auxiliares** (containers read-only sem escrita lateral no diretório) → o WAL precisa criar `-wal`/`-shm` ao lado do `.sqlite`; sem isso, não dá. **Banco de produção com dados críticos** → a mudança de `journal_mode` em runtime é suportada, mas valide o processo de migração antes; prefira mudar antes de o banco estar populado.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Recommendation
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Setup: two databases, two journal modes

### Árvore de decisão — journal mode

```
Configurando journal mode no SQLite?
│
├── É libSQL / Turso?
│     → WAL já é forçado. Nada a configurar. Pare.
│
├── Banco NOVO (ainda sem dados)?
│     → PRAGMA journal_mode = WAL como 1ª operação de setup.
│       Verifique: PRAGMA journal_mode; → deve retornar 'wal'.
│       (persiste; não redefina por conexão)
│
├── Dados são efêmeros e perda é tolerável (cache/sessão), latência manda?
│     → PRAGMA journal_mode = MEMORY (sacrifica durabilidade de propósito).
│
├── Banco de PRODUÇÃO com dados, ainda em rollback (delete)?
│     ├── Deploy permite arquivos -wal/-shm ao lado do .sqlite?
│     │     ├── NÃO → fique em rollback (ou resolva o filesystem antes).
│     │     └── SIM → migre p/ WAL, mas VALIDE a migração em runtime primeiro.
│     └── (rollback ainda faz sentido só por restrição de filesystem / legado)
│
└── Já em WAL e o arquivo -wal cresce sem parar?
      → diagnostique CHECKPOINT (frequência/config) ANTES de tunar outra coisa.
        WAL grande = leituras lentas (percorrem mais entradas).

Lembre sempre:
  · WAL inverte o rollback: principal INTACTO, mudança no -wal; commit = nº de tx no WAL.
  · rollback em WAL = descartar o fim do -wal (principal nunca foi tocado).
  · snapshot do leitor é por ABERTURA DE CONEXÃO, não por BEGIN → conexão longa vê dado velho.
  · WAL é single-writer → contenção escritor×escritor é da seção SQLite em produção.
```
> fonte do ramo libSQL/WAL-only: Aaron Francis | SQLite's WAL mode is fast | seção: Recommendation
> fonte do ramo setup: Aaron Francis | SQLite's WAL mode is fast | seção: Setup: two databases, two journal modes
> fonte do ramo checkpoint: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput
> fonte do ramo journal_mode=MEMORY: Augusto Galego | ACID e BASE explicado de forma simples | seção: Durabilidade

---

## SQLite em produção — o gargalo é a transação longa, não o single-writer

**REGRA central:** o limite real do SQLite sob carga web **não é a arquitetura single-writer — é o tempo que cada transação de escrita fica aberta**; encurte a transação antes de trocar de banco. SQLite serializa escritas (um único writer por vez), e os outros writers esperam — mas isso não é um bloqueio prático se você evitar transações longas; o problema só aparece quando a transação fica aberta por mais tempo do que o necessário.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)

A inversão de causalidade é o ponto. O single-writer é frequentemente acusado de ser o teto do SQLite em web; na prática, ele é a **fonte da previsibilidade e da simplicidade** do SQLite (sem conflitos de concorrência complexos), e o que de fato serializa demais é o conjunto de transações que demoram a fechar.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)

Por isso o WAL é pré-condição, não solução completa: separa o I/O de leitores (banco principal) e escritor (arquivo WAL), eliminando o bloqueio reader×writer — mas **continua single-writer**; múltiplos escritores ainda serializam. E o WAL **não vem ligado por padrão**: os defaults do SQLite foram desenhados para o caso histórico (uma app, um usuário), não para web multi-usuário; WAL e um punhado de outras configs precisam ser ativados explicitamente. DHH quase abandonou o SQLite por causa disso antes de descobrir o que precisava configurar.
> fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Almost abandoning SQLite

O envelope de capacidade mudou porque o **hardware alcançou** o que o SQLite sempre soube fazer: com hardware não-exótico atual, Campfire/ONCE vai de ~500 chatters simultâneos (1 vCPU, 2 GB RAM) a ~10.000 usuários numa única box. Dez anos atrás o número seria muito menor.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope

### Quando usar SQLite em produção

- **Single-tenant / software que o cliente instala e hospeda.** O insight de ONCE: web multi-usuário pode ser single-tenant (um cliente = uma instância isolada, cada uma com seu SQLite). Nesse modelo o constraint single-box não é limitação — é o design correto. Vale também para estágios iniciais de produtos multi-tenant, onde a simplicidade justifica começar com SQLite.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: How SQLite fit into ONCE / Campfire
- **Carga que cabe numa box bem dimensionada.** Revise o envelope esperado contra a capacidade demonstrada (500–10.000 usuários simultâneos por box) antes de descartar.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope
- **Workload predominantemente de leitura.** A contenção single-writer não afeta reads no modo WAL — leitores seguem lendo o banco principal enquanto o escritor escreve no WAL.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput
- **Quando minimizar moving parts é resiliência, não preguiça.** Para produto instalado pelo cliente ($399 one-time, suporte mínimo), cada processo extra é um ticket de suporte. SQLite elimina o segundo container de banco: uma imagem Docker, "se quebrar, reinicia".
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Eliminating moving parts

### Quando NÃO usar

- **Múltiplos servidores de aplicação contra o mesmo arquivo.** Cinco app servers apontando para um único arquivo SQLite não funciona — é constraint arquitetural, não bug. Tentar isso como estratégia de escala causa corrupção ou falhas imprevisíveis.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope
- **Produto genuinamente multi-tenant com escala horizontal** (todos os clientes na mesma instância de app e banco) → Postgres ou MySQL.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: How SQLite fit into ONCE / Campfire
- **Escrita intensiva contínua e simultânea com SLA apertado** — single-box tem teto absoluto de escala vertical, sem opção horizontal. Não extrapole os números do Campfire (chat intermitente) para um padrão de acesso muito diferente.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope
- **Mas só depois de medir.** Não descarte SQLite por suspeita de limite de concorrência sem verificar antes se o culpado real são transações longas — que são corrigíveis. **REGRA:** SE há picos de escrita simultânea com transações lentas → otimize as transações; SE após otimizar o throughput ainda for insuficiente → considere Postgres/MySQL.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)

### Como encurtar a transação (o trabalho real)

Três alavancas operacionais saíram do tuning do Campfire, todas atacando a duração da transação, não a arquitetura:

**1. Tire callbacks pesados de dentro da transação.** No Rails, callbacks (`before/after_save`) disparam dentro da transação de escrita. Se fazem queries extras ou processamento lento, a transação fica aberta mais tempo que o necessário. Com Postgres/MySQL isso raramente importa; com SQLite single-writer vira hotspot de contenção real. Se o callback faz mais que uma operação simples no modelo salvo, mova a lógica para fora da transação.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)

**2. Troque fetch-loop por `insert_all`.** O "estilo ingênuo" — buscar N objetos, iterar, cada um fazendo suas próprias queries e writes — foi substituído por `insert_all` (bulk), onde tudo acontece numa única execução sem fetch intermediário. Reduziu a contenção a ponto de o SQLite deixar de ser o bottleneck. Custo: `insert_all` bypassa callbacks e validações do ActiveRecord — ganho de performance em troca de menos garantias por linha. Se os callbacks são necessários, investigue se podem sair da transação.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)

**3. Meça antes de otimizar — stress test acha o hotspot real.** DHH montou um rig simulando 10.000 usuários numa box fazendo chat ao mesmo tempo; os hotspots foram identificados empiricamente. Depois de otimizar as transações longas, o SQLite deixou de ser o bottleneck — outros fatores (conexões WebSocket, stampedes) passaram a dominar. Não assuma onde está a contenção.
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)

### Árvore de decisão — SQLite lento sob carga

```
SQLite está lento / dando timeout sob carga?
│
├── Já mediu onde está a contenção (stress test com carga realista)?
│     ├── NÃO → MEÇA PRIMEIRO. Pode nem ser o SQLite (WebSocket, stampede).
│     │         Migrar sem medir é otimização prematura no lugar errado.
│     └── SIM, e o hotspot é escrita no SQLite → continue.
│
├── WAL e os defaults de web estão ligados?
│     └── NÃO → ligue WAL + configs de web ANTES de qualquer conclusão.
│              Default de fábrica é "1 app, 1 user", inadequado p/ web.
│
├── A contenção é leitor × escritor?
│     └── WAL já resolve (leitores no banco principal, writer no WAL).
│
└── A contenção é escritor × escritor (single-writer serializando)?
      → WAL NÃO ajuda. Ataque a DURAÇÃO da transação:
        ├── callback ActiveRecord faz query/IO dentro da tx?  → mova p/ fora
        ├── fetch-loop (new/save por registro)?              → insert_all / bulk
        └── transação cobre trabalho que não precisa ser atômico? → reduza o escopo
        │
        Depois de otimizar, ainda insuficiente?
        ├── precisa de N app servers contra o mesmo dado     → Postgres/MySQL
        ├── escrita intensiva contínua + SLA apertado         → Postgres/MySQL
        └── cabe numa box (single-tenant / leitura-dominante) → SQLite serve
```
> fonte do ramo "meça primeiro": Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)
> fonte do ramo WAL/defaults: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Almost abandoning SQLite
> fonte do ramo escritor×escritor: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput
> fonte do ramo single-box: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope

### SQLite como backend de cache e fila

SQLite vira viável como backend de **cache** (Solid Cache) e **fila** (Solid Queue) porque a premissa de hardware mudou: a vantagem de velocidade da RAM sobre SSD já não justifica a complexidade de manter Redis na maioria dos casos — a vantagem do SSD passou a ser **capacity** (droplet de 2 GB de RAM com 50–100 GB de storage).
> fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite

Duas notas operacionais específicas do SQLite:

- **Cache em arquivo SQLite separado.** No Rails 8, Solid Cache usa SQLite por padrão mas em arquivo separado, para o cache (descartável) não se misturar com o sistema de registro (durável). Não guarde cache no mesmo arquivo dos dados de negócio — interfere em backup/restore dos dados críticos.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite
- **SQLite tem limites para job engines.** As estruturas de query que job engines precisam são menos eficientes no SQLite (Postgres/MySQL 8+ são superiores). Funciona bem para escala baixa/experimentos; em alta volumetria com SLA rígido, troque o driver — Postgres com Solid Queue, ou broker dedicado.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite

A análise de **durabilidade** dessa fila DB-backed (o commit do banco como ponto de durabilidade, a atomicidade fila↔estado que fecha o dual-write, e o conflito "DB-backed × broker dedicado") está em `messaging-operations.md` (Onda 1, Eixo C / C5) — não re-derivada aqui. Aponte para lá ao tocar a durabilidade da fila.

---

## Nugget Pixeltable — ACID como substrato de pipeline

O ângulo net-new dos dois últimos nuggets: **a transação ACID não é só durabilidade de uma escrita, é o substrato que faz um pipeline de dados computar tudo-ou-nada**, e o **DAG de dependências habilita recompute incremental determinístico** — recomputar só o trabalho mínimo, não rebuildar tudo.

**1. ACID como substrato do pipeline: tudo-ou-nada, sem cleanup post-hoc.** Ao inserir uma linha com colunas computadas encadeadas (vídeo → áudio → transcrição → chunks → índice), o DAG inteiro roda dentro de uma transação; se qualquer step falha, **nada é persistido**. A consequência operacional é o que importa: some o estado parcial inconsistente (transcrição que não bate com o vídeo, índice dessincronizado dos chunks) **e** somem os mecanismos de compensação — sem limpeza manual, sem cron job removendo artefatos órfãos. A atomicidade do banco deixa de ser propriedade de "uma escrita" e vira a garantia de consistência **entre artefatos** de um pipeline multi-step.
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Failure semantics and atomicity

**2. O custo escondido do all-or-nothing: atomicidade ≠ restart semântico.** São propriedades **ortogonais**. No modelo all-or-nothing, se a transcrição falha após 50 min de download + extração de áudio, todo o trabalho é descartado e a operação refaz do zero: não há checkpoint por step, não há retomar de onde parou. **REGRA — o anti-pattern fatal é tratar all-or-nothing como idempotent retry** (assumir que "rodar de novo é barato porque o sistema é ACID"). Para pipelines de minutos/horas com taxa de falha não desprezível nos steps finais, all-or-nothing puro vira retrabalho total; aí a alternativa é checkpoint/idempotência por step (que aceita estado intermediário visível em troca de restart).
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Failure semantics and atomicity

**3. DAG incremental recompute: recomputar o mínimo, não rebuildar tudo.** O sistema entende o **grafo de dependências entre colunas computadas** e executa só o trabalho necessário. Adicionou uma coluna de transcrição alternativa? Só ela é populada para as linhas existentes. Recomputou a coluna A e B depende de A? B é recomputado automaticamente e **proporcionalmente** — a propagação downstream é determinística, derivada do DAG declarado, não de um rebuild cego. Isso transforma dois anti-patterns simétricos em não-problemas: (a) "rebuildo o índice todo dia porque não capturo o diferencial" e (b) não propagar a recomputação, deixando o índice dessincronizado da coluna base.
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Incremental workflow changes

**4. Postgres como fila transacional.** Enqueue/dequeue participam da mesma transação ACID que grava os dados, fechando a janela do dual-write. **Já coberto na Onda 1** — ver `messaging-operations.md` (Eixo C / C5). Não re-derivado aqui.
> fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: What Pixeltable is (technically)

### Quando o padrão se aplica / quando NÃO

- **ACID all-or-nothing como substrato:** quando o custo de inconsistência entre artefatos > custo de reprocessamento completo. Pipelines onde estado parcialmente completado é pior que falha total e a consistência entre transformações é obrigatória (transcrição deve bater com vídeo, índice com chunks). **NÃO** em pipelines longos onde restart parcial é desejável (trabalho custoso não deve ser refeito após falha tardia), quando o custo de reprocessamento total é proibitivo, ou quando idempotência por step é preferível. Regra de corte: se o pipeline dura mais que poucos minutos **e** os steps iniciais são estáveis, avalie checkpoint por step **antes** de adotar atomicidade pura.
- **DAG incremental recompute:** quando o pipeline tem estrutura de DAG explícita com dependências **declarativas**, mudanças incrementais são comuns (adicionar step, trocar modelo, inserir linhas), e só um subset dos dados mudou. Brilha em experimentação side-by-side (chunking A vs chunking B). **NÃO** quando o input muda integralmente (substituição de vídeo reprocessa tudo de qualquer jeito), quando a dependência não é capturável pelo DAG (lógica cross-row, agregações mutáveis), ou quando o custo de rastrear o grafo supera o de recomputar tudo (pipelines muito curtos). Se as dependências não forem declaradas corretamente, recompute parcial gera **inconsistência silenciosa**.
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Incremental workflow changes

---

## Anti-patterns

**ACID × BASE (inclui C7)**

- **[C7] Citar "grandes empresas usam NoSQL em pagamentos" para justificar a escolha sem implementar os mecanismos compensatórios** (idempotência, reconciliação, compensação) que essas empresas também implementam. É o coração de C7.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático
- **Usar NoSQL em pagamento de pequena/média escala** sem justificativa técnica clara — o default do domínio financeiro continua ACID até a escala exigir diferente.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Disclaimer prático
- **Aplicar BASE a domínio de corretude forte** (débito/crédito) sem mecanismos compensatórios explícitos.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que BASE significa
- **Usar o mesmo banco e nível de consistência para todos os dados** sem perguntar quais realmente precisam de corretude forte (a divisão é por entidade, não por sistema).
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Quando usar cada um
- **Confundir o C de ACID com o C de CAP** — o C do ACID é integridade de constraints; o C do CAP é acordo entre réplicas. São conceitos distintos (ver `cap-theorem.md`).
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Consistência
- **Executar operações relacionadas em chamadas de banco separadas** sem envolvê-las numa transação, expondo o sistema a estados parcialmente aplicados.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Atomicidade
- **Assumir que isolamento impede ambas as transações de rodar** — ele garante resultado final coerente (de uma OU de outra), não que apenas uma execute.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Isolamento
- **Tratar "eventual" como instantâneo** ou ler o valor de um banco BASE como definitivo, ignorando o soft state (pode estar em sincronização).
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Eventual Consistency (consistência eventual)
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Soft State (estado fluido)
- **Esperar que "basically available" signifique 100% de uptime** — significa "melhor esforço para responder", não "nunca fica fora do ar".
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: Basically Available (geralmente disponível)
- **Assumir que um banco relacional escala indefinidamente sem custo arquitetural** — em escala muito alta, ACID (incl. manutenção de hash index de unicidade) vira gargalo que exige sharding/replicas/caching.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: O que cada modelo entrega
- **Assumir que todo banco de dados entrega ACID** — NoSQL geralmente não garante isso.
  > fonte: Augusto Galego | ACID e BASE explicado de forma simples | seção: ACID vs BASE — onde cada um aparece

**Journal modes (SQLite)**

- **Manter `journal_mode = delete` por ser o default**, sem questionar — o default é artefato histórico de retrocompatibilidade, não recomendação de performance.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Recommendation
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Benchmark results
- **Aplicar `PRAGMA journal_mode = WAL` em cada conexão nova** — definir uma vez na criação do banco basta; o modo persiste no arquivo.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Setup: two databases, two journal modes
- **Deletar manualmente o arquivo `-wal`** sem entender o estado do checkpoint — pode corromper o banco ou perder dados ainda não checkpointed.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)
- **Desabilitar o checkpoint automático sem implementar um checkpoint manual** — o `-wal` cresce sem limite, e as leituras degradam junto.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput
- **Assumir que um leitor WAL de longa duração vê dados em tempo real** — o snapshot é fixo no instante de abertura da conexão; ele não enxerga commits posteriores.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)
- **Esquecer `-wal` e `-shm` em backups/deploys** — em WAL, o `.sqlite` sozinho pode não conter as transações ainda não checkpointed.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: Write-ahead log (WAL)
- **Esperar que o WAL resolva múltiplos escritores concorrentes** — é single-writer; só resolve reader×writer.
  > fonte: Aaron Francis | SQLite's WAL mode is fast | seção: How WAL gives higher throughput

**SQLite em produção**

- **Descartar SQLite para produção web sem investigar se o problema real são transações longas** — que são corrigíveis — em vez da arquitetura single-writer em si.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)
- **Assumir que o SQLite é o bottleneck e migrar para Postgres/MySQL sem antes medir** onde a contenção realmente está.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)
- **Usar SQLite em produção web sem revisar os defaults (especialmente WAL)** — os defaults são para "1 app, 1 user"; foi o que quase fez DHH abandonar o SQLite.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Almost abandoning SQLite
- **Fazer queries, chamadas externas ou processamento pesado dentro de callbacks ActiveRecord com SQLite** — serializa operações que poderiam ser paralelas.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)
- **Usar fetch-loop (new/save por registro) para operações bulk** que caberiam numa única operação de banco (`insert_all`).
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Performance tuning findings (long-running transactions)
- **Montar múltiplos app servers apontando para o mesmo arquivo SQLite como estratégia de escala** — causa corrupção ou falhas imprevisíveis.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope
- **Descartar SQLite com base em benchmarks/percepções de 10+ anos atrás**, ignorando o que o hardware moderno tornou possível.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Capacity envelope
- **Assumir que "web multi-usuário" exige automaticamente multi-tenant com banco compartilhado** — o switching point é single-tenant × multi-tenant, não "um usuário" × "muitos usuários".
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: How SQLite fit into ONCE / Campfire
- **Guardar cache no mesmo arquivo SQLite dos dados de negócio** — mistura concerns e interfere no backup/restore dos dados críticos.
  > fonte: Aaron Francis & DHH | DHH discusses SQLite (and Stoicism) | seção: Queuing and caching driven from SQLite

**ACID como substrato de pipeline (Pixeltable)**

- **Tratar all-or-nothing como idempotent retry** ("rodar de novo é barato porque é ACID") em pipeline longo — vira retrabalho total; atomicidade ≠ restart semântico.
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Failure semantics and atomicity
- **Rebuildar todo o índice/derivado em vez de capturar o diferencial** quando o DAG de dependências permitiria recompute incremental proporcional.
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Incremental workflow changes
- **Não propagar a recomputação downstream** (ou declarar dependências incorretamente no DAG) — deixa o derivado dessincronizado da base e gera inconsistência silenciosa.
  > fonte: Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable) | seção: Incremental workflow changes

---

## Cross-refs

- `cap-theorem.md` (irmã) — **D9**: o CAP formaliza o trade-off consistência × disponibilidade sob partição no nível distribuído; o lado BASE/eventual deste documento é a face de aplicação dele. **O C do CAP ≠ o C do ACID.** Não re-derivado aqui.
- `database-selection.md` (irmã) — **D9**: seleção de tecnologia SQL × NoSQL. A decisão ACID-vs-BASE é o lado de *garantias* dessa escolha; a seleção de *tecnologia* vive lá. Não duplicado.
- `sql-indexing-and-storage.md` (irmã, Onda 2) — organização das pages em estruturas de índice (B-tree, hash index, custo de write por índice). A page como unidade aparece aqui só para explicar o custo do journal e o custo da constraint de unicidade.
- `sql-query-planning.md` (irmã, Onda 2) — como o planejador escolhe acessar os dados (uso de índice em runtime).
- `messaging-operations.md` (Onda 1) — durabilidade de **fila/broker**: fsync antes do confirm, WAL de broker, Raft, e o conflito **C5** "DB-backed × broker dedicado" (fila no Postgres/Solid Queue, atomicidade fila↔estado). O nugget 4 do Pixeltable vive lá. Aqui o WAL é journal mode de banco; lá é mecanismo de broker. Não duplicado.

---

## Fontes

- `Augusto Galego | ACID e BASE explicado de forma simples` — definição de ACID (atomicidade, consistência/constraints, isolamento, durabilidade) e de BASE (basically available, soft state, eventual consistency); o trade-off corretude × disponibilidade; o custo de performance do ACID e o hash index de unicidade; o guia de domínios; e o **disclaimer prático** que carrega **C7** (NoSQL usado em pagamentos em escala extrema, com corretude movida para reconciliação/idempotência/compensação na aplicação). Também a base de atomicidade e durabilidade que justifica os journal modes, e `journal_mode=MEMORY` como sacrifício deliberado de durabilidade.
- `Aaron Francis | SQLite's WAL mode is fast` — page como unidade fixa de I/O; rollback journal copia o original para fora e muta o principal (commit = destruir o journal, leitores bloqueados); WAL deixa o principal intacto e escreve no `-wal` (leitura concorrente, rollback = descartar o fim do log, crash-safety natural); checkpoint mescla o WAL no principal (trade-off de frequência); snapshot isolation por abertura de conexão; benchmark >10x (568 ms vs 7,2 s); default `delete` é artefato histórico; libSQL/Turso WAL-only; setup via `PRAGMA journal_mode = WAL` antes de popular.
- `Aaron Francis & DHH | DHH discusses SQLite (and Stoicism)` — single-writer e transações longas (o gargalo real é a duração da tx, não a arquitetura); callbacks Rails dentro da transação; `insert_all` × fetch-loop; stress test como diagnóstico de hotspot; defaults históricos ruins p/ web (quase-abandono do SQLite); envelope de capacidade expandido por hardware (500–10.000 usuários/box); single-box constraint e fit single-tenant (ONCE/Campfire); eliminar moving parts; Solid Cache/Solid Queue DB-backed e limites do SQLite p/ job engines.
- `Aaron Francis & Marcel Kornacker | The database for all your AI needs (Pixeltable)` — fonte majoritariamente off-topic (narrativa de produto descartada). Resgatados 4 nuggets SQL: (1) ACID all-or-nothing como substrato de consistência entre artefatos de pipeline; (2) atomicidade ≠ restart semântico, o custo do all-or-nothing; (3) DAG incremental recompute determinístico com propagação downstream; (4) Postgres como fila transacional — já coberto na Onda 1 (`messaging-operations.md`), aqui só ponteiro.

**Carrega C7** (ortodoxo "ACID para dinheiro" × pragmático "NoSQL em pagamentos") resolvido via **D4** — os dois lados citados, fechados com regra SE/ENTÃO de duas condições (escala-gargalo **E** capacidade compensatória). **Cruza com D9** — o lado BASE/eventual liga a `cap-theorem.md` e a seleção SQL×NoSQL (`database-selection.md`), ambas já existentes em `system-design`; o C-de-ACID ≠ o C-de-CAP.

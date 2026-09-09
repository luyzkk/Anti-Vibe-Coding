# Memoria: Plano 02 — O ciclo roda no execute-plan

**Feature:** Contrato Unico do Ciclo TDD por Fase
**Iniciado:** 2026-09-08
**Status:** em andamento (fases 01-03 concluidas; fase-04 com o Passo 1, o RF-05 (DI-8), as rodadas r2/r3 (DI-9) e a correcao do achado delas (DI-10) feitos — falta a Premissa 1, que exige sessao limpa, e o SUMMARY)
**Branch:** `feat/tdd-cycle-contract-plano02` (empilhada sobre `feat/tdd-cycle-contract`, que esta na PR #79)

---

## Decisoes de Implementacao

- **DI-1 (fase-01): o RED-check FALHOU na primeira passada — e esse e o resultado mais importante desta
  fase.** O GREEN fechou `27 pass / 0 fail`. Mas ao aplicar a defesa nomeada no checklist — apagar a linha
  `contem \`Cannot find module\` | \`Cannot resolve\` | \`error TS\` | \`SyntaxError\`` do passo 2 do 4c — o
  teste **continuou verde**. `red_check: fail`.
  - Causa: `expect(step4c).toContain('Cannot find module')`. O token aparece **duas vezes** no bloco `### 4c.`:
    na regra de classificacao (a defesa) e dentro da mensagem de erro que a propria regra emite
    (`§Sinal Cannot find module`). Apagar a regra deixa a mencao, e o `toContain` fica satisfeito.
  - A assercao provava que a **palavra** aparecia, nao que a **regra** existia. E o GT-3 do Plano 01 outra
    vez, num contexto novo.
  - Nao parei no primeiro achado: auditei a multiplicidade de TODOS os tokens asseridos dentro do bloco
    (`grep -c` de cada um sobre a secao recortada) e achei mais dois vacuos, um deles confirmado por
    mutacao antes de mexer em qualquer coisa. Ver **GT-1**.
  - Impacto: `agents/plan-executor.md` §RED (escrito no Plano 01 fase-03) manda "teste que nasce verde
    exige mutacao no mesmo passo". Estas assercoes nasceram verdes — a defesa ja estava no `SKILL.md`
    quando o teste foi escrito. Se essa regra tivesse sido seguida na escrita do RED, os tres vacuos
    teriam aparecido ali, nao no RED-check. **O contrato ja previa; faltou aplicar.**

- **DI-2 (fase-01): as tres assercoes vacuas e o que ficou no lugar.**
  | # | Assercao antes | Por que era vacua | Depois |
  |---|---|---|---|
  | a | `toContain('Cannot find module')` | 2 ocorrencias: a regra e a mensagem que ela emite | `toMatch(/\`Cannot find module\`[\s\S]*?red_confirmed: blocked/)` — ancora no par condicao → desfecho |
  | b | `toContain('tdd-cycle-checklist')` | 2 ocorrencias: o ponteiro stub-first do passo 1 e a mensagem do bloqueio | `toMatch(/red_confirmed: blocked[\s\S]*?tdd-cycle-checklist/)` — ancora no par |
  | c | `toContain('human_gate')` | 2 ocorrencias: `stopped` e `skipped` — apagar o ramo que PARA deixava o outro | dois `toContain` separados: `human_gate: stopped` **e** `human_gate: skipped` |
  - A (c) e a mais seria das tres: CA-05 e bilateral ("dado `[RISCO]`, para; dado fase sem marca, nao
    para") e a assercao aceitava so um dos lados. Um 4c que nunca parasse para o humano passaria no gate.
  - As mensagens de erro de (a) e (b) agora **explicam por que a regex e acoplada**, com a data do vacuo,
    para a proxima pessoa nao "simplificar" de volta para um `toContain`.

- **DI-3 (fase-01): REFACTOR = `none`, e o candidato que a fase nomeou deixou de existir.** O Passo 7
  previa extrair `const mustContain = (needle, why) => ...` "se as 6 assercoes ficaram repetitivas (ex.:
  quatro `expect(step4c).toContain(...)` com mensagens quase iguais)". Depois do fortalecimento da DI-2 elas
  nao sao mais quase iguais: tres `toContain` curtas e tres `toMatch` acopladas com mensagens longas. O
  helper cobriria so metade e esconderia justamente as acopladas, que sao as que exigem leitura.
  - Uma redundancia foi **mantida de proposito**: `toContain('red_confirmed')` e subsumida pelas tres
    assercoes seguintes. Num gate "nunca diminuir", apagar assercao redundante custa mais do que mante-la —
    se alguem reescrever as regex acopladas, a crua ainda pega a remocao total do conceito.

- **DI-4 (fase-02): a auditoria do GT-1 rodou ANTES do RED e evitou repetir a fase-01.** Antes de mandar
  escrever as assercoes, contei a multiplicidade dos tokens que a fase ia asserir — inclusive prevendo o
  que o GREEN ainda ia introduzir. Duas nasceriam vacuas:
  | assercao do doc da fase | contagem | por que quebraria |
  |---|---|---|
  | `toContain('blocked')` (CA-07) | `blocked` ja aparecia **2x** via `red_confirmed: blocked` (passo 2, escrito na fase-01) | nasce satisfeita; apagar `fase blocked` do passo 5 nunca a derrubaria |
  | `toContain('git diff --stat')` (CA-06) | **2x** apos o GREEN: a pre-condicao "antes de mutar" e a exigencia "apos restaurar" | a defesa nomeada no RED-check apaga so a segunda |
  - As duas foram escritas ja acopladas: `toMatch(/red_check: fail[\s\S]*?blocked/)` e
    `toMatch(/git restore[\s\S]*?git diff --stat/)`.
  - **Provado, nao suposto:** no RED-check, com a defesa do CA-06 apagada, `git diff --stat` continuava no
    bloco (linha da pre-condicao) — um `toContain` teria ficado verde. O mesmo para o CA-07: mutei **so**
    `fase blocked;`, mantendo a DI, e `blocked` seguia aparecendo 2x; a regex acoplada pegou.
  - Custo da auditoria: um `grep -c` por token. Custo de nao ter feito na fase-01: um RED-check falho,
    uma auditoria depois, e um commit de conserto.

- **DI-5 (fase-02): REFACTOR feito — a convencao do preambulo tinha regredido.** O Plano 01 fase-03
  normalizou as mensagens deste arquivo para `[parity gate "nunca diminuir" — TAG]`. Os dois `describe` do
  Plano 02 vieram dos docs de fase, escritos **antes** dessa normalizacao, e reintroduziram a forma curta:
  22 mensagens na convencao contra **17** fora, todas nos describes novos. Commit `3094e23` uniformiza as 17
  (39 na convencao, 0 fora).
  - O candidato que o Passo 6 nomeava — extrair `mustContain` — foi **recusado com motivo**: cobriria 8 das
    24 assercoes dos dois describes (as outras sao `toMatch` ou tem outro sujeito: `executePlan` cru,
    `section(waveExecution, ...)`, `section(executePlan, '## Regras Criticas')`) e esconderia justamente as
    mensagens longas, que existem para ser lidas na falha.
  - Re-provado por mutacao apos o refactor (DI-5 do Plano 01): tres mutacoes re-rodadas, incluindo a mais
    sutil (so `fase blocked;`), todas derrubando o teste certo.

- **DI-7: o dogfood achou dois defeitos no 4c, e os dois eram invisiveis por leitura.** Achados rodando a
  fase-01 num fixture real; corrigidos com RED proprio (`be474af`) e GREEN (`8c6cf6e`).

  **Defeito 1 — a pre-condicao do passo 5 era inatingivel.** O passo 2 manda gravar a linha do STATE log
  ANTES do gate (DP-5/G22, para nao perder o RED). O STATE log vive **dentro do repo do projeto**. Entao,
  quando o passo 5 exigia `git diff --stat` vazio antes de mutar, a arvore sempre tinha o STATE modificado.
  Observado literalmente no fixture: `docs/exec-plans/.../STATE.md | 1 +` no momento exato da pre-condicao.
  Um orquestrador que seguisse o texto ao pe da letra travaria — ou ignoraria a pre-condicao, que e pior,
  porque ela existe para detectar residuo de mutacao.
  - Fix: escopar ao arquivo da defesa — `git diff --stat -- {arquivo}`, na pre-condicao e na prova
    pos-restauracao. E o que de fato importa: que a mutacao e a unica mudanca naquele arquivo e que o
    restore devolveu exatamente o GREEN. A verificacao de arvore inteira era larga demais.

  **Defeito 2 — a evidencia do `red_check` nunca entrava no historico.** Quem apontou foi o **proprio
  `plan-verifier`** da rodada: a atualizacao do STATE estava uncommitted, entao a unica prova do RED-check
  morava na working tree. O 4c escrevia no STATE e nunca mandava commitar.
  - Fix: passos 2 e 6 passam a mandar commitar, com prefixo `docs(state)`. O commit do passo 2 tambem
    **limpa a arvore para a pre-condicao do passo 5** — os dois defeitos tinham a mesma raiz.

  **Por que isto e o argumento da feature inteira:** os dois passaram por escrita, revisao, 36 assertions de
  paridade e tres RED-checks por fase. Nenhum apareceu. So apareceram quando o ciclo **rodou**. Gate de
  paridade prova texto; dogfood prova execucao — e o PRD estava certo em exigir os dois.

  **Regressao apos o fix:** as **19** defesas (15 antigas + 4 novas) foram re-rodadas e todas derrubam o
  teste nomeado (GT-5). A `F2-d1` agora derruba 2 testes: a assertion antiga e a nova guardam a mesma linha
  por angulos diferentes.

- **DI-6 (fase-03): o GREEN de uma fase deixou DUAS assercoes de uma fase ANTERIOR vacuas, em silencio.**
  O maior achado desta feature depois do da fase-01, e de uma classe diferente.
  - As tres fases do Plano 02 asserem sobre o **mesmo** bloco `### 4c.`. O GREEN da fase-03 acrescentou o
    passo 6 e o formato da linha do STATE log — e com eles duas novas ocorrencias de tokens que assercoes
    da **fase-02** ja usavam:
    | assercao (fase-02) | regex | o que a resgatou | onde |
    |---|---|---|---|
    | CA-06 | `/git restore[\s\S]*?git diff --stat/` | `- Lista de arquivos tocados: saida de \`git diff --stat {HEAD-antes}..HEAD\`` | passo 6, RECEBE |
    | CA-07 | `/red_check: fail[\s\S]*?blocked/` | `red_confirmed: {assertion\|blocked\|gate-textual}` | formato da linha do STATE log |
  - As duas regexes estavam **corretas quando escritas** e passaram no RED-check da fase-02. O defeito e o
    `[\s\S]*?` **sem limite**: ele atravessa o bloco inteiro, entao qualquer texto acrescentado depois pode
    satisfazer o par. Fix (`8462fab`): `[\s\S]{0,120}`. A faixa valida foi **calculada**, nao chutada —
    CA-06 aceita `18 <= N < 845`, CA-07 aceita `40 <= N < 426`; 120 esta na intersecao com folga dos dois lados.
  - **Falha de processo minha, nao do plano:** no RED-check da fase-03 rodei so as 4 defesas que a fase-03
    nomeia, e auditei so os tokens que a fase-03 assere. As duas quebras estavam em defesas da fase-02.
    Ver **GT-5**.

- **DI-8 (fase-04): RF-05 fica sempre ligado — o verifier nao passa a ser condicionado ao nivel.**
  Decisao do dev em 2026-09-09, com o numero da r1 na mao. A linha do STATE da r1 diz literalmente
  `custo: testes=8 spawns=3 (RED, GREEN, plan-verifier)`; o verifier sozinho foi 1 spawn + 2 rodadas.

  | Unidade contada | Fatia do verifier | Limiar do PRD (30%) |
  |---|---|---|
  | Spawns | 1 de 3 = **33%** | acima |
  | Rodadas de teste | 2 de 8 = **25%** | abaixo |
  | Rodadas, descontando a dupla-execucao do passo 2 (piso real 7) | 2 de 7 = **29%** | abaixo |

  O limiar e atravessado ou nao conforme a unidade contada — sozinho, o numero nao decide. O que decidiu:
  - **A fase medida e o piso do denominador.** `fase-01-sum` e o tracer bullet: funcao de uma linha, um
    teste, `refactor: none`. O custo do verifier por fase e quase fixo (le o arquivo da fase, a linha do
    STATE, o `git diff --stat` e roda o teste nomeado); o denominador cresce com o tamanho da fase. Logo
    25-33% e **teto**, nao valor tipico. Numa fase real desta propria feature a mesma despesa fixa seria
    uma fatia bem menor.
  - **O verifier pagou-se na unica rodada em que existiu.** Foi ele quem apontou o Defeito 2 do DI-7 (a
    evidencia do `red_check` nunca entrava no historico). Retrabalho evitado e exatamente o que a
    Premissa 4 compara contra o custo.
  - **O nivel Direto ja e a valvula de escape.** Condicionar o verifier ao nivel faria o `direto` ser
    silenciosamente mais fraco do que o nome promete, e contradiria o esperado da r3 no roteiro
    ("RED-check e verifier continuam rodando").
  - **Mudar custaria um RED proprio.** O passo 6 do 4c e incondicional hoje; condiciona-lo volta para a
    fase-03 com assercao nova no gate de paridade. Preco alto contra um limiar que nao foi claramente
    cruzado.

  **Ressalva honesta:** a Premissa 4 pede medicao em **3 fases** e temos **1**. A decisao esta tomada com
  n=1, e o argumento que a sustenta e sobre a *forma* da medida (denominador minimo, custo fixo), nao
  sobre a precisao dela. Se r2 e r3 mostrarem o verifier acima de 30% numa fase **maior** que o tracer
  bullet, o argumento cai e o RF-05 volta a mesa.

- **DI-9 (fase-04): r2 e r3 executadas — o mecanismo funciona, e o dogfood achou um TERCEIRO defeito no 4c.**
  Rodadas feitas pelo orquestrador **desta** sessao, que antes de rodar leu o HANDOFF, este MEMORY e o
  roteiro. **Contaminadas para a Premissa 1**, e pior que a r1 nisso: o roteiro lista o desfecho esperado de
  cada rodada. Valem para o mecanico — a fase bloqueia? o `direto` pula o gate? o verifier roda? — e nao
  valem como resposta a "o 4c como prompt muda o comportamento real". Isto esta dito aqui porque um log
  sem a ressalva seria enganoso.

  **r2 — caso negativo. Fechou exatamente no esperado, CA-07 confirmado em runtime.**
  A defesa nomeada pela fase e inserir `// mutacao-inofensiva` no topo de `src/sum.ts` — no-op semantico.
  Aplicada, o teste `sums two numbers` **passou** (exit 0, `1 pass / 0 fail`). O orquestrador registrou
  `red_check: fail`, restaurou o arquivo, deixou `git diff --stat -- src/sum.ts` vazio, marcou a fase
  `blocked`, escreveu a DI "teste nao prova a defesa" no MEMORY do fixture e **nao iniciou a fase-02**
  (`src/` ficou so com `sum.ts` e `sum.test.ts`). O `plan-verifier` devolveu `red-check-evidence: fail`
  com verdict `block`. Premissa 2 revalidada: a linha com `red_confirmed: assertion` estava commitada
  (`7870e70`) antes de o gate perguntar.

  **r3 — `--tdd-level direto`. Fechou exatamente no esperado.**
  O passo 0 resolveu `direto` do argumento; o passo 3 **nao parou em nenhuma das duas fases** — nem no
  tracer bullet, nem na de risco `[RISCO: auth/authz]` com bloco `### Seguranca`. RED-check e verifier
  rodaram nas duas, `red_check: pass` em ambas: `a + b` -> `a - b` derrubou `sums two numbers`
  (`Expected: 5 / Received: -1`); remover `user.id === doc.ownerId` derrubou
  `denies read when user is not the owner` (`Expected: false / Received: true`), o que confirma o CA-SEC-1
  por mutacao. Suite final `3 pass / 0 fail`, `git diff --stat` vazio, sem residuo de mutacao.

  **O defeito novo, reproduzido 3 vezes em 3 verificacoes: o passo 6 spawna o verifier ANTES de commitar
  a linha do STATE.** O passo 6 manda o verifier RECEBER "a linha do STATE log desta fase" — que so fica
  completa no passo 5 — mas a instrucao de commit e o **ultimo** bullet do passo 6, depois do spawn. Logo
  o verifier le sempre uma linha que existe so na working tree. Nas tres verificacoes ele apontou isso
  sozinho; nas duas da r3 com `verdict: request_changes` e severidade **high**, e na segunda delas ele
  mesmo classificou como "recorrencia, nao incidente isolado".
  - E a **mesma classe** do Defeito 2 do DI-7: evidencia que nao esta no historico quando alguem a le. O
    DI-7 fez a evidencia chegar ao historico; nao fez chegar **antes do leitor**.
  - Fix: mover o commit da linha do STATE para **antes** do spawn no passo 6, ou commitar no fim do passo 5.
    **Volta para a fase-03 com RED proprio no teste de paridade** — nao se remenda o 4c dentro do dogfood
    (foi assim que o DI-7 foi corrigido).

  **Quatro lacunas menores do 4c, todas observadas rodando:**
  | # | Lacuna | Evidencia |
  |---|---|---|
  | 1 | O 4c nao diz se o passo 6 roda quando `red_check: fail`. O passo 5 encerra com "fase blocked ... dev avisado no Step 5"; so a existencia do ramo `fail` do `red-check-evidence` no passo 6 permite inferir que sim | segui o ramo `fail`; um orquestrador que parasse no passo 5 tambem estaria seguindo o texto |
  | 2 | O passo 6 so da mensagem de commit para o caminho feliz (`docs(state): fase-{NN} concluida`). Na r2 a fase estava **blocked**, nao concluida | usei `docs(state): fase-01 blocked — red_check fail` |
  | 3 | `blocked` nao existe no vocabulario do STATE: o Step 2 define `Phase` como planned/in-progress/paused/completed e `Status` do plano como pending/in-progress/completed/paused | escrevi `blocked` na coluna Status assim mesmo, porque o 4c manda |
  | 4 | Os checkboxes do bloco `### TDD` da fase nunca sao marcados — nem o 4c nem o `plan-executor.md` mandam | o verifier da r3 apontou como `medium`: "todas as 6 caixas desmarcadas apesar do trabalho verificavelmente completo" |

  **Duas observacoes de vocabulario e de contagem:**
  - `human_gate: stopped` e **ambiguo para o verifier**, que nao recebe o 4c. Na r2 ele leu `stopped` como
    "fase parada aguardando decisao humana" e emitiu `task_complete: fail`. Nao mudou o desfecho ali
    (o verdict ja era `block` pelo `red_check`), mas numa fase saudavel produziria um bloqueio falso.
  - O `custo: testes={rodadas}` e escrito no passo 6, e o **Step 5 roda a suite depois** — a contagem
    registrada sub-conta por pelo menos uma rodada, sempre.

  **Uma confirmacao de que o passo 2 se paga:** o subagente RED da fase-02 da r3 devolveu so os caminhos
  dos arquivos e o hash, sem as saidas literais que a instrucao pedia. O passo 2 (orquestrador roda o teste
  ele mesmo) pegou o buraco sem depender do relato.

- **Quadro "Custo por fase no dogfood" — atualizado com as tres fases das rodadas r2 e r3:**

  | Rodada / fase | tdd_level | Rodadas de teste | Spawns | Verifier em rodadas | Verifier em spawns |
  |---|---|---|---|---|---|
  | r1 / fase-01 | assistido | 8 (piso real 7) | 3 | 2 de 8 = 25% | 1 de 3 = 33% |
  | r2 / fase-01 | assistido | 6 | 3 | 1 de 6 = 17% | 1 de 3 = 33% |
  | r3 / fase-01 | direto | 6 | 3 | 1 de 6 = 17% | 1 de 3 = 33% |
  | r3 / fase-02 | direto | 9 | 3 | 2 de 9 = 22% | 1 de 3 = 33% |

  **O que o quadro diz sobre o RF-05 (DI-8):** em rodadas de teste a fatia do verifier **caiu** de 25% para
  17-22% conforme a fase cresceu — exatamente a forma que a DI-8 previu, custo fixo sobre denominador maior.
  Em spawns ela fica presa em 33% porque toda fase aqui tem exatamente 3 spawns (RED, GREEN, verifier);
  numa fase com retry ou com RED re-spawnado pelo gate, o denominador cresce e a fatia cai tambem.
  **A ressalva da DI-8 continua de pe:** nenhuma das quatro fases medidas e maior que o tracer bullet de
  forma significativa — a maior tem dois testes. O teste que a Premissa 4 realmente pede, uma fase de
  tamanho real, ainda nao foi feito.

- **DI-10 (correcao pos-dogfood): o achado do DI-9 corrigido com RED proprio, e a regressao do GT-5 feita
  por varredura em vez de mutacoes escolhidas a dedo.** RED `6739798` (`40 pass / 3 fail`, as tres por
  assertion, zero regressao nas 40), GREEN `aece622` (`43 pass / 0 fail`).

  **O fix, em duas mudancas aditivas (DP-1 — zero linha removida dos passos 0-4):**
  - fim do passo 5 ganha `Commitar a linha do STATE log ja com red_check e refactor ANTES de spawnar o
    passo 6`, com mensagem propria para o caminho pass e para o caminho `blocked` — a r2 fechou blocked, e
    fase blocked nao esta "concluida", entao a mensagem do caminho feliz mentiria sobre o desfecho
  - o `RECEBE` do passo 6 passa a dizer que a linha **ja chega commitada do passo 5**
  As duas assercoes sao um par deliberado: uma guarda o lado que escreve, a outra o lado que le.

  **Auditoria GT-1 rodada ANTES do RED, como a fase-02 ensinou:** no bloco 4c, `docs(state)` ja aparecia
  **2x** e `blocked` **4x** — um `toContain` de qualquer um dos dois nasceria vacuo. Os tres tokens novos
  estavam em **0**. Por isso duas assercoes ancoram por linha (`[^\n]*`, GT-6) e a terceira e acoplada com
  limite `{0,60}` **calculado**: a distancia real entre as duas ancoras e de 20 caracteres.

  **RED-check — os tres nomeados, isolados, `42 pass / 1 fail` cada, `git diff --stat` vazio apos cada
  restauracao:**
  | # | Defesa mutada | Teste que caiu |
  |---|---|---|
  | d1 | apagado ` ANTES de spawnar o passo 6` do bullet do passo 5 | `o passo 5 commita a linha do STATE antes de spawnar o passo 6` |
  | d2 | apagado `, ja commitada no passo 5` do RECEBE do passo 6 | `o passo 6 declara que a linha do STATE ja chega commitada` |
  | d3 | apagada a mensagem de commit do caminho blocked | `o commit do passo 5 nomeia o caminho pass e o caminho blocked` |

  **Regressao do GT-5 — feita como varredura de delecao de linha, nao como lista de mutacoes.** Em vez de
  re-rodar as 19 defesas nomeadas, apaguei **uma linha por vez** das **118** do bloco `### 4c.` (118
  rodadas do teste de paridade, com `git restore` entre cada uma) e registrei quais testes cada delecao
  derruba. Resultado: das **16** assercoes cujo corpo le `step4c`, **todas as 16 caem por pelo menos uma
  delecao** — nenhuma vacua. 91 das 118 linhas nao derrubam nada, o que e esperado: o gate guarda 16
  preocupacoes distintas espalhadas por 27 linhas.
  - **Por que a varredura e mais forte que a lista:** a lista prova que as defesas que voce **lembrou** de
    mutar sao guardadas; a varredura prova que **nenhuma** assercao do bloco sobrevive a toda delecao de
    linha. E o antidoto direto ao GT-1 ("mutacao sozinha so acha o que voce lembrou de mutar") e ao GT-5.
  - Custo: um script de ~15 linhas e ~4 minutos de relogio. Barato o bastante para virar o padrao quando
    uma fase edita um bloco que varias fases asserem.
  - **Cuidado ao ler o resultado:** a primeira analise acusou 7 assercoes "sem cobertura". Eram falso
    positivo do meu enumerador, que classificou describes inteiros em vez de corpos de teste — as 7
    asserem sobre outros arquivos (`waveExecution`, `planVerifier`, `template`) ou outras secoes do mesmo
    arquivo (`## Regras Criticas`, `## Step 5`, o `argument-hint` cru). Conferi uma a uma antes de
    concluir. GT-3 vale tambem para numero que a **minha** ferramenta produz.

  **REFACTOR: none, com motivo examinado.** O GREEN e prosa num `SKILL.md`, sem nada a extrair. As tres
  assercoes novas nao usam `toContain` nenhuma vez e nao tem forma repetida: duas sao `toMatch` ancoradas
  por linha com ancoras distintas, a terceira e acoplada. O helper `mustContain`, ja recusado com motivo
  na DI-3 e na DI-5, cobriria **zero** delas.

  **Verificacoes:** suite `2187 pass, 0 fail` (delta desde 2184 = **+3**, exatamente as assercoes novas);
  `typecheck` exit 0; `harness:validate` ok; manifest com **1** checksum (`skills/execute-plan/SKILL.md`),
  zero drift, conferido por comparacao de checksum e nao por `git diff --stat`. A primeira rodada da suite
  deu `2 fail` e a re-rodada deu 0 — flakiness conhecida do Windows, e a rodada suja levou 153s contra 27s
  na limpa.

---

## Bugs Descobertos

Nenhum bug de codigo nesta fase. O achado da DI-1 e um defeito de **teste**, nao de produto: a defesa no
`skills/execute-plan/SKILL.md` estava correta desde o GREEN; quem nao provava era a assercao.

---

## Gotchas

- **GT-1: antes de confiar num `toContain`, conte as ocorrencias do token na secao alvo.** Foi assim que
  os outros dois vacuos apareceram, depois que a mutacao pegou o primeiro:
  ```
  awk '/^### 4c\./{f=1} f&&/^### 4d\./{exit} f{print}' skills/execute-plan/SKILL.md > /tmp/4c.txt
  for t in "<token1>" "<token2>" ...; do printf "%-28s %s\n" "$t" "$(grep -c -- "$t" /tmp/4c.txt)"; done
  ```
  Resultado da auditoria da fase-01: `Contrato do Ciclo por Fase` 1, `--tdd-level` 1, `user_profile` 1,
  `red_confirmed: assertion` 1, `AskUserQuestion` 1 — seguros; `Cannot find module` **2**,
  `tdd-cycle-checklist` **2**, `human_gate` **2** — vacuos.
  - Contagem 1 hoje nao e garantia amanha: se uma fase seguinte acrescentar uma segunda mencao, a assercao
    fica vacua **em silencio**. Nas fases 02 e 03, que editam o MESMO bloco 4c, rodar a auditoria de novo.
  - A auditoria e barata e determinista; a mutacao e a prova. Auditar primeiro, mutar depois — a mutacao
    sozinha so acha o que voce lembrou de mutar.

- **GT-2: `diff`/`cmp` bruto sobre arquivo do repo mente — o checkout esta em CRLF.** `core.autocrlf=true`
  e sem override em `.gitattributes` para `*.md`, entao os arquivos no disco tem `\r\n`. `sed`, `cat` e
  `grep` mascaram o `\r`; `diff` e `cmp` nao, e reportam o arquivo inteiro como reescrito. Para conferir
  fidelidade de conteudo use `git diff` (que normaliza EOL) ou normalize os dois lados antes
  (`sed 's/\r$//'`). Descoberto pelo subagente do GREEN, custou uma investigacao.

- **GT-3: mais um numero previsto pelo planejador que nao bate.** O checklist da fase manda
  `grep -c "AskUserQuestion" skills/execute-plan/SKILL.md` → `3`. O valor real **antes** desta fase ja era
  **7** (`allowed-tools` + Steps 0, 0, 2, 2.5, 3c, 6a); depois do GREEN, **8**. Terceira vez na feature
  (ver GT-4 e GT-7 do Plano 01). Tratar todo numero escrito em doc de fase como estimativa a conferir.
  - **Quarta e quinta vez, na fase-02:** o doc diz que `## Regras Criticas` esta na linha 806 — esta na
    **842**. E preve "5 falhas por expect" no RED; foram **4**, porque `Defesa a mutar` e `Teste que deve
    cair` ja existiam no 4c desde a fase-01, entao o teste `4c le Defesa a mutar e Teste que deve cair (D6)`
    nasceu verde. Reportado como veio, sem forcar nada a ficar vermelho.

- **GT-4: `grep -c` conta LINHAS, nao ocorrencias.** Na auditoria do 4c, `git restore` deu `1` — mas a
  linha 490 tem `git restore {arquivo}` **e** `git restore .` (dentro da frase "nunca ..."). Para
  multiplicidade de token dentro de uma mesma linha, usar `grep -o ... | wc -l`. No caso nao mudou a
  conclusao (as duas ocorrencias estao na mesma linha, entao apagar a linha derruba as duas), mas a leitura
  ingenua do numero poderia ter escondido um vacuo.

- **GT-5: quando varias fases asserem sobre o MESMO bloco, o RED-check de cada fase tem de re-rodar
  TODAS as defesas do bloco — nao so as da fase corrente.** Foi assim que as duas quebras da DI-6
  apareceram: rodei a regressao das 15 defesas das tres fases e duas nao caiam mais. Rodar so as 4 da
  fase-03 teria fechado a fase com o gate mudo em dois pontos.
  - O mesmo vale para a auditoria de multiplicidade (GT-1): auditar os tokens que **todas** as fases
    asserem sobre o bloco, nao so os que a fase corrente introduz.
  - Custo real: ~15 mutacoes, alguns minutos. Um loop de shell resolve
    (`mutar → bun test | grep -c '^(fail)' → git restore <arquivo>`).

- **GT-6: `[\s\S]*?` sem limite envelhece mal em bloco que cresce.** Nao-guloso nao significa "proximo":
  ele vai ate onde precisar para casar. Em documento que fases posteriores ampliam, use limite explicito
  (`[\s\S]{0,N}`) e **calcule** N — a distancia real entre as ancoras e a distancia ate o texto que pode
  resgatar a regex. Contar caractere a mao em texto com travessao e acento e chute.

- **GT-7: num prompt que manda escrever e depois manda ler, a ORDEM dos bullets e o contrato.** O passo 6
  do 4c manda o `plan-verifier` receber "a linha do STATE log desta fase" e, varios bullets depois, manda
  commitar essa linha. Lendo de cima para baixo, o spawn acontece antes do commit — entao o verifier le
  sempre uma linha que so existe na working tree. Reproduziu-se **3 vezes em 3 verificacoes** nas rodadas
  r2 e r3, e o proprio verifier classificou como recorrencia na terceira.
  - E a mesma classe do Defeito 2 do DI-7, um nivel acima: o DI-7 garantiu que a evidencia **chega** ao
    historico; nao garantiu que chega **antes de quem a le**.
  - A licao generaliza: sempre que um passo de prompt produz um artefato e um passo seguinte o consome,
    conferir se a instrucao de **persistir** vem antes da instrucao de **consumir**. Nenhuma das 40
    assercoes do gate de paridade pega isso — todas provam que o texto existe, nenhuma prova em que ordem.
  - Como pegar sem rodar: listar os bullets do passo na ordem de execucao e perguntar, para cada artefato
    citado no RECEBE, qual bullet anterior o deixou duravel.

- **GT-8: `\` dentro de heredoc entregue ao `python -` por stdin chega colapsado para `\`.** Custou tres
  edicoes falhas nesta sessao. `"F:\tmp\avc"` no literal Python vira `F:\tmp\avc`, e o Python entao le
  `\t` como TAB e `\a` como BEL — o padrao nunca casa, e se casar grava caractere de controle no arquivo.
  Aconteceu em `HANDOFF.md` (gravou `F:<TAB>mp<BEL>vc-...`) e em dois `python - <<'PY'` de edicao.
  - **Antidoto:** montar a barra com `chr(92)`, ou escrever o script num arquivo e rodar `python arquivo.py`
    — o caminho arquivo preserva tanto a barra quanto acentuacao e travessao.
  - Sintoma tambem em UTF-8: o mesmo heredoc-por-stdin mangla `—` (o assert falhou com
    `'do gate \ufffd remover o alvo'` no repr). O caminho arquivo nao mangla.
  - Depois de gravar, varrer o resultado por controle indevido:
    `python -c "...if chr(9) in l or chr(7) in l..."` — foi assim que achei o estrago no HANDOFF.

- **GT-9: o `SKILL.md` do checkout e CRLF, entao match multi-linha com `\n` puro nao casa.** Extensao
  pratica do GT-2, que ja avisava sobre `diff`/`cmp`. Ao editar por script, ler com `newline=""` e montar
  as ancoras multi-linha com `chr(13)+chr(10)`; ou ancorar so em trechos de uma linha. O teste de paridade
  nao sofre disso porque o helper `read()` faz `.replace(/\r/g, '')` — quem edita, sofre.

---

## Desvios do Plano

- **DEV-1 (fase-01): o Plano 02 foi para uma branch propria, `feat/tdd-cycle-contract-plano02`.** O Plano 01
  esta na PR #79 a partir de `feat/tdd-cycle-contract`; continuar nela faria os commits do Plano 02 caírem
  dentro daquela PR e desfaria a separacao pedida. Branch empilhada sobre a mesma base.
  - Quando a #79 fizer merge, esta branch pode ser rebaseada sobre a `main`.

- **DEV-2 (fase-01): um commit a mais do que a fase previa.** Alem de RED (`88947d3`) e GREEN (`2b394b2`),
  entrou `711d43d` (`test(execute-plan): assercoes do 4c param de passar pelo motivo errado`), que corrige
  o achado da DI-1. Nao e refactor nem feature — e conserto do gate, provocado pelo RED-check. Ficou em
  commit proprio para que o diff do achado seja legivel isolado.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 3 |
| Fases com desvio | 1 (DEV-1, DEV-2) |
| Bugs encontrados | 0 de codigo; 3 assercoes vacuas na fase-01 (DI-1/DI-2), 2 evitadas na fase-02 (DI-4), 2 regredidas e consertadas na fase-03 (DI-6) |
| Retries necessarios | 0 |
| RED-checks executados | fase-01: 6+2; fase-02: 4+1+3 re-provas; fase-03: 4 nomeados + 3 re-provas + **regressao completa das 15 defesas, 2x** |
| RED-checks que FALHARAM | **5** — 3 na fase-01 (assercoes nascidas vacuas), 2 na fase-03 (assercoes da fase-02 regredidas pelo GREEN da fase-03). Todos corrigidos e re-provados. |
| Assercoes no gate de paridade | 21 → 27 → 32 → 36 → 40 → **43** |
| Suite | 2165 → 2171 → 2176 → 2180 → 2184 → **2187 pass, 0 fail** |
| Defesas no RED-check (regressao completa) | **19** nomeadas, todas caindo pelo teste nomeado. Na correcao pos-dogfood a regressao virou **varredura**: 118 delecoes de linha do bloco 4c, **16/16** assercoes que leem `step4c` derrubadas, nenhuma vacua (DI-10) |
| Defeitos achados so pelo dogfood | **3** — 2 na r1 (DI-7) e 1 nas r2/r3 (DI-9, ordem do passo 6). Nenhum visivel as 40 assercoes nem aos RED-checks por fase |
| Rodadas de dogfood executadas | **3** (r1 fase-01; r2 fase-01; r3 fase-01 e fase-02) — todas contaminadas para a Premissa 1 |
| Lacunas menores do 4c registradas | **4** (DI-9): passo 6 apos `red_check: fail`; mensagem de commit so do caminho feliz; `blocked` fora do vocabulario do STATE; checkboxes da fase nunca marcados |

### Evidencia do ciclo — fase-01

| Etapa | Evidencia literal |
|---|---|
| Gate G15 | Cumprido antes de comecar: teste de paridade existe (14517 bytes), `section()` 38 / `prose` 62 / `body` 71, `Defesa a mutar` 3x no template, secao-fonte 1x na skill, `defesa-implementada` 1x no executor. |
| RED | `21 pass / 6 fail`, as 6 por assertion, zero regressao. Commit `88947d3`. |
| Gate humano | `skipped` — o gate so passa a existir em runtime apos o sync (fase-04). |
| GREEN | `27 pass / 0 fail`. Commit `2b394b2`: `argument-hint` ganha `--tdd-level`; `### 4c` vira a sequencia 0 RESOLVER NIVEL → 1 RED → 2 RED CONFIRMADO → 3 GATE HUMANO → 4 GREEN; `wave-execution` §Ciclo Completo aponta para a fonte; +1 linha em Common Rationalizations. |
| **RED-check (1a passada)** | **`fail`** — defesa: linha `contem \`Cannot find module\` \| ...` do passo 2 do 4c; teste que devia cair: `4c exige que o orquestrador confirme a falha do RED ... (CA-04)`. **Nao caiu:** `27 pass / 0 fail` com a regra apagada. Ver DI-1. |
| Auditoria | Multiplicidade de todos os tokens asseridos no bloco (GT-1) → mais dois vacuos. O de `human_gate` confirmado por mutacao (`Registrar: human_gate: stopped` apagada → `27 pass / 0 fail`). |
| Correcao | Commit `711d43d` — tres assercoes reancoradas (DI-2). Sem tocar o `SKILL.md`: a defesa la sempre esteve certa. |
| **RED-check (2a passada)** | `pass` ×6, cada um derrubando so o teste nomeado (`26 pass, 1 fail` nos seis): (1) `senao: Assistido (default ...)` → `4c resolve o nivel ... (D2)`; (2) `[--tdd-level ...]` do `argument-hint` → `argument-hint ... aceita --tdd-level (RF-08)`; (3) regra de classificacao → `... bloqueie module-not-found (CA-04)`; (4) ponteiro `tdd-cycle-checklist` da mensagem de bloqueio → o mesmo CA-04; (5) `Registrar: human_gate: stopped` → `... registra human_gate (CA-05)`; (6) frase-fonte do §Ciclo Completo → `wave-execution §Ciclo Completo aponta para a fonte`. `git diff --stat` vazio apos cada restauracao. |
| REFACTOR | `none` — motivo examinado em DI-3. |
| Suite | lote 1 `1465 pass / 0 fail`, lote 2 `706 pass / 0 fail` = **2171 pass, 0 fail**, 282 arquivos, exit 0. Delta desde o Plano 01 (2165) = **+6**, exatamente as assercoes novas. |
| Escopo | `SKILL.md`: 3 hunks (`@@ -7`, `@@ -421,22 +421,60`, `@@ -869,0 +908`) — preface das linhas 10-30 fora de qualquer hunk. `wave-execution.md`: so o §Ciclo Completo; os dois blocos JSON de `.tdd-phase.json` sem uma linha de diff (DP-15, plano01 G10). `Registra: .tdd-phase.json` segue 1x. |
| Manifest | 2 checksums (`skills/execute-plan/SKILL.md`, `skills/execute-plan/references/wave-execution.md`), zero `lastModified` de arquivo nao tocado. |
| Outras verificacoes | `stack-aware-preface-all-skills.test.ts` `14 pass` (G17); `harness:validate` ok; `typecheck` exit 0; `AskUserQuestion` 8 (ver GT-3). |

### Evidencia do ciclo — fase-02

| Etapa | Evidencia literal |
|---|---|
| Auditoria PRE-RED | Multiplicidade dos tokens que a fase ia asserir, contada antes de escrever (GT-1): `blocked` 2, `git diff --stat` 2 (previsto pos-GREEN) → duas assercoes escritas ja acopladas. Ver **DI-4**. |
| RED | `28 pass / 4 fail`, as 4 por assertion. **Nao foram 5**: `4c le Defesa a mutar e Teste que deve cair (D6)` nasceu verde porque os dois campos ja estavam no 4c desde a fase-01. Commit `025f40a`. |
| Gate humano | `skipped` — o gate so existe em runtime apos o sync (fase-04). |
| GREEN | `32 pass / 0 fail`. Commit `915b3ff`: passo 4 do 4c vira GREEN + REFACTOR (commit `refactor(...)` proprio ou `refactor: none`), passo 5 RED-CHECK novo (pre-condicao, ler os dois campos, mutar, exigir queda, `git restore {arquivo}`, exigir diff vazio, ramos pass/fail/sem-comportamento); item 1 de `## Regras Criticas` passa a dizer que mutar e restaurar e VERIFICACAO; +1 linha em Common Rationalizations; +1 em Red Flags. |
| RED-check (1) | Defesa: linha `- Exigir \`git diff --stat\` vazio` (491). Caiu so `4c restaura com git restore e prova diff vazio (CA-06)`. `31 pass, 1 fail`. **Com a defesa apagada, `git diff --stat` continuava no bloco** (linha da pre-condicao) — um `toContain` teria ficado verde; a regex acoplada e o que pegou. |
| RED-check (2) | Defesa: `refactor(...)` → `refactor` nas duas ocorrencias do passo 4. Caiu so `4c exige REFACTOR em commit proprio ou motivo (CA-08, D4)`. `31 pass, 1 fail`. |
| RED-check (3) | Defesa: linha 495 (`fase blocked;` + a DI). Caiu so `4c trata teste que nao cai como blocker com DI (CA-07)`. `31 pass, 1 fail`. |
| RED-check (4) | Defesa: a frase de VERIFICACAO acrescentada ao item 1 de `## Regras Criticas`. Caiu so `Regras Criticas: ... (D3)`. `31 pass, 1 fail`. |
| RED-check (5, extra) | Defesa: apagado **so** `fase blocked;`, mantendo a DI. `blocked` seguia 2x no bloco — `toContain('blocked')` ficaria verde. Caiu so o CA-07. `31 pass, 1 fail`. E a prova isolada da coupling. |
| Restauracao | `git restore <arquivo>` apos cada uma; `git diff --stat` e `git status --short` vazios entre as cinco. |
| REFACTOR | Commit `3094e23` — 17 mensagens de volta a convencao `[parity gate "nunca diminuir" — TAG]` (39/0). Helper `mustContain` recusado com motivo. Ver **DI-5**. Re-provado por 3 mutacoes pos-refactor, incluindo a (5). |
| Suite | lote 1 `1470 pass / 0 fail`, lote 2 `706 pass / 0 fail` = **2176 pass, 0 fail**, 282 arquivos, exit 0. Delta desde a fase-01 (2171) = **+5**. |
| Escopo | `SKILL.md`: 6 hunks — passo 4/5 do 4c, item 1 de Regras Criticas, +1 em Common Rationalizations, +1 em Red Flags. **Zero linha removida dos passos 0-3 do 4c** (DP-1: cada fase so acrescenta). Nada acima da linha 344. |
| Manifest | 1 checksum (`skills/execute-plan/SKILL.md`), zero `lastModified` de arquivo nao tocado. |
| Outras verificacoes | `stack-aware-preface-all-skills.test.ts` `14 pass` (G17); `harness:validate` ok; `typecheck` exit 0; `fase-{NN}-defesa-implementada` do passo 5 confere com `agents/plan-executor.md:99`. |

### Evidencia do ciclo — fase-03

| Etapa | Evidencia literal |
|---|---|
| Auditoria PRE-RED | Todos os tokens que a fase-03 assere estavam em **0** nas secoes-alvo. Ressalva: auditei so os tokens DESTA fase — insuficiente, ver **GT-5**. |
| RED | `33 pass / 3 fail` — tres, nao quatro: `plan-verifier continua read-only (D3)` **nasceu verde** (a Regra 4 ja existia). Commit `b74dfbf`. |
| Teste nascido verde | Mutado no mesmo passo, como `agents/plan-executor.md` §RED manda: apagada a Regra 4 do verifier → o teste caiu → restaurado → diff vazio. Re-provado tambem pelo orquestrador. |
| GREEN | `36 pass / 0 fail`; `agents:contract` `39 pass` (G7). Commit `11a65cf`: passo 6 VERIFY no 4c (RECEBE / NAO RECEBE / DEVOLVE) + formato da linha do STATE log; Step 5 com lint condicional, os 4 campos do ciclo, o custo e o item de bloqueio; verifier ganha o item 8, as duas linhas de exemplo JSON e o §Composition corrigido. |
| §Composition | A linha dizia "etapa Step 5 pos-fase — verificacao automatica apos cada fase" e **ninguem spawnava o verifier** (PRD §Problema). Agora diz "Step 4c passo VERIFY — spawn por fase, apos o RED-check do orquestrador". A mentira acabou junto com a causa. |
| RED-check (4 nomeados) | Todos `pass`, `35 pass / 1 fail`, so o teste nomeado: item 8 do checklist; `unable_to_verify` no item 8; `red-check-evidence` no 4c; `Custo da fase` no Step 5. |
| **Regressao completa** | Rodadas as **15** defesas das tres fases. **Duas nao caiam mais** (DI-6). Apos o fix `8462fab`, segunda rodada completa: **15/15 caem**. |
| REFACTOR | Commit `4d41fc0` — `step4c` icado para o modulo (era recalculado 3x, uma por describe). Re-provado por 3 mutacoes, e foi essa re-prova que expos a DI-6. |
| Criterio humano | Lido o 4c inteiro: cada campo do STATE log tem um passo que o escreve — `tdd_level` no 0, `red_confirmed` no 2, `human_gate` no 3, `refactor` no 4, `red_check` no 5, `custo` no 6. |
| Suite | `2180 pass, 0 fail`, 282 arquivos, exit 0. Delta desde a fase-02 (2176) = **+4**. Houve **um falso vermelho** antes: `compound-check (skeleton)` com `EPERM` no fixture, 5750ms — mesma familia do BUG-1 do Plano 01; passa isolado em 956ms e a suite ficou verde na re-rodada. |
| Escopo | `plan-verifier.md`: 4 hunks, frontmatter (1-7) e a Regra 4 Read-only fora do diff; `red-check-evidence` 3x (item 8 + dois exemplos). `SKILL.md`: **zero linha removida dos passos 0-5 do 4c** (DP-1). |
| Manifest | 2 checksums (`agents/plan-verifier.md`, `skills/execute-plan/SKILL.md`), zero drift. |

### Evidencia do ciclo — fase-04, Passo 1 (sync do cache)

Tipo de fase: **sem-comportamento** — gate textual, e o RED-check e "remover o alvo → gate cai → restaurar".

| Etapa | Evidencia literal |
|---|---|
| RED (gate visto falhando) | Antes do sync, no cache (`C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\7.7.0`): `red_check` **0**, `Contrato do Ciclo por Fase` **0**, `--tdd-level` **0**, `red-check-evidence` **0** no `execute-plan/SKILL.md` e **0** no `plan-verifier.md`; `AskUserQuestion` **7**. No checkout, `red_check` era **9**. O cache estava mesmo servindo o 4c velho — Premissa 5 confirmada na pratica, nao por leitura. |
| GREEN | `bash scripts/sync-to-global.sh` → exit 0; banner `Global: /c/Users/luizf/.claude/plugins/cache/local-plugins/anti-vibe-coding/7.7.0`; `installed_plugins.json ja pinado em 7.7.0 (skip)`. Depois: `red_check` **9**, `Contrato do Ciclo por Fase` **1**, `--tdd-level` **2**, `red-check-evidence` **1** (SKILL) e **3** (verifier), `AskUserQuestion` **8**. |
| Cache == checkout | `git diff --no-index` vazio em cinco arquivos-chave: `skills/execute-plan/SKILL.md`, `agents/plan-verifier.md`, `skills/tdd-workflow/SKILL.md`, `skills/plan-feature/templates/fase-template.md`, `agents/plan-executor.md`. |
| RED-check | Defesa mutada: `sed -i '/red_check/d'` no `SKILL.md` **do cache** (backup em scratchpad antes). Gate caiu de 9 para **0**; `git diff --no-index` passou a acusar `9 deletions`. |
| Restauracao | `bash scripts/sync-to-global.sh` de novo → gate volta a **9**, `git diff --no-index` vazio, e `diff` contra o backup pre-mutacao **identico**. Restaurar pelo proprio script **prova a idempotencia** que o cabecalho dele promete ("rodar 2x produz mesmo resultado"). |
| REFACTOR | n/a (sem-comportamento). |

**O que isto NAO prova:** que o orquestrador executa o ciclo. Prova apenas que o texto novo chegou onde o
runtime le. As tres rodadas (r1/r2/r3) e que respondem as Premissas 1, 2 e 4.

### Rodada r1, fase-01 — executada, e achou dois defeitos no 4c

Rodada feita pelo orquestrador desta sessao (nao por sessao limpa). **Contaminada para a Premissa 1** — quem
rodou escreveu o 4c e sabia as respostas. Vale para o que e mecanico: Premissa 2, Premissa 4, e se o texto e
executavel. Isso esta dito aqui porque um log sem essa ressalva seria enganoso.

Linha produzida no STATE do fixture:
`- 2026-09-09: plano01/fase-01 — tdd_level: assistido | red_confirmed: assertion | human_gate: stopped | red_check: pass (defesa: src/sum.ts a + b -> a - b, teste: sums two numbers) | refactor: none (funcao de 1 linha, nada a extrair) | custo: testes=8 spawns=3`

**O que funcionou:** nivel resolveu para Assistido (sem `--tdd-level`, sem `user_profile` no fixture); o passo 2
classificou `error: not implemented` como `assertion` (zero marcadores de modulo, exit 1); o gate **parou** no
tracer bullet; o RED-check mutou `a + b` → `a - b`, o teste nomeado caiu, `git restore src/sum.ts` devolveu o
GREEN e o diff ficou vazio; o `plan-verifier` devolveu **`red-check-evidence: pass`** e o envelope parseou sem
tocar no 4d (**CA-10 confirmado em runtime**).

**Premissa 2 — VALIDADA.** A linha com `red_confirmed: assertion` ja estava no STATE quando o gate perguntou;
conferido abrindo o arquivo antes de responder. Um abort ali nao perderia o RED.

**Premissa 4 — MEDIDA.** 8 rodadas de teste, 3 spawns (RED, GREEN, verifier). Duas das 8 foram ineficiencia do
proprio orquestrador (rodou o teste duas vezes no passo 2), entao o piso real e ~7. O `plan-verifier` sozinho:
1 spawn + 2 rodadas — **~25-30% do custo da fase**, em cima do limiar que o PRD usa para reconsiderar se o RF-05
fica sempre ligado ou so por nivel. Decisao do dev; nao desta fase.

**Premissa 1 — NAO respondida** por esta rodada (contaminacao). Precisa de sessao limpa.

**Sessao ja aberta continua com o texto velho.** O sync termina com "Reinicie o Claude Code para carregar as
mudancas": a skill entra no contexto no inicio da sessao. Cada rodada do dogfood precisa de sessao NOVA, com
cwd no fixture — nao adianta rodar na sessao que fez o sync.

### Fixture do dogfood — pronto, fora deste repo

`F:\tmp\avc-tdd-dogfood-{template,r1,r2,r3}` + `F:\tmp\avc-tdd-dogfood-ROTEIRO.md`. Cada rodada com `git init`
e baseline commitado (r1 `114a422`, r2 `cdf37f4`, r3 `e45eda4`), arvore limpa. Duas fases por fixture:
`fase-01-sum` (comportamento, tracer bullet) e `fase-02-can-read-risco` (risco, com bloco `### Seguranca`) —
os dois sinais distintos que fazem o Assistido parar (DP-3).

**Desvio deliberado do doc da fase (DEV-3):** o Passo 6 mandava editar o template entre a r1 e a r2 e
restaurar depois. A **r2 ja foi criada com a mutacao inofensiva aplicada** (`inserir a linha
// mutacao-inofensiva no topo` em vez de `trocar a + b por a - b`), e r1/r3 mantem a defesa real. Motivo: tira
um passo manual do meio das rodadas e elimina o risco de esquecer de restaurar o template — o estado de cada
rodada fica imutavel e auditavel pelo seu proprio baseline.

---

## Notas para Planos Seguintes

Ultimo plano — estas notas sao para a **fase-04** (dogfood) e para quem retomar a feature.

- **O ciclo esta escrito e guardado; falta prova de runtime.** O bloco `### 4c.` tem os passos **0 a 6**
  completos, e cada campo do STATE log tem um passo que o escreve. Mas tudo isso e **prompt**: 36
  assercoes provam o TEXTO, nenhuma prova que um orquestrador real executa o ciclo. E exatamente o que a
  fase-04 existe para descobrir, e por isso o criterio dela e humano.
- **A fase-04 comeca por `scripts/sync-to-global.sh`.** Ate o sync, o cache do plugin serve a versao
  velha e nada disto vale em sessao (G1 do Plano 01, PRD Premissa 5). O fixture roda em `F:\tmp\` com git
  proprio (G23) e nada dele entra neste repo.
- **Se a fase-04 acrescentar assercao ao gate, rode a regressao completa das 15 defesas** (GT-5), nao so
  as novas. Duas ja regrediram em silencio nesta feature.
- Citar por passo, nao por numero de linha (GT-3 — sete previsoes de numero erradas ate agora).

### Se alguem for editar o bloco `### 4c.` de novo

1. Auditar a multiplicidade de **todos** os tokens que **qualquer** assercao le desse bloco (GT-1), nao so
   os que voce vai introduzir.
2. Escrever assercao nova ja ancorada no par condicao → desfecho, com `[\s\S]` **limitado** e N calculado
   (GT-6).
3. Depois do GREEN, re-rodar as **15** defesas (GT-5). Um loop de shell resolve.
4. Teste que nasce verde: mutar no mesmo passo, nao esperar o RED-check.
- `section(executePlan, '### 4c.')` **cru**, nunca `body()`/`prose()` — o 4c e um bloco cercado (G16).
  `argument-hint` vive no frontmatter: assercao no arquivo cru (G21).
- Fidelidade de conteudo se confere com `git diff`, nao com `diff`/`cmp` (GT-2, CRLF).
- Numeros de linha e contagens escritos nos docs de fase: conferir sempre (GT-3).
- A fase-04 (dogfood) precisa do **cache do plugin sincronizado** e roda em fixture propria em `F:\tmp\`
  (G23). Nada do fixture entra neste repo.

---

<!-- Atualizado automaticamente durante execucao -->

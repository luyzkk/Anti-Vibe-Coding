# Memoria: Plano 02 — O ciclo roda no execute-plan

**Feature:** Contrato Unico do Ciclo TDD por Fase
**Iniciado:** 2026-09-08
**Status:** em andamento (fases 01-03 concluidas; fase-04 com o Passo 1 feito — faltam as tres rodadas)
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
| Assercoes no gate de paridade | 21 → 27 → 32 → 36 |
| Suite | 2165 → 2171 → 2176 → **2180 pass, 0 fail** |

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

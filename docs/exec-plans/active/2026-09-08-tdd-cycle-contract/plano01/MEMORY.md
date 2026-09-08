# Memoria: Plano 01 — Fonte e contrato

**Feature:** Contrato Unico do Ciclo TDD por Fase
**Iniciado:** 2026-09-08
**Status:** em andamento (fases 01 e 02 concluidas, 2/3)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01): a clausula `--tdd-level` FICOU na secao-fonte.** O Passo 2 da fase oferecia
  cortar "(ou do argumento `--tdd-level` do `/execute-plan`)" e registrar DI. Mantida conforme DP-4:
  e declaracao de contrato, nao de estado. O argumento so chega no Plano 02 fase-01.
  - Impacto: a fonte ja descreve o mapa completo nivel → parada; o Plano 02 implementa o argumento
    sem precisar reescrever a secao.

- **DI-2 (fase-01): checklist foi no MESMO commit do GREEN, nao em commit proprio.** O Passo 5 da fase
  deixava a escolha aberta ("se o dev quiser atomicidade, o checklist pode ir num terceiro commit
  `docs(references): ...`"). Foi para o commit `d4993b8` junto com skill, template e manifest.
  - Por que: os quatro arquivos entregam UMA mudanca — o REFACTOR deixa de ser opcional em toda a
    cadeia. Separar o checklist criaria um commit que so faz sentido lido com o outro.

- **DI-3 (fase-01): GREEN recebeu os Passos 2-5 da fase, nao "apenas os arquivos de teste".** O Step 4c
  do execute-plan manda o subagente GREEN receber so os testes. Aqui o entregavel e PROSA (uma secao
  inteira de skill, com duas tabelas), e o texto exato esta escrito nos blocos ```markdown da fase.
  Um GREEN que recebesse so o teste escreveria um heading vazio e um checkbox — passaria o gate e nao
  entregaria a fase.
  - Por que preserva o isolamento que importa: o subagente NAO recebeu o PRD nem as outras fases;
    ele copiou texto ja aprovado no planejamento em vez de reinterpretar requisito.
  - Impacto: vale para toda fase cujo alvo e markdown de skill/template. Fase de codigo mantem o
    isolamento estrito do 4c.

- **DI-4 (fase-02): REFACTOR = `sem refactor`, e o motivo nao e "nao achei nada".** O doc da fase
  nomeava dois candidatos concretos. Foram os dois olhados:
  - `prose()` e `section()` com responsabilidades misturadas? **Nao.** `section()` extrai (rastreando
    fences), `prose()` filtra (tira fence e comentario HTML). A composicao ja esta extraida em
    `const tdd = () => prose(section(template, '### TDD'))`, usada por todas as assercoes do describe.
  - Mensagens repetem o mesmo preambulo? **Repetem** — `[parity gate ... — RF-xx]` em 10 mensagens.
    Decidido **nao** extrair um helper: essas mensagens existem para serem lidas na integra quando o
    teste cai, e indirecao ali troca legibilidade no momento da falha por DRY no momento da leitura do
    codigo. Duplicar prefixo de mensagem de erro em teste e o caso em que duplicacao ganha.
  - **Observacao aberta para a fase-03:** o preambulo esta inconsistente — 5 mensagens dizem
    `[parity gate "nunca diminuir" — ...]` e 5 dizem `[parity gate — ...]`, sem criterio evidente. Nao
    normalizei porque o texto veio literal do doc da fase e a fidelidade ao spec acabou de ser
    verificada por `diff`. A fase-03 acrescenta mensagens novas: **decidir la** qual das duas formas e a
    canonica e uniformizar de uma vez, num commit `refactor(tests)` proprio.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-1 (fase-01): `bun run test` deu 13 fail no lote 1 + 1 no lote 2 logo apos o GREEN — e era flake,
  nao regressao.**
  - Sintoma: `harness-validate advanced` (7 testes), E2E `legacy-v5 → /init migrate` (5), `E2E +
    harness:validate` (1) e `grep-deleted-steps` (1). Lote 1 levou **254.89s** contra 38.97s da baseline.
  - Causa raiz: `tests/harness-validate-advanced.test.ts:6` usa `tests/__fixtures__/harness-advanced`
    como fixture e roda `fs.rm(FIXTURE, {recursive:true, force:true})` no `beforeEach`
    (`setupValidFixture`). O `runValidator()` faz `spawn('bun', [...], { cwd: FIXTURE })` — no Windows um
    filho que ainda nao saiu segura o handle do diretorio de CWD, entao o `rm` estoura
    `EBUSY: resource busy or locked`. Sob CPU disputada o filho demora mais a sair e a janela abre.
    Pior: o `rm` que falha deixa `tests/__fixtures__/harness-advanced/scripts/` para tras, e o residuo
    envenena os testes seguintes (dai as falhas em E2E e grep-deleted-steps, que nao tem relacao).
  - Fix aplicado: mover `tests/__fixtures__/` para fora do repo e rodar a suite de novo sem nada
    concorrendo → `1440 pass / 0 fail` + `706 pass / 0 fail`, exit 0, 53.62s + 6.42s. Zero mudanca de
    codigo — nada do commit `d4993b8` causou as falhas.
  - Como distinguir de regressao de verdade: falha por `EBUSY`/timeout de hook, nao por assertion; e
    `bun run harness:validate` no repo real passa (`28 required files, 397 markdown files checked`).
  - Fase afetada: fase-01 (verificacao). Nao e bug desta feature — e do teste, pre-existente.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1: `bun run generate:manifest` mexe em entradas de arquivos que voce NAO tocou — mas so no
  `lastModified`.** O commit `d4993b8` traz `plugin-manifest.json` com 15 insercoes/15 delecoes. Comparando
  as duas versoes entrada por entrada: **checksum mudou em exatamente 2** —
  `skills/tdd-workflow/SKILL.md` e `skills/plan-feature/templates/fase-template.md`, os alvos. Outras **10**
  (`agents/security-auditor.md` e os 9 `skills/security/lib/route-auth-*.ts`) tiveram so `lastModified`
  bumpado de 2026-09-06/07 para 2026-09-08, com checksum identico — o gerador le o mtime do checkout, e o
  merge `bffaa80` (route-auth-matrix) reescreveu esses arquivos no disco. Primeira vez que o manifest roda
  nesta branch desde o merge.
  - Consequencia para o G2 do README: o criterio "so os 2 arquivos rastreados mudam" so vale lido como
    **"so os 2 checksums mudam"**. `git diff --stat plugin-manifest.json` sozinho nao decide nada — nas
    fases 02 e 03 comparar as versoes por entrada, nao pelo stat.
  - Descoberto em: fase-01. `git status` confirma que nenhum desses 10 arquivos foi modificado.

- **GT-2: `git restore <arquivo>` com caminho explicito passa pelo guard destrutivo; `rm -rf` nao.**
  Os tres RED-checks da fase-01 restauraram com `git restore <caminho>` e o hook nao reclamou (a regex
  casa `git restore .`, nao um caminho). Ja `rm -rf tests/__fixtures__` foi **bloqueado** pelo
  `pre-tool-use-destructive-guard.cjs` (pattern `rm-rf`), que manda mover para uma pasta de lixo. Mover
  para o scratchpad resolveu sem desligar o guard. Nao setar `AVC_ALLOW_DESTRUCTIVE=1` para residuo de
  teste — mover e reversivel e nao vale gastar o bypass.
  - Descoberto em: fase-01 (limpeza do BUG-1).

- **GT-3: apagar so o HEADING da secao-fonte derruba o teste, com o corpo inteiro no lugar.** O RED-check
  (2) removeu apenas a linha `## Contrato do Ciclo por Fase` de `tdd-workflow/SKILL.md` e deixou as duas
  tabelas e a prosa. O teste caiu assim mesmo — a assercao e `/^## Contrato do Ciclo por Fase/m`, ancorada
  em inicio de linha, e nao um `includes`. Isso falsifica na pratica o G5 (assercao vacua satisfeita por
  mencao em prosa): a propria mensagem de erro do teste contem o nome da secao, e ainda assim ele reprova.
  - Descoberto em: fase-01. Vale para as assercoes das fases 02 e 03: preferir regex ancorada a `includes`
    sempre que o alvo for um heading.

- **GT-4: a previsao de pass/fail escrita no doc da fase errou — e esse e o ponto do G9.** O Passo 1 da
  fase-02 dizia que no RED "o teste da fase-01 sobre a skill continua pass; o `**REFACTOR:**` do
  `test.each` continua pass; todo o resto fail". O real foi **4 pass / 9 fail**: passaram tambem
  `**RED:**` e `**GREEN:**`, porque o template ja os tinha antes desta feature. O planejador contou os
  checkboxes que a fase-01 acrescentou e esqueceu os que ja existiam.
  - Consequencia pratica: numero previsto em doc de fase e chute, inclusive quando parece aritmetica
    simples. O que vale e a contagem literal do comando e **quais** testes caem.
  - Descoberto em: fase-02. O subagente reportou a divergencia em vez de mexer no teste para "bater com
    o previsto" — que era exatamente a tentacao.

- **GT-5: o fence do doc da fase-02 e aninhado, e extracao ingenua trunca o bloco.** O Passo 2 esta
  dentro de um fence ```` ```markdown ```` (linha 180) que contem OUTRO fence — o "Exemplo preenchido"
  (linhas 219-227). Um `awk`/`sed` de "do ```markdown ate o proximo ```" para na linha 219 e entrega
  meio bloco. Os intervalos corretos sao **181-227** (Passo 2) e **239-244** (Passo 3), passados ao
  subagente como numeros de linha.
  - Vale para a fase-03 e para o Plano 02: antes de mandar um subagente "copiar o bloco da fase",
    rodar `grep -n '^```' <doc>` e conferir se ha aninhamento.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (cosmetico): a mensagem do commit RED saiu com hifen simples.** Ficou
  `test(tdd-workflow): RED - gate de paridade do ciclo por fase`; a fase pedia travessao
  (`RED — gate...`). O commit GREEN (`d4993b8`) saiu com o travessao correto, escrito via
  `git commit -F <arquivo>`. Nao corrigido: `amend` reescreveria um commit ja usado como base do
  RED-check, e o conteudo e identico.
  - Licao operacional para as proximas fases: mensagem com travessao vai por `git commit -F`, nunca
    por `-m` inline no PowerShell.

- **DEV-2 (fase-01): "copiar fielmente" nao se verifica a olho — uma celula da tabela tinha driftado.**
  O bloco entregue na secao-fonte trazia `remover o alvo, gate cai, restaura` na linha
  `sem comportamento`, onde o PRD §Mecanismo item 1 e o Passo 2 da fase dizem `restaurar`. Nenhum teste
  cobre celula de tabela; a leitura de conferencia passou por cima. So apareceu ao extrair o bloco
  ```markdown do doc da fase e rodar `diff` contra a secao entregue: **1 linha divergente em 42**.
  - Fix: `9b718e6` (`fix(tdd-workflow): celula da tabela volta a bater com o PRD`) + manifest — 1 checksum
    alterado, nenhum `lastModified` de arquivo nao tocado desta vez.
  - **Vale para as fases 02 e 03 e para o Plano 02**, que tambem copiam blocos prescritos: depois do
    GREEN, extrair o bloco do doc da fase e `diff` contra o entregue. Conferencia por leitura nao pega
    troca de uma palavra; `diff` pega.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 2 |
| Fases com desvio | 1 (DEV-1 cosmetico; DEV-2 corrigido em 9b718e6) |
| Bugs encontrados | 1 (BUG-1 — flake pre-existente, nao desta feature) |
| Retries necessarios | 0 |
| RED-checks executados | 8 (3 na fase-01, 5 na fase-02) — todos passaram |

### Evidencia do ciclo — fase-01

| Etapa | Evidencia literal |
|---|---|
| RED | `bun test tests/fase-template-tdd-contract.test.ts` → `0 pass, 2 fail, 2 expect() calls`. Ambas as falhas `Expected: true / Received: false` (assertion) — nenhum `Cannot find module`. Commit `690cfb1`. |
| Gate humano | nao aplicado — o gate por nivel so existe a partir do Plano 02 fase-01; o texto do teste ja vinha aprovado no doc da fase. |
| GREEN | `2 pass, 0 fail`. Commit `d4993b8` (4 arquivos + manifest). |
| RED-check (1) | Defesa mutada: linha `- [ ] **REFACTOR:** ...` apagada de `fase-template.md` (linha 102). Caiu: `fase-template — bloco "### TDD" (RF-02) > o bloco mantem o checkbox REFACTOR`. Resultado `1 pass, 1 fail` — so o teste nomeado caiu. Restaurado; `git diff --stat` e `git status --short` vazios. |
| RED-check (2) | Defesa mutada: linha `## Contrato do Ciclo por Fase` apagada de `tdd-workflow/SKILL.md` (linha 547), corpo mantido. Caiu: `tdd-workflow — a fonte unica do ciclo (RF-01) > a skill tem a secao "## Contrato do Ciclo por Fase"`. Resultado `1 pass, 1 fail`. Restaurado; diff vazio; `tail -n 1` volta a `$ARGUMENTS`. |
| RED-check (3) | Gate textual. `(opcional)` reescrito na linha 22 de `tdd-cycle-checklist.md` → `grep -n "Passo 7 (opcional)"` volta a imprimir a linha (exit 0). Restaurado → grep vazio (exit 1); diff vazio. |
| REFACTOR | `sem refactor: teste de 2 assertions, helpers copiados do molde write-prd-contract.test.ts`. |
| Suite | `bun run test` → lote 1 `1440 pass / 0 fail` (175 arquivos), lote 2 `706 pass / 0 fail` (107), exit 0. Baseline da branch antes da fase: `1450 + 694 = 2144` em 281 arquivos; agora `2146` em 282 — delta = o arquivo novo e suas 2 assercoes (a fronteira dos lotes moveu 10 testes do lote 1 para o 2). |
| Outras verificacoes | `bun run typecheck` exit 0. `bun run harness:validate` → `28 required files, 397 markdown files checked`. `universal-principles.test.ts` `15 pass` (G11). `stack-aware-preface-wire.test.ts` `3 pass` (G6). `grep -c "^## Contrato do Ciclo por Fase"` → `1`. |

### Evidencia do ciclo — fase-02

| Etapa | Evidencia literal |
|---|---|
| RED | `4 pass / 9 fail`, todas as 9 por assertion. Passaram: o teste da RF-01 e os checkboxes `**RED:**`, `**GREEN:**`, `**REFACTOR:**` (o template ja os tinha). Divergiu da previsao do doc da fase — ver **GT-4**. Commit `971e462`. |
| Gate humano | `skipped` — gate por nivel so a partir do Plano 02 fase-01. |
| GREEN | `13 pass / 0 fail`. Commit `0f83336` (2 templates + manifest). Fidelidade conferida pelo orquestrador: `diff` do bloco entregue contra as linhas 181-227 e 239-244 do doc da fase → **IDENTICO** nos dois (licao DEV-2 aplicada). |
| RED-check (1) — **o que prova o `prose()`** | Defesa: apagada a linha `  - Defesa a mutar: {...}` do checkbox. **A string `Defesa a mutar:` continuou no arquivo**, na linha 134, dentro do fence do exemplo — e o teste caiu assim mesmo. Caiu so `o RED-check carrega o campo "Defesa a mutar:" (D6)` (`12 pass, 1 fail`). E a prova por mutacao de que a assercao le a prosa e nao o exemplo (G5/DP-2); sem ela, "13 pass" nao distinguiria as duas coisas. |
| RED-check (2) | Defesa: apagada a linha `- [ ] **RED-check:** ...` (subitens mantidos). Caiu so `o bloco mantem o checkbox **RED-check:**`. `12 pass, 1 fail`. |
| RED-check (3) | Defesa: apagada a linha `**Tipo de fase:** {...}`. Caiu so `o bloco declara o tipo da fase com as tres opcoes (D5)`. `12 pass, 1 fail`. |
| RED-check (4) | Defesa: apagado o comentario HTML do topo do bloco (4 linhas). Caiu so `o bloco aponta para a secao-fonte na skill tdd-workflow (CA-03)`. `12 pass, 1 fail`. |
| RED-check (5) | Defesa: trocado `` `skills/tdd-workflow/SKILL.md` `` por "a skill de TDD" no paragrafo de `## TDD Strategy` do README-template. Caiu so `plan-readme-template — §TDD Strategy aponta para a fonte (D1)`. `12 pass, 1 fail`. |
| Restauracao | `git restore <arquivo>` apos cada uma; `git diff --stat` e `git status --short` vazios entre as cinco; teste de volta a `13 pass / 0 fail` ao final. |
| REFACTOR | `sem refactor` — motivo real em **DI-4**, com uma observacao deixada aberta para a fase-03. |
| Suite | `bun run test` → lote 1 `1451 pass / 0 fail`, lote 2 `706 pass / 0 fail` = **2157 pass, 0 fail**, 282 arquivos, exit 0. Delta desde a fase-01 (2146) = **+11**, exatamente as 11 assercoes novas. |
| Manifest | 2 checksums alterados (`fase-template.md`, `plan-readme-template.md`), **zero** `lastModified` de arquivo nao tocado — o drift do GT-1 ja tinha assentado na fase-01. |
| Outras verificacoes | `typecheck` exit 0; `harness:validate` ok; `universal-principles.test.ts` `15 pass` (G11); `grep -c '^\*\*Tipo de fase:\*\*'` → `1`; `grep -c 'Defesa a mutar:'` → `2` (checkbox + exemplo); `### Seguranca`/`OPCIONAL`/`### Checklist` presentes; `bun run lint` sumiu do README-template; a linha `**Tracer Bullet deste plano:**` sobreviveu (75 → 72). |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- A secao-fonte `## Contrato do Ciclo por Fase` existe em `skills/tdd-workflow/SKILL.md` a partir da
  **linha 547** (entre `RED-GREEN-REFACTOR permanece.` e `## Common Rationalizations`). Citar por
  heading, nunca por numero de linha — as fases 02 e 03 ainda mexem no arquivo.
- Ela **ja declara** `--tdd-level` e o Step 4c do `execute-plan` como consumidores (DI-1/DP-4). O Plano 02
  implementa os dois; nao precisa reescrever a secao, so cumprir o que ela promete.
- O bloco `### TDD` do `fase-template.md` esta **completo** desde a fase-02: `**Tipo de fase:**
  {comportamento | risco | sem-comportamento}` (linha de campo, nao checkbox — o Plano 02 fase-01 le
  esse valor para decidir o gate humano; manter o formato literal), os quatro checkboxes `**RED:**`,
  `**GREEN:**`, `**RED-check:**`, `**REFACTOR:**`, os subitens `- Defesa a mutar:` e
  `- Teste que deve cair:` (os dois campos que o Step 4c le para mutar), a variante
  `sem-comportamento` com gate textual, um exemplo preenchido em fence e o comentario HTML apontando
  para a fonte.
- `plan-readme-template.md` §TDD Strategy virou ponteiro de um paragrafo — a terceira copia do ciclo
  morreu. Restam as copias que o **Plano 02** ataca: `execute-plan/references/wave-execution.md`
  §Ciclo Completo e o Step 4c.
- `tests/fase-template-tdd-contract.test.ts` tem **13 assercoes** e os helpers `read` (strip de CRLF),
  `section()` generalizado por nivel (DP-1) e `prose()` (tira fence e comentario HTML, DP-2). As fases
  seguintes e o Plano 02 **acrescentam** assercoes neste mesmo arquivo — nunca criam outro.
  - **Regra que o RED-check (1) da fase-02 provou na pratica:** assercao de contrato roda sobre
    `prose(section(...))`; assercao sobre ponteiro em comentario HTML roda sobre o corpo cru. Se uma
    assercao continuar verde com o checkbox apagado, ela esta lendo o exemplo — nao alargue a regex,
    aplique `prose()`.
  - Ver **GT-5** antes de mandar um subagente copiar bloco de doc de fase: o fence pode ser aninhado.
  - Ver **DI-4**: ha uma inconsistencia de preambulo nas mensagens (`[parity gate "nunca diminuir" — ]`
    vs `[parity gate — ]`, 5 e 5) deixada de proposito para a fase-03 uniformizar.
- Ver **GT-1** antes de conferir o manifest (o `git diff --stat` mente; compare checksums) e **GT-2**
  antes de limpar residuo de teste (`rm -rf` e bloqueado; mova).
- Se a suite vier vermelha em `harness-validate advanced` / E2E `legacy-v5` / `grep-deleted-steps`, leia
  **BUG-1** antes de investigar o proprio codigo: quase certamente e `EBUSY` de fixture no Windows.

---

<!-- Atualizado automaticamente durante execucao -->

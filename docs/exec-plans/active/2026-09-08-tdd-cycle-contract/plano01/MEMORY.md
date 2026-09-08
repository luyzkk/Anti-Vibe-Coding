# Memoria: Plano 01 — Fonte e contrato

**Feature:** Contrato Unico do Ciclo TDD por Fase
**Iniciado:** 2026-09-08
**Status:** em andamento (fase-01 concluida, 1/3)

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

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 1 |
| Fases com desvio | 1 (DEV-1, cosmetico) |
| Bugs encontrados | 1 (BUG-1 — flake pre-existente, nao desta feature) |
| Retries necessarios | 0 |

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

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- A secao-fonte `## Contrato do Ciclo por Fase` existe em `skills/tdd-workflow/SKILL.md` a partir da
  **linha 547** (entre `RED-GREEN-REFACTOR permanece.` e `## Common Rationalizations`). Citar por
  heading, nunca por numero de linha — as fases 02 e 03 ainda mexem no arquivo.
- Ela **ja declara** `--tdd-level` e o Step 4c do `execute-plan` como consumidores (DI-1/DP-4). O Plano 02
  implementa os dois; nao precisa reescrever a secao, so cumprir o que ela promete.
- O bloco `### TDD` do `fase-template.md` tem hoje **RED, GREEN e REFACTOR**. `Tipo de fase`,
  `Defesa a mutar` e `Teste que deve cair` chegam na fase-02 — o Plano 02 fase-02 depende desses nomes
  de campo.
- `tests/fase-template-tdd-contract.test.ts` existe com 2 assercoes e os helpers `read` (strip de CRLF)
  e `section()` generalizado por nivel de heading (DP-1). As fases 02 e 03 e o Plano 02 **acrescentam**
  assercoes neste mesmo arquivo — nunca criam outro.
- Ver **GT-1** antes de conferir o manifest (o `git diff --stat` mente; compare checksums) e **GT-2**
  antes de limpar residuo de teste (`rm -rf` e bloqueado; mova).
- Se a suite vier vermelha em `harness-validate advanced` / E2E `legacy-v5` / `grep-deleted-steps`, leia
  **BUG-1** antes de investigar o proprio codigo: quase certamente e `EBUSY` de fixture no Windows.

---

<!-- Atualizado automaticamente durante execucao -->

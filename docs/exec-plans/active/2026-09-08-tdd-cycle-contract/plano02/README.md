# Plano 02: O ciclo roda no execute-plan

**Feature:** Contrato Unico do Ciclo TDD por Fase ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~5.5h
**Depende de:** Plano 01 (fonte e contrato) — inteiro
**Desbloqueia:** Ninguem (ultimo plano). A fase-04 e o exit gate da feature.

---

## O que este plano entrega

Ao final, o orquestrador do `/execute-plan` deixa de so spawnar RED e GREEN: resolve o nivel
(`--tdd-level` | `user_profile` | Assistido), roda o teste da fase para confirmar que o RED falhou por
assertion, para no gate humano onde o nivel manda, prova a defesa por mutacao nomeada com restauracao
provada, exige REFACTOR em commit proprio e confere cada fase com o `plan-verifier` read-only. Cada fase
executada deixa no `STATE.md` uma linha com `tdd_level`, `red_confirmed`, `human_gate`, `red_check` e
`refactor` mais o custo — e um dogfood humano prova que o prompt novo muda o comportamento real.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Secao-fonte `## Contrato do Ciclo por Fase` em `skills/tdd-workflow/SKILL.md` (o 4c aponta para ela pelo caminho) | Plano 01 fase-01 | pendente (G15) |
| Campos `Defesa a mutar:` e `Teste que deve cair:` e `Tipo de fase:` no bloco `### TDD` do `fase-template.md` (o 4c le os tres) | Plano 01 fase-02 | pendente (G15) |
| `tests/fase-template-tdd-contract.test.ts` com helpers `read`, `section()` generalizado por nivel (plano01 DP-1) e `prose()` (plano01 DP-2) — as fases 01–03 acrescentam `describe`s no MESMO arquivo | Plano 01 fase-01/02 | pendente (G15) |
| Item `fase-{NN}-defesa-implementada` no envelope do executor (o orquestrador muta o que o executor nomeou quando a fase nao nomeia) | Plano 01 fase-03 (plano01 DP-3) | pendente |
| `docs/references/tdd-cycle-checklist.md` §"Sinal `Cannot find module` no RED genuino — abortar" (linha 24) — o 4c aponta para ca no bloqueio stub-first | repo | pronto |
| `skills/lib/subagent-contract.ts:125-129` — `checks: Array<{ name: string; status: CheckStatus; detail?: string }>`: `name` e string livre, `red-check-evidence` nao exige mudanca no parser (CA-10) | repo | pronto |
| Branch `feat/tdd-cycle-contract` (criada com `git switch -c`, plano01 G8) | sessao 2026-09-08 | pronta |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Nada — ultimo plano. O que sai daqui e consumido pelo proprio pipeline em runtime (toda fase executada por `/execute-plan` a partir do proximo sync) | `/execute-plan`, `/verify-work` (le o STATE log) |
| Medicao de custo por fase (rodadas de teste, spawns) no MEMORY deste plano — decide se RF-05 fica "sempre" ou "por nivel" (PRD Premissa 4) | Fechamento da feature (SUMMARY) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-nivel-red-confirmado-e-gate-humano.md | 4c resolve o nivel (`--tdd-level` \| `user_profile` \| Assistido), roda o teste do RED e classifica a falha (assertion segue; module-not-found bloqueia apontando stub-first), para no gate humano via AskUserQuestion onde o nivel manda; `argument-hint` ganha `--tdd-level`; `wave-execution.md` §Ciclo Completo aponta para a fonte (RF-03 parte 1, RF-08, D2, CA-04, CA-05) | 1.5h | Plano 01 fase-03 |
| 02 | fase-02-red-check-por-mutacao-e-refactor.md | 4c aplica `Defesa a mutar`, exige `Teste que deve cair` falhar, restaura com `git restore <arquivo>` e prova `git diff --stat` vazio; teste que nao cai → fase `blocked` + DI; REFACTOR como passo 2 do subagente GREEN em commit `refactor(...)` proprio; Regras Criticas dizem que isso e verificacao, nao implementacao (RF-03 parte 2, D3, D4, CA-06, CA-07, CA-08, CA-09) | 1.5h | fase-01 |
| 03 | fase-03-verifier-por-fase-e-state-log.md | 4c passo VERIFY spawna o `plan-verifier` read-only com o que recebe/nao recebe; `plan-verifier.md` ganha o check `red-check-evidence`; formato da linha do STATE log com os 4 campos + `tdd_level` + custo; Step 5 mostra os 4 campos e o custo (RF-05, Observabilidade, CA-10) | 1h | fase-02 |
| 04 | fase-04-dogfood-por-humano.md | Sync do cache do plugin (`scripts/sync-to-global.sh`), projeto-fixture com uma fase de comportamento e uma `[RISCO]`, tres rodadas (Assistido positivo, negativo `blocked`, `--tdd-level direto`), STATE log lido por humano, custo medido — valida Premissas 1, 2, 4 e 5 do PRD (criterio por humano) | 1.5h | fase-03 + merge/sync |

---

## Grafo de Fases

```
fase-01 (nivel + RED confirmado + gate humano)   — edita o 4c
    |
    v
fase-02 (RED-check por mutacao + REFACTOR)       — edita o MESMO 4c
    |
    v
fase-03 (VERIFY por fase + STATE log + Step 5)   — edita o 4c, o plan-verifier e o Step 5
    |
    v
fase-04 (dogfood por humano)                     — depende de tudo + sync do cache
```

**Paralelismo possivel:** nenhum. As tres primeiras fases editam o mesmo `### 4c` de
`skills/execute-plan/SKILL.md` e o mesmo `tests/fase-template-tdd-contract.test.ts` (PLAN.md §Grafo);
cada uma so ACRESCENTA ao bloco que a anterior deixou (DP-1). A fase-04 le em runtime o que as tres
escreveram e so faz sentido depois do sync (G1 do plano01, PRD Premissa 5).

---

## TDD Strategy

Fonte do ciclo: `skills/tdd-workflow/SKILL.md`, secao `## Contrato do Ciclo por Fase` (criada no Plano 01
fase-01). Este plano nao redefine o ciclo — ele o faz rodar no executor.

Fases 01–03 sao do tipo **comportamento**: o teste e o `bun:test` de paridade
(`tests/fase-template-tdd-contract.test.ts`), que le `skills/execute-plan/SKILL.md`,
`skills/execute-plan/references/wave-execution.md` e `agents/plan-verifier.md` e falha por **assertion**
(os arquivos existem; o `expect` e que reprova). A "defesa" e texto do 4c, do verifier ou do Step 5; mutar e
apagar a linha nomeada no RED-check e ver o teste nomeado cair. A fase-04 e do tipo **sem-comportamento**:
o gate e textual (grep no cache sincronizado) e o criterio e o STATE log do fixture lido por humano.

```
Ciclo por fase (01–03):
1. RED:       acrescentar um describe ao teste de paridade; rodar; registrar a saida LITERAL
2. GREEN:     editar o 4c / verifier / Step 5 ate o teste passar; bun run generate:manifest; commit feat(...)
3. RED-check: (orquestrador) aplicar "Defesa a mutar" → rodar "Teste que deve cair" → exigir falha →
              git restore <arquivo> → git diff --stat vazio
4. REFACTOR:  commit refactor(...) proprio, ou registrar "refactor: none (motivo)" no MEMORY
5. VERIFY:    comandos SEPARADOS, um por vez, saida lida ate o fim (plano01 G3)
```

Comandos deste repo (`package.json` §scripts — `bun run lint` **nao existe**, plano01 G3):

- Teste alvo: `bun test tests/fase-template-tdd-contract.test.ts` (filtro: `-t '<regex>'`)
- Preface guard (fases 01–03): `bun test tests/e2e/stack-aware-preface-all-skills.test.ts` (G17)
- Suite: `bun run test`
- Tipos: `bun run typecheck`
- Harness: `bun run harness:validate`
- Manifest: `bun run generate:manifest` (G18)
- Agentes: `bun run agents:contract` (fase-03, plano01 G7)

**RED-check do orquestrador (obrigatorio em toda fase):** cada checklist nomeia QUAL defesa mutar e QUAL
teste cai — nunca a mensagem (plano01 G9). Commitar o GREEN **antes** do RED-check (plano01 G8). Restaurar
sempre com caminho explicito — `git restore .` e bloqueado pelo guard (G14).

**Tracer Bullet deste plano:** N/A (o tracer da feature e o Plano 01 fase-01). A fase-04 e o unico ponto em
que o comportamento em runtime e observado — antes dela, nenhuma fase promete runtime.

---

## Decisoes de planejamento (DP)

Fixadas com evidencia do checkout em 2026-09-08 (branch `feat/tdd-cycle-contract`, Plano 01 ainda nao
implementado — G15). As fases **implementam**; nao reabrem. Divergencia real vira DI no MEMORY. As DPs do
Plano 01 sao citadas como "plano01 DP-n".

- **DP-1 O 4c vira uma sequencia numerada 0–6 num unico bloco cercado, escrita em tres fases aditivas.**
  Hoje o 4c (`SKILL.md:419-443`) e um bloco cercado com "Subagente RED" e "Subagente GREEN". Passa a ser:
  `0 RESOLVER NIVEL → 1 RED → 2 RED CONFIRMADO → 3 GATE HUMANO → 4 GREEN + REFACTOR → 5 RED-CHECK → 6 VERIFY`.
  fase-01 escreve 0–3 e mantem o GREEN de hoje como passo 4 (sem REFACTOR); fase-02 completa o 4 e escreve
  o 5; fase-03 escreve o 6. Cada fase so acrescenta — nunca reescreve o que a anterior deixou, para que o
  diff de cada commit seja o da fase. O bloco continua cercado (mesmo estilo do resto do Step 4), entao as
  assercoes de paridade usam `section()` cru, nunca `prose()` (G16).
- **DP-2 Precedencia do nivel: `--tdd-level` > `tdd_level:` no `user_profile` > Assistido.** O argumento
  vence sempre (RF-08). Sem argumento, o orquestrador procura a linha `tdd_level: guiado|assistido|direto`
  no `user_profile` da memoria do projeto — o mesmo sinal que `tdd-workflow/SKILL.md:41` ja le ("`user_profile`
  na memoria do projeto registra nivel"). Sem os dois: Assistido (PRD D2). So LEITURA — persistir o nivel
  (RF-09) e Could e fica fora. O nivel e resolvido uma vez por execucao e gravado no STATE log como
  `tdd_level: {nivel}`.
- **DP-3 Sinais de "fase em que Assistido para".** `[RISCO]` = `Tipo de fase: risco` no bloco `### TDD`
  (Plano 01) OU presenca do bloco `### Seguranca (apenas fase de slice [RISCO])` em `## Verificacao` — o
  sinal que o 4b ja usa hoje (`SKILL.md:397-398`), para fases antigas. Tracer bullet = caminho da fase casa
  `plano01/fase-01-*.md`. Guiado para em toda fase; Direto nunca.
- **DP-4 Classificacao da saida do RED por marcadores (hash map, nao switch).** O orquestrador roda o
  comando do checkbox RED da fase via Bash e classifica: saida contem `Cannot find module` | `Cannot resolve`
  | `error TS` | `SyntaxError` → `red_confirmed: blocked` com mensagem apontando
  `docs/references/tdd-cycle-checklist.md` (stub-first); exit ≠ 0 sem marcador → `red_confirmed: assertion`;
  exit 0 → `red_confirmed: blocked (nasceu verde)` — RED que passa nao e RED (compound 2026-09-06);
  fase `sem-comportamento` → o gate textual rodado e visto falhando → `red_confirmed: gate-textual`.
  Bloqueado = devolve ao subagente RED com a saida literal; nunca spawna GREEN.
- **DP-5 `red_confirmed` e gravado no STATE ANTES do gate humano.** Premissa 2 do PRD: uma parada (ou um
  abort) entre RED e GREEN nao pode perder o RED. Escrever a linha parcial da fase no STATE log, depois
  chamar `AskUserQuestion` (G22).
- **DP-6 Gate humano = `AskUserQuestion` com tres opcoes.** "Confirmar" (segue ao GREEN), "Ajustar o teste"
  (coleta a observacao do dev, re-spawna o RED com ela e volta ao passo 2), "Abortar a fase" (fase `paused`,
  STATE atualizado, sai do ciclo). O orquestrador mostra caminho + conteudo do(s) arquivo(s) de teste e a
  saida literal do teste. Registra `human_gate: stopped`; quando nao para, `human_gate: skipped({nivel})`.
  O 3c (`SKILL.md:358-362`) e o 6a ja usam `AskUserQuestion` — mesmo padrao, mesma ferramenta
  (`allowed-tools` da linha 6 ja a lista).
- **DP-7 `refactor:` vem do `git log`, nao do envelope.** Depois do subagente GREEN+REFACTOR, o orquestrador
  roda `git log --oneline {HEAD-antes}..HEAD` e procura commit com prefixo `refactor(`: existe →
  `refactor: commit {hash}`; nao existe → `refactor: none ({motivo do human_readable})`. Mecanico e
  honesto; o envelope so carrega o motivo. Sem mudanca no contrato do executor (fechado no Plano 01).
- **DP-8 RED-check: pre-condicao, mutacao, restauracao, residuo.** Pre-condicao: GREEN e REFACTOR
  commitados e `git diff --stat` vazio ANTES de mutar (plano01 G8). Mutacao com `Edit` no arquivo de
  producao nomeado em `Defesa a mutar`. Roda SO `Teste que deve cair` (`bun test {arquivo} -t '{teste}'`, ou o
  comando equivalente da stack). Exige o teste nomeado em fail. Restaura com `git restore {arquivo}` —
  caminho explicito, nunca `.` (G14). Exige `git diff --stat` vazio → `red_check: pass (defesa: X, teste: Y)`.
  Teste nao caiu → restaurar mesmo assim, `red_check: fail (defesa: X, teste: Y)`, fase `blocked`, DI
  "teste nao prova a defesa: X / Y" no MEMORY do plano, fases dependentes nao iniciam, dev avisado no Step 5
  (CA-07). `git diff --stat` nao vazio apos restaurar → `needs_human`; NUNCA commitar entre mutar e restaurar.
- **DP-9 Fase `sem-comportamento` entra no mesmo bloco.** `Defesa a mutar` e o alvo textual (a linha, o
  heading, o arquivo), `Teste que deve cair` e o comando do gate (grep/estrutura). Remover o alvo → gate
  cai → restaurar → diff vazio → mesmos campos no STATE log (CA-09, PRD D5).
- **DP-10 O que o `plan-verifier` recebe e devolve.** RECEBE: o arquivo da fase, a linha do STATE log
  desta fase, a lista de arquivos tocados (`git diff --stat {HEAD-antes}..HEAD`), o comando de teste da
  fase. NAO RECEBE: PRD, outras fases, MEMORY completa. DEVOLVE `checks[]` com `acceptance_met`,
  `tests_pass`, `tdd-red-commit-found` e `red-check-evidence` — `pass` se a linha do STATE tem
  `red_check: pass` com defesa e teste nomeados; `fail` se `red_check: fail` (verdict `block`);
  `unable_to_verify` se o campo nao existe na linha. O verifier NUNCA reproduz a mutacao (D3, Regra 4). O
  4d ja consome `kind === "verification"` (`SKILL.md:458`) via `parseAndDispatch()`
  (`subagent-contract.ts:470`, handler em 485-486) e `checks[].name` e `string` (`subagent-contract.ts:126`):
  zero mudanca no parser (CA-10).
- **DP-11 Edicoes no `plan-verifier.md`.** Item 8 no `## Checklist de Verificacao` (apos o 7, linha 29);
  uma linha `red-check-evidence` em CADA um dos dois exemplos JSON (`## Output`, linhas 38-46, e
  `## Formato de Saida`, linhas 144-149); §Composition linha 114 passa de "Step 5 pos-fase" para
  "Step 4c VERIFY (por fase)" — hoje ninguem o spawna (PRD §Problema) e a linha mente. Regra 4 "Read-only"
  (linha 73) e frontmatter (linhas 1-7) intocados. O fixture `agents/__fixtures__/plan-verifier/expected-output.json`
  — o unico que `subagent-contract.test.ts:217-224` le — nao muda (G20).
- **DP-12 Formato da linha do STATE log (uma por fase).**
  `- {YYYY-MM-DD}: plano{NN}/fase-{MM} — tdd_level: {nivel} | red_confirmed: {assertion|blocked|gate-textual} | human_gate: {stopped|skipped(nivel)} | red_check: {pass|fail} (defesa: {X}, teste: {Y}) | refactor: {commit <hash>|none (motivo)} | custo: testes={n} spawns={n}`.
  Entra no `## Log` do STATE.md hierarquico (`SKILL.md:269-271`), no mesmo formato de bullet datado. A linha
  nasce parcial no passo 2 (DP-5) e e completada nos passos 4, 5 e 6.
- **DP-13 Step 5 mostra o ciclo e o custo; `bun run lint` vira condicional.** O diagnostico
  (`SKILL.md:561-566`) ganha a linha `Ciclo TDD: ...` com os 4 campos e a linha `Custo da fase: {n} rodadas
  de teste, {n} spawns`. O item 2 (`bun run lint`, linha 559) passa a "lint do projeto, se configurado em
  `package.json` §scripts; senao `n/a`". So o Step 5 entra no escopo — o `lint_pass` do verifier (linha 26)
  fica como esta (G19).
- **DP-14 Fixture do dogfood = pasta-template + uma copia por rodada.** `F:\tmp\avc-tdd-dogfood-template\`
  (escrita a mao, nunca executada) e `Copy-Item -Recurse` para `F:\tmp\avc-tdd-dogfood-r{1,2,3}\`; cada
  copia recebe `git init` + commit `baseline`. Nenhum comando destrutivo em rodada alguma (G14); as rodadas
  ficam como evidencia. Nada do fixture entra no repo do plugin (G23).
- **DP-15 `wave-execution.md`: so o diagrama "Ciclo Completo" muda.** Linhas ~135-153 ganham as linhas do
  RED confirmado pelo orquestrador, do gate, do RED-check, do REFACTOR e do VERIFY, mais uma frase de
  ponteiro para a fonte. Os registros `.tdd-phase.json` (linhas ~100-108 e ~128-133) ficam intocados
  (plano01 G10, PRD Won't Have).
- **DP-16 Common Rationalizations e Red Flags crescem uma linha por fase.** fase-01: "'O RED ja falhou no
  subagente, nao preciso rodar de novo' → o orquestrador confirma POR QUE falhou; module-not-found nao e
  RED". fase-02: "'O teste ficou verde, a defesa existe' → so a mutacao prova; teste que nasce verde pode
  afirmar true===true" e Red Flag "Fase avancou com `red_check: fail`". Tabela em `SKILL.md:864-869`, lista
  em 873-878 — so adicao.

---

## Gotchas Conhecidos

G1–G13 sao herdados do Plano 01 por referencia (ver `../plano01/README.md` §Gotchas) e valem integralmente
aqui — em especial G1 (cache ≠ checkout), G3 (`bun run lint` nao existe; comandos separados), G5/G12
(`section()` vs `prose()`), G8 (commitar o GREEN antes do RED-check; `git switch -c`; `git restore <arquivo>`),
G9 (nunca prever a mensagem), G10 (`.tdd-phase.json` fora do escopo) e G13 (escopo). Os novos:

- **G14 — O guard destrutivo casa o TEXTO do comando, inclusive dentro de pattern de grep ou de echo.**
  Confirmado durante este planejamento (2026-09-08): um `grep -E "...rm -rf..."` sobre o proprio hook foi
  bloqueado com `pattern: rm-rf`. Ids dos padroes (`hooks/pre-tool-use-destructive-guard.cjs:20-73`):
  `rm-rf`, `git-push-force-main`, `git-reset-hard`, `git-clean-force`, `git-branch-delete-force`,
  `git-update-ref`, `git-history-prune`, `git-checkout-discard`, `git-no-verify`. O `git-checkout-discard`
  (linha 67) casa `git checkout --`, `git checkout .` **e `git restore .`** — a restauracao do RED-check e
  SEMPRE `git restore <caminho-do-arquivo>`. Nunca colocar esses literais em comando, nem para "so listar".
- **G15 — Plano 01 ainda nao esta no checkout na data deste planejamento.** `tests/fase-template-tdd-contract.test.ts`
  nao existe; `grep -n "Contrato do Ciclo por Fase" skills/tdd-workflow/SKILL.md` e vazio. Antes de comecar
  a fase-01: `ls tests/fase-template-tdd-contract.test.ts`, `grep -n "function prose\|function section" tests/fase-template-tdd-contract.test.ts`
  e `grep -n "Defesa a mutar" skills/plan-feature/templates/fase-template.md` — os tres nao-vazios. Se algum
  falta, PARAR: o Plano 01 nao fechou (memoria `feedback_verify_memory_vs_code`).
- **G16 — O 4c e um bloco cercado.** `prose()` (plano01 DP-2) o apagaria inteiro. Asserir sobre
  `section(executePlan, '### 4c.')` cru — o `section()` generalizado por nivel (plano01 DP-1) acha o heading
  por `startsWith`, rastreia o fence e para em `### 4d.`. E o caso G12 do plano01, nao o G5.
- **G17 — Preface load-bearing no topo do `execute-plan/SKILL.md`.** O bloco TypeScript das linhas 10-30 e
  verificado por `tests/e2e/stack-aware-preface-all-skills.test.ts` (compound
  `2026-08-11-skill-md-code-block-can-be-load-bearing.md`). Nada acima da linha 344 muda, exceto o valor de
  `argument-hint:` na linha 7 (fase-01). Rodar o e2e do preface no checklist das fases 01–03.
- **G18 — Manifest (plano01 G2) — linhas dos rastreados deste plano no `plugin-manifest.json`:**
  `agents/plan-verifier.md` (500), `skills/execute-plan/SKILL.md` (1118),
  `skills/execute-plan/references/wave-execution.md` (1130). O `.test.ts` e `docs/` nao entram.
  `bun run generate:manifest` no mesmo commit; conferir com `git diff --stat plugin-manifest.json`.
- **G19 — `bun run lint` aparece no Step 5 (`SKILL.md:559`) E no item 4 `lint_pass` do verifier (`plan-verifier.md:26`).**
  So o Step 5 esta no escopo (fase-03, DP-13). O `lint_pass` do verifier devolve `unable_to_verify` neste repo
  — e honesto (Regra 3 dele) e fica assim (plano01 G13).
- **G20 — Quem le o `plan-verifier.md`.** `skills/lib/subagent-contract.test.ts:217-224` le o FIXTURE
  (`agents/__fixtures__/plan-verifier/expected-output.json`), nao a prosa; `scripts/harness-validate.ts:274`
  globa `agents/*.md` e checa frontmatter + H1. Logo: adicionar linhas nos exemplos JSON da prosa e seguro;
  frontmatter (1-7) e fixture nao se tocam. `bun run agents:contract` e `bun run harness:validate` no checklist.
- **G21 — `argument-hint` vive no frontmatter (linha 7), sem heading.** `section()` nao o encontra. A
  assercao de RF-08 roda no arquivo cru: `/^argument-hint:.*--tdd-level/m` (o helper `read` ja tira `\r`,
  plano01 G4). Trocar so o valor da chave; chaves e ordem do frontmatter ficam.
- **G22 — Gate humano preserva o STATE (Premissa 2).** `AskUserQuestion` no meio do 4c so e seguro se a linha
  parcial da fase (com `red_confirmed`) ja esta no STATE log antes da pergunta (DP-5). Abortar no gate deixa
  a fase `paused` com o RED registrado — nunca em branco.
- **G23 — Dogfood so em fixture com git proprio e cwd no fixture.** O execute-plan resolve
  `docs/exec-plans/active/` a partir do cwd (Step 1a), o RED-check usa `git restore` e `git diff --stat` (exige
  HEAD), e o GREEN commita. O fixture e um repo git independente em `F:\tmp\` (diretorio de trabalho
  adicional permitido), aberto numa sessao do Claude Code com cwd nele. Nenhum arquivo do fixture entra no
  repo do plugin; o unico rastro aqui e o MEMORY/STATE desta feature.

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

# Plano 01: Fonte e contrato

**Feature:** Contrato Unico do Ciclo TDD por Fase ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (o ciclo roda no execute-plan)

---

## O que este plano entrega

Ao final, o ciclo TDD por fase tem **uma** definicao no plugin — a secao `## Contrato do Ciclo por Fase`
de `skills/tdd-workflow/SKILL.md` — e os dois consumidores de planejamento apontam para ela em vez de
parafrasea-la: o bloco `### TDD` de `fase-template.md` carrega `Tipo de fase`, RED, GREEN, RED-check
(com `Defesa a mutar` e `Teste que deve cair`) e REFACTOR; `agents/plan-executor.md` §TDD incorpora
stub-first, "nasce verde → muta no mesmo passo" e REFACTOR em commit proprio; o Step 9 do
`plan-feature` obriga o planejador a nomear a defesa e o proibe de prever a mensagem. Um teste de
paridade (`tests/fase-template-tdd-contract.test.ts`) derruba a suite se qualquer um desses itens
diminuir — "gate de paridade e teste, nao doc".

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Nenhum — o plano so toca markdown do plugin e cria um teste `bun:test` | — | — |
| Molde do teste de paridade: `tests/write-prd-contract.test.ts` (helpers `read` + `section()`) | repo (2026-09-01) | pronto |
| Branch `feat/tdd-cycle-contract` criada com `git switch -c` (G8) | sessao de 2026-09-08 | pronta (checkout atual) |
| `docs/references/tdd-cycle-checklist.md` (stub-first) para a fonte citar | repo (2026-05-19) | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Secao-fonte `## Contrato do Ciclo por Fase` em `skills/tdd-workflow/SKILL.md` (tabela tipo × RED/GREEN/RED-check/REFACTOR/gate; mapa nivel → parada) | Plano 02 fase-01 (Step 4c cita pelo caminho; `wave-execution.md` §Ciclo Completo aponta para ca) |
| Campos `Defesa a mutar:` e `Teste que deve cair:` no bloco `### TDD` do `fase-template.md` | Plano 02 fase-02 (o orquestrador le os dois campos para o RED-check por mutacao) |
| `Tipo de fase: {comportamento \| risco \| sem-comportamento}` no template | Plano 02 fase-01 (decide onde o gate humano para) e fase-02 (variante do RED-check) |
| Item `defesa-implementada` em `payload.checks[]` do executor | Plano 02 fase-02 (o orquestrador muta o que o executor nomeou) e fase-03 (`plan-verifier` le `red-check-evidence`) |
| `tests/fase-template-tdd-contract.test.ts` com `section()` generalizado por nivel e `prose()` | Plano 02 fases 01–03 acrescentam assertions sobre o Step 4c no MESMO arquivo |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-tracer-fonte-e-gate.md | Teste de paridade RED (2 assertions) → secao-fonte minima na skill + checkbox `**REFACTOR:**` no template; `tdd-cycle-checklist` Passo 7 deixa de ser "(opcional)" (RF-01 parcial, RF-04 parcial, D1) | 1h | — |
| 02 | fase-02-bloco-tdd-completo-no-template.md | Bloco `### TDD` completo: `Tipo de fase`, RED stub-first/Abuse-It, GREEN isolado, RED-check com `Defesa a mutar` + `Teste que deve cair`, REFACTOR, variante sem-comportamento, exemplo preenchido, ponteiro para a fonte; `plan-readme-template` §TDD Strategy aponta para a fonte (RF-02, D5, D6) | 1h | fase-01 |
| 03 | fase-03-executor-e-planejador-apontam-para-a-fonte.md | `plan-executor.md` §TDD referencia o contrato, stub-first, nasce-verde→muta, REFACTOR em commit proprio, `defesa-implementada` no envelope; `plan-feature` Step 9 ganha regras 9 e 10 (RF-06, RF-07, D4, D6) | 1h | fase-02 |

---

## Grafo de Fases

```
fase-01 (tracer: fonte minima + gate)
    |
    v
fase-02 (bloco ### TDD completo no template)
    |
    v
fase-03 (executor + Step 9 apontam para a fonte)
```

**Paralelismo possivel:** nenhum. As tres fases editam o mesmo `tests/fase-template-tdd-contract.test.ts`,
que cresce a cada fase — contrato compartilhado exige acordo antes, nao corrida (PLAN.md §Grafo). A fase-02
tambem depende do checkbox REFACTOR que a fase-01 cria (ela o completa, nao o recria), e a fase-03 depende
dos nomes de campo (`Defesa a mutar`, `Teste que deve cair`) fixados na fase-02 para escrever as regras 9 e 10.

---

## TDD Strategy

Fonte do ciclo: `skills/tdd-workflow/SKILL.md`, secao `## Contrato do Ciclo por Fase` — que a **propria
fase-01 deste plano cria**. Ate ela existir, valem as regras abaixo, que sao as mesmas que a secao vai fixar.

Todas as fases sao do tipo **comportamento**: o teste e um `bun:test` real (`tests/fase-template-tdd-contract.test.ts`)
que le os arquivos do repo e falha por **assertion** (os arquivos ja existem; o `expect` e que reprova —
nunca `Cannot find module`). A "defesa" e texto de skill/template/agente; mutar a defesa e apagar a linha
ou o heading nomeado no RED-check e ver o teste cair.

```
Ciclo por fase:
1. RED:       acrescentar assertions ao teste de paridade; rodar; registrar a saida LITERAL (nao a prevista)
2. GREEN:     editar a skill/template/agente ate o teste passar; commit feat(...)
3. RED-check: (orquestrador) aplicar "Defesa a mutar" → rodar "Teste que deve cair" → exigir falha →
              git restore <arquivo> → git diff --stat vazio
4. REFACTOR:  commit refactor(...) proprio, ou registrar "sem refactor: {motivo}" no MEMORY
5. VERIFY:    comandos SEPARADOS, um por vez, saida lida ate o fim (G3)
```

Comandos deste repo (de `package.json` §scripts — `bun run lint` **nao existe**, G3):

- Teste alvo: `bun test tests/fase-template-tdd-contract.test.ts` (filtro por nome: `-t '<regex>'`)
- Suite: `bun run test` (roda em lotes — o total e a soma dos lotes)
- Tipos: `bun run typecheck`
- Harness: `bun run harness:validate`
- Manifest: `bun run generate:manifest` (G2)
- Agentes: `bun run agents:contract` (so fase-03, G7)

**RED-check do orquestrador (obrigatorio em toda fase):** o checklist de cada fase nomeia QUAL defesa
mutar e QUAL teste deve cair — nunca a mensagem (G9). Commitar o GREEN **antes** do RED-check, para que
`git restore <arquivo>` devolva exatamente o GREEN e nao apague trabalho (G8).

**Tracer Bullet deste plano:** fase-01 — atravessa fonte (skill) → consumidor (template) → gate (teste)
na menor mudanca possivel. Se o RED-check do proprio gate fecha ali (remover o checkbox derruba o teste;
restaurar, volta), "gate de paridade e teste, nao doc" esta provado antes de escrever o resto.

---

## Decisoes de planejamento (DP)

Fixadas neste planejamento com evidencia do codebase (linhas da `main` em 2026-09-08). As fases
**implementam**; nao reabrem. Divergencia real vira DI no MEMORY.

- **DP-1 `section()` generalizado por nivel.** O molde (`write-prd-contract.test.ts:30-47`) so corta em
  `## `. O bloco alvo e `### TDD` dentro de `## Verificacao`; o helper novo deriva o nivel da contagem de
  `#` do heading pedido e para no proximo heading de nivel igual ou superior, mantendo o rastreio de fences.
  Um helper, nao dois.
- **DP-2 `prose()` para assercoes no template.** O bloco `### TDD` novo tem um exemplo preenchido (em
  fence) e um ponteiro (em comentario HTML) que contem os mesmos tokens das linhas de checkbox
  (`Defesa a mutar:`, `Contrato do Ciclo por Fase`). Assercao ingenua passaria com o checkbox apagado.
  `prose(body)` remove fences e comentarios HTML; as assercoes de contrato rodam sobre `prose(section(...))`,
  e SO a assercao do ponteiro roda sobre o corpo cru (G5). Excecao: as regras do Step 9 do `plan-feature`
  vivem DENTRO de um fence — la se usa `section()` cru (G12).
- **DP-3 Nome do check do executor.** `payload.checks[]` ganha `{ "name": "fase-{NN}-defesa-implementada", ... }`,
  seguindo o padrao `fase-01-tdd-red-evidence` do exemplo em `agents/plan-executor.md:229`. O item e
  documentado na secao §TDD reescrita; o bloco JSON de `## Formato de Saida` e o fixture
  `agents/__fixtures__/plan-executor/expected-output.json` **nao** sao tocados (G7).
- **DP-4 A fonte lista o Step 4c como consumidor desde a fase-01.** A frase "quem consome aponta para ca"
  cita `fase-template.md`, `plan-executor.md` e o Step 4c do `execute-plan`. Os dois primeiros ganham o
  ponteiro neste plano; o 4c so no Plano 02 fase-01. E declaracao de contrato, nao de estado — o teste que
  exige o ponteiro no 4c e do Plano 02. Mesma logica para a mencao a `--tdd-level` (RF-08, Plano 02).
- **DP-5 Passo 7 do checklist e gate textual, nao assercao de paridade.** `docs/` esta fora do manifest e o
  PRD §RF-04 nao lista o checklist. A fase-01 o edita com gate textual visto falhando (grep encontra
  "(opcional)" antes, vazio depois; RED-check = restaurar a palavra → grep volta a encontrar → desfazer).
  E o primeiro dogfood do tipo `sem comportamento` (D5).
- **DP-6 Sem provenance em markdown.** Comentario com linhagem (`// 2026-09-08 (Luiz/dev): ... — PRD
  tdd-cycle-contract §RF-0X`) vai em TODO comentario proposto para o `.test.ts`. Nos `.md` editados nao se
  adiciona comentario de linhagem (regra 8 do brief); o ponteiro HTML do template e ponteiro, nao linhagem.

---

## Gotchas Conhecidos

- **G1 — Cache do plugin ≠ checkout.** Hooks, skills e agentes rodam de `C:\Users\luizf\.claude\plugins\cache\...\7.7.0`,
  nao deste checkout. Nada deste plano muda comportamento nesta sessao ate `scripts/sync-to-global.sh` apos
  o merge (memoria `project_plugin-cache-stale-hooks`, PRD Premissa 5). Nenhuma fase promete runtime; o
  criterio de aceite e sempre o teste de paridade e os validadores.
- **G2 — Manifest no mesmo commit.** Arquivo rastreado alterado exige `bun run generate:manifest` no mesmo
  commit. Rastreados neste plano (linha no `plugin-manifest.json`): `agents/plan-executor.md` (494),
  `skills/plan-feature/SKILL.md` (2420), `skills/plan-feature/templates/fase-template.md` (2432),
  `skills/plan-feature/templates/plan-readme-template.md` (2456), `skills/tdd-workflow/SKILL.md` (2786).
  **Nao rastreados:** `docs/references/tdd-cycle-checklist.md` (`docs/` em `IGNORED_PREFIXES`,
  `scripts/generate-manifest.js:30-41`) e o `.test.ts` novo (`tests/` ignorado + `name.includes('.test.')`
  excluido, linha 100). Conferir com `git diff --stat plugin-manifest.json` que so checksum/`lastModified`
  dos arquivos tocados mudaram — o gerador usa `package.json.version` (7.7.0), nao bumpa versao.
- **G3 — `bun run lint` NAO existe.** Verificacoes rodam SEPARADAS, um comando por vez, saida lida ate o
  fim. Nunca `a && b | tail` — o pipe mente sobre o exit code. Os proprios arquivos-alvo citam `bun run lint`
  (`fase-template.md:124`, `tdd-workflow/SKILL.md:499,505,580`, `plan-readme-template.md:72`): fora do
  escopo, **nao corrigir de passagem** (ver G13) — a unica excecao e a linha 72 do README-template, que a
  fase-02 substitui inteira porque o bloco `## TDD Strategy` vira ponteiro.
- **G4 — CRLF.** Repo Windows; regex ancorada em `$` quebra com `\r`. O helper `read` faz
  `.replace(/\r/g, '')` (molde `write-prd-contract.test.ts:24`). Nunca ler os `.md` sem passar por ele.
- **G5 — Headings dentro de fences e comentarios HTML enganam grep no arquivo inteiro** (compound
  `2026-05-12-validator-regex-hits-comments.md`). Asserir no corpo da secao via `section()` (fence-aware) e,
  no template, sobre `prose()` (DP-2). Sinal de assercao vacua: ela continua verde com o alvo apagado — o
  RED-check de cada fase existe para pegar exatamente isso.
- **G6 — `$ARGUMENTS` fica a ultima linha de `tdd-workflow/SKILL.md`** (linha 585 hoje; `## Feature solicitada`
  em 583). A secao nova entra entre `RED-GREEN-REFACTOR permanece.` (545) e `## Common Rationalizations` (547).
  Blocos de codigo em SKILL.md podem ser load-bearing (compound `2026-08-11-skill-md-code-block-can-be-load-bearing.md`):
  o bloco `stack-aware-preface` (linhas 10-22) e guardado por `skills/tdd-workflow/__tests__/stack-aware-preface-wire.test.ts`
  e `tests/e2e/stack-aware-preface-all-skills.test.ts` — nao reformatar nada que nao seja o alvo.
- **G7 — `agents/*.md` exige `bun run agents:contract` verde** apos edicao. O contrato le
  `agents/_contract/v1.schema.json` e os fixtures em `agents/__fixtures__/`, nao a prosa — mas
  `scripts/harness-validate.ts:274` globa `agents/*.md` e le o frontmatter: nao tocar as linhas 1-8 do
  `plan-executor.md`. `positive_observations` e o envelope de `## Formato de Saida` tem validator regex
  (`subagent-contract-v2-migration.md`): a fase-03 nao toca esses blocos (DP-3).
- **G8 — Guard destrutivo e restauracao.** O guard casa `git checkout` pelo texto: branch com `git switch -c`
  (ja feita: `feat/tdd-cycle-contract`), restaurar no RED-check com `git restore <arquivo>`. **Commitar o
  GREEN antes do RED-check** — `git restore` devolve o HEAD; se o GREEN ainda nao esta commitado, ele o apaga.
  Nunca commitar ENTRE mutar e restaurar. Nunca commitar na `main` (memoria `feedback_branch-pr-never-main`).
- **G9 — Numero/mensagem previstos sao chute do planejador** (compound `2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md`).
  Cada checklist nomeia QUAL defesa mutar e QUAL teste cai; nunca "Expected X, Received Y". Divergencia entre
  o que a fase diz e o que o comando imprime se **reporta** no MEMORY, nunca se maquia.
- **G10 — `.tdd-phase.json` esta fora do escopo.** `verify-work` e `tdd-verifier` o citam como evidencia de RED;
  o execute-plan 4c "Registra: .tdd-phase.json". PRD §Won't Have — nao tocar, nao citar como criterio.
- **G11 — Ha um guard vivo sobre `fase-template.md` que a Premissa 3 do PRD nao viu.** `grep -rl fase-template tests/`
  retorna zero, mas `skills/lib/__tests__/universal-principles.test.ts:50-57` le o template e exige o literal
  `Comment Provenance` e um comentario no formato `// YYYY-MM-DD (x):`. Ambos vivem no header (linhas 1-8) e
  no snippet do Passo 1 (linha 40) — fora do bloco `### TDD`. Rodar esse teste apos fase-01 e fase-02; se
  cair, a edicao saiu do bloco.
- **G12 — As regras do Step 9 do `plan-feature` vivem DENTRO de um fence** (`skills/plan-feature/SKILL.md:747-757`).
  `section()` cru as captura (o fence nao e cortado porque nao e heading); `prose()` as APAGARIA. Na fase-03,
  asserir sobre `section(planFeature, '### Regras do subagente de planejamento')` sem `prose()`. E o inverso
  exato do G5 — o mesmo helper, decisao oposta, e a fase diz qual.
- **G13 — Escopo.** Os arquivos-alvo tem outras copias/contradicoes do ciclo que o PLAN.md mapeia para o
  Plano 02 (`execute-plan/references/wave-execution.md` §Ciclo Completo, Step 4c) e coisas fora do PRD
  (`bun run lint` nos checklists, `.tdd-phase.json`). Editar so o que a fase lista em "Arquivos Afetados";
  qualquer outra linha tocada e DEV no MEMORY ou reverte.

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

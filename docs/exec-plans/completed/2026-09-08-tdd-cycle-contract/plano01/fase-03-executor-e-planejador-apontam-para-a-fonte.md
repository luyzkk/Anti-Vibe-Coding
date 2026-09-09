<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): gate de paridade do ciclo TDD por fase — PRD tdd-cycle-contract §RF-04`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Executor e planejador apontam para a fonte

**Plano:** 01 — Fonte e contrato
**Sizing:** 1h
**Depende de:** fase-02 (nomes dos campos `Defesa a mutar` / `Teste que deve cair` fixados no template; `prose()` e `section()` no teste)
**Visual:** false

---

## O que esta fase entrega

`agents/plan-executor.md` §"TDD no Ciclo Red-Green-Refactor" deixa de ser a segunda definicao do ciclo:
aponta para `skills/tdd-workflow/SKILL.md` "Contrato do Ciclo por Fase" e incorpora o que hoje so vive em
compound — RED stub-first (falha por assertion, nao por module-not-found), "teste que nasce verde exige
mutacao no mesmo passo", REFACTOR como segundo passo do GREEN em commit `refactor(...)` separado (D4) ou
"sem refactor: {motivo}", e o executor reporta em `payload.checks[]` o item `defesa-implementada` que o
orquestrador vai mutar (ele NAO faz o RED-check final — e do orquestrador, D3). O Step 9 do `plan-feature`
ganha as regras 9 e 10: toda fase de comportamento ou risco preenche `Defesa a mutar` e `Teste que deve
cair`; nunca prever a mensagem de erro (RF-06, RF-07, D6).

**Tipo de fase:** comportamento (o teste de paridade cresce; as defesas sao texto do agente e da skill).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fase-template-tdd-contract.test.ts` | Modify (PRIMEIRO) | Dois `describe` novos: `plan-executor` §TDD (ponteiro, stub, nasce verde, commit no REFACTOR, `defesa-implementada`) e `plan-feature` Step 9 (regras 9 e 10) |
| `agents/plan-executor.md` | Modify (substituicao de UMA secao) | Linhas 66-82 (`## TDD no Ciclo Red-Green-Refactor` ate antes de `## Slice de Risco`, 83) reescritas. Frontmatter (1-8), `## Output Contract` (154), `## Anti-Degeneration Rules` (172) e `## Formato de Saida` (207) intactos (G7, DP-3) |
| `skills/plan-feature/SKILL.md` | Modify (ADITIVO) | Regras 9 e 10 no fence de `### Regras do subagente de planejamento` (linhas 745-757), apos a regra 8 |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — `agents/plan-executor.md` (494) e `skills/plan-feature/SKILL.md` (2420) |

Numeracao: `main` em 2026-09-08 (estes dois arquivos nao mudam nas fases 01-02).

---

## Implementacao

### Passo 1: Assercoes novas no teste de paridade (RED)

```ts
// acrescentar aos reads:
const executor = read('agents/plan-executor.md')
const planFeature = read('skills/plan-feature/SKILL.md')

describe('plan-executor — §TDD aponta para a fonte e incorpora os compounds (RF-06)', () => {
  const tdd = () => prose(section(executor, '## TDD no Ciclo Red-Green-Refactor'))

  test('a secao cita a secao-fonte pelo caminho (CA-03, D1)', () => {
    const body = tdd()
    expect(
      body.includes('skills/tdd-workflow/SKILL.md') && body.includes('Contrato do Ciclo por Fase'),
      `[parity gate — RF-06 / CA-03] "## TDD no Ciclo Red-Green-Refactor" de agents/plan-executor.md nao ` +
        `aponta para skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" (ou a secao sumiu — ` +
        `section() devolve ''). O executor e consumidor do ciclo, nao a segunda definicao dele.`,
    ).toBe(true)
  })

  test.each([
    [/stub/i, 'stub-first: o RED falha por assertion, nunca por Cannot find module (compound 2026-05-19)'],
    [/nasce verde/i, 'teste que nasce verde exige mutacao no mesmo passo (compound 2026-09-06)'],
    [/defesa-implementada/, 'o executor nomeia em payload.checks[] a defesa que o orquestrador vai mutar (D3)'],
  ])('a secao mantem a regra %s', (re, why) => {
    expect(
      re.test(tdd()),
      `[parity gate "nunca diminuir" — RF-06] Sumiu da secao TDD do plan-executor: ${why}. ` +
        `Ate esta feature isso vivia so em docs/compound/ — e compound nao e prompt. Restaure o texto.`,
    ).toBe(true)
  })

  test('o REFACTOR e commit proprio, separado do feat (D4, CA-08)', () => {
    const refactor = prose(section(executor, '### REFACTOR'))
    expect(
      refactor.length > 0 && /commit/i.test(refactor) && /refactor\(/.test(refactor),
      `[parity gate — RF-06 / D4 / CA-08] A subsecao "### REFACTOR" do plan-executor nao exige commit ` +
        `refactor(...) proprio (ou sumiu). D4: o mesmo subagente GREEN refatora como segundo passo, em ` +
        `commit separado — refactor escondido no feat(...) e o que "Refactor Fica no Ciclo" chama de ` +
        `problema de granularidade de commit.`,
    ).toBe(true)
  })
})

describe('plan-feature — Step 9 obriga a nomear a defesa e proibe prever a mensagem (RF-07)', () => {
  // 2026-09-08 (Luiz/dev): corpo CRU, sem prose() — as regras do Step 9 vivem DENTRO de um fence
  // (skills/plan-feature/SKILL.md:747-757). prose() as apagaria e o teste passaria/reprovaria pelo
  // motivo errado — inverso do G5 (DP-2 / G12 do Plano 01). PRD tdd-cycle-contract §RF-07
  const regras = () => section(planFeature, '### Regras do subagente de planejamento')

  test.each([
    ['Defesa a mutar', 'qual linha/condicao o orquestrador remove ou inverte'],
    ['Teste que deve cair', 'qual teste tem de falhar com a defesa removida'],
  ])('as regras exigem preencher "%s" em fase de comportamento ou risco', (campo, why) => {
    expect(
      regras().includes(campo),
      `[parity gate — RF-07 / D6] "${campo}" ausente das regras do subagente de planejamento (Step 9 do ` +
        `plan-feature) — ${why}. O template pede o campo (fase-02), mas quem o preenche e o planejador: ` +
        `sem a regra ele volta a escrever RED/GREEN e parar.`,
    ).toBe(true)
  })

  test('as regras proibem prever a mensagem de erro (D6)', () => {
    expect(
      /prever a mensagem/i.test(regras()),
      `[parity gate — RF-07 / D6] Sumiu do Step 9 a proibicao de prever a mensagem de erro do RED. ` +
        `Numero e mensagem previstos sao chute; em tres ocasioes o real divergiu e o incentivo era ` +
        `reportar o previsto (compound 2026-09-06). O planejador nomeia a assertion que quebra.`,
    ).toBe(true)
  })
})
```

Rodar `bun test tests/fase-template-tdd-contract.test.ts`. Esperado no RED: tudo da fase-01/02 **pass**;
os testes novos **fail por assertion** (os dois arquivos existem e as secoes existem; o texto e que falta).
Atencao: `section(executor, '### REFACTOR')` ja existe hoje (linha 78) com "Limpe o codigo mantendo os
testes verdes" — sem a palavra `commit`, entao reprova por assertion, como deve. Registrar a saida literal.
Commit: `test(agents): RED — executor e planejador apontam para a fonte`.

### Passo 2: GREEN — secao TDD do executor reescrita

Substituir em `agents/plan-executor.md` da linha 66 (`## TDD no Ciclo Red-Green-Refactor`) ate a 82
(ultimo bullet de `### REFACTOR`), mantendo a linha 83 (`## Slice de Risco — Defensivo da Primeira Linha`)
como esta:

```markdown
## TDD no Ciclo Red-Green-Refactor

A definicao do ciclo e UMA e mora em `skills/tdd-workflow/SKILL.md`, secao **Contrato do Ciclo por Fase**
(tipo da fase × RED / GREEN / RED-check / REFACTOR / gate humano). Esta secao diz o que cabe a VOCE, o
executor; nao redefine o ciclo. O tipo da fase vem do bloco `### TDD` da task (`**Tipo de fase:**`).

### RED (stub-first)
- Escreva o teste que falha. O teste descreve o COMPORTAMENTO esperado, nao a implementacao.
- A falha e por **assertion**, nunca por `Cannot find module`: crie o modulo como **stub** minimo —
  `throw new Error('not implemented')` em cada export que o teste importa
  (`docs/references/tdd-cycle-checklist.md`). `Cannot find module` no RED = falta o stub; nao e RED.
- Registre a saida LITERAL do comando de teste. Se a task previa outra mensagem, reporte a divergencia
  em `reasoning` — nunca maquie, nunca "conserte" o codigo para bater com o doc.
- Fase `risco`: o primeiro teste e o de abuso (secao "Slice de Risco" abaixo).
- **Teste que nasce verde exige mutacao no mesmo passo.** Se o codigo ja existia quando o teste foi
  escrito, prove ali mesmo: mute a defesa, capture a falha, restaure com `git restore <arquivo>` e
  confira `git diff --stat` vazio. Nao deixe para o revisor descobrir.

### GREEN
- Implemente o minimo de codigo para o teste passar
- NAO modifique o teste durante esta fase (ancora imutavel)
- NAO adicione codigo nao exigido pelo teste

### REFACTOR (segundo passo do GREEN, commit proprio)
- Com os testes verdes, limpe: extraia funcoes, melhore naming, remova duplicacao
- Commit `refactor(...)` SEPARADO do `feat(...)` — nunca no mesmo commit (Decisao D4 do PRD
  tdd-cycle-contract). Refactor escondido no feat e o que ninguem consegue revisar.
- Se nao ha o que refatorar, diga: `refactor: none — {motivo}` em `reasoning`. Silencio nao e "sem refactor".

### O que voce reporta para o RED-check (e NAO executa)
O RED-check final — mutar a defesa, ver o teste cair, restaurar — e do **orquestrador** do execute-plan,
nao seu: quem verifica nao e quem implementou. Sua parte e nomear o alvo. Inclua em `payload.checks[]`:

`{ "name": "fase-{NN}-defesa-implementada", "status": "pass", "detail": "defesa: {arquivo:linha ou condicao}; teste que deve cair: {nome do teste}" }`

Sem esse item o orquestrador nao tem o que mutar e a fase nao fecha. Se a task ja trazia `Defesa a mutar`
e `Teste que deve cair` no bloco `### TDD`, copie-os; se a defesa que voce escreveu e outra, diga qual e
por que em `reasoning`.
```

Nada mais no arquivo muda: `## Regras (inviolaveis)` regra 2 ("TDD obrigatorio"), a regra 4 das
Anti-Degeneration Rules (evidencia RED-GREEN, linha 184), o bloco JSON de `## Formato de Saida`
(linhas 213-247) e `## Slice de Risco` continuam como estao. O item `defesa-implementada` e documentado
SO nesta secao; nao acrescentar ao exemplo JSON (DP-3, G7).

### Passo 3: GREEN — regras 9 e 10 no Step 9 do `plan-feature`

Em `skills/plan-feature/SKILL.md`, dentro do fence de `### Regras do subagente de planejamento`, apos a
regra 8 (`8. Marcar fases com "visual: true" ...`, linha 756) e antes do fechamento do fence (757):

```
9. Toda fase de tipo comportamento ou risco preenche no RED-check "Defesa a mutar" (qual linha ou
   condicao remover ou inverter) e "Teste que deve cair" (nome do teste). Fase sem-comportamento
   nomeia o alvo textual do gate (o que remover para o grep cair). Fonte: skills/tdd-workflow/SKILL.md,
   "Contrato do Ciclo por Fase"
10. Nunca prever a mensagem de erro do RED nem do RED-check ("Expected 3, Received 0"): numero e
    mensagem previstos sao chute do planejador. Nomear a assertion ou o teste que quebra
    (docs/compound/2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md)
```

Mesma indentacao das regras 1-8 (o bloco e texto dentro de fence, sem sintaxe). Nada fora do fence muda;
em particular o bloco `stack-aware-preface` do topo (linhas 10-22) e `### Classificacao de Risco do
Slice` (439) ficam intactos.

### Passo 4: GREEN — rodar, contrato de agentes, manifest, commit

1. `bun test tests/fase-template-tdd-contract.test.ts` → `0 fail`.
2. `bun run agents:contract` → verde (G7; obrigatorio apos editar `agents/*.md`).
3. `bun run generate:manifest`; `git diff --stat plugin-manifest.json` → so `agents/plan-executor.md` e
   `skills/plan-feature/SKILL.md` (G2).
4. `bun run harness:validate` (globa `agents/*.md` e le o frontmatter — intacto).
5. `bun test tests/e2e/stack-aware-preface-all-skills.test.ts` (o `plan-feature` nao esta na lista das 7,
   mas o `tdd-workflow` esta e a suite inteira e barata — confirma que nada do preface se moveu).
6. Commit: `feat(agents): GREEN — plan-executor §TDD e plan-feature Step 9 apontam para o contrato`.

---

## Gotchas

- **G7 do plano:** `agents:contract` le `agents/_contract/v1.schema.json` e os fixtures — nao a prosa.
  Passar nele nao prova que a secao esta certa; prova que o envelope nao foi quebrado. O que prova a
  secao e o teste de paridade + RED-check. Nao tocar `## Formato de Saida` nem `positive_observations`.
- **G12 do plano:** as regras do Step 9 vivem em fence. O `describe` do plan-feature usa `section()` cru,
  de proposito; se alguem "padronizar" para `prose()`, o teste reprova com as regras presentes — e o
  RED-check (4) abaixo existe para pegar exatamente essa regressao ao contrario.
- **G13 do plano:** o `plan-feature/SKILL.md` tem outras mencoes ao ciclo (Step 3 `### Tracer Bullet`,
  `### Classificacao de Risco do Slice` item 3, `## Task Sizing`). Nao sao desta fase; a fase toca so o
  fence do Step 9. Qualquer outra linha = DEV no MEMORY ou reverte.
- **G6 do plano (para o plan-feature):** o topo do arquivo tem o bloco `stack-aware-preface` com imports
  TypeScript, verificado por `tests/e2e/stack-aware-preface-all-skills.test.ts` — nao e o alvo, nao reformatar.
- **Local — `### REFACTOR` como heading unico:** a assercao de commit corta por `### REFACTOR`; o texto
  novo e `### REFACTOR (segundo passo do GREEN, commit proprio)` — `startsWith('### REFACTOR')` casa.
  Se o executor renomear para `### Refactor`, a assercao devolve `''` e reprova: ajustar o heading, nao a regex.
- **Local — `defesa-implementada` e nome de check, nao campo novo do schema:** `payload.checks[].name`
  e `string` livre (`agents/plan-executor.md:167`). Nenhuma mudanca em `skills/lib/subagent-contract.ts`
  nem em `agents/_contract/v1.schema.json`. O Plano 02 fase-02 le esse nome no 4c.
- **Local — quem faz o RED-check desta fase:** o orquestrador do execute-plan. O executor desta fase
  (subagente) reporta `fase-03-defesa-implementada` com as cinco defesas abaixo — e o primeiro dogfood
  do proprio item que ele acabou de escrever.

---

## Verificacao

### TDD

**Tipo de fase:** comportamento

- [ ] **RED:** assercoes novas escritas; FALHAM por assertion sobre o executor e o Step 9 atuais
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`
  - Saida literal registrada; commit `test(agents): RED — executor e planejador apontam para a fonte`

- [ ] **GREEN:** secao TDD do executor reescrita + regras 9 e 10; teste PASSA
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`
  - Resultado: `0 fail`; commit `feat(agents): GREEN — ...`

- [ ] **RED-check do orquestrador (obrigatorio):** com o GREEN commitado, uma mutacao por defesa;
      `git restore <arquivo>` e `git diff --stat` vazio entre cada uma
  - Defesa a mutar (1): apagar a palavra `stub` (todas as ocorrencias) da secao `## TDD no Ciclo ...` do executor
    - Teste que deve cair: `a secao mantem a regra /stub/i`
  - Defesa a mutar (2): apagar o bullet "Teste que nasce verde exige mutacao no mesmo passo"
    - Teste que deve cair: `a secao mantem a regra /nasce verde/i`
  - Defesa a mutar (3): trocar `Commit \`refactor(...)\` SEPARADO ...` por "Limpe o codigo mantendo os testes verdes" (o texto antigo)
    - Teste que deve cair: `o REFACTOR e commit proprio, separado do feat (D4, CA-08)`
  - Defesa a mutar (4): apagar a regra 10 inteira do fence do Step 9
    - Teste que deve cair: `as regras proibem prever a mensagem de erro (D6)`
  - Defesa a mutar (5): apagar `Defesa a mutar` da regra 9 (deixar `Teste que deve cair`)
    - Teste que deve cair: `as regras exigem preencher "Defesa a mutar" em fase de comportamento ou risco` — e SO ele
  - NAO escrever a mensagem esperada (G9). Teste que nao cai = `blocked` + DI "teste nao prova a defesa"

- [ ] **REFACTOR:** candidato: os tres `describe` do arquivo repetem `prose(section(doc, heading))` — se
      virar um helper `body(doc, heading)`, commit `refactor(tests): extrai body()` proprio. Senao,
      `sem refactor: {motivo}`

### Checklist

- [ ] `bun test tests/fase-template-tdd-contract.test.ts` → `0 fail` (contagem literal no MEMORY)
- [ ] `bun run agents:contract` → verde (G7)
- [ ] `sed -n '1,8p' agents/plan-executor.md` identico ao da `main` (`git diff -U0 agents/plan-executor.md | head` nao mostra as linhas 1-8)
- [ ] `git diff agents/plan-executor.md` toca SO o intervalo entre `## TDD no Ciclo` e `## Slice de Risco`; `## Formato de Saida` e `## Anti-Degeneration Rules` sem diff
- [ ] `grep -n 'defesa-implementada' agents/plan-executor.md` → 1 ocorrencia, na secao TDD (nao no JSON)
- [ ] `grep -n '^9\. \|^10\. ' skills/plan-feature/SKILL.md` → as duas regras, dentro do fence do Step 9
- [ ] `git diff skills/plan-feature/SKILL.md` e so adicao das regras 9 e 10 (G13)
- [ ] `bun test tests/e2e/stack-aware-preface-all-skills.test.ts` → verde (G6)
- [ ] `bun run generate:manifest` sem warning; diff so nos 2 arquivos (G2)
- [ ] `bun run harness:validate` → sem erro (G3)
- [ ] `bun run typecheck` → exit 0
- [ ] `bun run test` → suite verde
- [ ] **Verificacoes rodadas SEPARADAS** (G3)
- [ ] MEMORY.md: contagem real do RED/GREEN; "Notas para Planos Seguintes" com: caminho da secao-fonte,
      nome exato do check `fase-{NN}-defesa-implementada`, formato `**Tipo de fase:**`, e que `prose()`
      NAO se aplica ao Step 9 (G12) — o Plano 02 acrescenta assertions no mesmo arquivo

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/fase-template-tdd-contract.test.ts` retorna `0 fail`
- `bun run agents:contract` retorna `0 fail`
- CA-03: `prose(section(executor, '## TDD no Ciclo Red-Green-Refactor'))` contem `skills/tdd-workflow/SKILL.md` e `Contrato do Ciclo por Fase`
- CA-08 (texto): `prose(section(executor, '### REFACTOR'))` contem `commit` e `refactor(`
- Os 5 RED-checks acima derrubam o teste nomeado e, restaurados, `git diff --stat` e vazio
- `bun run typecheck`, `bun run harness:validate`, `bun run generate:manifest` sem erro/warning

**Por humano:**
- Ler a secao TDD do executor como o subagente que vai recebe-la: fica claro que ele NAO faz o RED-check
  final e que precisa emitir `defesa-implementada`? Se a leitura deixa duvida, o texto muda — nao a assercao
- Comportamento real do executor (o subagente emitir o check) so e observavel apos `scripts/sync-to-global.sh`
  (G1) — e o dogfood do Plano 02 fase-04, nao criterio desta fase

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

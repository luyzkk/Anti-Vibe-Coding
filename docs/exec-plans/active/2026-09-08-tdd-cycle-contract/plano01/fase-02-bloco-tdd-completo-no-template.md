<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): gate de paridade do ciclo TDD por fase — PRD tdd-cycle-contract §RF-04`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Bloco TDD completo no template

**Plano:** 01 — Fonte e contrato
**Sizing:** 1h
**Depende de:** fase-01 (secao-fonte na skill; checkbox REFACTOR e teste de paridade existem)
**Visual:** false

---

## O que esta fase entrega

O bloco `### TDD` de `fase-template.md` passa a ser o consumidor completo do contrato: `**Tipo de fase:**`
com as tres opcoes, RED stub-first (e Abuse-It primeiro em fase de risco), GREEN isolado, RED-check com
`Defesa a mutar:` e `Teste que deve cair:` e a proibicao de prever a mensagem, REFACTOR em commit proprio,
variante para `sem-comportamento`, um exemplo preenchido e um comentario HTML apontando para a fonte. O
`plan-readme-template.md` §TDD Strategy deixa de ser copia do ciclo e vira ponteiro (RF-02, D5, D6, CA-01).

**Tipo de fase:** comportamento (o teste de paridade cresce; a defesa e o texto do template e do README-template).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fase-template-tdd-contract.test.ts` | Modify (PRIMEIRO) | Helper `prose()`; describe RF-02 cresce: `Tipo de fase`, 4 checkboxes (`test.each`), campos do RED-check, proibicao da mensagem, Abuse-It, variante sem-comportamento, ponteiro HTML; describe novo para `plan-readme-template.md` §TDD Strategy |
| `skills/plan-feature/templates/fase-template.md` | Modify | Bloco `### TDD` (entre `## Verificacao` e `### Seguranca`) reescrito inteiro; resto do arquivo intacto |
| `skills/plan-feature/templates/plan-readme-template.md` | Modify | Bloco `## TDD Strategy` (linhas 65-73): fence de 4 linhas vira 1-2 linhas de ponteiro; linha 75 (`**Tracer Bullet deste plano:**`) permanece |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — os dois templates sao rastreados (linhas 2432 e 2456) |

Anchors do template (apos a fase-01): `## Verificacao` → `### TDD` (RED, GREEN, REFACTOR) → `### Seguranca
(apenas fase de slice [RISCO])` → `### Checklist`. Citar por heading, nao por linha.

---

## Implementacao

### Passo 1: Assercoes novas no teste de paridade (RED)

Acrescentar ao arquivo da fase-01. O ponto central desta fase e o G5: o bloco novo contem um **exemplo
preenchido em fence** e um **ponteiro em comentario HTML** com os mesmos tokens das linhas de checkbox.
Assercao sobre o corpo cru passaria com o checkbox apagado. Por isso as assercoes de contrato rodam sobre
`prose(section(...))`, e so a do ponteiro roda sobre o corpo cru (DP-2).

```ts
// acrescentar apos `section()`:

/**
 * Prosa do corpo: sem fences e sem comentarios HTML. O exemplo preenchido (fence) e o ponteiro para a
 * fonte (comentario) repetem os tokens das linhas de checkbox — sem isto, apagar o checkbox e deixar o
 * exemplo faria a assercao passar (G5, compound 2026-05-12-validator-regex-hits-comments).
 */
// 2026-09-08 (Luiz/dev): assercao de contrato roda sobre prosa, nunca sobre exemplo — PRD tdd-cycle-contract §RF-04 (DP-2)
const prose = (body: string) => body.replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '')

const readme = read('skills/plan-feature/templates/plan-readme-template.md')
```

No `describe('fase-template — bloco "### TDD" (RF-02)')`, substituir o teste unico da fase-01 por:

```ts
describe('fase-template — bloco "### TDD" (RF-02)', () => {
  const tdd = () => prose(section(template, '### TDD'))

  test('o bloco declara o tipo da fase com as tres opcoes (D5)', () => {
    const body = tdd()
    expect(
      /^\*\*Tipo de fase:\*\*/m.test(body),
      `[parity gate "nunca diminuir" — RF-02] Campo "**Tipo de fase:**" ausente do bloco "### TDD" de ` +
        `fase-template.md. E o tipo que decide a variante do ciclo (Contrato do Ciclo por Fase): sem ele ` +
        `o orquestrador nao sabe onde parar para o humano nem que forma o RED-check toma.`,
    ).toBe(true)
    for (const tipo of ['comportamento', 'risco', 'sem-comportamento']) {
      expect(
        body.includes(tipo),
        `[parity gate "nunca diminuir" — RF-02 / D5] Tipo de fase "${tipo}" sumiu do bloco "### TDD". ` +
          `Os tres tipos sao o contrato: 189 de 443 fases nao tinham RED porque "doc/config" ficava fora ` +
          `do ciclo — "sem-comportamento" existe para que essas fases tenham gate textual falsificavel.`,
      ).toBe(true)
    }
  })

  test.each([
    ['**RED:**', 'teste que falha por assertion, stub-first'],
    ['**GREEN:**', 'codigo minimo, subagente isolado'],
    ['**RED-check:**', 'a defesa nomeada e mutada e o teste cai — unica prova de que o teste testa a defesa'],
    ['**REFACTOR:**', 'commit proprio com testes verdes, ou "sem refactor: motivo"'],
  ])('o bloco mantem o checkbox %s', (checkbox, why) => {
    expect(
      tdd().includes(checkbox),
      `[parity gate "nunca diminuir" — RF-02 / CA-01] Checkbox ${checkbox} ausente do bloco "### TDD" de ` +
        `fase-template.md — ${why}. Os quatro sao o ciclo inteiro; o template com dois (RED, GREEN) e ` +
        `exatamente o estado que o PRD tdd-cycle-contract mediu: REFACTOR em 46 de 443 fases, ` +
        `RED-check em 37. Restaure o checkbox, nao remova esta assercao.`,
    ).toBe(true)
  })

  test.each([
    ['Defesa a mutar:', 'qual linha/condicao o orquestrador remove ou inverte'],
    ['Teste que deve cair:', 'qual teste tem de falhar com a defesa removida'],
  ])('o RED-check carrega o campo "%s" (D6)', (campo, why) => {
    expect(
      tdd().includes(campo),
      `[parity gate "nunca diminuir" — RF-02 / D6] Campo "${campo}" ausente do RED-check em ` +
        `fase-template.md — ${why}. Sao os dois campos que o execute-plan (Step 4c, Plano 02) le para ` +
        `mutar; sem eles o RED-check vira "rodar os testes de novo".`,
    ).toBe(true)
  })

  test('o planejador e proibido de prever a mensagem de erro (D6)', () => {
    expect(
      /N[AÃ]O escrever a mensagem/i.test(tdd()),
      `[parity gate — RF-02 / D6] Sumiu do bloco "### TDD" a instrucao de NAO escrever a mensagem de erro ` +
        `esperada. Numero e mensagem previstos sao chute do planejador; em tres ocasioes o real divergiu ` +
        `e o incentivo era reportar o previsto (compound 2026-09-06). O que vale e qual assertion quebra.`,
    ).toBe(true)
  })

  test('fase de risco comeca pelo teste de abuso (Abuse-It)', () => {
    expect(
      /Abuse-It/.test(tdd()),
      `[parity gate — RF-02] O bloco "### TDD" deixou de dizer que, em fase de risco, o PRIMEIRO teste e o ` +
        `de abuso (Abuse-It, tdd-workflow). Sem isso o RED escreve so o happy path e a defesa nunca chega ao GREEN.`,
    ).toBe(true)
  })

  test('fase sem comportamento tem variante com gate textual (D5)', () => {
    expect(
      /gate textual/i.test(tdd()),
      `[parity gate — RF-02 / D5] A variante "sem-comportamento" (gate textual visto falhando; RED-check = ` +
        `remover o alvo, gate cai, restaurar) sumiu do bloco "### TDD". Isentar fases de doc/config do ciclo ` +
        `deixa 40% das fases sem verificacao falsificavel — foi a alternativa rejeitada em D5.`,
    ).toBe(true)
  })

  // Aqui o corpo CRU, de proposito: o ponteiro vive num comentario HTML.
  test('o bloco aponta para a secao-fonte na skill tdd-workflow (CA-03)', () => {
    const raw = section(template, '### TDD')
    expect(
      /<!--[\s\S]*?skills\/tdd-workflow\/SKILL\.md[\s\S]*?Contrato do Ciclo por Fase[\s\S]*?-->/.test(raw),
      `[parity gate — RF-02 / CA-03 / D1] O comentario HTML que aponta de fase-template.md para ` +
        `skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" sumiu. O template e consumidor, nao ` +
        `definicao; sem o ponteiro ele volta a ser a segunda copia do ciclo.`,
    ).toBe(true)
  })
})

describe('plan-readme-template — §TDD Strategy aponta para a fonte (D1)', () => {
  test('o bloco existe e cita a secao-fonte pelo caminho', () => {
    const body = section(readme, '## TDD Strategy')
    expect(
      body.includes('skills/tdd-workflow/SKILL.md') && body.includes('Contrato do Ciclo por Fase'),
      `[parity gate — D1] "## TDD Strategy" de plan-readme-template.md nao aponta para ` +
        `skills/tdd-workflow/SKILL.md "Contrato do Ciclo por Fase" (ou o bloco sumiu — section() devolve ''). ` +
        `Era a terceira copia do ciclo (PLAN.md §Risks); copia que fica e a divergencia que este PRD existe para acabar.`,
    ).toBe(true)
  })
})
```

Rodar `bun test tests/fase-template-tdd-contract.test.ts`. Esperado no RED: o teste da fase-01 sobre a
skill continua **pass**; o `**REFACTOR:**` do `test.each` continua **pass** (a linha da fase-01 existe);
todo o resto **fail por assertion**. Registrar a saida literal — quantos pass/fail o comando imprimir, nao
o que esta escrito aqui (G9). Commit: `test(plan-feature): RED — bloco TDD completo no template`.

### Passo 2: GREEN — bloco `### TDD` reescrito

Substituir em `fase-template.md` tudo entre o heading `### TDD` e a linha anterior a
`### Seguranca (apenas fase de slice [RISCO])` por:

```markdown
### TDD

<!-- Fonte unica do ciclo: skills/tdd-workflow/SKILL.md, secao "Contrato do Ciclo por Fase" (tipo da fase ×
     RED / GREEN / RED-check / REFACTOR / gate humano; mapa nivel → onde o orquestrador para).
     Este bloco e o CONSUMIDOR, nao a definicao. Se o ciclo mudar, muda la; o teste
     tests/fase-template-tdd-contract.test.ts acusa aqui. PRD tdd-cycle-contract RF-02. -->

**Tipo de fase:** {comportamento | risco | sem-comportamento}

- [ ] **RED:** teste escrito e FALHA por assertion — stub-first: o modulo existe e cada export lanca
      `throw new Error('not implemented')`; `Cannot find module` NAO e RED
      (`docs/references/tdd-cycle-checklist.md`)
  - Comando: `bun test {arquivo.test.ts} -t '{nome do teste}'`
  - Fase `risco`: o PRIMEIRO teste e o de abuso (Abuse-It) — falhar significa "o ataque passou"
  - Registrar a saida LITERAL do comando, nao a prevista

- [ ] **GREEN:** codigo minimo, teste PASSA — subagente isolado recebe APENAS os testes, nunca o PRD
  - Comando: `bun test {arquivo.test.ts} -t '{nome do teste}'`

- [ ] **RED-check:** com o GREEN commitado, o orquestrador muta a defesa, ve o teste cair, restaura
  - Defesa a mutar: {qual linha ou condicao remover ou inverter — arquivo e trecho}
  - Teste que deve cair: {nome exato do teste}
  - Restaurar com `git restore {arquivo}`; `git diff --stat` vazio antes de seguir
  - NAO escrever a mensagem de erro esperada: numero e mensagem previstos sao chute; o que vale e qual
    assertion quebra. Teste que nao cai = fase `blocked` + DI "teste nao prova a defesa"

- [ ] **REFACTOR:** com os testes verdes, commit `refactor({escopo}): ...` proprio — ou registrar
      `sem refactor: {motivo}` no MEMORY
  - Comando: `bun run test`
  - Resultado esperado: continua verde; `git log --oneline -3` mostra `refactor(...)` separado do `feat(...)`

**Variante `sem-comportamento`** (doc, config, template, texto de skill): RED = gate textual visto
falhando ANTES da mudanca (`grep -n '{alvo}' {arquivo}` ou checagem de estrutura); GREEN = aplicar;
RED-check = remover o alvo → gate cai → `git restore`; REFACTOR = n/a. O planejador nomeia o alvo do
grep em `Defesa a mutar`.

Exemplo preenchido (assim, nao com placeholders):

```
Tipo de fase: risco
RED:       bun test src/orders.test.ts -t 'rejects reading an order of another owner'
           → falhou: o GET devolveu 200 (o ataque passou)
GREEN:     1 pass
RED-check: Defesa a mutar: inverter `if (order.ownerId !== user.id)` em src/orders.ts
           Teste que deve cair: rejects reading an order of another owner
REFACTOR:  refactor(orders): extrai assertOwner — ou "sem refactor: handler de 6 linhas"
```
```

O que fica igual: `## Verificacao`, `### Seguranca (...)` com seu comentario OPCIONAL, `### Checklist`,
`## Criterio de Aceite`, o header de provenance e o Passo 1 (G11). A linha `- [ ] Lint limpo: \`bun run lint\``
do `### Checklist` **nao** e desta fase (G3/G13) — deixar.

### Passo 3: GREEN — `plan-readme-template.md` §TDD Strategy vira ponteiro

Substituir as linhas 65-73 (heading + fence de 4 linhas) por:

```markdown
## TDD Strategy

Ciclo por fase: `skills/tdd-workflow/SKILL.md`, secao **Contrato do Ciclo por Fase** (tipo da fase ×
RED / GREEN / RED-check / REFACTOR / gate humano). Este README nao redefine o ciclo; o bloco `### TDD`
de cada fase e o consumidor. Registrar aqui so o que e ESPECIFICO deste plano (comandos de teste do
repo, gate de hook, fixtures) — nunca uma copia da tabela.
```

A linha `**Tracer Bullet deste plano:** {...}` (75) permanece logo abaixo. Manter o titulo `## TDD Strategy`
(o teste corta por ele). A linha antiga `4. VERIFY: bun run test && bun run lint` some junto com o fence —
e a unica ocorrencia de `bun run lint` que esta fase remove, por substituir o bloco inteiro (G3).

### Passo 4: GREEN — rodar, manifest, commit

1. `bun test tests/fase-template-tdd-contract.test.ts` → `0 fail` (contagem literal no MEMORY).
2. `bun run generate:manifest`; `git diff --stat plugin-manifest.json` → so `fase-template.md` e
   `plan-readme-template.md` (G2).
3. `bun run harness:validate`; `bun test skills/lib/__tests__/universal-principles.test.ts` (G11).
4. Commit: `feat(plan-feature): GREEN — bloco TDD completo + README-template aponta para a fonte`.

---

## Gotchas

- **G5 do plano (o gotcha desta fase):** o template contem headings dentro de fences (Passo 1 e 2 do
  `## Implementacao`) e comentarios HTML (`### Seguranca`). Depois desta fase o proprio bloco `### TDD`
  tem um fence (exemplo) e um comentario (ponteiro) com os tokens das linhas de checkbox. Toda assercao
  de contrato roda sobre `prose(section(template, '### TDD'))`; SO a do ponteiro roda sobre o corpo cru.
  Sinal de erro: uma assercao que continua verde no RED-check com o checkbox apagado esta lendo o exemplo.
- **G11 do plano:** `universal-principles.test.ts:50-57` exige `Comment Provenance` (header) e
  `// YYYY-MM-DD (x):` (Passo 1). Nada disso esta no bloco `### TDD`; se o teste cair, a substituicao
  comeu linhas fora do bloco.
- **G9 do plano:** o exemplo preenchido diz "falhou: o GET devolveu 200" — e descricao do comportamento,
  nao a mensagem do runner. Nao "melhorar" o exemplo para `Expected 403, Received 200`: e exatamente o
  que D6 proibe.
- **Local — `**Tipo de fase:**` fora dos checkboxes:** e linha de campo (`^\*\*Tipo de fase:\*\*` com flag `m`),
  nao `- [ ]`. O Plano 02 fase-01 vai ler o valor para decidir o gate humano; manter o formato
  `**Tipo de fase:** {a | b | c}` literalmente.
- **Local — regex `/N[AÃ]O escrever a mensagem/i`:** tolera acento e caixa (o repo mistura). Se o executor
  reescrever a frase, a regex e a fonte da verdade — ajustar o texto, nao a regex.
- **Local — placeholders `{...}` dentro do bloco:** o template ja usa `{nome do teste}`; manter o estilo.
  O `-t '{nome do teste}'` e a flag real do `bun test` (nao `--grep`, que o template antigo citava e
  nao existe no bun).

---

## Verificacao

### TDD

**Tipo de fase:** comportamento

- [ ] **RED:** assercoes novas escritas; FALHAM por assertion sobre o template e o README-template atuais
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`
  - Saida literal registrada; commit `test(plan-feature): RED — bloco TDD completo no template`

- [ ] **GREEN:** bloco `### TDD` reescrito + `## TDD Strategy` como ponteiro; teste PASSA
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`
  - Resultado: `0 fail`; commit `feat(plan-feature): GREEN — ...`

- [ ] **RED-check do orquestrador (obrigatorio):** com o GREEN commitado, uma mutacao por defesa;
      restaurar com `git restore <arquivo>` e `git diff --stat` vazio entre cada uma
  - Defesa a mutar (1): apagar a linha `  - Defesa a mutar: {...}` do bloco `### TDD` (deixar o exemplo em fence intacto)
    - Teste que deve cair: `o RED-check carrega o campo "Defesa a mutar:" (D6)` — e SO ele; se continuar
      verde, a assercao esta lendo o exemplo (G5) e `prose()` nao esta sendo aplicado
  - Defesa a mutar (2): apagar a linha `- [ ] **RED-check:** ...` (so o checkbox; subitens ficam)
    - Teste que deve cair: `o bloco mantem o checkbox **RED-check:**`
  - Defesa a mutar (3): apagar a linha `**Tipo de fase:** {...}`
    - Teste que deve cair: `o bloco declara o tipo da fase com as tres opcoes (D5)`
  - Defesa a mutar (4): apagar o comentario HTML do topo do bloco `### TDD`
    - Teste que deve cair: `o bloco aponta para a secao-fonte na skill tdd-workflow (CA-03)`
  - Defesa a mutar (5): apagar `skills/tdd-workflow/SKILL.md` do paragrafo de `## TDD Strategy` do README-template
    - Teste que deve cair: `plan-readme-template — §TDD Strategy aponta para a fonte (D1) > o bloco existe e cita a secao-fonte pelo caminho`
  - NAO escrever a mensagem esperada (G9). Cada teste tem de cair pela SUA defesa; teste que nao cai = `blocked` + DI

- [ ] **REFACTOR:** candidato real: se `prose()` e `section()` ficaram com responsabilidades misturadas ou
      as mensagens repetem o mesmo preambulo, commit `refactor(tests): ...` proprio. Senao, registrar
      `sem refactor: {motivo}`

### Checklist

- [ ] `bun test tests/fase-template-tdd-contract.test.ts` → `0 fail` (contagem literal no MEMORY)
- [ ] `bun test skills/lib/__tests__/universal-principles.test.ts` → verde (G11)
- [ ] `grep -c '^\*\*Tipo de fase:\*\*' skills/plan-feature/templates/fase-template.md` → `1`
- [ ] `grep -n 'Defesa a mutar:' skills/plan-feature/templates/fase-template.md` → 2 ocorrencias (checkbox + exemplo) — confirma que o exemplo existe e que a assercao NAO pode contar com ele
- [ ] `grep -n '^## TDD Strategy' skills/plan-feature/templates/plan-readme-template.md` → 1 linha; `grep -n 'bun run lint' skills/plan-feature/templates/plan-readme-template.md` → vazio
- [ ] `grep -n '^### Seguranca\|^### Checklist\|OPCIONAL' skills/plan-feature/templates/fase-template.md` → os tres presentes (nada fora do bloco foi comido)
- [ ] `bun run generate:manifest` sem warning; diff so nos 2 templates (G2)
- [ ] `bun run harness:validate` → sem erro (G3)
- [ ] `bun run typecheck` → exit 0
- [ ] `bun run test` → suite verde
- [ ] **Verificacoes rodadas SEPARADAS** (G3)
- [ ] MEMORY.md: contagem real de pass/fail no RED e no GREEN; DI para qualquer ajuste de texto que a regex tenha forcado

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/fase-template-tdd-contract.test.ts` retorna `0 fail`
- CA-01: `prose(section(template, '### TDD'))` contem `**Tipo de fase:**`, `**RED:**`, `**GREEN:**`, `**RED-check:**`
  (com `Defesa a mutar:` e `Teste que deve cair:`) e `**REFACTOR:**` — e o `test.each` verde
- CA-02: cada um dos 5 RED-checks acima derruba o teste nomeado e, restaurado, volta a passar; `git diff --stat` vazio
- `bun run typecheck`, `bun run harness:validate`, `bun run generate:manifest` sem erro/warning

**Por humano:**
- Ler o bloco `### TDD` como um planejador que nunca viu o projeto: da para preencher `Defesa a mutar` sem
  perguntar o que significa? Se nao, o texto do campo precisa de um exemplo melhor — registrar no MEMORY,
  nao "resolver" alargando a regex

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): gate de paridade do ciclo TDD por fase — PRD tdd-cycle-contract §RF-04`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Tracer — fonte e gate

**Plano:** 01 — Fonte e contrato
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase; tracer bullet da feature)
**Visual:** false

---

## O que esta fase entrega

A cadeia fonte → consumidor → gate existe e esta provada por mutacao, na menor mudanca possivel: um teste
de paridade novo (2 assertions, RED por assertion), a secao `## Contrato do Ciclo por Fase` minima em
`skills/tdd-workflow/SKILL.md` (tabela dos tres tipos + mapa nivel → parada), o checkbox `**REFACTOR:**`
no bloco `### TDD` de `fase-template.md`, e o Passo 7 de `tdd-cycle-checklist.md` deixa de chamar o
REFACTOR de opcional (RF-01 parcial, RF-04 parcial, D1).

**Tipo de fase:** comportamento (o teste e um `bun:test` real que falha por assertion; a "defesa" e texto
de skill e template). O sub-alvo `tdd-cycle-checklist.md` e `sem comportamento` com gate textual (DP-5).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fase-template-tdd-contract.test.ts` | Create (PRIMEIRO) | Gate de paridade: helpers `read` + `section()`; 2 testes (secao na skill; `**REFACTOR:**` no template) |
| `skills/tdd-workflow/SKILL.md` | Modify (ADITIVO) | Nova secao `## Contrato do Ciclo por Fase` entre a linha 545 (`RED-GREEN-REFACTOR permanece.`) e a 547 (`## Common Rationalizations`) |
| `skills/plan-feature/templates/fase-template.md` | Modify (ADITIVO) | Linha `- [ ] **REFACTOR:** ...` apos o GREEN (linhas 98-100), antes de `### Seguranca` (102) |
| `docs/references/tdd-cycle-checklist.md` | Modify | Linha 22: `Passo 7 (opcional): REFACTOR ...` → `Passo 7: REFACTOR ...` com commit proprio ou registro "sem refactor" |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — muda so `skills/tdd-workflow/SKILL.md` e `fase-template.md`; o checklist e `docs/` (ignorado) e o teste e `tests/` (ignorado) |

Numeracao de linhas: `main` em 2026-09-08. Depois desta fase, `fase-template.md` cresce ~4 linhas a partir
da 101 e `tdd-workflow/SKILL.md` ~45 linhas a partir da 546 — as fases seguintes citam por heading.

---

## Implementacao

### Passo 1: Teste de paridade PRIMEIRO (RED) — `tests/fase-template-tdd-contract.test.ts`

Molde: `tests/write-prd-contract.test.ts` (header explicando o que NAO testa, `read` com strip de CRLF,
`section()` fence-aware, mensagens `[parity gate "nunca diminuir" — RF-xx] ...` que dizem POR QUE o item
existe e mandam restaurar em vez de apagar a assercao). O `section()` aqui e generalizado por nivel de
heading (DP-1) porque o alvo desta feature e `### TDD` dentro de `## Verificacao`.

```ts
// tests/fase-template-tdd-contract.test.ts
// 2026-09-08 (Luiz/dev): gate de paridade do ciclo TDD por fase — PRD tdd-cycle-contract §RF-04
//
// O ciclo TDD por fase tem UMA definicao (skills/tdd-workflow/SKILL.md, "## Contrato do Ciclo por Fase")
// e consumidores que apontam para ela: fase-template.md (bloco ### TDD), agents/plan-executor.md
// (secao TDD) e, no Plano 02, o Step 4c do execute-plan. Este arquivo garante que nem a fonte nem um
// consumidor diminua em silencio — "gate de paridade e teste, nao doc" (PRD §Outcomes).
//
// Assere apenas CONTRATO — headings, checkboxes, campos e ponteiros. A prosa dentro das secoes pode ser
// reescrita a vontade sem tocar aqui.
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa:
//   - que o orquestrador do execute-plan EXECUTA o RED-check por mutacao — comportamento de LLM;
//     e o dogfood do Plano 02 fase-04 que prova isso, lendo o STATE log
//   - que um planejador real preenche "Defesa a mutar" com algo util
//   - o conteudo de fases ja geradas em docs/exec-plans/ (PRD §Out of Scope: nao se retroalimenta)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')

/** CRLF quebra regex ancorada em `$` — repo Windows, mesmo cuidado do write-prd-contract (G4). */
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

const skill = read('skills/tdd-workflow/SKILL.md')
const template = read('skills/plan-feature/templates/fase-template.md')

/**
 * Corpo de uma secao a partir do heading `startsWith` ate o proximo heading de nivel igual ou
 * superior (exclusivo). Generaliza o `section()` de write-prd-contract.test.ts: o nivel vem da
 * contagem de `#` do proprio heading pedido, entao o mesmo helper serve para `## Verificacao` e
 * para `### TDD`. Rastreia fences porque templates embutem headings DENTRO de blocos cercados (G5).
 * Devolve '' quando o heading nao existe — um `includes` sobre '' reprova em vez de passar vacuamente.
 */
function section(doc: string, startsWith: string): string {
  // 2026-09-08 (Luiz/dev): nivel derivado do heading pedido — PRD tdd-cycle-contract §RF-04 (DP-1 do Plano 01)
  const level = startsWith.match(/^#+/)?.[0].length ?? 2
  const stop = new RegExp(`^#{1,${level}} `)
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith(startsWith))
  if (start === -1) return ''

  const out: string[] = []
  let inFence = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence
    if (!inFence && stop.test(line)) break
    out.push(line)
  }
  return out.join('\n')
}

describe('tdd-workflow — a fonte unica do ciclo (RF-01)', () => {
  // Ancorado em inicio de linha: `includes('## Contrato do Ciclo por Fase')` casaria com uma mencao em
  // prosa ou num comentario e passaria vacuamente (licao do grill-me-contract, G5).
  test('a skill tem a secao "## Contrato do Ciclo por Fase"', () => {
    expect(
      /^## Contrato do Ciclo por Fase/m.test(skill),
      `[parity gate "nunca diminuir" — RF-01] Secao "## Contrato do Ciclo por Fase" ausente de ` +
        `skills/tdd-workflow/SKILL.md. E a UNICA definicao do ciclo por fase: fase-template.md, ` +
        `plan-executor.md e o Step 4c do execute-plan apontam para ela em vez de parafrasea-la. ` +
        `Sem ela cada consumidor volta a ter a sua versao do ciclo — a divergencia que o PRD ` +
        `tdd-cycle-contract existe para acabar. Restaure a secao, nao remova esta assercao.`,
    ).toBe(true)
  })
})

describe('fase-template — bloco "### TDD" (RF-02)', () => {
  const tdd = () => section(template, '### TDD')

  test('o bloco mantem o checkbox REFACTOR', () => {
    expect(
      tdd().includes('**REFACTOR:**'),
      `[parity gate "nunca diminuir" — RF-02] Checkbox REFACTOR ausente do bloco "### TDD" de ` +
        `skills/plan-feature/templates/fase-template.md (ou o proprio heading "### TDD" sumiu — ` +
        `section() devolve '' nesse caso). Sem ele o REFACTOR volta a aparecer numa fase a cada cinco, ` +
        `por iniciativa do planejador (PRD §Problema: 46 de 443 fases). "Refactor Fica no Ciclo" e a ` +
        `posicao registrada na skill tdd-workflow; o template e onde ela vira contrato de toda fase.`,
    ).toBe(true)
  })
})
```

Rodar `bun test tests/fase-template-tdd-contract.test.ts`. Esperado: **2 fail, ambos por assertion** — os
dois arquivos existem e sao lidos; o que reprova e o `expect(...).toBe(true)`. Se aparecer
`Cannot find module` ou erro de leitura, o RED nao e valido (compound `2026-05-19-tdd-gate-needs-stub-first`).
Registrar a saida **literal** no MEMORY (G9). Commit:
`test(tdd-workflow): RED — gate de paridade do ciclo por fase`.

### Passo 2: GREEN minimo — secao-fonte na skill

Inserir em `skills/tdd-workflow/SKILL.md` **logo apos** a linha 545 (`RED-GREEN-REFACTOR permanece.`) e
**antes** da 547 (`## Common Rationalizations`). Nada acima da 530 nem abaixo da 547 muda; `$ARGUMENTS`
continua a ultima linha (G6). Sem comentario de linhagem no markdown (DP-6).

```markdown
## Contrato do Ciclo por Fase

Esta secao e a **unica definicao** do ciclo TDD por fase no plugin. Quem consome nao redefine, aponta:
o bloco `### TDD` de `skills/plan-feature/templates/fase-template.md`, a secao "TDD no Ciclo
Red-Green-Refactor" de `agents/plan-executor.md` e o Step 4c de `skills/execute-plan/SKILL.md`.
O teste `tests/fase-template-tdd-contract.test.ts` derruba a suite se esta secao ou um ponteiro sumir.

O **tipo da fase** decide a variante. O planejador escreve o tipo no bloco `### TDD` de cada fase:

| Tipo | RED | GREEN | RED-check | REFACTOR | Gate humano |
|---|---|---|---|---|---|
| comportamento | stub-first, falha por assertion | isolado, sem PRD | muta a defesa nomeada, teste cai, restaura | commit proprio ou "sem mudanca: motivo" | conforme nivel |
| risco `[RISCO]` | Abuse-It primeiro, depois o resto | idem | idem, obrigatoriamente sobre a defesa do abuso | idem | sempre em Assistido e Guiado |
| sem comportamento | gate textual (grep/estrutura) visto falhando | aplicar | remover o alvo, gate cai, restaurar | n/a | conforme nivel |

Regras que valem para os tres tipos:

- **RED e por assertion.** `Cannot find module` nao e RED — falta o stub
  (`docs/references/tdd-cycle-checklist.md`). A saida registrada e a LITERAL do comando, nunca a prevista.
- **RED-check e de quem verifica, nao de quem implementa.** O orquestrador aplica `Defesa a mutar`, roda
  `Teste que deve cair`, exige a falha, restaura com `git restore <arquivo>` e prova `git diff --stat`
  vazio. Teste que nao cai bloqueia a fase: ele nao testa a defesa que diz testar.
- **Teste que nasce verde exige mutacao no mesmo passo.** Se o codigo ja existia quando o teste foi
  escrito, o autor prova ali mesmo: muta, captura a falha, restaura.
- **O planejador nomeia a defesa, nunca a mensagem.** `Defesa a mutar` (linha ou condicao a remover ou
  inverter) e `Teste que deve cair` (nome do teste). Numero e mensagem previstos sao chute
  (`docs/compound/2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md`).
- **REFACTOR fica no ciclo** (secao anterior): e o segundo passo do mesmo GREEN, em commit
  `refactor(...)` proprio — ou o relatorio diz "sem refactor: {motivo}".

Onde o orquestrador **para para o humano aprovar o teste RED** antes do GREEN. O nivel vem de
`## IA-TDD — Deteccao Automatica de Nivel` (ou do argumento `--tdd-level` do `/execute-plan`):

| Nivel | Para antes do GREEN em |
|---|---|
| Guiado | toda fase |
| Assistido (default) | fase `[RISCO]` e fase 01 do plano 01 (tracer bullet) |
| Direto | nunca; so RED-check automatico |

E o gate do passo 4 dos 7 Passos ("Somente apos aprovacao dos testes pelo desenvolvedor"), aplicado
por fase. E onde a spec errada morre barato: o RED transcreve a spec, o GREEN a implementa, e so um
humano lendo o teste percebe que ela pedia a coisa errada.
```

As duas tabelas sao copia do PRD §Mecanismo item 1 (celulas identicas). A mencao a `--tdd-level` e ao
Step 4c e declaracao de contrato — os dois so chegam no Plano 02 (DP-4). Se o dev preferir nao citar o
que ainda nao existe, cortar a clausula "(ou do argumento ...)" e registrar DI; o teste desta fase nao
depende dela.

### Passo 3: GREEN minimo — checkbox REFACTOR no template

Em `skills/plan-feature/templates/fase-template.md`, apos o bloco GREEN (linhas 98-100) e antes de
`### Seguranca (apenas fase de slice [RISCO])` (102), acrescentar:

```markdown
- [ ] **REFACTOR:** com os testes verdes, commit `refactor({escopo}): ...` proprio — ou registrar
      `sem refactor: {motivo}` no MEMORY
  - Comando: `bun run test`
  - Resultado esperado: continua verde; `git log --oneline -3` mostra `refactor(...)` separado do `feat(...)`
```

Texto minimo: a fase-02 reescreve o bloco inteiro (Tipo de fase, RED-check, variantes, exemplo). Nao
antecipar nada disso aqui — o RED-check desta fase e sobre ESTA linha. O header de provenance (linhas 1-8)
e o snippet do Passo 1 (linha 40) ficam intactos: `universal-principles.test.ts:50-57` os exige (G11).

### Passo 4: Passo 7 do checklist deixa de ser opcional (gate textual — DP-5)

Antes de editar, ver o gate **falhando**: `grep -n "Passo 7 (opcional)" docs/references/tdd-cycle-checklist.md`
→ imprime a linha 22. Entao substituir a linha 22 por:

```markdown
- [ ] Passo 7: REFACTOR com testes verdes; commit `refactor(...): ...` proprio — ou registrar
      "sem refactor: {motivo}". Refactor fica no ciclo (`skills/tdd-workflow/SKILL.md`,
      "Refactor Fica no Ciclo" e "Contrato do Ciclo por Fase"); nao e opcional
```

Depois: o mesmo grep retorna vazio (exit 1). O arquivo NAO e rastreado pelo manifest (G2) e nenhum teste
o le; e por isso que o gate e textual e o RED-check dele e "restaurar a palavra → grep volta a achar →
desfazer" (ver Verificacao).

### Passo 5: GREEN — rodar, manifest, commit

1. `bun test tests/fase-template-tdd-contract.test.ts` → `2 pass, 0 fail`.
2. `bun run generate:manifest` → `git diff --stat plugin-manifest.json`: so as entradas de
   `skills/tdd-workflow/SKILL.md` e `skills/plan-feature/templates/fase-template.md` mudam (G2).
3. `bun run harness:validate` — saida lida ate o fim (G3).
4. Commit: `feat(tdd-workflow): GREEN — secao Contrato do Ciclo por Fase + REFACTOR no template`
   (inclui o checklist e o manifest; se o dev quiser atomicidade, o checklist pode ir num terceiro
   commit `docs(references): passo 7 REFACTOR deixa de ser opcional` — registrar a escolha no MEMORY).

Commitar **antes** do RED-check: `git restore` devolve o HEAD (G8).

---

## Gotchas

- **G6 do plano:** a secao entra entre `RED-GREEN-REFACTOR permanece.` (545) e `## Common Rationalizations`
  (547). Conferir depois: `tail -n 3 skills/tdd-workflow/SKILL.md` termina em `$ARGUMENTS`; e
  `bun test skills/tdd-workflow/__tests__/stack-aware-preface-wire.test.ts` continua verde (o bloco
  `stack-aware-preface` das linhas 10-22 nao foi tocado).
- **G11 do plano:** `skills/lib/__tests__/universal-principles.test.ts` exige `Comment Provenance` e
  `// YYYY-MM-DD (x):` no template. A linha nova entra no bloco `### TDD`; nada do header ou do Passo 1 muda.
- **G5 do plano:** a assercao (a) e regex `^## ...` com flag `m`, nao `includes` — uma mencao em prosa ao
  nome da secao (a propria mensagem do teste tem uma) nao pode satisfaze-la. A assercao (b) roda sobre
  `section(template, '### TDD')`, que devolve `''` se o heading sumir — reprova em vez de passar.
- **G9 do plano:** o RED desta fase e previsivel (2 fail por assertion), mas a saida registrada e a
  literal. Se `bun test` imprimir algo alem de 2 `(fail)` — por exemplo um `SyntaxError` no helper —
  isso e bug do teste, nao "RED alternativo".
- **Local — `section()` para em H1 tambem:** `^#{1,2} ` casa `# ` e `## `. O molde so cortava em `## `.
  Irrelevante para os arquivos desta fase (nenhum H1 depois de `### TDD`), mas e diferenca deliberada.
- **Local — `docs/` fora do manifest:** se `git diff --stat plugin-manifest.json` mostrar
  `tdd-cycle-checklist.md`, algo mudou em `generate-manifest.js` — parar e sinalizar.

---

## Verificacao

### TDD

**Tipo de fase:** comportamento (+ sub-alvo sem-comportamento no Passo 4)

- [ ] **RED:** `tests/fase-template-tdd-contract.test.ts` escrito e FALHA por assertion (arquivos lidos;
      `expect` reprova) — nao por module-not-found
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`
  - Saida literal registrada no MEMORY; commit `test(tdd-workflow): RED — gate de paridade do ciclo por fase`

- [ ] **GREEN:** secao na skill + linha REFACTOR no template, teste PASSA
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`
  - Resultado: `2 pass, 0 fail`; commit `feat(tdd-workflow): GREEN — ...`

- [ ] **RED-check do orquestrador (obrigatorio):** com o GREEN commitado, cada assercao cai pela SUA defesa
  - Defesa a mutar (1): apagar a linha `- [ ] **REFACTOR:** ...` de `fase-template.md`
    - Teste que deve cair: `fase-template — bloco "### TDD" (RF-02) > o bloco mantem o checkbox REFACTOR`
    - Restaurar: `git restore skills/plan-feature/templates/fase-template.md` → `git diff --stat` vazio
  - Defesa a mutar (2): apagar a linha `## Contrato do Ciclo por Fase` de `skills/tdd-workflow/SKILL.md`
    (so o heading; o corpo pode ficar — a assercao e sobre o heading ancorado)
    - Teste que deve cair: `tdd-workflow — a fonte unica do ciclo (RF-01) > a skill tem a secao "## Contrato do Ciclo por Fase"`
    - Restaurar: `git restore skills/tdd-workflow/SKILL.md` → `git diff --stat` vazio
  - Defesa a mutar (3, gate textual): reescrever `(opcional)` na linha do Passo 7 do checklist
    - Gate que deve cair: `grep -n "Passo 7 (opcional)" docs/references/tdd-cycle-checklist.md` volta a imprimir a linha
    - Restaurar: `git restore docs/references/tdd-cycle-checklist.md` → `git diff --stat` vazio
  - NAO escrever a mensagem esperada de nenhuma das tres: o que vale e QUAL assercao/gate quebra (G9).
    Se alguma continuar verde com a defesa apagada, a fase fica `blocked` e vira DI "teste nao prova a defesa"

- [ ] **REFACTOR:** candidato: nenhum — o teste tem 2 assertions e os helpers sao o molde. Registrar
      `sem refactor: teste de 2 assertions, helpers copiados do molde` no MEMORY (ou commit `refactor(tests): ...`
      se o executor extrair algo)

### Checklist

- [ ] `bun test tests/fase-template-tdd-contract.test.ts` → `2 pass, 0 fail`
- [ ] `bun test skills/lib/__tests__/universal-principles.test.ts` → verde (G11)
- [ ] `bun test skills/tdd-workflow/__tests__/stack-aware-preface-wire.test.ts` → verde (G6)
- [ ] `tail -n 3 skills/tdd-workflow/SKILL.md` → ultima linha e `$ARGUMENTS` (G6)
- [ ] `grep -c "^## Contrato do Ciclo por Fase" skills/tdd-workflow/SKILL.md` → `1`
- [ ] `grep -n "Passo 7 (opcional)" docs/references/tdd-cycle-checklist.md` → vazio (Passo 4)
- [ ] `bun run generate:manifest` sem warning; `git diff --stat plugin-manifest.json` so com os 2 arquivos rastreados (G2)
- [ ] `bun run harness:validate` → sem erro, saida lida ate o fim (G3)
- [ ] `bun run typecheck` → exit 0 (ou zero erros NOVOS em relacao a baseline da branch — registrar no MEMORY)
- [ ] `bun run test` → suite verde (roda em lotes)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G3)
- [ ] `git log --oneline -3` mostra `test(...): RED` antes de `feat(...): GREEN`; branch `feat/tdd-cycle-contract`, nunca `main` (G8)
- [ ] MEMORY.md: saida literal do RED; DI se a clausula `--tdd-level` foi cortada (DP-4); DI se o checklist foi para commit proprio

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/fase-template-tdd-contract.test.ts` retorna `2 pass, 0 fail`
- `bun run typecheck` retorna exit 0
- `bun run harness:validate` retorna sem erro
- `tail -n 1 skills/tdd-workflow/SKILL.md` imprime `$ARGUMENTS`
- RED-check (1), (2) e (3) executados e registrados no STATE log como `red_check: pass` com defesa e teste nomeados; `git diff --stat` vazio ao final

**Por humano:**
- Nada nesta sessao muda no runtime do plugin ate `scripts/sync-to-global.sh` (G1) — nao e criterio desta fase

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

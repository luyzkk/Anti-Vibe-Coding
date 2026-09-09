<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): default Assistido — PRD tdd-cycle-contract D2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: `plan-verifier` por fase, `red-check-evidence` e o STATE log

**Plano:** 02 — O ciclo roda no execute-plan
**Sizing:** 1h
**Depende de:** fase-02
**Visual:** false

---

## O que esta fase entrega

O 4c ganha o passo VERIFY: spawn do `plan-verifier` read-only por fase, com o que recebe e nao recebe, que
devolve `checks[]` incluindo `red-check-evidence` (lendo o STATE log, nunca mutando); o `plan-verifier.md`
ganha o item no checklist e nos exemplos; a linha do STATE log por fase e fixada com os 4 campos +
`tdd_level` + custo; o Step 5 mostra os 4 campos e o custo ao dev (RF-05, Observabilidade, CA-10).

**DP aplicadas:** DP-1 (passo 6), DP-10, DP-11, DP-12, DP-13.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fase-template-tdd-contract.test.ts` | Modify | Novo `describe` com 4 assercoes: verifier (checklist + exemplo + read-only), 4c VERIFY, Step 5 |
| `skills/execute-plan/SKILL.md` | Modify | `### 4c`: passo 6 VERIFY + formato da linha do STATE log; `## Step 5` (548-568): item 2 condicional, diagnostico com ciclo e custo, item 4 de bloqueio |
| `agents/plan-verifier.md` | Modify | Item 8 `red-check-evidence` no `## Checklist de Verificacao` (apos linha 29); uma linha em cada exemplo JSON (38-46 e 144-149); §Composition linha 114 → "Step 4c VERIFY". Frontmatter (1-7) e Regra 4 (73) intocados |
| `plugin-manifest.json` | Modify | `bun run generate:manifest` — linhas 500 e 1118 (G18) |

---

## Implementacao

### Passo 1: RED — assercoes novas no teste de paridade

```typescript
// 2026-09-08 (Luiz/dev): plan-verifier por fase + STATE log — PRD tdd-cycle-contract §RF-05, Observabilidade, CA-10.
const planVerifier = read('agents/plan-verifier.md')

describe('execute-plan — VERIFY por fase e STATE log (RF-05, observabilidade)', () => {
  const step4c = section(executePlan, '### 4c.')

  test('plan-verifier confere red-check-evidence no checklist e no exemplo de output (CA-10)', () => {
    const checklist = section(planVerifier, '## Checklist de Verificacao')
    expect(
      checklist,
      `[parity gate — RF-05] plan-verifier nao tem o check red-check-evidence. Sem ele o verifier ` +
        `confere tudo menos a unica prova de que o teste testa a defesa.`,
    ).toContain('red-check-evidence')
    expect(checklist, '[parity gate — RF-05] red-check-evidence sem o estado unable_to_verify — campo ausente viraria pass ou fail por chute').toContain('unable_to_verify')
    expect(section(planVerifier, '## Formato de Saida'), '[parity gate — CA-10] exemplo de envelope sem red-check-evidence').toContain('red-check-evidence')
  })

  test('plan-verifier continua read-only (D3)', () => {
    expect(section(planVerifier, '## Regras'), '[parity gate — D3] Regra Read-only sumiu do plan-verifier').toMatch(/Read-only/)
  })

  test('4c spawna o plan-verifier por fase dizendo o que recebe e nao recebe (RF-05)', () => {
    expect(step4c, '[parity gate — RF-05] 4c nao spawna plan-verifier').toContain('plan-verifier')
    expect(step4c, '[parity gate — RF-05] 4c nao pede red-check-evidence ao verifier').toContain('red-check-evidence')
    expect(step4c, '[parity gate — RF-05] VERIFY sem lista "NAO RECEBE" — o verifier veria o PRD').toMatch(/NAO RECEBE/)
  })

  test('Step 5 mostra os quatro campos do ciclo e o custo da fase (Observabilidade)', () => {
    const step5 = section(executePlan, '## Step 5')
    for (const field of ['red_confirmed', 'human_gate', 'red_check', 'refactor']) {
      expect(step5, `[parity gate — Observabilidade] Step 5 nao mostra ${field} ao dev`).toContain(field)
    }
    expect(step5, '[parity gate — Performance] Step 5 nao mostra o custo da fase (rodadas de teste, spawns)').toMatch(/[Cc]usto/)
  })
})
```

Rodar `bun test tests/fase-template-tdd-contract.test.ts -t 'VERIFY por fase'` → 4 falhas por `expect`.
Atencao: `plan-verifier continua read-only (D3)` pode nascer VERDE (a Regra 4 ja existe hoje, linha 73).
Teste que nasce verde exige mutacao no mesmo passo (compound 2026-09-06): apagar "Read-only" da linha 73 →
teste cai → `git restore agents/plan-verifier.md` → diff vazio. Registrar no MEMORY.

### Passo 2: GREEN (a) — 4c passo 6 e a linha do STATE log

Acrescentar apos o passo 5, dentro do bloco cercado, antes de "Se a fase NAO tem bloco ### TDD":

```
6. VERIFY (spawn plan-verifier — read-only; PRD D3):
   RECEBE:
   - O arquivo da fase (`{PASTA_ATIVA}/plano{NN}/fase-MM-nome.md`)
   - A linha do STATE log desta fase (tdd_level, red_confirmed, human_gate, red_check, refactor)
   - Lista de arquivos tocados: saida de `git diff --stat {HEAD-antes}..HEAD`
   - Comando de teste da fase
   NAO RECEBE:
   - PRD, outras fases, MEMORY completa
   DEVOLVE (kind: verification): checks[] com acceptance_met, tests_pass, tdd-red-commit-found e
     red-check-evidence (pass: a linha do STATE tem `red_check: pass` com defesa e teste nomeados;
     fail: `red_check: fail` — verdict block; unable_to_verify: campo ausente na linha)
   - O 4d ja consome kind === "verification" — sem mudanca no parser
   - Completar a linha do STATE log: `custo: testes={rodadas} spawns={RED+GREEN+verifier}`

Linha do STATE log (uma por fase, no ## Log do STATE.md; nasce parcial no passo 2 e e completada
nos passos 4, 5 e 6):
- {YYYY-MM-DD}: plano{NN}/fase-{MM} — tdd_level: {nivel} | red_confirmed: {assertion|blocked|gate-textual}
  | human_gate: {stopped|skipped(nivel)} | red_check: {pass|fail} (defesa: {X}, teste: {Y})
  | refactor: {commit <hash>|none (motivo)} | custo: testes={n} spawns={n}
```

### Passo 3: GREEN (b) — Step 5

Substituir o bloco cercado do `## Step 5 — Validacao Pos-Fase` (550-567):

```
Apos cada fase concluir:

1. Executar: bun run test
   - Se testes passam: registrar no Log do STATE
   - Se testes falham: diagnosticar e registrar na MEMORY

2. Executar o lint do projeto, se configurado em package.json §scripts (ex.: `bun run lint`);
   se nao existe, registrar `Lint: n/a (projeto sem lint configurado)` — nunca inventar o comando

3. Mostrar diagnostico ao dev:
   "Fase {NN} concluida:
   - Testes: {pass|fail}
   - Lint: {pass|warn|n/a}
   - Ciclo TDD: tdd_level={..} red_confirmed={..} human_gate={..} red_check={..} refactor={..}
   - Custo da fase: {n} rodadas de teste, {n} spawns (RED, GREEN, plan-verifier)
   - Decisoes tomadas: {N}
   - Bugs encontrados: {N}"

4. Se red_check: fail → destacar: "FASE BLOQUEADA — teste nao prova a defesa ({X} / {Y}).
   Fases dependentes nao iniciam ate um novo RED." (PRD CA-07)
```

### Passo 4: GREEN (c) — `agents/plan-verifier.md`

Item 8 apos o 7 (linha 29):

```markdown
8. **red-check-evidence:** A linha do STATE log da fase tem `red_check: pass (defesa: X, teste: Y)` com defesa e teste nomeados? `pass` se sim; `fail` se `red_check: fail`; `unable_to_verify` se a linha nao tem o campo (fase anterior ao contrato, ou o orquestrador pulou o RED-CHECK). Nunca reproduza a mutacao — a evidencia e o log que o orquestrador escreveu e o `git diff --stat` vazio que ele registrou (Regra 4).
```

Linha nova no `checks` do `## Output (JSON estruturado)` (apos a linha 45, antes de `]`):

```json
    { "name": "red-check-evidence", "status": "pass | warn | fail | unable_to_verify", "detail": "linha do STATE log: red_check: pass (defesa: X, teste: Y) / campo ausente" }
```

Linha nova no `payload.checks` do `## Formato de Saida (Contrato v2.0.0)` (apos a linha 146, `tdd-red-commit-found`):

```json
      { "name": "red-check-evidence", "status": "pass", "detail": "STATE log fase-03: red_check: pass (defesa: comparacao user.id !== doc.ownerId removida, teste: 'denies read when user is not the owner'); git diff --stat vazio apos restore" },
```

§Composition, linha 114 (so o texto entre parenteses):

```markdown
- `/anti-vibe-coding:execute-plan` (Step 4c passo VERIFY — spawn por fase, apos o RED-check do orquestrador).
```

Conferir a virgula do JSON: a linha nova no primeiro exemplo entra apos `no_unexpected_files` — acrescentar
virgula na linha 45 e nenhuma na nova.

### Passo 5: Manifest e commit

`bun run generate:manifest`; `git diff --stat plugin-manifest.json` → entradas 500 e 1118.
Commit: `feat(execute-plan): VERIFY por fase com red-check-evidence e STATE log com os 4 campos (Plano 02 fase-03)`.
Commitar ANTES do RED-check (plano01 G8).

### Passo 6: REFACTOR

O `for (const field of [...])` no teste do Step 5 ja e a forma compacta. Se as tres fases acumularam tres
`section(executePlan, '### 4c.')`, subir para uma `const step4c` de modulo (uma leitura, tres describes).
Commit `refactor(tests): ...` separado, ou `refactor: none (motivo)`.

---

## Gotchas

- **G20 — o que le o `plan-verifier.md`:** `subagent-contract.test.ts:217-224` valida o FIXTURE, nao a
  prosa; `harness-validate.ts:274` checa frontmatter + H1. Adicionar linhas nos exemplos JSON e seguro;
  `bun run agents:contract` e `bun run harness:validate` provam. Frontmatter (1-7) intocado.
- **G19 — `lint_pass` do verifier fica:** o item 4 (linha 26) devolve `unable_to_verify` neste repo. Nao
  "corrigir" — e honesto e esta fora do escopo. So o Step 5 muda (DP-13).
- **plano01 G7:** `agents/*.md` editado → `bun run agents:contract` obrigatorio no checklist.
- **DP-10 / CA-10 — por que o parser nao muda:** `skills/lib/subagent-contract.ts:125-129` tipa
  `checks: Array<{ name: string; status: CheckStatus; detail?: string }>`; `name` e string livre. O 4d
  (`SKILL.md:458`) ja trata `kind === "verification"` via `parseAndDispatch()` (`subagent-contract.ts:470`,
  handler 485-486). Nenhuma linha de TS nesta fase.
- **Local — `section(planVerifier, '## Regras')`:** casa `## Regras` (linha 68) por `startsWith`; nao ha
  `## Regras Criticas` no verifier. Termina em `## Output Contract`.
- **Local — `section(planVerifier, '## Formato de Saida')`:** o heading real e
  `## Formato de Saida (Contrato v2.0.0)`; `startsWith` casa. Vai ate o fim do arquivo, com o fence JSON dentro.
- **Local — teste que nasce verde:** `plan-verifier continua read-only (D3)` — mutacao no mesmo passo (Passo 1).
- **Local — custo:** o orquestrador conta rodadas de teste (passo 2 + passo 5 + as do verifier) e spawns
  (RED, GREEN, verifier, mais re-spawns do RED). E contagem, nao estimativa. A fase-04 le esse numero.

---

## Verificacao

### TDD

**Tipo de fase:** comportamento

- [ ] **RED:** 3 dos 4 testes do Passo 1 FALHAM por assertion; o 4o (`read-only`) nasce verde e foi mutado no mesmo passo (linha 73 sem "Read-only" → cai → restaurado)
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts -t 'VERIFY por fase'`
  - Registrar a saida literal no MEMORY

- [ ] **GREEN:** Passos 2–4 aplicados; os 4 PASSAM; tudo do Plano 01 e das fases 01–02 continua verde
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`

- [ ] **RED-check do orquestrador:** com o GREEN commitado, uma mutacao por vez, restaurando com
      `git restore agents/plan-verifier.md` ou `git restore skills/execute-plan/SKILL.md` e `git diff --stat` vazio:
  - Defesa a mutar: apagar o item 8 inteiro do `## Checklist de Verificacao` do verifier
    → Teste que deve cair: `plan-verifier confere red-check-evidence no checklist e no exemplo de output (CA-10)`
  - Defesa a mutar: trocar `unable_to_verify` por `warn` so no item 8
    → Teste que deve cair: `plan-verifier confere red-check-evidence no checklist e no exemplo de output (CA-10)` (segunda assercao)
  - Defesa a mutar: apagar `red-check-evidence` da linha DEVOLVE do passo 6 do 4c
    → Teste que deve cair: `4c spawna o plan-verifier por fase dizendo o que recebe e nao recebe (RF-05)`
  - Defesa a mutar: apagar a linha `- Custo da fase: ...` do Step 5
    → Teste que deve cair: `Step 5 mostra os quatro campos do ciclo e o custo da fase (Observabilidade)`

- [ ] **REFACTOR:** commit `refactor(...)` proprio, ou `refactor: none (motivo)` no MEMORY

### Checklist

- [ ] `git diff agents/plan-verifier.md` e so adicao (item 8, duas linhas JSON, linha 114); linhas 1-7 e 73 identicas
- [ ] `grep -c "red-check-evidence" agents/plan-verifier.md` → 3 (item 8 + dois exemplos)
- [ ] `grep -n "Read-only" agents/plan-verifier.md` → linha 73 presente
- [ ] `git diff skills/execute-plan/SKILL.md` toca SO o passo 6 do 4c (+ formato da linha) e o `## Step 5`; passos 0–5 identicos
- [ ] `grep -n "bun run lint" skills/execute-plan/SKILL.md` → so dentro do Step 5 como exemplo condicional (`ex.:`)
- [ ] `bun run agents:contract` verde (plano01 G7)
- [ ] `bun test tests/e2e/stack-aware-preface-all-skills.test.ts` verde (G17)
- [ ] `bun run generate:manifest` sem warning; `git diff --stat plugin-manifest.json` → 2 entradas (G18)
- [ ] `bun run harness:validate` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (plano01 G3)
- [ ] MEMORY.md: saida literal do RED, mutacao do teste nascido verde, DIs, `refactor:`; "Notas para Planos Seguintes" com o formato final da linha do STATE log e o nome `red-check-evidence`; Metricas

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/fase-template-tdd-contract.test.ts` → todos passam, incluindo os 4 novos
- Cada uma das 4 mutacoes do RED-check derruba exatamente o teste nomeado; `git diff --stat` vazio apos cada `git restore`
- `bun run agents:contract`, `bun run harness:validate`, `bun run test`, `bun run typecheck`, preface e2e → verdes

**Por humano (se aplicavel):**
- Ler o 4c completo (passos 0–6) de uma vez: cada campo da linha do STATE log tem um passo que o escreve (`tdd_level` 0, `red_confirmed` 2, `human_gate` 3, `refactor` 4, `red_check` 5, `custo` 6)

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

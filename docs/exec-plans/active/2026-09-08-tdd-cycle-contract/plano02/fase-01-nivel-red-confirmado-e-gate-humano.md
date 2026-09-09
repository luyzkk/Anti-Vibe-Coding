<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): default Assistido — PRD tdd-cycle-contract D2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Nivel, RED confirmado pelo orquestrador e gate humano

**Plano:** 02 — O ciclo roda no execute-plan
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-03 (secao-fonte, campos do template e teste de paridade com `section()`/`prose()`)
**Visual:** false

---

## O que esta fase entrega

O Step 4c do `/execute-plan` resolve o nivel (`--tdd-level` | `user_profile` | Assistido), roda o teste
da fase depois do subagente RED e so segue se a falha e por assertion (module-not-found bloqueia apontando
stub-first), e para no gate humano via `AskUserQuestion` exatamente onde o nivel manda — tudo guardado
por assercoes novas no teste de paridade (RF-03 parte 1, RF-08, D2, CA-04, CA-05).

**DP aplicadas:** DP-1 (passos 0–3 + GREEN mantido como passo 4), DP-2, DP-3, DP-4, DP-5, DP-6, DP-15, DP-16.

> **Gate antes de comecar (G15):** os tres comandos abaixo devem devolver algo. Se algum vier vazio, o
> Plano 01 nao fechou — PARAR e registrar no MEMORY, nao improvisar os helpers.
> - `ls tests/fase-template-tdd-contract.test.ts`
> - `grep -n "function section\|function prose" tests/fase-template-tdd-contract.test.ts`
> - `grep -n "Contrato do Ciclo por Fase" skills/tdd-workflow/SKILL.md`

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fase-template-tdd-contract.test.ts` | Modify | Novo `describe` com 6 assercoes sobre o 4c, o `argument-hint` e o §Ciclo Completo |
| `skills/execute-plan/SKILL.md` | Modify | Linha 7: `argument-hint` ganha `[--tdd-level guiado\|assistido\|direto]`; `### 4c` (419-443) reescrito como passos 0–4; `## Common Rationalizations` (864-869) +1 linha. Nada mais (G17) |
| `skills/execute-plan/references/wave-execution.md` | Modify | `### Ciclo Completo` (~135-153): diagrama ganha RED confirmado, gate, REFACTOR, RED-check e VERIFY + frase de ponteiro para a fonte. Registros `.tdd-phase.json` (~100-108, ~128-133) intocados (DP-15, plano01 G10) |
| `plugin-manifest.json` | Modify | `bun run generate:manifest` — linhas 1118 e 1130 (G18) |

---

## Implementacao

### Passo 1: RED — assercoes novas no teste de paridade

Acrescentar ao final de `tests/fase-template-tdd-contract.test.ts` (mesmo arquivo do Plano 01; helpers
`read`, `section`, `prose` ja existem la). O 4c e um bloco cercado — asserir com `section()` **cru** (G16).
O `argument-hint` esta no frontmatter — regex de linha no arquivo cru (G21).

```typescript
// 2026-09-08 (Luiz/dev): Step 4c executa o contrato — PRD tdd-cycle-contract §RF-03, §RF-08, D2.
// O 4c e um bloco cercado de pseudo-codigo: prose() o apagaria. section() cru, de proposito.
const executePlan = read('skills/execute-plan/SKILL.md')
const waveExecution = read('skills/execute-plan/references/wave-execution.md')

describe('execute-plan — Step 4c resolve o nivel, confirma o RED e para no gate (RF-03 parte 1, RF-08)', () => {
  const step4c = section(executePlan, '### 4c.')

  test('4c aponta para a secao-fonte do ciclo', () => {
    expect(
      step4c,
      `[parity gate "nunca diminuir" — RF-03] O Step 4c nao cita "Contrato do Ciclo por Fase". ` +
        `O 4c EXECUTA o ciclo; a definicao mora em skills/tdd-workflow/SKILL.md. Sem o ponteiro, ` +
        `o executor volta a ter a segunda definicao que este PRD existe para apagar.`,
    ).toContain('Contrato do Ciclo por Fase')
  })

  test('4c resolve o nivel por --tdd-level, user_profile e default Assistido (D2)', () => {
    expect(step4c, '[parity gate — RF-08] 4c nao le --tdd-level').toContain('--tdd-level')
    expect(step4c, '[parity gate — RF-03] 4c nao le user_profile (sinal que tdd-workflow ja usa)').toContain('user_profile')
    expect(
      step4c,
      `[parity gate — D2] 4c perdeu o default Assistido. Assistido para em [RISCO] e no tracer ` +
        `bullet — e onde a spec errada morre barato. Restaure a linha do default, nao esta assercao.`,
    ).toMatch(/Assistido[^\n]*default|default[^\n]*Assistido/)
  })

  test('4c exige que o orquestrador confirme a falha do RED por assertion e bloqueie module-not-found (CA-04)', () => {
    expect(step4c, '[parity gate — CA-04] 4c nao registra red_confirmed').toContain('red_confirmed')
    expect(step4c, '[parity gate — CA-04] 4c nao classifica a falha por assertion').toMatch(/red_confirmed: assertion/)
    expect(
      step4c,
      `[parity gate — CA-04] 4c nao bloqueia "Cannot find module". Falha por import nao e RED — e ` +
        `ausencia de stub (compound 2026-05-19-tdd-gate-needs-stub-first).`,
    ).toContain('Cannot find module')
    expect(step4c, '[parity gate — CA-04] bloqueio nao aponta para o checklist stub-first').toContain('tdd-cycle-checklist')
  })

  test('4c para no gate humano com AskUserQuestion e registra human_gate (CA-05)', () => {
    expect(step4c, '[parity gate — CA-05] 4c nao para para o humano').toContain('AskUserQuestion')
    expect(step4c, '[parity gate — CA-05] 4c nao registra human_gate no STATE').toContain('human_gate')
  })

  test('argument-hint do execute-plan aceita --tdd-level (RF-08)', () => {
    // G21: frontmatter nao tem heading — section() nao chega la.
    expect(
      executePlan,
      '[parity gate — RF-08] argument-hint do execute-plan nao anuncia --tdd-level',
    ).toMatch(/^argument-hint:.*--tdd-level/m)
  })

  test('wave-execution §Ciclo Completo aponta para a fonte', () => {
    expect(
      section(waveExecution, '### Ciclo Completo'),
      `[parity gate — RF-01] wave-execution.md §Ciclo Completo virou copia solta do ciclo. ` +
        `E resumo; a definicao e a secao-fonte da skill tdd-workflow.`,
    ).toContain('Contrato do Ciclo por Fase')
  })
})
```

Rodar `bun test tests/fase-template-tdd-contract.test.ts -t 'Step 4c resolve|argument-hint|Ciclo Completo'`
e registrar a saida **literal** no MEMORY (plano01 G9). Os 6 devem falhar por `expect` — os arquivos
existem; se aparecer `Cannot find module`, o caminho de `read()` esta errado, nao o alvo.

### Passo 2: GREEN (a) — `argument-hint`

Linha 7 de `skills/execute-plan/SKILL.md`. So o valor muda; chaves e ordem do frontmatter ficam (G21):

```yaml
argument-hint: "[caminho do PLAN.md ou nome da feature] [--plano N] [--fase N] [--tdd-level guiado|assistido|direto]"
```

### Passo 3: GREEN (b) — `### 4c` como passos 0–4

Substituir o bloco cercado atual (419-443) — que so tem "Subagente RED" e "Subagente GREEN" — por uma
frase de ponteiro e o bloco abaixo. O passo 4 (GREEN) e o texto de hoje, intacto; a fase-02 o completa. Manter
`Registra: .tdd-phase.json` no RED (plano01 G10). Manter a linha "Recebe, se a fase e de risco: Ameacas &
Dados + CA-SEC-*" (ja existe, linha ~426).

```markdown
### 4c. Ciclo TDD por Fase

Fonte do ciclo: `skills/tdd-workflow/SKILL.md` §`## Contrato do Ciclo por Fase` — tipo de fase ×
RED/GREEN/RED-check/REFACTOR/gate e o mapa nivel → parada. Este step EXECUTA o contrato; nao o redefine.

```
Ler do bloco ### TDD da fase: Tipo de fase, comando do RED, `Defesa a mutar`, `Teste que deve cair`.

0. RESOLVER NIVEL (uma vez por execucao, antes da primeira fase):
   - `--tdd-level guiado|assistido|direto` no argumento                   → usa
   - senao: linha `tdd_level: guiado|assistido|direto` no user_profile da memoria do projeto → usa
   - senao: Assistido (default — PRD tdd-cycle-contract D2)
   - Registrar no STATE log: `tdd_level: {nivel}`

1. RED (subagente, contexto isolado):
   - Recebe: especificacao da fase (arquivos, descricao, verificacao)
   - Recebe, se a fase e de risco: a secao "Ameacas & Dados" do PRD + os CA-SEC-* da fase
     — sem isso o RED escreve so o happy path e a defesa nunca chega ao GREEN
   - NAO recebe: implementacao existente
   - Produz: teste que FALHA por assertion failure (stub-first — docs/references/tdd-cycle-checklist.md)
   - Registra: .tdd-phase.json

2. RED CONFIRMADO PELO ORQUESTRADOR (verificacao, nao implementacao):
   - Rodar o comando de teste da fase via Bash; ler a saida ate o fim
   - Classificar a saida:
       contem `Cannot find module` | `Cannot resolve` | `error TS` | `SyntaxError`
         → red_confirmed: blocked — "RED invalido: falta stub-first — ver
           docs/references/tdd-cycle-checklist.md §Sinal Cannot find module"
         → devolver ao subagente RED com a saida literal; NAO spawnar GREEN
       exit 0 (o teste nasceu verde)
         → red_confirmed: blocked (nasceu verde) — devolver ao RED; RED que passa nao e RED
       exit != 0 sem marcador (falha por assertion / `Error: not implemented`)
         → red_confirmed: assertion
       fase sem-comportamento: gate textual rodado e visto FALHANDO
         → red_confirmed: gate-textual
   - Gravar a linha da fase no STATE log com `red_confirmed` ANTES do gate (uma parada nao pode
     perder o RED — PRD Premissa 2)

3. GATE HUMANO (mapa nivel → parada, da fonte):
   para se: nivel == guiado
         ou (nivel == assistido e (Tipo de fase: risco
                                   ou a fase tem o bloco "### Seguranca (apenas fase de slice [RISCO])"
                                   ou a fase e plano01/fase-01-* — tracer bullet))
   nunca se: nivel == direto
   Se para:
     AskUserQuestion mostrando caminho + conteudo do(s) arquivo(s) de teste e a saida literal do RED:
       "Este e o contrato desta fase; confirma?"
       - "Confirmar"        → segue ao GREEN
       - "Ajustar o teste"  → coleta a observacao do dev; re-spawn do RED com ela; volta ao passo 2
       - "Abortar a fase"   → fase paused, STATE atualizado, sair do ciclo
     Registrar: human_gate: stopped
   Senao: human_gate: skipped({nivel})

4. GREEN (subagente, contexto isolado):
   - Recebe: APENAS os arquivos de teste do RED
   - NAO recebe: PRD, descricao da feature
   - Produz: codigo minimo que faz o teste passar
   - Anchor imutavel: NUNCA modifica testes

Se a fase NAO tem bloco ### TDD (fases geradas antes do contrato):
  - Executar diretamente com subagente unico; validar via checklist da fase
  - STATE log: `red_confirmed: n/a (fase sem bloco TDD)`
```
```

### Passo 4: GREEN (c) — `wave-execution.md` §Ciclo Completo

Trocar so o diagrama e acrescentar a frase de ponteiro antes dele. O "Subagente RED"/"Subagente GREEN" e os
dois blocos JSON de `.tdd-phase.json` acima ficam como estao (DP-15).

```markdown
### Ciclo Completo

Fonte: `skills/tdd-workflow/SKILL.md` §`## Contrato do Ciclo por Fase`. O Step 4c do `execute-plan`
executa este ciclo; o diagrama abaixo e resumo, nao definicao.

```
Orchestrator: resolve o nivel (--tdd-level | user_profile | Assistido)
Orchestrator: spawna RED com spec da task
    ↓
RED: cria teste que FALHA (stub-first)
RED: registra .tdd-phase.json (phase: red)
    ↓
Orchestrator: RODA o teste e classifica a falha
              assertion → segue | module-not-found / compila → bloqueia (stub-first) e devolve ao RED
Orchestrator: gate humano conforme o nivel (AskUserQuestion: "este e o contrato; confirma?")
    ↓
Orchestrator: spawna GREEN com APENAS os testes
GREEN: implementa codigo minimo; confirma que teste PASSA
GREEN: REFACTOR com testes verdes, em commit refactor(...) proprio (ou "refactor: none (motivo)")
GREEN: registra .tdd-phase.json (phase: green)
    ↓
Orchestrator: RED-CHECK — aplica "Defesa a mutar", "Teste que deve cair" cai, git restore, diff vazio
Orchestrator: VERIFY — spawna plan-verifier (read-only) com o STATE log da fase
    ↓
Orchestrator: coleta resultado, atualiza STATE.md
              (tdd_level, red_confirmed, human_gate, red_check, refactor)
```
```

### Passo 5: GREEN (d) — Common Rationalizations

Uma linha ao final da tabela (`SKILL.md:864-869`), so adicao (DP-16):

```markdown
| "O RED ja falhou no subagente, nao preciso rodar de novo" | O orquestrador confirma POR QUE falhou. `Cannot find module` nao e RED — e ausencia de stub. So a saida do comando, lida ate o fim, distingue assertion de erro de import. |
```

### Passo 6: Manifest e commit

`bun run generate:manifest`; `git diff --stat plugin-manifest.json` → so as entradas 1118 e 1130 (G18).
Commit unico: `feat(execute-plan): 4c resolve o nivel, confirma o RED e para no gate humano (Plano 02 fase-01)`.
Commitar ANTES do RED-check (plano01 G8).

### Passo 7: REFACTOR

Com o teste verde: se as 6 assercoes ficaram repetitivas (ex.: quatro `expect(step4c).toContain(...)` com
mensagens quase iguais), extrair `const mustContain = (needle: string, why: string) => ...` no describe.
Se nada a melhorar, registrar `refactor: none (assercoes ja minimas)` no MEMORY. Commit `refactor(tests): ...`
separado, se houver.

---

## Gotchas

- **G15:** gate antes de comecar — sem o Plano 01 no checkout, esta fase nao tem onde escrever.
- **G16:** `section(executePlan, '### 4c.')` cru; `prose()` apagaria o bloco inteiro e todas as assercoes
  passariam vazias... nao: falhariam todas, o que e o sinal bom. Mas nunca "consertar" trocando para `prose()`.
- **G17:** nao tocar nas linhas 10-30 (preface). Se o e2e do preface cair, a edicao saiu do lugar.
- **G21:** `argument-hint` e a unica linha acima de 344 que muda.
- **G22 / DP-5:** a ordem "grava `red_confirmed` → pergunta" esta escrita no passo 2 do 4c. Nao inverter.
- **plano01 G10:** `Registra: .tdd-phase.json` fica no RED; os JSONs do wave-execution ficam.
- **plano01 G13:** o `bun run lint` do Step 5 NAO e desta fase (fase-03, DP-13). O `### 4d` NAO muda.
- **Local — `section()` e `startsWith`:** o heading e `### 4c. Ciclo TDD por Fase`; o prefixo `### 4c.` (com
  ponto) evita casar outro heading que comece com `### 4c` no futuro.
- **Local — CA-05 "fase sem marca nao para":** e a linha `Senao: human_gate: skipped({nivel})`. O teste de
  paridade nao prova o comportamento (e prompt) — a fase-04 prova.

---

## Verificacao

### TDD

**Tipo de fase:** comportamento

- [ ] **RED:** os 6 testes do Passo 1 FALHAM por assertion (`expect`), nao por `Cannot find module`
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts -t 'Step 4c resolve|argument-hint|Ciclo Completo'`
  - Registrar a saida literal no MEMORY (plano01 G9)

- [ ] **GREEN:** Passos 2–5 aplicados; os 6 PASSAM e os testes do Plano 01 continuam verdes
  - Comando: `bun test tests/fase-template-tdd-contract.test.ts`

- [ ] **RED-check do orquestrador:** com o GREEN commitado, uma mutacao por vez, restaurando com
      `git restore <arquivo>` (caminho explicito, G14) e exigindo `git diff --stat` vazio antes da proxima:
  - Defesa a mutar: apagar a linha `- senao: Assistido (default — PRD tdd-cycle-contract D2)` do 4c
    → Teste que deve cair: `4c resolve o nivel por --tdd-level, user_profile e default Assistido (D2)`
  - Defesa a mutar: remover `[--tdd-level guiado|assistido|direto]` do `argument-hint` (linha 7)
    → Teste que deve cair: `argument-hint do execute-plan aceita --tdd-level (RF-08)`
  - Defesa a mutar: apagar a linha `contem \`Cannot find module\` | ...` do passo 2 do 4c
    → Teste que deve cair: `4c exige que o orquestrador confirme a falha do RED por assertion e bloqueie module-not-found (CA-04)`
  - Defesa a mutar: apagar a frase "Fonte: `skills/tdd-workflow/SKILL.md` §`## Contrato do Ciclo por Fase`" do §Ciclo Completo
    → Teste que deve cair: `wave-execution §Ciclo Completo aponta para a fonte`

- [ ] **REFACTOR:** commit `refactor(...)` proprio, ou `refactor: none (motivo)` no MEMORY

### Checklist

- [ ] Gate G15 cumprido (tres comandos nao-vazios) — registrado no MEMORY
- [ ] `git diff skills/execute-plan/SKILL.md` toca SO a linha 7, o bloco `### 4c` e a tabela de Common Rationalizations; linhas 10-30 identicas
- [ ] `git diff skills/execute-plan/references/wave-execution.md` toca SO `### Ciclo Completo`; os dois blocos JSON de `.tdd-phase.json` identicos
- [ ] `grep -n "Registra: .tdd-phase.json" skills/execute-plan/SKILL.md` → 1 ocorrencia (ficou)
- [ ] `grep -c "AskUserQuestion" skills/execute-plan/SKILL.md` → 3 (3c, 4c, 6a)
- [ ] `bun test tests/e2e/stack-aware-preface-all-skills.test.ts` verde (G17)
- [ ] `bun run generate:manifest` sem warning; `git diff --stat plugin-manifest.json` → so 2 entradas (G18)
- [ ] `bun run harness:validate` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (plano01 G3)
- [ ] MEMORY.md: saida literal do RED, DIs, `refactor:` registrado; Metricas atualizadas

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/fase-template-tdd-contract.test.ts` → todos os testes passam, incluindo os 6 novos
- Cada uma das 4 mutacoes do RED-check derruba exatamente o teste nomeado; apos `git restore <arquivo>`, `git diff --stat` e vazio
- `bun test tests/e2e/stack-aware-preface-all-skills.test.ts`, `bun run harness:validate`, `bun run test`, `bun run typecheck` → verdes

**Por humano (se aplicavel):**
- Ler o 4c novo de cima a baixo e conferir que o passo 4 (GREEN) e o texto de hoje, palavra por palavra — a fase-02 o completa

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

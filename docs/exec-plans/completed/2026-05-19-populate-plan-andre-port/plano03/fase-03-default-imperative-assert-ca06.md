<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 03: `DEFAULT_INSTRUCTION` imperativa + sub-assert CA-06 no parity

**Plano:** 03 — MH-3 Instrucoes imperativas
**Sizing:** 45min
**Depende de:** fase-02 (12 entries refatoradas, `LLM_INSTRUCTIONS` exportado,
`DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` provisorio, `llmInstructionFor` retorna
`ImperativeInstruction`)
**Visual:** false

---

## O que esta fase entrega

`DEFAULT_INSTRUCTION` reescrita como `ImperativeInstruction` no
`skills/init/lib/populate-plan-generator.ts`, removendo o `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03`
provisorio da fase-02. Dois sub-asserts CA-06 adicionados em
`tests/e2e/populate-plan-parity.test.ts`: (1) toda entry de `LLM_INSTRUCTIONS` satisfaz
`isImperativeInstruction`; (2) `DEFAULT_INSTRUCTION` satisfaz `isImperativeInstruction`.
Mensagens de erro apontam para PRD CA-06 + linha do arquivo. Fecha o ciclo MH-3.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | Substituir `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` (provisorio da fase-02) por `DEFAULT_INSTRUCTION: ImperativeInstruction` final. Atualizar `llmInstructionFor` para usar o nome final. Adicionar `export` ao `DEFAULT_INSTRUCTION`. Remover (ou deletar comentado) o `DEFAULT_INSTRUCTION` string antigo. |
| `tests/e2e/populate-plan-parity.test.ts` | Modify | Adicionar import de `LLM_INSTRUCTIONS`, `DEFAULT_INSTRUCTION`, `isImperativeInstruction` do `populate-plan-generator`. Adicionar 2 testes novos: `every LLM_INSTRUCTION entry is a valid ImperativeInstruction (CA-06)` e `DEFAULT_INSTRUCTION is a valid ImperativeInstruction (CA-06)`. |

Estado esperado apos esta fase: `populate-plan-generator.ts` sem nada provisorio.
`populate-plan-parity.test.ts` com 2 testes a mais.

**Contagem condicional do parity test (depende do que ja foi merged):**
- Standalone (Plano 01 + Plano 03 apenas): **4** (2 MH-1 + 2 CA-06).
- Com Plano 02 merged tambem: **6** (2 MH-1 + 2 CA-03 + 2 CA-06).
- Com Plano 04 merged tambem: **8** (Plano 04 adiciona seus proprios asserts).

---

## Implementacao

### Passo 1: Reescrever `DEFAULT_INSTRUCTION`

No `skills/init/lib/populate-plan-generator.ts`, localizar o
`DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` (adicionado em fase-02) e o `DEFAULT_INSTRUCTION`
string antigo (que ficou ao lado como referencia historica).

**Antes (estado pos fase-02):**

```typescript
const DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03: ImperativeInstruction = {
  fontes: ['(provisorio — fase-03 reescreve)'],
  secoes: ['(provisorio — fase-03 reescreve)'],
  honestidade: 'Provisorio. Fase-03 do Plano 03 reescreve com o conteudo final.',
}

const DEFAULT_INSTRUCTION =  // string antiga, intocada na fase-02
  'Leia os inputs (docs candidatos + codigo). Sintetize o conteudo deste doc canonico com base na ' +
  'verdade do projeto. Zero placeholder. Se nao houver evidencia suficiente, marque `needsUser` e ' +
  'pergunte ao dev no PR.'
```

**Depois:**

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-03 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Default conservador: aplicado quando o doc canonico NAO tem entry no map. `fontes` minimos
// universais; `secoes` no formato Andre canonico (Goal / Inputs / Output); honestidade
// padrao. NAO ha brecha tipo "se nao houver evidencia, marque needsUser e siga" — `needsUser`
// e sinal de bloqueio + `TODO(<contexto>):` obrigatorio na saida.
export const DEFAULT_INSTRUCTION: ImperativeInstruction = {
  fontes: [
    'package.json',
    'README.md (se existir)',
    'docs/** (qualquer doc candidato relacionado ao destino)',
    'src/** ou skills/** (codigo principal)',
  ],
  secoes: [
    'Goal',
    'Inputs',
    'Output',
  ],
  honestidade:
    'Cada afirmacao rastreia um arquivo lido. Quando nao rastreia, marca `TODO(<contexto>):`. ' +
    'Sem evidencia suficiente: flag `needsUser` + nao gerar conteudo especulativo. ' +
    'Honestidade > marketing.',
}
```

Deletar o `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` (que era marcador provisorio) e o
`DEFAULT_INSTRUCTION` string antigo. Garantir que NENHUMA referencia restante aponta para
qualquer um deles.

### Passo 2: Atualizar `llmInstructionFor`

**Antes (estado pos fase-02):**

```typescript
function llmInstructionFor(dst: string): ImperativeInstruction {
  return LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03
}
```

**Depois:**

```typescript
function llmInstructionFor(dst: string): ImperativeInstruction {
  return LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION
}
```

Registrar em MEMORY.md `DI-Plano03-fase03-default-final` com o snippet final.

### Passo 3: Confirmar export de `LLM_INSTRUCTIONS`

Se fase-02 ja exportou (recomendado por aquela fase), apenas confirmar. Se nao exportou,
adicionar:

```typescript
export const LLM_INSTRUCTIONS: Record<string, ImperativeInstruction> = { ... }
```

Registrar em MEMORY.md `DI-Plano03-fase03-export-confirmado` (ou `DI-Plano03-fase03-export-tardio`
se foi feito aqui).

### Passo 4: Adicionar imports no parity test

No topo de `tests/e2e/populate-plan-parity.test.ts`:

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-03 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Imports do generator para validar contrato `ImperativeInstruction` no parity test.
import {
  DEFAULT_INSTRUCTION,
  isImperativeInstruction,
  LLM_INSTRUCTIONS,
} from '../../skills/init/lib/populate-plan-generator'
```

Path relativo `../../skills/init/lib/populate-plan-generator` (do diretorio `tests/e2e/`).
Se o tsconfig usa alias `@/skills/...`, preferir o alias — registrar
`DI-Plano03-fase03-import-style` em MEMORY.md.

### Passo 5: Adicionar teste CA-06 sobre `LLM_INSTRUCTIONS`

Dentro do `describe` principal, apos os asserts existentes (2 MH-1 do Plano 01 e, se merged,
2 CA-03 do Plano 02):

```typescript
test('every LLM_INSTRUCTION entry is a valid ImperativeInstruction (CA-06)', () => {
  // 2026-05-19 (Luiz/dev): gate "nunca diminuir" para o map de instrucoes. Adicionar nova
  // entry sem `fontes` especificas / `secoes` obrigatorias / `honestidade` quebra build.
  const PRD_LINK = 'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md'
  const violacoes: Array<{ key: string; reason: string }> = []

  for (const [key, instr] of Object.entries(LLM_INSTRUCTIONS)) {
    if (!isImperativeInstruction(instr)) {
      // Diagnose qual elemento falhou — mensagem util.
      let reason = 'estrutura invalida'
      if (typeof instr !== 'object' || instr === null) reason = 'nao e objeto'
      else {
        const obj = instr as Record<string, unknown>
        if (!Array.isArray(obj.fontes) || obj.fontes.length === 0) reason = '`fontes` ausente ou vazio'
        else if (!Array.isArray(obj.secoes) || obj.secoes.length === 0) reason = '`secoes` ausente ou vazio'
        else if (typeof obj.honestidade !== 'string' || obj.honestidade.length === 0) reason = '`honestidade` ausente ou vazio'
      }
      violacoes.push({ key, reason })
    }
  }

  if (violacoes.length > 0) {
    throw new Error(
      `[parity gate "nunca diminuir" — CA-06] LLM_INSTRUCTIONS contem entries que NAO satisfazem ImperativeInstruction:\n` +
      violacoes.map(v => `  - LLM_INSTRUCTIONS['${v.key}']: ${v.reason}`).join('\n') +
      `\n\nAjuste em skills/init/lib/populate-plan-generator.ts.\n` +
      `Schema obrigatorio (3 elementos): { fontes: string[]; secoes: string[]; honestidade: string }.\n` +
      `Sem brecha "se nao houver, mantenha template" — ver ${PRD_LINK} CA-06.\n`,
    )
  }

  expect(violacoes).toEqual([])
})
```

### Passo 6: Adicionar teste CA-06 sobre `DEFAULT_INSTRUCTION`

Imediatamente apos:

```typescript
test('DEFAULT_INSTRUCTION is a valid ImperativeInstruction (CA-06)', () => {
  // 2026-05-19 (Luiz/dev): default e fallback quando doc canonico NAO tem entry. Tem que
  // satisfazer o mesmo contrato — senao a brecha volta pela porta dos fundos.
  const PRD_LINK = 'docs/exec-plans/active/2026-05-19-populate-plan-andre-port/PRD.md'

  if (!isImperativeInstruction(DEFAULT_INSTRUCTION)) {
    throw new Error(
      `[parity gate "nunca diminuir" — CA-06] DEFAULT_INSTRUCTION em ` +
      `skills/init/lib/populate-plan-generator.ts NAO satisfaz ImperativeInstruction.\n` +
      `Schema obrigatorio: { fontes: string[]; secoes: string[]; honestidade: string }.\n` +
      `Ver ${PRD_LINK} CA-06.\n`,
    )
  }

  expect(isImperativeInstruction(DEFAULT_INSTRUCTION)).toBe(true)
})
```

### Passo 7: Rodar e iterar

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado (depende de quais planos foram merged):**
- Standalone (Plano 01 + Plano 03): **4 pass, 0 fail**.
- Com Plano 02 merged: **6 pass, 0 fail**.
- Com Plano 04 merged: **8 pass, 0 fail** (Plano 04 contribui com seus proprios asserts).

```powershell
bun test skills/init/lib/populate-plan-generator.test.ts
bun test skills/init/lib/imperative-instruction.test.ts
```

**Esperado:** ambos verdes, contagens preservadas das fases anteriores.

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos.

### Passo 8: Validacao do RED (transitorio, NAO commitar)

Para confirmar que os 2 testes novos sao RED de verdade:

1. Comentar a linha `fontes: [...],` em qualquer entry do `LLM_INSTRUCTIONS` (ex:
   `ARCHITECTURE.md`).
2. Rodar:

   ```powershell
   bun test tests/e2e/populate-plan-parity.test.ts --grep "every LLM_INSTRUCTION entry"
   ```

   **Esperado:** 1 fail com mensagem listando `LLM_INSTRUCTIONS['ARCHITECTURE.md']: \`fontes\` ausente ou vazio`.

3. Restaurar a entry. Comentar a linha `fontes:` do `DEFAULT_INSTRUCTION`.
4. Rodar:

   ```powershell
   bun test tests/e2e/populate-plan-parity.test.ts --grep "DEFAULT_INSTRUCTION"
   ```

   **Esperado:** 1 fail com mensagem sobre `DEFAULT_INSTRUCTION`.

5. Restaurar tudo. Rodar a suite cheia — todos verdes.

Registrar em MEMORY.md `DI-Plano03-fase03-red-validado`.

---

## Gotchas

- **G1 (`isImperativeInstruction` path no parity test):** o path correto do
  `tests/e2e/populate-plan-parity.test.ts` para o generator e
  `'../../skills/init/lib/populate-plan-generator'` (2 niveis acima de `tests/e2e/`, dentro
  de `skills/init/lib/`). Se o tsconfig do projeto tem `paths` configurado para alias
  (`@/skills/...`), preferir o alias para nao quebrar se as pastas reorganizarem.
- **G2 (contagem condicional de testes):** o numero esperado de testes no parity depende de
  quais planos ja foram merged. NAO hardcodar `expect(testCount).toBe(N)` no checklist —
  ajustar conforme estado real do branch. Estado mais comum quando esta fase roda: Plano 01
  + Plano 02 + Plano 03 merged = 6 testes. Tracking exato em MEMORY.md
  `DI-Plano03-fase03-test-count`.
- **G3 (mensagem educativa apontando PRD + arquivo):** o erro DEVE listar:
  (1) que CA foi violada (CA-06),
  (2) qual arquivo editar (`skills/init/lib/populate-plan-generator.ts`),
  (3) qual chave do map ofende (`LLM_INSTRUCTIONS['<key>']`),
  (4) link para o PRD CA-06.
  Sem isso, o gate "nunca diminuir" vira "nunca entender o porque".
- **G4 (deletar o LEGACY ao inves de comentar):** apos confirmar que `llmInstructionFor`
  aponta para `DEFAULT_INSTRUCTION` novo, DELETAR (nao comentar) o
  `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03`. Comentado fica cruft.
- **G5 (provisorio nao pode escapar):** rodar `Select-String -Pattern "LEGACY_TODO_PHASE_03"
  -Path skills/init/lib/populate-plan-generator.ts` — esperado **zero matches** apos esta
  fase. Se aparecer, fase-03 nao terminou.
- **G6 (regex strict opcional para honestidade — FORA do escopo desta fase):** o
  `isImperativeInstruction` checa apenas que `honestidade` e string nao-vazia. Adicionar
  regex `/Honestidade > marketing/i` no parity test seria possivel — DECIDIDO em PRD CA-06
  ficar FORA do escopo do Plano 03 (variacoes legitimas podem usar texto custom). Se Plano
  05 fase-01 decidir reforcar, registrar como nova decisao naquele plano.
- **G7 (export de DEFAULT_INSTRUCTION):** `DEFAULT_INSTRUCTION` antigo (string) NAO era
  exportado. Novo (`ImperativeInstruction`) ganha `export` para o parity test consumir.
  Idem warning de G7 da fase-02 — grep por callers externos antes.

---

## Verificacao

### TDD

- [ ] **RED:** rodar o parity test ANTES de adicionar `DEFAULT_INSTRUCTION` final + exports
      — `bun test tests/e2e/populate-plan-parity.test.ts` falha no import de
      `DEFAULT_INSTRUCTION` (ainda nao exportado) ou em runtime se importar
      `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` por engano.

      Apos imports corretos mas ANTES do Passo 1 (DEFAULT_INSTRUCTION ainda provisorio
      com `fontes: ['(provisorio...)']`), o teste `DEFAULT_INSTRUCTION is a valid
      ImperativeInstruction` passa formalmente (a string `'(provisorio...)'` nao e vazia)
      — entao confirmar **RED tambem manualmente:** trocar `fontes: ['x']` por `fontes: []`
      temporariamente.

      Comando: `bun test tests/e2e/populate-plan-parity.test.ts --grep "DEFAULT_INSTRUCTION"`

      Resultado esperado: fail com mensagem citando `DEFAULT_INSTRUCTION` ofende.

- [ ] **GREEN:** apos Passos 1-2 (default final) + Passos 5-6 (testes novos), os 2 asserts
      CA-06 passam.

      Comando: `bun test tests/e2e/populate-plan-parity.test.ts`

      Resultado esperado: 4-8 pass (depende de planos merged), 0 fail.

### Checklist

- [ ] `DEFAULT_INSTRUCTION` reescrito como `ImperativeInstruction` final, exportado.
- [ ] `DEFAULT_INSTRUCTION_LEGACY_TODO_PHASE_03` DELETADO (grep zero matches).
- [ ] `DEFAULT_INSTRUCTION` string antigo DELETADO.
- [ ] `llmInstructionFor` aponta para `DEFAULT_INSTRUCTION` novo.
- [ ] `LLM_INSTRUCTIONS` exportado (confirmado).
- [ ] Imports adicionados em `tests/e2e/populate-plan-parity.test.ts`.
- [ ] Teste `every LLM_INSTRUCTION entry is a valid ImperativeInstruction (CA-06)`
      adicionado.
- [ ] Teste `DEFAULT_INSTRUCTION is a valid ImperativeInstruction (CA-06)` adicionado.
- [ ] Mensagens de erro dos 2 testes linkam PRD CA-06 + apontam para
      `skills/init/lib/populate-plan-generator.ts`.
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` — todos verdes (contagem
      condicional).
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts` — verde.
- [ ] `bun test skills/init/lib/imperative-instruction.test.ts` — verde (12 pass).
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] RED validado manualmente (Passo 8) — registrado no MEMORY.md.

### Comandos verificaveis

```powershell
# Parity test cheio
bun test tests/e2e/populate-plan-parity.test.ts
# Esperado: 4-8 pass (depende de quais planos merged), 0 fail

# Generator + imperative helper sem regressao
bun test skills/init/lib/populate-plan-generator.test.ts
bun test skills/init/lib/imperative-instruction.test.ts

# Provisorio sumiu
Select-String -Pattern "LEGACY_TODO_PHASE_03" -Path skills/init/lib/populate-plan-generator.ts
# Esperado: zero matches

# Exports corretos
Select-String -Pattern "^export const (LLM_INSTRUCTIONS|DEFAULT_INSTRUCTION)" -Path skills/init/lib/populate-plan-generator.ts
# Esperado: 2 matches

# Typecheck e lint
bun run typecheck
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `skills/init/lib/populate-plan-generator.ts` contem
  `export const DEFAULT_INSTRUCTION: ImperativeInstruction` (`Select-String` retorna 1 match).
- `Select-String -Pattern "LEGACY_TODO_PHASE_03" -Path skills/init/lib/populate-plan-generator.ts`
  retorna zero matches.
- `tests/e2e/populate-plan-parity.test.ts` contem testes
  `'every LLM_INSTRUCTION entry is a valid ImperativeInstruction (CA-06)'` e
  `'DEFAULT_INSTRUCTION is a valid ImperativeInstruction (CA-06)'`.
- `bun test tests/e2e/populate-plan-parity.test.ts` — exit 0.
- Reverter manualmente (comentar `fontes:` em qualquer entry do map ou no
  `DEFAULT_INSTRUCTION`) faz `bun test ...` falhar com mensagem clara apontando a chave +
  CA-06 (RED valido).
- `bun run typecheck` exit 0.
- `bun run lint` exit 0.

**Por humano:**
- Diff legivel: `DEFAULT_INSTRUCTION` virou objeto com 3 elementos; provisorio sumiu.
- 2 testes novos no parity, mensagens de erro educativas listando arquivo + PRD CA-06.
- Comentarios `2026-05-19 (Luiz/dev)` nos lugares de decisao (default final, imports do
  parity, declaracoes dos 2 testes novos).

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

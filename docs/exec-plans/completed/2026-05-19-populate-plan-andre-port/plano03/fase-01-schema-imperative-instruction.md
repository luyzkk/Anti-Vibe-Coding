<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 01: Schema `ImperativeInstruction` + helpers

**Plano:** 03 — MH-3 Instrucoes imperativas
**Sizing:** 45min
**Depende de:** —
**Visual:** false

---

## O que esta fase entrega

Tipo `ImperativeInstruction` + helpers `formatImperativeInstruction` e `isImperativeInstruction`
adicionados em `skills/init/lib/populate-plan-generator.ts`, com 3 unit tests em arquivo novo
`skills/init/lib/imperative-instruction.test.ts`. **Sem refatorar** `LLM_INSTRUCTIONS` ainda —
o map continua `Record<string, string>` e `llmInstructionFor()` ainda retorna `string`. Esta
fase apenas instala o contrato + helpers para fase-02 consumir. Risco baixo: nenhum codigo
existente muda comportamento.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | Adicionar tipo `ImperativeInstruction`, helper `formatImperativeInstruction`, helper `isImperativeInstruction` — posicionados ENTRE o comentario `// --- Mapa de instrucoes LLM por doc canonico ---` (linha ~74) e a declaracao do map `LLM_INSTRUCTIONS` (linha 79). Adicionar `export` ao tipo e aos 2 helpers. |
| `skills/init/lib/imperative-instruction.test.ts` | Create | Novo arquivo com 3 unit tests cobrindo render e guard. |

Estado esperado apos esta fase: arquivo `populate-plan-generator.ts` com simbolos novos
exportados, `LLM_INSTRUCTIONS` e `DEFAULT_INSTRUCTION` intocados, suite de testes do generator
verde (zero impacto), 3 testes novos no arquivo `imperative-instruction.test.ts` passando.

---

## Implementacao

### Passo 1: Reler estado atual do arquivo

Abrir `skills/init/lib/populate-plan-generator.ts` e confirmar:

- Linha ~74: comentario `// --- Mapa de instrucoes LLM por doc canonico ---`.
- Linha 79: `const LLM_INSTRUCTIONS: Record<string, string> = { ... }` — NAO mexer.
- Linha 128: `const DEFAULT_INSTRUCTION = '...'` — NAO mexer.
- Linha 133: `function llmInstructionFor(dst: string): string` — NAO mexer.
- Linha 177: `function renderLLMInstructionBlock(instruction: string): string` — NAO mexer.

Registrar em MEMORY.md a confirmacao: `DI-Plano03-fase01-estado-inicial` (opcional, util se
linhas mudarem antes da fase-02).

### Passo 2: Adicionar tipo `ImperativeInstruction`

Inserir LOGO APOS o comentario de secao `// --- Mapa de instrucoes LLM por doc canonico ---`
e ANTES da linha `const LLM_INSTRUCTIONS`:

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-01 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Schema imperativo: cada instrucao LLM exige fontes especificas + secoes obrigatorias +
// frase de honestidade. Sem brecha tipo "se nao houver, mantenha template".
export interface ImperativeInstruction {
  fontes: string[]
  secoes: string[]
  honestidade: string
}
```

### Passo 3: Adicionar helper `formatImperativeInstruction`

Logo apos o tipo:

```typescript
// 2026-05-19 (Luiz/dev): renderer puro. NAO emite o heading `### Instrucao LLM` — esse
// heading e adicionado por `renderLLMInstructionBlock` (G1 do Plano 03). Esta funcao
// produz apenas o corpo: 3 blocos markdown.
export function formatImperativeInstruction(instr: ImperativeInstruction): string {
  const fontes = instr.fontes.map(f => `- ${f}`).join('\n')
  const secoes = instr.secoes.map(s => `- ${s}`).join('\n')
  return [
    '**Fontes:**',
    fontes,
    '',
    '**Secoes obrigatorias do output:**',
    secoes,
    '',
    instr.honestidade,
  ].join('\n')
}
```

### Passo 4: Adicionar helper `isImperativeInstruction`

Logo apos o renderer:

```typescript
// 2026-05-19 (Luiz/dev): runtime guard. Usado em fase-03 no parity test
// (`tests/e2e/populate-plan-parity.test.ts`) para assert CA-06 — toda entry do map
// `LLM_INSTRUCTIONS` deve satisfazer este predicado.
export function isImperativeInstruction(input: unknown): input is ImperativeInstruction {
  if (typeof input !== 'object' || input === null) return false
  const candidate = input as Record<string, unknown>

  const fontes = candidate.fontes
  if (!Array.isArray(fontes) || fontes.length === 0) return false
  if (!fontes.every(f => typeof f === 'string' && f.length > 0)) return false

  const secoes = candidate.secoes
  if (!Array.isArray(secoes) || secoes.length === 0) return false
  if (!secoes.every(s => typeof s === 'string' && s.length > 0)) return false

  const honestidade = candidate.honestidade
  if (typeof honestidade !== 'string' || honestidade.length === 0) return false

  return true
}
```

### Passo 5: Criar arquivo de teste `imperative-instruction.test.ts`

Path: `skills/init/lib/imperative-instruction.test.ts`. Conteudo:

```typescript
// 2026-05-19 (Luiz/dev): Plano 03 fase-01 do PRD populate-plan-andre-port (MH-3 / CA-06).
// Cobre helpers `formatImperativeInstruction` e `isImperativeInstruction` em isolamento.
import { describe, expect, test } from 'bun:test'
import {
  formatImperativeInstruction,
  isImperativeInstruction,
  type ImperativeInstruction,
} from './populate-plan-generator'

const VALID: ImperativeInstruction = {
  fontes: ['ARCHITECTURE.md', 'src/index.ts'],
  secoes: ['Convencao docs/ vs Runtime Assets', 'Modulos compartilhados'],
  honestidade: 'Cada afirmacao rastreia um arquivo lido. Honestidade > marketing.',
}

describe('formatImperativeInstruction', () => {
  test('renders markdown with 3 sections (Fontes, Secoes, honestidade)', () => {
    const out = formatImperativeInstruction(VALID)
    expect(out).toContain('**Fontes:**')
    expect(out).toContain('- ARCHITECTURE.md')
    expect(out).toContain('- src/index.ts')
    expect(out).toContain('**Secoes obrigatorias do output:**')
    expect(out).toContain('- Convencao docs/ vs Runtime Assets')
    expect(out).toContain('- Modulos compartilhados')
    expect(out).toContain('Honestidade > marketing.')
    // 2026-05-19 (Luiz/dev): heading `### Instrucao LLM` NAO sai daqui — G1.
    expect(out).not.toContain('### Instrucao LLM')
  })
})

describe('isImperativeInstruction', () => {
  test('returns true for a valid input with all 3 elements populated', () => {
    expect(isImperativeInstruction(VALID)).toBe(true)
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'apenas uma string'],
    ['missing fontes', { secoes: ['x'], honestidade: 'h' }],
    ['empty fontes', { fontes: [], secoes: ['x'], honestidade: 'h' }],
    ['fontes not strings', { fontes: [1, 2], secoes: ['x'], honestidade: 'h' }],
    ['missing secoes', { fontes: ['x'], honestidade: 'h' }],
    ['empty secoes', { fontes: ['x'], secoes: [], honestidade: 'h' }],
    ['empty honestidade', { fontes: ['x'], secoes: ['x'], honestidade: '' }],
    ['honestidade not string', { fontes: ['x'], secoes: ['x'], honestidade: 123 }],
  ])('returns false when %s', (_label, input) => {
    expect(isImperativeInstruction(input)).toBe(false)
  })
})
```

### Passo 6: Rodar testes

```powershell
bun test skills/init/lib/imperative-instruction.test.ts
```

**Esperado:** 12 testes passam (1 do render + 1 do guard happy + 10 do `test.each`).

Rodar a suite vizinha para confirmar zero regressao:

```powershell
bun test skills/init/lib/populate-plan-generator.test.ts
```

**Esperado:** mesma contagem que antes da fase (sem novos passes nem falhas — `LLM_INSTRUCTIONS`
intocado).

### Passo 7: Typecheck e lint

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos. Se `lint` reclamar de import ordering em
`imperative-instruction.test.ts`, ajustar.

---

## Gotchas

- **G1 (heading separado do formatter — pre-condicao da fase-02):**
  `formatImperativeInstruction` NAO emite `### Instrucao LLM`. O heading e adicionado pelo
  `renderLLMInstructionBlock` em fase-02. Esta separacao mantem o teste existente
  `expect(content).toContain('### Instrucao LLM')` em `populate-plan-generator.test.ts` verde
  apos fase-02 sem mudanca de assertion.
- **G2 (export obrigatorio):** `ImperativeInstruction` (tipo), `formatImperativeInstruction`
  e `isImperativeInstruction` precisam ser EXPORTADOS — fase-03 importa `isImperativeInstruction`
  em `tests/e2e/populate-plan-parity.test.ts` para o assert CA-06.
- **G3 (runtime guard estrito):** `isImperativeInstruction` checa que arrays nao sao vazios
  e que toda string e nao-vazia. Brechas tipo `fontes: ['']` (string vazia) falham — isso e
  intencional, alinhado a CA-06 "lista de Fontes especificas" (vazio nao e especifico).
- **G4 (path de import no teste):** o arquivo de teste fica em `skills/init/lib/` lado a
  lado do `populate-plan-generator.ts`. Import e `'./populate-plan-generator'` (relativo
  curto). Se o tsconfig tem alias `@/skills/...`, escolher uma convencao e registrar em
  MEMORY.md como `DI-Plano03-fase01-import-style`.
- **G5 (test.each label format):** o bun usa `test.each([[label, input], ...])` com `%s`
  para o label. Conferir que a versao do `bun:test` suporta — fallback: 10 `test(...)`
  explicitos.

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test skills/init/lib/imperative-instruction.test.ts` ANTES de
      escrever os helpers — falha com `Cannot find module './populate-plan-generator'` ou
      `formatImperativeInstruction is not a function`.

      Comando: `bun test skills/init/lib/imperative-instruction.test.ts`

      Resultado esperado: falha de import / referencia.

- [ ] **GREEN:** apos Passos 2-4 (tipo + 2 helpers no `populate-plan-generator.ts`), os 12
      testes passam.

      Comando: `bun test skills/init/lib/imperative-instruction.test.ts`

      Resultado esperado: `12 pass, 0 fail`.

### Checklist

- [ ] Tipo `ImperativeInstruction` exportado, posicionado entre comentario de secao e map
      `LLM_INSTRUCTIONS`.
- [ ] `formatImperativeInstruction` exportado, NAO emite `### Instrucao LLM`.
- [ ] `isImperativeInstruction` exportado, runtime guard estrito.
- [ ] Arquivo `imperative-instruction.test.ts` criado com 3 grupos: render, happy guard,
      `test.each` de invalidos (10 casos).
- [ ] `bun test skills/init/lib/imperative-instruction.test.ts` — 12 pass.
- [ ] `bun test skills/init/lib/populate-plan-generator.test.ts` — zero regressao (mesma
      contagem que antes).
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] Comentarios datados `2026-05-19 (Luiz/dev)` nos 3 simbolos novos.

### Comandos verificaveis

```powershell
# Testes novos
bun test skills/init/lib/imperative-instruction.test.ts
# Esperado: 12 pass, 0 fail

# Sem regressao no generator
bun test skills/init/lib/populate-plan-generator.test.ts
# Esperado: mesma contagem que antes da fase

# Suite vizinha (parity test) — Plano 01 ja entregou
bun test tests/e2e/populate-plan-parity.test.ts
# Esperado: 2 pass (sem mudanca — fase-03 estende)
```

---

## Criterio de Aceite

**Por maquina:**
- `skills/init/lib/populate-plan-generator.ts` contem `export interface ImperativeInstruction`
  (`Select-String -Pattern "export interface ImperativeInstruction" -Path skills/init/lib/populate-plan-generator.ts`
  retorna 1 match).
- `skills/init/lib/populate-plan-generator.ts` contem `export function formatImperativeInstruction`
  e `export function isImperativeInstruction`.
- `skills/init/lib/imperative-instruction.test.ts` existe e contem `describe('formatImperativeInstruction'`
  + `describe('isImperativeInstruction'`.
- `bun test skills/init/lib/imperative-instruction.test.ts` — exit 0, 12 pass.
- `bun run typecheck` exit 0.
- `bun run lint` exit 0.

**Por humano:**
- Diff legivel: 3 simbolos novos no `populate-plan-generator.ts` (tipo + 2 helpers),
  posicionados na secao certa do arquivo. Sem mudanca em `LLM_INSTRUCTIONS`,
  `DEFAULT_INSTRUCTION`, `llmInstructionFor`, `renderLLMInstructionBlock`.
- Comentarios `2026-05-19 (Luiz/dev)` apontando para Plano 03 fase-01 + CA-06.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

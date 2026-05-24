<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 03: Validator Post-Init Checks

**Plano:** 02 — Reentrada, Migracao V5 e Validator Pos-Init
**Sizing:** ~1.5h
**Depende de:** Plano 01 completo (path `knowledge/` estabelecido; AR-05 — harness-validate.ts ja atualizado em Plano 01 fase-06)
**Visual:** false

---

## O que esta fase entrega

Dois checks adicionados em `90-final-validation.ts`: (a) check primario bloqueante — se stack foi detectada e `.claude/knowledge/{stack}/INDEX.md` ausente, lanca `AbortError`; (b) check secundario nao-bloqueante — se `docs/knowledge/` orfao existe no projeto alvo, emite `WARN` com sunset v7.0.0. Ambos os checks rodam ANTES do walk de docs/ existente.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/90-final-validation.ts` | Modify | Adicionar 2 checks no inicio do `run()` (antes do walk de docs/) |
| `skills/init/lib/steps/90-final-validation.test.ts` | Create | Testes unitarios para os 2 novos checks |

---

## Implementacao

### Passo 1: Entender como o validator obtem stack detectada (G6 do plano)

Antes de escrever testes, verificar como o `90-final-validation.ts` pode saber qual stack foi detectada:

- `detectStackAndRegisterStep` (Step 03) escreve `STATE.md` em `ctx.cwd`
- `persistStackKnowledgeStep` (Step 03_1) escreve `.claude/stack.json` via `runStackKnowledgeInit`
- Opcao mais simples: ler `.claude/stack.json` (campo `primary` ou similar) — verificar schema antes de implementar
- Opcao alternativa: ler `STATE.md` — mais verboso mas disponivel antes do `.claude/` existir

Decisao de implementacao: usar `.claude/stack.json` se existir; se ausente (stack nao detectada), skip do check primario (stack === null nao e erro). Verificar o schema de `.claude/stack.json` no codigo de `detectStackAndRegisterStep` ou `runStackKnowledgeInit`.

### Passo 2: Escrever testes (TDD RED)

Criar `skills/init/lib/steps/90-final-validation.test.ts` (ou adicionar ao existente se ja houver):

```typescript
// 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — 2 checks no validator pos-init.
// AR-05: Step 90 final-validation eh o alvo deste plano; harness-validate.ts ja foi atualizado no Plano 01 fase-06.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as os from 'node:os'

// Importar apenas o runner interno (sem o Step wrapper) para testar de forma isolada
import { runFinalValidationChecks } from './90-final-validation'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'final-validation-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('90-final-validation: knowledge checks', () => {
  test('primary check: throws AbortError when stack detected but .claude/knowledge/{stack}/INDEX.md absent', async () => {
    // Arrange: stack.json com primary='nodejs-typescript' mas sem .claude/knowledge/
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'stack.json'),
      JSON.stringify({ primary: 'nodejs-typescript' }),
    )
    // Sem .claude/knowledge/nodejs-typescript/INDEX.md

    // Act + Assert
    await expect(
      runFinalValidationChecks(tmpDir)
    ).rejects.toMatchObject({
      name: 'AbortError',
      reason: expect.stringContaining('nodejs-typescript'),
    })
  })

  test('primary check: passes when stack detected and INDEX.md present', async () => {
    // Arrange: stack detectada E INDEX.md presente
    await fs.mkdir(path.join(tmpDir, '.claude', 'knowledge', 'nodejs-typescript'), { recursive: true })
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'stack.json'),
      JSON.stringify({ primary: 'nodejs-typescript' }),
    )
    await fs.writeFile(
      path.join(tmpDir, '.claude', 'knowledge', 'nodejs-typescript', 'INDEX.md'),
      '# Index',
    )

    // Act — nao deve lancar
    await expect(runFinalValidationChecks(tmpDir)).resolves.not.toThrow()
  })

  test('primary check: skipped when no stack.json (stack not detected — not an error)', async () => {
    // Sem .claude/stack.json → skip sem AbortError
    await expect(runFinalValidationChecks(tmpDir)).resolves.not.toThrow()
  })

  test('secondary check: emits WARN when docs/knowledge/ orphan exists (non-blocking)', async () => {
    // Arrange: docs/knowledge/ orfao presente
    await fs.mkdir(path.join(tmpDir, 'docs', 'knowledge'), { recursive: true })
    await fs.writeFile(
      path.join(tmpDir, 'docs', 'knowledge', 'README.md'),
      '# orphan',
    )
    const originalWarn = console.warn
    const warns: string[] = []
    console.warn = (...args: unknown[]) => { warns.push(args.join(' ')) }

    try {
      // Act — nao deve lancar (nao-bloqueante)
      await expect(runFinalValidationChecks(tmpDir)).resolves.not.toThrow()
      // Assert: WARN emitido com mensagem de sunset
      expect(warns.some(w => w.includes('docs/knowledge/'))).toBe(true)
      expect(warns.some(w => w.includes('v7.0.0'))).toBe(true)
    } finally {
      console.warn = originalWarn
    }
  })

  test('secondary check: no WARN when docs/knowledge/ absent', async () => {
    const originalWarn = console.warn
    const warns: string[] = []
    console.warn = (...args: unknown[]) => { warns.push(args.join(' ')) }

    try {
      await runFinalValidationChecks(tmpDir)
      expect(warns.filter(w => w.includes('docs/knowledge/'))).toHaveLength(0)
    } finally {
      console.warn = originalWarn
    }
  })
})
```

Rodar `bun run test -- --grep "90-final-validation: knowledge checks"` — deve falhar com "runFinalValidationChecks is not a function" ou similar.

### Passo 3: Extrair `runFinalValidationChecks` e adicionar os 2 checks

Em `skills/init/lib/steps/90-final-validation.ts`, adicionar a funcao exportada e integrar no `run()`:

```typescript
// 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — 2 checks pos-init.
// Check primario (bloqueante): stack detectada sem .claude/knowledge/{stack}/INDEX.md → AbortError.
// Check secundario (warning nao-bloqueante): docs/knowledge/ orfao → console.warn sunset v7.0.0.
// AR-05: este e o Step 90 runtime validator. harness-validate.ts ja foi atualizado no Plano 01 fase-06.
import { AbortError } from './abort-error'

/**
 * Executa os 2 checks de knowledge pos-init.
 * Exportada para teste unitario isolado (sem precisar do Step wrapper completo).
 * Lanca AbortError apenas no check primario.
 * Check secundario usa console.warn (nao-bloqueante).
 */
export async function runFinalValidationChecks(cwd: string): Promise<void> {
  // --- Check primario (bloqueante) ---
  // 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — CA-11.
  // Le .claude/stack.json para saber qual stack foi detectada.
  // Ausencia de stack.json = stack nao detectada = nao e erro (CA-06/primary=null).
  const stackJsonPath = path.join(cwd, '.claude', 'stack.json')
  const stackJsonExists = await fs.access(stackJsonPath).then(() => true).catch(() => false)

  if (stackJsonExists) {
    let primary: string | null = null
    try {
      const raw = await fs.readFile(stackJsonPath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'primary' in parsed &&
        typeof (parsed as Record<string, unknown>)['primary'] === 'string'
      ) {
        primary = (parsed as Record<string, unknown>)['primary'] as string
      }
    } catch {
      // JSON malformado — skip check primario (degrade gracefully)
      primary = null
    }

    if (primary !== null) {
      const indexPath = path.join(cwd, '.claude', 'knowledge', primary, 'INDEX.md')
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false)
      if (!indexExists) {
        throw new AbortError({
          code: 1,
          reason:
            `Stack detectada (${primary}) mas .claude/knowledge/${primary}/INDEX.md ausente. ` +
            `Re-rode /anti-vibe-coding:init ou verifique a matrix no plugin.`,
        })
      }
    }
  }

  // --- Check secundario (warning nao-bloqueante) ---
  // 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — CA-12.
  // SUNSET v7.0.0. Remover este check no bump major.
  // Comentario inline com data de decisao conforme PRD (data original: 2026-05-19).
  // 2026-05-20 (Luiz/dev): D8.C — sunset previsto v7.0.0. Remover este check no bump major.
  const orphanPath = path.join(cwd, 'docs', 'knowledge')
  const orphanExists = await fs.access(orphanPath).then(() => true).catch(() => false)
  if (orphanExists) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARN: docs/knowledge/ orfao detectado. ' +
      'Re-rode /anti-vibe-coding:init para migrar para .claude/knowledge/. ' +
      'Aviso sera removido em v7.0.0.',
    )
  }
}
```

Integrar no `finalValidationStep.run()` — adicionar chamada a `runFinalValidationChecks` ANTES do walk de docs/:

```typescript
export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return { mutated: false, summary: 'dry-run: validator skipped (would check allowlist)' }
    }

    // 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — checks de knowledge pos-init.
    // Primario: bloqueante (AbortError se stack detectada sem INDEX.md).
    // Secundario: warning nao-bloqueante (docs/knowledge/ orfao).
    // Nota: AbortError do check primario NAO e capturado pelo try/catch abaixo (rethrow).
    await runFinalValidationChecks(ctx.cwd)

    try {
      const allowlist = buildAllowlistFromTemplateManifest()
      const docs = await walkDocs(ctx.cwd)
      const unallowed = docs.filter((p) => !isAllowed(p, allowlist))

      if (unallowed.length === 0) {
        return { mutated: false, summary: 'validator: 0 warnings — scaffold canonico intacto' }
      }

      const grouped = groupWarnings(unallowed)
      const summary = `validator: ${grouped.length} warnings (${unallowed.length} paths fora do scaffold canonico)`
      return { mutated: false, summary }
    } catch (e) {
      // 2026-05-19 (Luiz/dev): Plano 04 fase-04 — degrade gracefully para IO errors.
      // AbortError do check primario acima nao chega aqui (rethrow antes do try).
      // Final-validation NUNCA aborta por IO — Step 91 (ja rodado antes) preserva seus artefatos.
      if (e instanceof AbortError) throw e  // propaga abort do check primario
      const reason = e instanceof Error ? e.message : String(e)
      return { mutated: false, summary: `validator: skipped due to IO error (${reason})` }
    }
  },
}
```

Atencao critica: o `try/catch` existente no `finalValidationStep.run()` cobre apenas o walk de docs/. O `runFinalValidationChecks` roda ANTES do `try`. Se `runFinalValidationChecks` lancar `AbortError`, ele NAO e capturado pelo try/catch — propaga corretamente para o dispatcher. O comentario `// AbortError do check primario nao e capturado pelo try/catch abaixo (rethrow)` documenta essa intencao.

---

## Gotchas

- **G5 do plano (try/catch existente engolindo AbortError):** O `finalValidationStep` atual tem um `try/catch` que captura qualquer erro do walk de docs/ e degrada gracefully. Se os novos checks forem colocados DENTRO desse try/catch, o AbortError sera capturado e retornado como summary de IO error em vez de abortar. Solucao: colocar `runFinalValidationChecks(ctx.cwd)` ANTES do try/catch.

- **G6 do plano (leitura de stack):** Usar `.claude/stack.json` como fonte de stack. Verificar o schema antes de implementar — o campo pode ser `primary`, `stackId`, `detected`, etc. Se o schema for diferente, ajustar o type guard. Nao assumir — ler o arquivo de producao.

- **Local — AbortError no check primario vs modo warning do Step 90:** O Step 90 atual e descrito como "nao aborta init" (modo warning). O check primario QUEBRA essa invariante propositalmente (D8.C). Documentar no comentario do step que o check primario e a excecao explicita ao modo warning.

- **Local — `console.warn` em testes:** O teste usa monkey-patch de `console.warn`. Garantir que o `finally` restaura o original mesmo se o teste falhar. O padrao `try/finally` no teste cobre isso.

- **Local — `path` importado no topo:** `runFinalValidationChecks` usa `path` e `fs` que ja estao importados no topo de `90-final-validation.ts`. Nao duplicar imports.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos e FALHAM (funcao `runFinalValidationChecks` nao exportada)
  - Comando: `bun run test -- --grep "90-final-validation: knowledge checks"`
  - Resultado esperado: erro de import ou assertion failure

- [ ] **GREEN:** Implementacao completa, todos os 5 testes PASSAM
  - Comando: `bun run test -- --grep "90-final-validation: knowledge checks"`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `runFinalValidationChecks` exportada de `90-final-validation.ts`
- [ ] Check primario: AbortError com `code: 1` e mensagem contendo nome da stack
- [ ] Check primario: skip quando `.claude/stack.json` ausente (stack nao detectada)
- [ ] Check primario: skip quando `primary === null` no JSON
- [ ] Check secundario: `console.warn` com mensagem exata incluindo "v7.0.0"
- [ ] Check secundario: nao-bloqueante (nao lanca excecao)
- [ ] `await runFinalValidationChecks(ctx.cwd)` posicionado ANTES do try/catch existente
- [ ] try/catch existente tem `if (e instanceof AbortError) throw e` (ou rethrow equivalente)
- [ ] Comentario inline: `// 2026-05-20 (Luiz/dev): D8.C — sunset previsto v7.0.0. Remover este check no bump major.`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun tsc --noEmit`

---

## Criterio de Aceite

**CA-11 (validator primario bloqueia):**

**Por maquina:**
- `bun run test -- --grep "throws AbortError when stack detected"` retorna `1 passed`
- `bun run test -- --grep "passes when stack detected and INDEX.md present"` retorna `1 passed`

**CA-12 (validator secundario so avisa):**

**Por maquina:**
- `bun run test -- --grep "emits WARN when docs/knowledge/ orphan exists"` retorna `1 passed`
- `bun run test -- --grep "no WARN when docs/knowledge/ absent"` retorna `1 passed`

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

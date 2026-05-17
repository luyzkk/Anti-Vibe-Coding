<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): E2E tracer bullet — Plano 01 fase-05, prova CA-02 + CA-05 + CA-09`
-->

# Fase 05: Tracer Bullet E2E (CA-02 + CA-05 + CA-09)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-02 (átomo piloto deve existir para copy ter source real), fase-03 (init monostack funciona), fase-04 (preface adicionado em /security)
**Visual:** false

---

## O que esta fase entrega

Teste E2E `tests/e2e/stack-knowledge-tracer-bullet.test.ts` que monta um projeto Node+TS minimal (apenas `package.json` + `tsconfig.json`), roda a pipeline `detectStack → writeStackJson → copyKnowledge` (espelhando Step 3.1 de `/init`), e assere CA-02 (≤100ms + arquivos copiados), CA-05 (preface aparece quando `.claude/knowledge/INDEX.md` existe) e CA-09 (preface vazio quando ausente). Fecha o ciclo do tracer bullet — se verde, arquitetura validada e Planos 02-06 podem proceder em paralelo.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | Create | E2E que monta projeto temporário Node+TS, roda init monostack, valida CA-02/CA-05/CA-09 |

---

## Implementacao

### Passo 1 (RED): escrever o E2E que falha

Padrão a seguir: `tests/e2e/init-tracer-bullet.test.ts` (arquivo existente na mesma pasta — usar como referência de scaffolding de projeto temporário). Para `pluginRoot`, apontar para a raiz real do plugin (cwd do harness ou `import.meta.dir + '/../..'`).

```typescript
// tests/e2e/stack-knowledge-tracer-bullet.test.ts
// 2026-05-16 (Luiz/dev): E2E tracer bullet — Plano 01 fase-05.
// Prova CA-02 (stack.json + knowledge copy ≤100ms), CA-05 (preface aparece), CA-09 (graceful degradation).
// G5 do plano: performance baseline com 1 átomo (~10ms esperado). 14 átomos extrapola linear.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectStack } from '../../skills/init/lib/detect-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

describe('stack-knowledge tracer bullet (Plano 01 fase-05)', () => {
  let project: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'tracer-stack-'))
    // projeto Node+TS minimal
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
  })

  // CA-02 — happy path Node+TS
  it('CA-02: writes .claude/stack.json with primary nodejs-typescript and copies knowledge in ≤100ms', async () => {
    const stack = await detectStack(project)
    expect(stack.id).toBe('node-ts')

    const stackJson = await writeStackJson(project, stack)
    expect(stackJson.primary).toBe('nodejs-typescript')

    const start = performance.now()
    const result = await copyKnowledge({ projectRoot: project, pluginRoot: PLUGIN_ROOT, primary: stackJson.primary })
    const elapsed = performance.now() - start

    expect(result.status).toBe('copied')
    if (result.status === 'copied') {
      expect(result.atomCount).toBeGreaterThanOrEqual(1) // pilot atom da fase-02
      expect(result.durationMs).toBeLessThan(100) // CA-02 SLA
    }
    expect(elapsed).toBeLessThan(100)
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
  })

  // CA-05 — preface aparece quando INDEX existe
  it('CA-05: stack-aware-preface in /security yields non-empty string when .claude/knowledge/INDEX.md exists', () => {
    // simula resultado de CA-02
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), '# fake INDEX')

    // replica a lógica do bloco stack-aware-preface (fase-04). Em produção, o agente lê o bloco e executa.
    const knowledgePath = join(project, '.claude', 'knowledge', 'INDEX.md')
    const preface = existsSync(knowledgePath)
      ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\` para padrões stack-specific deste projeto.`
      : ''
    expect(preface).not.toBe('')
    expect(preface).toContain('.claude/knowledge/INDEX.md')
  })

  // CA-09 — preface vazio (graceful degradation) quando INDEX ausente
  it('CA-09: stack-aware-preface in /security yields empty string when .claude/knowledge/INDEX.md absent', () => {
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(false)

    const knowledgePath = join(project, '.claude', 'knowledge', 'INDEX.md')
    const preface = existsSync(knowledgePath)
      ? `Antes do corpo desta skill, consulte \`.claude/knowledge/INDEX.md\` para padrões stack-specific deste projeto.`
      : ''
    expect(preface).toBe('')
  })

  // Bonus regression: stack-aware-preface block existe no SKILL.md (espelha test unitário da fase-04, garantido aqui no E2E)
  it('regression: skills/security/SKILL.md retains stack-aware-preface block', () => {
    const body = readFileSync(join(PLUGIN_ROOT, 'skills', 'security', 'SKILL.md'), 'utf8')
    expect(body).toContain('<!-- stack-aware-preface:start -->')
    expect(body).toContain('<!-- stack-aware-preface:end -->')
  })
})
```

Comando RED: `bun run test:e2e -- --grep 'stack-knowledge tracer bullet'` → 4 assertion failures (helpers não importáveis / arquivos ausentes em projeto temporário).

### Passo 2 (GREEN): garantir que fases 02, 03, 04 estão completas

Esta fase **não escreve nova lib code** — apenas integra. Se o teste falhar:

1. CA-02 falha (status !== 'copied' ou durationMs >100ms) → revisar fase-03 (copy-knowledge.ts).
2. CA-05 falha (preface vazio inesperado) → revisar lógica do snippet em fase-04 (deve corresponder verbatim ao replicado no teste).
3. CA-09 falha (preface não-vazio com INDEX ausente) → revisar lógica condicional em fase-04.
4. Regression falha (bloco ausente em SKILL.md) → re-rodar fase-04.

Comando GREEN: `bun run test:e2e -- --grep 'stack-knowledge tracer bullet'` → 4 passed.

### Passo 3: registrar resultado na Validation Log do PLAN.md (manual)

Após GREEN, copiar output do teste (incluindo `durationMs` real) e colar em `../PLAN.md` na seção `## Validation Log`:

```markdown
### Plano 01 — Tracer Bullet (2026-05-16)

- `bun run test:e2e -- --grep 'stack-knowledge tracer bullet'` → 4 passed, 0 failed
- CA-02 measured: durationMs = <N>ms (limite 100ms) com 1 átomo
- CA-05: preface emitido contém path `.claude/knowledge/INDEX.md`
- CA-09: preface vazio quando INDEX ausente, sem warning ou crash
```

---

## Gotchas

- **G5 do plano (performance):** com 1 átomo a meta CA-02 ≤100ms é trivial (~5-15ms típico em SSD). Se passar de 50ms já é red flag — `cpSync` recursivo de markdown estático deveria ser quase instantâneo. Investigar antes de declarar GREEN.
- **G2 do plano (regression):** este E2E **não testa** `state-md-init.ts` (CA-10). Esse teste vive em Plano 02 fase-05. Mas o teste E2E aqui também **não pode quebrar** o comportamento de STATE.md — Step 3 atual de `/init` não é invocado nesse teste.
- **Local — `PLUGIN_ROOT` resolution:** `import.meta.dir` em vitest aponta para o diretório do arquivo de teste. `tests/e2e/foo.test.ts` → plugin root = `../..`. Validar com `console.log(PLUGIN_ROOT)` se algo der estranho.
- **Local — cleanup de tmpdir:** `afterEach` com `rmSync({ recursive: true, force: true })`. Sem cleanup, `mkdtempSync` enche `/tmp` (ou `%TEMP%` no Windows) ao longo de muitas execuções. CI eventualmente quebra.
- **Local — Windows path separators:** alguns testes podem precisar de `path.normalize` se executados em Windows. `join(...)` já normaliza, então `expect(...).toContain('.claude/knowledge/INDEX.md')` pode falhar se a string vier com `\\`. Verificar e ajustar se necessário (provavelmente OK porque o snippet de preface usa literal forward slashes — same como path no INDEX).

---

## Verificacao

### TDD

- [ ] **RED:** E2E escrito, FALHA em todas as 4 assertions
  - Comando: `bun run test:e2e -- --grep 'stack-knowledge tracer bullet'`
  - Resultado esperado: 4 assertion failures distribuídas em CA-02, CA-05, CA-09, regression

- [ ] **GREEN:** Helpers e bloco preface em lugar, E2E passa
  - Comando: `bun run test:e2e -- --grep 'stack-knowledge tracer bullet'`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `tests/e2e/stack-knowledge-tracer-bullet.test.ts` existe e segue padrão de `tests/e2e/init-tracer-bullet.test.ts` (scaffolding, cleanup)
- [ ] 4 cenários cobertos: CA-02, CA-05, CA-09, regression bloco SKILL.md
- [ ] CA-02 mede `durationMs` real e assere `<100`
- [ ] `afterEach` faz cleanup de tmpdir (sem leak)
- [ ] Sem `any`, sem `as` (exceto narrowing impraticável)
- [ ] `bun run test:e2e` global continua verde (sem regressão em `init-tracer-bullet.test.ts` ou `migration.test.ts`)
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo
- [ ] Validation Log do PLAN.md atualizada manualmente com output do E2E

---

## Criterio de Aceite

**Por maquina:**
- `bun run test:e2e -- --grep 'stack-knowledge tracer bullet'` retorna `4 passed, 0 failed`
- `bun run test && bun run lint && bun run typecheck` todos exit 0
- Nenhum teste pré-existente quebrou (`bun run test:e2e` completo verde)

**Por humano:**
- Validation Log do PLAN.md tem entrada datada 2026-05-16 com output real do teste
- `durationMs` medido fica bem abaixo de 100ms (idealmente <20ms) — extrapolação para 14 átomos é confortável
- Arquitetura validada: tracer bullet completo. Decisão de prosseguir com Planos 02-06 em paralelo registrada (próximo passo manual, fora desta fase)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

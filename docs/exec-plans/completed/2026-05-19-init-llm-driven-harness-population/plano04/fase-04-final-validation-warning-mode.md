<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Final Validation — Warning Mode

**Plano:** 04 — Reentrada + Validator allowlist + Audit Step 12
**Sizing:** 0.5h
**Depende de:** fase-03 (allowlist precisa existir para validar warning mode)
**Visual:** false

---

## O que esta fase entrega

Garantia explicita de que Step 90 NUNCA lanca `AbortError` por warnings da allowlist. Sempre retorna `{ mutated: false, summary }`, permitindo que Step 91 (ja rodado ANTES, por Plano 01 fase-01) tenha o PLAN.md de populate persistido mesmo apos warning (CA-07 Bug C — convergencia).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/90-final-validation.ts` | Modify | Confirmar que nenhum branch lanca AbortError; remover `import { AbortError }` se restou da fase-03 |
| `skills/init/lib/steps/90-final-validation.test.ts` | Modify | Adicionar teste explicito `does not throw under any input` + teste de CA-07 |
| `skills/init/lib/run-init.test.ts` | Modify | Adicionar test E2E: cwd com warnings -> `runInit` retorna sucesso, PLAN.md em `docs/exec-plans/active/.../plano-populate-harness/` persiste |

---

## Implementacao

### Passo 1: garantir nenhum throw em Step 90

Revisar o codigo escrito na fase-03. Final-validation TEM que:
- Retornar `{ mutated: false, summary }` em todos os branches.
- NAO importar `AbortError` (se nao usar, lint remove).
- Em caso de erro de IO (ex: `docs/` ausente), retornar summary descritiva — nao throw.

Patch defensivo:

```typescript
// skills/init/lib/steps/90-final-validation.ts
// (cabecalho e walkDocs inalterados — vindos da fase-03)

export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return { mutated: false, summary: 'dry-run: validator skipped (would check allowlist)' }
    }

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
      // Final-validation NUNCA aborta — degrade gracefully para que Step 91 (ja rodado)
      // tenha seus artefatos preservados. PRD MH-08 modo warning + CA-07 convergencia.
      const reason = e instanceof Error ? e.message : String(e)
      return { mutated: false, summary: `validator: skipped due to IO error (${reason})` }
    }
  },
}
```

### Passo 2: teste explicito de "never throws"

```typescript
// skills/init/lib/steps/90-final-validation.test.ts (acrescimo)
it('never throws — even when docs/ is missing entirely', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'val-nodocs-'))
  try {
    const report = await finalValidationStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(typeof report.summary).toBe('string')
  } finally {
    await fs.rm(cwd, { recursive: true, force: true })
  }
})

it('CA-07: warning emitted but report is not an AbortError instance', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'val-warn-noabort-'))
  try {
    await fs.mkdir(path.join(cwd, 'docs'), { recursive: true })
    await fs.writeFile(path.join(cwd, 'docs/CUSTOM.md'), '# custom')
    let thrown = false
    try {
      await finalValidationStep.run({ cwd, args: [], flags: {} })
    } catch {
      thrown = true
    }
    expect(thrown).toBe(false)
  } finally {
    await fs.rm(cwd, { recursive: true, force: true })
  }
})
```

### Passo 3: teste E2E em `run-init.test.ts`

```typescript
// skills/init/lib/run-init.test.ts (acrescimo)
it('CA-07 convergencia: Step 91 PLAN.md persistido mesmo com warnings em Step 90', async () => {
  const cwd = await makeGreenfieldFixture()
  // Adiciona um doc custom que provoca warning
  await fs.mkdir(path.join(cwd, 'docs/custom'), { recursive: true })
  await fs.writeFile(path.join(cwd, 'docs/custom/legitimo.md'), '# doc do usuario')

  const result = await runInit({ cwd, args: [] })

  // Step 91 (rodando ANTES do Step 90 desde Plano 01 fase-01) deve ter gerado o plano
  const planExists = await fs
    .access(path.join(cwd, 'docs/exec-plans/active'))
    .then(() => true)
    .catch(() => false)
  expect(planExists).toBe(true)

  // E pipeline nao abortou
  expect(result.kind).toBe('ok')
})
```

---

## Gotchas

- **G8 do plano:** Wording byte-identico do harness antigo (AbortError com "WARN: harness:validate failed") foi RELAXADO desde fase-03. Confirmar que nenhum teste fixture ainda assert nesse wording.
- **Local:** O `try/catch` defensivo nao pode esconder erro de programacao (ex: `TypeError` no walk). Em prod, log preserva via `summary`. Em teste, summary contem prefixo `validator: skipped due to IO error` — assert presenca.
- **Local:** Step 91 ja rodou ANTES (registry: ordem `... finalValidation, generatePopulatePlan`). Confirmar que Plano 01 fase-01 ja inverteu para `... generatePopulatePlan, finalValidation`. Se nao, levantar BUG e bloquear.

---

## Verificacao

### TDD

- [ ] **RED:** Acrescimos nos tests passam a referenciar comportamento ainda nao implementado (catch global) -> FAIL no caso "never throws"
- [ ] **GREEN:** Apos try/catch defensivo, todos passam

### Checklist

- [ ] `grep -n "throw new AbortError" skills/init/lib/steps/90-final-validation.ts` retorna 0 hits
- [ ] `bun test skills/init/lib/steps/90-final-validation.test.ts` -> todos pass (incluindo novos casos)
- [ ] `bun test skills/init/lib/run-init.test.ts` -> caso CA-07 passa
- [ ] Pipeline E2E em projeto com custom doc nao aborta
- [ ] Lint limpo

---

## Criterio de Aceite

**Por maquina:**
- `grep -n "throw new AbortError" skills/init/lib/steps/90-final-validation.ts` retorna 0 linhas
- Fixture com `docs/custom/legitimo.md` rodada via `runInit` -> resultado `kind: 'ok'` e `docs/exec-plans/active/<plano-populate>/PLAN.md` existe no disco (CA-07 convergencia comprovada)

**Por humano (se aplicavel):**
- Inspecionar log final do `/init` em projeto real: ve `validator: N warnings (...)` em vez de mensagem de abort

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou
secao do PRD).
-->

# Fase 02: Subcomando `check [--strict]` (backward compat + 3 regras novas)

**Plano:** 03 — Subcomandos + Patches
**Sizing:** 1.5h
**Depende de:** fase-01 (skill compound-engineering operacional com parser de args)
**Visual:** false

---

## O que esta fase entrega

Subcomando `compound-engineering check [--strict]`: default invoca `scripts/compound-check.ts` do target preservando comportamento atual (CA-09, RNF-01); `--strict` ativa 3 regras adicionais P3 — AGENTS link, plan-generator sections, active-plan hygiene (CA-10).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/compound-engineering/lib/checker.ts` | Create | Wrapper que invoca `compound-check.ts` do target via `Bun.spawn`/`child_process` e passa flag `--strict` se aplicavel |
| `skills/compound-engineering/lib/checker.test.ts` | Create | Testes cobrindo CA-09 (default backward compat) e CA-10 (strict ativa regras) |
| `skills/compound-engineering/SKILL.md` | Modify | Adiciona case `check` no parser de args |
| `skills/compound-engineering/assets/scripts/compound-check.ts.tpl` | Verify | P3 inlinado pelo Plano 02 fase-01 — esta fase APENAS valida que template tem as 3 regras `--strict`. Se faltar, sinalizar regressao do Plano 02. |

---

## Implementacao

### Passo 1: Validar P3 ja inlinado em `compound-check.ts.tpl`

Pre-condicao herdada do Plano 02 fase-01: `skills/compound-engineering/assets/scripts/compound-check.ts.tpl` ja contem as 3 regras P3:

1. **agents-link**: AGENTS.md tem link para `docs/COMPOUND_ENGINEERING.md`
2. **plan-generator-sections**: `scripts/new-plan.ts.tpl` (ou equivalente) tem 4 secoes (`## Compound Opportunity | ## Review Checklist | ## Validation Log | ## Lessons Captured`)
3. **active-plan-hygiene**: planos ativos em `docs/exec-plans/active/` tem secoes preenchidas (nao placeholder vazio)

Acao: grep do tpl por strings dessas 3 regras. Se ausentes, ABORTAR esta fase e abrir issue no Plano 02 fase-01 (regressao).

### Passo 2: Implementar `checker.ts`

```typescript
// 2026-05-23 (Luiz/dev): wrapper de compound-check do target — PRD RF-05 + D12
import path from 'node:path'

export type CheckOpts = { strict: boolean }
export type CheckResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCompoundCheck(
  targetRoot: string,
  opts: CheckOpts,
): Promise<CheckResult> {
  const scriptPath = path.join(targetRoot, 'scripts', 'compound-check.ts')
  const args = ['run', scriptPath]
  if (opts.strict) args.push('--strict')

  // 2026-05-23 (Luiz/dev): Bun.spawn captura stdout/stderr — backward compat RNF-01
  const proc = Bun.spawn(['bun', ...args], {
    cwd: targetRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { exitCode, stdout, stderr }
}
```

### Passo 3: Plugar no SKILL.md

Caso `check` no parser de args:

```markdown
### Subcomando: check

Quando `args` comeca com `check`:

1. Parse `--strict` em `args.includes('--strict')`.
2. Invoca `runCompoundCheck(targetRoot, { strict })`.
3. Repassa exit code e output (stdout/stderr) ao caller.
4. Se `--strict` e qualquer das 3 regras falhar, output deve incluir prefixo identificador da regra: `[agents-link]`, `[plan-generator-sections]`, `[active-plan-hygiene]`.
```

### Passo 4: Validar copy das mensagens de erro `--strict`

Exemplo literal exigido por CA-10:

```
[agents-link] AGENTS.md: missing link to docs/COMPOUND_ENGINEERING.md
```

Verificar que `compound-check.ts.tpl` emite essa string EXATA quando regra falha. Se nao, ajustar o template (escopo do Plano 02 fase-01 ou correcao pontual aqui).

---

## Gotchas

- **G3 do README do Plano 02 (CA-17):** `checker.ts` NAO pode importar nada de `skills/init/`. Skill compound-engineering e isolada. Validar via grep ao fim da fase.
- **Local — backward compat (RNF-01):** comportamento atual de `compound:check` sem flag e `frontmatter + sections` apenas. Verificar via teste E2E: projeto com `AGENTS.md` sem link compound passa em `check` (default) e falha em `check --strict`.
- **Local — Bun.spawn em Windows:** path com forward slash; `cwd: targetRoot` resolve corretamente em ambos.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `checker.test.ts` falha por assertion antes de implementar
  - Comando: `bun test skills/compound-engineering/lib/checker.test.ts --grep 'strict ativa regra agents-link'`
  - Resultado esperado: `Expected stderr to match /\[agents-link\]/`, recebido `""` (assertion failure)

- [ ] **GREEN:** `checker.ts` implementado, testes passam
  - Comando: `bun test skills/compound-engineering/lib/checker.test.ts`
  - Resultado esperado: `2 passed, 0 failed` (CA-09, CA-10)

### Checklist

- [ ] CA-09: projeto sem link compound em AGENTS.md passa em `check` (sem `--strict`)
- [ ] CA-10: mesmo projeto FALHA em `check --strict` com `[agents-link] AGENTS.md: missing link to docs/COMPOUND_ENGINEERING.md`
- [ ] `compound-check.ts.tpl` contem as 3 regras P3 (grep)
- [ ] `checker.ts` zero imports cross-skill `from '../../init/`
- [ ] Testes passam: `bun test skills/compound-engineering/lib/checker.test.ts`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/compound-engineering/lib/checker.test.ts` retorna 2 passed
- Em fixture brownfield sem `[Compound](./docs/COMPOUND_ENGINEERING.md)` no AGENTS.md: `checker` default exit 0; `checker --strict` exit != 0 com regex `/\[agents-link\]/` no stderr

**Por humano:**
- CI atual de Carreirarte v3 (que roda `bun run compound:check` pre-commit) continua verde apos esta release (CA-09)

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

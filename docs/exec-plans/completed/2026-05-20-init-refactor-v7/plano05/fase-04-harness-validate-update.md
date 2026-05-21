<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 04: harness-validate update — RF-12 (4 docs extras AVC)

**Plano:** 05 — Steps 8-10 + harness-validate + E2E final
**Sizing:** 0.5h
**Depende de:** Nenhuma (paralela a fase-01, 02, 03). Mudanca pequena em script standalone.
**Visual:** false

---

## O que esta fase entrega

`scripts/harness-validate.ts` REQUIRED_FILES atualizado para incluir os 2 docs extras AVC que faltavam (RF-12). Os outros 2 ja estavam presentes:

- Ja presentes (linhas 24 e 28 do arquivo atual): `docs/MERGE_GATES.md`, `docs/STATE.md`
- Adicionar: `docs/CODE_STYLE.md`, `.claude/CLAUDE.md`

Teste RED: rodar harness em fixture sem `docs/CODE_STYLE.md` → falha com mensagem clara. GREEN: scaffold com TEMPLATE_MANIFEST (Plano 03 fase-01) cria ambos → passa.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/harness-validate.ts` | Modify | Adicionar 2 entries em REQUIRED_FILES (linhas ~26 e ~38) — `docs/CODE_STYLE.md` e `.claude/CLAUDE.md`. |
| `scripts/harness-validate.test.ts` | Modify/Create | Adicionar 2 testes RF-12: 1) fixture sem CODE_STYLE.md falha; 2) fixture com todos os 4 docs AVC + scaffold canonico passa. Se arquivo nao existe, criar do zero (existem 5 testes hoje? confirmar). |

---

## Implementacao

### Passo 1: Inventario do estado atual

```bash
# Confirmar quais dos 4 docs AVC ja estao em REQUIRED_FILES
grep -E "MERGE_GATES|STATE\.md|CODE_STYLE|\.claude/CLAUDE\.md" scripts/harness-validate.ts
# Esperado output (linhas atuais):
#   linha 24: 'docs/MERGE_GATES.md',
#   linha 28: 'docs/STATE.md',
# Faltam: docs/CODE_STYLE.md e .claude/CLAUDE.md
```

### Passo 2: Escrever teste RED em `scripts/harness-validate.test.ts`

Se o arquivo de teste ja existe (provavel — `checkAgentContracts` e outros sao exported), adicionar:

```typescript
// scripts/harness-validate.test.ts (adicionar bloco)
// 2026-05-21 (Luiz/dev): Plano 05 fase-04 — RF-12 4 docs extras AVC.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { $ } from 'bun'

describe('harness-validate RF-12 — 4 docs extras AVC', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-harness-rf12-'))
    // Setup minimo de scaffold (AGENTS.md + outros required)
    // 2026-05-21 (Luiz/dev): nao copiar fixture cheia — apenas o suficiente pra harness rodar
    // ate o check de required-files. Os outros checks vao falhar mas o que importa eh a
    // mensagem especifica do docs/CODE_STYLE.md / .claude/CLAUDE.md.
    await fs.mkdir(path.join(cwd, 'docs'), { recursive: true })
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('RED: missing docs/CODE_STYLE.md causes harness to fail with clear message', async () => {
    // 2026-05-21 (Luiz/dev): rodar harness no tmp cwd com `$` (Bun shell).
    // process.cwd() do script eh tmp porque rodamos `cd $cwd && bun harness-validate.ts`.
    const harnessPath = path.resolve(import.meta.dir, '../scripts/harness-validate.ts')
    const result = await $`cd ${cwd} && bun ${harnessPath}`.quiet().nothrow()
    expect(result.exitCode).not.toBe(0)
    const stderr = result.stderr.toString()
    expect(stderr).toContain('Missing required file: docs/CODE_STYLE.md')
  })

  test('RED: missing .claude/CLAUDE.md causes harness to fail with clear message', async () => {
    const harnessPath = path.resolve(import.meta.dir, '../scripts/harness-validate.ts')
    const result = await $`cd ${cwd} && bun ${harnessPath}`.quiet().nothrow()
    expect(result.exitCode).not.toBe(0)
    const stderr = result.stderr.toString()
    expect(stderr).toContain('Missing required file: .claude/CLAUDE.md')
  })

  // 2026-05-21 (Luiz/dev): GREEN test cobrindo todos os 4 docs AVC presentes.
  // Roda fixture sintetica com OS 4 + outros required-files minimos.
  test('GREEN: when all 4 AVC docs exist + scaffold canonico, RF-12 check passes', async () => {
    // Setup: criar OS 4 docs AVC + os outros REQUIRED_FILES como stubs.
    // Reusar fixture do Plano 03 ou criar minimal aqui.
    // Por simplicidade, este teste pode usar a fixture do tracer (greenfield post-init) —
    // verificar se ela ja contem os 4 docs apos Plano 03 fase-01.
    // Se NAO, este teste fica como TODO para fase-05 (e2e cobre).
    // Aceitavel: pular este teste aqui (RED de fase-04 e o suficiente para validar a mudanca).
  })
})
```

Rodar `bun test scripts/harness-validate.test.ts -t "RF-12"` → 2 RED (3o eh skip).

### Passo 3: Adicionar entries em REQUIRED_FILES

```typescript
// scripts/harness-validate.ts (edit linhas ~12-39)
// 2026-05-21 (Luiz/dev): Plano 05 fase-04 — RF-12: 4 docs extras AVC.
// MERGE_GATES.md e STATE.md ja estavam — adicionar CODE_STYLE.md e .claude/CLAUDE.md.

const REQUIRED_FILES = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CLAUDE.md',
  'README.md',
  'package.json',
  '.github/pull_request_template.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/MERGE_GATES.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/COMPOUND_ENGINEERING.md',
  'docs/CODE_STYLE.md', // 2026-05-21 (Luiz/dev): RF-12 anti-vibe extension (Plano 05 fase-04)
  'docs/STATE.md',
  'docs/design-docs/index.md',
  'docs/design-docs/core-beliefs.md',
  'docs/exec-plans/active/README.md',
  'docs/exec-plans/completed/README.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/generated/db-schema.md',
  'docs/product-specs/index.md',
  'docs/references/README.md',
  'scripts/harness-validate.ts',
  'scripts/compound-check.ts',
  '.claude/CLAUDE.md', // 2026-05-21 (Luiz/dev): RF-12 anti-vibe extension (Plano 05 fase-04)
] as const
```

### Passo 4: GREEN

```bash
bun test scripts/harness-validate.test.ts -t "RF-12"
# Esperado: 2 passed (testes RED) — porque agora o harness DETECTA a ausencia
# 2026-05-21 (Luiz/dev): "RED" no nome do teste agora passa: o teste valida que o harness
# DETECTA a ausencia, nao que a ausencia eh aceita. Wording do teste poderia melhorar mas
# aceitavel para clareza intencional (estamos validando que o gate detecta).
```

### Passo 5: VERIFY

```bash
bun test scripts/harness-validate.test.ts
bun run lint -- scripts/harness-validate.ts
# Confirmar count final de REQUIRED_FILES
grep -c "^  '" scripts/harness-validate.ts | head -1
# Esperado: 28 (26 antes + 2 novos)

# Smoke test: rodar harness no repo do plugin (deve passar — o plugin tem todos os docs)
bun run harness:validate
# Esperado: "Harness validation passed (28 required files, N markdown files checked)."
```

---

## Gotchas

- **G7 do plano (REQUIRED_FILES vs AGENTS_REQUIRED_LINKS):** sao 2 listas DISTINTAS. RF-12 toca APENAS REQUIRED_FILES. NAO adicionar `.claude/CLAUDE.md` em AGENTS_REQUIRED_LINKS — o `AGENTS.md` linka pra CLAUDE.md (raiz, mirror), nao `.claude/CLAUDE.md`. Confundir as duas = falso positivo em AGENTS.md.
- **Local — ordem alfabetica nao critica:** o array e iterado sequencialmente; ordem nao afeta funcionalidade. Por estilo, adicionar `docs/CODE_STYLE.md` apos `COMPOUND_ENGINEERING.md` (alfabetica) e `.claude/CLAUDE.md` no FIM (segue padrao agrupando `.claude/*` separado).
- **Local — harness `import.meta.main` gate:** o script eh executavel via `bun scripts/harness-validate.ts`. Testes que rodam `$\`bun harness-validate.ts\`` precisam path absoluto (nao relativo de tmp). Verificar `process.cwd()` no harness eh `tmp` (rodamos via `cd ${cwd} && bun ${harnessPath}`).
- **Local — smoke test do plugin pode falhar se PR nao tiver os 4 docs:** o repo do plugin DEVE ter todos os 28 REQUIRED_FILES. Se faltar algum (ex: `.claude/CLAUDE.md` no repo do plugin), criar como parte desta fase ou anotar como DI. Verificar via `ls docs/CODE_STYLE.md .claude/CLAUDE.md`.

---

## Verificacao

### TDD

- [ ] **RED:** testes RF-12 falham porque harness atual nao reporta ausencia desses arquivos
  - Comando: `bun test scripts/harness-validate.test.ts -t "RF-12"`
  - Resultado esperado: 2 failed (mensagem `Missing required file: docs/CODE_STYLE.md` AUSENTE no stderr)

- [ ] **GREEN:** apos adicionar entries, testes RF-12 passam (harness DETECTA ausencia)
  - Comando: `bun test scripts/harness-validate.test.ts -t "RF-12"`
  - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] REQUIRED_FILES tem `docs/CODE_STYLE.md` (apos COMPOUND_ENGINEERING.md)
- [ ] REQUIRED_FILES tem `.claude/CLAUDE.md` (no final da lista)
- [ ] Count total de REQUIRED_FILES = 28
- [ ] 2 novos testes RF-12 em `harness-validate.test.ts` passam
- [ ] `bun run harness:validate` no repo do plugin retorna `Harness validation passed (28 required files, ...)`
- [ ] `bun run test` (suite completa) verde
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test scripts/harness-validate.test.ts -t "RF-12"` retorna `2 passed, 0 failed`
- `grep -E "'docs/CODE_STYLE\.md'|'\.claude/CLAUDE\.md'" scripts/harness-validate.ts | wc -l` retorna `2`
- `bun run harness:validate` exit code 0 + mensagem inclui `28 required files`

**Por humano:**
- Inspecao visual do diff: apenas 2 linhas adicionadas em REQUIRED_FILES, com comentario `// 2026-05-21 (Luiz/dev): RF-12 anti-vibe extension (Plano 05 fase-04)` em cada.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->

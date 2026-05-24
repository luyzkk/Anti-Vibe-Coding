<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou secao do PRD).
-->

# Fase 02: Version Bump 6.5.1 → 6.6.0

**Plano:** 01 — Cutover Foundation + Distribuicao
**Sizing:** ~1h
**Depende de:** fase-01 (path novo deve existir — bump sem cutover nao faz sentido)
**Visual:** false

---

## O que esta fase entrega

Bump de versao 6.5.1 → 6.6.0 propagado em exatamente 7 locais. Constante
`KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'` adicionada inline em `00_2-reentry-guard.ts`
(AR-04: sem `constants.ts` central). Projetos com manifest < 6.6.0 passam a receber
`re-populate` no reentry-guard. CA-14 verificado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `package.json` | Modify | `"version": "6.5.1"` → `"6.6.0"` |
| `.claude-plugin/plugin.json` | Modify | `"version": "6.5.1"` → `"6.6.0"` |
| `.claude-plugin/marketplace.json` | Modify | `"version": "6.5.1"` → `"6.6.0"` |
| `plugin-manifest.json` | Modify | `"version": "6.5.1"` → `"6.6.0"` |
| `scripts/sync-to-global.sh` | Modify | Linha 18: default `PLUGIN_VERSION="${PLUGIN_VERSION:-6.5.1}"` → `"6.6.0"` |
| `skills/init/lib/run-init.ts` | Modify | Linha ~32: fallback hardcoded `return '6.5.1'` → `return '6.6.0'` |
| `skills/init/lib/steps/00_2-reentry-guard.ts` | Modify | Adicionar constante + atualizar compareSemver |

---

## Implementacao

### Passo 1: Escrever teste para o bump (RED)

Criar `tests/repo-structure/version-bump.test.ts` (ou adicionar em knowledge-path.test.ts — preferir
arquivo separado para legibilidade):

```typescript
// 2026-05-20 (Luiz/dev): D6 do PRD knowledge-path-cutover — bump minor 6.5.1 → 6.6.0.
// Garante que os 4 arquivos JSON principais estao sincronizados.
// Rodar: bun test tests/repo-structure/version-bump.test.ts

import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')
const EXPECTED_VERSION = '6.6.0'

async function readJson(relPath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}

describe('version bump 6.6.0 (D6)', () => {
  it('package.json has version 6.6.0', async () => {
    const pkg = await readJson('package.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('.claude-plugin/plugin.json has version 6.6.0', async () => {
    const pkg = await readJson('.claude-plugin/plugin.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('.claude-plugin/marketplace.json has version 6.6.0', async () => {
    const pkg = await readJson('.claude-plugin/marketplace.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })

  it('plugin-manifest.json has version 6.6.0', async () => {
    const pkg = await readJson('plugin-manifest.json')
    expect(pkg['version']).toBe(EXPECTED_VERSION)
  })
})
```

Rodar e confirmar RED: `bun test tests/repo-structure/version-bump.test.ts` → 4 failed.

### Passo 2: Atualizar os 4 arquivos JSON (GREEN para testes)

Atualizar `"version": "6.5.1"` → `"version": "6.6.0"` nos seguintes arquivos:

1. `package.json`
2. `.claude-plugin/plugin.json`
3. `.claude-plugin/marketplace.json`
4. `plugin-manifest.json`

Rodar: `bun test tests/repo-structure/version-bump.test.ts` → deve passar (4 passed).

### Passo 3: Atualizar sync-to-global.sh (linha 18)

No arquivo `scripts/sync-to-global.sh`, linha 18:

**Antes:**
```bash
  PLUGIN_VERSION="${PLUGIN_VERSION:-6.5.1}"
```

**Depois:**
```bash
  # 2026-05-20 (Luiz/dev): D6 do PRD knowledge-path-cutover — bump 6.5.1 → 6.6.0
  PLUGIN_VERSION="${PLUGIN_VERSION:-6.6.0}"
```

### Passo 4: Atualizar run-init.ts (fallback hardcoded)

Localizar a linha com o fallback hardcoded em `skills/init/lib/run-init.ts`:

```bash
grep -n "6.5.1" F:\Projetos\Anti-Vibe-Coding\skills\init\lib\run-init.ts
```

Substituir `return '6.5.1'` por `return '6.6.0'` com comentario de provenance:

```typescript
// 2026-05-20 (Luiz/dev): D6 do PRD knowledge-path-cutover — fallback version bump 6.5.1 → 6.6.0
return '6.6.0'
```

### Passo 5: Atualizar 00_2-reentry-guard.ts — adicionar constante + corrigir threshold (AR-04)

**Estado atual do arquivo (linhas relevantes):**

```typescript
const ABORT_MESSAGE =
  'Projeto ja inicializado na versao atual. Use /sync para atualizar templates ou /update se houve bump de versao do plugin.'

// ...linha 41:
    const cmp = compareSemver(manifestVersion, '6.5.0')
```

**Apos a modificacao:**

```typescript
const ABORT_MESSAGE =
  'Projeto ja inicializado na versao atual. Use /sync para atualizar templates ou /update se houve bump de versao do plugin.'

// 2026-05-20 (Luiz/dev): D6/AR-04 do PRD knowledge-path-cutover — constante inline (nao constants.ts
// central — padrao do arquivo e usar const local, ver ABORT_MESSAGE acima). Projetos com manifest
// < 6.6.0 entram em re-populate: precisam do refresh do path novo knowledge/.
const KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'
```

E na linha da comparacao:

```typescript
// Antes:
    const cmp = compareSemver(manifestVersion, '6.5.0')

// Depois:
    const cmp = compareSemver(manifestVersion, KNOWLEDGE_PATH_CUTOVER_VERSION)
```

**IMPORTANTE — semantica apos a mudanca:**
- Manifest `6.5.0` ou `6.5.1`: `compareSemver('6.5.0', '6.6.0')` = -1 → `re-populate` (correto: precisa refresh)
- Manifest `6.6.0`: `compareSemver('6.6.0', '6.6.0')` = 0 → `cmp >= 0` → AbortError (correto: ja na versao atual)
- Manifest `6.7.0+`: `compareSemver('6.7.0', '6.6.0')` = 1 → `cmp >= 0` → AbortError (correto)

### Passo 6: Rodar suite de testes completa

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun run test
```

Verificar que nao ha regressoes novas alem das pre-existentes documentadas em MEMORY.md raiz.

### Passo 7: Verificar CA-14 por maquina

```bash
cd F:\Projetos\Anti-Vibe-Coding && grep -r '"version"' package.json .claude-plugin/ plugin-manifest.json
```

Todos devem retornar `"version": "6.6.0"`.

Verificar ausencia de 6.5.1 em producao (exceto CHANGELOG):

```bash
cd F:\Projetos\Anti-Vibe-Coding && grep -r "6\.5\.1" --include="*.ts" --include="*.json" --include="*.sh" . | grep -v CHANGELOG | grep -v ".git"
```

Resultado esperado: nenhuma linha (ou apenas comentarios historicos).

### Passo 8: Commitar

```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json plugin-manifest.json scripts/sync-to-global.sh skills/init/lib/run-init.ts skills/init/lib/steps/00_2-reentry-guard.ts tests/repo-structure/version-bump.test.ts
git commit -m "feat: bump version 6.5.1 → 6.6.0 + add KNOWLEDGE_PATH_CUTOVER_VERSION constant"
```

---

## Gotchas

- **G5 do plano (7 locais, nao 6):** Os JSON sao 4; sync-to-global.sh e run-init.ts sao mais 2; a constante no reentry-guard e o 7o. Nao esquecer nenhum — CA-14 verifica ausencia de 6.5.1.

- **G6 do plano (semantica do threshold):** Ao trocar `'6.5.0'` por `KNOWLEDGE_PATH_CUTOVER_VERSION` (`'6.6.0'`), o limite muda. Projetos em 6.5.0 e 6.5.1 que antes seriam abortados (cmp >= 0 para 6.5.0) agora entram em re-populate. Isso e o comportamento CORRETO — precisam do refresh do path novo. Testar com fixture 6.5.0 explicitamente (ver Checklist).

- **Local (run-init.ts: localizar a linha exata):** O fallback hardcoded pode estar em contexto diferente do esperado. Rodar `grep -n "6.5.1" skills/init/lib/run-init.ts` antes de editar para confirmar a linha exata.

- **Local (sync-to-global.sh: nao substituir todas as ocorrencias):** A linha 18 e o `PLUGIN_VERSION` default. Pode haver outras mencoes de `6.5.1` em comentarios no arquivo — NAO alterar comentarios historicos (ex: `# 2026-05-18 ... 6.5.1`). Substituir apenas o valor no default.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test tests/repo-structure/version-bump.test.ts` retorna 4 failed (4 JSON ainda em 6.5.1)
  - Resultado esperado: `Expected "6.5.1" to be "6.6.0"` em cada teste

- [ ] **GREEN:** Apos atualizar os 4 JSON, `bun test tests/repo-structure/version-bump.test.ts` retorna 4 passed

### Checklist

- [ ] `grep '"version"' package.json` retorna `"version": "6.6.0"`
- [ ] `grep '"version"' .claude-plugin/plugin.json` retorna `"version": "6.6.0"`
- [ ] `grep '"version"' .claude-plugin/marketplace.json` retorna `"version": "6.6.0"`
- [ ] `grep '"version"' plugin-manifest.json` retorna `"version": "6.6.0"`
- [ ] `grep "PLUGIN_VERSION" scripts/sync-to-global.sh` mostra `6.6.0` no default
- [ ] `grep "6.6.0" skills/init/lib/run-init.ts` mostra o fallback atualizado
- [ ] `grep "KNOWLEDGE_PATH_CUTOVER_VERSION" skills/init/lib/steps/00_2-reentry-guard.ts` mostra a constante
- [ ] `grep "compareSemver" skills/init/lib/steps/00_2-reentry-guard.ts` usa `KNOWLEDGE_PATH_CUTOVER_VERSION` (nao literal `'6.5.0'`)
- [ ] Teste com fixture 6.5.0: `compareSemver('6.5.0', '6.6.0')` = -1 → deve entrar em re-populate (nao AbortError)
- [ ] Teste com fixture 6.5.1: `compareSemver('6.5.1', '6.6.0')` = -1 → deve entrar em re-populate
- [ ] `bun run test` — sem regressoes novas
- [ ] `bun run lint` — sem erros novos

---

## Criterio de Aceite

**CA-14 (bump propagado):**

```bash
grep -r '"version": "6.6.0"' package.json .claude-plugin/ plugin-manifest.json
```

Todos os arquivos retornam match.

```bash
grep -r "6\.5\.1" --include="*.ts" --include="*.json" --include="*.sh" . | grep -v CHANGELOG | grep -v ".git" | grep -v "node_modules"
```

Retorna zero linhas (nenhum arquivo de producao menciona 6.5.1).

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

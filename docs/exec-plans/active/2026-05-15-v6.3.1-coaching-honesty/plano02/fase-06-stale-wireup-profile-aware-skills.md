<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 06: Stale Wire-up nas 6 Skills Profile-aware

**Plano:** 02 — Use Crossing & Tolerance Cleanup
**Sizing:** 1h
**Depende de:** Nenhuma (wire-up puro — `stale-detector.ts` já existe via v6.3.0 RF-SH-01)
**Visual:** false

---

## O que esta fase entrega

Wire-up silencioso de check de idade de `capabilities.json` (> 24h → warning stderr) nas 6 skills profile-aware da v6.3.0: `security`, `api-design`, `system-design`, `design-patterns`, `decision-registry`, `lessons-learned`. Cumpre CA-09 do PRD v6.3.1 (cumpre CA-08 da v6.3.0).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/SKILL.md` | Modify | Adicionar bloco stale-check APÓS `<!-- profile-aware-preface:end -->` |
| `skills/api-design/SKILL.md` | Modify | Idem |
| `skills/system-design/SKILL.md` | Modify | Idem |
| `skills/design-patterns/SKILL.md` | Modify | Idem |
| `skills/decision-registry/SKILL.md` | Modify | Idem |
| `skills/lessons-learned/SKILL.md` | Modify | Idem |
| `tests/fixtures/stale-capabilities-fixture/capabilities.json` | Create | Fixture com `generated_at = now - 25h` |
| `skills/lib/__tests__/stale-warning.test.ts` | Create | Teste único do bloco wire-up (comportamento idêntico nas 6) |

---

## Implementacao

### Passo 1: Bloco de wire-up a inserir em cada SKILL.md

Inserir IMEDIATAMENTE APÓS o `<!-- profile-aware-preface:end -->` existente (ex: `skills/security/SKILL.md:30`). NÃO modificar o bloco profile-aware-preface — só adicionar bloco novo abaixo.

```markdown
<!-- stale-capabilities-check:start -->
```typescript
// 2026-05-15 (Luiz/dev): wire-up CA-09 v6.3.0 (closed em v6.3.1 RF-SH-02) — non-blocking warning.
// G2 do plano02: NUNCA bloqueia execução — alinhado com stale-detector.ts:8-10.
// G6 do plano02: capabilities.json AUSENTE NÃO emite warning falso (silently null).
// G7 do plano02: shape atual de capabilities.json não tem `storedChecksums` — check direto por age.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const __STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h — CA-09 PRD v6.3.1

function __readCapabilitiesGeneratedAt(projectRoot: string): string | null {
  try {
    const raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { generated_at?: unknown }
    return typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  } catch {
    return null
  }
}

const __caps_generated_at = __readCapabilitiesGeneratedAt(process.cwd())
if (__caps_generated_at !== null) {
  const __age = Date.now() - new Date(__caps_generated_at).getTime()
  if (Number.isFinite(__age) && __age > __STALE_THRESHOLD_MS) {
    process.stderr.write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}
```
<!-- stale-capabilities-check:end -->
```

### Passo 2: Estratégia de aplicação

Por que NÃO importar de helper centralizado:
- Skills são markdown executável em harness — não suportam re-importar de `../lib/...` dentro do bloco sem o resolver de path do skill. Padrão da v6.3.0 (ex: `skills/security/SKILL.md:16` importa de `'../lib/preface-context'`) é o template a espelhar.
- Bloco inline é < 20 linhas, sem dedupe valeria criar helper. Comparar com `skills/security/SKILL.md` (já tem bloco inline curto similar).

Aplicar bloco IDÊNTICO nas 6 skills. NÃO parametrizar nome da skill — não há diferença comportamental entre elas.

### Passo 3: Fixture `tests/fixtures/stale-capabilities-fixture/capabilities.json`

Gerado dinamicamente no teste (vs. hardcoded) — `generated_at` precisa ser relativo a `Date.now()`:

```typescript
// Em setup do teste
const staleTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
const fixture = {
  capabilities: [],
  coverage_gaps: [],
  generated_at: staleTimestamp,
  profile_at_generation: 'nextjs-app-router',
  schema_version: '2.0',
}
await fs.mkdir(path.join(fixtureRoot, 'discovery'), { recursive: true })
await fs.writeFile(
  path.join(fixtureRoot, 'discovery', 'capabilities.json'),
  JSON.stringify(fixture, null, 2),
)
```

### Passo 4: Teste único

`skills/lib/__tests__/stale-warning.test.ts`. Como o bloco é idêntico nas 6 skills, testar 1 vez é suficiente — comportamento não varia por skill.

```typescript
// 2026-05-15 (Luiz/dev): RED→GREEN CA-09 PRD v6.3.1.
// Estrategia: extrair logica do bloco SKILL.md para funcao testavel pura,
// OU testar via subprocess que carrega uma das skills.
// Opcao A (pure-fn extract) escolhida: spawn de subprocess para parsear markdown e exec bloco TS
// e fragil em Windows; pure-fn em helper testavel evita.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Recriar exatamente a mesma logica do bloco em SKILL.md como funcao pura.
// Se o bloco em SKILL.md mudar, esta funcao DEVE ser sincronizada — comentar em ambos os locais.
function checkStaleCapabilities(projectRoot: string, write: (s: string) => void): void {
  const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
  let raw: string
  try {
    const { readFileSync } = require('node:fs')
    raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
  } catch {
    return
  }
  let parsed: { generated_at?: unknown }
  try { parsed = JSON.parse(raw) } catch { return }
  const generated_at = typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  if (generated_at === null) return
  const age = Date.now() - new Date(generated_at).getTime()
  if (Number.isFinite(age) && age > STALE_THRESHOLD_MS) {
    write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}

describe('stale capabilities warning (CA-09 v6.3.1)', () => {
  let tmp: string
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'stale-')) })
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }) })

  it('writes stderr warning when generated_at > 24h ago', () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mkdirSync(join(tmp, 'discovery'), { recursive: true })
    writeFileSync(
      join(tmp, 'discovery', 'capabilities.json'),
      JSON.stringify({ generated_at: stale, capabilities: [], coverage_gaps: [],
        profile_at_generation: 'nextjs-app-router', schema_version: '2.0' }),
    )

    const captured: string[] = []
    checkStaleCapabilities(tmp, s => captured.push(s))

    expect(captured).toHaveLength(1)
    expect(captured[0]).toBe('capabilities.json stale (>24h) — run /init --refresh\n')
  })

  it('does NOT warn when capabilities.json is absent', () => {
    const captured: string[] = []
    checkStaleCapabilities(tmp, s => captured.push(s))
    expect(captured).toEqual([])
  })

  it('does NOT warn when generated_at is fresh (1h ago)', () => {
    const fresh = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    mkdirSync(join(tmp, 'discovery'), { recursive: true })
    writeFileSync(
      join(tmp, 'discovery', 'capabilities.json'),
      JSON.stringify({ generated_at: fresh, capabilities: [], coverage_gaps: [],
        profile_at_generation: 'nextjs-app-router', schema_version: '2.0' }),
    )
    const captured: string[] = []
    checkStaleCapabilities(tmp, s => captured.push(s))
    expect(captured).toEqual([])
  })
})
```

> **Sync obrigatório:** Se o bloco em SKILL.md mudar, atualizar `checkStaleCapabilities` no teste. Adicionar comentário em AMBOS os locais referenciando o outro. Trade-off aceitável vs. fragilidade de spawn de subprocess que carrega markdown executável em Windows.

### Passo 5: Verificação manual nas 6 skills

Após aplicar bloco nas 6 skills, validar visual + harness:

```bash
# Cada SKILL.md tem EXATAMENTE 1 ocorrência do bloco
for f in skills/security/SKILL.md skills/api-design/SKILL.md \
         skills/system-design/SKILL.md skills/design-patterns/SKILL.md \
         skills/decision-registry/SKILL.md skills/lessons-learned/SKILL.md; do
  count=$(grep -c "stale-capabilities-check:start" "$f")
  echo "$f: $count"
done
# Esperado: cada arquivo retorna 1
```

---

## Gotchas

- **G1 do plano (G2):** Warning NUNCA bloqueia — `process.stderr.write` apenas, sem `throw`, sem `process.exit`. Alinhado com `stale-detector.ts:8-10`.
- **G2 do plano (G6):** `capabilities.json` ausente NÃO emite warning falso — `try/catch` retorna `null` silenciosamente. Distingue "ausente" (silent) de "stale" (warn).
- **G3 do plano (G7):** `checkStale` de `stale-detector.ts` exige `storedChecksums: Record<string, string>` — capabilities.json shape atual NÃO tem isso. Fase usa check de IDADE direto (`Date.now() - generated_at > 24h`). Não importar `checkStale`.
- **Local:** Mensagem exata `capabilities.json stale (>24h) — run /init --refresh\n` — CA-09 do PRD especifica essa string. Não parafrasear.
- **Local:** Threshold `24 * 60 * 60 * 1000 = 86400000ms`. Não cair em "1 day" arbitrário — alinhado com PRD §Mecanismo 6 e v6.3.0 CA-08.
- **Local:** `Number.isFinite(age)` é guard para `generated_at` malformado (`NaN` se Date inválido). Sem isso, capability com `generated_at: "bogus"` emite warning espúrio.
- **Local:** Variáveis prefixadas com `__` (ex: `__caps_generated_at`) para evitar colisão com vars do corpo da skill ou do bloco profile-aware-preface logo acima. Convenção já usada em `skills/architecture/SKILL.md:18-30` (telemetria).

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/lib/__tests__/stale-warning.test.ts`
  - Resultado esperado: `Expected ["capabilities.json stale..."], received []`

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/lib/__tests__/stale-warning.test.ts`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] Bloco `<!-- stale-capabilities-check:start -->` presente nas 6 SKILL.md
- [ ] Bloco aparece DEPOIS de `<!-- profile-aware-preface:end -->`, não substituindo o existente
- [ ] Mensagem exata: `capabilities.json stale (>24h) — run /init --refresh` (sem typo do em-dash)
- [ ] `bun run test` 0 regressão
- [ ] `bun run typecheck` exit 0
- [ ] `bun run harness:validate` continua OK (não há novo check em harness para esse bloco)
- [ ] Smoke manual: criar `discovery/capabilities.json` com `generated_at` 25h atrás, simular skill — stderr emite warning

---

## Criterio de Aceite

**Por maquina (mapeado a CA-09 do PRD v6.3.1):**
- `bun test skills/lib/__tests__/stale-warning.test.ts` retorna `3 passed, 0 failed`
- `grep -c 'stale-capabilities-check:start' skills/{security,api-design,system-design,design-patterns,decision-registry,lessons-learned}/SKILL.md` retorna `1` para cada arquivo
- `bun run test` mantém 0 regressões nas suites das 6 skills profile-aware (CA-11 do PRD)

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

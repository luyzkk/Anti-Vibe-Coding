<!--
Princípio universal #5 — Comment Provenance.
Esta fase implementa RF11 (warning Rails legado <7.1) ANTES do E2E completo (fase-09)
para que CA-04 seja GREEN imediatamente — sem RED cross-phase do antigo plano 9 fases.
Razão: D23 do CONTEXT (pre-execução risk resolution 2026-05-18).
Comentários inline em TS novo: autor + papel, YYYY-MM-DD, razão (RF11 / D23).
-->

# Fase 08: RF11 — warning Rails legado (<7.1) antes do E2E completo

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 0.5h
**Depende de:** fase-06 (INDEX final consolidado — warning é injetado no caller que orquestra `runStackKnowledgeInit`). Independe da fase-07 (verifier sobre claims de átomos, não toca em TS).
**Visual:** false

---

## O que esta fase entrega

Implementação enxuta (~5 linhas TS + 1 test) do RF11 do PRD: quando Gemfile declara `gem 'rails', '~> 7.0'` (ou versão <7.1), o output do `/init` exibe warning `"⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar."` mas continua copiando a matrix (não bloqueia). Helper `extractRailsVersionWarning(gemfileContent: string): string | null` em `skills/init/lib/format-knowledge-preview.ts` (ou módulo próximo), invocado pelo caller que monta `RunStackKnowledgeInitResult.warnings`. Test case unitário cobre 3 cenários: Rails 7.0 (warning), Rails 8.0 (sem warning), Gemfile sem `gem 'rails'` (sem warning). Estabelecido ANTES do E2E completo (fase-09) para que CA-04 vire GREEN imediatamente — alinhado com D23 do CONTEXT (pre-execução risk resolution, evita RED cross-phase do antigo plano 9-fases).

D23 do CONTEXT; RF11 do PRD; CA-04 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/format-knowledge-preview.ts` | Modify | Adicionar `extractRailsVersionWarning(gemfile: string): string \| null` com regex `[~^>=<]*\s*(\d+)\.(\d+)` |
| `skills/init/lib/format-knowledge-preview.test.ts` | Modify | Adicionar 3 test cases: Rails 7.0 (warning), Rails 8.0 (null), sem rails (null) |
| `skills/init/lib/run-stack-knowledge-init.ts` | Modify | Chamar `extractRailsVersionWarning` quando `primary === 'rails'` e injetar no `result.warnings` |

---

## Implementacao

### Passo 1 (RED): test unitário falhando

```typescript
// skills/init/lib/format-knowledge-preview.test.ts (acrescentar)
// 2026-05-18 (Luiz/dev): RF11 — warning Rails legado <7.1, alinhado com D23 + CA-04
import { extractRailsVersionWarning } from './format-knowledge-preview'

describe('extractRailsVersionWarning (RF11)', () => {
  test('Rails 7.0 (~> 7.0) retorna warning', () => {
    const gemfile = "source 'https://rubygems.org'\ngem 'rails', '~> 7.0'\n"
    expect(extractRailsVersionWarning(gemfile)).toBe(
      '⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar.',
    )
  })

  test('Rails 8.0 (~> 8.0) retorna null (não há warning)', () => {
    const gemfile = "gem 'rails', '~> 8.0'\n"
    expect(extractRailsVersionWarning(gemfile)).toBeNull()
  })

  test('Rails 7.1 (>= 7.1) retorna null (limite inferior do suportado)', () => {
    const gemfile = "gem 'rails', '>= 7.1'\n"
    expect(extractRailsVersionWarning(gemfile)).toBeNull()
  })

  test('Gemfile sem gem rails retorna null', () => {
    const gemfile = "gem 'sinatra'\n"
    expect(extractRailsVersionWarning(gemfile)).toBeNull()
  })

  test('Gemfile vazio retorna null', () => {
    expect(extractRailsVersionWarning('')).toBeNull()
  })
})
```

Comando RED: `bun run test -- skills/init/lib/format-knowledge-preview.test.ts` → 5 failures (import inexistente).

### Passo 2 (GREEN): implementação ~10 linhas

```typescript
// skills/init/lib/format-knowledge-preview.ts (acrescentar export)
// 2026-05-18 (Luiz/dev): RF11 — warning quando Gemfile declara Rails <7.1
// Razão: PRD CA-04 + D23 (risk resolution pre-exec) — knowledge cobre 7.1+
const RAILS_VERSION_RX = /^\s*gem\s+['"]rails['"]\s*,\s*['"][~^>=<]*\s*(\d+)\.(\d+)/m

export function extractRailsVersionWarning(gemfileContent: string): string | null {
  const m = RAILS_VERSION_RX.exec(gemfileContent)
  if (!m) return null
  const major = Number(m[1])
  const minor = Number(m[2])
  if (major < 7 || (major === 7 && minor < 1)) {
    return '⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar.'
  }
  return null
}
```

Comando GREEN: `bun run test -- skills/init/lib/format-knowledge-preview.test.ts` → 5 passed.

### Passo 3 (GREEN): integrar ao caller (`run-stack-knowledge-init.ts`)

Localizar o ponto onde `RunStackKnowledgeInitResult` é montado e injetar o warning:

```typescript
// skills/init/lib/run-stack-knowledge-init.ts (delta — ~3-4 linhas)
// 2026-05-18 (Luiz/dev): RF11 — propagar warning Rails legado no resultado
import { extractRailsVersionWarning } from './format-knowledge-preview'
// ...
if (stack.primary === 'rails') {
  const gemfilePath = path.join(targetDir, 'Gemfile')
  if (existsSync(gemfilePath)) {
    const warning = extractRailsVersionWarning(readFileSync(gemfilePath, 'utf8'))
    if (warning) warnings.push(warning)
  }
}
```

> Convenção: `result.warnings: string[]` já existe no contrato do Node v6.3.2 (verificar antes via `Grep` no codebase; se ainda não existe, adicionar campo opcional sem quebrar consumers).

### Passo 4: validar contrato `result.warnings`

```bash
# Não regredir o Node — projeto sem Gemfile não recebe warning Rails
bun run test -- tests/e2e/stack-knowledge-tracer-bullet.test.ts
```

Se test Node verde, contrato preservado.

### Passo 5: commit

```bash
git add skills/init/lib/format-knowledge-preview.ts \
        skills/init/lib/format-knowledge-preview.test.ts \
        skills/init/lib/run-stack-knowledge-init.ts
git commit -m "$(cat <<'EOF'
feat(init): RF11 — warning Rails legado <7.1 antes do E2E completo

extractRailsVersionWarning parseia Gemfile com regex permissiva
(suporta '~> 7.0', '>= 7.0', '7.0.x') e retorna string de aviso
quando major.minor < 7.1. Caller injeta no result.warnings.

Movido do antigo fase-09 (hardening) para fase-08 dedicada — D23 do
CONTEXT (risk resolution pre-execução) — para que CA-04 do E2E
completo (fase-09 nova) vire GREEN imediatamente, sem RED cross-phase.

Alinhado com RF11 + CA-04 do PRD; D23 do CONTEXT.
EOF
)"
```

---

## Gotchas

- **G-local 1 — regex permissiva, não estrita:** Gemfile pode ter `'~> 7.0'`, `'>= 7.0'`, `'7.0.x'`, `'7.0'`, `'< 8.0'` ou múltiplos constraints (`'>= 7.0, < 8.0'`). Regex captura primeiro `major.minor` após operador opcional. Se Gemfile tem `'>= 7.0, < 8.0'`, captura 7.0 (gera warning — comportamento OK porque app pode estar rodando 7.0.x).

- **G-local 2 — não tocar em `detect-stack.ts`:** o detector já classifica Rails legado como `'rails'`. RF11 é warning sobre versão SUPORTADA pela knowledge, não sobre detecção. Confundir os dois é o erro mais comum.

- **G-local 3 — `result.warnings` pode não existir ainda no contrato Node:** se `Grep` mostra que `RunStackKnowledgeInitResult` não tem `warnings: string[]`, adicionar campo OPCIONAL (`warnings?: string[]`) — não quebrar consumers Node v6.3.2. Test E2E Node existente não usa o campo, então adicioná-lo é additive.

- **G-local 4 — performance:** regex roda 1x por init em projeto Rails. Custo desprezível (<1ms). Sem cache necessário.

- **G-local 5 — Windows/cross-platform:** `readFileSync` com encoding UTF-8 funciona uniforme; Gemfile não tem BOM normalmente. Se algum projeto tem Gemfile UTF-8 BOM, regex ainda casa porque `^\s*` absorve.

---

## Verificacao

### TDD

- [ ] **RED:** 5 test cases em `format-knowledge-preview.test.ts` falham por export inexistente
  - Comando: `bun run test -- skills/init/lib/format-knowledge-preview.test.ts`
  - Resultado esperado: `5 failed`

- [ ] **GREEN:** Implementação ~10 linhas, 5 tests PASS
  - Comando: `bun run test -- skills/init/lib/format-knowledge-preview.test.ts`
  - Resultado esperado: `5 passed`

- [ ] **Regression Node:** suite Node não regride
  - Comando: `bun run test -- tests/e2e/stack-knowledge-tracer-bullet.test.ts`
  - Resultado esperado: `passed` igual ao baseline (sem warnings Rails contaminando projeto Node)

### Checklist

- [ ] `extractRailsVersionWarning` exportado de `format-knowledge-preview.ts` com comment provenance
- [ ] 5 test cases cobrindo Rails 7.0 (warn), Rails 7.1 (null), Rails 8.0 (null), sem rails (null), vazio (null)
- [ ] Caller em `run-stack-knowledge-init.ts` invoca a função quando `primary === 'rails'`
- [ ] `result.warnings` propaga o warning Rails legado quando aplicável
- [ ] `bun run test -- skills/init/lib/format-knowledge-preview.test.ts` retorna PASS
- [ ] `bun run test -- tests/e2e/stack-knowledge-tracer-bullet.test.ts` (Node) ainda passa
- [ ] `bun run lint` limpo sobre arquivos novos/editados
- [ ] Commit referencia RF11 + CA-04 + D23

---

## Criterio de Aceite

**Por maquina:**

- `bun run test -- skills/init/lib/format-knowledge-preview.test.ts` retorna PASS para todos os 5 cases novos
- `bun run lint` retorna 0
- Suite Node E2E não regride (mesmo número de PASS antes/depois)

**Por humano:**

- Code reviewer lê o helper em <30s e entende o comportamento (regex + comparação numérica major.minor)
- Reviewer confirma que warning string é o literal exato do PRD (não parafrase)
- CA-04 do E2E completo (fase-09 nova) deverá ser GREEN imediatamente, sem RED cross-phase

---

<!-- Gerado por edit cirúrgico em 2026-05-18 (extração de fase-09 antiga → fase-08 nova) per D23 do CONTEXT -->

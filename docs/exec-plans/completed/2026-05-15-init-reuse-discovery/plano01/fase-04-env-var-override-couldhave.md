<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que.
Exemplo: `// 2026-05-15 (Luiz/dev): env var ANTI_VIBE_FRESH_HOURS override — alinhado com PRD §RF-CH-01`
-->

# Fase 04: Env Var Override (`ANTI_VIBE_FRESH_HOURS`) — Could Have

**Plano:** 01 — Reuse-Discovery Helper & SKILL Integration
**Sizing:** 0.5h (~30min)
**Depende de:** fase-03 (precisa de tests + helper estavel — `shouldReuseDiscovery` aceita override)
**Visual:** false

---

## O que esta fase entrega

Override opcional via env var `ANTI_VIBE_FRESH_HOURS` (numero em horas) que sobrescreve `FRESH_THRESHOLD_MS` quando setado e parseavel — permite ao dev fast-iterar com janela menor (ex: 1h) sem mudar codigo. Could Have do PRD (RF-CH-01) — **ship opcional**, NAO bloqueia release do plano.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/reuse-discovery.ts` | Modify | Mudar assinatura de `shouldReuseDiscovery` para aceitar `thresholdMs` opcional (dependency injection — mais testavel que ler env direto) + helper `resolveThresholdMs(envValue?: string): number` |
| `skills/init/lib/reuse-discovery.test.ts` | Modify | Tests para `resolveThresholdMs` (override valido, invalido, ausente) + test de `shouldReuseDiscovery` com `thresholdMs` injetado |
| `skills/init/SKILL.md` | Modify | Step reuse-discovery.0 le `process.env.ANTI_VIBE_FRESH_HOURS` e passa para o helper |

---

## Implementacao

### Passo 1: Adicionar `resolveThresholdMs` em `reuse-discovery.ts`

```typescript
/**
 * Resolve o threshold em ms a partir de env var override (RF-CH-01).
 * Se `envValue` for parseavel como numero finito positivo, retorna `envValue * 60 * 60 * 1000`.
 * Caso contrario (undefined, vazio, NaN, negativo, zero), retorna FRESH_THRESHOLD_MS default.
 */
export function resolveThresholdMs(envValue: string | undefined): number {
  if (envValue === undefined || envValue === '') return FRESH_THRESHOLD_MS
  const hours = Number(envValue)
  if (!Number.isFinite(hours) || hours <= 0) return FRESH_THRESHOLD_MS
  return hours * 60 * 60 * 1000
}
```

Observacao: NAO usar `parseFloat` — `Number()` eh stricter ("1.5abc" vira `NaN`, enquanto `parseFloat` viraria `1.5`). Fail-safe.

### Passo 2: Mudar `shouldReuseDiscovery` para aceitar `thresholdMs` opcional

```typescript
/**
 * Decide se o cache de discovery anterior pode ser reusado.
 * @param cachedAt ISO timestamp do ultimo init (ou null)
 * @param thresholdMs Override opcional para o threshold (default: FRESH_THRESHOLD_MS).
 *                    Permite injecao para test e env var override (RF-CH-01).
 */
export function shouldReuseDiscovery(cachedAt: string | null, thresholdMs: number = FRESH_THRESHOLD_MS): boolean {
  if (cachedAt === null || cachedAt === '') return false
  const parsed = Date.parse(cachedAt)
  if (Number.isNaN(parsed)) return false
  return Date.now() - parsed < thresholdMs
}
```

Observacoes:
- Backward compatible — chamadas existentes em fase-01/02/03 que passam apenas `cachedAt` continuam funcionando (default kicks in).
- CA-07 nao quebra — contrato `(cachedAt: string | null) => boolean` continua valido (param adicional opcional).

### Passo 3: Tests para override

```typescript
describe('resolveThresholdMs (RF-CH-01)', () => {
  it('returns default when envValue is undefined', () => {
    expect(resolveThresholdMs(undefined)).toBe(FRESH_THRESHOLD_MS)
  })

  it('returns default when envValue is empty string', () => {
    expect(resolveThresholdMs('')).toBe(FRESH_THRESHOLD_MS)
  })

  it('returns hours converted to ms when envValue is "1"', () => {
    expect(resolveThresholdMs('1')).toBe(60 * 60 * 1000)
  })

  it('returns hours converted to ms when envValue is "0.5"', () => {
    expect(resolveThresholdMs('0.5')).toBe(30 * 60 * 1000)
  })

  it('returns default when envValue is non-numeric "abc"', () => {
    expect(resolveThresholdMs('abc')).toBe(FRESH_THRESHOLD_MS)
  })

  it('returns default when envValue is "0"', () => {
    expect(resolveThresholdMs('0')).toBe(FRESH_THRESHOLD_MS)
  })

  it('returns default when envValue is negative', () => {
    expect(resolveThresholdMs('-1')).toBe(FRESH_THRESHOLD_MS)
  })
})

describe('shouldReuseDiscovery with thresholdMs override', () => {
  it('uses override threshold when provided', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    // default 24h -> true; override 1h -> false
    expect(shouldReuseDiscovery(twoHoursAgo)).toBe(true)
    expect(shouldReuseDiscovery(twoHoursAgo, 60 * 60 * 1000)).toBe(false)
  })
})
```

### Passo 4: Atualizar `Step reuse-discovery.0` em SKILL.md para passar env override

Adicionar `resolveThresholdMs` no destructuring e usar:

```javascript
const {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  formatStaleMessage,
  resolveThresholdMs,
  FRESH_THRESHOLD_MS,
} = await import('./lib/reuse-discovery.ts')

// ... resto igual ate a decisao ...

// 2026-05-15 (Luiz/dev): env override RF-CH-01 — injetado via dependency injection (mais testavel que ler env direto)
const thresholdMs = resolveThresholdMs(process.env.ANTI_VIBE_FRESH_HOURS)

if (shouldReuseDiscovery(cachedAt, thresholdMs)) {
  // fresh path (mesmo da fase-02)
}
```

### Passo 5: Validar tudo

```bash
bun run test skills/init/lib/reuse-discovery.test.ts
bun run lint
bun run harness:validate
```

---

## Gotchas

- **G5 do plano (Comment Provenance):** ao adicionar `// 2026-05-15 (Luiz/dev): env override RF-CH-01 ...` no SKILL.md, manter no JS block — nao espalhar em multiplos lugares.
- **Local (fase-04):** preferir DEPENDENCY INJECTION (`thresholdMs` como parametro) sobre ler `process.env` dentro do helper. Motivo: tests sem mock do `process.env` (frageis em Bun), pureza funcional preservada, e o consumer downstream (plano05/fase-01) pode injetar seu proprio threshold sem precisar setar env.
- **Local (fase-04):** OPCIONAL — se durante exec a fase trouxer fricção (ex: env var precisa de cleanup entre tests), DEFERIR para v6.3.1. CLAUDE.md regra "Não Super-Engenheirar": esta fase atende caso hipotetico. Documentar decisao em MEMORY.md.

---

## Verificacao

### TDD

- [ ] **RED:** Tests novos para `resolveThresholdMs` falham (helper ainda nao existe)
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts -t resolveThresholdMs`
  - Resultado esperado: 7 falham com `resolveThresholdMs is not a function`

- [ ] **GREEN:** Implementacao adicionada, todos passam
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts`
  - Resultado esperado: 7 novos + 1 novo de `shouldReuseDiscovery with thresholdMs override` = 8 novos, todos passando, antigos continuam passando

### Checklist

- [ ] Helper `resolveThresholdMs(envValue: string | undefined): number` exportado
- [ ] `shouldReuseDiscovery` aceita `thresholdMs` opcional (default = `FRESH_THRESHOLD_MS`)
- [ ] Contrato CA-07 preservado: chamada de 1 arg `shouldReuseDiscovery(cachedAt)` continua valida
- [ ] Step reuse-discovery.0 em SKILL.md lê `process.env.ANTI_VIBE_FRESH_HOURS` e passa via injection
- [ ] Test `returns default when envValue is "0"` passa (evita threshold = 0 acidental)
- [ ] Test `returns default when envValue is negative` passa
- [ ] Test `shouldReuseDiscovery with thresholdMs override` confirma override de 1h vs default 24h
- [ ] Tests passam: `bun run test skills/init/lib/reuse-discovery.test.ts`
- [ ] Lint limpo: `bun run lint`
- [ ] Harness valida: `bun run harness:validate`

---

## Criterio de Aceite

Cobre RF-CH-01 (Could Have — ship opcional).

**Por maquina:**
- `bun run test skills/init/lib/reuse-discovery.test.ts -t resolveThresholdMs` retorna `0 failed` (7 tests)
- `grep -n 'resolveThresholdMs\|ANTI_VIBE_FRESH_HOURS' skills/init/lib/reuse-discovery.ts skills/init/SKILL.md` retorna referencias em ambos

**Por humano:**
- Simular `ANTI_VIBE_FRESH_HOURS=1` + projeto com `started_at` ha 2h + `/init --reuse-discovery`: console deve mostrar mensagem stale (override de 1h pego, 2h excede)
- Sem env var: comportamento identico a fase-01/02/03 (default 24h aplica)
- Se fase abandonada: MEMORY.md documenta motivo e RF-CH-01 fica Won't Have v6.2.x (movido para v6.3.1)

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

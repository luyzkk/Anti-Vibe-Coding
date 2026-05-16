<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): /init --refresh — alinhado com PRD v6.3.0 §RF-CH-01`
-->

# Fase 01: Flag `--refresh` em `/init` regenera apenas discovery/*.json

**Plano:** 05 — Polish & DX (Could Haves)
**Sizing:** ~1.5h
**Depende de:** Plano 02 fase-03 verde (capabilities.json existe); Plano 03 fase-02 idealmente verde (parity-gaps.json — graceful degradation se ausente)
**Visual:** false
**Defer to v6.3.1: OK** — se Plano 02 fase-03 não estiver verde OU se a otimização `cache <24h` do PRD do `/init` (§RF-CH-02 desse PRD, não deste) não estiver mergeada, fase é deferida com warning explícito em MEMORY.md.

---

## Objetivo

Adicionar flag `--refresh` em `/init` que regenera APENAS `discovery/capabilities.json` + `discovery/parity-gaps.json` sem refazer as Fases 0-1 do `/init` (stack detection, scaffold) quando a última geração tem `<24h`. Atalho ergonômico para "atualizar inventário sem rodar `/init` inteiro".

---

## Contexto

PRD v6.3.0 §RF-CH-01:

> Flag `--refresh` em `/init` regenera apenas `capabilities.json` + `parity-gaps.json` sem refazer Fases 0-1 caso `<24h` (reusa otimização do PRD do `/init` §RF-CH-02).

Problema que resolve: hoje, para atualizar `capabilities.json` (ex: usuário adicionou novas rotas em `app/api/`), o usuário precisa rodar `/init` inteiro — que faz stack detection, scaffold, AGENTS.md merge, etc. Em projetos médios, isso leva minutos e refaz trabalho redundante. `--refresh` reusa a otimização "cache fresh <24h" já presente no `/init` v6.2 e pula direto para a fase de discovery.

Reusa: nenhuma lógica nova de cache — só roteamento. A otimização `<24h` deve estar mergeada no PRD do `/init` antes desta fase iniciar (G3 do README).

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `skills/init/SKILL.md` | Modify | Adicionar `Step refresh.0: parse --refresh flag` (mirror do `migrate.0` linhas 42-55) + `Step refresh.1: skip-to-discovery` que invoca o orquestrador de discovery diretamente |
| `skills/init/lib/refresh-flag.ts` | Create | Helper `parseRefreshFlag(args: string[]): { refresh: boolean }` + `shouldSkipInitPhases(cachedAt: string \| null): boolean` (true se `<24h`) |
| `skills/init/lib/refresh-flag.test.ts` | Create | Testes: flag detectada; cache fresh → skip; cache stale → warning + full init; ausência de cache → warning + full init |
| `skills/init/lib/discovery.ts` | Modify | Exportar função `regenerateDiscovery(projectRoot: string): Promise<void>` que invoca apenas `capabilities.json` + `parity-gaps.json` regen (reusa Plano 02 fase-03 + Plano 03 fase-02 internals) |

> Nota: `skills/init/lib/discovery.ts` já existe (visível no glob); estender com `regenerateDiscovery` em vez de criar novo arquivo. Se o nome `regenerateDiscovery` colidir, prefixar com `refresh` (ex: `refreshDiscoveryArtifacts`).

---

## Implementação

### Passo 0: Validar bloqueador externo (otimização <24h do /init)

- [ ] Confirmar que o PRD do `/init` (PRD adjacente, não v6.3.0) mergeou §RF-CH-02 — cache `<24h` skip de stack detection.
- [ ] Buscar evidência: `bun run skills/init/lib/discovery.ts --help` ou inspecionar `skills/init/lib/discovery.ts` para constante tipo `FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000`.
- [ ] Se ausente: PARAR. Documentar em MEMORY.md "fase-01 deferida — bloqueador externo ausente" e pular para fase-02.

### Passo 1: Criar `skills/init/lib/refresh-flag.ts`

```typescript
// 2026-05-15 (Luiz/dev): /init --refresh flag — PRD v6.3.0 §RF-CH-01.
// Reusa otimização <24h do PRD do /init §RF-CH-02 (cache fresh skip).
// G6 do plano01: arquivo de cache pode não existir — tratar como "stale" e fazer full init.

const FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h

export type RefreshFlagResult = {
  refresh: boolean
}

export function parseRefreshFlag(args: string[]): RefreshFlagResult {
  return { refresh: args.includes('--refresh') }
}

/**
 * Decide se Fases 0-1 do /init podem ser puladas baseado na idade do cache.
 * cachedAt: ISO timestamp do último /init bem-sucedido (lido de discovery/agents-log.json
 * ou similar — verificar shape exato durante implementação).
 * Retorna true se cache é "fresh" (<24h) — caller pode pular para discovery direto.
 */
export function shouldSkipInitPhases(cachedAt: string | null): boolean {
  if (!cachedAt) return false // sem cache: tem que rodar tudo
  const ageMs = Date.now() - new Date(cachedAt).getTime()
  if (Number.isNaN(ageMs)) return false // timestamp inválido: stale por segurança
  return ageMs < FRESH_THRESHOLD_MS
}
```

### Passo 2: Estender `skills/init/lib/discovery.ts` com `regenerateDiscovery`

```typescript
// 2026-05-15 (Luiz/dev): regenerateDiscovery — PRD v6.3.0 §RF-CH-01.
// Invoca apenas capabilities.json + parity-gaps.json regen, sem rodar /init fases 0-1.
// Graceful degradation: se /parity-audit nao existir (Plano 03 deferido), pular silenciosamente
// com warning unico.

export async function regenerateDiscovery(projectRoot: string): Promise<void> {
  // 1. Regenerar capabilities.json (reusa Plano 02 fase-03 — generateCapabilitiesJson ou similar)
  await regenerateCapabilities(projectRoot)

  // 2. Regenerar parity-gaps.json (se Plano 03 fase-02 disponivel)
  const hasParityAudit = await detectParityAuditSkill(projectRoot)
  if (hasParityAudit) {
    await regenerateParityGaps(projectRoot)
  } else {
    console.warn('refresh: /parity-audit not available — parity-gaps.json skipped (Plano 03 pending?)')
  }

  // 3. Audit log entry (reusa discovery/agents-log.json convention)
  await appendAgentsLog(projectRoot, { action: 'refresh', timestamp: new Date().toISOString() })
}
```

> Implementação real depende dos exports finais de Plano 02 + Plano 03. Adaptar conforme. Manter o shape: três etapas determinísticas, falha de uma não derruba as outras.

### Passo 3: Adicionar `Step refresh.0` + `Step refresh.1` em `skills/init/SKILL.md`

Inserir após `Step migrate.5` (linha ~99), antes da Fase 0 (stack detection):

```markdown
### Step refresh.0: Parse --refresh flag (Plano 05 fase-01 — RF-CH-01)

<!-- Detecta --refresh antes de qualquer fase. Reusa otimização <24h do /init §RF-CH-02. -->

\`\`\`javascript
const { parseRefreshFlag, shouldSkipInitPhases } = await import('./lib/refresh-flag.ts')
const { refresh } = parseRefreshFlag(typeof ARGUMENTS === 'string' ? ARGUMENTS.split(' ') : [])
if (refresh) {
  // Ler timestamp do ultimo init (discovery/agents-log.json — verificar shape)
  const cachedAt = await readLastInitTimestamp(process.cwd())
  if (shouldSkipInitPhases(cachedAt)) {
    console.log('refresh: cache fresh (<24h) — regenerating discovery only')
    const { regenerateDiscovery } = await import('./lib/discovery.ts')
    await regenerateDiscovery(process.cwd())
    process.exit(0)
  }
  console.warn('refresh: cache stale or absent — running full /init')
  // Continua para Fase 0 normal
}
\`\`\`
```

> Atenção: `ARGUMENTS` é variável global injetada pelo runner de skill — mesmo pattern de `Step migrate.0` linhas 47-53.

### Passo 4: Testes em `skills/init/lib/refresh-flag.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): refresh-flag.test.ts — PRD v6.3.0 §RF-CH-01.
import { describe, expect, test } from 'bun:test'
import { parseRefreshFlag, shouldSkipInitPhases } from './refresh-flag'

describe('parseRefreshFlag', () => {
  test('detects --refresh present', () => {
    expect(parseRefreshFlag(['--refresh'])).toEqual({ refresh: true })
  })

  test('returns false when flag absent', () => {
    expect(parseRefreshFlag([])).toEqual({ refresh: false })
    expect(parseRefreshFlag(['--dry-run'])).toEqual({ refresh: false })
  })

  test('detects --refresh mixed with other args', () => {
    expect(parseRefreshFlag(['--dry-run', '--refresh'])).toEqual({ refresh: true })
  })
})

describe('shouldSkipInitPhases', () => {
  test('returns true when cache is fresh (<24h)', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(shouldSkipInitPhases(oneHourAgo)).toBe(true)
  })

  test('returns false when cache is stale (>24h)', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(shouldSkipInitPhases(twoDaysAgo)).toBe(false)
  })

  test('returns false when cachedAt is null (no previous init)', () => {
    expect(shouldSkipInitPhases(null)).toBe(false)
  })

  test('returns false when cachedAt is malformed', () => {
    expect(shouldSkipInitPhases('not-a-date')).toBe(false)
  })
})
```

---

## Gotchas

- **G3 do plano (CRÍTICO):** Antes de qualquer código, validar que a otimização `<24h` está mergeada no `/init`. Se não estiver, fase deferida — não improvisar criando a otimização aqui (escopo creep + acoplamento errado de PRDs).
- **Graceful degradation de Plano 03:** Se `parity-gaps.json` regen não estiver disponível (Plano 03 derrapou), `regenerateDiscovery` printa warning único e continua só com capabilities. NÃO falhar a flag.
- **`ARGUMENTS` global:** A skill `/init` recebe args via variável global `ARGUMENTS` (string), não via `process.argv`. Mirror direto de `Step migrate.0` linhas 47-53. Não usar `process.argv` no SKILL.md.
- **Timestamp source unclear:** O timestamp do "último init" pode vir de `discovery/agents-log.json` (audit log existente) ou `discovery/.last-init` (arquivo novo). Decidir durante implementação inspecionando o que Plano 02 fase-03 deixou. Documentar a escolha em MEMORY.md.
- **Side effect em modo refresh:** `refresh` NÃO deve tocar em `AGENTS.md`, `CLAUDE.md`, templates ou scaffolds. Apenas `discovery/*.json`. Validar com checksum antes/depois em smoke test manual.

---

## Critério de Verificação

### TDD

- [ ] **RED:** `bun run test -- refresh-flag` falha (arquivo ainda não existe).
- [ ] **GREEN:** Após implementar `parseRefreshFlag` e `shouldSkipInitPhases`, todos os 6 testes passam.
- [ ] **REFACTOR:** Sem duplicação com `parseDryRunFlag` (Plano 03 fase-06 do `/init` PRD); se houver, extrair helper `parseFlag(args, name)`.

### Checklist

- [ ] `skills/init/lib/refresh-flag.ts` exporta `parseRefreshFlag` + `shouldSkipInitPhases` + `FRESH_THRESHOLD_MS`
- [ ] `skills/init/lib/discovery.ts` exporta `regenerateDiscovery` (extensão, não criação)
- [ ] `skills/init/SKILL.md` tem `Step refresh.0` antes da Fase 0
- [ ] `bun run test -- refresh-flag` retorna `6 passed, 0 failed`
- [ ] `bun run harness:validate` exit 0 com a flag adicionada
- [ ] Smoke test manual: `bun run skills/init/SKILL.md --refresh` em projeto com `discovery/agents-log.json` `<24h` regenera só JSONs (verificar mtime)
- [ ] Smoke test manual: mesma invocação com cache stale fala "running full /init" e continua

### Critério de Aceite

**Por máquina:**
- `bun run test -- refresh-flag` retorna `6 passed, 0 failed`.
- `grep -c "refresh.0" skills/init/SKILL.md` retorna `>= 1`.
- `grep -c "regenerateDiscovery" skills/init/lib/discovery.ts` retorna `>= 1`.

**Referências PRD:**
- RF-CH-01: ✓ flag implementada, reusa otimização <24h
- CA-08 (parcial): warning de stale cache durante refresh é registrado

---

## TDD Notes

- **Testar primeiro:** `parseRefreshFlag` com 3 casos (presente, ausente, mixed). É puro — sem I/O. RED→GREEN em 5min.
- **Testar segundo:** `shouldSkipInitPhases` com 4 casos (fresh/stale/null/malformed). Também puro — só `Date` math.
- **Testar por último (smoke):** `regenerateDiscovery` end-to-end manual — depende de Plano 02 fase-03 + Plano 03 fase-02 mergeados. Sem teste automatizado nesta fase; postpone para fase de integração.
- **Fixtures necessárias:** Nenhuma — testes são puros. Para smoke test manual, ter `discovery/agents-log.json` com timestamp `<24h` à mão.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

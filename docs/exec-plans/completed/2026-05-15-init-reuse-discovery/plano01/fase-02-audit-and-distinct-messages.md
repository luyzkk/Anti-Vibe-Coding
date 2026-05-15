<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que.
Exemplo: `// 2026-05-15 (Luiz/dev): audit subagent_id 'reuse-discovery' — alinhado com PRD §RF-SH-01`
-->

# Fase 02: Audit Entry + Mensagens Distintas Stale vs Absent

**Plano:** 01 — Reuse-Discovery Helper & SKILL Integration
**Sizing:** 1h
**Depende de:** fase-01 (precisa do modulo `reuse-discovery.ts` + Step reuse-discovery.0 ja inserido)
**Visual:** false

---

## O que esta fase entrega

Audit log entry com `subagent_id: 'reuse-discovery'` quando o atalho fresh eh ativado (RF-SH-01) e mensagens distintas no console para distinguir `stale (XXh ago)` vs `no previous init detected` (RF-SH-02). Fecha o branching real do skip para Step 7 (control flow no SKILL.md).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | Modify | Substituir bloco do `Step reuse-discovery.0` (fase-01 deixou placeholder) por versao com audit entry + mensagens distintas + skip real para Step 7 |
| `skills/init/lib/reuse-discovery.test.ts` | Modify | Adicionar tests para mensagens distintas (helper que formata stale message) e shape do audit entry |
| `skills/init/lib/reuse-discovery.ts` | Modify | Adicionar helper `formatStaleMessage(cachedAt: string | null): string` que distingue stale vs absent |

---

## Implementacao

### Passo 1: Adicionar helper `formatStaleMessage` em `reuse-discovery.ts`

Helper puro que centraliza a decisao de mensagem — facil de testar, evita string concatenation no SKILL.md.

```typescript
/**
 * Formata mensagem de warning quando o atalho nao pode ser usado.
 * Distingue dois subcasos para diagnostico (RF-SH-02):
 *   - cachedAt === null: "no previous init detected — running full init"
 *   - cachedAt presente mas stale: "stale (XXh ago) — running full init"
 */
export function formatStaleMessage(cachedAt: string | null): string {
  if (cachedAt === null) {
    return '[reuse-discovery] no previous init detected — running full init'
  }
  const parsed = Date.parse(cachedAt)
  if (Number.isNaN(parsed)) {
    return '[reuse-discovery] previous init timestamp unreadable — running full init'
  }
  const ageHours = Math.floor((Date.now() - parsed) / (60 * 60 * 1000))
  return `[reuse-discovery] stale (${ageHours}h ago) — running full init`
}
```

Observacao: usa `Math.floor` (sem casas decimais) — diagnostico, nao metrica precisa.

### Passo 2: Atualizar `Step reuse-discovery.0` em SKILL.md com audit + skip real

Substituir o bloco placeholder da fase-01 por um bloco que:
1. Quando fresh: chama Step 7 inline + append audit + `process.exit(0)` para evitar fall-through para Passo 0.
2. Quando stale/absent: usa `formatStaleMessage` para a warning, depois continua para Passo 0.

```javascript
// 2026-05-15 (Luiz/dev): subagent_id 'reuse-discovery' — alinhado com PRD §RF-SH-01 / §CA-05
const { randomUUID } = await import('node:crypto')
const {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  formatStaleMessage,
  FRESH_THRESHOLD_MS,
} = await import('./lib/reuse-discovery.ts')
const { AuditLogWriter } = await import('./lib/audit-log.ts')

const argsStr = typeof ARGUMENTS === 'string' ? ARGUMENTS : ''
const { reuseDiscovery } = parseReuseDiscoveryFlag(argsStr.split(/\s+/).filter(Boolean))

if (reuseDiscovery) {
  const startMs = Date.now()
  const cachedAt = await readLastInitTimestamp(process.cwd())

  if (shouldReuseDiscovery(cachedAt)) {
    console.log('[reuse-discovery] cache fresh — running Step 7 only')

    // Inline Step 7 (Capabilities Discovery) — single capabilities-discovery audit entry (G4: NÃO duplicar)
    const { readArchitectureProfile } = await import('../lib/read-architecture-profile.ts')
    const { discoverCapabilities } = await import('../lib/capabilities-writer.ts')
    const { writeFile } = await import('node:fs/promises')
    const pathMod = await import('node:path')

    const profileObj = readArchitectureProfile()
    if (profileObj !== null) {
      const out = await discoverCapabilities(process.cwd(), profileObj.profile)
      await writeFile(pathMod.join(process.cwd(), 'discovery', 'capabilities.json'), JSON.stringify(out, null, 2), 'utf-8')
    }

    // Audit entry adicional para o reuse-discovery (G4: ADICIONAL ao audit de capabilities-discovery, não substitui)
    const cachedAtMs = cachedAt !== null ? Date.parse(cachedAt) : 0
    const writer = new AuditLogWriter(process.cwd(), randomUUID())
    await writer.append({
      subagent_id: 'reuse-discovery',
      input_paths: ['discovery/agents-log.json'],
      output_struct: {
        cache_age_ms: Date.now() - cachedAtMs,
        cached_at: cachedAt,
        threshold_ms: FRESH_THRESHOLD_MS,
      },
      duration_ms: Date.now() - startMs,
      retry_count: 0,
    })

    process.exit(0) // atalho concluído — não cair em Passo 0
  } else {
    console.log(formatStaleMessage(cachedAt))
    // fall through para Passo 0 — fluxo normal completo
  }
}
```

Observacoes:
- `process.exit(0)` no fresh path evita duplicacao de capabilities-discovery (G4). Step 7 ja roda capabilities-discovery propria — neste branch chamamos `discoverCapabilities` inline e SO o audit `reuse-discovery` eh appended, NAO o `capabilities-discovery` (porque Step 7 ja appended em init normal — aqui eh atalho). Resultado: cada execucao gera UM audit entry (`reuse-discovery` ou `capabilities-discovery`, nunca os dois pelo mesmo run).
- `cached_at` em `output_struct` repete `cachedAt` por completude — auditoria sem cross-reference.

### Passo 3: Adicionar tests para `formatStaleMessage` e shape do audit

```typescript
describe('formatStaleMessage', () => {
  it('returns "no previous init detected" when cachedAt is null', () => {
    expect(formatStaleMessage(null)).toContain('no previous init detected')
  })

  it('returns "stale (XXh ago)" with hours when cachedAt is 48h ago', () => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    expect(formatStaleMessage(fortyEightHoursAgo)).toMatch(/stale \(48h ago\)/)
  })

  it('returns unreadable when cachedAt is malformed', () => {
    expect(formatStaleMessage('not-an-iso')).toContain('unreadable')
  })
})
```

Test do shape de audit (CA-05 — idempotencia: 1 entry por execucao, nao duplica capabilities):
- Esse teste pode ser deferido para um integration test ou inspecao manual (porque exigiria mock do `AuditLogWriter` + invocacao do SKILL.md). Documentar em MEMORY.md como nao-automatizado por agora; cobertura via inspecao do JS block.

### Passo 4: Validar SKILL.md + harness

```bash
bun run harness:validate
bun run test skills/init/lib/reuse-discovery.test.ts
```

---

## Gotchas

- **G2 do plano (SKILL.md edit-fragility):** o bloco do Step reuse-discovery.0 cresce significativamente nesta fase. Rodar `bun run harness:validate` apos a edicao. Se falhar, fazer diff incremental — nao reescrever o bloco todo de uma vez.
- **G4 do plano (idempotencia):** o fresh path NAO chama o Step 7 original (que appendaria `capabilities-discovery`). Em vez disso, faz `discoverCapabilities` inline + audit so do `reuse-discovery`. Resultado: 1 audit entry por execucao no fresh path (CA-05). Confirmar lendo `discovery/agents-log.json` apos teste manual.
- **G5 do plano (Comment Provenance):** apenas UMA linha `// 2026-05-15 (Luiz/dev): ...` no topo do JS block — nao espalhar em cada linha.
- **Local (fase-02):** `process.exit(0)` no JS block faz sentido aqui porque o SKILL.md eh executado dentro de um contexto onde exit 0 = sucesso. Se o runner mudar, revisitar.

---

## Verificacao

### TDD

- [ ] **RED:** Tests novos para `formatStaleMessage` falham (helper ainda nao existe)
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts`
  - Resultado esperado: 3 novos tests falham com `formatStaleMessage is not a function`

- [ ] **GREEN:** `formatStaleMessage` implementado, todos os tests passam
  - Comando: `bun run test skills/init/lib/reuse-discovery.test.ts`
  - Resultado esperado: tests novos passam, antigos continuam passando

### Checklist

- [ ] Helper `formatStaleMessage` exportado de `reuse-discovery.ts`
- [ ] Step reuse-discovery.0 em SKILL.md inclui audit entry com `subagent_id: 'reuse-discovery'` e `output_struct` com `cache_age_ms`, `cached_at`, `threshold_ms`
- [ ] Step reuse-discovery.0 no fresh path NAO chama Step 7 (executa `discoverCapabilities` inline) — evita duplicacao de capabilities-discovery (G4)
- [ ] Stale message inclui `XXh ago` calculado via `Math.floor((now - parsed) / 3600000)`
- [ ] Absent message contém `no previous init detected`
- [ ] `process.exit(0)` apos audit append no fresh path
- [ ] Tests passam: `bun run test skills/init/lib/reuse-discovery.test.ts`
- [ ] Harness valida: `bun run harness:validate`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

Cobre CA-02 (stale 48h -> warn "stale (48h ago) — running full init") e CA-05 (audit entry sem duplicar capabilities-discovery).

**Por maquina:**
- `bun run test skills/init/lib/reuse-discovery.test.ts -t formatStaleMessage` retorna `0 failed`
- `grep -n "subagent_id: 'reuse-discovery'" skills/init/SKILL.md` retorna pelo menos 1 linha
- `grep -n "no previous init detected\|stale (\${.*}h ago)\|stale (.*h ago)" skills/init/lib/reuse-discovery.ts` retorna pelo menos 2 linhas

**Por humano:**
- Simular `/init --reuse-discovery` em projeto com `started_at` ha 48h: console mostra `[reuse-discovery] stale (48h ago) — running full init`
- Simular em projeto sem `discovery/`: console mostra `[reuse-discovery] no previous init detected — running full init`
- Inspecionar `discovery/agents-log.json` apos fresh path: contém UM entry com `subagent_id: 'reuse-discovery'` e `output_struct.cache_age_ms` finito

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

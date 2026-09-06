<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Amplitude de Curinga e Reason

**Plano:** 02 — Allowlist e veredictos completos
**Sizing:** 1h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

Uma entrada ampla na allowlist (`/api/*`, `/api/:id`, `/api/(v1|v2)/x`) deixa de ser aceita em silencio:
e recusada (nao cala rota nenhuma) e vira finding proprio `high` em `anti-vibe.public-routes.json:linha`,
emitido como `ALLOW-001` ANTES das `ROUTE-*` (AB-1 / CA-04); `path` duplicado tem a segunda ocorrencia
recusada com a propria linha, fechando a DP-4 (CA-04b consolidado).

**DP aplicadas:** DP-3, DP-9 (produzir `allowlistFindings`, `allowlistToContractIssue`, ordem `ALLOW-*`
→ `ROUTE-*`), DP-4 (fecha: duplicata), DP-13 (fixture `nextjs-allowlist-wide`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/public-routes-allowlist.test.ts` | Modify (PRIMEIRO) | `isWideEntry`, CA-04 no parser, ampla sem `reason`, duplicata |
| `skills/security/lib/public-routes-allowlist.ts` | Modify | `isWideEntry`, `wideFinding`, insercao entre `PATH_CHECKS` e `REASON_CHECKS`, duplicata |
| `skills/security/lib/route-auth-matrix.test.ts` | Modify | CA-04 (finding proprio; rota sob ela continua critical), `buildContractIssues` ordem |
| `skills/security/lib/route-auth-matrix.ts` | Modify | `allowlistFindings: allowlist.wide` ordenado; `allowlistToContractIssue`; `buildContractIssues`; CLI usa |
| `skills/security/lib/route-auth-matrix.types.ts` | Verify (sem mudanca esperada) | `AllowlistFinding` ja declarado na fase-01 — so confirmar que o shape basta |
| `tests/fixtures/route-auth-matrix/nextjs-allowlist-wide/` | Create (dados) | `anti-vibe.public-routes.json` com `/api/*` + `app/api/admin/route.ts` — SEM `middleware.ts` (G1) |
| `agents/security-auditor.md` | Modify (ADITIVO — G9) | Secao 11: bullet sobre `ALLOW-*` e "amplitude nao cala rota" |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) |

---

## Implementacao

### Passo 1: Testes PRIMEIRO — teste de abuso AB-1 antes da defesa

```ts
// public-routes-allowlist.test.ts — acrescentar (import isWideEntry)
describe('isWideEntry (DP-3 — AB-1)', () => {
  it('flags wildcard, named parameter and regex group as wide', () => {
    for (const wide of ['/api/*', '/api/:id', '/api/(v1|v2)/users', '/:path*', '/admin/:path+']) {
      expect(isWideEntry(wide)).toBe(true)
    }
  })

  // 2026-09-05 (Luiz/dev): `[id]` e literal no Next (Route.path no dialeto da stack) — casa UMA rota.
  it('does not flag a literal path or a Next dynamic segment', () => {
    for (const literal of ['/api/health', '/api/users/[id]', '/docs/[...slug]', '/']) {
      expect(isWideEntry(literal)).toBe(false)
    }
  })
})

describe('parsePublicRoutes — amplitude e duplicata', () => {
  it('CA-04: refuses a wide entry and emits a high finding pointing at its line', () => {
    const result = parsePublicRoutes(src([{ path: '/api/*', reason: 'toda a API e publica' }]), FILE)
    expect(result.entries).toEqual([])
    expect(result.rejected).toEqual([])
    expect(result.wide).toHaveLength(1)
    expect(result.wide[0]?.severity).toBe('high')
    expect(result.wide[0]?.file).toBe(FILE)
    expect(result.wide[0]?.line).toBe(4)
    expect(result.wide[0]?.description).toContain('/api/*')
    expect(result.wide[0]?.description).toContain('individualmente')
  })

  // Amplitude e o sinal mais forte: `/api/*` sem reason e finding, nao uma recusa muda por falta de reason.
  it('flags a wide entry even when it has no reason', () => {
    const result = parsePublicRoutes(src([{ path: '/api/*' }]), FILE)
    expect(result.wide).toHaveLength(1)
    expect(result.rejected).toEqual([])
  })

  it('rejects the second occurrence of a duplicated path and points at its own line', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'a' }, { path: '/api/health', reason: 'b' }]), FILE)
    expect(result.entries.map((e) => e.line)).toEqual([4])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.line).toBe(8)
    expect(result.rejected[0]?.reason).toContain('duplicad')
  })

  it('treats trailing-slash variants as the same path for duplicate detection', () => {
    const result = parsePublicRoutes(src([{ path: '/api/health', reason: 'a' }, { path: '/api/health/', reason: 'b' }]), FILE)
    expect(result.entries).toHaveLength(1)
    expect(result.rejected).toHaveLength(1)
  })
})
```

```ts
// route-auth-matrix.test.ts — acrescentar (import allowlistToContractIssue, buildContractIssues)
const WIDE = join(FIXTURES, 'nextjs-allowlist-wide')

describe('auditRouteCoverage — entrada ampla (AB-1 / CA-04)', () => {
  it('CA-04: emits its own high finding for a wide allowlist entry, independent of the routes', () => {
    const result = auditRouteCoverage(WIDE, { changedFiles: ['app/api/admin/route.ts'] })
    expect(result.allowlistFindings).toHaveLength(1)
    expect(result.allowlistFindings[0]?.severity).toBe('high')
    expect(result.allowlistFindings[0]?.file).toBe('anti-vibe.public-routes.json')
    expect(result.allowlistFindings[0]?.line).toBe(3)
    expect(result.summary.allowlist.wide).toBe(1)
    expect(result.summary.allowlist.accepted).toBe(0)
  })

  it('CA-04: a wide entry silences nothing — the route under it is still DESCOBERTA critical', () => {
    const { findings, summary } = auditRouteCoverage(WIDE, { changedFiles: ['app/api/admin/route.ts'] })
    expect(findings.map((f) => f.severity)).toEqual(['critical'])
    expect(summary.publicaDeclarada).toBe(0)
  })

  it('emits ALLOW-* issues before ROUTE-* issues in the contract output', () => {
    const result = auditRouteCoverage(WIDE, { changedFiles: ['app/api/admin/route.ts'] })
    const issues = buildContractIssues(result)
    expect(issues.map((i) => i.id)).toEqual(['ALLOW-001', 'ROUTE-001'])
    expect(issues[0]?.severity).toBe('high')
    expect(issues[0]?.line).toBe(3)
  })
})
```

### Passo 2: Amplitude e duplicata na lib

```ts
// public-routes-allowlist.ts — acrescentar
import type { AllowlistFinding } from './route-auth-matrix.types'

// 2026-09-05 (Luiz/dev): DP-3 / PRD AB-1. `*` (curinga), `:nome` (parametro path-to-regexp/Express) e
// `(` (grupo regex) cobrem mais de uma rota. `[id]` NAO e amplo: no Next a rota E `/api/users/[id]`
// (DP-2) — a entrada casa UMA rota do contrato. Ver G13 do README sobre `:nome` no Express (Plano 04).
const WIDE_PATTERNS: readonly RegExp[] = [/\*/, /(^|\/):[A-Za-z_]/, /\(/]

export function isWideEntry(path: string): boolean {
  return WIDE_PATTERNS.some((re) => re.test(path))
}

// `high`, nao `critical`: nenhuma rota foi comprovadamente exposta (as rotas sob a entrada continuam
// no motor). Nao `medium`: amplitude e tentativa de desligar o check, pior que limite do adaptador.
function wideFinding(path: string, file: string, line: number): AllowlistFinding {
  return {
    path, file, line,
    severity: 'high',
    description: `entrada ampla \`${path}\` cobriria mais de uma rota — declare cada rota publica individualmente`,
  }
}
```

No loop de `parsePublicRoutes`, nos dois pontos que a fase-01 marcou:

```ts
const wide: AllowlistFinding[] = []
const accepted = new Set<string>()       // paths normalizados ja aceitos — so ACEITOS entram
// ...
const badPath = PATH_CHECKS.find((c) => c.rejects(record))
if (badPath !== undefined) { reject(badPath.reason); continue }
// amplitude ANTES de reason: `/api/*` sem reason e finding, nao recusa muda (AB-1 e o sinal mais forte)
if (path !== undefined && isWideEntry(path)) { wide.push(wideFinding(path, file, line)); continue }
const badReason = REASON_CHECKS.find((c) => c.rejects(record))
if (badReason !== undefined) { reject(badReason.reason); continue }
if (path !== undefined && accepted.has(normalizePath(path))) {
  reject('path duplicado — a primeira ocorrencia vale; esta e ignorada')
  continue
}
// ... entries.push(...); accepted.add(normalizePath(path))
return { entries, rejected, wide, notes }
```

Entrada ampla **nao** entra em `rejected` — ela tem canal proprio (`wide` → finding) e listar nas duas
duplicaria o sinal no relatorio. `summary.allowlist.wide` e a contagem.

### Passo 3: Fixture `nextjs-allowlist-wide` (dados — sem `middleware.ts`, G1)

```json
{
  "routes": [
    { "path": "/api/*", "reason": "toda a API e publica" }
  ]
}
```

```ts
// tests/fixtures/route-auth-matrix/nextjs-allowlist-wide/app/api/admin/route.ts
// 2026-09-05 (Luiz/dev): fixture CA-04 — a entrada `/api/*` nao a cobre (ampla e recusada); sai critical.
export function GET() {
  return Response.json({ admin: true })
}
```

### Passo 4: `allowlistFindings`, `allowlistToContractIssue`, `buildContractIssues` (DP-9)

```ts
// route-auth-matrix.ts
// dentro de auditRouteCoverage — `allowlist.wide` ja vem da lib; ordenar como os findings de rota:
const allowlistFindings = [...allowlist.wide].sort((a, b) => {
  const bySeverity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
  return bySeverity !== 0 ? bySeverity : a.line - b.line
})
// return { findings, allowlistFindings, verdicts, summary }

export function allowlistToContractIssue(finding: AllowlistFinding, index: number): ContractIssue {
  return {
    id: `ALLOW-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.file,
    line: finding.line,
    description: finding.description,
  }
}

/** DP-9: allowlist PRIMEIRO (e sobre a configuracao do check), depois rota. Cada lista ja vem por severidade. */
export function buildContractIssues(result: AuditResult): ContractIssue[] {
  return [...result.allowlistFindings.map(allowlistToContractIssue), ...result.findings.map(toContractIssue)]
}

// CLI — trocar a ultima linha:
const result = auditRouteCoverage(target, { changedFiles: diff.files })
console.log(JSON.stringify({ issues: buildContractIssues(result), summary: result.summary }, null, 2))
```

### Passo 5: Agente — secao 11 (ADITIVO, G9)

```markdown
- Issues com id `ALLOW-*` sao findings sobre a PROPRIA allowlist (entrada ampla como `/api/*` —
  PRD AB-1/CA-04), vem ANTES das `ROUTE-*` e apontam `anti-vibe.public-routes.json:linha`. Copie
  como estao. Uma entrada ampla NAO cala rota nenhuma: as rotas sob ela continuam avaliadas pelo
  motor e aparecem como `ROUTE-*` normalmente — nao "desconte" uma pela outra nem some as duas num
  finding so. Cite `summary.allowlist.wide` em `reasoning`.
```

### Passo 6: Manifest

`bun run generate:manifest` (lib, matrix, agente). Revisar pelo checksum (G2).

---

## Gotchas

- **G1 do plano:** a fixture wide tem so o JSON e um `route.ts`. Sem `middleware.ts`, a rota admin e
  `DESCOBERTA` — e o que o teste "silences nothing" precisa. Nao acrescentar middleware.
- **G8 do plano:** amplitude e o caso de abuso central da allowlist (PRD "Fronteiras de confianca":
  "um curinga amplo nela desliga o check em silencio"). O teste de abuso e escrito ANTES da defesa e a
  defesa e dupla — recusar E reportar. Recusar sozinho seria silencio com outro nome.
- **G13 do plano:** `:nome` e amplo por DP-3. Isso colide com o Express no Plano 04 (`Route.path` la e
  `/users/:id` literal). Seguir a DP-3 aqui; a pendencia esta no MEMORY (DEV-plan-4) para o dev
  decidir antes do Plano 04 fase-02. Nao antecipar regra por stack nesta fase.
- **G4 do plano:** `result.wide[0]?.line`, `issues[0]?.severity`.
- **Local — ordem das checagens importa e e testada:** `PATH_CHECKS` → amplitude → `REASON_CHECKS` →
  duplicata. `{ "path": "/api/*" }` sem reason gera finding `high` (teste "even when it has no reason").
  Se a ordem inverter, o abuso vira uma recusa discreta em `rejected` e o sinal se perde.
- **Local — duplicata so entre ACEITOS:** `accepted` e alimentado depois do `push` em `entries`. Duas
  entradas amplas iguais geram dois findings (cada uma na sua linha) — nao uma recusa por duplicata.
  Duas entradas invalidas iguais geram duas recusas. Deduplicar antes de validar esconderia problemas.
- **Local — `allowlistFindings` ordenado por severidade e depois por `line`** (nao por `path`, como os
  de rota): todos sao `high` hoje, entao a linha e o desempate natural para o relatorio ler de cima
  para baixo.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-04: emits its own'`
  - Resultado esperado: `Expected length: 1, Received length: 0` — `allowlistFindings` existe desde a
    fase-01 como `[]` (DP-9), por isso e assertion e nao erro de compilacao
  - RED do parser: `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'CA-04: refuses'` →
    `Expected length: 1, Received length: 0` em `result.wide` (a fase-01 devolve `wide: []`)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/public-routes-allowlist.test.ts`
  - Resultado esperado: `18 pass, 0 fail` (12 da fase-01 + 6)
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `23 pass, 0 fail` (20 + 3)

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `CA-04: emits its own high finding for a wide allowlist entry,
      independent of the routes` FALHOU antes de `isWideEntry` existir — o abuso AB-1 (`/api/*` cala o
      check para toda a API) foi escrito ANTES da defesa, como o PRD exige
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-04'`
  - Resultado esperado no RED: `Expected length: 1, Received length: 0`
- [ ] **CA-04 (AB-1):** Dado `anti-vibe.public-routes.json` com uma entrada `/api/*`, quando o auditor
      roda, entao emite finding proprio sobre a amplitude da entrada, independente das rotas —
      verificado por `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-04'` (2 testes) e
      `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'CA-04'`
- [ ] **CA-04b consolidado (duplicata):** segunda ocorrencia recusada com a propria linha —
      `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'duplicated|trailing-slash variants'`
- [ ] **A entrada ampla nao cala rota nenhuma:** `-t 'silences nothing'` verde — `findings` continua
      com o `critical` da rota admin
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase nao decide o que e publico;
      ela recusa o que e amplo demais para ser uma decisao
- [ ] Nenhum secret literal entrou no codigo ou na fixture

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, fazer `isWideEntry` devolver `false`
      → `-t 'CA-04'` FALHA nos dois arquivos com `Received length: 0`; restaurar. Depois remover a
      checagem de duplicata → `-t 'duplicated'` FALHA com `Expected length: 1, Received length: 0` em
      `rejected`; restaurar. Depois inverter a ordem (reason antes de amplitude) → `-t 'even when it has
      no reason'` FALHA; restaurar.
- [ ] `grep -n "switch" skills/security/lib/public-routes-allowlist.ts skills/security/lib/route-auth-matrix.ts` → vazio
- [ ] `ls tests/fixtures/route-auth-matrix/nextjs-allowlist-wide/` NAO contem `middleware.ts` (G1)
- [ ] CLI contra o repo do plugin: `bun skills/security/lib/route-auth-matrix.ts . --ref main` devolve
      JSON com `issues: []` e `summary.allowlist.present: false` (o plugin nao tem allowlist) — sem `blocked`
- [ ] `git diff agents/security-auditor.md` e so adicao (G9); secao 11 cita `ALLOW-*` e `wide`
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G2)
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G11)
- [ ] MEMORY.md: contagem real de testes se diferir de 18/23; qualquer DI sobre a ordem das checagens

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-04'` retorna `2 pass`
- `bun test skills/security/lib/public-routes-allowlist.test.ts -t 'isWideEntry|amplitude'` retorna `0 fail`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning

**Por humano:**
- Num projeto Next.js real com `{ "path": "/api/*", "reason": "..." }` na allowlist,
  `/anti-vibe-coding:security` mostra `ALLOW-001 high` apontando a linha da entrada E continua mostrando
  `ROUTE-*` para as rotas sob `/api` que estao abertas — **pendente de sync do cache do plugin (G12)**;
  registrar como divida

---

<!-- Gerado por /plan-feature em 2026-09-05 -->

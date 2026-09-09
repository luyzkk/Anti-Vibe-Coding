<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Tracer Bullet Ingenuo (Next.js)

**Plano:** 01 — Fundacao + Tracer Bullet (Next.js)
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase — e o tracer bullet do PRD inteiro)
**Visual:** false

---

## O que esta fase entrega

A fatia mais fina que atravessa TODAS as camadas: uma fixture Next.js com uma rota e um middleware,
uma lib que decide cobertura por string-match ingenuo e devolve um finding no contrato v2.0.0, e o
`security-auditor` com `Bash` instruido a invoca-la — provando que o auditor consegue executar codigo
do plugin e que o achado chega ao envelope.

**Naive-first e regra, nao atalho.** Se esta fase tentar AST, segmentos dinamicos ou os 4 veredictos,
ela deixou de ser tracer bullet. Cada peca ingenua daqui tem uma fase dona que a substitui.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fixtures/route-auth-matrix/nextjs-minimal/app/api/admin/route.ts` | Create | Uma rota `GET` fora do matcher |
| `tests/fixtures/route-auth-matrix/nextjs-minimal/middleware.ts` | Create | `config.matcher` literal que NAO cobre `/api/admin` |
| `skills/security/lib/route-auth-matrix.ts` | Create | `auditRouteCoverage(targetDir)` ingenua + entrada CLI |
| `skills/security/lib/route-auth-matrix.test.ts` | Create | Um teste: fixture → finding com `kind`, `severity`, `path` |
| `agents/security-auditor.md` | Modify | `Bash` no `tools:`; secao 11 (invocacao); linha de allowlist em `## Regras` — tudo aditivo |
| `agents/dependency-auditor.md` | Modify | Frase datada esclarecendo o escopo do Bash do `security-auditor` (G9) — aditivo |
| `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/PRD.md` | Modify | Linha 10 na tabela `## Decisoes Tecnicas` |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) |

8 arquivos — acima da regra de 5 da politica de fases. Excecao declarada no README: tracer bullet
atravessa todas as camadas por definicao; 2 sao dados de fixture e 1 e gerado.

---

## Implementacao

### Passo 1: Fixture minima

Sem importar `next/*` — o `tsconfig.json` inclui `**/*.ts` e `next` nao esta instalado (G7). Usar os
globais `Request`/`Response` de `bun-types`, como `tests/fixtures/ast-route-fixtures/route-fn-declaration.ts`.

```ts
// tests/fixtures/route-auth-matrix/nextjs-minimal/app/api/admin/route.ts
// 2026-09-03 (Luiz/dev): fixture CA-01 — rota admin fora do matcher. Sem import de next/* (G7).
export function GET() {
  return Response.json({ admin: true })
}
```

```ts
// tests/fixtures/route-auth-matrix/nextjs-minimal/middleware.ts
// 2026-09-03 (Luiz/dev): matcher literal que cobre /dashboard e NAO cobre /api/admin — PRD CA-01.
export function middleware(_request: Request) {
  return new Response(null, { status: 401 })
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### Passo 2: Lib ingenua com entrada CLI

Casa natural: `skills/security/lib/` (ao lado de `stack-aware-preface.ts`). I/O sincrono como o
precedente (nota L5 do `stack-aware-preface.ts`): roda uma vez por auditoria sobre arquivos locais.

```ts
// skills/security/lib/route-auth-matrix.ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { IssueSeverity } from '../../lib/subagent-contract'

/**
 * Finding de cobertura de rota. Superset do item de `payload.issues` do contrato v2.0.0
 * (`severity`, `file`, `line`, `description`) com `kind` e `path` para uso interno.
 * fase-02 substitui por `RouteFinding` do contrato de tipos.
 */
export type RouteAuditFinding = {
  kind: 'DESCOBERTA'
  severity: IssueSeverity
  path: string
  file: string
  line: number
  description: string
}

/** Item exatamente no shape de `AuditContractV2['payload']['issues'][number]`. */
export type ContractIssue = {
  id: string
  severity: IssueSeverity
  file: string
  line: number
  description: string
}

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function walkRouteFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkRouteFiles(full))
    else if (name === 'route.ts') out.push(full)
  }
  return out
}

function toRoutePath(targetDir: string, file: string): string {
  const rel = toPosix(relative(targetDir, file))
  return '/' + rel.replace(/^app\//, '').replace(/\/route\.ts$/, '')
}

/**
 * Tracer bullet: globa `app/**\/route.ts`, le `middleware.ts` como texto e decide cobertura por
 * string-match. Tudo ingenuo de proposito — fase-03 troca o glob, fase-04 troca o match,
 * fase-05 troca a severidade fixa.
 */
export function auditRouteCoverage(targetDir: string): RouteAuditFinding[] {
  const middlewarePath = join(targetDir, 'middleware.ts')
  const matcherText = existsSync(middlewarePath) ? readFileSync(middlewarePath, 'utf8') : ''
  const findings: RouteAuditFinding[] = []

  for (const file of walkRouteFiles(join(targetDir, 'app'))) {
    const path = toRoutePath(targetDir, file)
    if (matcherText.includes(path)) continue
    findings.push({
      kind: 'DESCOBERTA',
      severity: 'critical',
      path,
      file: toPosix(relative(targetDir, file)),
      line: 1,
      description: `DESCOBERTA: ${path} sem cobertura de middleware — o texto de middleware.ts nao contem o caminho`,
    })
  }
  return findings
}

export function toContractIssue(finding: RouteAuditFinding, index: number): ContractIssue {
  return {
    id: `ROUTE-${String(index + 1).padStart(3, '0')}`,
    severity: finding.severity,
    file: finding.file,
    line: finding.line,
    description: finding.description,
  }
}

if (import.meta.main) {
  const target = process.argv[2] ?? process.cwd()
  const findings = auditRouteCoverage(target)
  console.log(JSON.stringify({ issues: findings.map(toContractIssue), summary: { enumerated: findings.length } }, null, 2))
}
```

Rodar manualmente para ver a saida antes de mexer no agente:

```
bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-minimal
```

Esperado: JSON com `issues[0].severity === "critical"` e `issues[0].file === "app/api/admin/route.ts"`.

### Passo 3: Teste (RED primeiro)

```ts
// skills/security/lib/route-auth-matrix.test.ts
// 2026-09-03 (Luiz/dev): tracer bullet do PRD route-auth-matrix-audit — CA-01 no shape ingenuo.
import { describe, it, expect } from 'bun:test'
import { join } from 'node:path'
import { auditRouteCoverage } from './route-auth-matrix'

const FIXTURES = join(import.meta.dir, '../../../tests/fixtures/route-auth-matrix')

describe('auditRouteCoverage (tracer bullet)', () => {
  it('emits one DESCOBERTA finding for app/api/admin/route.ts outside the matcher', () => {
    const findings = auditRouteCoverage(join(FIXTURES, 'nextjs-minimal'))
    expect(findings).toHaveLength(1)
    const [finding] = findings
    expect(finding?.kind).toBe('DESCOBERTA')
    expect(finding?.severity).toBe('critical')
    expect(finding?.path).toBe('/api/admin')
    expect(finding?.file).toBe('app/api/admin/route.ts')
  })
})
```

RED honesto: escrever o teste com a lib exportando `auditRouteCoverage` que devolve `[]`
(stub) — falha por `toHaveLength(1)`, nao por import inexistente. So depois preencher o corpo.

### Passo 4: `security-auditor.md` — aditivo (G4)

**Frontmatter, linha 6** — de `tools: Read, Grep, Glob` para:

```yaml
tools: Read, Grep, Glob, Bash
```

**Nova subsecao apos `### 10. Seguranca de API`** (copiar o padrao do `dependency-auditor.md`, que
instrui o comando e o que fazer com a saida):

```markdown
### 11. Matriz Rota x Middleware de Auth (execucao via lib)
- Rode, a partir da raiz do projeto auditado, exatamente este comando:
  `bun "${CLAUDE_PLUGIN_ROOT}/skills/security/lib/route-auth-matrix.ts" .`
- A saida e JSON `{ issues, summary }`. Copie cada item de `issues` para `payload.issues` SEM
  reescrever `severity` nem `description` — a severidade e regra fixa da lib (PRD
  route-auth-matrix-audit, Decisao 9), nao julgamento seu.
- Cite `summary` em `reasoning`: quantas rotas foram enumeradas e quantas ficaram indeterminadas
  (observabilidade do PRD).
- Se o comando falhar (bun ausente, `CLAUDE_PLUGIN_ROOT` indefinido, lib nao encontrada): registre
  a falha literal em `reasoning`, NAO invente o resultado, e siga com as secoes 1–10.
- Auth chamada dentro do handler (`getServerSession()`, `auth()`, `supabase.auth.getUser()`) NAO
  conta como cobertura de rota — e a secao 8 que a avalia (PRD Decisao 4).
```

**Em `## Regras`, acrescentar** (nao substituir a regra "NUNCA modifique arquivos"):

```markdown
- `Bash` neste agente e READ-ONLY e restrito a UM comando: o da secao 11
  (`bun "${CLAUDE_PLUGIN_ROOT}/skills/security/lib/route-auth-matrix.ts" ...`). Nenhum outro
  comando — nem `git`, nem `ls`, nem script do projeto auditado. Se a correcao exige comando,
  REPORTE o comando.
```

**Rodape de proveniencia** (junto dos dois comentarios HTML existentes antes de
`## Formato de Saida`):

```html
<!-- 2026-09-03 (Luiz/dev): Bash restrito a lib route-auth-matrix — PRD route-auth-matrix-audit Decisao 10. Precedente: dependency-auditor, tdd-verifier, database-analyzer. -->
```

### Passo 5: `dependency-auditor.md` — esclarecer sem diminuir (G9)

Linhas 120–121 dizem que o `security-auditor` "permanece read-only sem Bash". Acrescentar logo
apos, na mesma lista:

```markdown
  (2026-09-03: o `security-auditor` passou a ter `Bash` restrito a lib `route-auth-matrix` — PRD
  route-auth-matrix-audit, Decisao 10. SCA continua fora dele; a separacao de escopos permanece.)
```

### Passo 6: Emenda no PRD

Acrescentar a linha 10 na tabela `## Decisoes Tecnicas` do `PRD.md`, apos a linha 9:

```markdown
| 10 | Execução da enumeração | Bash no auditor + libs TS em skills/security/lib | Prosa pura (Read/Grep/Glob) ou enumeração no verify-work | Prosa mata CA-06 e CA-08 (regex de matcher vira interpretação do LLM); no verify-work o check some quando /security e /iterate invocam o auditor direto. Precedente: dependency-auditor, tdd-verifier, database-analyzer já têm Bash |
```

### Passo 7: Manifest e contrato

```
bun run generate:manifest
bun run agents:contract
```

O manifest precisa registrar `skills/security/lib/route-auth-matrix.ts` (novo) e o checksum novo de
`agents/security-auditor.md` e `agents/dependency-auditor.md`. Commit unico com tudo (G3).

---

## Gotchas

- **G3 do plano:** tres arquivos rastreados mudam aqui (lib nova + 2 agentes). Sem
  `generate:manifest` no mesmo commit o `/update` passa a ver o checkout como desatualizado.
- **G4 do plano:** o diff do `security-auditor.md` deve ser so adicoes — `git diff --stat` mostra
  `0 deletions` exceto a linha 6 do frontmatter.
- **G7 do plano:** rodar `bun run typecheck` DEPOIS de criar a fixture. Se `middleware.ts` importar
  `next/server`, o typecheck do repo inteiro quebra.
- **G8 do plano:** `toPosix()` antes de comparar e antes de gravar `file`. O teste espera
  `app/api/admin/route.ts` com barra normal tambem no Windows.
- **G10 do plano:** o comando no agente ancora em `${CLAUDE_PLUGIN_ROOT}` porque o cwd do subagente
  e o projeto auditado. Confirmar que a variavel chega ao Bash do subagente — se nao chegar, e
  pendencia para o orquestrador (ver Checklist), nao para improvisar caminho absoluto no agente.
- **Local — string-match e falso-negativo por natureza:** `/admin/:path*` contem `/admin`, entao
  `app/admin/route.ts` sairia "coberta" por texto. E exatamente o AB-3 do PRD; a fase-04 existe
  para isso. Nesta fase o matcher da fixture (`/dashboard/:path*`) foi escolhido para NAO cair
  nessa armadilha — nao trocar.
- **Local — sem `--ref`:** a lib desta fase avalia toda rota da fixture. O escopo G1 (diff) entra
  na fase-05. Nao antecipar.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'emits one DESCOBERTA finding'`
  - Resultado esperado: `Expected length: 1, Received length: 0` (stub devolve `[]`)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `1 pass, 0 fail`

### Checklist

- [ ] CLI manual devolve JSON com 1 issue `critical` em `app/api/admin/route.ts`:
      `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-minimal`
- [ ] `security-auditor.md` linha 6 contem `Bash`; secao `### 11.` existe; `## Regras` tem a linha
      de allowlist; `git diff agents/security-auditor.md` nao remove nenhuma linha das secoes 1–10
- [ ] `dependency-auditor.md` recebeu a frase datada apos a linha 121 (`grep -n "2026-09-03" agents/dependency-auditor.md`)
- [ ] PRD tem a linha `| 10 |` (`grep -n "^| 10 |" docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/PRD.md`)
- [ ] `bun run generate:manifest` sem warning; `git diff --stat plugin-manifest.json` mostra 3 entradas alteradas/novas
- [ ] `bun run agents:contract` verde (o exemplo JSON do agente nao mudou; o validator continua aceitando)
- [ ] `CLAUDE_PLUGIN_ROOT` chega ao Bash do subagente: invocar o `security-auditor` via
      `/anti-vibe-coding:security` num projeto Next.js de teste e conferir no `reasoning` que o
      comando rodou (ou registrar a falha literal). Se a variavel nao existir: anotar no MEMORY.md
      como GT e escalar para o orquestrador antes da fase-02
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (inclui a fixture — G7)
- [ ] `bun run harness:validate` verde (a fase toca `docs/` — PRD)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-matrix.test.ts` retorna `1 pass, 0 fail`
- `bun run generate:manifest` retorna sem warning e `plugin-manifest.json` contem
  `"skills/security/lib/route-auth-matrix.ts"`
- `bun run agents:contract` retorna todos verdes
- `bun run typecheck` retorna sem erros
- `grep -c "Bash" agents/security-auditor.md` >= 2 (frontmatter + regra)

**Por humano:**
- Invocado num projeto Next.js real via `/anti-vibe-coding:security`, o `security-auditor` executa
  o comando da secao 11 e o envelope traz `ROUTE-001` em `payload.issues` (ou o `reasoning` traz a
  falha literal do comando — nunca silencio)

---

<!-- Gerado por /plan-feature em 2026-09-03 -->

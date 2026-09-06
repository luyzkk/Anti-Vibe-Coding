<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Destaque de Mudanca da Allowlist e `indeterminada` MEDIO

**Plano:** 02 — Allowlist e veredictos completos
**Sizing:** 1.5h
**Depende de:** fase-02
**Visual:** false

---

## O que esta fase entrega

`indeterminada` deixa de ser rodape e vira finding **MEDIO** com `arquivo:linha` e o motivo (D8 / CA-10);
quando `anti-vibe.public-routes.json` esta no diff, a lib marca `summary.allowlist.changed = true` e
computa o delta contra a versao no merge-base via seam `readAtBase` — base indisponivel vira
`before: 'unavailable'` com tudo em `added`, nunca silencio (AB-4 / CA-07); o `security-auditor` abre
o `reasoning` com bloco destacado e o `verify-work` o reproduz em secao propria antes de Issues Found,
com `verdict` no minimo `request_changes`.

**DP aplicadas:** DP-10, DP-11 (refinada — seam `BaseRead` de 3 estados, ver README/MEMORY DEV-plan-2),
DP-12 (refinada — `request_changes` + `status: complete`, ver README G19/MEMORY DEV-plan-3), DP-8 (fecha:
`changed`, `delta`).

> **Gate antes de comecar:** o executor confirma com o dev os dois refinamentos (DEV-plan-2 e DEV-plan-3
> no MEMORY). Se o dev preferir a DP original em qualquer um dos dois, PARAR — a DP-12 original exige
> mudar `audit-consolidator.ts` primeiro, fora deste plano.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-matrix.test.ts` | Modify (PRIMEIRO) | CA-10 (reescrita do teste "sem emitir"), ordenacao com `medium`, CA-07 (4 testes), `readAtBaseFromGit` (3) |
| `skills/security/lib/public-routes-allowlist.test.ts` | Modify | `diffAllowlist` (2 testes) |
| `skills/security/lib/route-auth-matrix.ts` | Modify | `indeterminada` emite `medium`; `AuditOptions.readAtBase`; `changed`/`delta`; `readAtBaseFromGit`; CLI injeta |
| `skills/security/lib/public-routes-allowlist.ts` | Modify | `diffAllowlist(before, after)` |
| `skills/security/lib/route-auth-matrix.types.ts` | Modify (ADITIVO) | `BaseRead`, `AllowlistDelta` |
| `agents/security-auditor.md` | Modify (ADITIVO — G9) | Secao 11: bloco destacado, `request_changes`, `indeterminada` nunca rebaixada, `delta.before: unavailable`, `delta.removed` |
| `skills/verify-work/SKILL.md` | Modify (ADITIVO — G9) | Step 3: item 2c, linha `Public routes allowlist` no Summary, secao `### Allowlist de rotas publicas — ALTERADA` antes de `### Issues Found` |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — lib, types, agente, SKILL |

> Excecao declarada (>5 arquivos): agente e skill sao o MESMO caminho de emissao — o bloco nasce no
> agente e e reproduzido no relatorio. Separar em duas fases deixaria um estado em que o agente emite
> um bloco que o relatorio ignora, e AB-4 e exatamente "a mudanca some no meio do PR".

---

## Implementacao

### Passo 1: Testes PRIMEIRO — CA-10 (reescrita honesta) e CA-07 (abuso AB-4 antes da defesa)

O teste `counts indeterminada in the summary without emitting a finding (emission is Plano 02)` e
**substituido** (nao duplicado) por:

```ts
// route-auth-matrix.test.ts
it('CA-10: emits a medium finding for each indeterminada route instead of hiding it', () => {
  const { findings, summary } = auditRouteCoverage(MINIMAL, {
    changedFiles: ['app/api/users/[id]/route.ts'],
    coverageOverride: {
      stack: 'nextjs',
      rules: [{ kind: 'opaque', reason: 'matcher computado', file: 'middleware.ts', line: 1 }],
      sources: ['middleware.ts'],
      notes: [],
    },
  })
  expect(findings).toHaveLength(2)                       // GET e DELETE de /api/users/[id]
  expect(findings.map((f) => f.severity)).toEqual(['medium', 'medium'])
  expect(findings.map((f) => f.verdict)).toEqual(['indeterminada', 'indeterminada'])
  expect(findings[0]?.missing).toContain('computado')
  expect(summary.indeterminada).toBe(2)
  const issue = findings.map(toContractIssue)[0]
  expect(issue?.description).toContain('indeterminada: ')
  expect(issue?.description).toContain('cobertura nao demonstravel')
})

// coverage(['/docs/:one']) → /api/admin nao casa (DESCOBERTA critical); /docs/[...slug] casa so uma
// sonda (partial → indeterminada medium). Prova que medium vem DEPOIS de critical na lista.
it('orders medium indeterminada after critical and high findings', () => {
  const { findings } = auditRouteCoverage(MINIMAL, {
    changedFiles: ['app/docs/[...slug]/page.tsx', 'app/api/admin/route.ts'],
    coverageOverride: coverage(['/docs/:one']),
  })
  expect(findings.map((f) => f.severity)).toEqual(['critical', 'medium'])
})

describe('auditRouteCoverage — mudanca na allowlist (AB-4 / CA-07)', () => {
  const ALLOWLIST_IN_DIFF = ['anti-vibe.public-routes.json', 'app/api/health/route.ts']

  it('CA-07: flags the allowlist as changed and lists the delta when the file is in the diff', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ALLOWLIST_IN_DIFF,
      readAtBase: () => ({ status: 'found', source: '{"routes":[]}' }),
    })
    expect(summary.allowlist.changed).toBe(true)
    expect(summary.allowlist.delta?.before).toBe('resolved')
    expect(summary.allowlist.delta?.added.map((e) => e.path)).toEqual(['/api/health', '/api/webhooks/stripe'])
    expect(summary.allowlist.delta?.removed).toEqual([])
  })

  it('lists removed entries when the base declared a route that the head no longer does', () => {
    const base = JSON.stringify({ routes: [{ path: '/api/health', reason: 'lb' }, { path: '/api/legacy', reason: 'antiga' }] })
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ALLOWLIST_IN_DIFF,
      readAtBase: () => ({ status: 'found', source: base }),
    })
    expect(summary.allowlist.delta?.added.map((e) => e.path)).toEqual(['/api/webhooks/stripe'])
    expect(summary.allowlist.delta?.removed.map((e) => e.path)).toEqual(['/api/legacy'])
  })

  it('treats a file absent at the base as resolved with everything added', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ALLOWLIST_IN_DIFF, readAtBase: () => ({ status: 'absent' }) })
    expect(summary.allowlist.delta?.before).toBe('resolved')
    expect(summary.allowlist.delta?.added).toHaveLength(2)
  })

  // 2026-09-05 (Luiz/dev): DP-11 — NUNCA silencio. Base ilegivel nao e "sem mudanca".
  it('never stays silent when the base is unavailable', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ['anti-vibe.public-routes.json'],
      readAtBase: () => ({ status: 'unavailable', reason: 'ref nao resolvivel' }),
    })
    expect(summary.allowlist.changed).toBe(true)
    expect(summary.allowlist.delta?.before).toBe('unavailable')
    expect(summary.allowlist.delta?.added).toHaveLength(2)
    expect(summary.allowlist.delta?.reason).toContain('ref nao resolvivel')
  })

  it('reports unavailable when no base reader was given', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['anti-vibe.public-routes.json'] })
    expect(summary.allowlist.delta?.before).toBe('unavailable')
    expect(summary.allowlist.delta?.reason).toContain('readAtBase')
  })

  it('leaves changed=false and no delta when the allowlist is not in the diff', () => {
    const { summary } = auditRouteCoverage(ALLOWLIST, { changedFiles: ['app/api/health/route.ts'] })
    expect(summary.allowlist.changed).toBe(false)
    expect(summary.allowlist.delta).toBeUndefined()
  })
})

// Integracao real com git: o repo do plugin E um repositorio; `import.meta.dir` ancora a raiz.
describe('readAtBaseFromGit (leitura no merge-base)', () => {
  const REPO = join(import.meta.dir, '../../..')
  it('returns found with the file content for a tracked file at HEAD', () => {
    const read = readAtBaseFromGit(REPO, 'HEAD')('package.json')
    expect(read.status).toBe('found')
    if (read.status === 'found') expect(read.source).toContain('"name"')
  })
  it('returns absent for a file that does not exist at the base', () => {
    expect(readAtBaseFromGit(REPO, 'HEAD')('nao-existe-nesta-base.json').status).toBe('absent')
  })
  it('returns unavailable with a reason when the ref cannot be resolved', () => {
    const read = readAtBaseFromGit(REPO, 'ref-que-nao-existe-xyz')('package.json')
    expect(read.status).toBe('unavailable')
    if (read.status === 'unavailable') expect(read.reason.length).toBeGreaterThan(0)
  })
})
```

```ts
// public-routes-allowlist.test.ts — acrescentar (import diffAllowlist)
describe('diffAllowlist (delta por path normalizado)', () => {
  const entry = (path: string, line: number): AllowlistEntry => ({ path, reason: 'r', file: FILE, line })
  it('returns added and removed entries keyed by path', () => {
    const { added, removed } = diffAllowlist([entry('/a', 3), entry('/b', 4)], [entry('/b', 3), entry('/c', 4)])
    expect(added.map((e) => e.path)).toEqual(['/c'])
    expect(removed.map((e) => e.path)).toEqual(['/a'])
    expect(removed[0]?.line).toBe(3)   // linha da versao NA BASE
  })
  it('does not report a trailing-slash-only difference as a change', () => {
    const { added, removed } = diffAllowlist([entry('/a/', 3)], [entry('/a', 3)])
    expect(added).toEqual([])
    expect(removed).toEqual([])
  })
})
```

### Passo 2: Tipos — ADITIVO em `route-auth-matrix.types.ts`

```ts
// 2026-09-05 (Luiz/dev): DP-11 refinada (MEMORY DEV-plan-2). Tres estados porque a DP exige tres
// consequencias: encontrado → diff real; ausente na base → tudo `added` com before 'resolved';
// indisponivel → before 'unavailable' + reason. Um `string | null` nao distingue os dois ultimos, e
// o Plano 03 reusa este seam para `middleware.ts` — nao pode devolver um literal de allowlist vazia.
export type BaseRead =
  | { status: 'found'; source: string }
  | { status: 'absent' }
  | { status: 'unavailable'; reason: string }

export type AllowlistDelta = {
  before: 'resolved' | 'unavailable'
  added: AllowlistEntry[]
  /** `file`/`line` apontam para a versao NA BASE — a entrada nao existe mais no HEAD. */
  removed: AllowlistEntry[]
  reason?: string
}
```

### Passo 3: `indeterminada` emite MEDIO (DP-10) — hash maps por veredito

```ts
// route-auth-matrix.ts
// 2026-09-05 (Luiz/dev): PRD D8 / CA-10 — nao emitir transformaria todo limite do adaptador em
// aprovacao tacita (RF-04). Ruido visivel ganha de silencio que parece aprovacao.
const SEVERITY_BY_VERDICT: Readonly<Record<RouteFinding['verdict'], (route: Route) => IssueSeverity>> = {
  DESCOBERTA: severityFor,
  indeterminada: () => 'medium',
}

// substitui o filter/map de DESCOBERTA:
const findings: RouteFinding[] = []
for (const v of verdicts) {
  if (v.verdict !== 'DESCOBERTA' && v.verdict !== 'indeterminada') continue
  findings.push({ route: v.route, verdict: v.verdict, severity: SEVERITY_BY_VERDICT[v.verdict](v.route), missing: v.evidence })
}
// a ordenacao existente (SEVERITY_ORDER) ja poe medium depois de critical/high

// toContractIssue — a cauda da description por veredito (DP-14 para DESCOBERTA, DP-10 para indeterminada):
const DESCRIPTION_BY_VERDICT: Readonly<Record<RouteFinding['verdict'], (f: RouteFinding) => string>> = {
  DESCOBERTA: (f) => `sem cobertura de middleware e nao declarada publica em ${PUBLIC_ROUTES_FILE} — ${f.missing}`,
  indeterminada: (f) => `— cobertura nao demonstravel: ${f.missing}`,
}
description: `${f.verdict}: ${f.route.method} ${f.route.path} (${f.route.file}:${f.route.line}) ${DESCRIPTION_BY_VERDICT[f.verdict](f)}`
```

### Passo 4: `changed` + `delta` via `readAtBase` (DP-11)

```ts
// public-routes-allowlist.ts
/** Delta por path normalizado (DP-2). Edicao so de `reason` nao aparece aqui — `changed: true` ja a sinaliza. */
export function diffAllowlist(before: AllowlistEntry[], after: AllowlistEntry[]): { added: AllowlistEntry[]; removed: AllowlistEntry[] } {
  const key = (e: AllowlistEntry): string => normalizePath(e.path)
  const beforeKeys = new Set(before.map(key))
  const afterKeys = new Set(after.map(key))
  return { added: after.filter((e) => !beforeKeys.has(key(e))), removed: before.filter((e) => !afterKeys.has(key(e))) }
}
```

```ts
// route-auth-matrix.ts
import { PUBLIC_ROUTES_FILE, diffAllowlist, matchAllowlist, parsePublicRoutes, readPublicRoutes } from './public-routes-allowlist'
import type { AllowlistDelta, AllowlistEntry, BaseRead } from './route-auth-matrix.types'

export type AuditOptions = {
  changedFiles?: string[]
  coverageOverride?: CoverageMap
  /**
   * Le `file` na ponta ANTES do diff (merge-base). A CLI injeta `readAtBaseFromGit`; testes injetam
   * lambda. 2026-09-05 (Luiz/dev): mesmo seam que o Plano 03 usa para `middleware.ts` — nao criar outro.
   */
  readAtBase?: (file: string) => BaseRead
}

export type AllowlistSummary = {
  // ... fase-01 ...
  changed: boolean
  delta?: AllowlistDelta   // presente SO quando changed — G3: spread condicional
}

// DP-11: NUNCA silencio. Cada ramo escreve o que aconteceu.
function computeAllowlistDelta(current: AllowlistEntry[], readAtBase: AuditOptions['readAtBase']): AllowlistDelta {
  if (readAtBase === undefined) {
    return { before: 'unavailable', added: current, removed: [], reason: 'sem leitor da base (readAtBase ausente) — delta assume tudo como novo' }
  }
  let read: BaseRead
  try {
    read = readAtBase(PUBLIC_ROUTES_FILE)
  } catch (error) {
    read = { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
  }
  if (read.status === 'unavailable') {
    return { before: 'unavailable', added: current, removed: [], reason: `base do diff indisponivel: ${read.reason} — delta assume tudo como novo` }
  }
  if (read.status === 'absent') return { before: 'resolved', added: current, removed: [] }
  const base = parsePublicRoutes(read.source, `${PUBLIC_ROUTES_FILE}@base`)
  return { before: 'resolved', ...diffAllowlist(base.entries, current) }
}

// dentro de auditRouteCoverage:
const allowlistChanged = changed.has(PUBLIC_ROUTES_FILE)   // G15: igualdade exata, POSIX vindo do git
const delta = allowlistChanged ? computeAllowlistDelta(allowlist.entries, opts.readAtBase) : undefined
// summary.allowlist: { ...fase-01..., changed: allowlistChanged, ...(delta !== undefined ? { delta } : {}) }
```

Leitor git-backed, na secao CLI, ao lado de `changedFilesFromGit`. `git` roda DENTRO da lib com
`cwd: targetDir` (G6) — o Bash do agente continua sendo UM comando.

```ts
const decode = (buf: Uint8Array): string => new TextDecoder().decode(buf).trim()

/** `git merge-base <ref> HEAD` → `git cat-file -e <sha>:<file>` (0 = existe, 1 = ausente, 128 = erro) → `git show`. */
export function readAtBaseFromGit(targetDir: string, ref: string): (file: string) => BaseRead {
  return (file) => {
    try {
      const base = Bun.spawnSync(['git', 'merge-base', ref, 'HEAD'], { cwd: targetDir })
      if (base.exitCode !== 0) return { status: 'unavailable', reason: decode(base.stderr) || `merge-base saiu com codigo ${base.exitCode}` }
      const sha = decode(base.stdout)
      const exists = Bun.spawnSync(['git', 'cat-file', '-e', `${sha}:${file}`], { cwd: targetDir })
      if (exists.exitCode === 1) return { status: 'absent' }
      if (exists.exitCode !== 0) return { status: 'unavailable', reason: decode(exists.stderr) || `cat-file saiu com codigo ${exists.exitCode}` }
      const show = Bun.spawnSync(['git', 'show', `${sha}:${file}`], { cwd: targetDir })
      if (show.exitCode !== 0) return { status: 'unavailable', reason: decode(show.stderr) || `show saiu com codigo ${show.exitCode}` }
      return { status: 'found', source: new TextDecoder().decode(show.stdout) }
    } catch (error) {
      return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
    }
  }
}

// CLI — injetar:
const ref = refValue ?? 'HEAD~1'
const result = auditRouteCoverage(target, { changedFiles: diff.files, readAtBase: readAtBaseFromGit(target, ref) })
```

### Passo 5: Agente — secao 11 (ADITIVO, G9) — DP-12 refinada

Acrescentar ao final da secao 11 de `agents/security-auditor.md`:

```markdown
- `indeterminada` chega como issue `medium` (PRD Decisao 8 / CA-10): e incapacidade do adaptador de
  DEMONSTRAR cobertura — nao e aprovacao, nao e "provavelmente coberta". Copie como esta: nunca
  rebaixe para `low`, nunca omita, nunca reescreva como coberta. Cite `summary.indeterminada`.
- Se `summary.allowlist.changed` for `true`, `reasoning` DEVE COMECAR com este bloco, antes de
  qualquer outra frase:

  ### ALLOWLIST DE ROTAS PUBLICAS ALTERADA NESTE DIFF
  - added: `<path>` (anti-vibe.public-routes.json:<line>) — <reason>
  - removed: `<path>` (linha <line> na base) — <reason>
  - base: resolved | unavailable — <reason>

  e `verdict` e NO MINIMO `request_changes`: mudanca na allowlist exige diff apresentado ao humano
  (PRD "Gatilhos de aprovacao humana"). `status` continua `"complete"` — `needs_human` faria o
  consolidador do `verify-work` descartar TODAS as suas issues (regra G-P04-03), e o PR que mexe na
  allowlist e justamente o que nao pode perder findings.
- `delta.before: "unavailable"` NAO e "sem mudanca": a lib nao conseguiu ler a base e listou TODAS
  as entradas atuais como `added`. Diga isso literalmente no bloco.
- Entrada em `delta.removed` e rota que PERDEU a declaracao de publica. Se o arquivo dela nao esta no
  diff, a lib nao a reavaliou nesta versao (escopo G1) — aponte isso no bloco; o G2 (Plano 03) fecha.
- Issues `ALLOW-*` e `ROUTE-*` continuam em `payload.issues` como estao; o bloco NAO as substitui.
- Cite `summary.publicaDeclarada` e `summary.allowlist.accepted` / `rejected` / `wide` em `reasoning`.
```

### Passo 6: `verify-work/SKILL.md` — Step 3 (ADITIVO, G9)

Tres insercoes, nenhuma remocao:

(a) No bloco numerado de "## Step 3 — Compilar Relatorio", apos o item `2b.`:

```
2c. Se o reasoning do security-auditor COMECA com `### ALLOWLIST DE ROTAS PUBLICAS ALTERADA NESTE DIFF`,
    o relatorio ganha a secao `### Allowlist de rotas publicas — ALTERADA` ANTES de `### Issues Found`,
    reproduzindo o bloco sem resumir, e a linha `Public routes allowlist` do Summary vira
    `⚠️ ALTERADA — requer aprovacao humana`. As issues `ALLOW-*` ficam na tabela de Issues Found como
    qualquer finding (nao re-ranquear — 2b). A mudanca fica SEPARADA dos demais findings de proposito
    (PRD route-auth-matrix-audit, AB-4/CA-07).
```

(b) No "### Template do Relatorio", apos a linha `- Dynamic (dev server): ...` do Summary:

```markdown
- Public routes allowlist: {se security-auditor reportou allowlist.changed} ⚠️ ALTERADA ({N} added / {M} removed) — requer aprovacao humana | {se present} ✅ {accepted} declaradas ({rejected} recusadas, {wide} amplas) | {se ausente} — ausente (fail-closed) | {se security-auditor nao rodou} ⏸ n/a
```

(c) No template, imediatamente ANTES de `### Issues Found`:

```markdown
### Allowlist de rotas publicas — ALTERADA
{Secao existe SO quando o bloco existe no reasoning do security-auditor. Reproduzir o bloco
`### ALLOWLIST DE ROTAS PUBLICAS ALTERADA NESTE DIFF` inteiro — added/removed com path, linha e reason,
e a linha `base:`. Nunca fundir com Issues Found.}
```

### Passo 7: Manifest

`bun run generate:manifest` — lib, types, agente E `skills/verify-work/SKILL.md` sao rastreados (G2).

---

## Gotchas

- **G19 do plano (o motivo do refinamento da DP-12):** `audit-consolidator.ts:91-95` — `blocked` e
  `needs_human` vao para `incomplete[]` e as `issues` do agente sao descartadas. O `reasoning` ainda
  aparece na secao "Reasoning dos auditores" (preservado por agente), mas a tabela perde tudo. O sinal
  de aprovacao humana viaja em `verdict: request_changes` + bloco + secao do relatorio.
- **G6 do plano:** tres comandos `git`, tres jeitos de falhar. `merge-base` falha com ref invalida ou
  shallow clone; `cat-file -e` devolve 1 (ausente) ou 128 (sha invalido); `show` pode falhar por
  permissao. Cada um vira `unavailable` com o stderr como `reason` — o teste
  `returns unavailable with a reason when the ref cannot be resolved` cobre o primeiro; os outros dois
  ficam no `catch`/exit-code, sem teste dedicado (nao ha como provocar sem mexer no repo).
- **G3 do plano:** `delta` e `reason` sao opcionais. `{ before: 'resolved', added, removed }` sem
  `reason` (nao `reason: undefined`); `...(delta !== undefined ? { delta } : {})` no summary.
- **G15 do plano:** `changed.has('anti-vibe.public-routes.json')` e igualdade exata. O git sempre
  lista o arquivo da raiz assim. Nao normalizar `./` — a CLI e a unica fonte real de `changedFiles`.
- **G17 do plano:** `summary.allowlist.changed` e `delta` nao existem ate o Passo 4 — `tsc` vermelho na
  janela RED, `bun test` com `Received: undefined`. Esperado.
- **G18 do plano:** `delta.removed` e um estreitamento de cobertura (G2) que o G1 nao reavalia. Nesta
  versao, o humano ve (bloco + `request_changes`). O Plano 03 deve incluir rotas que casam
  `delta.removed` no conjunto avaliado — escrever isso em "Notas para Planos Seguintes" ao fechar.
- **Local — CA-10 reescreve, nao acrescenta:** o teste antigo afirmava `findings.length === 0` para
  `indeterminada`. Mante-lo ao lado do novo seria dois testes contraditorios; um deles sempre mentiria.
  Apagar o antigo e parte do RED honesto (DP-10).
- **Local — edicao so de `reason` nao aparece em `added`/`removed`:** a chave do delta e o path.
  `changed: true` continua sinalizando, e o bloco no `reasoning` diz "base: resolved" com listas
  vazias — o humano ve que algo mudou e le o diff do arquivo. Nao inventar um terceiro campo (`edited`)
  sem pedido.
- **Local — teste de integracao com git real:** o `describe('readAtBaseFromGit')` roda `git` no repo do
  plugin. Funciona local e no CI (checkout e repo). Se algum dia o CI usar shallow clone, `merge-base
  HEAD HEAD` ainda resolve (e o proprio HEAD). Nao mockar `Bun.spawnSync`.
- **Local — `parsePublicRoutes(read.source, 'anti-vibe.public-routes.json@base')`:** o `file` das
  entradas removidas leva o sufixo `@base` de proposito — no relatorio fica claro que a linha e da versao
  antiga, nao da atual.

---

## Verificacao

### TDD

- [ ] **RED 1 (CA-10):** teste reescrito e FALHA por assertion
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-10'`
  - Resultado esperado: `Expected length: 2, Received length: 0` (a fase-05 do Plano 01 so emite
    DESCOBERTA)

- [ ] **RED 2 (CA-07):** teste de abuso escrito e FALHA por assertion
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-07'`
  - Resultado esperado: `Expected: true, Received: undefined` em `summary.allowlist.changed`
  - E `-t 'never stays silent'` → `Expected: "unavailable", Received: undefined`

- [ ] **GREEN:** Codigo minimo implementado, testes PASSAM
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `33 pass, 0 fail` (23 da fase-02 + CA-10 reescrito + 1 ordenacao + 6 CA-07 + 3 git)
  - Comando: `bun test skills/security/lib/public-routes-allowlist.test.ts`
  - Resultado esperado: `20 pass, 0 fail` (18 + 2)

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `CA-07: flags the allowlist as changed and lists the delta when the
      file is in the diff` FALHOU antes da defesa existir — AB-4 (rota nova + entrada na allowlist
      escondidas num PR grande) foi escrito ANTES do destaque, como o PRD exige
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-07'`
  - Resultado esperado no RED: `Expected: true, Received: undefined`
- [ ] **Segundo abuso no RED:** `never stays silent when the base is unavailable` FALHOU antes —
      base ilegivel virando "sem mudanca" e o modo de falha silencioso que a DP-11 proibe
- [ ] **CA-07 (AB-4):** Dado um diff que altera a allowlist, quando o auditor roda, entao as mudancas
      da allowlist aparecem em secao destacada do relatorio — a parte mecanica (`changed`, `delta`)
      por `-t 'CA-07|removed entries|absent at the base|never stays silent|no base reader|changed=false'`;
      a parte de prosa (bloco no agente, secao no `verify-work`) por revisao do diff dos dois `.md`
- [ ] **CA-10 (RF-04):** Dado uma rota que o adaptador nao consegue resolver, quando o auditor roda,
      entao emite finding MEDIO com veredito `indeterminada` — nao a omite e nao a conta como `coberta`
      — verificado por `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-10'`
- [ ] **`medium` nunca vira `coberta` nem some da contagem:** `summary.indeterminada` continua 2 no
      CA-10 e `findings` tem os 2 — os dois sinais coexistem
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** Ao contrario: a fase FORCA o gatilho
      (`request_changes` + bloco) quando a allowlist muda. Nenhuma edicao na allowlist de projeto
      algum foi feita por esta fase
- [ ] Nenhum secret literal entrou no codigo; `readAtBaseFromGit` nao loga conteudo de arquivo

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) tirar `indeterminada` do `for`
      de emissao (voltar a `continue` em tudo que nao e DESCOBERTA) → `-t 'CA-10'` FALHA com `Received
      length: 0`; restaurar. (2) Forcar `changed: false` no summary → `-t 'CA-07'` FALHA com `Received:
      false`; restaurar. (3) Em `computeAllowlistDelta`, devolver `before: 'resolved'` no ramo
      `unavailable` → `-t 'never stays silent'` FALHA; restaurar. (4) Trocar `SEVERITY_BY_VERDICT.indeterminada`
      para `'low'` → `-t 'CA-10'` FALHA em `toEqual(['medium', 'medium'])`; restaurar.
- [ ] Gate do inicio da fase cumprido: dev confirmou DEV-plan-2 (seam `BaseRead`) e DEV-plan-3
      (`request_changes`, nao `needs_human`) — registrar a confirmacao como DI no MEMORY
- [ ] `grep -n "switch" skills/security/lib/route-auth-matrix.ts` → vazio (hash maps por veredito)
- [ ] `grep -n "needs_human" agents/security-auditor.md` → aparece SO no bloco de contrato existente e na
      frase da secao 11 que explica por que NAO usa-lo
- [ ] CLI contra o repo do plugin: `bun skills/security/lib/route-auth-matrix.ts . --ref main` devolve
      `summary.allowlist.changed: false` sem `blocked`. Depois, num branch de teste local que crie
      `anti-vibe.public-routes.json` na raiz do plugin (NAO commitar): o mesmo comando devolve `changed: true`,
      `delta.before: 'resolved'` e tudo em `added`; apagar o arquivo ao final
- [ ] `git diff agents/security-auditor.md skills/verify-work/SKILL.md` e so adicao (G9); o template do
      relatorio mantem todas as linhas anteriores na mesma ordem
- [ ] `grep -n "Allowlist de rotas publicas" skills/verify-work/SKILL.md` → 2 ocorrencias (item 2c e
      secao do template); `grep -n "Public routes allowlist" skills/verify-work/SKILL.md` → 1
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G2) — 4 arquivos rastreados
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G17)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G11)
- [ ] MEMORY.md: "Notas para Planos Seguintes" preenchida (assinatura final de `readAtBase`/`BaseRead`
      e `readAtBaseFromGit`, shape de `summary.allowlist`, `delta.removed` como input do G2,
      `buildContractIssues`, G13 para o Plano 04, dividas G1/G12); Metricas atualizadas; Status: concluido

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'CA-07|CA-10'` retorna `2 pass`
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'allowlist|readAtBaseFromGit'` retorna `0 fail`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest` sem erro/warning
- `git diff --stat agents/security-auditor.md skills/verify-work/SKILL.md` mostra so insercoes

**Por humano:**
- Num projeto Next.js real, num branch que adiciona `app/api/export/route.ts` E a entrada
  `/api/export` na allowlist no mesmo PR, `/anti-vibe-coding:verify-work` mostra a secao
  `### Allowlist de rotas publicas — ALTERADA` ANTES de Issues Found com `added: /api/export (linha N) —
  <reason>`, o Summary diz `⚠️ ALTERADA — requer aprovacao humana`, e nenhum `ROUTE-*`/`ALLOW-*` sumiu
  da tabela — **pendente de sync do cache do plugin (G12)**; registrar como divida
- Num projeto com `config.matcher` computado, o relatorio lista `indeterminada ... medium` na tabela em
  vez de silenciar — mesma pendencia G12

---

<!-- Gerado por /plan-feature em 2026-09-05 -->

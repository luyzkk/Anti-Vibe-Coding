<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Ponta "Antes" Irreconstruivel

**Plano:** 03 — G2: cobertura perdida
**Sizing:** 1.5h
**Depende de:** fase-02
**Visual:** false

---

## O que esta fase entrega

PRD: "Onde a ponta 'antes' nao for reconstruivel, o veredito e `indeterminada` — nunca silencio." Quando o
G2 disparou e a base nao pode ser lida (`readCoverageAtBase` devolveu `{ unavailable }`, `readAtBase`
lancou ou esta ausente, ou a base da allowlist e `unavailable`), toda rota NAO-G1 que esta `DESCOBERTA` ou
`indeterminada` HOJE vira `indeterminada` com `trigger: 'G2'`, evidence
`ponta 'antes' irreconstruivel (<reason>) — nao da para saber se <path> perdeu cobertura neste diff`, emitida
`medium` (D8); rotas `coberta`/`publica-declarada` hoje nao sao tocadas; `summary.g2.indeterminate` conta.
Adaptador SEM `isCoverageFile`/`readCoverageAtBase` (`before: 'not-applicable'`) com `triggered: true`
recebe a MESMA consequencia — a ponta antes e irreconstruivel por definicao (DP-5, aplicacao de
planejamento). Para tornar esse ramo testavel antes do Plano 04, `AuditOptions` ganha o seam
`adapter?: RouteAdapter` (default `nextjsAdapter`, G14 / MEMORY DEV-plan-1). `absent` na base continua
sendo "nada a perder" — a fase trava isso no motor com teste. O agente ganha os bullets (c) e (d) da DP-8 e a
fase fecha o plano: "Notas para Planos Seguintes" do MEMORY preenchidas para o Plano 04.

**DP aplicadas:** DP-5 (consequencia por rota, inclusive `not-applicable` + `triggered`), DP-2 (ramo
`not-applicable` exercitado via seam), DP-6 (trava de regressao no motor para `absent`), DP-7 (fecha:
`indeterminate` real), DP-8 (bullets c/d — so `+`, nenhuma correcao). DEV-plan-1 do MEMORY (seam
`adapter?`) e a unica coisa fora do PLAN.md original.

**O que a fase-01 JA fez e esta fase NAO refaz:** `reconstructBefore` ja decide `unavailable` (cobertura ou
allowlist) e `not-applicable` (metodos ausentes), ja expoe `summary.g2.before`/`reason` e ja empurra a nota
`G2: <reason>` para `summary.notes`. `readNextjsCoverageAtBase` ja trata `absent` como `rules: []` + nota.
Esta fase acrescenta SO a consequencia por rota e o seam.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-matrix.test.ts` | Modify (PRIMEIRO) | Adaptador fake inline `NO_G2_ADAPTER`; 6 testes em 2 `describe`s (irreconstruivel x3; absent + adaptador sem suporte x3). `RouteAdapter` entra como `import type` — nenhum import de VALOR novo (G5): RED por assertion |
| `skills/security/lib/route-auth-nextjs.test.ts` | Modify | +1 caso que faltava no `describe` da fase-01: matcher COMPUTADO na base vira `opaque` com `@base`, nunca cobertura inventada (RF-04 na ponta antes). Nasce verde — trava |
| `skills/security/lib/route-auth-matrix.ts` | Modify | `AuditOptions.adapter?`; `const adapter = opts.adapter ?? nextjsAdapter`; `unreconstructableBefore`; `g2Verdicts` ganha o ramo `before.kind !== 'resolved'`. Nada mais |
| `agents/security-auditor.md` | Modify (ADITIVO — G13, so `+`) | Secao 11: bullets (c) `before: "unavailable"` e (d) `before: "not-applicable"` |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G2) — matrix, agente |
| `docs/exec-plans/active/.../plano03/MEMORY.md` | Modify (fechamento) | "Notas para Planos Seguintes" preenchidas; Metricas; Status: concluido |

4 arquivos de codigo/teste/agente + manifest gerado + MEMORY (docs). `route-auth-nextjs.ts` e
`route-auth-matrix.types.ts` NAO mudam.

---

## Implementacao

### Passo 1: Testes PRIMEIRO no motor — irreconstruivel, absent, adaptador sem suporte (SEM import de valor novo)

`RouteAdapter` entra no `import type` existente (o Bun apaga; nao ha RED de compilacao). O adaptador fake
e inline — rotas e cobertura vem dos helpers `route()`/`coverage()`, NAO de `nextjsAdapter` (importar
`nextjsAdapter` no teste seria import de valor de um export ja existente — compila, mas e acoplamento
desnecessario).

```ts
// route-auth-matrix.test.ts
import type { BaseRead, CoverageMap, Route, RouteAdapter } from './route-auth-matrix.types'

// 2026-09-05 (Luiz/dev): G14 / MEMORY DEV-plan-1 — adaptador SEM isCoverageFile/readCoverageAtBase, como o Plano 04
// pode registrar de cara. Rotas e cobertura inline (nao dependem de fixture); o que falta e SO o suporte a G2.
// `stack: 'rails'` e um StackId valido e deixa a nota `adaptador rails sem suporte a G2` legivel.
const NO_G2_ADAPTER: RouteAdapter = {
  stack: 'rails',
  enumerate: () => [
    route({ path: '/api/admin', file: 'app/api/admin/route.ts', line: 2 }),
    route({ path: '/api/health', file: 'app/api/health/route.ts', line: 2 }),
  ],
  readCoverage: () => coverage([]),
}

describe('auditRouteCoverage — G2 com ponta antes irreconstruivel (Plano 03 fase-03, DP-5)', () => {
  // A ponta DEPOIS cobre so /api/preferences: 5 rotas abertas hoje, 1 coberta. Nao ha como saber se as 5 perderam
  // algo — entao nenhuma pode sair em silencio; a que esta coberta HOJE nao precisa da base.
  const UNREADABLE = {
    changedFiles: ['middleware.ts'],
    readAtBase: (): BaseRead => ({ status: 'unavailable', reason: 'shallow clone sem merge-base' }),
    coverageOverride: coverage(['/api/preferences']),
  }

  // 2026-09-05 (Luiz/dev): PRD "onde a ponta antes nao for reconstruivel, o veredito e indeterminada — nunca
  // silencio" (RF-04/CA-10 estendidos ao G2). Escrito ANTES do ramo existir: o RED e o silencio. Ruidoso por
  // desenho (G18): 5 issues medium de 6 rotas; nao filtrar, nao agrupar, nao rebaixar.
  it('never stays silent when the base coverage cannot be reconstructed', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, UNREADABLE)
    expect(findings).toHaveLength(5)
    expect(findings.every((f) => f.verdict === 'indeterminada' && f.severity === 'medium' && f.trigger === 'G2')).toBe(true)
    expect(findings.map((f) => f.route.path)).toEqual(['/api/admin', '/api/users/[id]', '/api/users/[id]', '/docs/[...slug]', '/pricing'])
    expect(findings.some((f) => f.route.path === '/api/preferences')).toBe(false)   // coberta HOJE: nao e tocada
    expect(findings[0]?.missing).toBe(
      "ponta 'antes' irreconstruivel (shallow clone sem merge-base) — nao da para saber se /api/admin perdeu cobertura neste diff",
    )
    const description = findings.map(toContractIssue)[0]?.description ?? ''
    expect(description.startsWith('[cobertura perdida] indeterminada: GET /api/admin (app/api/admin/route.ts:2)')).toBe(true)
    expect(description).toContain('cobertura nao demonstravel')
    expect(summary.g2).toEqual({ triggered: true, sources: ['middleware.ts'], before: 'unavailable', lost: 0, indeterminate: 5, reason: 'shallow clone sem merge-base' })
    expect(summary.evaluated).toBe(5)
    expect(summary.indeterminada).toBe(5)
  })

  // `safeBaseReader` (fase-01) ja converte lancamento e ausencia em `unavailable`; aqui se prova que a razao chega
  // ate a evidence de CADA rota — o revisor nao precisa abrir o summary para saber por que.
  it('treats a missing or throwing readAtBase as unreconstructable, carrying the reason into every finding', () => {
    const thrown = auditRouteCoverage(MINIMAL, { ...UNREADABLE, readAtBase: () => { throw new Error('git explodiu') } })
    expect(thrown.findings).toHaveLength(5)
    expect(thrown.findings.every((f) => f.missing.includes('git explodiu'))).toBe(true)
    expect(thrown.summary.g2.before).toBe('unavailable')

    const { changedFiles, coverageOverride } = UNREADABLE
    const noReader = auditRouteCoverage(MINIMAL, { changedFiles, coverageOverride })
    expect(noReader.findings).toHaveLength(5)
    expect(noReader.summary.g2.reason).toContain('readAtBase ausente')
    expect(noReader.findings[0]?.missing).toContain('readAtBase ausente')
  })

  // So a allowlist disparou o G2 e a base DELA e ilegivel: mesma regra, com o reason que o delta ja carrega (G16:
  // uma leitura serve os dois). health/stripe estao publica-declarada HOJE e nao sao tocadas; admin (recusada) esta aberta.
  it('applies the same rule when only the allowlist triggered G2 and its base is unavailable', () => {
    const { findings, summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ['anti-vibe.public-routes.json'],
      readAtBase: () => ({ status: 'unavailable', reason: 'ref nao resolvivel' }),
    })
    expect(findings.map((f) => [f.route.path, f.verdict, f.severity, f.trigger])).toEqual([['/api/admin', 'indeterminada', 'medium', 'G2']])
    expect(findings[0]?.missing).toContain("ponta 'antes' irreconstruivel (ref nao resolvivel)")
    expect(summary.g2.before).toBe('unavailable')
    expect(summary.g2.indeterminate).toBe(1)
    expect(summary.allowlist.delta?.before).toBe('unavailable')   // delta (Plano 02) e G2 viram a MESMA leitura
  })
})

describe('auditRouteCoverage — G2 com base ausente e adaptador sem suporte (Plano 03 fase-03, DP-6/DP-2)', () => {
  // 2026-09-05 (Luiz/dev): DP-6 / G7 — `absent` NAO e irreconstruivel: nao havia middleware, logo zero cobertura
  // antes, logo nada a perder. Este teste NASCE VERDE (fase-01 no adaptador + fase-02 no loop ja produzem isso) —
  // e trava contra a "otimizacao" que trataria ausente como unavailable; a defesa e provada no RED-check (4).
  it('treats middleware.ts absent at the base as nothing to lose, not as unreconstructable', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['middleware.ts'], readAtBase: () => ({ status: 'absent' }) })
    expect(findings).toHaveLength(0)
    expect(summary.g2).toEqual({ triggered: true, sources: ['middleware.ts'], before: 'resolved', lost: 0, indeterminate: 0 })
    expect(summary.notes.join(' ')).toContain('middleware.ts ausente na base — nenhuma cobertura a perder')
  })

  // DP-2: sem os dois metodos, `middleware.ts` no diff NAO e reconhecido como cobertura — G2 nao dispara, `before` e
  // `not-applicable` e a nota fica em summary.notes. Nao ha rota a reportar; o sinal e a nota (nunca silencio total).
  it('reports not-applicable with a visible note when the adapter has no G2 support and nothing triggered', () => {
    const { findings, summary } = auditRouteCoverage(MINIMAL, { changedFiles: ['middleware.ts'], adapter: NO_G2_ADAPTER })
    expect(summary.g2.triggered).toBe(false)
    expect(summary.g2.before).toBe('not-applicable')
    expect(summary.g2.reason).toContain('adaptador rails sem suporte a G2')
    expect(summary.notes.join(' ')).toContain('adaptador rails sem suporte a G2')
    expect(findings).toHaveLength(0)
  })

  // DP-5 (aplicacao de planejamento): not-applicable + triggered (allowlist no diff) = ponta antes irreconstruivel
  // por definicao. A base da ALLOWLIST ate resolveu — o que falta e o adaptador saber comparar COBERTURA.
  it('turns every open route into indeterminada G2 when the allowlist triggered G2 on an adapter without support', () => {
    const { findings, summary } = auditRouteCoverage(ALLOWLIST, {
      changedFiles: ['anti-vibe.public-routes.json'],
      readAtBase: () => ({ status: 'found', source: '{"routes":[]}' }),
      adapter: NO_G2_ADAPTER,
    })
    expect(findings.map((f) => [f.route.path, f.verdict, f.severity, f.trigger])).toEqual([['/api/admin', 'indeterminada', 'medium', 'G2']])
    expect(findings[0]?.missing).toContain('adaptador rails sem suporte a G2')
    expect(summary.g2.before).toBe('not-applicable')
    expect(summary.g2.triggered).toBe(true)
    expect(summary.g2.indeterminate).toBe(1)
    expect(summary.allowlist.delta?.before).toBe('resolved')   // a allowlist resolveu; o que e not-applicable e a COBERTURA
  })
})
```

Rodar `bun test skills/security/lib/route-auth-matrix.test.ts -t 'irreconstruivel|sem suporte'` e VER 5
falharem (1 nasce verde — ver "Verificacao"). Os 46 preexistentes continuam verdes.

### Passo 2: Teste do adaptador — o caso que faltava (nasce verde; trava RF-04 na ponta antes)

No `describe('G2 — cobertura na ponta antes (Plano 03 DP-2)')` de `route-auth-nextjs.test.ts`. Nenhum import
novo (`readNextjsCoverageAtBase` e `isCoverageUnavailable` ja entraram na fase-01).

```ts
  // RF-04 na ponta antes: matcher COMPUTADO na base nao vira cobertura inventada — vira `opaque` com `@base`. No motor,
  // verdictBefore = indeterminada ENTRA no G2 como `indeterminada` quando a rota esta DESCOBERTA agora (DP-4 emendada;
  // teste `indeterminada at the base` na fase-02). Nasce verde (parseMatcherConfig ja faz isso); defesa no RED-check (6).
  it('keeps a computed base matcher opaque instead of guessing what it covered', () => {
    const result = readNextjsCoverageAtBase(() => ({ status: 'found', source: 'export function middleware() {}\nexport const config = { matcher: PROTECTED }\n' }))
    if (isCoverageUnavailable(result)) throw new Error('esperava CoverageMap')
    expect(result.rules).toEqual([{ kind: 'opaque', reason: 'matcher computado — nao e literal', file: 'middleware.ts@base', line: 2 }])
    expect(result.notes).toEqual([])   // ha `matcher:` no texto — a nota de proxy (G9) nao se aplica
  })
```

### Passo 3: Motor — seam `adapter?` e a consequencia por rota

```ts
// route-auth-matrix.ts
export type AuditOptions = {
  changedFiles?: string[]
  coverageOverride?: CoverageMap
  readAtBase?: (file: string) => BaseRead
  /**
   * 2026-09-05 (Luiz/dev): G14 / MEMORY DEV-plan-1 — seam de teste para exercitar `not-applicable` (adaptador sem
   * suporte a G2) antes do Plano 04. Default `nextjsAdapter`; a CLI nao o passa. NAO e a selecao multi-stack (RF-06):
   * a fase-04 do Plano 04 decide se isto vira `detectStack()` ou continua opcional.
   */
  adapter?: RouteAdapter
}

// 2026-09-05 (Luiz/dev): DP-5 — ponta antes irreconstruivel. Nao da para dizer "perdeu" nem "nao perdeu", entao e
// `indeterminada` e e emitida (D8). So rota ABERTA hoje (OPEN_NOW): o que esta coberto/declarado agora nao precisa
// da base. G8 vale igual: rota do G1 conta la. Ruidoso por desenho (G18) — a defesa e o `reason` visivel.
function unreconstructableBefore(routes: Route[], changed: Set<string>, reason: string, after: Ends): RouteVerdict[] {
  const open: RouteVerdict[] = []
  for (const route of routes) {
    if (changed.has(route.file)) continue
    const now = verdictFor(route, after.coverage, after.allowlist)
    if (!OPEN_NOW.has(now.verdict)) continue
    open.push({
      route,
      verdict: 'indeterminada',
      evidence: `ponta 'antes' irreconstruivel (${reason}) — nao da para saber se ${route.path} perdeu cobertura neste diff`,
      trigger: 'G2',
    })
  }
  return open
}

// Tres estados da base, tres saidas. `unavailable` e `not-applicable` (com gatilho) tem a MESMA consequencia (DP-5):
// nos dois a lib nao consegue comparar. Dois `if`, nao switch.
function g2Verdicts(routes: Route[], changed: Set<string>, sources: string[], before: BeforeState, after: Ends): RouteVerdict[] {
  if (sources.length === 0) return []
  if (before.kind === 'resolved') return lostCoverage(routes, changed, before, after)
  return unreconstructableBefore(routes, changed, before.reason, after)
}

export function auditRouteCoverage(targetDir: string, opts: AuditOptions): AuditResult {
  const adapter = opts.adapter ?? nextjsAdapter   // G14 — substitui o `const adapter: RouteAdapter = nextjsAdapter` da fase-01
  // ...resto inalterado: routes/coverage/changed/g1/allowlist/read/allowlistBase/delta/g2Sources/before/notes/
  // g1Verdicts/g2/findings/summary vem da fase-01 e da fase-02 como estao.
}
```

`toG2Summary` (fase-02) ja conta `indeterminate` a partir de `g2` — nada a mudar. `summary.notes` ja recebe
`G2: <reason>` quando `before.kind !== 'resolved'` (fase-01) — nada a mudar.

### Passo 4: Agente — secao 11 (DP-8 c/d; so `+`)

Ao final da secao 11 de `agents/security-auditor.md`, depois dos bullets (a)/(b) da fase-02:

```markdown
- `summary.g2.before: "unavailable"` = a lib NAO conseguiu ler a base do diff (git falhou, ref nao
  resolvivel, `readAtBase` ausente) e por isso NAO sabe se alguma rota perdeu cobertura. Toda rota
  existente aberta hoje chega como `[cobertura perdida] indeterminada` medium — isso NAO e aprovacao e NAO
  e "provavelmente coberta": e a lib dizendo que nao pode comparar. Cite `summary.g2.reason` e
  `summary.g2.indeterminate` literalmente em `reasoning`; nunca rebaixe, nunca agrupe, nunca omita (PRD
  Decisao 8 aplicada ao G2). Se forem muitas, o problema e a base ilegivel, nao o volume.
- `summary.g2.before: "not-applicable"` = o adaptador desta stack NAO implementa a comparacao antes/depois
  (sem suporte a G2). Diga isso literalmente em `reasoning` — "adaptador <stack> sem suporte a G2;
  cobertura perdida nao foi verificada neste diff". Com `triggered: true` (allowlist no diff), os
  `indeterminada` medium resultantes seguem a regra do item anterior. Com `triggered: false`, registre a
  nota `G2: adaptador ... sem suporte` de `summary.notes`: nao ha rota a reportar, mas o leitor precisa
  saber que o G2 nao roda nesta stack.
```

### Passo 5: Manifest

`bun run generate:manifest` — `route-auth-matrix.ts` e `agents/security-auditor.md` sao rastreados (G2).
`route-auth-nextjs.ts` e `route-auth-matrix.types.ts` nao mudam nesta fase.

### Passo 6: Fechar o plano no MEMORY

Preencher "Notas para Planos Seguintes" de `plano03/MEMORY.md` a partir do esqueleto comentado que ja esta
la (linhas `<!-- Preencher ao fechar a fase-03 ... -->`), COPIANDO as assinaturas do codigo final — nao
redescobrir. Minimo que o Plano 04 precisa:

- **Estado final** (data, commits): contagens reais de `route-auth-matrix.test.ts`, `route-auth-nextjs.test.ts`,
  `skills/security/lib/`, suite completa.
- **Assinaturas publicas**: `RouteAdapter` com `isCoverageFile?`/`readCoverageAtBase?`; `CoverageAtBase` +
  `isCoverageUnavailable`; `AuditTrigger` e `trigger?` em `RouteVerdict`/`RouteFinding`; `G2Summary`;
  `AuditOptions` com `adapter?`; `verdictFor`; `isNextjsCoverageFile`/`readNextjsCoverageAtBase`.
- **Onde o Plano 04 encaixa (G2)**: cada adaptador DECIDE se implementa os dois metodos; sem eles sai
  `not-applicable` com nota (e `indeterminada` medium por rota aberta se a allowlist estiver no diff);
  `trigger` e do motor, nunca do adaptador; `verdictFor` e a unica funcao de veredito para o loop multi-stack;
  `indeterminada` AGORA E FINDING (D8) — fixtures do Plano 04 com regra `opaque` geram issues; sufixo `@base`;
  Rails le VARIOS arquivos pelo mesmo `read`.
- **Pontos para o dev** (registrados aqui, decididos por ele no PR): (1) DP-4 foi EMENDADA na revisao do plano
  (MEMORY DEV-plan-3): rota que estava `indeterminada` na base (matcher opaco) e esta DESCOBERTA hoje entra no
  G2 como `indeterminada` medium; se o dev vetar, tirar `indeterminada` de `LOST_FROM` e o teste
  correspondente da fase-02. (2) A description do caso
  irreconstruivel le `[cobertura perdida] indeterminada: ...` (DP-4 literal) — aceitar ou trocar o prefixo
  para esse caso. (3) Com a CLI atual, ref invalida/shallow clone bloqueia em `git diff` ANTES do G2
  (`blocked: true`); o ramo `unavailable` do G2 e alcancado por falha de `ls-tree`/`show` ou por chamador
  programatico sem `readAtBase` — coberto so por seam. G10 do README descreve o cenario de forma mais ampla.
- **Dividas herdadas / abertas** e **Compound candidates** (o esqueleto ja os lista).
- Metricas: fases concluidas 3/3; Status: **concluido**.

---

## Gotchas

- **G14 do plano (DEV-plan-1):** `adapter?` e seam de TESTE, mesma natureza de `coverageOverride`. A CLI nao o
  passa; `bun skills/security/lib/route-auth-matrix.ts .` continua identico. Nao "aproveitar" para ligar
  `detectStack()` aqui — e RF-06, Plano 04.
- **G5 do plano (GT-fase02-1):** `RouteAdapter` e `import type` (apagado em runtime). `NO_G2_ADAPTER` usa so
  `route()`/`coverage()` — NAO importar `nextjsAdapter` no teste. Sem import de valor novo, o RED e por
  assertion em todos os 6 testes do motor.
- **G16 do plano:** no caso "so a allowlist disparou e a base dela e unavailable", `reconstructBefore` usa o
  `reason` de `allowlistBase` — a MESMA leitura que gerou `delta.reason`. O teste afirma os dois campos
  (`g2.before` e `delta.before`) `unavailable` para provar que nao houve segunda leitura.
- **G18 do plano:** 5 issues `medium` de 6 rotas no teste; 40 num projeto com 40 rotas abertas. E a Decisao
  8 do PRD aplicada ao G2. Nao filtrar, nao agrupar, nao rebaixar, nao "limitar a N". O bullet (c) do agente
  explica ao leitor.
- **G19 do plano:** `bun run typecheck` fica vermelho entre o Passo 1 e o Passo 3 (`adapter` nao e propriedade
  de `AuditOptions` — "Object literal may only specify known properties"). Esperado.
- **G21 do plano:** `never stays silent when the base is unavailable` (Plano 02, CA-07) passa a emitir 1
  `indeterminada` G2 para `/api/admin` — o teste so le `summary.allowlist` e continua verde. Rodar o arquivo
  inteiro.
- **Local — dois testes nascem verdes, declarados:** `treats middleware.ts absent at the base as nothing to
  lose` (motor) e `keeps a computed base matcher opaque` (adaptador). Nenhum codigo desta fase os faz passar —
  fase-01 e fase-02 ja produzem o comportamento. Eles existem porque o README (G7) manda travar o caso para
  ninguem "otimizar" depois. A defesa de cada um e provada no RED-check (4) e (6). Se o executor preferir,
  escreve-los DEPOIS do GREEN dos outros; registrar a ordem real no MEMORY.
- **Local — `not-applicable` e decidido ANTES da allowlist em `reconstructBefore`:** por isso o teste do
  adaptador sem suporte + allowlist no diff tem `delta.before: 'resolved'` e `g2.before: 'not-applicable'` ao
  mesmo tempo. Sao duas perguntas diferentes ("a allowlist da base foi lida?" / "o adaptador sabe comparar
  cobertura?"). Nao "unificar".
- **Local — `[cobertura perdida] indeterminada:`:** e o que a DP-4 literal produz (prefixo quando
  `trigger === 'G2'`, qualquer veredito). Le-se "pode ter perdido cobertura; nao da para saber". Registrar
  como ponto para o dev, nao mudar aqui.
- **Local — parenteses aninhados na evidence:** `reason` do `not-applicable` ja tem parenteses
  (`adaptador rails sem suporte a G2 (isCoverageFile/readCoverageAtBase ausentes)`), e a evidence os embrulha
  de novo. Feio, honesto, greppavel. Nao "limpar" — o `reason` e copiado literalmente de proposito.
- **Local — `reason` pode conter caminho local:** vem do stderr do `git` (`readAtBaseFromGit`). Nao e secret;
  e a mesma exposicao que `delta.reason` do Plano 02 ja faz. Nao truncar.
- **Local — quando `unavailable` acontece de verdade na CLI:** `changedFilesFromGit` usa `git diff <ref>...HEAD`,
  que TAMBEM exige merge-base — ref invalida e shallow clone bloqueiam ANTES do G2 (`blocked: true`, exit 2).
  O ramo `unavailable` da lib e alcancado por falha de `ls-tree`/`show` no meio do caminho ou por chamador
  programatico sem `readAtBase`. O criterio "por humano" desta fase e, portanto, limitado; os testes de seam
  sao a prova. Registrar como observacao (candidato a GT) no MEMORY e ponto para o dev.
- **Local — `summary.evaluated` e `summary.indeterminada` sobem juntos:** ambos vem de `verdicts`; no teste
  principal os dois sao `5`. `summary.g2.indeterminate` tambem e `5` — tres numeros, uma fonte
  (`g2Verdicts`). Nao criar contador separado.
- **Local — o adaptador fake tem `stack: 'rails'` mas rotas com `stack: 'nextjs'` (do helper `route()`):** irrelevante
  para o motor, que nao le `route.stack`. Nao ajustar o helper por isso.

---

## Verificacao

### TDD

- [ ] **RED (Passo 1):** 6 testes escritos no motor; FALHAM sem tocar producao
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'irreconstruivel|sem suporte'`
  - Resultado esperado: `5 fail, 1 pass` — `never stays silent when the base coverage` com
    `Expected length: 5, Received length: 0`; `missing or throwing readAtBase` idem; `only the allowlist
    triggered G2 and its base is unavailable` com `Expected: [[...]], Received: []`; `not-applicable with a
    visible note` com `Expected: false, Received: true` (sem o seam, `nextjsAdapter` reconhece `middleware.ts`
    e dispara); `adapter without support` com `Received: []`. O `1 pass` e `absent at the base as nothing
    to lose` (nasce verde — gotcha local). Os 46 restantes do arquivo: `46 pass`.

- [ ] **Passo 2 (adaptador):** `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'computed base matcher'`
  → `1 pass` ja na chegada (nasce verde — declarado; defesa no RED-check (6))

- [ ] **GREEN:** Passo 3 implementado, tudo PASSA
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts`
  - Resultado esperado: `52 pass, 0 fail` (46 da fase-02 + 6)
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts`
  - Resultado esperado: `40 pass, 0 fail` (39 + 1)
  - Se a contagem real diferir, registrar no MEMORY (Metricas).

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `never stays silent when the base coverage cannot be reconstructed` FALHOU
      antes da defesa existir — base ilegivel com zero findings e aprovacao tacita por incapacidade, o modo
      de falha exato que RF-04 proibe, agora aplicado ao G2
  - Comando: `bun test skills/security/lib/route-auth-matrix.test.ts -t 'never stays silent when the base coverage'`
  - Resultado esperado no RED: `Expected length: 5, Received length: 0`
- [ ] **Segundo abuso no RED:** `turns every open route into indeterminada G2 when the allowlist triggered G2 on
      an adapter without support` FALHOU antes — um adaptador que "nao sabe" comparar cobertura e o Plano 04
      registrando sem G2; sem este ramo, a allowlist podia ser esvaziada numa stack nova em silencio
- [ ] **CA-10 (RF-04) estendido ao G2:** Dado que a lib nao consegue reconstruir a ponta antes, quando o
      auditor roda, entao emite finding MEDIO com veredito `indeterminada` para cada rota aberta fora do G1 —
      nao a omite e nao a conta como `coberta` — verificado por
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'irreconstruivel'`
- [ ] **`not-applicable` nunca vira `resolved` nem `coberta` em silencio:**
      `bun test skills/security/lib/route-auth-matrix.test.ts -t 'sem suporte'` → `3 pass`; a nota
      `adaptador <stack> sem suporte a G2` aparece em `summary.notes` mesmo sem gatilho
- [ ] **`absent` ≠ `unavailable` (DP-6):** `-t 'nothing to lose'` → `before: 'resolved'`, zero findings,
      nota `nenhuma cobertura a perder` — ausencia de middleware na base NAO produz 6 `medium` de ruido
- [ ] **Rotas coberta/publica HOJE nao sao tocadas:** `/api/preferences` (coberta) e `/api/health`,
      `/api/webhooks/stripe` (declaradas) nao aparecem em nenhum teste desta fase — `OPEN_NOW` sobre a ponta
      DEPOIS e o unico filtro
- [ ] **Ruido e por desenho (G18):** nenhum `slice`, `limit`, agrupamento ou rebaixamento em
      `unreconstructableBefore` — `grep -n "slice\|limit" skills/security/lib/route-auth-matrix.ts` nao
      encontra nada novo nesta funcao
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** Nenhum `middleware.ts` nem
      `anti-vibe.public-routes.json` de projeto algum foi criado ou editado; o adaptador fake vive so no teste
- [ ] Nenhum secret literal entrou no codigo; `unreconstructableBefore` nao loga — o `reason` (stderr do git)
      entra na evidence como ja entra em `delta.reason`

### Checklist

- [ ] **RED-check do orquestrador (obrigatorio):** com tudo verde, (1) em `reconstructBefore`, trocar o retorno
      do ramo `isCoverageUnavailable(coverage)` por `{ kind: 'resolved', coverage: after.coverage, allowlist:
      after.allowlist }` → `never stays silent when the base coverage` FALHA com `Expected length: 5, Received
      length: 0` e `reflects an unavailable base` (fase-01) FALHA com `Expected: "unavailable", Received:
      "resolved"`; restaurar. (2) Em `reconstructBefore`, trocar o retorno do ramo "metodos ausentes" pelo mesmo
      `resolved` → `not-applicable with a visible note` FALHA com `Expected: "not-applicable", Received:
      "resolved"` e `adapter without support` FALHA com `Received: []`; restaurar. (3) Em
      `unreconstructableBefore`, remover `if (!OPEN_NOW.has(now.verdict)) continue` → `never stays silent`
      FALHA com `Expected length: 5, Received length: 6` (`/api/preferences` entra); restaurar. (4) No adaptador
      Next, fazer o ramo `absent` devolver `{ unavailable: 'ausente' }` → `absent at the base as nothing to
      lose` FALHA com `Expected: "resolved", Received: "unavailable"` (e `treats middleware.ts absent` da
      fase-01 cai junto); restaurar. (5) Em `safeBaseReader`, relancar no `catch` → `missing or throwing
      readAtBase` FALHA com `error: git explodiu`; restaurar. (6) No adaptador, trocar `MIDDLEWARE_AT_BASE` por
      `MIDDLEWARE_FILE` no `parseMatcherConfig` → `computed base matcher opaque` FALHA em `file` (e `rebuilds
      the base coverage` da fase-01 cai junto); restaurar.
- [ ] `grep -n "opts.adapter ?? nextjsAdapter" skills/security/lib/route-auth-matrix.ts` → 1 ocorrencia;
      `grep -n "nextjsAdapter" skills/security/lib/route-auth-matrix.ts` → 2 (import + default) — nenhum outro
      uso direto do adaptador Next no motor
- [ ] `grep -n "switch" skills/security/lib/route-auth-matrix.ts` → vazio
- [ ] `grep -n " as " skills/security/lib/route-auth-matrix.ts` → so os `as const` preexistentes
- [ ] `grep -c "irreconstruivel" skills/security/lib/route-auth-matrix.ts` → `1` (a evidence) — a palavra nao
      vaza para summary/nota (a nota da fase-01 e `G2: <reason>`)
- [ ] `git diff agents/security-auditor.md | grep -c '^-[^-]'` → `0` (G13: esta fase so acrescenta);
      `grep -c "summary.g2.before" agents/security-auditor.md` → `2` (bullets c e d)
- [ ] Suite inteira do arquivo apos o GREEN (G21): `bun test skills/security/lib/route-auth-matrix.test.ts`
      → `52 pass` — em particular `-t 'CA-07|never stays silent when the base is unavailable'` continua verde
- [ ] CLI contra o repo do plugin: `bun skills/security/lib/route-auth-matrix.ts . --ref main` devolve o mesmo
      `summary.g2` da fase-02 (`triggered: false`, `before: "resolved"`) e nenhum `blocked`; e
      `bun skills/security/lib/route-auth-matrix.ts . --ref ref-que-nao-existe` devolve `blocked: true` (o diff
      falha ANTES do G2 — gotcha local; o ramo `unavailable` e provado por seam)
- [ ] `bun run generate:manifest` sem warning; diff revisado pelo checksum (G2) — 2 arquivos rastreados
- [ ] `bun run agents:contract` verde
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck` (depois do GREEN — G19)
- [ ] `bun run harness:validate` (o MEMORY.md em `docs/` muda nesta fase — CLAUDE.md do projeto)
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (G12)
- [ ] **GT-fase02-1 aplicada:** `RouteAdapter` type-only; nenhum import de valor novo; RED por assertion nos 5
      que falham — registrar no MEMORY se o RED real divergiu da forma prevista
- [ ] **MEMORY.md fechado (Passo 6):** "Notas para Planos Seguintes" preenchidas com assinaturas COPIADAS do
      codigo, os 3 pontos para o dev, dividas e compound candidates; contagens reais; Metricas 3/3; Status:
      concluido
- [ ] **Compound gate (CLAUDE.md do projeto):** sugerir ao dev rodar `/anti-vibe-coding:lessons-learned` com
      os candidatos do MEMORY (duas pontas pelo mesmo seam; `absent` ≠ `unavailable` como decisao de produto;
      metodo opcional em interface + `not-applicable` visivel) — SUGERIR, nao invocar

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'irreconstruivel'` retorna `3 pass`
- `bun test skills/security/lib/route-auth-matrix.test.ts -t 'sem suporte'` retorna `3 pass`
- `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'ponta antes'` retorna `6 pass`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck`, `bun run agents:contract`, `bun run generate:manifest`, `bun run harness:validate` sem erro/warning
- `git diff --stat agents/security-auditor.md` mostra so insercoes
- `plano03/MEMORY.md` tem Status `concluido` e "Notas para Planos Seguintes" sem o esqueleto comentado

**Por humano:**
- Num projeto Next.js real, num branch que edita `middleware.ts`, `/anti-vibe-coding:security` mostra em
  `reasoning` `summary.g2` completo (`triggered`, `sources`, `before`, `lost`, `indeterminate`) e, se
  `before` for `unavailable`, o texto literal "a lib NAO conseguiu ler a base" com o `reason` — **pendente de
  sync do cache do plugin (G1)**; registrar como divida, nao como falha
- O ramo `unavailable` NAO e reproduzivel pela CLI contra um repo saudavel (o `git diff` bloqueia antes —
  gotcha local); a prova e a dos testes de seam. Registrar isso no MEMORY como observacao, para o Plano 04
  nao "consertar" o que nao esta quebrado

---

<!-- Gerado por /plan-feature em 2026-09-05 -->

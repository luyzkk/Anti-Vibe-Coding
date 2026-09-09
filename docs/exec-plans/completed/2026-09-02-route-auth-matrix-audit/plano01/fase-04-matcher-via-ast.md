<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: `config.matcher` via AST e Match Demonstravel

**Plano:** 01 — Fundacao + Tracer Bullet (Next.js)
**Sizing:** 2h
**Depende de:** fase-03
**Visual:** false

---

## O que esta fase entrega

O string-match morre: `config.matcher` e lido do AST do `middleware.ts` com `@typescript-eslint/parser`,
cada entrada literal vira regex no subset path-to-regexp que o Next usa, e `coberta` so e afirmada
quando o regex **demonstravelmente** casa o `Route.path` — matcher computado, entrada fora do
subset ou regex que nao casa viram `indeterminada`/nao-coberta, nunca `coberta` por semelhanca
textual (CA-06 / AB-3).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/security/lib/route-auth-nextjs.ts` | Modify | `readNextjsCoverage` via AST; `matcherToRegExp`; `extractExportedMethods` migra para o mesmo AST |
| `skills/security/lib/route-auth-nextjs.test.ts` | Modify | Testes do conversor + abuso AB-3 + matcher computado |
| `tests/fixtures/route-auth-matrix/nextjs-matcher-lookalike/` | Create | `middleware.ts` com `/admin/:path*` + `app/api/admin/route.ts` (AB-3) |
| `tests/fixtures/route-auth-matrix/nextjs-matcher-computed/` | Create | `middleware.ts` com `matcher: buildMatcher()` + `app/api/admin/route.ts` |
| `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano01/MEMORY.md` | Modify | GT do resultado da verificacao de resolucao do parser (Passo 0) |
| `plugin-manifest.json` | Regenerate | `bun run generate:manifest` (G3) |

---

## Implementacao

### Passo 0: Verificar a resolucao do parser a partir do cache — ANTES de codar (G1)

Fato ja verificado no planejamento (2026-09-03): o cache
`C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\7.7.0\` **nao tem
`node_modules/` nem `bun.lock`**. Espere falha. Confirmar com o comando real, a partir do cache e
nao do checkout:

```powershell
cd "C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\7.7.0"
bun -e "import('@typescript-eslint/parser').then(() => console.log('RESOLVE: ok')).catch((e) => console.log('RESOLVE: FAIL —', e.message))"
```

Registrar o resultado literal no `MEMORY.md` como **GT-1** (comando + saida + data). Depois:

- **`RESOLVE: ok`** → seguir para o Passo 1 sem mudanca.
- **`RESOLVE: FAIL`** → PARAR e apresentar ao dev as tres opcoes abaixo. Nao escolher sozinho:
  a decisao afeta `capabilities-writer.ts` (que ja importa o parser e hoje degrada em silencio do
  cache) e o `package.json` do plugin inteiro.

| Opcao | O que muda | Custo | Risco |
|---|---|---|---|
| A. Promover `@typescript-eslint/parser` + `@typescript-eslint/types` para `dependencies` | `package.json`; exige que a instalacao do plugin rode `bun install` no cache — verificar se o marketplace faz isso (hoje o cache nao tem lockfile, indicio de que NAO) | baixo em codigo, incerto em distribuicao | se o cache nunca roda install, promover nao resolve nada |
| B. Parser proprio para o subset `export const config = { matcher: [...] }` (tokenizer de array de string literals; qualquer outra forma → `opaque`) | ~80 linhas em `route-auth-nextjs.ts`; zero dependencia | medio | perde `extractExportedMethods` via AST (fica no regex da fase-03) |
| C. `import()` dinamico com try/catch: parser ausente → toda regra `opaque` (`reason: 'parser indisponivel'`) → `indeterminada` | ~15 linhas | baixo | o adaptador Next vira inutil no cache ate A ou B acontecer — mas e honesto (RF-04) e o relatorio mostra 100% indeterminadas, que e o sinal que o PRD quer visivel |

Recomendacao do planejador: **C agora** (desbloqueia a fase e satisfaz RF-04) **+ decisao do dev
sobre A vs B** registrada no MEMORY como DI, com prazo antes do Plano 04 fase-02 (Express tambem
depende do parser). O codigo abaixo assume C como base — funciona sob qualquer decisao posterior.

### Passo 1: Ler `config.matcher` do AST

Reusar o padrao de `skills/lib/capabilities-writer.ts:50-57` (opcoes do `parse`, inclusive
`range: true` — sem ele o scope-manager quebra no Bun, BUG-1 daquele arquivo).

```ts
// skills/security/lib/route-auth-nextjs.ts — trecho
import type { TSESTree } from '@typescript-eslint/types'
import type { CoverageRule } from './route-auth-matrix.types'

type Parser = { parse: (code: string, opts: Record<string, unknown>) => TSESTree.Program }

// 2026-09-03 (Luiz/dev): import dinamico — parser e devDependency e o cache do plugin nao tem
// node_modules (G1, MEMORY GT-1). Ausente → regras `opaque` → indeterminada, nunca coberta (RF-04).
async function loadParser(): Promise<Parser | null> {
  try {
    const mod: unknown = await import('@typescript-eslint/parser')
    return isParser(mod) ? mod : null
  } catch {
    return null
  }
}

function isParser(mod: unknown): mod is Parser {
  return typeof mod === 'object' && mod !== null && typeof (mod as { parse?: unknown }).parse === 'function'
}
```

> `import()` dinamico torna `readCoverage` assincrono. Isso muda a assinatura de `RouteAdapter`
> congelada na fase-02 (`readCoverage(dir): CoverageMap` → `Promise<CoverageMap>`). Duas saidas:
> (i) carregar o parser UMA vez no topo do modulo com `await import()` top-level (Bun suporta
> top-level await em ESM; o `package.json` e `"type": "module"`) e manter `readCoverage` sincrono;
> (ii) tornar o contrato assincrono agora. Escolher (i) — nao reabre o contrato — e registrar como
> DI-fase04. Se (i) falhar no Bun por algum motivo, (ii) e DI + aviso ao Plano 04.

Extracao, percorrendo `ast.body`:

1. `ExportNamedDeclaration` cujo `declaration` e `VariableDeclaration` com declarator `id.name === 'config'`.
2. `init` deve ser `ObjectExpression`; achar `Property` com `key.name === 'matcher'` (ou `key.value === 'matcher'` se string).
3. `value`:
   - `Literal` string → uma regra `path-pattern`.
   - `ArrayExpression` → para cada elemento: `Literal` string → `path-pattern`;
     `ObjectExpression` com `source` string e SEM `has`/`missing` → `path-pattern` com o `source`;
     com `has`/`missing` → `opaque` (`reason: 'matcher condicional (has/missing) nao e cobertura demonstravel'`);
     `SpreadElement`, `Identifier`, `CallExpression`, `TemplateLiteral` com expressao → `opaque`.
   - Qualquer outra coisa (`Identifier`, `CallExpression`, `ConditionalExpression`...) → `opaque`
     (`reason: 'matcher computado'`).
4. Sem `export const config` → `rules: []` + `notes: ['middleware.ts sem config.matcher — middleware roda em toda rota']`.
   **Atencao:** sem matcher o Next roda o middleware em TUDO. Isso e cobertura total? E o proxy
   que o PRD fixou (G13) — emitir UMA regra `path-pattern` com `pattern: '/:path*'` e
   `line` do `export function middleware`, para que o motor trate como coberta. Registrar em
   `notes` para o relatorio.
5. `middleware.ts` ausente (e `src/middleware.ts` ausente) → `rules: []`, sem `opaque` — nao ha
   middleware, toda rota e DESCOBERTA (nao indeterminada: a ausencia e demonstravel).

`line` de cada regra = `element.loc.start.line`. `file` = `middleware.ts` (POSIX relativo).

Aproveitar o mesmo `parse()` para trocar o regex `EXPORT_VERB_RE` da fase-03 pelo walk de
`capabilities-writer.ts:62-89` (`FunctionDeclaration` e `VariableDeclaration` com
`ArrowFunctionExpression`/`FunctionExpression`). Parser ausente → manter o regex como fallback (a
enumeracao por regex e menos fiel, mas nao inventa rota; anotar em `notes`).

### Passo 2: Conversor do subset path-to-regexp (G11)

`path-to-regexp` nao esta instalado. O Next (v13–15) usa a sintaxe da v6 dessa lib para o matcher.
Implementar SO o subset abaixo; qualquer token fora dele → `null` (a regra vira `opaque`).

| Token | Regex | Exemplo |
|---|---|---|
| segmento literal `/about` | `/about` escapado | `/about` |
| `:name` | `/([^/]+)` | `/users/:id` casa `/users/42` |
| `:name*` | `(?:/[^/]+)*` (zero ou mais) | `/admin/:path*` casa `/admin` e `/admin/a/b` |
| `:name+` | `(?:/[^/]+)+` (um ou mais) | `/admin/:path+` NAO casa `/admin` |
| `:name?` | `(?:/[^/]+)?` | |
| `(regex)` sem nome apos `/` | `/(?:regex)` passado adiante | `/((?!_next/static\|favicon.ico).*)` |
| `:name(regex)` | `/(regex)` | `/:id(\\d+)` |

Ancorar `^...$`; o Next casa contra o `pathname` inteiro. Qualquer `(` desbalanceado, `\\` fora
de grupo, `{`, `*` solto ou `?` solto → `null`.

```ts
/**
 * Converte uma entrada de `config.matcher` no subset path-to-regexp v6 que o Next aceita.
 * Devolve `null` quando a entrada sai do subset — quem chama trata como `opaque` (CA-06).
 */
export function matcherToRegExp(entry: string): RegExp | null
```

### Passo 3: Casar `Route.path` (dialeto Next) contra o regex

`Route.path` tem `[id]` e `[...slug]`. Cobertura "demonstravel" significa: o matcher casa TODA
instancia concreta da rota. Sem resolver isso em geral, usar **sondas conservadoras**:

| Segmento | Sondas |
|---|---|
| `[x]` | `__dyn__` |
| `[...x]` | `__dyn__` e `__dyn__/__dyn__` (duas sondas) |
| `[[...x]]` | `` (vazio), `__dyn__` e `__dyn__/__dyn__` (tres sondas) |

Regra: **todas** as sondas casam → a regra cobre; **nenhuma** casa → nao cobre; **algumas** casam →
`indeterminada` com `evidence` dizendo qual sonda falhou. Rota sem segmento dinamico tem uma sonda:
ela mesma.

```ts
export function probesFor(routePath: string): string[]

export type MatchOutcome = 'matches' | 'no-match' | 'partial'
export function matchRouteAgainstPattern(routePath: string, pattern: string): MatchOutcome
```

`matchRouteAgainstPattern` devolve `'partial'` tambem quando `matcherToRegExp(pattern)` e `null`
— a decisao final (`indeterminada`) e do motor (fase-05), mas o adaptador ja nao afirma match.

### Passo 4: Fixtures de abuso e testes (RED antes da defesa)

`nextjs-matcher-lookalike/middleware.ts`:

```ts
// 2026-09-03 (Luiz/dev): AB-3 do PRD — o texto contem "/admin" mas o regex ^/admin(?:/[^/]+)*$ NAO casa /api/admin.
export function middleware(_request: Request) {
  return new Response(null, { status: 401 })
}
export const config = { matcher: ['/admin/:path*'] }
```

`nextjs-matcher-computed/middleware.ts`:

```ts
// 2026-09-03 (Luiz/dev): Premissa 1 do PRD — matcher computado e indeterminada, nunca coberta.
function buildMatcher(): string[] {
  return ['/api/:path*']
}
export function middleware(_request: Request) {
  return new Response(null, { status: 401 })
}
export const config = { matcher: buildMatcher() }
```

Ambas com `app/api/admin/route.ts` identico ao da fase-01.

```ts
// acrescentar em route-auth-nextjs.test.ts
describe('matcherToRegExp', () => {
  it('matches zero or more segments for :path*', () => {
    const re = matcherToRegExp('/admin/:path*')
    expect(re?.test('/admin')).toBe(true)
    expect(re?.test('/admin/settings/x')).toBe(true)
    expect(re?.test('/api/admin')).toBe(false)
  })
  it('requires at least one segment for :path+', () => {
    expect(matcherToRegExp('/admin/:path+')?.test('/admin')).toBe(false)
  })
  it('passes negative-lookahead groups through', () => {
    const re = matcherToRegExp('/((?!_next/static|favicon.ico).*)')
    expect(re?.test('/api/admin')).toBe(true)
    expect(re?.test('/_next/static/x.js')).toBe(false)
  })
  it('returns null for tokens outside the supported subset', () => {
    expect(matcherToRegExp('/admin/{a,b}')).toBeNull()
  })
})

describe('readNextjsCoverage', () => {
  it('reads literal matcher entries with their line (fixture nextjs-minimal)', () => {
    const map = readNextjsCoverage(join(FIXTURES, 'nextjs-minimal'))
    expect(map.rules).toEqual([{ kind: 'path-pattern', pattern: '/dashboard/:path*', file: 'middleware.ts', line: expect.any(Number) }])
  })
  it('marks a computed matcher as opaque, never as a path-pattern', () => {
    const map = readNextjsCoverage(join(FIXTURES, 'nextjs-matcher-computed'))
    expect(map.rules.every((r) => r.kind === 'opaque')).toBe(true)
  })
})

describe('AB-3 / CA-06 — lookalike matcher', () => {
  it('never reports /api/admin as covered when the matcher is /admin/:path*', () => {
    expect(matchRouteAgainstPattern('/api/admin', '/admin/:path*')).toBe('no-match')
  })
  it('reports partial when only some probes of a catch-all match', () => {
    expect(matchRouteAgainstPattern('/docs/[...slug]', '/docs/:one')).toBe('partial')
  })
})
```

O teste de abuso (`never reports /api/admin as covered`) deve FALHAR antes da defesa: com o
string-match herdado, `'/admin/:path*'.includes('/admin')`... — para o RED ser honesto, a versao
inicial de `matchRouteAgainstPattern` delega ao `includes()` da fase-02 e devolve `'matches'`.
So depois entra o regex.

---

## Gotchas

- **G1 do plano:** Passo 0 e bloqueante. Nao pular por "roda no checkout". A fixture verde local
  mente se o cache nao resolve o parser — e o risco central listado no PLAN.md.
- **G11 do plano:** nao instalar `path-to-regexp` para "ficar igual ao Next". Adicionar dependencia
  e decisao do dev; e a mesma discussao do Passo 0 (A vs B).
- **G13 do plano:** matcher ausente = middleware em tudo = coberta. E o proxy do PRD; a limitacao
  vai para `notes` e para o relatorio. Nao inventar leitura do corpo do middleware.
- **G15 do plano (D4 do PRD):** `getServerSession()` dentro de `route.ts` continua invisivel para
  este adaptador. Nao acrescentar "deteccao de auth no handler" como bonus.
- **G12 do plano:** `map.rules[0]` e `CoverageRule | undefined` — nos testes usar `toEqual` no
  array inteiro ou `rules[0]?.kind`.
- **Local — `src/middleware.ts`:** Next aceita `middleware.ts` na raiz OU em `src/`. Procurar os
  dois, na ordem; os dois presentes → o Next usa o da raiz? Nao: e erro de build. Anotar em
  `notes` e usar o da raiz.
- **Local — `proxy.ts` (Next 16+):** `knowledge/nextjs/atoms/middleware-and-edge.md` menciona
  `proxy.ts` como sucessor. Fora do escopo desta fase; registrar em `notes` se `proxy.ts` existir
  e `middleware.ts` nao (`reason: 'proxy.ts (Next 16) nao suportado nesta versao'` → regra `opaque`).
- **Local — regex de usuario e ReDoS:** o grupo `(regex)` do matcher e passado adiante para
  `new RegExp`. O input e o `middleware.ts` do proprio projeto auditado (fronteira de confianca
  interna, PRD §Classificacao do dado) — aceitavel, mas embrulhar `new RegExp` em try/catch e
  tratar `SyntaxError` como `null` (→ `opaque`).

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (nao por compilation error)
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'never reports /api/admin as covered'`
  - Resultado esperado: `Expected: "no-match", Received: "matches"` (string-match herdado)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts`
  - Resultado esperado: `17 pass, 0 fail` (9 da fase-03 + 8 desta)

### Seguranca (fase de slice [RISCO] — auth)

- [ ] **Teste de abuso no RED:** `never reports /api/admin as covered when the matcher is /admin/:path*`
      FALHOU antes da defesa (Abuse-It)
  - Comando: `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'AB-3'`
  - Resultado esperado no RED: o ataque passa — o lookalike sai como `matches`
- [ ] **CA-06:** Dado um `config.matcher` cujo regex nao casa a rota, quando o auditor avalia, entao
      o veredito e `indeterminada` ou `DESCOBERTA`, jamais `coberta` por semelhanca textual —
      verificado por `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'CA-06'`
- [ ] **Premissa 1 (matcher computado):** `marks a computed matcher as opaque` verde
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** A fase nao altera auth de projeto
      nenhum; le `middleware.ts` e nao escreve. Passo 0, se FAIL, foi apresentado ao dev antes de
      qualquer mudanca em `package.json`
- [ ] Nenhum secret literal entrou no codigo ou na fixture (as fixtures so tem `matcher` e `Response`)

### Checklist

- [ ] `MEMORY.md` tem **GT-1** com a saida literal do Passo 0 e a data
- [ ] Se Passo 0 = FAIL: `MEMORY.md` tem **DI-fase04** com a opcao escolhida pelo dev (A/B/C) e o prazo
- [ ] `grep -c "includes(" skills/security/lib/route-auth-nextjs.ts` → 0 (string-match removido)
- [ ] `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-matcher-lookalike`
      devolve `/api/admin` como issue (nao coberta)
- [ ] `bun skills/security/lib/route-auth-matrix.ts tests/fixtures/route-auth-matrix/nextjs-matcher-computed`
      devolve `summary.indeterminada >= 1` (a emissao como MEDIO e Plano 02; aqui so a contagem)
- [ ] `bun run generate:manifest` sem warning
- [ ] Testes passam: `bun run test`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/security/lib/route-auth-nextjs.test.ts -t 'AB-3|CA-06|opaque'` retorna `0 fail`
- `bun test skills/security/lib/` retorna `0 fail`
- `bun run typecheck` sem erros

**Por humano:**
- Dev leu GT-1 no MEMORY e decidiu (ou agendou) A vs B — a fase nao fecha com a pendencia
  implicita

---

<!-- Gerado por /plan-feature em 2026-09-03 -->

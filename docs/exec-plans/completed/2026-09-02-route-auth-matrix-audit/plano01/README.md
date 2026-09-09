# Plano 01: Fundacao + Tracer Bullet (Next.js)

**Feature:** Matriz Rota x Middleware de Auth no Auditor ([PLAN overview](../PLAN.md))
**Fases:** 5
**Sizing total:** ~8h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 (allowlist), Plano 03 (G2, via Plano 02), Plano 04 (outros adaptadores)

---

## O que este plano entrega

Ao final, uma rota Next.js nova sem cobertura de `config.matcher` vira finding **CRITICO** ou **ALTO**
no contrato v2.0.0, com `arquivo:linha` e a razao do que faltou, emitido pelo `security-auditor` que
passou a executar a lib `skills/security/lib/route-auth-matrix.ts` via Bash. O contrato de tipos
(`Route`, `CoverageMap`, `Verdict`, `RouteFinding`, `RouteAdapter`) fica congelado na fase-02 — e o
shape que Rails, Express e Python implementam no Plano 04 sem reabrir discussao.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Contrato v2.0.0 (`skills/lib/subagent-contract.ts`, `agents/_contract/v2.schema.json`) | PRD shift-left-security-pipeline (mergeado) | pronto |
| `@typescript-eslint/parser` como devDependency (`package.json`) | repo | pronto no checkout; **ausente no cache do plugin** (ver G1) |
| `skills/security/lib/` como pasta de libs de seguranca | repo | pronto |

Nenhum bloqueador de outro plano — este e o primeiro.

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Contrato de tipos em `skills/security/lib/route-auth-matrix.types.ts` (`Route`, `CoverageMap`, `CoverageRule`, `Verdict`, `RouteFinding`, `RouteAdapter`) | Plano 02 (allowlist le `Route.path`, produz `publica-declarada`); Plano 04 (tres adaptadores implementam `RouteAdapter`) |
| Lib `skills/security/lib/route-auth-matrix.ts` (`auditRouteCoverage`, motor de veredito, CLI) | Plano 02 (acrescenta allowlist ao cruzamento); Plano 03 (avalia cobertura em duas pontas) |
| Adaptador Next.js em `skills/security/lib/route-auth-nextjs.ts` | Plano 03 (G2 le o `CoverageMap` em `<ref>` e em `HEAD`); Plano 04 fase-04 (registro por stack) |
| `security-auditor.md` com `Bash` e a subsecao de invocacao | Todos os planos — e o unico caminho de emissao |
| Fixtures em `tests/fixtures/route-auth-matrix/nextjs-*` | Plano 02, 03 e Plano 04 fase-05 (gate CA-08) |
| Emenda no PRD (Decisao 10: Bash no auditor + libs TS) | Registro — todos os planos operam sob ela |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-tracer-bullet-next-naive.md | Cadeia inteira ingenua: fixture → lib (string-match) → 1 finding → auditor com Bash → PRD emendado | 2h | — |
| 02 | fase-02-contrato-de-tipos.md | `Route`, `CoverageMap`, `Verdict`, `RouteFinding`, `RouteAdapter` congelados + type guards | 1h | fase-01 |
| 03 | fase-03-enumeracao-next-filesystem.md | Enumeracao fiel do App Router: `page`/`route`, `[id]`, `[...slug]`, `(group)`, N metodos por `route.ts` | 1.5h | fase-02 |
| 04 | fase-04-matcher-via-ast.md | `config.matcher` lido por AST; match rota × matcher demonstravel; duvida → `indeterminada` (CA-06) | 2h | fase-03 |
| 05 | fase-05-motor-de-veredito-e-severidade.md | 4 veredictos, regra CRITICO/ALTO fixa, `arquivo:linha` + o que faltou, escopo G1 pelo diff | 1.5h | fase-04 |

---

## Grafo de Fases

```
fase-01 (tracer bullet ingenuo)
    |
    v
fase-02 (contrato de tipos)  ── congela o shape → Plano 02 e Plano 04 podem comecar aqui
    |
    v
fase-03 (enumeracao Next.js real)
    |
    v
fase-04 (matcher via AST)
    |
    v
fase-05 (motor de veredito e severidade)
```

**Paralelismo possivel:** nenhum dentro deste plano. As cinco fases sao **estritamente sequenciais**
de proposito: cada uma substitui uma peca ingenua deixada pela anterior (fase-02 troca o shape ad hoc,
fase-03 troca o glob, fase-04 troca o string-match, fase-05 troca o "sempre CRITICO"). Rodar duas em
paralelo significaria editar o mesmo arquivo (`route-auth-matrix.ts`) em duas branches. O que
paraleliza e **entre planos**: a partir do fim da fase-02, o Plano 04 (adaptadores) pode comecar
contra o contrato congelado, sem esperar fase-03..05.

---

### Política de fases (perfil-aware)

**Granularidade:** Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)
**Critério de fase atômica:** Testável, atomicamente revertível, sizing 30min-2h
**Exemplo de nome de fase:** `fase-02-implementar-X`

**Evitar:**
- Fase de mais de 2h
- Fase que toca mais de 5 arquivos

> Excecao declarada: a fase-01 toca 8 arquivos (2 sao fixture de dados, 1 e o manifest gerado). Um
> tracer bullet atravessa todas as camadas por definicao — cortar arquivos dele e cortar camadas.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run typecheck
```

Filtro de teste neste repo: `bun test <arquivo> -t '<regex do nome>'` (flag `-t`, nao `--grep`).
Suite completa: `bun run test` (roda em lotes — o total real e a soma dos lotes).

**Tracer Bullet deste plano:** fase-01 — e tambem o tracer bullet do PRD inteiro. Se ela fecha
(lib nova + Bash no agente + `generate:manifest` + `agents:contract` verdes), o risco central — o
auditor conseguir executar codigo e o achado chegar ao relatorio — esta provado antes de qualquer
investimento em largura.

---

## Gotchas Conhecidos

- **G1 — `@typescript-eslint/parser` e devDependency e o cache do plugin NAO tem `node_modules`.**
  Verificado em 2026-09-03: `C:\Users\luizf\.claude\plugins\cache\local-plugins\anti-vibe-coding\7.7.0\`
  contem `agents/ config/ hooks/ knowledge/ skills/ scripts/ ...` e **nenhum** `node_modules/` nem
  `bun.lock`. `skills/lib/capabilities-writer.ts` ja importa o parser e provavelmente degrada em
  silencio quando roda do cache (o `catch` devolve lista vazia). A fase-04 confirma com comando real
  e PARA para decisao do dev se falhar. Regra da feature: parser indisponivel → `indeterminada`,
  nunca `coberta`.
- **G2 — `bun run lint` nao existe.** O `fase-template.md` traz essa linha; o equivalente aqui e
  `bun run typecheck` (`tsc --noEmit`, strict).
- **G3 — Manifest.** Todo `.ts` em `skills/**/lib/` e todo `.md` em `agents/` e rastreado por
  `plugin-manifest.json`. Arquivo rastreado alterado exige `bun run generate:manifest` **no mesmo
  commit** — esquecer inverte o veredito do `/update`. `tests/` e `docs/` estao em
  `IGNORED_PREFIXES` (fixtures nao contam).
- **G4 — "Nunca diminuir".** Edicao em SKILL.md/agente e aditiva. No `security-auditor.md`,
  ACRESCENTAR `Bash` ao `tools:` e ACRESCENTAR a secao 11 e a linha de allowlist — nao reescrever as
  secoes 1–10 nem o bloco de contrato.
- **G5 — Route groups nao entram no path.** `app/(marketing)/pricing/page.tsx` serve `/pricing`.
  Segmento entre parenteses e removido na conversao (knowledge `app-router-and-layouts.md`,
  anti-pattern "Over-nesting layouts"). Parallel routes `@slot` e intercepting `(.)x` tambem nao sao
  path publico — fora do escopo do Plano 01, ver fase-03.
- **G6 — `route.ts` exporta varios metodos.** Um arquivo gera N `Route`, uma por verbo exportado.
  Tres formas de export existem no mundo real: `export function GET`, `export async function POST`,
  `export const PUT = async () =>` — o regex original do `capabilities-writer.ts` perdia a terceira
  (comentario em `tests/capabilities-writer.ast.test.ts:38`).
- **G7 — `tsconfig.json` inclui `**/*.ts`, logo `tests/fixtures/**` passa pelo `typecheck`.**
  A fixture `middleware.ts` NAO pode importar `next/server` (`next` nao esta instalado). Usar
  `Request`/`Response` globais (vem de `bun-types`) — precedente:
  `tests/fixtures/ast-route-fixtures/route-fn-declaration.ts`. Se um caso futuro exigir `next/*`,
  acrescentar a pasta em `exclude` do tsconfig (precedente: `tests/fixtures/compound-100-docs`).
- **G8 — Windows.** `path.relative()` devolve `\`. Normalizar com `.split(path.sep).join('/')` antes
  de montar `Route.path` e `Route.file`; senao o string-match e o regex do matcher falham so no
  Windows e o teste passa no CI Linux.
- **G9 — `agents/dependency-auditor.md:120-121` afirma que o `security-auditor` "permanece
  read-only sem Bash".** A fase-01 contradiz essa frase. Emenda ADITIVA (G4): acrescentar uma frase
  datada esclarecendo que o Bash do `security-auditor` e restrito a lib `route-auth-matrix` e que SCA
  continua fora dele — a separacao de escopos (D6 do PRD anterior) permanece.
- **G10 — cwd do auditor e o projeto auditado, nao o plugin.** O comando Bash precisa ancorar no
  plugin: `bun "${CLAUDE_PLUGIN_ROOT}/skills/security/lib/route-auth-matrix.ts" <dir>`. Precedente
  do `${CLAUDE_PLUGIN_ROOT}`: `hooks/hooks.json:8` e `skills/init/lib/steps/helpers.ts:33`. Se a
  variavel nao estiver definida no Bash do subagente, o comando falha — a fase-01 verifica.
- **G11 — `path-to-regexp` NAO esta instalado** (nem transitivo — `find node_modules -name
  path-to-regexp` vazio). O `config.matcher` do Next usa a sintaxe dessa lib (`/admin/:path*`,
  grupos regex `((?!_next).*)`). A fase-04 escreve um conversor proprio para o **subset** literal
  (`:name`, `:name*`, `:name+`, `:name?`, grupo regex entre parenteses); qualquer entrada fora do
  subset vira `opaque` → `indeterminada`. Nao adicionar dependencia sem decisao do dev.
- **G12 — `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` estao ligados.** Nao atribuir
  `undefined` explicitamente a campo opcional do issue (`line: maybeLine` quebra se `maybeLine` for
  `number | undefined`); usar spread condicional `...(line !== undefined ? { line } : {})` como faz
  `subagent-contract.ts`. `process.argv[2]` e `string | undefined` — sempre `?? fallback`.
- **G13 — Matcher e proxy de "middleware executa", nao de "auth foi checada".** Um matcher amplo
  (`/((?!_next/static|_next/image|favicon.ico).*)`) faz toda rota sair `coberta` mesmo que o corpo do
  middleware so cheque `/dashboard`. E o proxy que o PRD fixou (tabela "Rota vem de / Cobertura vem
  de"); ler o corpo do middleware e RF fora desta versao. Registrar como Premissa 1 estendida no
  MEMORY se aparecer em projeto real.
- **G14 — `src/app/` e variante valida do App Router.** `tests/fixtures/nextjs-app-router-fixture`
  usa `src/app`. O enumerador procura `app/` e depois `src/app/`; os dois presentes → usa `app/` e
  registra o outro em `CoverageMap.notes`.
- **G15 — Auth dentro do handler NAO conta (D4 do PRD).** `getServerSession()`, `auth()`,
  `supabase.auth.getUser()` no `route.ts` nao alteram o veredito. A secao 8 do proprio auditor trata
  auth espalhada em handler como ALTO — aceitar aqui contradiria a regra do mesmo agente.

---

<!-- Gerado por /plan-feature em 2026-09-03 -->

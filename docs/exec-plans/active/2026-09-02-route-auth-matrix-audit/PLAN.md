# Plan: Matriz Rota x Middleware de Auth no Auditor

**PRD:** ./PRD.md
**Planos:** 4 planos, 16 fases total
**Created:** 2026-09-03

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Fundacao + Tracer Bullet (Next.js) | 5 | ~8h | — |
| 02 | Allowlist e veredictos completos | 3 | ~4h | Plano 01 |
| 03 | G2: cobertura perdida | 3 | ~4.5h | Plano 02 |
| 04 | Os outros tres adaptadores + multi-stack | 5 | ~7.5h | Plano 01 |

---

## Grafo de Dependencias

```
Plano 01 (fundacao + tracer bullet)
    |
    +---------------------------------+
    |                                 |
    v                                 v
Plano 02 (allowlist)           Plano 04 (3 adaptadores + multi-stack)
    |
    v
Plano 03 (G2 cobertura perdida)
```

**Paralelismo possivel:** Plano 04 corre em paralelo com Plano 02 assim que o Plano 01 congela o
contrato de tipos (fase-02). Plano 02 e Plano 03 sao **sequenciais** de proposito: ambos editam o
mesmo caminho de emissao no `security-auditor.md` e o mesmo motor de veredito — pela taxonomia de
paralelismo, contrato compartilhado exige acordo antes, nao corrida. Dentro do Plano 04, as fases
01/02/03 (um adaptador cada) sao paralelizaveis entre si; fase-04 e fase-05 aguardam as tres.

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-tracer-bullet-next-naive
**Descricao:** A fatia mais fina que atravessa TODAS as camadas: uma fixture Next.js com um
`app/api/admin/route.ts` e um `middleware.ts`, uma funcao `auditRouteCoverage(dir)` que globa a
rota, le o matcher por **string-match ingenuo**, e emite UM finding no contrato v2.0.0 — e o
`security-auditor` ganha `Bash` e e instruido a invoca-la. Um teste: fixture → finding com o shape
certo. Tudo ingenuo de proposito; as fases 02–05 trocam cada peca pela real. Se este caminho fecha
(lib nova em `skills/security/lib/` + Bash no agente + `generate:manifest` + `bun test` verdes), o
risco tecnico central — o auditor conseguir executar codigo e o achado chegar ao relatorio — esta
provado antes de qualquer investimento em largura.

---

## Resumo por Plano

### Plano 01: Fundacao + Tracer Bullet (Next.js)
> Prova a cadeia inteira com uma stack e congela o contrato que os outros tres adaptadores vao
> implementar. Ao final, rota Next.js nova sem cobertura vira finding CRITICO/ALTO com `arquivo:linha`.

Fases:
- fase-01-tracer-bullet-next-naive: end-to-end ingenuo — fixture, string-match, 1 finding, Bash no auditor
- fase-02-contrato-de-tipos: `Route`, `CoverageMap`, `Verdict`, `RouteFinding` — o shape que as 4 stacks servem
- fase-03-enumeracao-next-filesystem: `app/**/{page,route}.{ts,tsx}`, segmentos dinamicos, route groups
- fase-04-matcher-via-ast: `config.matcher` lido com `@typescript-eslint/parser`; match real rota × matcher
- fase-05-motor-de-veredito-e-severidade: os 4 veredictos, regra CRITICO/ALTO, `arquivo:linha` (RF-05)

### Plano 02: Allowlist e veredictos completos
> `anti-vibe.public-routes.json` como declaracao versionada e fail-closed; os casos de abuso
> AB-1 e AB-4 defendidos; `indeterminada` deixa de ser rodape e vira finding MEDIO.

Fases:
- fase-01-parser-allowlist-fail-closed: leitura na raiz, `path` + `reason` obrigatorios, ausencia = nada publico
- fase-02-amplitude-de-curinga-e-reason: entrada ampla vira finding proprio (AB-1/CA-04); sem `reason` e recusada (CA-04b)
- fase-03-destaque-mudanca-e-indeterminada-medio: mudanca da allowlist em secao destacada (AB-4/CA-07); `indeterminada` emite MEDIO (CA-10)

### Plano 03: G2 — cobertura perdida
> O defeito grave que a revisao do PRD pegou: diff que so estreita o matcher nao toca rota nenhuma
> e, com G1 sozinho, deixava rotas existentes abertas em silencio.

Fases:
- fase-01-cobertura-nas-duas-pontas-do-diff: avaliar o mapa de cobertura em `<ref>` e em `HEAD`
- fase-02-delta-e-veredito-cobertura-perdida: rotas que sairam de `coberta` viram finding (CA-09)
- fase-03-ponta-antes-irreconstruivel: sem `<ref>` resolvivel, veredito `indeterminada` — nunca silencio

### Plano 04: Os outros tres adaptadores + multi-stack
> As quatro stacks do PRD, cada uma pelo caminho nativo dela, atras do contrato do Plano 01;
> e o gate que prova que o shape serve as quatro (CA-08).

Fases:
- fase-01-adaptador-rails: `config/routes.rb` + `before_action` (incluindo heranca de `ApplicationController`)
- fase-02-adaptador-express: `app.<verb>` / `router.<verb>` + `use` na cadeia, via AST
- fase-03-adaptador-python: `urls.py` (Django) e decorators (FastAPI/Flask) + middleware/`Depends`
- fase-04-multi-stack-detect-stack: `detectStack()` escolhe os adaptadores; monorepo roda varios (RF-06/CA-11)
- fase-05-gate-e2e-quatro-fixtures: fixture verde por stack — adaptador sem fixture nao entra (CA-08)

---

## Risks

- **`@typescript-eslint/parser` e devDependency.** O adaptador Next (fase-04 do Plano 01) e o Express
  (Plano 04) dependem dele. Quando o plugin roda a partir do cache global, o `node_modules` de dev pode
  nao estar la — o parser resolve? Se nao, o adaptador quebra em producao e a fixture verde local mente.
  - Mitigacao: fase-01 do Plano 01 verifica a resolucao a partir do caminho de cache real, nao so do
    checkout do repo. Se falhar, promover a dependencia ou embutir um parser menor — decidir antes da
    fase-04, nao depois.
- **Rails e Python nao tem parser no repo.** `routes.rb` e DSL Ruby, `urls.py` e Python — nao ha
  `@typescript-eslint` equivalente. Esses adaptadores serao por regex/linha, com fidelidade menor e
  taxa de `indeterminada` maior. E exatamente a Premissa 3 do PRD (medir antes de manter o adaptador).
  - Mitigacao: fase-05 do Plano 04 mede a taxa de `indeterminada` por stack na fixture; taxa alta e
    sinal para cortar o adaptador desta versao, nao para afrouxar o veredito.
- **O auditor ganha `Bash`.** Amplia a superficie de um agente read-only. Ha precedente
  (`dependency-auditor`, `tdd-verifier`, `database-analyzer`), mas o PRD nao registra isso.
  - Mitigacao: emenda no PRD (Decisao 10) na fase-01 do Plano 01, e o agente e instruido a invocar
    **so** a lib nomeada, nunca comando arbitrario.
- **Quatro stacks de uma vez** (risco herdado do PRD, probabilidade alta).
  - Mitigacao: contrato congelado no Plano 01 antes de qualquer adaptador novo; fixture obrigatoria
    por stack como gate de entrada (Plano 04 fase-05).
- **Falso `coberta` da garantia falsa** (risco herdado do PRD, impacto alto).
  - Mitigacao: fase-04 do Plano 01 so afirma `coberta` quando o match rota × matcher e demonstravel
    pelo AST; qualquer duvida cai em `indeterminada` (CA-06).
- **Regenerar o manifest.** Toda lib em `skills/security/lib/*.ts` e todo `.md` de agente sao
  rastreados; commit sem `bun run generate:manifest` inverte o veredito do `/update`.
  - Mitigacao: item fixo no checklist de toda fase que toca arquivo rastreado.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 — adaptador nativo por stack, contrato comum so no achado | Plano 01 fase-02 (contrato); Plano 04 fases 01–03 (adaptadores) |
| D2 — escopo hibrido: rota do diff, mapa de cobertura inteiro | Plano 01 fase-05; Plano 03 (G2) |
| D3 — coberta OU publica declarada em allowlist | Plano 02 fase-01 |
| D4 — auth dentro do handler NAO conta como cobertura | Plano 01 fase-04 (so o matcher e cobertura) |
| D5 — as quatro stacks juntas, mitigado por fixture por stack | Plano 04 fase-05 |
| D6 — conjunto-gatilho G1 + G2 | Plano 01 fase-05 (G1); Plano 03 (G2) |
| D7 — allowlist na raiz, fora de `.anti-vibe/` (gitignored) | Plano 02 fase-01 |
| D8 — `indeterminada` emite finding MEDIO | Plano 02 fase-03 |
| D9 — severidade e regra fixa (privilegio ou mutacao = CRITICO) | Plano 01 fase-05 |
| Decisao de planejamento (2026-09-03): Bash no auditor + libs TS, nao prosa nem orquestrador | Plano 01 fase-01 |

---

<!-- Gerado por /plan-feature em 2026-09-03 -->

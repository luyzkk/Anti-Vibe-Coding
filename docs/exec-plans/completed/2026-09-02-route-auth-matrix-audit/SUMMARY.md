# Summary: Matriz Rota x Middleware de Auth no Auditor

**Completed:** 2026-09-07
**Duration:** 2026-09-02 (PRD) → 2026-09-07
**Planos:** 4 (4 completed, 0 skipped)
**Fases:** 16 (16 done, 0 skipped, 0 blocked)

---

## O que foi construido

O `security-auditor` sabia achar **codigo ruim que existe** (grep por padrao presente). Nao sabia achar
**ausencia** — a rota que ninguem lembrou de proteger nao deixa padrao para grepar, deixa silencio. Esta
feature fecha esse buraco por white-box, onde o spider black-box do ZAP so alcanca o que consegue navegar.

- **Plano 01 — Fundacao + tracer bullet (Next.js).** Cadeia inteira provada com uma stack: fixture → lib
  em `skills/security/lib/` → finding no contrato v2.0.0 → `security-auditor` com `Bash` restrito.
  Contrato congelado (`Route`, `CoverageMap`, `Verdict`, `RouteAdapter`), matcher real por parser proprio
  (o `@typescript-eslint` nao resolve do cache do plugin), e a regra de severidade fixa (D9).
- **Plano 02 — Allowlist e veredictos completos.** `anti-vibe.public-routes.json` na raiz como declaracao
  versionada e **fail-closed**; `path` + `reason` obrigatorios; entrada ampla vira finding proprio (AB-1);
  toda mudanca da allowlist aparece em bloco destacado (AB-4); `indeterminada` deixa de ser rodape e vira
  finding **MEDIO** (D8).
- **Plano 03 — G2: cobertura perdida.** O defeito grave que a revisao do PRD pegou: um diff que **so**
  estreita o `config.matcher` nao toca arquivo de rota nenhum, e com G1 sozinho um conjunto inteiro de
  rotas admin ficava aberto **em silencio**. Agora a base e reconstruida pelo mesmo seam `readAtBase`,
  `verdictFor` avalia as duas pontas, e rota que saiu de coberta vira `[cobertura perdida]`.
- **Plano 04 — Os outros tres adaptadores + multi-stack.** Rails (`routes.rb` + `before_action` com
  heranca), Express (`app.<verb>` + ordem de `use` por linha), Python (FastAPI/Flask/Django).
  `detectStack()` escolhe os adaptadores; monorepo roda varios e cada finding diz `[<stack>]`.

**Estado final:** suite **2143 pass / 0 fail**; `skills/security/lib/` 211; gate e2e 7.
`typecheck`, `agents:contract` (39), `harness:validate` verdes.

## Premissa 3 do PRD, validada com medida

| Stack | indeterminada / enumerated | Taxa | Corte 0.25 |
|---|---|---|---|
| nextjs | 0/6 | 0.000 | entra |
| rails | 2/13 | 0.154 | entra |
| node-ts (Express) | 1/6 | 0.167 | entra |
| python (FastAPI) | 0/5 | 0.000 | entra |

Nenhum adaptador cortado. A aposta "enumeracao estatica de Express cobre o suficiente para valer a pena"
era o risco declarado do PRD e foi **medida**, nao argumentada. Django fica fora do gate por desenho.

## Decisoes de implementacao que valem para o repo

- **Leitura de base com TRES estados** (`found`/`absent`/`unavailable`), nao `T | null`: "nao existia" e
  "nao consegui ler" tem consequencias opostas num check de seguranca.
- **`needs_human` nao serve para sinalizar gravidade** — o consolidador do `verify-work` descarta as
  `issues` do agente nesse status. Gravidade viaja por `verdict`, nao por lifecycle.
- **Metodo OPCIONAL em interface + `not-applicable` visivel** como padrao de extensao: adaptador que
  chega depois nao vira silencio nem `coberta`.
- **Amplitude de allowlist decidida contra a ENUMERACAO**, nao pela sintaxe (DP-7): `/posts/:id` no Rails
  e declaracao literal de rota real; `/api/*` sem rota correspondente continua finding `high`.

## Bugs e gotchas generalizaveis

- **BUG-fase02-1 (Plano 04):** segundo `Router()` no mesmo arquivo **sumia em silencio** — nem `Route`,
  nem `unresolved`, nem nota. Rota que o relatorio nunca menciona e pior que `indeterminada`.
- **BUG-fase03-1 (Plano 02):** `git cat-file -e <sha>:<path>` nunca sai 1 para path ausente (morre em 128);
  e classificar por mensagem do git quebra em maquina com i18n. `git ls-tree` responde por contrato.
- **GT-fase02-1 (Plano 02):** import de valor novo em teste existente = RED de compilacao TOTAL no Bun.
- **GT-fase02-1 (Plano 04):** fixture cujos middlewares sao TODOS de auth nao exercita a heuristica de nome.
- **GT-fase03-1 (Plano 04):** fase grande demais estoura `max_output_tokens`; dividir na costura do doc e
  mandar evidencia para arquivo. Estimar fase por **linhas de codigo**, nao so por horas.
- **GT-fase04-1 (Plano 04):** `typecheck` em paralelo com a suite da falso `TS6053` (a suite mexe em
  `tests/__fixtures__/` e o `tsconfig` inclui `**/*.ts`).
- **O padrao mais repetido (7x):** numero previsto em checklist e chute do planejador — o que vale e
  **qual assertion quebra**. Em varias fases o teste passava e so a mutacao mostrou se a defesa existia.

## Metricas consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 4 |
| Fases total | 16 |
| Bugs encontrados | 3 |
| Retries | 1 (fase-03 do Plano 04, `max_output_tokens`) |
| Desvios registrados | 12 (DI/DEV) |
| Suite | 1887 → 2143 pass / 0 fail |

## Pendencias herdadas (nao bloqueiam)

1. **Cache do plugin defasado** — rodar `scripts/sync-to-global.sh` (Git Bash). **Todo criterio "por
   humano" das 16 fases esta pendente disso**, inclusive comparar `railsAdapter.enumerate` contra
   `bin/rails routes` de um projeto real.
2. **`withG2Note` inalcancavel** (`route-auth-matrix.ts`) — ou ganha teste que o alcance, ou sai.
3. **`CLAUDE_PLUGIN_ROOT` no Bash do subagente** — pendencia aberta desde o Plano 01.

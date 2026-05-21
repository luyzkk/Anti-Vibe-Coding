# Plano 03: Step 5 (scaffold-and-link) + Step 6 (install-gh-files)

**Feature:** init-refactor-v7 ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3h
**Depende de:** Plano 01 (registry com 10 nomes — stubs nas posicoes 5 e 6 criados em fase-04). NAO depende de Plano 02 (Steps 5-6 nao consomem `ctx.legacy` nem o schema Zod do manifest — sao puramente estruturais).
**Desbloqueia:** Plano 04 (Step 7 `generate-populate-plans` precisa dos 16 placeholders no disco para validar paths/coexistencia); Plano 05 (e2e final cobre CA-01 — placeholders criados; CA-02 — `.claude/CLAUDE.md` preservado; CA-08 — re-run idempotente).

---

## O que este plano entrega

Substitui dois stubs do Plano 01 por logica real: Step 5 (`05-scaffold-and-link`) escreve 36
placeholders do `TEMPLATE_MANIFEST` (incluindo os 4 docs extras AVC — MERGE_GATES.md,
CODE_STYLE.md, STATE.md e `.claude/CLAUDE.md`) com skip-if-exists, e em seguida invoca
`linkClaudeToAgents` para gerar o mirror raiz CLAUDE.md ↔ AGENTS.md sem nunca tocar em
`.claude/CLAUDE.md`. Step 6 (`06-install-gh-files`) copia `.github/workflows/harness.yml`
e `.github/pull_request_template.md` estaticos com skip-if-exists. Sem dry-run, sem
`WriteRecorder`, sem `isDryRun(ctx)` (D4). A LLM/usuario popula o conteudo dos placeholders
nos planos individuais gerados pelo Step 7 (Plano 04).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Registry com 10 nomes (Steps 5-6 stubs) | Plano 01 fase-04 (`registry.ts`) | pendente (Plano 01) |
| Stubs `scaffoldAndLinkStep` em `steps/05-scaffold-and-link.ts` e `installGhFilesStep` em `steps/06-install-gh-files.ts` (id-only) | Plano 01 fase-04 | pendente (Plano 01) |
| Lib `scaffold-full-tree.ts` (TEMPLATE_MANIFEST + writer + skip-if-exists ja implementados) | `skills/init/lib/scaffold-full-tree.ts` (existente) | pronto |
| Lib `template-manifest.ts` (36 entries incluindo os 4 extras AVC) | `skills/init/lib/template-manifest.ts` (existente) | pronto |
| Lib `symlink-fallback.ts` (`linkClaudeToAgents` — 3-tier symlink/hardlink/copy+hook) | `skills/init/lib/symlink-fallback.ts` (existente) | pronto |
| Lib `install-gh-files.ts` (loop sobre 2 arquivos estaticos) | `skills/init/lib/install-gh-files.ts` (existente) | pronto |
| Assets estaticos `.github/workflows/harness.yml` + `.github/pull_request_template.md` | `skills/init/assets/static/.github/**` (existente) | pronto |
| Asset `.claude/CLAUDE.md.tpl` no harness-template (entrada anti-vibe-extension do manifest) | `skills/init/assets/templates/.claude/CLAUDE.md.tpl` (existente) | pronto |
| Tracer e2e verde (10 steps, exit 0) | Plano 01 fase-06 (`tests/e2e/init-v7-tracer-bullet.test.ts`) | pendente (Plano 01) |
| Contratos `Step`, `StepContext`, `StepReport` em `steps/types.ts` | `skills/init/lib/steps/types.ts` (existente) | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `05-scaffold-and-link.ts` REAL com summary contendo `placeholdersCreated`, `placeholdersSkipped`, `linkTier` | Plano 04 (Step 7 verifica que os destinos dos planos populate apontam para arquivos que existem no disco), Plano 05 (e2e final CA-01/CA-02/CA-08) |
| `06-install-gh-files.ts` REAL com summary contendo `ghFilesInstalled`, `ghFilesSkipped` | Plano 05 (e2e final valida que `.github/workflows/harness.yml` e `pull_request_template.md` foram criados — feeds CA-01) |
| `registry.ts` com 2 imports trocados (stubs → reais) | Plano 04 (Step 7 stub continua intocado), Plano 05 (registry final apos todos os planos) |
| Garantia de invariante CA-02 (`.claude/CLAUDE.md` byte-identico antes/depois) em fixture com arquivo preexistente | Plano 05 (e2e final usa essa garantia como pre-condicao para o teste de CA-02) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-step5-scaffold-and-link-real.md` | `skills/init/lib/steps/05-scaffold-and-link.ts` REAL que invoca `scaffoldFullTree` + `linkClaudeToAgents` sem dry-run; testes unit cobrem skip-if-exists, preservacao de `.claude/CLAUDE.md`, summary contendo `placeholdersCreated/Skipped/linkTier` | 1.5h | — (so depende do Plano 01 estar pronto) |
| 02 | `fase-02-step6-install-gh-files-real.md` | `skills/init/lib/steps/06-install-gh-files.ts` REAL que invoca `installGhFiles` adaptado com skip-if-exists; testes unit cobrem write-uma-vez + skip em re-run | 0.5h | — (independente de fase-01) |
| 03 | `fase-03-registry-wire-and-e2e.md` | `registry.ts` com 2 imports trocados (stub → real); e2e em fixture greenfield + fixture com `.claude/CLAUDE.md` preexistente valida CA-01 (placeholders criados), CA-02 (CLAUDE.md byte-identico, line-count invariante), CA-08 (re-run nao sobrescreve) | 1h | fase-01, fase-02 |

---

## Grafo de Fases

```
fase-01 (step5-scaffold-and-link)    fase-02 (step6-install-gh-files)
       \                              /
        \                            /
         +--------------------------+
                       |
                       v
              fase-03 (registry-wire + e2e CA-01/CA-02/CA-08)
```

**Paralelismo possivel:** fase-01 e fase-02 podem ser executadas em paralelo — nao
compartilham arquivos nem dependencias entre si. fase-03 e o merge — wire dos imports
no `registry.ts` + e2e cobrindo os criterios de aceite.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — Plano 01 fase-06 e o tracer global. O e2e da fase-03
deste plano expande o tracer com Steps 5-6 reais (verifica que apos `runInit([])` o disco
contem todos os 36 placeholders + mirror CLAUDE.md ↔ AGENTS.md + arquivos .github/, mas
nao reexecuta o tracer global — extende cobertura).

---

## Gotchas Conhecidos

- **G1 (D4 — sem dry-run no novo step):** O novo `05-scaffold-and-link.ts` NAO importa
  `dry-run-mode.ts`, NAO importa `dry-run.ts` (WriteRecorder/makeWriter), NAO passa
  `writeFile: writer` para `scaffoldFullTree`. Usa o writer default (escreve em disco).
  O mesmo vale para `06-install-gh-files.ts`. Confirmar via `grep -c "dry-run\|isDryRun\|makeWriter\|WriteRecorder" skills/init/lib/steps/05-scaffold-and-link.ts` retornando `0`. Diferenca direta do
  step antigo `01-scaffold-full-tree.ts` (linhas 10-11, 26-38, 50) e do `02-link-claude-agents.ts`
  (linhas 38-49) que tinham branches inteiras para dry-run / additive-merge.

- **G2 (CA-02 / D16 — `.claude/CLAUDE.md` NUNCA sobrescrito):** O ponto critico esta no
  comportamento do `TEMPLATE_MANIFEST` (linha 96 — entry `{src: '.claude/CLAUDE.md.tpl', dst: '.claude/CLAUDE.md'}`).
  `scaffoldFullTree` (linha 80) ja faz `if (await fileExists(dstPath)) { filesSkipped.push; return }`.
  Logo, se `.claude/CLAUDE.md` ja existe, a entry e skipada — invariante CA-02 ja vem de graca.
  ATENCAO: `linkClaudeToAgents` em `symlink-fallback.ts:24` faz `fs.rm(claudePath, { force: true })`
  mas `claudePath = path.join(targetDir, 'CLAUDE.md')` (raiz, nao `.claude/CLAUDE.md`). O step
  novo deve usar `linkClaudeToAgents` AS-IS — sem modificar — porque ele opera SOMENTE no
  CLAUDE.md raiz. Documentar isso em fase-01 + teste explicito.

- **G3 (CA-08 — skip-if-exists em TODO write):** `scaffoldFullTree` ja garante CA-08 via
  `fileExists` guard. `installGhFiles` (lib atual) NAO tem esse guard — sempre sobrescreve.
  fase-02 adapta o step novo para passar um writer custom com skip-if-exists, OU envolver
  o copy num try/access semelhante ao do scaffold. Decisao a tomar na fase-02 (DI candidata).

- **G4 (D17 — bugs CONVERSA_INIT):** Bug 1 (`alreadyMigrated && isLegacy`) e Bug 3 (PLAN.md
  com 4 fases rasas) somem com remocoes do Plano 01. Bug 2 (`scaffold-full-tree.ts:80`
  skip-if-exists sempre ativo) — a refatoracao v7 CONFIRMA o skip como feature (DR-1 + CA-08).
  Step 5 herda esse comportamento sem reescrever a lib.

- **G5 (RF-12 — 4 docs extras AVC):** O scaffold precisa criar os 4 docs extras AVC:
  `docs/MERGE_GATES.md`, `docs/CODE_STYLE.md`, `docs/STATE.md`, `.claude/CLAUDE.md`. Todos
  ja estao no `TEMPLATE_MANIFEST` (linhas 35, 43, 72, 96). fase-01 inclui asserts explicitos
  no teste de unit verificando que esses 4 paths apareceram em `filesWritten` (greenfield)
  ou `filesSkipped` (re-run/CLAUDE.md preexistente).

- **G6 (link-claude-agents quando `.claude/CLAUDE.md` NAO existe):** Por PRD Step 3 (linha 70):
  "Se `.claude/CLAUDE.md` nao existe: cria placeholder + inclui no plano AGENTS.md". O scaffold
  ja cria `.claude/CLAUDE.md` a partir do `.claude/CLAUDE.md.tpl` em greenfield (TEMPLATE_MANIFEST
  linha 96). O Step 5 NAO precisa de logica adicional aqui — o `linkClaudeToAgents` opera
  apenas no raiz CLAUDE.md ↔ AGENTS.md (e o scaffold sempre cria AGENTS.md raiz se nao existir,
  ver linha 95 do manifest). Apenas confirmar essa ordem (scaffold ANTES de link) — `scaffoldFullTree`
  cria AGENTS.md raiz; depois `linkClaudeToAgents` faz o link. O placeholder em `.claude/CLAUDE.md`
  fica intocado.

- **G7 (audit log — Observabilidade NFR):** PRD NFR linha 211 cita audit log com metricas
  `plansGenerated, stackPrimary, legacyArtifactsFound, docsSkipped`. Para Steps 5-6, as metricas
  uteis sao `placeholdersCreated`, `placeholdersSkipped`, `ghFilesInstalled`, `ghFilesSkipped`,
  `linkTier`. Decisao desta fase: emitir no `summary` do `StepReport` (multilinhas formato
  `Linha 1: X arquivos criados, Y skipados\nLinha 2: Linked via tier: Z`), sem dependencia
  do `audit-log` writer (que era usado pelo step antigo de secrets-scan e foi descontinuado
  no Plano 02 — ver DI-Plano02-fase02-audit-log-removido). Se um audit log centralizado for
  reintroduzido em PR futuro, Step 5 emite via `summary` que pode ser parseado pelo dispatcher.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->

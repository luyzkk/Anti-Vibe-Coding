# Plano 02: Step 3 (secrets-scan) + Step 4 (migrate-planning + manifest) + Shared Manifest Schema

**Feature:** init-refactor-v7 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4h
**Depende de:** Plano 01 (registry com 10 nomes — 8 stubs + Steps 1-2 reais; `StepContext.legacy?` / `stack?` opcionais, DV-4)
**Desbloqueia:** Plano 04 (Step 5 le `ctx.legacy` + manifest entries para popular Waves stack-aware), Plano 05 (e2e final valida manifest conforme DT-06 e CA-03/CA-05)

---

## O que este plano entrega

Substitui dois stubs do Plano 01 por logica real: Step 3 (`03-secrets-scan`) varrendo `.md`/`.mdx`
do projeto-alvo, e Step 4 (`04-migrate-planning-and-manifest`) movendo `.claude/planning/` →
`docs/specs/` e escrevendo `.claude/legacy-manifest.json` validado por schema Zod compartilhado.
Cria o contrato `skills/_shared/legacy-manifest-schema.ts` (DR-5) — writer (init) e reader
(execute-plan futuro) importam a mesma fonte e quebram tipados em divergencia.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Registry com 10 nomes (Steps 3-4 stubs) | Plano 01 fase-04 (`registry.ts`) | pendente (Plano 01) |
| `ctx.legacy` populado pelo Step 2 real | Plano 01 fase-02 (`02-detect-legacy-and-stack.ts`) | pendente (Plano 01) |
| `ctx.stack` populado pelo Step 2 real | Plano 01 fase-02 | pendente (Plano 01) |
| `StepContext` estendido com `legacy?` / `stack?` opcionais (DV-4) | Plano 01 fase-02 (`steps/types.ts`) | pendente (Plano 01) |
| Tracer e2e verde (10 steps, exit 0) | Plano 01 fase-06 (`tests/e2e/init-v7-tracer-bullet.test.ts`) | pendente (Plano 01) |
| Lib `migrate-planning.ts` reaproveitavel | `skills/init/lib/migrate-planning.ts` (existente) | pronto |
| Lib `secrets-scanner.ts` reaproveitavel | `skills/init/lib/secrets-scanner.ts` (existente) | pronto |
| `zod` adicionado a `dependencies` | A adicionar nesta fase-01 (DI desta fase, ver Gotchas G1) | pendente |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/_shared/legacy-manifest-schema.ts` (Zod + tipos) | Plano 04 (Step 5 le manifest para enriquecer Waves), Plano 05 (e2e valida com schema), `/execute-plan` futuro (reader) |
| `03-secrets-scan.ts` REAL (sem dry-run / sem noWrite) | Plano 05 fase-final (cobertura e2e — sucesso e falha de scan) |
| `04-migrate-planning-and-manifest.ts` REAL | Plano 04 (Step 5 le `.claude/legacy-manifest.json` ou `ctx.legacyManifest`), Plano 05 (CA-03, CA-05) |
| `docs/specs/` com conteudo migrado (em fixtures legacy) | Plano 05 (e2e CA-03) |
| `registry.ts` com 2 imports trocados (stub → real) | Plano 05 fase-final (e2e completo) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | `fase-01-shared-manifest-schema.md` | `skills/_shared/legacy-manifest-schema.ts` (Zod + tipos exportados) + testes de parse OK / fail | 1h | — (so depende do Plano 01 estar pronto) |
| 02 | `fase-02-step3-secrets-scan-real.md` | `skills/init/lib/steps/03-secrets-scan.ts` REAL portando logica de `06-secrets-scan.ts` sem dry-run/noWrite; testes portados | 1h | fase-01 (importa tipo `LegacyManifest`? — nao; mas mesma sessao de RED-GREEN-VERIFY) |
| 03 | `fase-03-step4-migrate-and-manifest.md` | `skills/init/lib/steps/04-migrate-planning-and-manifest.ts` REAL: move planning + escreve manifest validado | 1.5h | fase-01 (Zod schema), fase-02 (e2e de pipeline) |
| 04 | `fase-04-registry-wire-and-e2e.md` | `registry.ts` com 2 imports trocados (stub → real); e2e em fixture com legacy valida manifest conforme DT-06 (CA-03 + CA-05) | 0.5h | fase-02, fase-03 |

---

## Grafo de Fases

```
fase-01 (shared-manifest-schema)
    |
    +----------------+
    |                |
    v                v
fase-02         fase-03
(step3-secrets) (step4-migrate-and-manifest)
    |                |
    +-------+--------+
            |
            v
       fase-04 (registry-wire + e2e)
```

**Paralelismo possivel:** fase-02 e fase-03 podem ser executadas em paralelo apos fase-01
(secrets-scan nao depende do schema do manifest). fase-04 e o merge — registry e e2e juntos.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A — Plano 01 fase-06 e o tracer global. O e2e da fase-04
deste plano expande o tracer com Steps 3-4 reais (mas nao recompete o tracer global —
extende cobertura).

---

## Gotchas Conhecidos

- **G1 (zod nao instalado):** `package.json` atual nao tem `zod` em `dependencies` (confirmado
  via grep — apenas `gray-matter` + `js-yaml`). fase-01 adiciona `zod` a `dependencies`
  (`bun add zod`). Documentar como DI desta fase. Alternativa rejeitada: validacao manual TS —
  Zod e padrao para schema-cross-boundary e DR-5 do PLAN.md cita Zod explicitamente.

- **G2 (DV-4 — soft typing no Plano 02):** `ctx.legacy?` e `ctx.stack?` permanecem OPCIONAIS
  no tipo `StepContext` durante este plano. Steps 3-4 reais usam non-null assertion (`ctx.legacy!`)
  COM `// 2026-05-21 (Luiz/dev): DV-4 — legacy/stack garantidos pelo Step 2 (Plano 01 fase-02)`.
  Endurecer (remover `?`) so apos Plano 05 quando todos os 10 steps forem reais. Stubs do Plano 01
  que ainda nao foram substituidos (Steps 5-10 desta etapa) continuam funcionando sem mexer no tipo.

- **G3 (remocao do dry-run / noWrite — D4):** O `06-secrets-scan.ts` antigo tem branch `isDryRun(ctx)`
  e `noWrite` passado ao `writeDiscoveryArtifact`. O novo `03-secrets-scan.ts` REMOVE essas branches —
  sempre escreve. Sem `import { isDryRun } from '../dry-run-mode'`. Sem `flags['dry-run']`.
  Teste antigo `'flag --dry-run leva noWrite'` (linha 63-70 de `06-secrets-scan.test.ts`) NAO
  e portado — esse behavior e "obsoleto — D4" conforme AUDIT.md linha 5.

- **G4 (D6 — manifest em disco):** Manifest e escrito em `.claude/legacy-manifest.json` (caminho
  absoluto via `path.join(ctx.cwd, '.claude', 'legacy-manifest.json')`). Garantir que o diretorio
  `.claude/` exista antes do write (`mkdir -p`). Em projetos greenfield SEM `.claude/`, o Step 4
  cria o diretorio.

- **G5 (D8 — escopo da migracao):** Step 4 migra APENAS planning (`.claude/planning/` → `docs/specs/`).
  NUNCA migrar lessons-learned.md, decisions.md, knowledge/, rules/ — esses ficam como entry
  `reference-only` no manifest. O execute-plan le o manifest e usa como contexto via LLM.

- **G6 (D7 — progress.txt vira entry compound):** Se `.claude/progress.txt` existe, entry
  `type: 'compound'` com `action: 'reference-only'` no manifest. Step 4 NAO importa o conteudo.
  O step antigo `13-import-progress-txt.ts` sera deletado no Plano 01 fase-05 — confira AUDIT.md
  linha 4 ("recriado em Plano 02").

- **G7 (CA-02 — CLAUDE.md preservado SEMPRE):** Se `.claude/CLAUDE.md` existe, entry
  `type: 'claude-md'` com `action: 'preserved'` + `lines: <count>` no manifest. Step 4 NAO
  modifica o arquivo. Contar linhas com `content.split('\n').length` apos `readFile`.

- **G8 (idempotencia / re-run / R1):** Re-run do init ja e bloqueado pelo Step 1 (reentry-gate
  do Plano 01 fase-03 — DR-1). Step 4 NAO precisa checar idempotencia do manifest — se o gate
  passar, o manifest sera sobrescrito. Mas o move de `.claude/planning/` reusa `migrate-planning.ts`
  cuja idempotencia ja esta coberta (skip se destino existe com mesmo conteudo).

- **G9 (writeDiscoveryArtifact vs manifest direto):** O `06-secrets-scan.ts` antigo usa
  `writeDiscoveryArtifact` (vai para `.claude/.anti-vibe/discovery/`). O novo `03-secrets-scan.ts`
  MANTEM esse mecanismo (testes verificam via `readDiscoveryArtifact`). MAS o manifest do Step 4
  vai DIRETO em `.claude/legacy-manifest.json` (raiz de `.claude/`, nao em `.anti-vibe/discovery/`).
  Sao dois lugares diferentes — nao confundir.

- **G10 (schemaVersion + ISO timestamp):** Schema do PRD DT-06 exige `schemaVersion: "1.0"` (literal,
  Zod `z.literal('1.0')`) e `detectedAt` em ISO 8601 (`new Date().toISOString()`). Zod valida ambos
  no parse — testes da fase-01 cobrem rejeicao de schemaVersion errado.

- **G11 (testes do `06-secrets-scan.test.ts` que NAO portam):** O teste de registry
  (`'registry: secretsScanStep apos reuseDiscoveryStep, antes de migrate0ParseDryRunStep'`,
  linha 54-61) referencia steps deletados — NAO portar. Substituir por teste novo:
  `'registry: 03-secrets-scan apos 02-detect-legacy-and-stack, antes de 04-migrate-planning-and-manifest'`.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->

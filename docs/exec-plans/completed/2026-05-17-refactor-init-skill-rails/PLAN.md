# Plan: Refatoracao Rails-style do SKILL.md do /anti-vibe-coding:init

**PRD:** ./PRD.md
**Planos:** 4 planos, 21 fases total
**Created:** 2026-05-17

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Foundation + Tracer Bullet | 4 | ~6h | — |
| 02 | Steps puros (nao-interativos, sem gates) | 6 | ~10h | Plano 01 |
| 03 | Gates de abortagem + steps interativos | 6 | ~10h | Plano 01 |
| 04 | Extracao de rationale + Akita + Cutover | 5 | ~7h | Plano 02, Plano 03 |

---

## Grafo de Dependencias

```
Plano 01 (Foundation + Tracer)
    |
    v
Plano 02 (Steps puros)     Plano 03 (Gates + interativos)
    |                              |
    +-------------- + -------------+
                    |
                    v
            Plano 04 (Cutover)
```

**Paralelismo possivel:** Planos 02 e 03 podem ser executados em paralelo apos Plano 01 (Foundation) entregar a interface `Step` estavel, o dispatcher esqueleto e o tracer rodando. Cada plano toca um subconjunto disjunto de steps do init. Dentro do Plano 02, fases 04 e 05 podem rodar em paralelo apos fase-03 (custom + GH files sao independentes). Dentro do Plano 03, fases 03 e 04 podem rodar em paralelo (lessons e ADRs sao migracoes desacopladas).

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-03-tracer-detect-legacy
**Descricao:** Portar o `Step 0.5 detect-v5-legacy` (read-only, autossuficiente) para `skills/init/lib/steps/00-detect-legacy.ts` implementando a interface `Step`, registrar no registry, e invocar via dispatcher (`bun run skills/init/lib/run-init.ts --only=detect-legacy`). Prova ponta-a-ponta que tipos + AbortError + dispatcher + step modular + console.log byte-identico funcionam, ANTES de portar qualquer step com side-effects. Golden test compara stdout/exit do dispatcher contra o bloco inline atual do SKILL.md (linhas 16-36).

---

## Resumo por Plano

### Plano 01: Foundation + Tracer Bullet
> Cria a infraestrutura compartilhada (interface `Step`, `AbortError`, dispatcher esqueleto, registry) e prova end-to-end com um step read-only (detect-legacy). Sem cutover do SKILL.md — o inline atual permanece intocado. Entrega: dispatcher rodavel standalone + 1 step portado + golden test verde.

Fases:
- fase-01-interface-and-abort-error: tipos `Step`/`StepReport`/`StepContext`, `AbortError`, testes de tipos (~1h)
- fase-02-dispatcher-skeleton: `lib/run-init.ts` com parse-flags, iteracao do registry, captura de AbortError, sem steps ainda (~1.5h)
- fase-03-tracer-detect-legacy: portar Step 0.5 → `lib/steps/00-detect-legacy.ts`, registry com 1 entrada, golden test byte-identico (~2h)
- fase-04-windows-di06-centralization: centralizar workaround DI-06/GT-04 (await import) no dispatcher, teste com fixture Windows-like (~1.5h)

### Plano 02: Steps puros (nao-interativos, sem gates)
> Porta os 8 steps que sao puros (sem perguntar ao usuario, sem AbortError gating): Step 1 scaffold-full-tree, Step 2 link-claude-agents (Tier 1/2/3), Step 3 detect-stack, Step 3.1 persist-stack-and-knowledge, Step 4 customize-architecture, Step 5 install-gh-files, Step migrate.5 final-validation, Step reuse-discovery.0 parse-flag. Cada step vira `lib/steps/NN-{slug}.ts` com golden test.

Fases:
- fase-01-step-1-scaffold-full-tree: portar Step 1 (scaffoldFullTree + scaffoldTemplates + state-md-init + scaffoldTodoMd) (~1.5h)
- fase-02-step-2-link-claude-agents: portar Step 2 (3 tiers: symlink, junction, copy+hook) (~2h)
- fase-03-step-3-and-3-1-stack: portar Step 3 (detect-stack + state register) + Step 3.1 (write-stack-json + copy-knowledge + format-knowledge-preview) (~2h)
- fase-04-step-4-customize-architecture: portar Step 4 (customizeArchitecture com detected stack) (~1h)
- fase-05-step-5-install-gh: portar Step 5 (installGhFiles always-on) (~1h)
- fase-06-reuse-discovery-and-migrate-5: portar Step reuse-discovery.0 (parse-refresh-flag) + Step migrate.5 (harness-validate) (~1.5h)

### Plano 03: Gates de abortagem + steps interativos
> Porta os steps que exigem tratamento especial: gates de abortagem (migrate.1 backup, migrate.2 conflicts), steps interativos (Step 6 Delivery Loop opt-in) e steps com soft-fail (Step 7 Capabilities Discovery). Estende o dispatcher com o contrato `{ status: 'needs-user', prompt, options }` (PRD D3) para steps interativos. Steps de migrate consolidados via `migrate.all` (orchestrator).

Fases:
- fase-01-abort-error-catch-flow: estender dispatcher para capturar AbortError com mensagem de gate, codigos de exit preservados, golden tests de aborto (~1.5h)
- fase-02-migrate-1-backup-gate: portar Step migrate.1 (backupPlanning) com AbortError em falha de backup (PRD CA-07) (~1.5h)
- fase-03-migrate-2-convert-planning: portar Step migrate.2 (migratePlanning), tratamento de conflitos com AbortError (~2h)
- fase-04-migrate-3-and-4-lessons-decisions: portar Step migrate.3 (lessons) + migrate.4 (decisions/ADRs) em paralelo (~1.5h)
- fase-05-migrate-0-and-all-dry-run: portar Step migrate.0 (parse --dry-run) + Step migrate.all (orchestrateMigration) com dry-run preservado (PRD CA-03) (~2h)
- fase-06-steps-6-and-7-interactive-soft-fail: portar Step 6 (Delivery Loop opt-in com contrato `needs-user`) + Step 7 (Capabilities Discovery com soft-fail preservado, PRD CA-05/CA-06) (~1.5h)

### Plano 04: Extracao de rationale + Akita + Cutover
> Extrai os artefatos textuais (rationale extenso e apendice Akita) para arquivos dedicados, reescreve SKILL.md como manifest declarativo ≤200 linhas (PRD CA-09), valida byte-idempotencia via testes E2E (PRD CA-01/CA-02), executa cutover big-bang. Apos esta fase: `/anti-vibe-coding:init` roda pelo dispatcher, SKILL.md so declara, helpers continuam intactos.

Fases:
- fase-01-extract-rationale: criar `docs/design-docs/init-rationale.md` indexado por DI-XX/GT-XX/CA-XX/gates (PRD SH-01), grep cross-reference garantindo IDs nao orfaos (~1.5h)
- fase-02-extract-akita-snippets: criar `skills/init/assets/snippets/akita-{code-style,comments,tests,dependencies,logging}.md` a partir do apendice atual (PRD SH-02) (~1h)
- fase-03-rewrite-skill-md-manifest: reescrever SKILL.md como manifest (intent header + tabela de steps id/order/when/helper/args + referencias a init-rationale.md e snippets/), validar `wc -l ≤200` (PRD MH-01, CA-09) (~2h)
- fase-04-e2e-byte-idempotence-tests: testes E2E com fixtures greenfield + legacy-v5 comparando stdout/exit/arquivos gerados byte-a-byte vs comportamento atual (PRD CA-01, CA-02, SH-03) (~1.5h)
- fase-05-final-validation-and-cleanup: rodar `bun run test && bun run lint && bun run harness:validate`, validar CA-09/CA-10, remover blocos JS inline antigos do SKILL.md, atualizar MEMORY.md de cada plano (~1h)

---

## Risks

- **R1 (PRD-R3): Wording de `console.log` divergir e quebrar parsing humano/scripts** (baixa, medio)
  - Mitigacao: Plano 04 fase-04 testa stdout linha-a-linha via fixtures greenfield + legacy. Cada step module copia wording EXATO do bloco inline.
- **R2 (PRD-R2): Steps interativos quebrarem por novo contrato `{ status: 'needs-user' }`** (media, alto)
  - Mitigacao: Plano 03 fase-06 implementa explicitamente o Step 6 com teste de contrato. Dispatcher capta o retorno e delega para AskUserQuestion via wrapper.
- **R3 (PRD-R4): Compatibilidade Windows quebrar (centralizacao do DI-06/GT-04)** (media, alto)
  - Mitigacao: Plano 01 fase-04 centraliza o workaround `await import` no dispatcher e roda fixture Windows-like. Cada step usa o helper centralizado.
- **R4 (PRD-R1): Regressao funcional em step especifico (gate de migrate.2, soft-fail Step 7)** (media, alto)
  - Mitigacao: Plano 04 fase-04 com fixtures greenfield + legacy + edge cases (CA-07 backup-fail, CA-06 capabilities-soft-fail). Plano 03 fase-01 cobre AbortError flow.
- **R5 (PRD-R6): Cutover big-bang criar periodo de instabilidade** (media, medio)
  - Mitigacao: Cutover esta no Plano 04 fase-03, APOS Plano 02/03 com testes verdes. Plano 01 fase-03 (tracer) ja provou arquitetura ponta-a-ponta. Rollback = `git revert` da fase-03 (SKILL.md inalterado ate la).
- **R6 (PRD-R5): Rationale extraido perder traçabilidade (IDs orfaos)** (baixa, medio)
  - Mitigacao: Plano 04 fase-01 inclui grep cross-reference: cada ID em init-rationale.md aparece >=1× em algum step module ou no SKILL.md novo.
- **R7 (PRD-R7): Escopo crescer durante implementacao (refatorar helpers junto)** (alta, medio)
  - Mitigacao: PRD tem "Won't Have" explicito. Cada plano tem checklist de escopo proibido. Refatoracao de helper detectada vira backlog/PRD novo.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (Manifest + dispatcher Rails-style) | Plano 01 (todas), Plano 04 fase-03 |
| D2 (Interface `Step` em `skills/init/lib/steps/types.ts`) | Plano 01 fase-01 |
| D3 (Steps interativos retornam `{ status: 'needs-user' }`) | Plano 03 fase-06 |
| D4 (Gates via `throw AbortError(reason)`) | Plano 01 fase-01 (definicao), Plano 03 fase-01 (catch), Plano 03 fase-02/03 (uso) |
| D5 (Rationale em `docs/design-docs/init-rationale.md`) | Plano 04 fase-01 |
| D6 (Akita em `skills/init/assets/snippets/akita-*.md`) | Plano 04 fase-02 |
| D7 (Cutover big-bang) | Plano 04 fase-03 |

---

<!-- Gerado por /plan-feature em 2026-05-17 -->

# Plan: Refatoracao /init — Populate Plan + Invert CLAUDE.md Merge + Adapt Existing Docs

**PRD:** ./PRD.md
**CONTEXT:** ./CONTEXT.md (30 decisoes)
**Planos:** 7 planos, ~37 fases total
**Target version:** v6.4.0 (minor)
**Created:** 2026-05-18

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Fundacao + Discovery do execute-plan | 3 | ~2.5h | — |
| 02 | Tracer Bullet — Populate Plan Generator | 4 | ~2.5h | Plano 01 |
| 03 | Discovery Pipeline (secrets + docs + classifier) | 6 | ~3.5h | Plano 01 |
| 04 | Merge Invertido Destrutivo | 7 | ~4.5h | Plano 03 |
| 05 | Modos Reversiveis (dry-run + rollback + drift + additive) | 6 | ~4h | Plano 04 |
| 06 | Comunicacao + Observabilidade | 5 | ~2h | Plano 05 |
| 07 | Aceitacao E2E + Release v6.4.0 | 6 | ~3.5h | Plano 02, 06 |

---

## Grafo de Dependencias

```
Plano 01 (Fundacao)
   |
   +-----------------+
   |                 |
   v                 v
Plano 02 (Tracer)   Plano 03 (Discovery)
   |                    |
   |                    v
   |              Plano 04 (Destrutivo)
   |                    |
   |                    v
   |              Plano 05 (Modos)
   |                    |
   |                    v
   |              Plano 06 (Comunicacao)
   |                    |
   +--------+-----------+
            |
            v
      Plano 07 (Release v6.4.0)
```

**Paralelismo possivel:**
- Plano 02 e Plano 03 podem rodar em paralelo apos Plano 01 (sem deps cruzadas).
- Plano 06 pode comecar quando Plano 05 fase-04 (additive-merge) estiver concluido — nao precisa esperar fase-06 inteira.

---

## Tracer Bullet

**Plano:** 02
**Fase:** fase-04-greenfield-e2e-populate-plan
**Descricao:** `/init` em repo greenfield (sem CLAUDE.md, sem docs/) executa scaffold + final-validation, e ao final emite `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com no minimo 1 task por arquivo do harness. Sem merge, sem discovery, sem secrets-scan. Prova end-to-end que Step 91 + integracao com registry funcionam. Atende MH-01, MH-02, CA-01.

**Por que e o slice mais fino:** Conecta dispatcher → registry → novo Step 91 → populate-plan-generator → escrita em disco. Sem qualquer ramo dos cenarios complexos (merge invertido, classificacao, drift). Se este slice funciona, a arquitetura aditiva ao registry esta validada e os planos seguintes apenas adicionam logica em ramos especificos.

---

## Resumo por Plano

### Plano 01: Fundacao + Discovery do execute-plan
> Audita compatibilidade do execute-plan com wave-based paralelo + glossario compartilhado (D25 — fase 0 obrigatoria). Cria helpers base de backup com manifest. Adiciona flag `--rollback` ao dispatcher como early-return stub.

Fases:
- fase-01-discovery-execute-plan: audita `skills/execute-plan/SKILL.md` + `lib/` para wave-based + glossario; abre PRD paralelo se faltar capacidade (D25).
- fase-02-backup-anti-vibe-helper: cria `lib/backup-anti-vibe.ts` (write/read + manifest schema `{ timestamp, files[], gitSha }`) com testes (D9, D29, SH-12).
- fase-03-rollback-stub-dispatcher: adiciona early-return em `runInit` para `--rollback` flag, cria `lib/rollback.ts` stub (impl em Plano 05); registry imutavel (D24, D21).

### Plano 02: Tracer Bullet — Populate Plan Generator
> Implementa Step 91 `generate-populate-plan` (greenfield-only inicialmente). Emite `docs/exec-plans/active/{date}-populate-harness/PLAN.md` apos `final-validation` em todos os 4 modos. Tracer bullet completo end-to-end.

Fases:
- fase-01-snippets-populate-plan-template: cria `assets/snippets/populate-plan-template.md` (template do PLAN.md de populacao com tasks paralelizaveis por arquivo do harness, MH-02).
- fase-02-populate-plan-generator-lib: `lib/populate-plan-generator.ts` — emite PLAN.md com tasks + glossario compartilhado opcional (CH-03).
- fase-03-step-91-generate-populate-plan: novo step com id 91 implementando contrato `Step{id, run}`; registry coloca apos `finalValidationStep` (MH-01).
- fase-04-greenfield-e2e-populate-plan: fixture greenfield + teste E2E validando que apos `/init`, PLAN.md de populacao existe com >=1 task por arquivo harness (CA-01).

### Plano 03: Discovery Pipeline (secrets + docs + classifier)
> Steps 06, 07 e 08: varredura de secrets via regex, glob recursivo whitelisted de docs existentes, e classificacao hibrida (heuristica + LLM) em categorias harness. Read-only — nao mutam disco.

Fases:
- fase-01-secrets-scanner-lib: `lib/secrets-scanner.ts` com regex (AKIA*, sk_live_, postgres://, emails, JWT). Tests com fixtures (SH-01).
- fase-02-step-06-secrets-scan: integra scanner no registry. Match → bloqueia arquivo especifico (nao init inteiro). (CA-04)
- fase-03-discover-existing-docs-lib: `lib/discover-existing-docs.ts` — glob recursivo raiz + `/docs/` + `.claude/`, whitelist `.md/.mdx`, blacklist `node_modules/dist/build`. (SH-02, D5)
- fase-04-step-07-discover-existing-docs: integra discovery no registry; emite lista de candidatos para classificacao.
- fase-05-blocks-classifier-lib: `lib/blocks-classifier.ts` com heuristica regex + prompt template para LLM refinement; orphan → `docs/references/` (SH-03, SH-04, D11).
- fase-06-step-08-classify-blocks-hybrid: integra classifier no registry; emite mapeamento `{arquivo: categoria}`.

### Plano 04: Merge Invertido Destrutivo
> Steps 09, 10 e 11: aprovacao em batch via `needsUser`, backup + transformacao destrutiva do CLAUDE.md, move com stub + rewrite de links. Inclui registry reorder e reescrita da regra "merge aditivo" no SKILL.md.

Fases:
- fase-01-design-md-skeleton-snippet: `assets/snippets/design-md-skeleton.md` agregando 5 snippets Akita via includes (D22, SH-08).
- fase-02-step-09-propose-merge-batch: usa `needsUser` para diff agregado de transformacoes; CH-02 "ver diff por arquivo" como follow-up (MH-04, D4).
- fase-03-step-10-apply-merge-destructive: cria backup em `.anti-vibe/backup/{ts}/`, transforma CLAUDE.md em espelho <=40 linhas, extrai Akita para `docs/DESIGN.md` (MH-03, CA-02).
- fase-04-doc-mover-stub-lib: `lib/doc-mover-stub.ts` — move arquivo, escreve stub redirect, grep+rewrite links internos em todos os .md, loga URLs externas (D12).
- fase-05-step-11-move-docs-with-stub: integra mover no registry; README.md guard (skip explicito + assert no test) (MH-05, MH-08, CA-03, CA-08).
- fase-06-registry-reorder-10-antes-02: muda registry para `apply-merge-destructive` antes de `link-claude-agents`; ajusta testes do Step 02 que dependem dessa ordem (D23).
- fase-07-skill-md-rule-rewrite: substitui regra "merge ADITIVO" por "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel" no SKILL.md (D26, D28).

### Plano 05: Modos Reversiveis (dry-run + rollback + drift + additive)
> Cobertura completa dos modos `--dry-run`, `--rollback`, `--additive-merge` e detect-drift incremental. Garante reversibilidade de todas as mutacoes destrutivas do Plano 04.

Fases:
- fase-01-dry-run-global-wiring: `--dry-run` cobre todos os novos steps (06-11, 91) com `mutated: false`; preview agregado via console em vez de `needsUser` (MH-06).
- fase-02-dry-run-renderer-preview: renderer compartilhado para preview agregado de Step 09 (reutilizado em `--dry-run` e `needsUser`) (CA-07, CA-13).
- fase-03-drift-detector-step-12: `lib/drift-detector.ts` (checksum diff vs manifest existente) + Step 12 `detect-drift-incremental` (apenas modo `already-initiated`) marca PLACEHOLDER/POPULATED/DRIFT (SH-05, CA-05).
- fase-04-rollback-completo: implementa `lib/rollback.ts` — le `.anti-vibe/backup/{latest}/manifest.json`, valida checksums, restaura, escreve ADR `docs/design-docs/ADR-NNNN-rollback-init-{date}.md` (MH-07, CA-06, CA-10).
- fase-05-additive-merge-opt-in: flag `--additive-merge` preserva comportamento v6.3.x (skip Steps 09/10 destrutivos, aplica merge aditivo legado) (SH-09).
- fase-06-rollback-adr-template-snippet: `assets/snippets/rollback-adr-template.md` consumido pela fase-04.

### Plano 06: Comunicacao + Observabilidade
> Audit log padronizado em todos os novos steps, warning runtime cross-upgrade, ADR + CHANGELOG documentando breaking-comportamental.

Fases:
- fase-01-audit-log-canonico-novos-steps: cada Step 06/07/08/09/10/11/12/91 + rollback emite entry com `subagent_id` canonico (`init-secrets-scan`, `init-classify-blocks`, etc.), `input_paths`, `output_struct`, `duration_ms`, `retry_count` (SH-07, CA-14).
- fase-02-warning-runtime-cross-upgrade: detector compara `pluginVersion` no manifest local vs plugin atual; v6.3.x → v6.4.x + CLAUDE.md >40 linhas → warning amarelo (SH-10, D30).
- fase-03-adr-destructive-merge-default: cria `docs/design-docs/ADR-NNNN-destructive-merge-default.md` documentando racional de mudanca breaking-comportamental (SH-11).
- fase-04-changelog-v640-breaking-changes: atualiza `CHANGELOG.md` com secao v6.4.0 "Breaking Changes (Behavior)" + features adicionadas + bug fixes (SH-11).
- fase-05-init-rationale-atualizado: atualiza `docs/design-docs/init-rationale.md` com decisoes D1-D30 deste PRD (Dependencias do PRD).

### Plano 07: Aceitacao E2E + Release v6.4.0
> Suite completa de aceitacao (15 CAs) com fixtures, performance test, bump version e harness:validate green.

Fases:
- fase-01-fixture-greenfield-v64: cria `tests/fixtures/greenfield-v6.4/` (repo vazio com .gitignore minimo).
- fase-02-fixture-inverted-merge-v64: cria `tests/fixtures/inverted-merge-v6.4/` (CLAUDE.md de 287 linhas com regras Akita + 4 docs estruturais).
- fase-03-ca12-e2e-greenfield: teste E2E que roda init → execute-plan consumindo PLAN.md de populacao → harness:validate, todos exit 0, AGENTS.md final <=40 linhas com conteudo (CA-12).
- fase-04-ca13-dry-run-parity: teste compara dry-run output (Step 09) vs manifest real apos run; falha se divergir (CA-13).
- fase-05-ca15-performance-test: 500 .md em 3 dirs, init --dry-run < 120s via `performance.now()` (CA-15).
- fase-06-bump-version-v640: bump `package.json` 6.3.2 → 6.4.0; roda `bun run harness:validate && bun run compound:check`; tag git.

---

## Risks

| Risco | Mitigacao | Plano |
|-------|-----------|-------|
| `/execute-plan` nao suporta wave-based paralelo com glossario | Plano 01 fase-01 audita ANTES de implementar; se faltar, abre PRD paralelo (D25). | 01 |
| Classificacao hibrida (D8) categoriza bloco critico errado | Diff visual em batch via `needsUser` + rollback + CH-02 "ver diff por arquivo". | 03, 04 |
| PLAN.md de populacao gera AGENTS.md >40 linhas | SH-06 valida automatico no fim; SH-08 extrai Akita para DESIGN.md. | 02, 04 |
| Subagents paralelos produzem terminologia divergente | CH-03 glossario compartilhado injetado no prompt de cada subagent. | 02 |
| `--dry-run` divergir do comportamento real | CA-13 dry-run parity test em CI; renderer compartilhado em vez de dois codepaths. | 05, 07 |
| Quebra do contrato `Step` ao adicionar `needsUser` nos novos steps | Contrato ja suporta (introduzido no PRD anterior); cada novo step tem teste pareado. | 03, 04 |
| Registry reorder (D23) quebra testes existentes do Step 02 | Plano 04 fase-06 ajusta testes pareados; fixture validation em Plano 07. | 04 |
| Backup `.anti-vibe/backup/` cresce indefinidamente | Documentar limpeza manual; `--prune-backups` no backlog v6.5+. | 01 |
| Scan regex (SH-01) falso positivo em fixtures de teste | Override via "Aprovar exceto secrets" — bloqueia move por arquivo, nao init inteiro. | 03 |
| Stub redirect (D12) duplica arquivos no git history | Aceitavel; documentar no resumo final que dev pode `git rm` o stub depois. | 04 |

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D1 (4 modos do /init) | Plano 02 fase-03 (greenfield), Plano 05 fase-03 (already-initiated drift) |
| D2 (destrutivo + backup) | Plano 04 fase-03 (apply-merge-destructive) |
| D3 (sugestao, nao executa) | Plano 02 fase-03 (Step 91 emite PLAN.md, nao roda /execute-plan) |
| D4 (batch agregado) | Plano 04 fase-02 (propose-merge-batch via needsUser) |
| D5 (raiz + /docs/ + .claude/) | Plano 03 fase-03 (discover-existing-docs) |
| D6 (README intocavel) | Plano 04 fase-05 (README guard + CA-08 assert) |
| D7 (drift incremental) | Plano 05 fase-03 (detect-drift Step 12) |
| D8 (hibrido heuristica+LLM) | Plano 03 fase-05 (blocks-classifier) |
| D9 (`.anti-vibe/backup/{ts}/`) | Plano 01 fase-02 (backup helper) |
| D10 (--rollback dedicado) | Plano 01 fase-03 (stub), Plano 05 fase-04 (impl) |
| D11 (orfaos → references) | Plano 03 fase-05 (classifier fallback) |
| D12 (stub + rewrite) | Plano 04 fase-04 (doc-mover-stub) |
| D13 (subagents paralelos) | Plano 02 fase-02 (populate-plan-generator emite tasks paralelas) |
| D14 (filosoficos nao populam) | Plano 02 fase-02 (excluir COMPOUND_ENGINEERING/PRODUCT_SENSE) |
| D15 (validate automatico no fim) | Plano 02 fase-01 (template inclui ultima task `harness:validate`) |
| D16 (secrets-scan) | Plano 03 fase-01/02 (secrets-scanner + Step 06) |
| D17 (Akita → DESIGN.md) | Plano 04 fase-01 (design-md-skeleton) + fase-03 (apply-merge extrai) |
| D18 (--dry-run global) | Plano 05 fase-01/02 (wiring + renderer) |
| D19 (audit log completo) | Plano 06 fase-01 (subagent_id canonico em todos novos steps) |
| D20 (v6.4.0 minor) | Plano 07 fase-06 (bump version) |
| D21 (dispatcher imutavel) | Plano 01 fase-03 (early-return early) |
| D22 (skeleton agrega snippets) | Plano 04 fase-01 (design-md-skeleton via includes) |
| D23 (Step 10 antes Step 02) | Plano 04 fase-06 (registry reorder) |
| D24 (rollback como flag) | Plano 01 fase-03 + Plano 05 fase-04 |
| D25 (verificar execute-plan) | Plano 01 fase-01 (auditoria obrigatoria) |
| D26 + D28 (merge aditivo → "nunca sem aprovacao") | Plano 04 fase-07 (SKILL.md rewrite) |
| D27 (4 CAs adicionais) | Plano 07 fases 03/04/05 (CA-12/13/14/15) |
| D29 (manifest schema canonico) | Plano 01 fase-02 (backup helper schema) |
| D30 (warning runtime + ADR + CHANGELOG) | Plano 06 fases 02/03/04 |

---

## Compatibilidade Reverse / Rollout

- **Versao:** v6.4.0 (minor, aditiva ao /init).
- **Breaking-comportamental:** default muda de aditivo → destrutivo. Opt-in conservador via `--additive-merge` (SH-09).
- **Comunicacao:** ADR + CHANGELOG + warning runtime cross-upgrade (D30, SH-10/11).
- **Rollback de campo:** `/anti-vibe-coding:init --rollback` restaura backup com checksums (MH-07, CA-10).

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

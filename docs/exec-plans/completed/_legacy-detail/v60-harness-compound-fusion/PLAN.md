# Plan: Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion

**PRD:** ./PRD.md
**Planos:** 9 planos, 55 fases total, ~87h estimadas
**Created:** 2026-05-11

---

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | Tracer Bullet — Minimal `/init` + Validator E2E | 5 | ~7h | — |
| 02 | Full Scaffold (14+ docs + GH Actions + Delivery Loop + Stack Detection) | 6 | ~10h | Plano 01 |
| 03 | Migration v5→v6 (.planning/ → docs/, backup, dry-run) | 7 | ~12.5h | Plano 02 |
| 04 | Validators Full (compound-check + advanced rules + perf bench) | 5 | ~7h | Plano 02 |
| 05 | Skill Migration + Hooks (6 skills + pre-mutation-gate + Compound Gate) | 8 | ~13.5h | Plano 02 |
| 06 | Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal) | 7 | ~12h | Plano 05 |
| 07 | TODO.md + /todo-pick | 4 | ~5h | Plano 06 |
| 08 | Dog-Fooding (POR ÚLTIMO — R4) | 8 | ~14.5h | 03, 04, 05, 06, 07 |
| 09 | Versioning & Release (5.3.0 → 6.0.0) | 5 | ~6h | Plano 08 |

---

## Grafo de Dependencias

```
Plano 01 (Tracer Bullet)
    │
    v
Plano 02 (Full Scaffold)
    │
    ├──> Plano 03 (Migration v5→v6)  ──────────┐
    ├──> Plano 04 (Validators Full) ───────────┤
    └──> Plano 05 (Skills + Hooks)             │
              │                                │
              v                                │
         Plano 06 (Agent-Native)               │
              │                                │
              v                                │
         Plano 07 (TODO.md)                    │
                                               │
   ───────────────────────────────────────────-+
                       │
                       v
                Plano 08 (Dog-Fooding) ← POR ÚLTIMO
                       │
                       v
                Plano 09 (Release)
```

**Paralelismo possivel:**
- Após Plano 02 done: **Planos 03 + 04 + 05 rodam paralelos** (subagentes independentes, sem conflito de paths em docs/)
- Plano 06 serial após Plano 05 (Agent-Native modifica skills já migradas)
- Plano 07 serial após Plano 06 (todo-pick usa helper de Plano 06)
- **Plano 08 (dog-food) é serial e POR ÚLTIMO** (mitigação R4 — não bloqueia desenvolvimento se algo quebrar)
- Plano 09 serial após Plano 08 (release valida dog-food)

---

## Tracer Bullet

**Plano:** 01
**Fase:** fase-05-e2e-test
**Descricao:** Fixture vazia → `/init` cria AGENTS.md (≤40 linhas em EN) + ARCHITECTURE.md + symlink CLAUDE.md (com fallback 3-tier ln→mklink→copy+hook) → `bun run harness:validate` retorna exit 0. Prova as decisões estruturais críticas (D2 idioma, D13 TS+bun, D16 symlink) end-to-end antes de qualquer trabalho de volume.

---

## Resumo por Plano

### Plano 01: Tracer Bullet — Minimal `/init` + Validator E2E
> Fatia mais fina possível que prova arquitetura end-to-end. Após este plano, sabemos que: templates em EN funcionam, symlink fallback funciona em Windows, validator TS+bun existe e roda, fixture E2E passa. Base de confiança para os 8 planos seguintes.

Fases:
- fase-01-templates-base: criar templates mínimos AGENTS.md + ARCHITECTURE.md em EN (~1.5h)
- fase-02-init-skeleton: skill /init que copia templates para projeto vazio (~2h)
- fase-03-symlink-fallback: implementar 3-tier (ln -s → mklink /H → copy+hook PostToolUse) (~1.5h)
- fase-04-validator-minimal: harness-validate.ts com checks essenciais (arquivos existem, AGENTS≤40 linhas) (~1h)
- fase-05-e2e-test: fixture vazia → /init → harness-validate exit 0 (~1h)

### Plano 02: Full Scaffold
> Expande Plano 01 para todos os 14+ docs do harness do André, customização com framework real, GH Actions, Delivery Loop opcional e detecção de stack. Após este plano, `/init` está completo para projetos novos.

Fases:
- fase-01-todos-os-docs-template: templates de DESIGN/FRONTEND/PLANS/PRODUCT_SENSE/QUALITY_SCORE/RELIABILITY/SECURITY/COMPOUND_ENGINEERING + design-docs/ + exec-plans/ + review-checklists/ + smoke-flows/ + product-specs/ + references/ + generated/ (~3h)
- fase-02-init-full-scaffold: /init expande para criar tudo (~2h)
- fase-03-customizacao-arquitetura: /init customiza ARCHITECTURE.md com framework detectado (~1.5h)
- fase-04-gh-actions-pr-template: copy .github/workflows/harness.yml + PR template (D14 sempre instalado) (~1h)
- fase-05-delivery-loop-opcional: pergunta Linear, injeta seção opcional em AGENTS.md (D12) (~1h)
- fase-06-stack-detection: heurística (package.json/Gemfile/composer.json) registra em ARCHITECTURE.md + STATE.md (CA-07, CA-08, CA-19, CA-20, CA-21) (~1.5h)

### Plano 03: Migration v5→v6
> `/init` detecta estrutura v5.x e oferece migração idempotente com backup automático. Converte .planning/CONTEXT-*.md → docs/exec-plans/active/, .planning/{date-slug}/PRD.md → docs/product-specs/, lessons-learned.md → docs/compound/*.md individuais, decisions.md → docs/design-docs/ADR-*.md. Inclui dry-run mode.

Fases:
- fase-01-detector-v5: /init detecta presença de .planning/, lessons-learned.md, decisions.md (~1h)
- fase-02-backup-idempotente: criar .planning.v5-backup/ atomicamente (~1.5h)
- fase-03-migrate-planning-to-exec-plans: converter CONTEXT/PRD/PLAN para docs/exec-plans/ + docs/product-specs/ (~3h)
- fase-04-migrate-lessons-para-compound: dividir lessons-learned.md em arquivos individuais com frontmatter (~2h)
- fase-05-migrate-decisions-para-adrs: decisions.md → docs/design-docs/ADR-NNNN-*.md (~1.5h)
- fase-06-dry-run-mode: --dry-run flag mostra diff sem aplicar (CA-10) (~1.5h)
- fase-07-e2e-migration-test: fixture legacy-v5 → /init migrate → validar estado v6 (CA-09) (~2h)

### Plano 04: Validators Full
> Estende harness-validate.ts (Plano 01) com checks avançados e adiciona compound-check.ts. Performance alvo <2s em 100 docs. Validação de planos órfãos, links quebrados, frontmatter de compound notes.

Fases:
- fase-01-compound-check-skeleton: scripts/compound-check.ts básico (~1.5h)
- fase-02-compound-frontmatter-validator: valida YAML frontmatter (title/category/tags/created) + seções Problem/Solution/Prevention (CA-29) (~1.5h)
- fase-03-harness-validate-advanced: detecta planos órfãos em active/, links quebrados, AGENTS.md >40 (CA-27, CA-28) (~2h)
- fase-04-performance-bench: garantir <2s em fixtures de 100 docs (CA-26) (~1h)
- fase-05-package-json-scripts: bun run harness:validate + bun run compound:check + integração com GH Actions (~1h)

### Plano 05: Skill Migration + Hooks
> 6 skills migram destino (zero breaking change interface) + hook pre-mutation-gate.cjs + Compound Decision Gate em /iterate. Template de exec-plans harmonizado (10 seções D18).

Fases:
- fase-01-lessons-learned-migracao: escreve em docs/compound/*.md com frontmatter (CA-14) (~1.5h)
- fase-02-decision-registry-migracao: escreve em docs/design-docs/ADR-*.md (CA-15) (~1.5h)
- fase-03-plan-feature-template-harmonizado: gera plano com 10 seções D18 (CA-18) (~2h)
- fase-04-quick-plan-template-harmonizado: versão reduzida (~1h)
- fase-05-execute-plan-paths-novos: lê de docs/exec-plans/active/, move para completed/ (~2h)
- fase-06-iterate-compound-gate: integra Compound Decision Gate (CA-16, CA-25) (~2h)
- fase-07-pre-mutation-gate-hook: hooks/pre-mutation-gate.cjs com heurística D26 (verbos + paths + negative list) (~2h)
- fase-08-zero-breaking-change-tests: CA-17 verifica que comandos antigos ainda funcionam (~1.5h)

### Plano 06: Agent-Native (D31 + D32 + D33)
> Cherry-picks do artigo agent-native. Adiciona CRUD completo (update/delete/revoke), STATE.md dinâmico mantido por hook, e completion signal estruturado (YAML machine-readable) em todas as skills migradas.

Fases:
- fase-01-completion-signal-helper: lib/completion-signal.ts padroniza bloco YAML (~1.5h)
- fase-02-skills-emit-completion-signal: 6 skills adotam o helper (S12, CA-47) (~2h)
- fase-03-state-md-generator: helper que gera/atualiza docs/STATE.md com Resources/Recent Activity/Pending (M13, CA-45) (~2h)
- fase-04-state-md-hook-posttooluse: hook atualiza STATE.md, rate-limit 30s (R15, CA-46) (~2h)
- fase-05-lessons-learned-crud: --update e --delete (soft archive em docs/compound/_archived/) (CA-41, CA-42) (~2h)
- fase-06-decision-registry-revoke: --revoke pattern superseded com link bidirecional (CA-43) (~1.5h)
- fase-07-todo-pick-crud: --skip (marca [-]) e --remove (deleta com confirmação) (CA-44) (~1h)

### Plano 07: TODO.md + /todo-pick
> Nova skill /todo-pick + template TODO.md + helpers compartilhados com /iterate. Agente adiciona itens à TODO.md durante outras tasks quando detecta out-of-scope.

Fases:
- fase-01-todo-md-template: /init cria TODO.md skeleton na raiz (~30min)
- fase-02-todo-utils-lib: lib/todo-utils.ts parse + mark done + add line (~1h)
- fase-03-todo-pick-skill: skill nova SKILL.md + lógica de seleção (CA-31, CA-32) (~2h)
- fase-04-agent-adiciona-todo-durante-execucao: /execute-plan detecta out-of-scope e appenda (CA-33) (~1.5h)

### Plano 08: Dog-Fooding (POR ÚLTIMO)
> Aplica harness no próprio plugin anti-vibe-coding (D20). Migra estrutura legada do plugin (.planning/plano01..04/, lessons-learned.md, senior-principles.md, decisions.md, CLAUDE.md 346 linhas) para nova estrutura D29 de 5 camadas. Prova viva.

Fases:
- fase-01-clean-current-claude-md: aplicar distribuição D29 (auditoria das 346 linhas) (~3h)
- fase-02-criar-agents-md-plugin: AGENTS.md do plugin ≤40 linhas em EN (CA-01) (~1.5h)
- fase-03-criar-docs-do-plugin: ARCHITECTURE.md + docs/* completo (~3h)
- fase-04-migrar-planos-historicos: plano01..04/ + 2026-04-21-v52/ + 2026-05-04-v53/ → docs/exec-plans/completed/ com seções harmonizadas (CA-02) (~2.5h)
- fase-05-dividir-lessons-learned: lessons-learned.md → docs/compound/*.md individuais com frontmatter (CA-03) (~1.5h)
- fase-06-migrar-senior-principles: senior-principles.md → docs/design-docs/core-beliefs.md (~1h)
- fase-07-decisions-para-adrs: decisions.md → docs/design-docs/ADR-*.md (~1h)
- fase-08-validar-dog-food: harness:validate + compound:check no plugin retornam exit 0 (CA-04, CA-05) (~1h)

### Plano 09: Versioning & Release
> Bump 5.3.0 → 6.0.0, CHANGELOG completo com migration guide, plugin-manifest atualizado, sync global, validação de rollback via git revert.

Fases:
- fase-01-package-json-bump: 5.3.0 → 6.0.0 (CA-34) (~30min)
- fase-02-changelog: seção 6.0.0 com migration guide passo-a-passo (CA-35) (~2h)
- fase-03-plugin-manifest-update: atualizar plugin-manifest.json refletindo nova skill /todo-pick (~1h)
- fase-04-sync-global: sync-to-global.sh para diretórios de skills do usuário (~1h)
- fase-05-rollback-test: validar CA-36 (git revert volta para v5.3 intacto) (~1.5h)

---

## Risks

- **R1 (Symlink Windows)** — Mitigação: Plano 01 fase-03 implementa 3-tier fallback; fixture testa em Windows.
- **R2 (Migração v5→v6 corrompe)** — Mitigação: Plano 03 fase-02 backup obrigatório + fase-06 dry-run + fase-07 E2E.
- **R3 (AGENTS.md >40 linhas)** — Mitigação: Plano 04 fase-03 validator rejeita; Plano 08 fase-02 valida no dog-food.
- **R4 (Dog-food bloqueia)** — Mitigação: Plano 08 é o ÚLTIMO; valida tudo antes em fixtures.
- **R5 (32 skills explosão)** — Mitigação: Plano 05 fase-08 testa zero breaking change (CA-17); migração em 6 sub-fases.
- **R6 (Hook fricção)** — Mitigação: Plano 05 fase-07 hook é SUGESTIVO (não bloqueante); rate-limit telemetria.
- **R14 (Delete acidental)** — Mitigação: Plano 06 fase-05/06/07 usam soft delete + ADR superseded pattern.
- **R15 (STATE.md hook overhead)** — Mitigação: Plano 06 fase-04 com rate-limit 30s + filtragem por path.
- **R16 (Completion signal quebra)** — Mitigação: Plano 06 fase-01 com helper obrigatório + fallback gracioso.

---

## Decisoes do PRD Aplicadas

| Decisao | Onde se aplica |
|---------|---------------|
| D2 (docs em EN) | Plano 01 fase-01 (templates), Plano 02 fase-01 |
| D3 (migração total .planning/ → docs/) | Plano 03 inteiro |
| D4 (Pre-Mutation Gate sugestivo) | Plano 05 fase-07 |
| D9 (/init absorve harness) | Planos 01-03 |
| D10 (zero breaking change) | Plano 05 fase-08 |
| D12 (Delivery Loop com Linear opcional) | Plano 02 fase-05 |
| D13 (validadores TS+bun) | Plano 01 fase-04, Plano 04 |
| D14 (GH Actions sempre instalado) | Plano 02 fase-04 |
| D15 (migração via /init) | Plano 03 |
| D16 (symlink AGENTS→CLAUDE com fallback) | Plano 01 fase-03 |
| D17 (Compound Decision Gate em /iterate) | Plano 05 fase-06 |
| D18 (template exec-plans harmonizado) | Plano 05 fase-03 e fase-04 |
| D20 (dog-fooding) | Plano 08 inteiro |
| D29 (5 camadas — distribuir CLAUDE.md 346 linhas) | Plano 08 fase-01 |
| D31 (CRUD completo) | Plano 06 fase-05/06/07 |
| D32 (STATE.md dinâmico) | Plano 06 fase-03 e fase-04 |
| D33 (completion signal) | Plano 06 fase-01 e fase-02 |
| D37 (scope deferral — sem KP content) | PRD-level; Plano 02 fase-06 só registra stack |

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

# Plano 02: Reestruturação Física + Goldens

**Feature:** compound-engineering-skill-port ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~5h
**Depende de:** Plano 01 (skill stub + `getCompoundManifest()` consumido por `init`)
**Desbloqueia:** Plano 03 (subcomandos + patches — opera sobre estrutura física já consolidada)

---

## O que este plano entrega

Move fisicamente via `git mv` (D15 — preserva linhagem) os 10 templates compound e 2 libs canônicas de `skills/init/` para `skills/compound-engineering/`, substitui conteúdo dos templates pela versão literal do André (D14) com schema corrigido (D3) e P3 inlinado em `compound-check.ts.tpl` (D8), e regenera os goldens E2E do `init` greenfield (D16, RNF-05) refletindo a nova origem. Estado final: skill compound é a fonte da verdade física; init é consumidor puro via `getCompoundManifest()`.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `skills/compound-engineering/SKILL.md` + `lib/manifest.ts` | Plano 01 fase-01 | Pendente (Plano 01) |
| `skills/init/lib/template-manifest.ts` consumindo `getCompoundManifest()` | Plano 01 fase-02 (Tracer Bullet) | Pendente (Plano 01) |
| Bug MH-01 fix isolado em `compound/README.md.tpl` (schema canônico) | Plano 01 fase-03 | Pendente (Plano 01) |
| `parseFrontmatter`/`listCompoundFiles` ainda em `skills/init/lib/` | Estado atual do repo | Pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `skills/compound-engineering/assets/` com 10 templates (versão literal André) | Plano 03 fase-01 (`install` lê via `getCompoundManifest()` e copia pra target) |
| `skills/compound-engineering/lib/compound-frontmatter.ts` | Plano 03 fase-04 (`migrate` parseia notas) + consumidores cross-skill atualizados |
| `skills/compound-engineering/lib/compound-files-collector.ts` | Plano 03 fase-04 (`migrate` escaneia notas) |
| Goldens E2E init-greenfield atualizados | CI de qualquer plano subsequente que toque init |
| `compound-check.ts.tpl` com P3 inlinado (3 regras `--strict`) | Plano 03 fase-02 (`check --strict` invoca esse script no target) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-git-mv-templates-conteudo-andre.md | `git mv` de 10 `.tpl` para `skills/compound-engineering/assets/`, conteúdo substituído pela versão literal do André, P3 inlinado em `compound-check.ts.tpl`, `manifest.ts` atualizado pros novos paths absolutos | 2h | Plano 01 completo |
| 02 | fase-02-git-mv-libs-canonicas-imports.md | `git mv` de 4 arquivos (`compound-files-collector.ts/.test.ts` + `compound-frontmatter.ts/.test.ts`) para `skills/compound-engineering/lib/`, imports cross-skill atualizados nos callsites reais, CA-17 validado via grep | 1.5h | fase-01 |
| 03 | fase-03-regenerar-goldens-e2e-init.md | Goldens `init-greenfield.tree.json` + `init-greenfield.stdout.txt` regenerados via `UPDATE_GOLDENS=1`, full suite verde, diff visível no PR | 1.5h | fase-01, fase-02 |

---

## Grafo de Fases

```
fase-01 (git mv templates + conteúdo André + P3)
    |
    v
fase-02 (git mv libs canônicas + imports cross-skill)
    |
    v
fase-03 (regenerar goldens E2E + validar full suite)
```

**Paralelismo possivel:** Nenhum. fase-02 depende da estrutura física consolidada em fase-01 (skill compound-engineering precisa ter `assets/` antes de receber `lib/`). fase-03 depende das duas anteriores porque goldens refletem o estado pós-`git mv` de templates E libs (caminhos de import aparecem indiretamente em logs/manifest do scaffold).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** N/A (não é o primeiro plano da feature — o Tracer Bullet vive no Plano 01 fase-02, manifest roundtrip já validado antes deste plano começar).

Para fase-01 e fase-02, "RED" é validar via grep prévio e snapshot de `git log --follow` que rastreabilidade está intacta; "GREEN" é build + testes verdes após o `git mv`. fase-03 não tem RED tradicional — é regen explícita de snapshot com diff revisado humano (gate "nunca diminuir" via PR review, conforme `tests/e2e/__golden__/README.md`).

---

## Gotchas Conhecidos

Indexados para referência nas fases. R-prefix vêm do PRD/CONTEXT (riscos), D-prefix são decisões aplicáveis.

- **G1 (R7 do PRD/CONTEXT):** `git mv` quebra refs internos em tests/scripts que apontavam paths antigos. **Mitigação:** grep prévio OBRIGATÓRIO antes de cada `git mv` por `skills/init/assets/templates/(docs/compound|review-checklists|smoke-flows|COMPOUND_ENGINEERING|scripts/compound-check)` e `skills/init/lib/(compound-files-collector|compound-frontmatter)`. Atualizar TODOS os callsites no MESMO commit. Aplicar em fase-01 (templates) e fase-02 (libs).
- **G2 (R2 do PRD/CONTEXT):** Refactor da origem dos templates afeta goldens E2E. **Mitigação:** goldens regeneram em commit isolado (fase-03), DEPOIS de fase-01 + fase-02 estabilizarem. Conforme D16, regen acontece JUNTO do código que motiva — não em PR separado.
- **G3 (R8 do PRD/CONTEXT):** Cross-skill import circular (compound-engineering importando algo de init). **Mitigação:** CA-17 grep obrigatório ao fim de fase-02 — `skills/compound-engineering/**/*.ts` NÃO pode conter `from '../../init/`. One-way dependency.
- **G4 (D14):** Conteúdo dos templates é SUBSTITUÍDO pela versão literal do André em `Infos/package/skills/compound-engineering/assets/compound-template/` — estado atual é descartado. Anti-pattern "Replace this scaffold" presente nos `.tpl` atuais NÃO é preservado. Exceção: `compound/README.md.tpl` já fixou schema em Plano 01 fase-03 — fase-01 deste plano sobrescreve aquele fix com a versão literal do André (que já tem o schema canônico).
- **G5 (D15):** `git mv` preserva linhagem para `git log --follow`. Verificar pós-mv via `git log --follow skills/compound-engineering/assets/docs/COMPOUND_ENGINEERING.md.tpl` e confirmar que o histórico mostra os commits anteriores em `skills/init/assets/templates/...`.
- **G6 (D16, RNF-05):** Goldens regeneram via `UPDATE_GOLDENS=1 bun test tests/e2e/init-cutover-greenfield.test.ts` (padrão estabelecido em `tests/e2e/__golden__/README.md`). Diff DEVE aparecer no PR — revisar manualmente que mudança reflete só a nova origem (paths/logs); se aparecer alteração de conteúdo de scaffold inesperada, investigar antes de aceitar.
- **G7 (D19, D21):** Após `git mv` em fase-01, `getCompoundManifest()` precisa migrar de `path.resolve(import.meta.dir, '../../init/assets/templates', dst)` (Plano 01 fase-01) para `path.resolve(import.meta.dir, '../assets', dst)` — mudança de 1 string só. Plano 01 fase-02 manteve paths idênticos; o cutover físico é AQUI.
- **G8 (D14 + CA-15 ambiguidade):** PRD CA-15 cita `compound-writer.ts` como callsite cross-skill, mas grep no repo mostra que `compound-writer.ts` NÃO importa `parseFrontmatter` (usa próprios tipos `CA29Frontmatter`). Callsites reais a atualizar em fase-02: `skills/lessons-learned/index.test.ts` e `skills/lib/compound-note-writer.test.ts`. Decisão registrada em MEMORY.md (DI-Plano02-fase02-cross-skill-imports).

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

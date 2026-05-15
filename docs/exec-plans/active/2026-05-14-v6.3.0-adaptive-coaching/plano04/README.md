# Plano 04: profile-aware-preface ×4-6 skills

**Feature:** Adaptive Coaching v6.3.0 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~4h
**Depende de:** Plano 01 (Fundação Adaptativa)
**Desbloqueia:** Nada direto — fecha o release v6.3.0

---

## O que este plano entrega

Replica o padrão `profile-aware-preface` (provado em `/architecture`) em 4 skills Must Have (`/security`, `/api-design`, `/system-design`, `/design-patterns`) e 2 skills Should Have (`/decision-registry`, `/lessons-learned`). Cada skill ganha um bloco marcado `<!-- profile-aware-preface:start --> ... <!-- profile-aware-preface:end -->` consumindo `readPrefaceContext` do Plano 01, com lookup table per-skill em `skills/{skill}/lib/{skill}-prefaces.ts`. Estende `harness-validate.ts` para validar bem-formação dos blocos e fecha com CHANGELOG v6.3.0 + lesson compound condicional.

---

## Análise de Dependências

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| `skills/lib/preface-context.ts` exportando `readPrefaceContext()` e tipo `PrefaceContext` | Plano 01 fase-01 | pendente — bloqueia fase-01 (primeira checklist item) |
| `docs/design-docs/ADR-0020-adaptive-coaching.md` (referência arquitetural) | Plano 01 fase-03 | soft — referenciado em CHANGELOG (fase-04) |
| `docs/design-docs/adaptive-coaching-framework.md` (migration guide) | Plano 01 fase-03 | soft — apontado em comentários das prefaces |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 6 skills com bloco `profile-aware-preface` bem-formado | Humano via invocação direta (`/security`, etc) — adaptação automática quando `architecture-profile.md` existe |
| `scripts/harness-validate.ts` estendido com check de preface | CI + pre-commit + Plano 05+ (validação contínua) |
| `CHANGELOG.md` entrada v6.3.0 | Release pipeline, leitores do repo |
| `docs/compound/profile-aware-preface-migration.md` (condicional) | Autores de skill futuros — migration guide pragmático |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | [fase-01-4-skills-must-have.md](fase-01-4-skills-must-have.md) | Preface block + lookup table em 4 skills (`/security`, `/api-design`, `/system-design`, `/design-patterns`) | ~1.5h | Plano 01 fase-01 verde |
| 02 | [fase-02-2-skills-should-have.md](fase-02-2-skills-should-have.md) | Mesmo pattern em `/decision-registry` e `/lessons-learned` (RF-SH-05 — defer permitido a v6.3.1) | ~1h | fase-01 |
| 03 | [fase-03-harness-validate-preface.md](fase-03-harness-validate-preface.md) | `harness-validate.ts` valida blocos preface bem-formados (start/end + `readPrefaceContext`) | ~1h | fase-01 (precisa de skills com bloco para validar) |
| 04 | [fase-04-changelog-compound.md](fase-04-changelog-compound.md) | `CHANGELOG.md` v6.3.0 entry + compound note condicional | ~0.5h | fase-01, fase-02, fase-03 |

---

## Grafo de Fases

```
Plano 01 fase-01 (readPrefaceContext)  ← BLOQUEADOR EXTERNO
        |
        v
fase-01 (4 skills Must Have) [TRACER BULLET interno deste plano]
        |
        +---------+--------------+
        |         |              |
        v         v              v
   fase-02   fase-03         (fase-04 aguarda 01+02+03)
  (2 Should) (harness)
        |         |
        +----+----+
             |
             v
        fase-04 (CHANGELOG + compound)
```

**Paralelismo possível:** fase-02 e fase-03 podem rodar em paralelo após fase-01 verde (ambas só leem o output de fase-01, não escrevem nos mesmos arquivos). fase-04 sempre por último.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, não compilation error)
2. GREEN: código mínimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint && bun run harness:validate
```

**Tracer Bullet deste plano:** fase-01 (4 skills Must Have)

Objetivo do tracer bullet: provar de ponta a ponta que o pattern de `/architecture` é replicável mecanicamente em outra skill (`/security`) — leitura do contexto via `readPrefaceContext`, lookup table per-skill, fallback ao default quando `profile: null`, comportamento v6.2 preservado (CA-02). Provando em 1 skill, as outras 3 + 2 Should Have viram cópia-cole-adapte.

Framework: `bun:test` (consistente com Planos 01-03). Testes ficam em `skills/{skill}/lib/{skill}-prefaces.test.ts` — 1 teste por skill validando lookup correto para `nextjs-app-router` + fallback ao default quando `profile: null`.

---

## Gotchas Conhecidos

- **G1 — Telemetry block precede preface, H1 sucede preface:** O bloco `<!-- profile-aware-preface:start -->` deve ficar EXATAMENTE entre o bloco de telemetria (Plano 03 fase-03) e o H1 título da skill. Mirror direto de `skills/architecture/SKILL.md` linhas 35-82. Posicionamento errado quebra parsing visual e o harness check do markdown.
- **G2 — `language` e `framework` são SEMPRE null em v6.3.0:** O `PrefaceContext` shape é `{ profile, language, framework, confidence }` (PRD Decisão #2), mas `language` e `framework` ficam reservados para v6.5/v6.6. NÃO hardcode branching baseado nesses campos — vai virar código morto e quebrar CA-09 (composabilidade).
- **G3 — Lookup table mora dentro da skill, NÃO em lib central:** Cada skill ganha `skills/{skill}/lib/{skill}-prefaces.ts` com seu próprio mapa `Record<ArchitectureProfileName, string>` + `DEFAULT_{SKILL}_PREFACE`. Anti-pattern: God-table em `skills/lib/all-prefaces.ts`. Razão: cada skill evolui sua narrativa independentemente.
- **G4 — Check do harness é bidirecional:** `<!-- profile-aware-preface:start -->` REQUER `<!-- profile-aware-preface:end -->` no mesmo arquivo E menção a `readPrefaceContext` no corpo entre os markers. Faltar qualquer um dos três = falha no harness (RF-SH-06). Validar via string presence — sem AST parser disponível (G7).
- **G5 — Fallback default preserva v6.2 verbatim (CA-02):** Quando `ctx.profile === null` (architecture-profile.md ausente ou flag off), o preface aplicado deve ser STRING VAZIA ou a prosa atual da skill copiada literal. Não paraphrase, não "melhoria silenciosa" do prompt. CA-02 obriga comportamento v6.2 idêntico quando profile é null.
- **G6 — `/decision-registry` e `/lessons-learned` podem não beneficiar de adaptação:** RF-SH-05 explicitamente diz "candidatos, choice open". Durante fase-02, se o implementador concluir que preface adiciona zero valor a essas skills (são meta-skills que orquestram, não consultam código), registrar a decisão em MEMORY.md e SKIPAR — a lesson vai para fase-04 compound. Skipar é resultado válido de RF-SH-05.
- **G7 — Sem AST/TypeScript parser disponível (herda Plano 03 G9):** `package.json` tem apenas `gray-matter` e `js-yaml`. O check do harness em fase-03 usa `string.includes()` simples — sem parsing real. Aceitar a tradeoff: pattern textual estrito > tolerância semântica frouxa.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

# Plano 03: Skill Wire-up — 6 cross-stack skills restantes ganham `stack-aware-preface`

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2) ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~3.5h
**Depende de:** Plano 01 (Tracer Bullet — bloco `stack-aware-preface` validado em `/security` e usado como template verbatim)
**Desbloqueia:** Plano 06 fase-06 (E2E completo CA-01..CA-10 — as 7 skills cross-stack precisam aderir ao mesmo contrato para o E2E passar)

---

## O que este plano entrega

Replica o bloco `<!-- stack-aware-preface:start --> ... :end -->` validado no Plano 01 fase-04 em **6 skills cross-stack** restantes (`/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`). Trabalho mecânico — zero lógica nova, zero módulos TS criados — fechado por verificação cruzada de CA-05 (preface aparece quando `.claude/knowledge/INDEX.md` existe) e CA-09 (graceful degradation: preface vazio, comportamento v6.3.1 intacto quando INDEX ausente).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status |
|-------|-------------|--------|
| Bloco `<!-- stack-aware-preface:start --> ... :end -->` validado em `skills/security/SKILL.md` (template verbatim) | Plano 01 fase-04 | pendente |
| Snippet com path fixo `.claude/knowledge/INDEX.md` (D11) confirmado funcional | Plano 01 fase-04 + fase-05 | pendente |
| CA-09 graceful degradation validada end-to-end (preface vazio quando INDEX ausente) | Plano 01 fase-05 | pendente |
| `skills/api-design/SKILL.md`, `system-design/SKILL.md`, `design-patterns/SKILL.md` com bloco `<!-- profile-aware-preface:end -->` (anchor de inserção batch 1) | codebase v6.3.1 | pronto |
| `skills/architecture/SKILL.md` com bloco `<!-- profile-aware-preface:end -->` (anchor batch 2) | codebase v6.3.1 | pronto |
| `skills/infrastructure/SKILL.md` e `skills/tdd-workflow/SKILL.md` greenfield (sem profile-aware) — anchor = fechamento do frontmatter | codebase v6.3.1 | pronto |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| 7 skills cross-stack aderindo ao mesmo contrato `stack-aware-preface` (security do Plano 01 + 6 deste plano) | Plano 06 fase-06 (E2E CA-01..CA-10 — depende de todas as 7 estarem wired) |
| Teste E2E `tests/e2e/stack-aware-preface-all-skills.test.ts` cobrindo CA-05 + CA-09 nas 7 skills | Plano 06 fase-06 (reusa setup, estende para CA-01/CA-03/CA-06/CA-07) |
| Padrão validado de "insertion-only diff" sobre SKILL.md de produção | Stacks futuras (Rails, Python, Go) que precisarem replicar o mesmo wire em mais skills |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-wire-batch-1-api-system-patterns.md | bloco `stack-aware-preface` em `/api-design`, `/system-design`, `/design-patterns` (anchor: `<!-- profile-aware-preface:end -->`) | 1h | — |
| 02 | fase-02-wire-batch-2-arch-infra-tdd.md | bloco `stack-aware-preface` em `/architecture` (anchor profile-aware), `/infrastructure` e `/tdd-workflow` (anchor: fechamento do frontmatter) | 1-1.5h | — |
| 03 | fase-03-verification-ca05-ca09.md | E2E que percorre as 7 skills × 2 cenários (INDEX presente / ausente) — 14 asserts cobrindo CA-05 + CA-09 | 1-1.5h | fase-01, fase-02 |

---

## Grafo de Fases

```
fase-01 (batch 1: api-design, system-design, design-patterns)
    |
    |     (paralelo — sem arquivos compartilhados)
    |
fase-02 (batch 2: architecture, infrastructure, tdd-workflow)
    |
    +----------------+----------------+
                     |
                     v
        fase-03 (verificação CA-05 + CA-09)
```

**Paralelismo possivel:** fase-01 e fase-02 podem rodar em paralelo — tocam arquivos disjuntos. Fase-03 fecha o ciclo e exige ambas as anteriores verdes (precisa das 6 skills wired para validar 7 skills no E2E somando `/security` do Plano 01).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: inserir o bloco verbatim em cada SKILL.md
3. REFACTOR: nao aplicavel (insertion-only)
4. VERIFY: bun run test && bun run lint && bun run typecheck
```

Fases 01 e 02 usam **harness test + grep** estilo Plano 01 fase-04 (assert sobre presença dos markers + path fixo + preservação de blocos existentes). Fase-03 usa **E2E real** com projeto temp e `.claude/knowledge/INDEX.md` controlável.

**Tracer Bullet deste plano:** N/A (este NÃO é o primeiro plano). O tracer arquitetural foi validado em Plano 01 fase-05. As 3 fases deste plano são extensão mecânica do template já provado.

---

## Gotchas Conhecidos

Indexados aqui; referenciados nas fases.

- **G1 — Bloco é verbatim do Plano 01 fase-04 (zero drift):** o contrato é que as 7 skills cross-stack contenham **exatamente** o mesmo bloco `<!-- stack-aware-preface:start --> ... :end -->`. Qualquer divergência (espaços, ordem de imports, frase do preface) vira regressão CA-05/CA-09 e é detectada em fase-03. Editor deve copiar do `/security` byte-a-byte com apenas a linha de comentário provenance adaptada (data 2026-05-16, fase do plano correto).

- **G2 — Anchor de inserção difere entre batch 1 e batch 2:** batch 1 (api-design, system-design, design-patterns) e architecture (parte do batch 2) inserem **logo após** `<!-- profile-aware-preface:end -->` e **antes** de `<!-- stale-capabilities-check:start -->`. Infrastructure e tdd-workflow são **greenfield** (não têm profile-aware, não têm stale-capabilities) — inserir **logo após** o `---` que fecha o frontmatter, **antes** do primeiro `#` H1. Misturar anchors = posição errada do preface no output da skill.

- **G3 — CA-09 graceful degradation é strict:** `existsSync` é síncrono, retorno em caso de INDEX ausente é a string `''` literal (não `null`, não `undefined`, não warning, não log). **Proibido** `console.warn`, `console.error` ou qualquer side effect quando o INDEX não existe. Comportamento da skill = v6.3.1 intacto. Fase-03 valida esse contrato explicitamente.

- **G4 — CA-10 regressão (insertion-only diff):** nenhum bloco existente (`profile-aware-preface`, `stale-capabilities-check`, corpo da skill) pode ser alterado, reorganizado ou ter espaços trocados. O diff por SKILL.md deve mostrar **apenas adição** do novo bloco. Reordenar imports do bloco existente, ajustar markdown, trocar `'` por `"` = regressão. Em batch 2 greenfield, zero modificações no corpo das skills — só insertion no topo.

- **G5 — Comentário provenance (princípio universal #5):** cada skill recebe o bloco com a linha `// 2026-05-16 (Luiz/dev): Plano 03 fase-0X — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).` onde `X` é a fase desta plano (01 para batch 1, 02 para batch 2). Demais comentários do bloco permanecem idênticos ao template do Plano 01 fase-04.

- **G6 — Não criar/regenerar `lib/preface-context.ts` ou correlatos:** `stack-aware-preface` é independente do `profile-aware-preface`. Path é fixo (D11), **zero indireção**, **zero helper TS novo**. Plano 03 não toca em `skills/lib/`, `skills/init/lib/`, ou qualquer arquivo TypeScript de runtime. Só edita SKILL.md.

- **G7 — Output é texto/markdown:** as únicas mudanças em código são (a) inserts em SKILL.md (markdown) e (b) novos arquivos `.test.ts` em `tests/` para harness. Nenhum módulo de runtime é criado. Lint/typecheck globais valem mas não há nova surface de TS para tipar.

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

# Plano 01: Schema, Renderer e Data (FasePlanInput v1)

**Feature:** Refatorar populate-plan-generator → hierarquia + FasePlanInput v1 ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~6-8h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02

---

## O que este plano entrega

O **contrato** novo: o tipo `FasePlanInput v1` (10 H2 do Andre + 6 extensoes AVC + `schemaVersion: 1`), o renderer puro `renderFasePlan` que emite o markdown, a migracao dos 16 docs em `populate-instructions-table.ts` para preencher os campos novos, e os 16 arquivos `.md` per-doc em `skills/init/assets/populate-guidance/`. Ao final deste plano, o contrato esta pronto e validado por testes unitarios — mas o pipeline ainda emite o output antigo (Plano 02 troca a wiring).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

Nenhum. ADR-0022 ja existe e formaliza o schema. Step 7 atual continua funcionando com o codigo antigo durante todo o Plano 01.

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| Tipo `FasePlanInput` exportado de `render-fase-plan.ts` | Plano 02 fase-01 (orquestrador monta o input) |
| Funcao `renderFasePlan(input): string` | Plano 02 fase-01 (escreve nos 16 arquivos fase-XX) |
| `POPULATE_INSTRUCTIONS_BY_DOC` com os 6 campos novos | Plano 02 fase-01 (le e converte para `FasePlanInput`) |
| 16 `.md` de guidance em `skills/init/assets/populate-guidance/` | Plano 02 fase-01 (referencia path no `guidanceFile`) |
| Drift test em `populate-instructions-table.test.ts` | Pipeline CI permanente |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | [fase-01-tracer-bullet-schema-renderer.md](./fase-01-tracer-bullet-schema-renderer.md) | `FasePlanInput v1` type + `renderFasePlan` + snapshot test | 2h | — |
| 02 | [fase-02-extend-doc-instruction.md](./fase-02-extend-doc-instruction.md) | `DocInstruction` estendida + 16 entradas migradas | 2h | fase-01 |
| 03 | [fase-03-guidance-md-files.md](./fase-03-guidance-md-files.md) | 16 arquivos `.md` per-doc em `assets/populate-guidance/` | 2-3h | fase-02 |
| 04 | [fase-04-drift-test.md](./fase-04-drift-test.md) | Teste que pega divergencia entre `mustCover` e prosa `.md` | 30min | fase-02, fase-03 |

---

## Grafo de Fases

```
fase-01 (schema + renderer + snapshot)        ← Tracer Bullet
    |
    v
fase-02 (estende DocInstruction + 16 docs)
    |
    +-----------------+
    |                 |
    v                 v
fase-03 (16 .md)  (paralelo)
    |                 |
    +-----------------+
                |
                v
        fase-04 (drift test)
```

**Paralelismo possivel:** fase-03 e fase-04 NAO podem rodar em paralelo (drift test le os `.md`). fase-02 e bloqueador de ambas.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha por assertion
2. GREEN: codigo minimo
3. REFACTOR: limpar com testes verdes
4. VERIFY: bun test && bun run lint
```

**Tracer Bullet deste plano:** fase-01-tracer-bullet-schema-renderer — prova o contrato com 1 input sintetico antes de migrar os 16 docs reais.

---

## Gotchas Conhecidos

- **G1:** A ORDEM das 10 H2 e literal do Andre (`ADR-0022`). Renderer NAO reordena, NAO renomeia. Snapshot test fixa a ordem byte-a-byte.
- **G2:** Final Report Contract eh **hardcoded** no renderer, NAO eh campo do `FasePlanInput`. Decisao 6 da ADR-0022.
- **G3:** `Validation Log`, `Compound Opportunity` e `Lessons Captured` ficam VAZIOS no markdown gerado (placeholders `<!-- preencher durante execucao -->`). Sao preenchidos pelo `/execute-plan` e `/iterate`.
- **G4:** `guidanceFile` carrega o **path** do `.md`, nao o conteudo. Renderer NAO le `.md` em runtime (lazy loading — NFR Performance < 2s).
- **G5:** `stackVariants` aceita apenas 3 chaves: `rails`, `nextjs`, `node-ts`. Outras stacks ignoradas no v1 (decisao 5 da ADR-0022 — YAGNI controlado).
- **G6:** `schemaVersion: 1` eh literal (nao string `"1"`). Permite check direto `input.schemaVersion === 1` no renderer.
- **G7:** Nomes de campos do `mustCover` devem casar com nomes de H2 da prosa do `.md` correspondente. Drift test em fase-04 garante.

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->

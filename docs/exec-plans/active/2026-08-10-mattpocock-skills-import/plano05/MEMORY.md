# Memory: Plano 05 — `domain-modeling`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a lente)
**Desbloqueia:** `wait-what`, `grill-with-docs`

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | A skill de glossario | planned | 0/3 |
| 02 | Scaffold + ponteiro no AGENTS | planned | 0/4 |
| 03 | Absorcao no decision-registry | planned | 0/1 |

Fase 03 e independente das outras duas.

## Decisoes de implementacao (DI)

Formato: `DI-Plano05-faseNN-<slug>: <o que mudou e por que>`.

Duas ja sao obrigatorias, na fase-02:
- `DI-Plano05-fase02-required`: a entry do `GLOSSARY.md` no manifest e `required: true` ou `false`?
  Comparar com `DESIGN.md` e `CODE_STYLE.md` e seguir o vizinho mais proximo.
- `DI-Plano05-fase02-category`: qual `category`? Nao e `canon-andre` (nao vem do harness do Andre).
  Conferir os valores em uso antes de inventar um.

## Caminhos verificados (2026-08-10)

| O que | Onde |
|---|---|
| Templates do `/init` | `skills/init/assets/templates/docs/*.tpl` |
| Template do AGENTS | `skills/init/assets/templates/AGENTS.md.tpl` |
| Manifest | `skills/init/lib/template-manifest.ts` (shape: `src`, `dst`, `required`, `category`) |
| Teste do manifest | `skills/init/lib/template-manifest.test.ts` — assevera contagem (comentario registra 24, com drift pre-existente) |
| ADRs deste repo | `docs/design-docs/ADR-NNNN-{slug}.md` |
| Writer de ADR | `skills/decision-registry/lib/adr-writer.ts` — conta `ADR-*.md` para next_id |
| Storage legado | `.claude/decisions.md` (append) |

## Estado do `decision-registry` antes da mudanca

260 linhas. Ja tem: `When to Write an ADR` (tabela de gatilhos por topico), lifecycle
PROPOSED→ACCEPTED→SUPERSEDED/DEPRECATED, `Common Rationalizations`, `Red Flags`, checklist de
verificacao, template completo (Context/Decision/Alternatives A-B-C/Consequences), convencao de
cross-link codigo→ADR.

**Ganha da fonte em quase tudo.** O que entra sao 3 coisas que ele nao tem: filtro de 3 criterios,
3 categorias de "o que qualifica", tier leve.

## Resultados a registrar (fase-03, teste retroativo)

| Teste | Resultado |
|---|---|
| 3 ADRs existentes passam no filtro de 3 criterios? | |
| Se algum nao passa: filtro apertado demais, ou ADR desnecessario? | |
| Existe decisao real sem ADR que caberia no tier leve? | |

Se a ultima resposta for "nenhuma", o tier leve pode ser solucao para problema inexistente.
Registrar isso em vez de esconder.

## Gates entre fases

- **fase-01 -> fase-02:** o template semente segue o formato definido em `GLOSSARY-FORMAT.md`.
- **fase-03:** independente; pode rodar antes, depois ou em paralelo.

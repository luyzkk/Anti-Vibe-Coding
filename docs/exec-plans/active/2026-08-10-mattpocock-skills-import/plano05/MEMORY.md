# Memory: Plano 05 — `domain-modeling`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** in-progress — fase-01 concluida
**Depende de:** plano01 fase-01 (a lente)
**Desbloqueia:** `wait-what`, `grill-with-docs`

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | A skill de glossario | **done** | 3/3 (+ `plugin-manifest.json` regenerado) |
| 02 | Scaffold + ponteiro no AGENTS | planned | 0/4 |
| 03 | Absorcao no decision-registry | planned | 0/1 |

Fase 03 e independente das outras duas.

## Decisoes de implementacao (DI)

Formato: `DI-Plano05-faseNN-<slug>: <o que mudou e por que>`.

Duas ja sao obrigatorias, na fase-02:
- `DI-Plano05-fase02-required`: a entry do `GLOSSARY.md` no manifest e `required: true` ou `false`?
  Comparar com `DESIGN.md` e `CODE_STYLE.md` e seguir o vizinho mais proximo.
- `DI-Plano05-fase02-category`: qual `category`? Nao e `canon-andre` (nao vem do harness do Andre).
  Conferir os valores em uso antes de inventar um. **Medido em 2026-08-13:** `template-manifest.ts`
  usa exatamente dois valores — `canon-andre` (18x) e `anti-vibe-extension` (10x). Nao inventar um
  terceiro sem motivo.

### fase-01 (2026-08-13)

- `DI-Plano05-fase01-fonte-nao-estava-no-disco`: a fonte `mattpocock/skills` **nao existe** em
  `Infos/` (la mora `agent-skills-main`, do import anterior). Baixada do upstream no commit
  analisado com
  `gh api repos/mattpocock/skills/contents/skills/engineering/domain-modeling/<f>?ref=84fdeff`.
  Path upstream confirmado: `skills/engineering/domain-modeling/` com `SKILL.md` (74 linhas),
  `CONTEXT-FORMAT.md` (60) e `ADR-FORMAT.md` (47). **Fases 02 e 03 precisam do mesmo download** —
  a fase-03 usa o `ADR-FORMAT.md`.
- `DI-Plano05-fase01-references-dir`: o formato foi para
  `skills/domain-modeling/references/GLOSSARY-FORMAT.md`, e nao na raiz da skill como o fase doc
  escrevia. Convencao medida: **14 skills** usam `references/`, **1** usa `.md` irmao na raiz
  (`consultant/prompts.md`). Nenhum criterio de aceite depende do path.
- `DI-Plano05-fase01-inv02-teste-reescrito`: o teste de INV-02 da fonte — *"este conceito e unico
  deste contexto, ou e programacao em geral?"* — **reprova `harness`**, que e palavra geral com
  sentido local divergente e a entrada de maior valor que este repo teria. Reescrito para *"quem
  chega neste repo ja sabe o que esta palavra significa aqui?"*, que decide os dois casos. Achado do
  teste de aplicacao, nao de revisao — ver secao abaixo.
- `DI-Plano05-fase01-fallback-criacao`: a skill cria `docs/GLOSSARY.md` quando ele nao existe. Nao
  contradiz o "scaffold, nao criacao preguicosa" do README: a razao registrada la contra o lazy era
  a skill ter que **editar o `AGENTS.md` do projeto-alvo**, e ela nao edita. O scaffold da fase-02
  segue sendo o mecanismo de descoberta; isto e robustez para projeto que nunca rodou `/init`.
- `DI-Plano05-fase01-adr-fora`: o filtro de 3 criterios e o `ADR-FORMAT.md` **nao** entraram na
  skill — so a fronteira de duas linhas apontando para `/anti-vibe-coding:decision-registry`.
  Duplicar o filtro aqui e na fase-03 criaria dois lugares para editar a mesma regra.

## Teste de aplicacao da fase-01 (3 termos reais deste repo)

| Termo | Veredito | O que revelou |
|---|---|---|
| `compound note` | entra, limpo | especifico do repo, sem colisao com sentido geral |
| `parity gate` | entra, limpo | idem |
| `harness` | **entra, mas reprovava** | palavra geral (test harness) com sentido local divergente. Expos o buraco que gerou `DI-Plano05-fase01-inv02-teste-reescrito` |

Entradas escritas no formato, para a fase-02 usar como aferimento do template semente:

```md
**Harness**:
A estrutura canonica de documentos que o `/init` instala e o `harness:validate` verifica.
_Evitar_: scaffold, boilerplate, template

**Compound note**:
Uma licao durável extraida de um bug real, gravada para que a proxima sessao nao repita o erro.
_Evitar_: lesson, retro, post-mortem

**Parity gate**:
Um teste que falha quando uma skill portada perde capacidade que a fonte tinha.
_Evitar_: regression test, guard
```

## Colisoes da palavra "glossario" ja existentes no repo (medido 2026-08-13)

Nenhuma conflita com `docs/GLOSSARY.md`, mas a palavra ja significa quatro outras coisas aqui:

| Onde | Que sentido |
|---|---|
| `skills/init/assets/snippets/classifier-llm-prompt.md:28` | placeholder `{{GLOSSARY_TERMS}}` — **orfao**, zero consumidor `.ts`; sobrou da `blocks-classifier` deletada |
| `skills/learn/SKILL.md:299` | `## Glossario Interno` — tabela didatica para explicar a leigos |
| `docs/design-docs/init-rationale.md:585` | "glossario compartilhado" entre waves de subagentes |
| `docs/design-docs/subagent-contract-v1.md:118` | `docs/references/severity-glossary.md`, condicional |

Controle positivo do grep de gap: `ADR` aparece em 277 arquivos; `ubiqu` so nos docs deste import.

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

**261** linhas (medido 2026-08-13; o plano dizia 260 — corrigido aqui e no README. `CONTEXT.md:248`
ainda carrega 260 dentro da justificativa de DI-17, deixado como registro historico).
Ja tem: `When to Write an ADR` (tabela de gatilhos por topico), lifecycle
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

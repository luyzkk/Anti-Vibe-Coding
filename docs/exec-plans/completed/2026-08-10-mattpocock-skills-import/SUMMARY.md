# Summary: Import mattpocock/skills — porte, absorção e auditoria

**Completed:** 2026-08-17
**Duration:** 2026-08-10 (triagem e decisão) → 2026-08-17 (fechamento)
**Planos:** 11 (11 completed, 0 skipped)
**Fases Total:** 31 (31 done, 0 skipped, 0 blocked)
**PRs:** #14–#33

> **Leia isto antes do `HANDOFF.md`.** O `HANDOFF.md` foi escrito em 2026-08-10, *antes* da
> execução — descreve a intenção ("zero linha de código escrita", "54 arquivos untracked",
> "branch atual `main`"). Como registro de estado ele está historicamente falso. Este SUMMARY
> registra o que de fato aterrissou. O `CONTEXT.md` (triagem, 37 decisões DI-01..DI-37) segue válido.

## O que foi construído

Análise das 35 skills de [mattpocock/skills](https://github.com/mattpocock/skills) (MIT, commit
`84fdeff`) contra o inventário do Anti-Vibe-Coding: **13 aprovadas, 22 descartadas com motivo**.
O material aprovado entrou por duas vias — skill nova quando o domínio não existia aqui, absorção
in-place quando já existia uma skill dona do assunto.

**7 skills novas** (`skills/`): `writing-for-agents`, `wizard`, `domain-modeling`,
`improve-codebase-architecture`, `prototype`, `resolving-merge-conflicts`, `wayfinder`.

**4 absorções** em skills existentes: vocabulário de seam (`deep-modules`), Modelo de Frontier
(`grill-me`), Loop-First (`incident-response`), e as absorções finais do plano11
(code review, TDD, grill-with-docs).

| Plano | Entrega | Fases | PR |
|---|---|---|---|
| 01 | `writing-for-agents` + auditoria das 39 skills | 4 | #14 |
| 02 | Vocabulário de seam (expande `deep-modules.md`) | 3 | #17, #18 |
| 03 | `wizard` | 3 | #19, #26 |
| 04 | Modelo de Frontier no `grill-me` | 2 | #20, #24 |
| 05 | `domain-modeling` + glossário | 3 | #21 |
| 06 | Loop-First no `incident-response` | 3 | #23 |
| 07 | `improve-codebase-architecture` | 2 | #27 |
| 08 | `prototype` | 3 | #28 |
| 09 | `resolving-merge-conflicts` | 2 | #29 |
| 10 | `wayfinder` (+ script de fronteira distribuído) | 3 | #31 |
| 11 | Absorções finais (code-review, tdd, grill-with-docs) | 3 | #32 |

Fora da grade de planos: **#30** (`fix/manifest-skill-root-files` — arquivos na raiz das skills
passaram a entrar no manifest) e **#22 / #25 / #33** (captura de lições).

## Lições capturadas

9 notas compound saíram desta feature — o retorno mais durável do import:

- `2026-08-11-skill-md-code-block-can-be-load-bearing.md`
- `2026-08-12-delta-de-corpo-so-vale-medido-em-lf.md`
- `2026-08-12-grep-negativo-exige-controle-positivo.md`
- `2026-08-12-secao-nao-se-classifica-por-nome-de-heading.md`
- `2026-08-12-tag-estrutural-repesa-sem-consumidor.md`
- `2026-08-13-artefato-gerado-decide-entre-duas-fontes.md`
- `2026-08-13-suite-verde-nao-exercita-validador-distribuido.md`
- `2026-08-17-arquivo-fora-do-scan-nao-entra-no-manifest.md`
- `2026-08-17-doc-de-planejamento-e-hipotese-medir-antes-de-editar.md`

Duas foram promovidas a `docs/design-docs/core-beliefs.md` (PR #33): afirmação de doc de
planejamento é medição datada, e grep negativo exige controle positivo.

## Decisões de Implementação (consolidado)

As DIs vivem no `MEMORY.md` de cada plano — são a fonte primária e estão referenciadas por nome
nas notas compound acima. Os `planoNN/` foram preservados inteiros por isso: colapsá-los num
resumo quebraria a proveniência que 7 notas compound apontam.

- **`_legacy-detail/` não se aplica aqui.** Aquela convenção (`scripts/harness-validate.ts:72`)
  é para working notes migrados de `.planning/<slug>/`. Esta pasta nasceu no layout v6.
- **Obrigação de licença cumprida:** atribuição MIT (Copyright (c) 2026 Matt Pocock) em
  `THIRD-PARTY-NOTICES.md`.

## Métricas Consolidadas

| Métrica | Valor |
|---------|-------|
| Planos | 11 |
| Fases total | 31 |
| Skills novas | 7 |
| Absorções em skills existentes | 4 |
| Skills no plugin (após) | 48 |
| Notas compound geradas | 9 (2 promovidas a core-beliefs) |
| Versão do plugin | 7.5.0 |
| `bun run test` | 268 arquivos / 1759 pass / 0 fail |
| `bun run harness:validate` | verde (28 required, 374 md) |
| `bun run compound:check` | verde (49 notas) |
| `bun run agents:contract` | verde (35) |

## Pendências fora do escopo

Levantadas no fechamento, nenhuma bloqueia a feature:

1. **Shotgun surgery no scaffold** — `skills/init/lib/template-manifest.test.ts:37` trava
   `ext.length` em 15 (irmão em `:27`, 24). Somar um arquivo ao scaffold custa 4 edições à mão.
2. **`feature/` documentado vs `feat/` praticado** — `skills/git-workflow-and-versioning/SKILL.md`
   (3 sites: `:152`, `:153`, `:165`). 100% dos merges usam `feat/`.
3. **`status: opne` passa silencioso** — `scripts/wayfinder-frontier.ts:115` faz fallback para
   `open` sem avisar. Deixado assim para não embarcar ramo sem teste; o arquivo é copiado byte a
   byte para o `.tpl`, com teste de drift guardando.
4. **Goldens do `/init`** — 4 `test.skip` em `tests/e2e/init-cutover-greenfield.test.ts`
   (`:106`, `:124`, `:139`, `:218`), desde 2026-05-21. Não regeneráveis sem `/detect-architecture`
   no fluxo do teste; o scaffold foi de 38 para 39 arquivos, então o golden está defasado por mais
   de um motivo. Cobertura equivalente em `tests/e2e/init-v7-final-acceptance.test.ts`.
5. **Flakiness de budget de tempo** — 5 testes que falham sob carga da máquina e passam na
   re-rodada. Nenhum introduzido por esta feature.
6. **`skills/prototype/references/UI.md`** — verificado só por leitura. Este repo é plugin CLI,
   sem rotas; o primeiro uso num projeto Next.js é o teste real.

Pré-existentes e não desta feature: `docs/STATE.md` é auto-gerado e está congelado em 2026-05-12
(contadores obsoletos — diz 5 notas compound, há 49); `ADR-0002` e `ADR-0021` apontam para pastas
em `active/` que já foram movidas para `completed/`.

<!-- Escrito em 2026-08-17 ao mover a pasta de active/ para completed/, conforme docs/PLANS.md -->

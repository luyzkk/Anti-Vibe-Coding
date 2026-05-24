# Memory — Plano 02

## Decisões de Implementação

- **DV-P02-01:** Spec assumia `generate:manifest` + campo `sha256` em `plugin-manifest.json` — nenhum existe. Manifest real usa `path`/`version`/`introduced`/`description`. Adaptação: entries inseridas manualmente com estrutura real.
- **DI-P02-01:** `.claude-plugin/plugin.json` NÃO tem array `skills` — é apenas metadados do plugin. Entries de skills ficam em `plugin-manifest.json`.
- **DI-P02-02:** Posição alfabética em `plugin-manifest.json` — `code-simplification` fica entre `centralize-config` e `consultant`; `incremental-implementation` fica entre `incident-response` e `infrastructure`.
- **DI-P02-03:** Fases 01 e 02 rodaram em paralelo com sucesso — ambas modificaram `plugin-manifest.json` sem conflito.

## Bugs/Gotchas

- **GT-P02-01:** `bun run test` tem falhas pré-existentes não relacionadas às novas skills: 6x `harness-validate-v6-path-whitelist` (commit `2de5886`), 3x SLA timing em `stack-knowledge`, 1x `migration EBUSY fixture`. Nenhuma causada por esta feature.

## Artefatos Entregues

- `skills/incremental-implementation/SKILL.md` (265 linhas, commit `ddcf54a`)
- `skills/code-simplification/SKILL.md` (351 linhas, commit `faaf35d`)
- `plugin-manifest.json` — 2 novas entries com estrutura correta

## Notas para Planos Seguintes

- DI-GERAL-03: Para adicionar nova skill ao plugin, o caminho correto é: criar `skills/<nome>/SKILL.md` + adicionar entry em `plugin-manifest.json`. NÃO há script automatizado de geração.
- DI-GERAL-04: `bun run test` tem falhas pré-existentes (ver GT-P02-01) — verificar se novas falhas foram introduzidas, não exigir suite 100% verde.
- DI-GERAL-05: Execução paralela de fases que modificam o mesmo JSON funciona, desde que as edições sejam em chaves diferentes do mesmo objeto.

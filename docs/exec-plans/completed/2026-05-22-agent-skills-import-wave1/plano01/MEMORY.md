# MEMORY — Plano 01 (Infrastructure Tracer Bullet)

Memória viva do plano. Atualizar durante execução com decisões, bugs e desvios.

## Decisões de Implementação

- **DI-P01-01:** `generate:manifest` não existe em `package.json` — step `validate-manifest` usa fallback `test -f plugin-manifest.json && echo "plugin-manifest.json OK"`. Não inventar scripts.
- **DI-P01-02:** `plugin.json` está em `.claude-plugin/plugin.json` (não na raiz). Step `validate-structure` usa esse path.
- **DI-P01-03:** SHAs reutilizados do `harness.yml` existente: `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5` e `oven-sh/setup-bun@f4d14e03ff726c06358e5557344e1da148b56cf7`.

## Bugs Encontrados

- **GT-P01-01:** `bun run harness:validate` retorna exit 1 com falhas pré-existentes em `Infos/knowledge/Rails/rails-guides/references/` (arquivos externos importados de outro repo). Confirmado via git stash que falha existia antes da tarefa. Não é regressão desta fase.

## Learnings

- `Infos/agent-skills-main/.github/workflows/test-plugin-install.yml` usa tags floating (`@v4`, `@v6`) — referência de estrutura apenas, não de pinning.

## Desvios do Plano

*(nenhum — spec seguido exatamente)*

## Fase 02 — References Bootstrap

### Decisões de Implementação

- **DI-P01-04:** `testing-patterns.md` adaptado para Bun — `jest.mock()` module-level substituído por `mock.module()` do Bun. Nomes de testes sem "should" nos exemplos.
- **DI-P01-05:** `security-checklist.md` adaptou `npm audit` para `bun audit`.
- **DI-P01-06:** `accessibility-checklist.md` mantido fiel ao WCAG — universalmente válido, sem adaptações.
- **DI-P01-07:** README atualizado com seção `## Seeds Disponíveis` ao final — 4 seções originais preservadas intactas.

### Contagem de itens gerados

- `security-checklist.md`: 29 itens `[ ]` + tabela OWASP Top 10
- `accessibility-checklist.md`: 30 itens `[ ]` (keyboard/screen reader/visual/forms/content)
- `testing-patterns.md`: 16 itens `[ ]` + 9 anti-patterns

## Notas para Planos Seguintes

- GT-01: `bun run harness:validate` retorna exit 1 com falhas pré-existentes em `Infos/knowledge/Rails/` — não é regressão, ignorar.
- DI-GERAL-01: `plugin.json` fica em `.claude-plugin/plugin.json` (não na raiz).
- DI-GERAL-02: `generate:manifest` não existe em `package.json` — qualquer CI que precise verificar manifest deve usar `test -f plugin-manifest.json`.

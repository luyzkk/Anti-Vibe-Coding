# Plano 02 — New Skills

## Objetivo

Portar 2 skills de `Infos/agent-skills-main/` para o plugin + regenerar checksums de manifest.

## Fases

| # | Fase | Sizing |
|---|------|--------|
| 01 | Portar `incremental-implementation` | ~1h |
| 02 | Portar `code-simplification` | ~1h |
| 03 | Regenerar manifests + checksums | ~30min |

**Total estimado:** ~2.5h

## Dependências

- Plano 01 completo (registry limpo, harness verde)

## Exit Criteria

- [ ] `skills/incremental-implementation/SKILL.md` existe com frontmatter, telemetria e conteúdo completo
- [ ] `skills/code-simplification/SKILL.md` existe com frontmatter, telemetria e conteúdo completo
- [ ] `plugin-manifest.json` e `.claude-plugin/plugin.json` atualizados com checksums para ambas as skills
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde

## Princípio

copy-then-improve: copiar conteúdo integral da origem primeiro, depois adicionar frontmatter PT-BR e blocos de telemetria. Nunca adaptar para baixo.

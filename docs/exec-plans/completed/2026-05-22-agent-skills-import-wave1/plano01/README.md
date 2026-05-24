# Plano 01 — Infrastructure (Tracer Bullet)

## Objetivo

Estabelecer infraestrutura de CI para validação de instalação do plugin Anti-Vibe-Coding e
bootstrap de `docs/references/` com seed files externos operacionais.

## Resumo

| Campo | Valor |
|---|---|
| Nome | Plano 01 — Infrastructure (Tracer Bullet) |
| Estimativa | ~2h |
| Fases | 2 |
| Dependências | Nenhuma (primeiro plano da Wave 1) |
| Tracer Bullet | `fase-01` — `test-plugin-install.yml` prova que CI existe e valida a estrutura do plugin |

## Fases

### Fase 01 — GH Actions Install (~1h)

Cria `.github/workflows/test-plugin-install.yml` com 3 jobs em série:

1. `validate-structure` — verifica harness + `plugin.json`
2. `validate-manifest` — verifica checksums no `plugin-manifest.json`
3. `validate-tests` — roda `bun run test` + `bun run typecheck`

Este é o tracer bullet: a existência do arquivo YAML é a prova que a CI de instalação existe.
Qualquer falha na cadeia de jobs é observável imediatamente via GitHub Actions.

### Fase 02 — References Bootstrap (~1h)

Adiciona 3 seed files em `docs/references/` e atualiza o README existente:

- `docs/references/security-checklist.md` — checklist OWASP operacional
- `docs/references/accessibility-checklist.md` — checklist WCAG 2.0 AA
- `docs/references/testing-patterns.md` — padrões de teste para TypeScript/Bun

## Exit Criteria

- [ ] `.github/workflows/test-plugin-install.yml` existe e é YAML válido
- [ ] Actions pinadas a SHAs (sem tags floating)
- [ ] `docs/references/security-checklist.md` existe com ≥10 itens
- [ ] `docs/references/accessibility-checklist.md` existe com ≥8 itens (WCAG 2.0 AA)
- [ ] `docs/references/testing-patterns.md` existe com ≥8 padrões
- [ ] `docs/references/README.md` atualizado com referência aos seeds
- [ ] `docs/references/v5-legacy/` intocado
- [ ] `bun run harness:validate` verde após as mudanças

## Notas de Contexto

- `docs/references/` é para documentações EXTERNAS consultáveis (OWASP, WCAG, etc.)
- `docs/compound/` é para lições capturadas de bugs reais do projeto — não misturar
- References é proativo-externo; compound é reativo-local
- `docs/references/v5-legacy/` não deve ser tocado em hipótese alguma

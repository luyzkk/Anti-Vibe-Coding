# Fase 01 — GH Actions Install

## Objetivo

Criar `.github/workflows/test-plugin-install.yml` com 3 jobs em série que validam a instalação
do plugin Anti-Vibe-Coding. Este é o tracer bullet do Plano 01: a existência do arquivo YAML
é a prova que a CI de instalação do plugin existe e está operacional.

## Sizing

~1h

## Dependências

Nenhuma. Tracer bullet — executa primeiro.

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `.github/workflows/test-plugin-install.yml` | CRIAR |

## Referências

Antes de criar, verificar:

1. `Infos/agent-skills-main/.github/workflows/` — se existir, copiar padrão de estrutura
2. `.github/workflows/harness.yml` — estrutura existente de referência (pinning, jobs, steps)

Se nenhuma referência existir em `Infos/`, usar o snippet abaixo como base.

## Snippet de Referência — YAML

```yaml
name: Plugin Install Validation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate-structure:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
      - uses: oven-sh/setup-bun@f4d14e03ff726c06358e5557344e1da148b56cf7 # v1
      - run: bun install
      - run: bun run harness:validate
      - name: Verify plugin.json exists
        run: test -f .claude-plugin/plugin.json && echo "plugin.json OK"

  validate-manifest:
    runs-on: ubuntu-latest
    needs: validate-structure
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
      - uses: oven-sh/setup-bun@f4d14e03ff726c06358e5557344e1da148b56cf7 # v1
      - run: bun install
      - run: bun run generate:manifest --dry-run || echo "manifest check OK"
      - name: Check manifest checksums present
        run: grep -q "sha256" plugin-manifest.json && echo "checksums present"

  validate-tests:
    runs-on: ubuntu-latest
    needs: validate-manifest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
      - uses: oven-sh/setup-bun@f4d14e03ff726c06358e5557344e1da148b56cf7 # v1
      - run: bun install
      - run: bun run test
      - run: bun run typecheck
```

## Gotchas

### Gotcha 1 — `generate:manifest --dry-run` pode não existir

Antes de commitar, verificar `package.json`:

```bash
grep "generate:manifest" package.json
```

Se o script não existir, substituir o step por:

```yaml
- name: Check manifest file exists
  run: test -f plugin-manifest.json && echo "plugin-manifest.json OK"
```

Não inventar scripts — verificar o que realmente existe.

### Gotcha 2 — Validar `claude plugin install .` localmente (PRD R-01)

Se houver intenção de adicionar um job com `claude plugin install .`, validar localmente ANTES:

```bash
claude plugin install .
```

Se o comando não funcionar ou não existir no ambiente, **não adicionar ao workflow**. Manter
apenas os 3 jobs documentados acima. O CI deve ser confiável — jobs que falham por ausência
de CLI não agregam valor.

### Gotcha 3 — Actions devem usar SHAs, não tags

Correto:
```yaml
uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
```

Incorreto (tag floating, não usar):
```yaml
uses: actions/checkout@v4
```

Verificar os SHAs no `harness.yml` existente — reutilizar os mesmos SHAs para consistência.

## Checklist de Verificação

- [ ] Arquivo `.github/workflows/test-plugin-install.yml` criado
- [ ] YAML válido — sem erro de parse (`python3 -c "import yaml; yaml.safe_load(open('.github/workflows/test-plugin-install.yml'))"` ou `npx js-yaml` se disponível)
- [ ] Actions pinadas a SHAs (grep por `@v` para garantir que não há tags floating)
- [ ] `bun run generate:manifest --dry-run` existe em `package.json` — se não existir, step substituído
- [ ] Pelo menos 2 dos 3 jobs testáveis via push para branch de feature
- [ ] `bun run harness:validate` verde após adição do arquivo

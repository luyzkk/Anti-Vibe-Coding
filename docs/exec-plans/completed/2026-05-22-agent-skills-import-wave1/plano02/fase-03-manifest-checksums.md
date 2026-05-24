# Fase 03 — Regenerar Manifests + Checksums

## Objetivo

Regenerar `plugin-manifest.json` e `.claude-plugin/plugin.json` com checksums das 2 novas skills e validar suite completa.

## Arquivos Afetados

- `plugin-manifest.json`
- `.claude-plugin/plugin.json`

## Processo

### Passo 1 — Identificar o script de geração

```bash
grep -r "generate:manifest\|manifest\|checksum" package.json
```

Identificar o comando exato (ex: `bun run generate:manifest`, `bun run manifest`, etc.).

### Passo 2 — Rodar o script

```bash
bun run generate:manifest
```

(ou o comando identificado no Passo 1)

### Passo 3 — Verificar output

Confirmar que as 2 novas skills aparecem no manifest com campo `sha256` preenchido:

```bash
grep -A3 "incremental-implementation" plugin-manifest.json
grep -A3 "code-simplification" plugin-manifest.json
```

Ambos devem retornar entries com `sha256` não-vazio.

### Passo 4 — Validação do harness

```bash
bun run harness:validate
```

Deve passar sem erros. Se falhar:
- Erro de checksum: re-rodar o script de geração
- Erro de estrutura: investigar qual campo está faltando no frontmatter das skills

### Passo 5 — Suite de testes

```bash
bun run test
```

Deve passar. Se novos testes falharem por conta das skills adicionadas, investigar antes de considerar a fase concluída.

## Sizing

~30min

## Checklist de Conclusão

- [ ] `plugin-manifest.json` contém entry para `incremental-implementation` com `sha256` presente
- [ ] `plugin-manifest.json` contém entry para `code-simplification` com `sha256` presente
- [ ] `.claude-plugin/plugin.json` reflete ambas as skills
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde
- [ ] Nenhum erro de lint pendente

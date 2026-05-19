---
title: "fs.cp rejeita destination dentro de source ANTES do filter ser avaliado"
category: bug
tags: [nodejs, fs, recursive-copy, fixtures, init, e2e]
created: 2026-05-19
---

## Problem

`fs.cp(src, dst, { recursive: true, filter })` lança `ERR_FS_CP_EINVAL: Cannot copy src to a subdirectory of self` quando `dst` é descendente de `src` — **mesmo que o `filter` retornaria `false` para a pasta de conflito**. O check de subdir acontece ANTES de qualquer chamada ao filter.

Cenário concreto em init E2E: fixture `tests/e2e/__fixtures__/init-greenfield/` contém `docs/compound/_imported/` (pasta gerada pelo Step 13 do init que se quer testar). Ao copiar fixture para tmpdir e depois rodar init, o init tenta copiar `template/docs/compound/_imported/` PARA `<tmpdir>/docs/compound/_imported/` — paths não-conflitantes em runtime, mas em testes de copy idempotente o autor tentou `fs.cp(fixtureDir, fixtureDir/subdir, { filter: excluirSubdir })` e o filter nunca foi chamado.

Plano 05 fase-04 descobriu durante geração de goldens.

## Solution

Não usar `fs.cp` quando `dst` pode estar dentro de `src`. Padrão correto:

1. Copiar `src` para tmpdir externo: `fs.cp(src, externalTmp, { recursive: true })`
2. `fs.rename(externalTmp, dst)` para mover ao destino interno

```typescript
import { tmpdir } from 'node:os'
import { mkdtemp, cp, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

// ERRADO: rejeita antes de chamar filter
await fs.cp(srcDir, join(srcDir, 'inner'), {
  recursive: true,
  filter: (p) => !p.includes('inner'), // nunca chamado
})

// CERTO: copia externamente, depois move
const external = await mkdtemp(join(tmpdir(), 'cp-'))
try {
  await cp(srcDir, external, { recursive: true })
  await rename(external, join(srcDir, 'inner'))
} catch (e) {
  await rm(external, { recursive: true, force: true })
  throw e
}
```

## Prevention

**Regra:** `fs.cp` com `dst ⊆ src` é proibido pelo Node — não tente contornar com `filter`. Se você precisa do efeito "copiar tudo exceto X para dentro de mim mesmo", use staging em tmpdir externo.

**Checklist ao manipular fixtures recursivos:**
1. Verifique se `path.relative(src, dst)` começa com `..` (dst fora de src) — só nesse caso `fs.cp` é seguro
2. Se dst dentro de src: tmpdir + rename
3. Lembre-se de cleanup do tmpdir em catch (filesystem fica suja se mover falhar)

**Sinal de alerta:** erro `ERR_FS_CP_EINVAL` ou stack trace mencionando `validateCopyOperation` no Node — o filter nunca rodará, refatore para staging.

**Aplicável a:** geração de fixtures E2E que duplicam pastas com exclusões parciais, testes que regeneram goldens dentro do mesmo árvore, scripts de migração in-place.

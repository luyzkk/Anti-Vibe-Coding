<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Centralizar workaround DI-06 / GT-04 no dispatcher

**Plano:** 01 — Foundation + Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-02
**Visual:** false

---

## O que esta fase entrega

Padrao `await import('./path.ts')` (workaround DI-06/GT-04 — `bun -e` com paths absolutos quebra
no Windows) centralizado no boundary do dispatcher e documentado num helper `lazy-import.ts`.
Steps individuais (e quem porta steps nos Planos 02/03) deixam de lidar com isso. Validado por
teste com fixture Windows-like (path com barras invertidas e drive letter).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/lazy-import.ts` | Create | Helper `lazyImport` documentando o pattern + tipo seguro |
| `skills/init/lib/lazy-import.test.ts` | Create | Testes com path Windows-like |
| `skills/init/lib/run-init.ts` | Modify | Trocar `await import('./registry')` por `lazyImport(() => import('./registry'))` |

---

## Implementacao

### Passo 1: Criar `lazy-import.ts`

Objetivo: padronizar e nomear o workaround. Hoje o codigo no dispatcher diz `await import(...)`
direto — funciona, mas nao comunica POR QUE. O helper torna a intencao explicita e centraliza
qualquer ajuste futuro (ex: retry, log).

```typescript
// skills/init/lib/lazy-import.ts

/**
 * Carrega um modulo via import dinamico, preservando tipos do callback.
 * Existe para centralizar o workaround GT-04 / DI-06:
 *   `bun -e "import('/abs/path/file.ts')"` quebra no Windows quando o path absoluto
 *   tem drive-letter e backslashes. Fora de blocos `bun -e`, `await import('./relative.ts')`
 *   funciona em todas as plataformas — desde que feito com path RELATIVO e em arquivo .ts.
 *
 * Regra: o boundary do dispatcher usa `lazyImport(() => import('./modulo'))`.
 * Steps individuais importam estaticamente — nao precisam deste helper.
 *
 * @example
 * const { registry } = await lazyImport(() => import('./registry'))
 */
export function lazyImport<T>(loader: () => Promise<T>): Promise<T> {
  return loader()
}
```

> Nota: a implementacao eh trivial (chama o callback). O VALOR esta no nome + JSDoc + grep-ability.
> Se algum dia precisar de retry ou log, a mudanca eh local. NAO eh over-engineering — eh um ponto
> de costura nomeado, o que satisfaz o "elegancia balanceada" do CLAUDE.md.

### Passo 2: Refatorar `run-init.ts` para usar `lazyImport`

Substituir a linha:
```typescript
const reg = injectedRegistry ?? (await import('./registry')).registry
```
por:
```typescript
// 2026-05-17 (Luiz/dev): lazyImport documenta DI-06/GT-04 — Windows safety boundary.
const reg = injectedRegistry ?? (await lazyImport(() => import('./registry'))).registry
```
e acrescentar o import no topo:
```typescript
import { lazyImport } from './lazy-import'
```

### Passo 3: Testes (`lazy-import.test.ts`)

A unica forma de "testar Windows" deterministicamente eh usar paths que CONTEM separadores
Windows e drive-letters, mesmo rodando em outro SO. O teste valida que:
1. `lazyImport` preserva o valor do modulo importado;
2. Erros do import sao propagados;
3. Paths relativos funcionam (que eh o contrato real do helper — nunca passamos absolutos).

```typescript
// skills/init/lib/lazy-import.test.ts
import { describe, test, expect } from 'bun:test'
import { lazyImport } from './lazy-import'

describe('lazyImport', () => {
  test('returns the module exports', async () => {
    // Importa o proprio modulo de tipos — sabidamente carregavel.
    const mod = await lazyImport(() => import('./steps/types'))
    expect(mod).toBeDefined()
  })

  test('propagates import errors', async () => {
    // 2026-05-17 (Luiz/dev): forca erro com path inexistente — sem barras invertidas para
    // nao confundir o resolver; o objetivo eh comportamento do helper, nao do FS.
    await expect(lazyImport(() => import('./does-not-exist-xyz'))).rejects.toThrow()
  })

  test('relative path works (the contract we promise)', async () => {
    // 2026-05-17 (Luiz/dev): GT-04 — sempre path relativo dentro do helper. Se algum chamador
    // passar absoluto (`/abs/...` ou `C:\\abs\\...`), o quebrar eh aceitavel porque viola contrato.
    const mod = await lazyImport(() => import('./parse-flags'))
    expect(typeof mod.parseFlags).toBe('function')
  })
})
```

### Passo 4: Smoke teste de integracao com Windows-like cwd

Validar que o dispatcher inteiro tolera `cwd` com formato Windows-ish quando passado
explicitamente (mesmo rodando em outro SO, o codigo nao deve preprocessar o cwd).

Adicionar UM teste ao `run-init.test.ts` ja existente (fase-02):

```typescript
// Append em skills/init/lib/run-init.test.ts
import type { Step } from './steps/types'

test('accepts Windows-style cwd verbatim (no path mangling)', async () => {
  let seenCwd: string | undefined
  const probe: Step = {
    id: 'probe-cwd',
    async run(ctx) { seenCwd = ctx.cwd; return { mutated: false, summary: '' } },
  }
  // 2026-05-17 (Luiz/dev): cwd nao eh tocado pelo dispatcher — repassado ao step inalterado.
  // Isso garante que portar para Windows nao requer mudanca no dispatcher (DI-06 e sobre IMPORT,
  // nao sobre cwd, mas a confianca ajuda).
  await runInit([], { registry: [probe], cwd: 'C:\\Users\\luiz\\projeto', log: () => {} })
  expect(seenCwd).toBe('C:\\Users\\luiz\\projeto')
})
```

---

## Gotchas

- **G2 do plano (DI-06/GT-04):** o workaround eh sobre `bun -e` com paths absolutos em strings de
  shell — NAO sobre `await import` em codigo TS. Esta fase centraliza o pattern correto para que
  ninguem cai no anti-pattern (`bun -e "import('/abs/...')"`). O helper `lazyImport` eh um
  marcador semantico: vai sinalizar revisao se algum dev introduzir o anti-pattern.
- **Local — over-engineering tentador:** ha vontade de adicionar retry/log/timeout ao
  `lazyImport`. NAO ADICIONAR agora. O proprio CLAUDE.md ("nao super-engenheirar") manda esperar
  pedido real. Este helper existe pelo nome e pela documentacao; logica trivial eh feature.
- **Local — teste de `does-not-exist`:** `import('./does-not-exist-xyz')` no Bun pode jogar
  `ResolveMessage` em vez de `Error` plain. `rejects.toThrow()` aceita ambos. Se falhar, ajustar
  para `rejects.toThrow(/cannot|not.found/i)`.

---

## Verificacao

### TDD

- [ ] **RED:** Testes de `lazyImport` escritos. Falham por modulo nao encontrado.
  - Comando: `bun run test skills/init/lib/lazy-import.test.ts`
  - Resultado esperado: erro de modulo (antes de criar)

- [ ] **GREEN:** Implementar `lazy-import.ts`, refatorar `run-init.ts`, testes passam.
  - Comando: `bun run test skills/init/lib/`
  - Resultado esperado: testes de fase-02 + fase-03 ainda passam + 3 novos (lazyImport) + 1 novo (windows-style cwd)

### Checklist

- [ ] `skills/init/lib/lazy-import.ts` criado, exporta `lazyImport`
- [ ] `skills/init/lib/run-init.ts` agora importa e usa `lazyImport`
- [ ] Testes de `lazy-import` passam (3 testes)
- [ ] Teste extra de Windows-style cwd em `run-init.test.ts` passa
- [ ] Testes ANTERIORES de `run-init.test.ts` continuam passando (regressao zero)
- [ ] Testes de `00-detect-legacy.test.ts` continuam passando (regressao zero)
- [ ] Lint limpo: `bun run lint skills/init/lib/`
- [ ] `grep -rn 'bun -e' skills/init/` retorna apenas comentarios/docs — NAO codigo
- [ ] `grep -rn 'await import' skills/init/lib/` mostra que o unico uso esta dentro de `lazyImport` ou
      acompanhado de comentario de provenance explicando o porque

---

## Criterio de Aceite

Workaround DI-06/GT-04 nomeado e centralizado. Dispatcher usa o helper. Anti-pattern (`bun -e`
com path absoluto) fica visivel ao grep e portanto auditavel.

**Por maquina:**
- `bun run test skills/init/lib/` exit 0 com TODOS os testes do plano passando (>= 11 testes)
- `grep -c lazyImport skills/init/lib/run-init.ts` retorna >= 1
- `grep -rn 'bun -e' skills/init/lib/ --include='*.ts'` retorna 0 matches (apenas em .md de docs)

**Por humano:**
- Code review: o JSDoc de `lazyImport` deixa ABSOLUTAMENTE claro por que o helper existe (nao
  parece trivial sem o comentario — esse eh o ponto).

---

<!-- Gerado por /plan-feature em 2026-05-17 -->

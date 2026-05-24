<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou secao do PRD).
-->

# Fase 05: AbortError — Promover Warning para Erro Bloqueante

**Plano:** 01 — Cutover Foundation + Distribuicao
**Sizing:** ~1h
**Depende de:** fase-03 (paths e mensagens corretos em copy-knowledge.ts)
**Visual:** false

---

## O que esta fase entrega

O branch `sourceExists === false` com `primary !== null` em `copy-knowledge.ts` deixa de retornar
`status: 'no-source'` e passa a lancar `AbortError`. O caller
`03_1-persist-stack-and-knowledge.ts` propaga o abort naturalmente. CA-10 (AbortError quando matrix
ausente) verificado. CA-13 (path traversal → `no-source`) preservado e distinto do AbortError.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/copy-knowledge.ts` | Modify | Branch `sourceExists === false` com primary != null: retorno → AbortError |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` | Modify | Verificar que AbortError propagado corretamente (sem catch silencioso) |

---

## Implementacao

### Passo 1: Verificar o caller (03_1-persist-stack-and-knowledge.ts)

Antes de modificar `copy-knowledge.ts`, ler o caller para entender como a excecao propagaria:

```bash
cat F:\Projetos\Anti-Vibe-Coding\skills\init\lib\steps\03_1-persist-stack-and-knowledge.ts
```

Verificar:
- O caller tem `try/catch` em torno de `copyKnowledge()`?
- Se sim: o catch re-lanca `AbortError` ou o engole?
- AbortError deve ser propagado para o runner do `/init` abortar a execucao.

Se o caller tiver `catch (e) { ... }` que nao re-lanca `AbortError`, adicionar:

```typescript
// 2026-05-20 (Luiz/dev): D4 do PRD knowledge-path-cutover — AbortError de copyKnowledge deve
// propagar (matrix ausente com stack detectada e erro bloqueante, nao aviso).
} catch (e: unknown) {
  if (e instanceof AbortError) throw e  // Re-lanca — nao engolir
  // ... resto do catch existente
}
```

### Passo 2: Escrever teste para AbortError (RED — CA-10)

Localizar `copy-knowledge.test.ts` e adicionar:

```typescript
// 2026-05-20 (Luiz/dev): D4/SH-01 do PRD knowledge-path-cutover — AbortError quando primary != null
// mas matrix ausente no plugin. Antes retornava 'no-source' (warning silencioso); agora lanca AbortError.
// CA-10: primary detectado + matrix ausente = erro bloqueante.
describe('AbortError when detected stack has no matrix (CA-10)', () => {
  it('throws AbortError when primary is valid but sourceDir does not exist', async () => {
    // pluginRoot aponta para um dir sem knowledge/rails/
    const tmpPlugin = await fs.mkdtemp(path.join(os.tmpdir(), 'ck-test-'))
    // Criar knowledge/ mas SEM subpasta rails/
    await fs.mkdir(path.join(tmpPlugin, 'knowledge', 'nodejs-typescript'), { recursive: true })
    await fs.writeFile(path.join(tmpPlugin, 'knowledge', 'nodejs-typescript', 'INDEX.md'), '')

    const targetDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ck-target-'))

    await expect(
      copyKnowledge({
        targetDir,
        pluginRoot: tmpPlugin,
        primary: 'rails' as MatrixFolder,
      })
    ).rejects.toThrow(AbortError)

    // Cleanup
    await fs.rm(tmpPlugin, { recursive: true, force: true })
    await fs.rm(targetDir, { recursive: true, force: true })
  })
})
```

Rodar e confirmar RED:
```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test copy-knowledge --grep "AbortError"
```
Resultado esperado: `1 failed` — o teste falha porque o codigo atual retorna `{ status: 'no-source' }`
em vez de lancar `AbortError`.

### Passo 3: Verificar que CA-13 (path traversal) continua retornando no-source (nao AbortError)

Antes de modificar o codigo, confirmar a diferenca semantica:

| Caso | Comportamento esperado |
|------|------------------------|
| `primary = '../etc'` (VALID_PRIMARY falha) | `return { status: 'no-source', ... }` — NAO AbortError |
| `primary = 'foo/bar'` (VALID_PRIMARY falha) | `return { status: 'no-source', ... }` — NAO AbortError |
| `primary = 'rails'` (valido) + `sourceDir` nao existe | `throw new AbortError(...)` |
| `primary = null` (stack nao detectada) | `return { status: 'no-matrix', ... }` — NAO AbortError |

### Passo 4: Implementar AbortError no branch sourceExists === false (GREEN)

Adicionar import de `AbortError` no topo de `copy-knowledge.ts` se ainda nao existir:

```typescript
import { AbortError } from './steps/abort-error'
```

Verificar o import path correto:
```bash
ls F:\Projetos\Anti-Vibe-Coding\skills\init\lib\steps\abort-error.ts
```

Modificar o branch `sourceExists === false` (linhas 71-79 atuais, pos fase-03):

**Antes:**
```typescript
  const sourceExists = await fs.access(sourceDir).then(() => true).catch(() => false)
  if (!sourceExists) {
    return {
      status: 'no-source',
      atomCount: 0,
      // 2026-05-20 (Luiz/dev): D1/D9 do PRD knowledge-path-cutover — path base mudou para knowledge/
      message: `Matrix '${primary}' não existe em knowledge/${primary}/. Knowledge não foi copiado.`,
      destDir,
    }
  }
```

**Depois:**
```typescript
  const sourceExists = await fs.access(sourceDir).then(() => true).catch(() => false)
  if (!sourceExists) {
    // 2026-05-20 (Luiz/dev): D4/SH-01 do PRD knowledge-path-cutover — AbortError bloqueante.
    // primary != null (stack detectada) + matrix ausente = erro critico: /init nao pode continuar
    // sem knowledge atoms (skills downstream receberiam guidance generica).
    // Distinto de CA-13 (path traversal VALID_PRIMARY) que permanece como no-source.
    throw new AbortError({
      code: 1,
      reason: `Matrix '${primary}' não encontrada em knowledge/${primary}/. Re-sincronize o plugin: sync-to-global.sh`,
    })
  }
```

### Passo 5: Verificar que CA-13 permanece intacto (GREEN para path traversal)

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test copy-knowledge --grep "no-source"
```

Testes de path traversal devem continuar retornando `status: 'no-source'` (nao AbortError).

### Passo 6: Rodar todos os testes de copy-knowledge

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test copy-knowledge
```

Resultado esperado: CA-10 passa (AbortError lancado), CA-13 passa (no-source para path traversal).

### Passo 7: Verificar o caller

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test --grep "03_1-persist" 2>/dev/null || bun test 03_1
```

Se o caller tiver testes, confirmar que AbortError propaga corretamente (nao e engolido).

### Passo 8: Rodar suite completa

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun run test && bun run lint
```

### Passo 9: Commitar

```bash
git add skills/init/lib/copy-knowledge.ts skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts
git commit -m "feat: promote copy-knowledge silent warning to AbortError when detected stack has no matrix"
```

---

## Gotchas

- **G9 do plano (AbortError e CA-13 sao ortogonais):** O path traversal (VALID_PRIMARY falha) continua retornando `{ status: 'no-source' }` — NAO lanca AbortError. AbortError so e lancado quando `primary` e VALIDO (passa VALID_PRIMARY) MAS `sourceDir` nao existe. Estes sao dois casos semanticamente distintos: path traversal e input invalido do caller; matrix ausente e erro de configuracao do plugin.

- **Local (import path de AbortError):** O import deve ser `from './steps/abort-error'` se `copy-knowledge.ts` esta em `skills/init/lib/`. Verificar o caminho real com `ls` antes de adicionar o import.

- **Local (AbortError constructor signature):** Verificar a assinatura do construtor em `abort-error.ts` antes de criar a instancia. O snippet acima assume `new AbortError({ code: number, reason: string })` — confirmar que e essa a API.

- **Local (caller catch block):** Se `03_1-persist-stack-and-knowledge.ts` tiver um `try/catch` abrangente, o `AbortError` pode ser engolido silenciosamente. Verificar e re-lancar se necessario (ver Passo 1).

---

## Verificacao

### TDD

- [ ] **RED:** Teste `AbortError when detected stack has no matrix` falha com `Expected function to throw`
  - Comando: `bun test copy-knowledge --grep "AbortError"`
  - Resultado esperado: `1 failed` — funcao retorna `{ status: 'no-source' }` em vez de throw

- [ ] **GREEN:** Apos implementacao, teste passa E testes de CA-13 continuam passando
  - Comando: `bun test copy-knowledge`
  - Resultado esperado: todos os testes passam

### Checklist

- [ ] `bun test copy-knowledge --grep "AbortError"` passa (CA-10)
- [ ] `bun test copy-knowledge --grep "no-source"` passa (CA-13 intacto)
- [ ] Import de `AbortError` adicionado em `copy-knowledge.ts` (ou ja existia)
- [ ] `primary = null` ainda retorna `{ status: 'no-matrix' }` (nao AbortError)
- [ ] Caller `03_1-persist-stack-and-knowledge.ts` propaga AbortError (nao engolido)
- [ ] `bun run test` — sem regressoes novas
- [ ] `bun run lint` — sem erros novos

---

## Criterio de Aceite

**CA-10 (AbortError quando matrix ausente):**

```bash
bun test copy-knowledge --grep "AbortError"
```

Retorna `1 passed`.

**CA-13 (path traversal guard intacto — verificacao pos-fase):**

```bash
bun test copy-knowledge --grep "no-source"
```

Testes de path traversal (`'../etc'`, `'foo/bar'`) continuam retornando `status: 'no-source'`
(nao AbortError) — comportamento identico ao pre-cutover.

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

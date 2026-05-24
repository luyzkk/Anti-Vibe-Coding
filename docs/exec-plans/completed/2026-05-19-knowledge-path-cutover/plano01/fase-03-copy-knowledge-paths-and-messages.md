<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou secao do PRD).
-->

# Fase 03: copy-knowledge.ts — Mensagens + Guards Completos

**Plano:** 01 — Cutover Foundation + Distribuicao
**Sizing:** ~45min
**Depende de:** fase-01 (path base ja atualizado na linha 58; `git mv` concluido)
**Visual:** false

---

## O que esta fase entrega

Atualiza as mensagens de erro em `copy-knowledge.ts` que ainda mencionam `docs/knowledge/`
(linhas 53, 68, 76) e a string no defense-in-depth guard. Atualiza o comentario em
`state-md-init.ts`. Garante que CA-13 (path traversal guard intacto) continua passando.
Apos esta fase, `copy-knowledge.ts` e completamente consistente com o path novo.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/copy-knowledge.ts` | Modify | Linhas 53, 62-68, 76: strings `docs/knowledge/` → `knowledge/` |
| `skills/init/lib/state-md-init.ts` | Modify | Comentario na linha ~21: `docs/knowledge/` → `knowledge/` |

---

## Implementacao

### Passo 1: Escrever/atualizar testes de path traversal (RED/GREEN — CA-13)

Localizar o arquivo de testes de `copy-knowledge.ts`:

```bash
ls F:\Projetos\Anti-Vibe-Coding\skills\init\lib\__tests__\ 2>/dev/null || ls F:\Projetos\Anti-Vibe-Coding\skills\init\lib\copy-knowledge.test.ts 2>/dev/null
```

Verificar se os testes existentes de path traversal (CA-13) ainda passam ANTES de editar:

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test --grep "path traversal" 2>/dev/null || bun test --grep "VALID_PRIMARY" 2>/dev/null || bun test copy-knowledge
```

Se os testes existentes passam: a fase-03 nao deve quebrá-los. Confirmar apos as mudancas.

Se os testes de CA-13 nao existem ainda: criar snippet de teste RED ANTES de editar o codigo:

```typescript
// 2026-05-20 (Luiz/dev): D9/CA-13 do PRD knowledge-path-cutover — path traversal guard preservado 1:1.
// Guard rejeita primary com ../ ou separadores. Mensagem deve mencionar a regex (VALID_PRIMARY.source).
it('returns no-source for primary with path traversal attempt (CA-13)', async () => {
  const result = await copyKnowledge({
    targetDir: tmpDir,
    pluginRoot: PLUGIN_ROOT,
    primary: '../etc' as MatrixFolder,
  })
  expect(result.status).toBe('no-source')
  expect(result.message).toContain(VALID_PRIMARY_SOURCE) // regex source deve aparecer na mensagem
})

it('returns no-source for primary with slash separator (CA-13)', async () => {
  const result = await copyKnowledge({
    targetDir: tmpDir,
    pluginRoot: PLUGIN_ROOT,
    primary: 'foo/bar' as MatrixFolder,
  })
  expect(result.status).toBe('no-source')
})
```

### Passo 2: Atualizar mensagens de erro em copy-knowledge.ts

**Estado atual das linhas afetadas (pos fase-01):**

Linha 53 (mensagem do VALID_PRIMARY guard):
```typescript
      message: `Matrix '${primary}' tem id inválido (deve casar ${VALID_PRIMARY.source}). Knowledge não foi copiado.`,
```
Esta mensagem nao menciona `docs/knowledge/` — nao precisa de alteracao de path, mas se houver
alguma mensagem com `docs/knowledge/` aqui, atualizar.

Linha 62-68 (defense-in-depth guard — mensagem usa `sourceDir`):
```typescript
    return {
      status: 'no-source',
      atomCount: 0,
      message: `sourceDir escapa docs/knowledge/: ${sourceDir}. Knowledge não foi copiado.`,
      destDir,
    }
```

**Atualizar para:**
```typescript
    return {
      status: 'no-source',
      atomCount: 0,
      // 2026-05-20 (Luiz/dev): D9 do PRD knowledge-path-cutover — mensagem atualizada para knowledge/
      message: `sourceDir escapa knowledge/: ${sourceDir}. Knowledge não foi copiado.`,
      destDir,
    }
```

Linha 76 (mensagem quando sourceDir nao existe — primary valido mas matrix ausente):
```typescript
      message: `Matrix '${primary}' não existe em docs/knowledge/${primary}/. Knowledge não foi copiado.`,
```

**Atualizar para:**
```typescript
      // 2026-05-20 (Luiz/dev): D1/D9 do PRD knowledge-path-cutover — path base mudou para knowledge/
      message: `Matrix '${primary}' não existe em knowledge/${primary}/. Knowledge não foi copiado.`,
```

**ATENCAO:** Esta mensagem sera substituida por `AbortError` na fase-05 (quando `primary !== null`).
Nesta fase, apenas atualizamos o texto para consistencia. A remocao do retorno e a conversao para
AbortError e escopo da fase-05.

### Passo 3: Atualizar comentario em state-md-init.ts

```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\skills\init\lib\state-md-init.ts
```

Localizar a linha ~21 que menciona `docs/knowledge/`. Atualizar o comentario:

```typescript
// Antes (exemplo aproximado):
// knowledge/ foi copiado de docs/knowledge/{primary}/ para .claude/knowledge/{primary}/

// Depois:
// 2026-05-20 (Luiz/dev): D1 do PRD knowledge-path-cutover — path atualizado
// knowledge/ foi copiado de knowledge/{primary}/ para .claude/knowledge/{primary}/
```

**Verificar o conteudo real antes de editar** — o comentario exato pode diferir do exemplo acima.
O importante e substituir qualquer referencia a `docs/knowledge/` que represente o path DO PLUGIN
(nao do target).

### Passo 4: Verificar CA-13 (path traversal guard intacto)

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test copy-knowledge
```

Todos os testes de path traversal devem passar. O guard `VALID_PRIMARY` e a logica de defense-in-depth
nao foram alterados — apenas as strings nas mensagens.

### Passo 5: Rodar suite completa

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun run test && bun run lint
```

### Passo 6: Commitar

```bash
git add skills/init/lib/copy-knowledge.ts skills/init/lib/state-md-init.ts
git commit -m "fix: update copy-knowledge error messages and defense-in-depth string to knowledge/"
```

---

## Gotchas

- **G2 do plano (defense-in-depth menciona `docs/knowledge`):** A mensagem na linha 62-68 menciona `docs/knowledge/` no texto "sourceDir escapa docs/knowledge/". A LOGICA de defense-in-depth ja esta correta desde a fase-01 (a variavel `knowledgeBase` ja aponta para `knowledge/`). O que muda aqui e apenas o texto da mensagem — nao a logica.

- **G1 do plano (falsa substituicao em migrate-claude-artifacts):** Esta fase NAO toca `migrate-claude-artifacts.ts`. Confirmar antes de commitar que `migrate-claude-artifacts.ts` nao foi alterado.

- **Local (state-md-init.ts: verificar conteudo real):** O comentario na linha ~21 pode estar em formato diferente do esperado. Ler o arquivo antes de editar para nao introduzir inconsistencia.

- **Local (VALID_PRIMARY guard nao menciona path — nao alterar):** A mensagem na linha 53 menciona a regex VALID_PRIMARY mas nao menciona `docs/knowledge/`. Nao alterar esta mensagem alem do necessario.

---

## Verificacao

### TDD

- [ ] **RED (se testes de CA-13 inexistentes):** Testes de path traversal escritos falham inicialmente (compilation OK)
  - Rodar: `bun test copy-knowledge`

- [ ] **GREEN:** Testes de CA-13 passam com o codigo existente (guard intacto)
  - Comando: `bun test copy-knowledge`
  - Resultado esperado: testes de `no-source` para `'../etc'` e `'foo/bar'` passam

### Checklist

- [ ] `grep "docs/knowledge" skills/init/lib/copy-knowledge.ts` retorna zero linhas (exceto talvez comentarios historicos com provenance)
- [ ] `grep "docs/knowledge" skills/init/lib/state-md-init.ts` retorna zero linhas apos update
- [ ] `grep "docs/knowledge" skills/init/lib/migrate-claude-artifacts.ts` retorna a linha intencional (target-side — PRESERVADA, ver G1)
- [ ] Testes de path traversal passam: `bun test copy-knowledge --grep "no-source"`
- [ ] `bun run test` — sem regressoes novas
- [ ] `bun run lint` — sem erros novos

---

## Criterio de Aceite

**CA-13 (path traversal guard intacto):**

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test copy-knowledge --grep "no-source"
```

Testes retornam `status: 'no-source'` para `primary = '../etc'` e `primary = 'foo/bar'`
(comportamento identico ao pre-cutover).

**Por maquina (grep):**
```bash
grep -n "docs/knowledge" skills/init/lib/copy-knowledge.ts
```
Retorna zero linhas de producao (exceto comentarios de provenance se houver).

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

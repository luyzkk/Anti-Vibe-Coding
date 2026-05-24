<!--
Principio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisao ou secao do PRD).
-->

# Fase 06: Fixtures, Tests e Goldens — Atualizacao e Regeneracao

**Plano:** 01 — Cutover Foundation + Distribuicao
**Sizing:** ~1.5h
**Depende de:** fase-01 (path novo), fase-02 (bump 6.6.0), fase-03 (mensagens corretas), fase-05 (AbortError)
**Visual:** false

---

## O que esta fase entrega

Os 9 arquivos de teste/fixtures que referenciam `docs/knowledge/{stack}/` sao atualizados para
`knowledge/{stack}/`. `harness-validate.ts:checkKnowledgePresence` aponta para `knowledge/`.
Goldens E2E regenerados. `bun run harness:validate` passa. CA-05 e CA-15 verificados.
`migrate-claude-artifacts.ts:45` PRESERVADO (target-side path — nao alterar).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/harness-validate.ts` | Modify | Linha 659: `path.join(base, 'docs', 'knowledge')` → `path.join(base, 'knowledge')` |
| `tests/harness-validate-knowledge.test.ts` | Modify | 7 referencias a `docs/knowledge/nodejs-typescript/` → `knowledge/nodejs-typescript/` |
| `skills/init/lib/copy-knowledge.test.ts` | Modify | Fixtures que usam `docs/knowledge/` como pluginRoot subpath |
| `skills/init/lib/atoms-frontmatter-schema.test.ts` | Modify | Caminho de fixtures de atoms |
| `tests/e2e/atoms-rf11-audit.test.ts` | Modify | Caminho de fixtures de atoms |
| `skills/init/lib/run-stack-knowledge-init.test.ts` | Modify | Caminho de knowledge no pluginRoot mock |
| `tests/e2e/stack-knowledge-full-e2e.test.ts` | Modify | Caminho de knowledge no setup do E2E |
| `tests/e2e/stack-knowledge-rails-full.test.ts` | Modify | Caminho de knowledge no setup do E2E |
| `skills/init/lib/migrate-claude-artifacts.test.ts` | **PRESERVAR** `docs/knowledge/legacy-claude-knowledge/` | Target-side path — NAO alterar |
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Modify | Regenerar se golden contem `docs/knowledge/` |

---

## Implementacao

### Passo 1: Mapear todas as ocorrencias (antes de alterar qualquer coisa)

```bash
cd F:\Projetos\Anti-Vibe-Coding && grep -rn "docs/knowledge" --include="*.ts" --include="*.txt" . | grep -v ".git" | grep -v "node_modules"
```

O resultado deve mostrar os 9 arquivos. Verificar:
1. `scripts/harness-validate.ts` — prodution, deve ser alterado
2. `skills/init/lib/copy-knowledge.test.ts` — test, deve ser alterado
3. `skills/init/lib/atoms-frontmatter-schema.test.ts` — test, deve ser alterado
4. `tests/e2e/atoms-rf11-audit.test.ts` — test, deve ser alterado
5. `skills/init/lib/run-stack-knowledge-init.test.ts` — test, deve ser alterado
6. `tests/harness-validate-knowledge.test.ts` — test, deve ser alterado
7. `tests/e2e/stack-knowledge-full-e2e.test.ts` — test, deve ser alterado
8. `tests/e2e/stack-knowledge-rails-full.test.ts` — test, deve ser alterado
9. `skills/init/lib/migrate-claude-artifacts.ts` + `.test.ts` — VERIFICAR: ocorrencias de `docs/knowledge/legacy-claude-knowledge/` sao target-side e devem ser PRESERVADAS

**ATENCAO CRITICA:** Se o grep retornar `migrate-claude-artifacts.ts:45` com `docs/knowledge/legacy-claude-knowledge/`,
essa linha representa o path NO PROJETO ALVO (onde o usuario rodou init v5) — NAO e o path do plugin.
Esta linha NAO deve ser alterada. Ver G1 do plano e PRD Riscos.

### Passo 2: Atualizar harness-validate.ts (MH-05)

No arquivo `scripts/harness-validate.ts`, linha 659:

**Antes:**
```typescript
  const knowledgeDir = path.join(base, 'docs', 'knowledge')
```

**Depois:**
```typescript
  // 2026-05-20 (Luiz/dev): D1/MH-05 do PRD knowledge-path-cutover — docs/knowledge/ → knowledge/
  // (AR-05: harness-validate.ts e o segundo validador, distinto do Step 90 runtime).
  const knowledgeDir = path.join(base, 'knowledge')
```

Verificar: a funcao `checkKnowledgePresence` ja comecar o walk a partir de `knowledgeDir` e continua
correto — so a base string muda.

### Passo 3: Atualizar harness-validate-knowledge.test.ts (7 referencias)

Este arquivo referencia fixtures em `docs/knowledge/nodejs-typescript/`. Substituir todas as ocorrencias
de `docs/knowledge/` por `knowledge/` neste arquivo.

```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\tests\harness-validate-knowledge.test.ts
```

Cada linha encontrada: substituir `docs/knowledge/` por `knowledge/`.

Rodar apos as mudancas:
```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test tests/harness-validate-knowledge.test.ts
```

### Passo 4: Atualizar os outros 6 arquivos de teste

Para cada arquivo, fazer grep + substituicao cirurgica:

**copy-knowledge.test.ts:**
```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\skills\init\lib\copy-knowledge.test.ts
```
Substituir referencias que apontem para `pluginRoot/docs/knowledge/` → `pluginRoot/knowledge/`.

**atoms-frontmatter-schema.test.ts:**
```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\skills\init\lib\atoms-frontmatter-schema.test.ts
```

**atoms-rf11-audit.test.ts:**
```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\tests\e2e\atoms-rf11-audit.test.ts
```

**run-stack-knowledge-init.test.ts:**
```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\skills\init\lib\run-stack-knowledge-init.test.ts
```

**stack-knowledge-full-e2e.test.ts:**
```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\tests\e2e\stack-knowledge-full-e2e.test.ts
```

**stack-knowledge-rails-full.test.ts:**
```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\tests\e2e\stack-knowledge-rails-full.test.ts
```

Em cada caso: substituir apenas as referencias que representam o path do PLUGIN (nao do target).
Contexto de cada linha e determinante.

### Passo 5: Verificar migrate-claude-artifacts.test.ts (PRESERVAR)

```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\skills\init\lib\migrate-claude-artifacts.test.ts
```

Resultado: linhas com `docs/knowledge/legacy-claude-knowledge/` — estas representam o path NO PROJETO ALVO
(onde o usuario que rodou init v5 teria os artefatos). **NAO alterar.**

Se houver alguma linha que represente `pluginRoot/docs/knowledge/` (menos provavel), avaliar caso a caso.

### Passo 6: Rodar harness:validate (CA-15)

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun run harness:validate
```

Resultado esperado: pass, inspecionando `knowledge/{nodejs-typescript,rails}/` (nao `docs/knowledge/`).

### Passo 7: Verificar E2E golden (init-greenfield.stdout.txt)

Verificar se o golden menciona `docs/knowledge/`:

```bash
grep -n "docs/knowledge" F:\Projetos\Anti-Vibe-Coding\tests\e2e\__golden__\init-greenfield.stdout.txt
```

Se encontrar: o golden precisa ser regenerado. Para regenerar, rodar o E2E com flag de update:

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun test tests/e2e/init-cutover-greenfield.test.ts 2>&1 | head -50
```

Se o teste usa `--update-snapshots` ou similar, rodar com essa flag. Caso contrario, rodar o init
em modo de captura e copiar o output para o golden file.

**IMPORTANTE:** Verificar que os outros testes E2E que dependem do golden (init-cutover-greenfield.test.ts)
passam apos a regeneracao.

### Passo 8: Rodar suite completa

```bash
cd F:\Projetos\Anti-Vibe-Coding && bun run test
```

Verificar: testes de atoms-frontmatter, stack-knowledge-full-e2e, stack-knowledge-rails-full devem
todos passar. Qualquer falha em test.skip pre-existente (documentados em MEMORY.md raiz) e esperada
e nao conta como regressao.

### Passo 9: Verificar CA-05 (init greenfield sem warning)

Este CA requer rodar `/anti-vibe-coding:init` em um projeto greenfield real contra o cache global
atualizado (fase-04 deve ter rodado sync antes). Como verificacao automatizada, confirmar via
testes E2E que o output de init NAO contem "Knowledge nao foi copiado".

```bash
grep -r "Knowledge nao foi copiado\|Knowledge não foi copiado" tests/e2e/__golden__/
```

Resultado esperado: zero matches (o golden regenerado nao contem o warning).

### Passo 10: Commitar

```bash
git add scripts/harness-validate.ts tests/harness-validate-knowledge.test.ts skills/init/lib/copy-knowledge.test.ts skills/init/lib/atoms-frontmatter-schema.test.ts tests/e2e/atoms-rf11-audit.test.ts skills/init/lib/run-stack-knowledge-init.test.ts tests/e2e/stack-knowledge-full-e2e.test.ts tests/e2e/stack-knowledge-rails-full.test.ts tests/e2e/__golden__/init-greenfield.stdout.txt
git commit -m "fix: update 9 test fixtures + harness-validate from docs/knowledge → knowledge/ path"
```

---

## Gotchas

- **G1 do plano (migrate-claude-artifacts PRESERVADO):** A linha em `migrate-claude-artifacts.ts:45` com `docs/knowledge/legacy-claude-knowledge/` NAO deve ser tocada. Esta string e um path no projeto ALVO — ela sobrevive ao cutover do plugin propositalmente. Confirmar com grep antes de fechar o commit.

- **G8 do plano (harness-validate e segundo validador):** `scripts/harness-validate.ts` e o validador standalone (`bun run harness:validate`). O `skills/init/lib/steps/90-final-validation.ts` e o validador runtime — escopo de Plano 02 fase-03. Esta fase so toca o harness-validate.

- **Local (7 referencias em harness-validate-knowledge.test.ts):** O PRD cita "7 lugares" neste arquivo. Verificar com grep antes de editar — se o numero for diferente, nao e blocker (a contagem do PRD era pre-investigacao).

- **Local (golden pode nao mencionar docs/knowledge):** Se o golden `init-greenfield.stdout.txt` nao menciona `docs/knowledge/`, nao precisa de regeneracao. O grep no Passo 7 confirma.

- **Local (E2E test.skip pre-existentes):** MEMORY.md raiz documenta varios test.skip aplicados em planos anteriores (ex: `ca13-dry-run-parity.test.ts`, `init-cutover-greenfield.test.ts`). Nao remover esses skips — sao escopo de Plano 05 fase-04.

- **Local (copy-knowledge.test.ts: contexto de cada linha):** As referencias a `docs/knowledge/` em copy-knowledge.test.ts podem ser: (a) `pluginRoot` mockado apontando para um dir de teste — atualizar; (b) mensagens esperadas nos expects — atualizar para `knowledge/`; (c) paths target-side — preservar. Ler cada linha com contexto antes de substituir.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run harness:validate` falha com "docs/knowledge/" mencionado (antes de atualizar)
  - Ou: rodar `grep "docs/knowledge" scripts/harness-validate.ts` e confirmar linha 659 ainda tem o path antigo
  - Resultado esperado: linha 659 retorna com `'docs', 'knowledge'`

- [ ] **GREEN:** Apos atualizar `harness-validate.ts`, `bun run harness:validate` passa
  - Comando: `bun run harness:validate`
  - Resultado esperado: `Validation passed` ou similar, sem erros de knowledge

### Checklist

- [ ] `grep -n "docs/knowledge" scripts/harness-validate.ts` retorna zero linhas de producao
- [ ] `bun run harness:validate` passa sem erros de knowledge-presence (CA-15)
- [ ] `bun test tests/harness-validate-knowledge.test.ts` passa
- [ ] `bun test skills/init/lib/copy-knowledge.test.ts` passa
- [ ] `bun test skills/init/lib/atoms-frontmatter-schema.test.ts` passa
- [ ] `bun test tests/e2e/stack-knowledge-full-e2e.test.ts` passa (ou skip pre-existente mantido)
- [ ] `bun test tests/e2e/stack-knowledge-rails-full.test.ts` passa (ou skip pre-existente mantido)
- [ ] `grep "docs/knowledge/legacy-claude-knowledge" skills/init/lib/migrate-claude-artifacts.ts` retorna a linha original PRESERVADA (G1)
- [ ] `grep "docs/knowledge" tests/e2e/__golden__/init-greenfield.stdout.txt` retorna zero linhas (ou golden foi regenerado)
- [ ] `grep "Knowledge nao foi copiado\|Knowledge não foi copiado" tests/e2e/__golden__/` retorna zero (CA-05)
- [ ] `bun run test` — sem regressoes novas alem de test.skip pre-existentes documentados

---

## Criterio de Aceite

**CA-05 (init greenfield sem warning):**
```bash
grep -r "Knowledge nao foi copiado\|Knowledge não foi copiado" tests/e2e/__golden__/
```
Zero matches (warning ausente no golden regenerado).

**CA-15 (harness-validate atualizado):**
```bash
bun run harness:validate
```
Passa sem erros. Internamente, `checkKnowledgePresence` inspeciona `knowledge/{nodejs-typescript,rails}/`
(nao `docs/knowledge/`) — verificavel via grep:
```bash
grep -n "knowledgeDir\|knowledge" scripts/harness-validate.ts | grep -v "docs/"
```

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Skill `/todo-pick` (SKILL.md + logica de selecao) — **Tracer Bullet**

**Plano:** 07 — TODO.md + /todo-pick
**Sizing:** 2h
**Depende de:** fase-02 (helpers `pickNext`, `listPending`, `parseLine`); fase-01 (`TODO.md` existe na raiz)
**Visual:** false

---

## O que esta fase entrega

Skill nova `/anti-vibe-coding:todo-pick` — lista items pending de `TODO.md`, deixa usuario escolher 1, propoe fix, marca como `[x]` ao concluir. Atende CA-31 e CA-32 verbatim. Tambem expoe sub-comandos `--skip {n}` e `--remove {n}` (CA-44 — helpers ja existem em Plano 06 fase-07).

**Tracer Bullet do plano:** esta fase prova o conceito end-to-end (template existe ← fase-01, helpers existem ← fase-02 + Plano 06 fase-07, skill funciona em fixture real).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/todo-pick/SKILL.md` | Create | Instrucoes para o LLM em PT-BR (G10) — fluxo interativo + sub-comandos |
| `skills/todo-pick/templates/todo-md-skeleton.md` | (criado em fase-01) | reaproveitado |
| `tests/skills/todo-pick.test.ts` | Create | E2E em fixture com `TODO.md` populado — valida CA-31, CA-32, CA-44 |
| `plugin-manifest.json` | Modify | Adicionar entrada para `todo-pick` (Plano 09 fase-03 confirma; aqui registro provisorio) |

---

## Implementacao

### Passo 1: Criar `skills/todo-pick/SKILL.md` (PT-BR — G10)

Skill em PT-BR alinhada com o resto do plugin. Estrutura:

```markdown
---
name: todo-pick
description: Lista micro-debito do TODO.md e puxa 1 item por vez para correcao. Sub-comandos: --skip {n} marca como skipped, --remove {n} deleta linha com confirmacao.
---

# /todo-pick

Puxa 1 item de micro-debito do TODO.md na raiz do projeto, propoe fix, marca como concluido.

## Quando usar

- Inicio de sessao curta para limpar pequenas dividas tecnicas
- Apos `/execute-plan` adicionar items out-of-scope (CA-33)
- Pausa entre features substanciais (~10-15min)

## Fluxo principal (sem sub-comando)

1. Ler `{projectRoot}/TODO.md` via `lib/todo-utils.ts` -> `parse(content)`.
2. Filtrar pending: `listPending(items)`.
3. Se vazio: emitir "Nenhum item pending. TODO.md esta limpo." + completion signal `status: complete, outputs: [], next_suggested: null` e SAIR.
4. Caso contrario: imprimir lista numerada (1-based):
   \```
   ## TODO items pendentes (N)
   1. {date} {classifier} {description}
   2. ...
   \```
5. Perguntar ao usuario: "Qual puxar agora? [1-N / 'r' para aleatorio / 'q' para sair]"
   - **Aleatorio:** sortear via `Math.random()` (G/07-A8 — inline na skill, sem expor estrategia no helper).
6. Apos escolha, propor fix:
   - Se `classifier.kind === 'file'`: ler `path:line`, mostrar trecho, propor edicao.
   - Se `classifier.kind === 'feature'`: pedir descricao mais detalhada ao usuario antes de codar.
   - Se `classifier === null`: pedir confirmacao do contexto antes de codar.
7. Apos fix aplicado e validado (testes/lint), marcar item como `[x]` via `markDone(lineIndex)`.
8. Emitir completion signal:
   \```yaml
   skill: todo-pick
   status: complete
   outputs:
     - ./TODO.md
   next_suggested: null
   blocks_for_user: []
   \```

## Sub-comando `--skip {n}` (CA-44)

1. Parsear `TODO.md`, validar `n` (1-based, dentro do range de pending).
2. Resolver `n` para `lineIndex` no arquivo.
3. Chamar `skip(lineIndex)` -> linha vira `- [-] ...`.
4. Sem confirmacao (reversivel — usuario edita `[-]` de volta para `[ ]` se quiser).
5. Emitir completion signal com `outputs: ['./TODO.md']`.

## Sub-comando `--remove {n}` (CA-44, G8 do plano)

1. Parsear `TODO.md`, validar `n`.
2. Mostrar a linha que sera removida.
3. Perguntar "Tem certeza? [s/N]" (default N — irreversivel sem git).
4. Se confirmado: chamar `remove(lineIndex)` -> linha deletada.
5. Se negado: skip, log "Remocao cancelada".
6. Emitir completion signal.

## Erros

- `TODO.md` ausente: instruir usuario a rodar `/init` ou criar manualmente.
- `n` fora de range: erro claro "Item N nao existe. Ha apenas X items pending."
- Helpers `lib/todo-utils.ts` ausentes: erro de instalacao do plugin — pedir `/init`.
```

### Passo 2: Registrar no `plugin-manifest.json`

Adicao provisoria — Plano 09 fase-03 valida durante release.

```json
{
  "skills": {
    "todo-pick": {
      "path": "skills/todo-pick/",
      "version": "6.0.0",
      "introduced": "v6.0.0",
      "description": "Puxa 1 item de micro-debito do TODO.md por vez."
    }
  }
}
```

### Passo 3: Teste E2E

```typescript
// 2026-05-11 (Luiz/dev): cobre CA-31, CA-32 e CA-44 em fixture v6
import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { runSkill } from '../helpers/skill-runner' // helper de invocacao em test mode

const sampleTodo = `# TODO

- [ ] {2026-05-12} {file:src/foo.ts:42} typo
- [ ] {2026-05-12} {feature:billing} extract magic number
- [x] done item
- [ ] free description
`

describe('/todo-pick', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'avc-todo-pick-'))
    writeFileSync(join(tmpDir, 'TODO.md'), sampleTodo, 'utf-8')
  })

  it('lists pending items (CA-31)', async () => {
    const result = await runSkill('todo-pick', { cwd: tmpDir, autoExit: true })
    expect(result.stdout).toContain('TODO items pendentes (3)')
    expect(result.stdout).toContain('typo')
    expect(result.stdout).toContain('extract magic number')
    expect(result.stdout).toContain('free description')
    expect(result.stdout).not.toContain('done item') // [x] nao aparece em pending
  })

  it('marks item as done after fix (CA-32)', async () => {
    await runSkill('todo-pick', {
      cwd: tmpDir,
      input: ['1', 'y'], // escolhe item 1, confirma fix
    })
    const after = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(after).toMatch(/^- \[x\] \{2026-05-12\} \{file:src\/foo\.ts:42\} typo/m)
  })

  it('--skip marks as [-] (CA-44)', async () => {
    await runSkill('todo-pick', { cwd: tmpDir, args: ['--skip', '1'] })
    const after = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(after).toMatch(/^- \[-\] \{2026-05-12\} \{file:src\/foo\.ts:42\} typo/m)
  })

  it('--remove deletes line after confirmation (CA-44, G8)', async () => {
    await runSkill('todo-pick', {
      cwd: tmpDir,
      args: ['--remove', '2'],
      input: ['s'], // confirma
    })
    const after = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(after).not.toContain('extract magic number')
    expect(after).toContain('typo') // outros mantidos
  })

  it('--remove cancels on negative confirmation', async () => {
    await runSkill('todo-pick', {
      cwd: tmpDir,
      args: ['--remove', '2'],
      input: ['n'],
    })
    const after = readFileSync(join(tmpDir, 'TODO.md'), 'utf-8')
    expect(after).toContain('extract magic number') // mantido
  })

  it('emits completion signal YAML (CA-47/D33)', async () => {
    const result = await runSkill('todo-pick', { cwd: tmpDir, autoExit: true })
    expect(result.stdout).toMatch(/```yaml\nskill: todo-pick\nstatus: /m)
  })

  it('handles empty TODO.md gracefully', async () => {
    writeFileSync(join(tmpDir, 'TODO.md'), '# TODO\n', 'utf-8')
    const result = await runSkill('todo-pick', { cwd: tmpDir, autoExit: true })
    expect(result.stdout).toContain('Nenhum item pending')
  })

  it('rejects --skip with out-of-range index (07-A6)', async () => {
    const result = await runSkill('todo-pick', { cwd: tmpDir, args: ['--skip', '99'] })
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('Item 99 nao existe')
  })
})
```

---

## Gotchas

- **G7 do plano (completion signal obrigatorio):** Skill emite YAML signal em **todos** os exit points (fluxo principal, --skip, --remove confirmado, --remove cancelado, empty TODO). Reusa helper `renderCompletionSignal` de Plano 06 fase-01.
- **G8 do plano (`--remove` confirma, `--skip` nao):** Pattern: irreversivel = confirma; reversivel = direto. `markDone` (fluxo principal) tambem nao confirma porque marca como `[x]` que eh visivel/reversivel via edit manual.
- **G10 do plano (SKILL.md em PT-BR):** Alinhado com resto das skills atuais. Mensagens de erro pro usuario em PT-BR. Template `TODO.md` em EN (fase-01) eh excecao porque eh artefato exportado.
- **07-A6 do plano (indices 1-based):** Validar `n >= 1 && n <= pending.length` antes de chamar `skip`/`remove`. Helper de Plano 06 recebe 0-based `lineIndex` no arquivo — skill traduz: `lineIndex = pending[n-1].lineIndex`.
- **07-A7 do plano (sem `--add`):** Skill NAO aceita `/todo-pick --add "texto"`. Documentar em "Erros" do SKILL.md se usuario tentar.
- **07-A8 do plano (aleatorio inline):** `Math.random()` direto na skill (sem strategy no helper). Codigo pequeno, sem ganho em abstrair.
- **Local — interatividade em test mode:** Helper `runSkill` (existente em tests de outras skills) suporta input scripted via array. Confirmar API antes de testar.
- **Local — fluxo principal precisa de `runSkill` interativo:** Se test mode nao suportar prompt + input, fallback: `autoExit: true` apenas testa listagem (CA-31). Marcacao `[x]` (CA-32) testada via teste separado que invoca `markDone(lineIndex)` diretamente.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `'lists pending items (CA-31)'` FALHA porque skill nao existe (registry vazio).
  - Comando: `bun run test -- --grep '/todo-pick'`
  - Resultado esperado: `Skill 'todo-pick' not found` (assertion ou throw — qualquer assertion vira pass condicional)

- [ ] **GREEN:** Skill criada em `skills/todo-pick/SKILL.md`, registrada em `plugin-manifest.json`. Todos 8 testes passam.
  - Comando: `bun run test -- --grep '/todo-pick'`
  - Resultado esperado: `8 passed, 0 failed`

### Checklist

- [ ] `skills/todo-pick/SKILL.md` existe com frontmatter `name`/`description`
- [ ] Fluxo principal lista N items pending (CA-31)
- [ ] Apos fix, item escolhido vira `- [x]` (CA-32)
- [ ] `--skip {n}` marca `[-]` sem confirmacao (CA-44)
- [ ] `--remove {n}` deleta linha apos confirmacao "s" (CA-44, G8)
- [ ] `--remove {n}` mantem linha apos confirmacao "n" (CA-44)
- [ ] Completion signal YAML emitido em todos exit points (CA-47, D33)
- [ ] `TODO.md` vazio nao crashes — mensagem clara
- [ ] Indices 1-based validados (07-A6)
- [ ] Mensagens de erro em PT-BR (G10)
- [ ] Provenance comments em codigo TS auxiliar, se houver (G9)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'todo-pick'` retorna `8 passed, 0 failed`
- Em fixture com 3 pending + 1 done, `/todo-pick` (autoExit) imprime `TODO items pendentes (3)` (CA-31)
- Apos `markDone(0)` indireto via fluxo principal, linha 0 de `TODO.md` comeca com `- [x]` (CA-32)
- `plugin-manifest.json` contem entrada `"todo-pick"` em `skills`

**Por humano:**
- Rodar `/anti-vibe-coding:todo-pick` em projeto real com `TODO.md` populado — fluxo interativo eh claro, lista nao confunde com items done, escolha por numero funciona

---

<!-- Gerado por /plan-feature em 2026-05-11 -->

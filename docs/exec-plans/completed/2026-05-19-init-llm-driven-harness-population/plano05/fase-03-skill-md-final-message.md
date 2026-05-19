<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: SKILL.md "Apos init concluir" — mensagem final

**Plano:** 05 — Progress.txt import + SKILL.md + E2E
**Sizing:** 0.5h
**Depende de:** Nenhuma (paralelo com fase-01/02)
**Visual:** false

---

## O que esta fase entrega

Substituicao da secao "Apos init concluir" em `skills/init/SKILL.md` (linhas 78-87 atuais) pela mensagem nova: aponta para o `PLAN.md` populate gerado, exibe o comando exato `/anti-vibe-coding:execute-plan {path}`, instrui revisao por PR. Mantem como sugestao secundaria `/detect-architecture`. Resolve Bug D + CA-11 + D7 do CONTEXT (so mensagem clara, sem warning persistente).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | Modify | Reescrever secao `## Apos init concluir` (linhas 78-87) — texto novo conforme PRD CA-11 |
| `skills/init/lib/run-init.ts` | Modify (light) | Garantir que `result.populatePlanPath` (vindo do Step 91 do Plano 03 fase-05) seja propagado e impresso quando presente. Se ja for, esta fase apenas alinha a SKILL.md |
| `tests/snapshots/skill-init-final-message.test.ts` | Create | Snapshot light: a string emitida pelo `runInit` em greenfield contem path do PLAN.md + comando `/execute-plan` |

---

## Implementacao

### Passo 1: nova mensagem em SKILL.md

Substituir o bloco atual (linhas 78-87):

```markdown
## Apos init concluir

Apresentar ao usuario UMA mensagem (nao executar):

> Plugin v6.x inicializado. Sugestao: rode `/anti-vibe-coding:detect-architecture` para
> classificar este projeto em 1 dos 5 perfis arquiteturais e ativar o Modo Dual nas skills
> estruturantes.

NAO invocar `/anti-vibe-coding:detect-architecture` automaticamente (respeita
`feedback_suggest_dont_execute.md` — IA sugere, usuario decide).
```

Pelo novo:

```markdown
## Apos init concluir

Apresentar ao usuario UMA mensagem (nao executar):

> Harness scaffold criado. Plano populate em `{populatePlanPath}`.
>
> Proximo passo: rode `/anti-vibe-coding:execute-plan {populatePlanPath}`
> para a IA popular cada doc canonico lendo o codigo real. Cada fase = 1 doc canonico.
> Revise via PR antes de fechar a fase.
>
> Opcional: `/anti-vibe-coding:detect-architecture` para classificar o projeto em 1 dos 5
> perfis arquiteturais (ativa Modo Dual nas skills estruturantes).

Substituir `{populatePlanPath}` pelo valor real emitido pelo Step 91
(`docs/exec-plans/active/{YYYY-MM-DDTHH-MM-SSZ}-populate-harness/PLAN.md`).

NAO invocar `/anti-vibe-coding:execute-plan` nem `/anti-vibe-coding:detect-architecture`
automaticamente (respeita `feedback_suggest_dont_execute.md` — IA sugere, usuario decide).
```

Regras de wording (G10 do plano — concisao):
- Mensagem total <= 10 linhas no terminal.
- Comando `/execute-plan` em backticks com path real interpolado.
- Sem emojis (consistente com SKILL.md atual).

### Passo 2: propagar `populatePlanPath` em `run-init.ts`

Verificar (Plano 03 fase-05 ja deve ter feito) que `runInit` retorna `result.populatePlanPath` quando Step 91 emite. Se sim, adicionar bloco final apos o loop de steps (antes do `return`):

```typescript
// skills/init/lib/run-init.ts (apos linha ~231, ANTES do return ok)
// 2026-05-19 (Luiz/dev): Plano 05 fase-03 — mensagem final CA-11.
// `populatePlanPath` e setado por Step 91 em ctx.flags['__populatePlanPath'].
const populatePlanPath = typeof ctxWithAudit.flags['__populatePlanPath'] === 'string'
  ? ctxWithAudit.flags['__populatePlanPath']
  : null
if (populatePlanPath !== null) {
  log('')
  log(`Harness scaffold criado. Plano populate em ${populatePlanPath}`)
  log('')
  log(`Proximo passo: rode /anti-vibe-coding:execute-plan ${populatePlanPath}`)
  log('para a IA popular cada doc canonico. Revise via PR antes de fechar cada fase.')
  log('')
  log('Opcional: /anti-vibe-coding:detect-architecture para Modo Dual nas skills estruturantes.')
}
```

Se `__populatePlanPath` ainda nao for setado pelo Step 91, esta fase tambem inclui o setter no Step 91 (1 linha):

```typescript
// skills/init/lib/steps/91-generate-populate-plan.ts (dentro do return do step, apos calcular `outDir`)
ctx.flags['__populatePlanPath'] = path.relative(ctx.cwd, path.join(outDir, 'PLAN.md'))
```

### Passo 3: snapshot test

```typescript
// tests/snapshots/skill-init-final-message.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE = path.join(import.meta.dir, '..', 'e2e', '__fixtures__', 'init-greenfield')

describe('SKILL.md final message — CA-11', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(path.join(os.tmpdir(), 'final-msg-'))
    await cp(FIXTURE, tmp, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('final lines after greenfield runInit mention PLAN.md path + execute-plan command', async () => {
    const lines: string[] = []
    await runInit([], { cwd: tmp, log: (s: string) => lines.push(s) })

    const tail = lines.slice(-10).join('\n')
    expect(tail).toContain('Harness scaffold criado')
    expect(tail).toContain('/anti-vibe-coding:execute-plan')
    expect(tail).toMatch(/populate-harness/)
    expect(tail).toContain('PR') // mencao explicita ao PR review
  })

  it('does NOT invoke execute-plan or detect-architecture automatically', async () => {
    const lines: string[] = []
    await runInit([], { cwd: tmp, log: (s: string) => lines.push(s) })
    // Nenhuma linha indica execucao — apenas sugestao
    expect(lines.some((l) => l.startsWith('[execute-plan]'))).toBe(false)
    expect(lines.some((l) => l.startsWith('[detect-architecture]'))).toBe(false)
  })
})
```

### Passo 4: verificar feedback de memoria

Re-ler `C:\Users\luizf\.claude\projects\f--Projetos-Anti-Vibe-Coding\memory\feedback_suggest_dont_execute.md` antes de commit — garantir que o wording da mensagem nao viole "IA sugere, nunca invoca automaticamente".

---

## Gotchas

- **G4 do plano:** Path de `populatePlanPath` e RELATIVO ao cwd. Em mensagem para o usuario, manter relativo (mais legivel no terminal). Path absoluto seria poluicao visual.
- **G10 do plano:** <= 10 linhas total. Conferir manualmente apos snapshot test.
- **Local:** SKILL.md e documento de PROMPT para a IA — nao codigo. Mudancas aqui afetam o comportamento textual emitido pela skill em runtime via o orquestrador. NAO testar via `import('./SKILL.md')`; testar via output observado de `runInit` (snapshot test do Passo 3).
- **Local:** Se Plano 03 fase-05 nao implementou `ctx.flags['__populatePlanPath']`, esta fase precisa adicionar 1 linha no Step 91. Verificar ANTES de comecar — se necessario, abrir issue para Plano 03 (mas escopo pequeno aceitavel inline aqui).
- **Local:** A nova mensagem mantem `/anti-vibe-coding:detect-architecture` como SECUNDARIA (opcional). NAO remover — usuarios existentes esperam essa sugestao. So muda a ordem (PLAN.md primeiro).

---

## Verificacao

### TDD

- [ ] **RED:** Snapshot test escrito ANTES de modificar `run-init.ts` falha (tail nao contem `/anti-vibe-coding:execute-plan`)
- [ ] **GREEN:** Apos modificar `run-init.ts` + SKILL.md, snapshot test passa (`2 pass, 0 fail`)

### Checklist

- [ ] `skills/init/SKILL.md` linhas 78-87 substituidas pela nova mensagem
- [ ] `run-init.ts` propaga `__populatePlanPath` em mensagem final
- [ ] Step 91 seta `ctx.flags['__populatePlanPath']` (1 linha — checar se Plano 03 fase-05 ja fez)
- [ ] Snapshot test passa
- [ ] Mensagem total <= 10 linhas (contar manualmente no output do teste)
- [ ] `bun test tests/snapshots/skill-init-final-message.test.ts` -> 2 pass
- [ ] `bun run lint` limpo
- [ ] `feedback_suggest_dont_execute.md` reverificado — nenhum verbo imperativo de execucao na mensagem

---

## Criterio de Aceite

**Por maquina:**
- `grep -A 12 "## Apos init concluir" skills/init/SKILL.md` mostra wording novo com `/anti-vibe-coding:execute-plan` e `PR`
- `bun test tests/snapshots/skill-init-final-message.test.ts` retorna `2 pass, 0 fail`

**Por humano (CA-11):**
- Rodar `/init` em greenfield e ler stdout final reproduz literalmente:
  - Linha com `Harness scaffold criado. Plano populate em <path>`
  - Linha com `/anti-vibe-coding:execute-plan <path>` (path REAL, nao placeholder)
  - Linha mencionando `Revise via PR`
  - Linha opcional sobre `/detect-architecture`

---

<!-- Gerado por /plan-feature em 2026-05-19 -->

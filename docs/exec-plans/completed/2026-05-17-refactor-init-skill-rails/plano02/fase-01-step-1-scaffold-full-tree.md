<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Portar Step 1 + Passo 1.5 — `scaffoldFullTree` + `scaffoldTodoMd`

**Plano:** 02 — Steps puros
**Sizing:** 1.5h
**Depende de:** Nenhuma (so precisa de Plano 01 concluido)
**Visual:** false

---

## O que esta fase entrega

Step 1 do `SKILL.md` (linhas 208-244) + Passo 1.5 (linhas 246-270) consolidados em **um unico**
step module `skills/init/lib/steps/01-scaffold-full-tree.ts`. Implementa `Step`, invoca
`scaffoldTemplates`, `scaffoldFullTree` e `scaffoldTodoMd`, emite os 3 logs com wording
byte-identico ao bloco inline atual, registrado como SEGUNDA entrada do registry (apos `detect-legacy`).
`SKILL.md` permanece intocado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/01-scaffold-full-tree.ts` | Create | Step que invoca os 3 helpers e emite 3 logs canonicos |
| `skills/init/lib/registry.ts` | Modify | Adicionar `scaffoldFullTreeStep` como SEGUNDA entrada (apos detectLegacy) |
| `skills/init/lib/steps/01-scaffold-full-tree.test.ts` | Create | Testes unitarios + golden (2 cenarios) |
| `skills/init/lib/steps/__fixtures__/scaffold-empty/.gitkeep` | Create | Projeto vazio — scaffolda do zero |
| `skills/init/lib/steps/__fixtures__/scaffold-with-todo/TODO.md` | Create | Projeto com TODO.md pre-existente — testa skip de Passo 1.5 (G2) |
| `skills/init/lib/steps/__golden__/scaffold-full-tree-empty.txt` | Create | stdout esperado: 3 logs |
| `skills/init/lib/steps/__golden__/scaffold-full-tree-with-todo.txt` | Create | stdout esperado: 3 logs, ultimo diz "ja existe" |

---

## Implementacao

### Passo 1: Portar o step (`01-scaffold-full-tree.ts`)

**REGRA ABSOLUTA (G1 do plano):** wording dos `console.log` byte-identico ao bloco inline atual
(SKILL.md linhas 237-238 + 261-264). Manter ordem dos logs.

A LLM tem acesso a `console.log` global. Como o step nao pode escrever para stdout diretamente
sem quebrar testes (output capturado pelo runner), o step retorna um `summary` multi-linha — o
dispatcher emite `console.log(summary)` linha-por-linha (decisao Plano 01 fase-02). Pattern:
quebrar `summary` em linhas com `\n`.

```typescript
// skills/init/lib/steps/01-scaffold-full-tree.ts
import path from 'node:path'
import { detectProjectName } from '../detect-project-name'
import { scaffoldFullTree } from '../scaffold-full-tree'
import { scaffoldTemplates } from '../scaffold-templates'
import { scaffoldTodoMd } from '../scaffold-todo-md'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): plugin root resolution copiada do SKILL.md linha 218 — PRD R1, G1.
// Mantida aqui (no step) porque cada step pode ter regra propria de path discovery.
function resolvePluginRoot(stepFilePath: string): string {
  // SKILL.md atual usa import.meta.dir. Aqui o step esta em lib/steps/, entao plugin root
  // eh dois niveis acima: lib/steps -> lib -> skills/init -> skills -> root.
  return process.env.CLAUDE_PLUGIN_ROOT ?? path.join(stepFilePath, '..', '..', '..', '..')
}

export const scaffoldFullTreeStep: Step = {
  id: 'scaffold-full-tree',
  async run(ctx) {
    const targetDir = ctx.cwd
    const pluginRoot = resolvePluginRoot(import.meta.dir)
    const projectName = detectProjectName(targetDir)
    // 2026-05-17 (Luiz/dev): "unknown" hardcoded como no SKILL.md linha 221 (PRD R1).
    // Step 3 refina depois. NAO ler stack atual da STATE.md aqui (acoplamento implicito).
    const stack = 'unknown'

    const baseResult = await scaffoldTemplates({
      targetDir,
      templatesDir: path.join(pluginRoot, 'skills/init/assets/templates'),
      projectName,
      stack,
    })

    const treeResult = await scaffoldFullTree({
      targetDir,
      projectName,
      stack,
    })

    // 2026-05-17 (Luiz/dev): Passo 1.5 idempotente, CA-31 prereq, G7 do plano (TODO.md).
    const todoResult = scaffoldTodoMd(targetDir)

    // 2026-05-17 (Luiz/dev): wording byte-identico aos 3 console.log do SKILL.md (PRD R1, G1).
    // Linhas 237-238 (Step 1) + 261-263 (Passo 1.5).
    const lines = [
      `Base files: ${baseResult.filesWritten.length}`,
      `Tree files: ${treeResult.filesWritten.length} in ${treeResult.durationMs} ms`,
      todoResult === 'created'
        ? 'TODO.md criado na raiz do projeto.'
        : 'TODO.md ja existe — mantido sem modificacao (G2).',
    ]

    return {
      mutated: true,
      summary: lines.join('\n'),
    }
  },
}
```

> **Decisao explicita:** `summary` carrega 3 linhas concatenadas com `\n`. O dispatcher
> (Plano 01 fase-02) emite `console.log(summary)` — Node trata `\n` como newline. Resultado
> visivel: 3 linhas no stdout, byte-identicas ao bloco inline. Trade-off: outros steps deste
> plano fazem o mesmo pattern. Se Plano 01 fase-02 ja decidiu emitir cada step com prefixo
> `[step-id]`, este step PRECISA reverter o prefixo via opcao `silent: true` ou similar.
> Cruzar com fase-02 do Plano 01 antes de fechar.

### Passo 2: Registrar no `registry.ts`

```typescript
// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'

// 2026-05-17 (Luiz/dev): ordem reflete o flow atual do SKILL.md.
// detect-legacy (gate) -> scaffoldFullTree (Step 1). G4 do plano (ordem canonica).
export const registry: readonly Step[] = [detectLegacyStep, scaffoldFullTreeStep]
```

### Passo 3: Criar fixtures

```
skills/init/lib/steps/__fixtures__/
  scaffold-empty/
    .gitkeep                  (vazio — projeto greenfield)
  scaffold-with-todo/
    TODO.md                   (conteudo qualquer, ex: "# Existing TODO")
```

`TODO.md` da fixture pode ter conteudo: `# Existing TODO\n\n- old item\n`.

### Passo 4: Goldens

`skills/init/lib/steps/__golden__/scaffold-full-tree-empty.txt`:
```
Base files: 2
Tree files: 24 in <NN> ms
TODO.md criado na raiz do projeto.
```

`skills/init/lib/steps/__golden__/scaffold-full-tree-with-todo.txt`:
```
Base files: 2
Tree files: 24 in <NN> ms
TODO.md ja existe — mantido sem modificacao (G2).
```

> **Nota:** `<NN>` eh placeholder textual. O teste vai validar via regex `^Tree files: \d+ in \d+ ms$`
> NAO via comparacao literal (durationMs nao eh deterministico). Goldens existem como REFERENCIA
> humana — o teste usa matchers especificos para a linha variavel.

### Passo 5: Testes (`01-scaffold-full-tree.test.ts`)

```typescript
// skills/init/lib/steps/01-scaffold-full-tree.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { scaffoldFullTreeStep } from './01-scaffold-full-tree'

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('scaffoldFullTreeStep', () => {
  let tmpDir: string

  beforeEach(async () => {
    // 2026-05-17 (Luiz/dev): cada teste em tmp dir — scaffold escreve arquivos.
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'scaffold-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('greenfield: 3 expected log lines + mutated true', async () => {
    const report = await scaffoldFullTreeStep.run(ctx(tmpDir))
    expect(report.mutated).toBe(true)

    const lines = report.summary.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toMatch(/^Base files: \d+$/)
    expect(lines[1]).toMatch(/^Tree files: \d+ in \d+ ms$/)
    expect(lines[2]).toBe('TODO.md criado na raiz do projeto.')
  })

  test('greenfield: scaffolds expected 27 files (AGENTS/ARCHITECTURE/TODO + docs)', async () => {
    await scaffoldFullTreeStep.run(ctx(tmpDir))
    expect(existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true)
    expect(existsSync(path.join(tmpDir, 'ARCHITECTURE.md'))).toBe(true)
    expect(existsSync(path.join(tmpDir, 'TODO.md'))).toBe(true)
    expect(existsSync(path.join(tmpDir, 'docs'))).toBe(true)
  })

  test('with-todo: existing TODO.md is preserved (G2 idempotency)', async () => {
    const todoPath = path.join(tmpDir, 'TODO.md')
    await Bun.write(todoPath, '# Existing TODO\n\n- old item\n')

    const report = await scaffoldFullTreeStep.run(ctx(tmpDir))
    const lines = report.summary.split('\n')
    expect(lines[2]).toBe('TODO.md ja existe — mantido sem modificacao (G2).')

    // 2026-05-17 (Luiz/dev): conteudo original deve sobreviver — G2 do SKILL.md (linha 264).
    const content = await Bun.file(todoPath).text()
    expect(content).toBe('# Existing TODO\n\n- old item\n')
  })
})
```

### Passo 6: Paranoia check contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): G1 do plano — wording dos logs DEVE existir no SKILL.md atual.
grep -F 'Base files:' skills/init/SKILL.md
grep -F 'Tree files:' skills/init/SKILL.md
grep -F 'TODO.md criado na raiz do projeto.' skills/init/SKILL.md
grep -F 'TODO.md ja existe — mantido sem modificacao (G2).' skills/init/SKILL.md
```

Todos retornam exit 0 ANTES E DEPOIS da fase. Se alguma string nao existir mais no SKILL.md
apos esta fase, o cutover (Plano 04) eh quem remove — nesta fase ainda nao.

---

## Gotchas

- **G1 do plano (wording byte-identico):** o desafio aqui sao 3 strings simultaneas. A
  segunda (`Tree files: N in Mms`) tem duas variaveis — facil errar. Conferir caractere a
  caractere. Templates do SKILL.md usam `' ms'` (espaco + ms) — NAO `'ms'`.
- **G2 do plano (helpers preservados):** os 4 helpers (`scaffoldTemplates`,
  `scaffoldFullTree`, `scaffoldTodoMd`, `detectProjectName`) nao podem ser modificados. Se
  algum teste falhar por bug do helper, ESCALAR como nova fase/PRD — NAO consertar inline.
- **G7 do plano (TODO.md duplicado):** `scaffoldFullTree` ja cria `TODO.md` via `TODO.md.tpl`.
  `scaffoldTodoMd` eh DEFENSIVO (idempotente). Os DOIS sao chamados (preservando comportamento
  atual). A segunda chamada retorna `'skipped'` na pratica greenfield (porque o `scaffoldFullTree`
  acabou de criar) — verificar nos testes que o golden NAO eh `criado` em greenfield se o
  scaffold ja escreveu. Se for, ajustar fixture (`scaffold-empty/` NAO pode ter TODO.md pre-existente).
  ATENCAO: validar o que `scaffoldFullTree` realmente cria em greenfield — se ja cria TODO.md,
  o golden deveria dizer "ja existe" e nao "criado". Reler o helper antes de fechar o golden.
- **G3 do plano (importacao estatica):** NUNCA usar `await import('../scaffold-*.ts')` neste
  step. Tudo via `import` no topo. Justificativa: dispatcher centralizou em fase-04 do Plano 01.
- **Local — `import.meta.dir` no Bun:** funciona para resolver paths relativos ao arquivo do
  step. Em Node puro falharia, mas o projeto roda Bun. Documentar caso futuro runner mude.
- **Local — `durationMs` nao deterministico:** golden test usa regex `\d+` para a linha
  "Tree files: ...". NAO comparar literal — flakiness garantida.
- **Local — `CLAUDE_PLUGIN_ROOT`:** em produção a env var existe. Em teste local, NAO. Por isso
  a funcao `resolvePluginRoot` faz fallback via `path.join(import.meta.dir, '..', '..', '..', '..')`.
  Validar que esse fallback aponta para a raiz do plugin em ambiente de teste.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes do step. Falham por modulo nao encontrado.
  - Comando: `bun run test skills/init/lib/steps/01-scaffold-full-tree.test.ts`
  - Resultado esperado: `Cannot find module './01-scaffold-full-tree'`

- [ ] **GREEN:** Step + registry atualizado. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: testes da fase-01 + fases anteriores do Plano 01 passam (>= 11 testes acumulados)

### Checklist

- [ ] `skills/init/lib/steps/01-scaffold-full-tree.ts` criado, exporta `scaffoldFullTreeStep`
- [ ] `skills/init/lib/registry.ts` atualizado: agora tem 2 entradas (ordem: detect-legacy, scaffold-full-tree)
- [ ] 2 fixtures criadas em `__fixtures__/scaffold-{empty,with-todo}/`
- [ ] 2 goldens criados em `__golden__/scaffold-full-tree-{empty,with-todo}.txt` (referencia humana)
- [ ] 3 testes passam: greenfield-summary, greenfield-files-created, with-todo-preserved
- [ ] `skills/init/SKILL.md` NAO modificado: `git diff skills/init/SKILL.md` vazio
- [ ] Helpers NAO modificados: `git diff skills/init/lib/scaffold-*.ts skills/init/lib/detect-project-name.ts` vazio
- [ ] Paranoia grep (4 strings) retorna exit 0 contra SKILL.md atual
- [ ] Lint limpo: `bun run lint skills/init/lib/steps/`
- [ ] Step nao usa `await import` nem `bun -e`: `grep -E 'await import|bun -e' skills/init/lib/steps/01-*.ts` retorna 0 matches

---

## Criterio de Aceite

Step `scaffold-full-tree` portado, registrado, e validado por 3 testes (incluindo cenario
idempotente de TODO.md). `SKILL.md` intocado. Wording byte-identico ao bloco inline atual.

**Por maquina:**
- `bun run test skills/init/lib/steps/01-scaffold-full-tree.test.ts` exit 0 com 3 testes passando
- `bun run test skills/init/lib/steps/` exit 0 (toda regression do Plano 01 + esta fase)
- `git diff --stat skills/init/SKILL.md skills/init/lib/scaffold-full-tree.ts skills/init/lib/scaffold-templates.ts skills/init/lib/scaffold-todo-md.ts skills/init/lib/detect-project-name.ts` retorna 0 arquivos modificados

**Por humano:**
- Inspecao visual dos 2 goldens: as 3 strings batem com SKILL.md linhas 237-238 + 261-264
  (incluindo o " — " com em-dash em "TODO.md ja existe — mantido...")

---

<!-- Gerado por /plan-feature em 2026-05-17 -->

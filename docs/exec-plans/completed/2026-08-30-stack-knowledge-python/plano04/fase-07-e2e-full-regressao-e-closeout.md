<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante esta fase deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 07: E2E Full + Regressão Global + Closeout v7.7.0

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** M ~2h
**Depende de:** fase-04 (INDEX final) + fase-06 (audit aprovado 3/3) — fan-in final
**Visual:** false

---

## O que esta fase entrega

A prova executável da entrega completa (`stack-knowledge-python-full.test.ts` — 18/18 átomos,
frontmatter, INDEX, preface, keywords, warning, monorepo), a regressão global verde (CA-09),
o débito RF17 no TODO.md, o CHANGELOG v7.7.0 com bump de versão, o STATE.md fechado (4 planos
completed), a migração da pasta para `completed/` e o PR final — Exit Criteria do PLAN.md
fechado item a item.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-knowledge-python-full.test.ts` | Create | E2E full (espelho do stack-knowledge-rails-full) |
| `TODO.md` (raiz) | Modify | Débito RF17 "reconciliar schema frontmatter Next" |
| `CHANGELOG.md` | Modify | Entrada `[7.7.0]` — nova stack + fix AbortError + nota `--refresh-knowledge` |
| `plugin-manifest.json` + `README.md` | Modify | Bump 7.6.1 → 7.7.0 (via `scripts/bump-version.js` — ler o uso no header do script antes) |
| `docs/exec-plans/active/2026-08-30-stack-knowledge-python/STATE.md` | Modify | 4 planos completed, 29/29 fases, Exit Criteria fechado |
| `docs/exec-plans/{active→completed}/2026-08-30-stack-knowledge-python/` | Move | Migração da pasta inteira (Exit Criteria; G23) |

---

## Implementacao

### Passo 1: E2E full — `tests/e2e/stack-knowledge-python-full.test.ts`

Espelho estrutural de `tests/e2e/stack-knowledge-rails-full.test.ts`, com as correções que o
Python herdou de graça: sem budget wall-clock (precedente 2026-08-17), sem exceção CRLF
(`.editorconfig` LF vigente desde 7.6.1), e CA-05 assertável de verdade (INDEX começa com H1
— G18). Fixtures: as do Plano 01 fase-04 (`tests/fixtures/python-fastapi-fixture/`,
`python-requirements-fixture/`) copiadas para tmpdir (G6 — nunca rodar init na fixture).

```typescript
// 2026-08-30 (Luiz/dev): suite E2E final Python — Plano 04 fase-07, RF9 do PRD stack-knowledge-python.
// Cobre CA-01/02/04/05/06/07/11 + RF15 pós-cópia. CA-03 é unit (validador, Plano 01 fase-02);
// CA-08 é audit humano (fase-06); CA-09 é a suite global (Passo 2); CA-10 grep no verifier (fase-05).
// G22: aqui 18 é HARDCODED de propósito — fotografia final da matrix (tracer usa >=1).

import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtempSync, cpSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'
import { validateAtomFrontmatter } from '../../skills/init/lib/atoms-frontmatter-validator'
import { parseTopKeywords, TOP_N_KEYWORDS } from '../../skills/init/lib/format-knowledge-preview'
import { getStackKnowledgePreface } from '../../skills/security/lib/stack-aware-preface'

const pluginRoot = join(import.meta.dir, '..', '..')
const PYTHON_MATRIX = join(pluginRoot, 'knowledge/python')
const FASTAPI_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-fastapi-fixture')
const REQUIREMENTS_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-requirements-fixture')

describe('Stack Knowledge Python — E2E full (RF9)', () => {
  let target: string
  afterEach(() => { if (target) rmSync(target, { recursive: true, force: true }) })

  const setup = (fixture: string): string => {
    const dest = mkdtempSync(join(tmpdir(), 'avc-py-full-'))
    cpSync(fixture, dest, { recursive: true })
    return dest
  }

  test('CA-01: matrix python com 18 átomos + INDEX <=100 linhas, H1 na linha 1', () => {
    const index = readFileSync(join(PYTHON_MATRIX, 'INDEX.md'), 'utf8')
    expect(index.split('\n').length).toBeLessThanOrEqual(100)
    expect(index.startsWith('# ')).toBe(true)   // G18 — habilita CA-05
    const atoms = readdirSync(join(PYTHON_MATRIX, 'atoms')).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(18)
  })

  test('CA-02: /init na fixture FastAPI copia INDEX + 18 átomos SEM AbortError', async () => {
    target = setup(FASTAPI_FIXTURE)
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    const atoms = readdirSync(join(target, '.claude/knowledge/atoms')).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(18)
  })

  test('RF9: 18/18 átomos da matrix passam validateAtomFrontmatter (sem exceções)', () => {
    const atomsDir = join(PYTHON_MATRIX, 'atoms')
    const failures: string[] = []
    for (const file of readdirSync(atomsDir).filter((f) => f.endsWith('.md'))) {
      const v = validateAtomFrontmatter(join(atomsDir, file))
      if (!v.valid) failures.push(`${file}: ${v.errors.join(', ')}`)
    }
    expect(failures).toEqual([])
  })

  test('RF15: keywords do INDEX copiado são parseáveis (top-8)', async () => {
    target = setup(FASTAPI_FIXTURE)
    await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    const keywords = await parseTopKeywords(join(target, '.claude/knowledge/INDEX.md'))
    expect(keywords.length).toBe(TOP_N_KEYWORDS)
  })

  test('CA-05: preface cita o INDEX copiado (sem overwrite-hack — G18 pagou)', async () => {
    target = setup(FASTAPI_FIXTURE)
    await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    const preface = getStackKnowledgePreface(target)
    expect(preface).not.toBe('')
    expect(preface).toContain('.claude/knowledge/INDEX.md')
  })

  test('CA-06: sem .claude/knowledge → preface vazio (graceful)', async () => {
    target = setup(FASTAPI_FIXTURE)
    expect(getStackKnowledgePreface(target)).toBe('')
  })

  test('CA-04: requires-python >=3.9 → copiado + warning; fixture >=3.12 → sem warning', async () => {
    target = setup(FASTAPI_FIXTURE)
    writeFileSync(join(target, 'pyproject.toml'),
      '[project]\nname = "legacy"\nversion = "0.1.0"\nrequires-python = ">=3.9"\ndependencies = ["fastapi"]\n')
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.copyResult.status).toBe('copied')
    expect(result.warnings).toContain('⚠️ Knowledge Python cobre 3.11+, foco 3.13. Alguns padrões podem não se aplicar.')
  })

  test('CA-07: monorepo Python+Node (maioria .py) → primary=python, só matrix python', async () => {
    target = setup(FASTAPI_FIXTURE)   // já traz pyproject + app/main.py
    writeFileSync(join(target, 'package.json'), JSON.stringify({ name: 'mono', devDependencies: { typescript: '^5.0.0' } }))
    writeFileSync(join(target, 'index.ts'), 'export const x = 1')
    writeFileSync(join(target, 'extra.py'), 'X = 1')   // garante maioria .py
    const multi = await detectMultiStack(target)
    expect(multi.primary).toBe('python')
    expect(multi.secondary).toContain('nodejs-typescript')
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(existsSync(join(target, '.claude/knowledge/atoms/async-and-concurrency.md'))).toBe(true)
    expect(existsSync(join(target, '.claude/knowledge/atoms/type-system-idioms.md'))).toBe(false)
  })

  test('CA-11: requirements-only → detectado, copiado, sem warning de versão', async () => {
    target = setup(REQUIREMENTS_FIXTURE)
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, logger: () => {} })
    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    expect(result.warnings).toBeUndefined()
  })
})
```

(Snippet de referência — validar contra os contratos reais no momento da escrita: nomes de
campos de `detectMultiStack`, assinatura do result, e se RF14 entrou, acrescentar 1 teste de
`notes` com django. Se o RF14 foi cortado — ver MEMORY —, NÃO assertar `notes`.)

### Passo 2: Regressão global (CA-09)

```
bun test
bun run typecheck
bun run harness:validate
bun run compound:check
```

Confirmar nominalmente verdes (CA-09): `stack-knowledge-rails-tracer`,
`stack-knowledge-rails-full`, `init-v7-nextjs-tracer-bullet`, `init-cutover-greenfield`,
`stack-knowledge-python-tracer` — além da suite inteira com 0 fail.

### Passo 3: Débito RF17 no TODO.md

Apêndice no formato do arquivo:

```
- [ ] {YYYY-MM-DD} {file:skills/init/lib/atoms-frontmatter-validator.ts} reconciliar schema de frontmatter dos átomos Next (title/cross_stack_skills/last_reviewed, sem validação de máquina) com o schema Rails/Python validado (topic/stack/layer/sources/tier/triggers/related_skills/updated + *_versions) — débito registrado no PRD stack-knowledge-python (RF17, D3); decidir entre migrar os átomos Next ou ensinar o validador a aceitar os 2 schemas; hoje os átomos Next NÃO passam por validateAtomFrontmatter
```

### Passo 4: CHANGELOG v7.7.0 + bump

Nova entrada no topo do `CHANGELOG.md` (formato das entradas existentes):

```markdown
## [7.7.0] - {YYYY-MM-DD}

> **Minor release — 4ª stack: Python**

### Added

- **Stack knowledge Python** (`knowledge/python/`): 18 átomos PT-BR (6 T1 + 9 T2 + 3 T3),
  Python 3.11+/foco 3.13, padrões web FastAPI-native declarados no INDEX (D2). Destilados de
  ~700KB de pesquisa com anti-drift + verifier refined (≥80% rastreabilidade 18/18) + audit
  humano assinado em 3 átomos (D11).
- `validateAtomFrontmatter` reconhece `python_versions` (array semver-style, opcional) sem
  regressão nos átomos Rails/Node (CA-03).
- Warning de projeto legado: `requires-python` < 3.11 no pyproject → aviso no `/init` (D7).
- {SE RF14 ENTROU} Nota informativa Django/Flask no `/init` (D8).
- Entrada MIT `python-debugpy` (Hermes Agent) no `THIRD-PARTY-NOTICES.md` (RF7); átomo de
  debugging sem contexto proprietário (CA-10).
- E2E: `stack-knowledge-python-tracer` + `stack-knowledge-python-full` (18/18).

### Fixed

- **`/init` abortava em projeto Python** — `probePython` detectava a stack e
  `STACK_ID_TO_MATRIX_FOLDER['python']` estava mapeado desde a v6.x, mas `knowledge/python/`
  não existia: `copyKnowledge` lançava `AbortError` bloqueante ("Matrix 'python' não
  encontrada") e o init morria. Com a matrix populada, o fluxo completa. Quem já rodou
  `/init` antes da 7.7.0 em projeto Python (init abortado) ou tem `.claude/knowledge/` de
  versão anterior: rodar `/init` com `--refresh-knowledge` para receber a matrix.
```

Bump: `scripts/bump-version.js` (ler o uso no header do script ANTES de rodar — ele propaga
a versão para o `plugin-manifest.json`; conferir se README precisa de edição manual, precedente
do PR "docs(readme): atualiza versao para 7.6.1"). Regenerar manifest se o fluxo exigir
(`bun run generate:manifest`) e rodar `bun run harness:validate` de novo.

### Passo 5: STATE.md final + Exit Criteria do PLAN item a item

1. STATE.md da feature: os 4 planos `completed`, `Fases done: 29/29 (100%)`, log final.
2. Fechar o **Exit Criteria do PLAN.md** marcando cada checkbox com a evidência:

| Exit Criteria | Evidência |
|---|---|
| 18 átomos + INDEX commitados; verifier 18/18; audit assinado | `ls knowledge/python/atoms` = 18; reports planos 01-04; STATE.md 3 assinaturas |
| `/init` sem AbortError (tracer + full verdes) | Passo 2 |
| Validador `python_versions` sem regressão | CA-03 unit (Plano 01) + RF9 aqui |
| Warning legado + nota Django/Flask conforme CA-04 | CA-04 no e2e; RF14 conforme MEMORY (entregue ou cortado — could-have) |
| NOTICES MIT python-debugpy; rastreio ECC documentado | fase-02 + MEMORY Plano 02 (RF12) |
| Suite completa verde (4 comandos) | Passo 2 |
| STATE.md 4 planos completed; pasta migrada | este passo + Passo 6 |
| CHANGELOG v7.7.0 (stack + AbortError) | Passo 4 |
| Débito RF17 no TODO.md | Passo 3 |

3. Preencher `Validation Log` do PLAN.md (comando + resultado dos 4 comandos do Passo 2).

### Passo 6: Migração para completed/ + commit final + PR

```
git mv docs/exec-plans/active/2026-08-30-stack-knowledge-python docs/exec-plans/completed/2026-08-30-stack-knowledge-python
bun run harness:validate   # G23 — link checker/orphan detector após o move
bun test                   # nada de runtime referencia a pasta, mas confirmar
git commit -m "feat(python-knowledge): e2e full 18/18 + CHANGELOG v7.7.0 + closeout (RF9/RF17, CA-09)"
gh pr create ...           # PR da branch feat/stack-knowledge-python-plano04
```

Descrição do PR: 3 átomos T3 + INDEX final + verifier 3/3 + audit humano 3/3 assinado +
e2e full 18/18 + v7.7.0. Citar o resultado do rastreio ECC (RF12, MEMORY Plano 02).

### Passo 7: Compound Decision Gate (obrigatório antes de reportar conclusão)

Este trabalho ensinou coisas duráveis ao repo — o PLAN.md §Compound Opportunity já lista 4
candidatas (matrix mapeada sem pasta = AbortError latente → guard no harness:validate; filtro
"contestado" mecânico; série coordenada de fontes; template de decisão de licença D5).
**Pedir ao dev que rode `/anti-vibe-coding:lessons-learned`** com essas candidatas e registrar
os links em `Lessons Captured` do PLAN.md. Se o dev decidir não capturar, logar o porquê.

---

## Gotchas

- **G22 do plano:** 18 hardcoded É a intenção aqui (fotografia final) — o tracer continua
  `>=1` e não deve ser "alinhado".
- **G18 pagou aqui:** o CA-05 do Python asserta preface NÃO-vazio sem o overwrite-hack que o
  rails-full precisou — se este teste falhar, o INDEX regrediu para comentário-primeiro.
- **Local — sem budget wall-clock:** precedente 2026-08-17 (rails-full): o gate <100ms do PRD
  é herdado da infra, não re-medido em teste (wall-clock sob carga não é determinismo).
- **Local — RF14 condicional:** o teste de `notes` só existe se RF14 entrou (conferir MEMORY
  da fase-04). Assertar campo de feature cortada = teste vermelho falso.
- **G23 do plano:** `git mv` da pasta ANTES do commit final; harness:validate depois do move.
  Se o validador apontar link quebrado (docs que apontavam para `active/`), corrigir os links
  no mesmo commit.
- **Local — bump não é só CHANGELOG:** `plugin-manifest.json` tem versão em múltiplos pontos
  — usar `scripts/bump-version.js`, nunca sed manual. O `/sync` do plugin reporta a versão
  nova depois do merge.
- **Local — CA-09 nominal:** rodar a suite completa E conferir os 4 nomes de suite do PLAN —
  "0 fail no total" com suite renomeada/skipada não prova CA-09.
- **G9 do plano:** PR final; nunca merge direto. Pós-merge, o dev decide quando publicar o
  release da 7.7.0.

---

## Verificacao

### TDD

- [ ] **E2E nasce contra código pronto:** se algum teste do Passo 1 nascer VERMELHO, é
      defeito real da entrega (matrix, INDEX ou init) — corrigir a causa, nunca o teste
  - Comando: `bun test tests/e2e/stack-knowledge-python-full.test.ts`
  - Resultado esperado: `9 pass, 0 fail` (8 se RF14 cortado e sem teste de notes)

### Checklist

- [ ] E2E full verde com 18 hardcoded + frontmatter 18/18 + preface + keywords
- [ ] `bun test` + `bun run typecheck` + `bun run harness:validate` + `bun run compound:check`
      todos verdes (CA-09)
- [ ] Suites nominais CA-09 conferidas: rails-tracer, rails-full, nextjs-tracer,
      cutover-greenfield, python-tracer
- [ ] TODO.md com o débito RF17
- [ ] CHANGELOG `[7.7.0]` + bump aplicado via script (manifest + README consistentes)
- [ ] STATE.md: 4 planos completed, 29/29; Exit Criteria do PLAN fechado com evidências;
      Validation Log preenchido
- [ ] Pasta migrada para `completed/` e harness:validate verde APÓS o move (G23)
- [ ] PR final aberto (G9) citando ECC/RF12
- [ ] Compound gate executado: `/lessons-learned` sugerido ao dev com as candidatas do PLAN

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/stack-knowledge-python-full.test.ts` → 0 fail
- Os 4 comandos de regressão → exit 0 no HEAD final da branch
- `grep -c "7.7.0" CHANGELOG.md` ≥ 1; `git log --oneline -1` mostra o commit de closeout

**Por humano:**
- Review do PR confirma: Exit Criteria do PLAN 100% fechado com evidência por item; nada
  entregue "no papel" sem prova executável

---

<!-- Gerado por /plan-feature em 2026-08-30 -->

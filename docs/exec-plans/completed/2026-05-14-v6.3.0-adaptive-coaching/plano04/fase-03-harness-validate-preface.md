<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): harness check preface — alinhado com PRD §RF-SH-06`
-->

# Fase 03: harness-validate.ts valida blocos profile-aware-preface bem-formados

**Plano:** 04 — profile-aware-preface ×4-6 skills
**Sizing:** ~1h
**Depende de:** fase-01 (precisa de pelo menos 1 skill com bloco para validar e gerar fixture verde)
**Visual:** false

---

## O que esta fase entrega

Estende `scripts/harness-validate.ts` com um novo check (`checkProfileAwarePreface`) que valida bidirecionalmente: todo `skills/*/SKILL.md` que contém `<!-- profile-aware-preface:start -->` DEVE também conter `<!-- profile-aware-preface:end -->` E menção a `readPrefaceContext` no corpo entre os markers. CI bloqueia merge se algum dos três sinais estiver ausente (RF-SH-06, CA-07, CA-11).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/harness-validate.ts` | Modify | Adicionar função `checkProfileAwarePreface()` + chamada em `main()` |
| `tests/harness-validate-preface.test.ts` | Create | Teste com 3 fixtures (verde, sem-end, sem-readPrefaceContext) |

> Nota: o nome `tests/harness-validate-preface.test.ts` segue convenção observada em `tests/looks-complete-inline.test.ts` e similares já presentes no projeto. Se o diretório `tests/` não existir, criar.

---

## Implementacao

### Passo 1: Adicionar a função de check em `scripts/harness-validate.ts`

Inserir após `checkV6PathWhitelist` (linha ~450), antes de `checkMarkdownFiles`. Marker e regex simples — sem AST parser (G7 do plano + G9 herdado do Plano 03).

```typescript
// 2026-05-15 (Luiz/dev): Plano 04 fase-03 — CA-07, CA-11, RF-SH-06.
// Check bidirecional: se SKILL.md tem <!-- profile-aware-preface:start --> entao DEVE ter
// <!-- profile-aware-preface:end --> E mencionar readPrefaceContext entre os markers.
// G7 do plano04: string presence, sem AST — package.json nao tem typescript parser.
const PREFACE_START = '<!-- profile-aware-preface:start -->'
const PREFACE_END = '<!-- profile-aware-preface:end -->'
const PREFACE_REQUIRED_REF = 'readPrefaceContext'

export async function checkProfileAwarePreface(failures: Failure[]): Promise<void> {
  const skillsDir = path.join(root, 'skills')
  let entries
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true })
  } catch {
    return // skills/ ausente — outro check ja registra
  }

  await Promise.all(
    entries
      .filter((e) => e.isDirectory() && !String(e.name).startsWith('_') && !String(e.name).startsWith('.'))
      .map(async (entry) => {
        const skillMd = path.join(skillsDir, String(entry.name), 'SKILL.md')
        let content: string
        try {
          content = await fs.readFile(skillMd, 'utf8')
        } catch {
          return // skill sem SKILL.md (ex: skills/lib/) — silenciosamente ignorado
        }
        const rel = path.relative(root, skillMd).replace(/\\/g, '/')

        const hasStart = content.includes(PREFACE_START)
        if (!hasStart) return // Skills sem preface NAO sao obrigadas a ter (CA-02 garante v6.2)

        const hasEnd = content.includes(PREFACE_END)
        if (!hasEnd) {
          failures.push({
            rule: 'profile-aware-preface',
            message: `${rel}: has '${PREFACE_START}' but missing '${PREFACE_END}'`,
          })
        }

        // Extrair conteudo entre markers para checar readPrefaceContext reference
        const startIdx = content.indexOf(PREFACE_START)
        const endIdx = content.indexOf(PREFACE_END)
        if (hasEnd && endIdx > startIdx) {
          const block = content.slice(startIdx, endIdx + PREFACE_END.length)
          if (!block.includes(PREFACE_REQUIRED_REF)) {
            failures.push({
              rule: 'profile-aware-preface',
              message: `${rel}: profile-aware-preface block must reference '${PREFACE_REQUIRED_REF}' (PRD §RF-SH-06)`,
            })
          }
        }
      }),
  )
}
```

### Passo 2: Chamar o check no `main()`

Adicionar à lista de checks paralelos:

```typescript
// scripts/harness-validate.ts :: main()
await Promise.all([
  checkRequiredFiles(failures, warnings, isMigrationMode),
  checkAgentsConstraints(failures),
  checkActivePlans(failures),
  checkQualityScoreFormat(failures),
  checkAgentContracts(failures),
  checkV6PathWhitelist(failures),
  checkProfileAwarePreface(failures), // 2026-05-15 (Luiz/dev): novo — RF-SH-06
])
```

### Passo 3: Teste de regressão (`tests/harness-validate-preface.test.ts`)

Cria 3 fixtures em diretórios tmp e roda `checkProfileAwarePreface` contra cada um:

```typescript
// 2026-05-15 (Luiz/dev): harness-validate-preface.test.ts — RF-SH-06 + CA-07 + CA-11
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { checkProfileAwarePreface } from '../scripts/harness-validate'

type Failure = { rule: string; message: string }

const VALID_BLOCK = `\n<!-- profile-aware-preface:start -->\n\
\`\`\`typescript\nimport { readPrefaceContext } from '../lib/preface-context'\nconst ctx = readPrefaceContext()\n\`\`\`\n\
<!-- profile-aware-preface:end -->\n\n# Title\n`

const MISSING_END = `\n<!-- profile-aware-preface:start -->\n\
\`\`\`typescript\nimport { readPrefaceContext } from '../lib/preface-context'\n\`\`\`\n\
# Title\n`

const MISSING_REF = `\n<!-- profile-aware-preface:start -->\n\
\`\`\`typescript\nconst x = 1 // sem readPrefaceContext\n\`\`\`\n\
<!-- profile-aware-preface:end -->\n# Title\n`

describe('checkProfileAwarePreface', () => {
  let workdir: string

  beforeEach(async () => {
    workdir = await mkdtemp(path.join(tmpdir(), 'preface-test-'))
    process.chdir(workdir)
    await mkdir(path.join(workdir, 'skills'), { recursive: true })
  })

  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true })
  })

  test('passes when SKILL.md has full preface block (start + end + readPrefaceContext)', async () => {
    await mkdir(path.join(workdir, 'skills', 'security'), { recursive: true })
    await writeFile(path.join(workdir, 'skills', 'security', 'SKILL.md'), `---\nname: security\n---\n${VALID_BLOCK}`)
    const failures: Failure[] = []
    await checkProfileAwarePreface(failures)
    expect(failures).toHaveLength(0)
  })

  test('fails when start marker present but end marker missing', async () => {
    await mkdir(path.join(workdir, 'skills', 'security'), { recursive: true })
    await writeFile(path.join(workdir, 'skills', 'security', 'SKILL.md'), `---\nname: security\n---\n${MISSING_END}`)
    const failures: Failure[] = []
    await checkProfileAwarePreface(failures)
    expect(failures.length).toBeGreaterThanOrEqual(1)
    expect(failures.some((f) => f.message.includes('missing'))).toBe(true)
  })

  test('fails when block exists but readPrefaceContext not referenced', async () => {
    await mkdir(path.join(workdir, 'skills', 'security'), { recursive: true })
    await writeFile(path.join(workdir, 'skills', 'security', 'SKILL.md'), `---\nname: security\n---\n${MISSING_REF}`)
    const failures: Failure[] = []
    await checkProfileAwarePreface(failures)
    expect(failures.some((f) => f.message.includes('readPrefaceContext'))).toBe(true)
  })

  test('silently skips skills WITHOUT any preface marker (CA-02 — opt-in)', async () => {
    await mkdir(path.join(workdir, 'skills', 'plain-skill'), { recursive: true })
    await writeFile(path.join(workdir, 'skills', 'plain-skill', 'SKILL.md'), `---\nname: plain\n---\n# Plain Skill\n`)
    const failures: Failure[] = []
    await checkProfileAwarePreface(failures)
    expect(failures).toHaveLength(0)
  })
})
```

> Nota: o teste muda `process.cwd()` para a tmpdir. Se isso conflitar com outros testes em paralelo, isolar via `it.serial` ou rodar em arquivo dedicado.

### Passo 4: Verificar que skills da fase-01 + fase-02 passam no novo check

Rodar `bun run harness:validate` localmente — deve sair 0 com as 5-6 skills migradas presentes. Se sair 1, ajustar marker positioning ou referência a `readPrefaceContext`.

---

## Gotchas

- **G4 do plano:** Check bidirecional — start exige end + readPrefaceContext. Faltar qualquer um quebra o check. Esse é o ponto: forçar bem-formação.
- **G7 do plano:** Sem AST parser. Usar `content.includes()` simples. Aceitar tradeoff: pode haver falso-positivo se algum SKILL.md tiver marker em bloco de exemplo/comentário; resolver via path-restricted check (só `skills/*/SKILL.md` top-level).
- **Local — fixtures não em `agents/__fixtures__/`:** O teste cria tmpdirs reais, não usa o pattern de `agents/__fixtures__/`. Razão: o check varre `skills/`, não `agents/` — fixture em tmpdir é mais isolado e replica o shape real.
- **Local — `process.chdir`:** O check usa `process.cwd()` via constante `root` (linha 10 do harness-validate.ts). Trocar cwd no teste exige re-importar `root` ou refatorar o check para receber `projectRoot` como parâmetro. **Decisão pragmática:** refatorar o check para opcional `projectRoot` param (default `root`):
  ```typescript
  export async function checkProfileAwarePreface(failures: Failure[], projectRoot: string = root): Promise<void> {
    const skillsDir = path.join(projectRoot, 'skills')
    // ...
  }
  ```
  Isso evita `process.chdir` no teste. Mirror do pattern usado por `checkAgentContracts(failures, agentsDir = 'agents')`.
- **Local — exit code:** O check apenas append em `failures[]`. O exit code é decidido em `main()` (linha ~169-175). Não chamar `process.exit` dentro do check.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test -- harness-validate-preface` falha porque `checkProfileAwarePreface` não está exportada.
  - Resultado esperado: `Cannot find module` ou `not a function`.

- [ ] **GREEN:** Após implementar `checkProfileAwarePreface`, os 4 testes passam.
  - Comando: `bun run test -- harness-validate-preface`
  - Resultado esperado: `4 passed, 0 failed`.

### Checklist

- [ ] `scripts/harness-validate.ts` exporta `checkProfileAwarePreface`
- [ ] `main()` chama o novo check em paralelo com os outros
- [ ] `tests/harness-validate-preface.test.ts` criado com 4 testes (válido, sem-end, sem-ref, sem-marker)
- [ ] `bun run harness:validate` no repo real passa (skills da fase-01/02 já compliant)
- [ ] `bun run test -- harness-validate` (suite completa do harness) verde
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck limpo: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por máquina:**
- `bun run harness:validate` exit code 0 após fase-01/02 verdes.
- Manipular temporariamente uma SKILL.md (remover `<!-- profile-aware-preface:end -->`) → `bun run harness:validate` exit code 1 com mensagem `profile-aware-preface`. Restaurar.
- `bun run test -- harness-validate-preface` retorna `4 passed, 0 failed`.
- `grep -c "checkProfileAwarePreface" scripts/harness-validate.ts` retorna >= 2 (declaração + chamada em main).

**Referências PRD:**
- RF-SH-06: ✓ validator de blocos profile-aware-preface bem-formados
- CA-07: ✓ skill nova com bloco é validada pelo harness
- CA-11: ✓ harness valida >= 5 skills com bloco (4 RF-MH-05 + /architecture existente; após fase-02 sobe para 6)

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

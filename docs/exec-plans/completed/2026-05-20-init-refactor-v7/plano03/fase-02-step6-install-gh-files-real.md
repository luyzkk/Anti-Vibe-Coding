<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Step 6 — install-gh-files REAL (substitui stub do Plano 01 fase-04)

**Plano:** 03 — Step 5 (scaffold-and-link) + Step 6 (install-gh-files)
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente de fase-01; pode rodar em paralelo)
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/06-install-gh-files.ts` REAL que invoca `installGhFiles` (lib existente)
com skip-if-exists adicionado no STEP (sem modificar a lib — minimiza superficie). Copia
`.github/workflows/harness.yml` e `.github/pull_request_template.md` dos assets estaticos.
Sem dry-run. Testes unit cobrem: id contratual, greenfield escreve 2 arquivos, re-run pula
os 2, summary contem `ghFilesInstalled/ghFilesSkipped`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/06-install-gh-files.ts` | Create | Step real (substitui stub do Plano 01 fase-04). Envolve `installGhFiles` com skip-if-exists guard. Sem dry-run/noWrite. |
| `skills/init/lib/steps/06-install-gh-files.test.ts` | Create | Testes unit: id, greenfield 2 escritos, re-run 2 skipados, summary format. |

**Nota:** A lib `skills/init/lib/install-gh-files.ts` NAO e modificada nesta fase (decisao
DI-Plano03-fase02-install-gh-skip-policy candidato (a) do MEMORY.md). Step antigo
`skills/init/lib/steps/05-install-gh-files.ts` (mesmo nome de arquivo, posicao diferente no
registry antigo) NAO e tocado — sera deletado no Plano 01 fase-05 junto com os outros 18
steps obsoletos.

---

## Implementacao

### Passo 1: RED — escrever testes do `06-install-gh-files.test.ts`

Testes cobrem CA-08 (idempotencia) aplicado a Step 6 tambem.

```typescript
// skills/init/lib/steps/06-install-gh-files.test.ts
// 2026-05-21 (Luiz/dev): Step 6 — install-gh-files REAL (Plano 03 fase-02 init-refactor-v7).
// Cobre CA-08 (skip-if-exists em re-run), D4 (sem dry-run), summary com metricas observabilidade.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { installGhFilesStep } from './06-install-gh-files'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-step6-'))
}

describe('installGhFilesStep (Step 6 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 06-install-gh-files', () => {
    // 2026-05-21 (Luiz/dev): id e contrato com registry.ts (PRD CA-09).
    expect(installGhFilesStep.id).toBe('06-install-gh-files')
  })

  test('greenfield: escreve harness.yml + pull_request_template.md', async () => {
    // 2026-05-21 (Luiz/dev): valida que ambos arquivos do .github/ foram criados (RF-03 estendido).
    const report = await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })

    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/ghFilesInstalled:\s*2/)
    expect(report.summary).toMatch(/ghFilesSkipped:\s*0/)

    const yml = await fs.stat(path.join(tmp, '.github/workflows/harness.yml'))
    expect(yml.isFile()).toBe(true)
    const pr = await fs.stat(path.join(tmp, '.github/pull_request_template.md'))
    expect(pr.isFile()).toBe(true)
  })

  test('re-run: nenhum arquivo sobrescrito (CA-08)', async () => {
    // 2026-05-21 (Luiz/dev): primeira execucao popula; segunda deve skipar tudo (PRD CA-08).
    await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })
    const second = await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })

    expect(second.summary).toMatch(/ghFilesInstalled:\s*0/)
    expect(second.summary).toMatch(/ghFilesSkipped:\s*2/)
  })

  test('re-run preserva conteudo customizado pelo usuario em pull_request_template.md', async () => {
    // 2026-05-21 (Luiz/dev): defensa contra cross-upgrade destrutivo (analogo ao scaffold:80).
    await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })
    const customPath = path.join(tmp, '.github/pull_request_template.md')
    const sentinel = '# Meu PR template customizado\n\nNao sobrescrever.\n'
    await fs.writeFile(customPath, sentinel, 'utf8')

    await installGhFilesStep.run({ cwd: tmp, args: [], flags: {} })

    const preserved = await fs.readFile(customPath, 'utf8')
    expect(preserved).toBe(sentinel)
  })

  test('D4: zero imports de dry-run no codigo do step', async () => {
    // 2026-05-21 (Luiz/dev): meta-test — garante que D4 (CONTEXT linha 38) eh respeitado.
    const src = await fs.readFile(
      path.join(import.meta.dir, '06-install-gh-files.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/isDryRun|WriteRecorder|makeWriter|dry-run-mode/)
  })
})
```

### Passo 2: GREEN — escrever `06-install-gh-files.ts`

Glue code com skip-if-exists guard no nivel do step (decisao DI-Plano03-fase02-install-gh-skip-policy:
opcao (a) — guard no step, sem mexer na lib). Lib `installGhFiles` recebe um `writeFile` writer
que pula se o arquivo ja existe.

```typescript
// skills/init/lib/steps/06-install-gh-files.ts
// 2026-05-21 (Luiz/dev): Step 6 — install-gh-files REAL (init v7, Plano 03 fase-02).
// Envolve installGhFiles (lib existente) com skip-if-exists guard no nivel do step.
// PRD CA-08 (idempotencia), D4 (sem dry-run), D14 (sempre instala .github/).

import { promises as fs } from 'node:fs'
import { installGhFiles } from '../install-gh-files'
import type { Step, StepContext, StepReport } from './types'

async function fileExists(p: string): Promise<boolean> {
  // 2026-05-21 (Luiz/dev): helper local — mesmo padrao do scaffold-full-tree.ts:39.
  // Nao reusar de scaffold-full-tree porque a fn nao e exportada (privada). Manter aqui.
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export const installGhFilesStep: Step = {
  id: '06-install-gh-files',

  async run(ctx: StepContext): Promise<StepReport> {
    let installed = 0
    let skipped = 0

    // 2026-05-21 (Luiz/dev): writer custom com skip-if-exists guard (CA-08).
    // Lib install-gh-files.ts:31-34 default writer sobrescreve sempre — envolvemos com
    // guard para preservar arquivos do usuario. Sem modificar a lib (minimiza superficie —
    // DI-Plano03-fase02-install-gh-skip-policy opcao (a)).
    const writer = async (dstPath: string, body: string): Promise<void> => {
      if (await fileExists(dstPath)) {
        skipped += 1
        return
      }
      const { dirname } = await import('node:path')
      await fs.mkdir(dirname(dstPath), { recursive: true })
      await fs.writeFile(dstPath, body, 'utf8')
      installed += 1
    }

    await installGhFiles(ctx.cwd, { writeFile: writer })

    // 2026-05-21 (Luiz/dev): summary multilinha observability (PRD NFR linha 211).
    // Metricas: ghFilesInstalled, ghFilesSkipped — analogo ao Step 5 (placeholdersCreated/Skipped).
    const lines = [
      `ghFilesInstalled: ${String(installed)}`,
      `ghFilesSkipped: ${String(skipped)}`,
    ]

    return {
      // 2026-05-21 (Luiz/dev): mutated true se algum arquivo foi escrito; false se tudo skipou.
      // Mais preciso que Step 5 (que sempre retorna true por causa do link). Aqui temos info exata.
      mutated: installed > 0,
      summary: lines.join('\n'),
    }
  },
}
```

### Passo 3: VERIFY local

```bash
bun test skills/init/lib/steps/06-install-gh-files.test.ts
bun run typecheck
bun run lint
```

Esperado: 5 testes passam (id, greenfield, re-run skip, preservacao custom, meta-test D4).

---

## Gotchas

- **G1 do plano (D4 — sem dry-run):** Mesmo meta-test que fase-01. Sem `isDryRun`, sem
  `WriteRecorder`, sem `makeWriter`. O writer custom desta fase NAO e o `makeWriter` — e uma
  closure local que conta installed/skipped.

- **G3 do plano (CA-08 — skip-if-exists):** A lib `install-gh-files.ts` (linhas 31-34) NAO tem
  skip-if-exists no writer default — esta fase ADICIONA via writer custom no nivel do step.
  Alternativa rejeitada (opcao (b) do DI candidato): modificar a lib. Razao: a lib pode ser
  usada por outros consumidores no futuro com semantica diferente; mais seguro manter o
  guard no step.

- **G7 do plano (audit log — Observabilidade):** Mesma estrategia da fase-01 — summary
  multilinha com `ghFilesInstalled` e `ghFilesSkipped`. Sem dependencia de audit-log writer
  (removido no Plano 02 — DI-Plano02-fase02-audit-log-removido).

- **Local — `mutated: installed > 0` em re-run:** Diferente do Step 5 (sempre `mutated: true`).
  Aqui temos info exata: se nada foi escrito, `mutated: false`. Permite dispatcher logar
  "(no-op)" em re-run inocuo.

- **Local — assets static path:** A lib `install-gh-files.ts:7` ja resolve `STATIC_GH_ROOT`
  relativo ao `import.meta.dir`. Isso quebra se a lib for movida de pasta — comentario na
  propria lib alerta. NAO mover a lib nesta fase.

- **Local — `import('node:path')` dentro do writer:** Usar dynamic import dentro da closure
  para evitar import duplicado no top do arquivo (path ja e usado pela lib chamada). Aceitavel.
  Alternativa: mover para top do arquivo — equivalente, escolher a versao que o linter preferir.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos ANTES do step — falham por `installGhFilesStep` nao existir
  ou ter id `'TODO'`.
  - Comando: `bun test skills/init/lib/steps/06-install-gh-files.test.ts --grep "id contratual"`
  - Resultado esperado: `expected 'TODO' to equal '06-install-gh-files'` (assertion failure)

- [ ] **GREEN:** Logica completa, 5 testes passam
  - Comando: `bun test skills/init/lib/steps/06-install-gh-files.test.ts`
  - Resultado esperado: `5 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/steps/06-install-gh-files.ts` criado com `id: '06-install-gh-files'`
- [ ] Step NAO importa `dry-run-mode` nem `dry-run`
- [ ] Writer custom com skip-if-exists guard implementado no step (NAO na lib)
- [ ] Summary multilinha contem `ghFilesInstalled:` e `ghFilesSkipped:`
- [ ] 5 testes em `06-install-gh-files.test.ts` passam
- [ ] `bun run typecheck` limpo no arquivo novo
- [ ] `bun run lint` limpo
- [ ] `bun run test` global continua verde
- [ ] Provenance comment com data 2026-05-21 no top do arquivo
- [ ] Lib `install-gh-files.ts` NAO foi modificada (validar via `git diff skills/init/lib/install-gh-files.ts`)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/06-install-gh-files.test.ts` retorna `5 passed, 0 failed`
- `grep -c "isDryRun\|WriteRecorder\|makeWriter\|dry-run-mode" skills/init/lib/steps/06-install-gh-files.ts` retorna `0`
- `grep -q "id: '06-install-gh-files'" skills/init/lib/steps/06-install-gh-files.ts` retorna exit 0
- `bun run typecheck` retorna exit 0
- `bun run lint` retorna exit 0

**Por humano:**
- Diff `05-install-gh-files.ts` (antigo, sera deletado) vs `06-install-gh-files.ts` (novo):
  mostra ganho de skip-if-exists guard + summary com metricas + perda de wiring de dry-run.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->

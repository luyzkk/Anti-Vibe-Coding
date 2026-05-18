<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Hardening do catch de AbortError + golden tests dos 3 codigos

**Plano:** 03 — Gates de abortagem + steps interativos
**Sizing:** 1.5h
**Depende de:** Nenhuma (so de Plano 01 — dispatcher + AbortError ja existem)
**Visual:** false

---

## O que esta fase entrega

Garante que o catch de `AbortError` no dispatcher (Plano 01 fase-02) ja produz o
comportamento exato exigido pelos gates dos Planos 02/03/04: codigo de exit propagado,
`reason` multi-linha emitida verbatim, loop interrompido. Sem helpers de migracao reais —
esta fase usa STEPS FAKE que arremessam `AbortError` com as reasons EXATAS dos 3 gates
canonicos (Step 0.5 needs-migration, Step 0.5 ambiguity, migrate.2 conflict). Funciona como
"contrato de prova" para os consumidores das fases 02/03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/run-init-abort.test.ts` | Create | 3 golden tests com steps fake (1 por codigo de exit canonico) |
| `skills/init/lib/__golden__/abort-needs-migration.txt` | Create | stdout esperado para gate code=1 (needs migration) |
| `skills/init/lib/__golden__/abort-ambiguity.txt` | Create | stdout esperado para gate code=2 (ambiguity) |
| `skills/init/lib/__golden__/abort-migrate2-conflict.txt` | Create | stdout esperado para migrate.2 conflict (code=1, 5 linhas) |

**NOTA:** Nenhum step real eh portado nesta fase. `run-init.ts` NAO eh modificado — Plano 01
fase-02 ja entregou o catch. Esta fase apenas PROVA via golden test que o catch ja produz
saida byte-identica para os 3 cenarios criticos.

---

## Implementacao

### Passo 1: Pre-verificacao da estrutura do dispatcher

Antes de escrever os testes, abrir `skills/init/lib/run-init.ts` (Plano 01 fase-02) e
confirmar que o catch faz:

```typescript
// Plano 01 fase-02 ja produziu este trecho — apenas para referencia.
} catch (e) {
  if (e instanceof AbortError) {
    log(e.reason)
    return { kind: 'aborted', code: e.code, reason: e.reason }
  }
  throw e
}
```

Se `log(e.reason)` nao quebra `reason` em linhas (chama `console.log` 1 vez), entao reasons
multi-linha sao emitidas com `\n` literal no meio. `console.log` traduz `\n` em newline.
Isso eh o comportamento desejado (mesmo pattern de `summary` multi-linha no Plano 02). Se
o dispatcher tiver iterado linha-a-linha (`reason.split('\n').forEach(log)`), tambem
funciona — mas a captura no teste precisa juntar as linhas com `'\n'` para comparar com o
golden. Confirmar qual ANTES de escrever o teste.

### Passo 2: Criar `run-init-abort.test.ts`

Cobre 3 cenarios. Cada teste injeta um step fake que arremessa `AbortError` com reason
EXATA do SKILL.md. Captura stdout via sink `log` injetavel ja exposto pelo dispatcher (Plano
01 fase-02 — `opts.log`).

```typescript
// skills/init/lib/run-init-abort.test.ts
import { describe, test, expect } from 'bun:test'
import { runInit } from './run-init'
import { AbortError } from './steps/abort-error'
import type { Step } from './steps/types'

const ctxArgs = { cwd: '/tmp', log: undefined as ((line: string) => void) | undefined }

function makeAbortingStep(payload: { code: number; reason: string }): Step {
  return {
    id: 'gate-fake',
    async run() { throw new AbortError(payload) },
  }
}

const downstream: Step = {
  id: 'downstream',
  async run() { throw new Error('downstream must not run after AbortError') },
}

describe('runInit — AbortError flow (Plano 03 fase-01)', () => {
  test('gate code=1 (needs migration) — wording byte-identico ao SKILL.md linha 31-32', async () => {
    // 2026-05-17 (Luiz/dev): reason copiada VERBATIM de skills/init/SKILL.md linhas 31-32.
    // PRD R1, G1 do plano. Em-dash (U+2014), 2 linhas concatenadas com \n.
    const reason = [
      'Detected v5.x artifacts: planning-dir',
      'Run `/init migrate` (or `--dry-run` to preview).',
    ].join('\n')
    const logs: string[] = []
    const result = await runInit([], {
      registry: [makeAbortingStep({ code: 1, reason }), downstream],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result).toEqual({ kind: 'aborted', code: 1, reason })
    // 2026-05-17 (Luiz/dev): reason deve aparecer NO LOG (o dispatcher emite antes de retornar).
    expect(logs.join('\n')).toContain('Detected v5.x artifacts: planning-dir')
    expect(logs.join('\n')).toContain('Run `/init migrate` (or `--dry-run` to preview).')
  })

  test('gate code=2 (ambiguity) — wording byte-identico ao SKILL.md linha 27-28', async () => {
    // 2026-05-17 (Luiz/dev): reason copiada VERBATIM de skills/init/SKILL.md linhas 27-28.
    // PRD R1, G1, G5 (code=2 = ambiguity).
    const reason = [
      'Project has both v5 artifacts AND docs/exec-plans/ — partial migration?',
      'Run `/init migrate --resume` or remove residuals manually.',
    ].join('\n')
    const logs: string[] = []
    const result = await runInit([], {
      registry: [makeAbortingStep({ code: 2, reason }), downstream],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result).toEqual({ kind: 'aborted', code: 2, reason })
    expect(logs.join('\n')).toContain('partial migration?')
  })

  test('gate code=1 (migrate.2 conflict) — wording byte-identico ao SKILL.md linhas 143-150', async () => {
    // 2026-05-17 (Luiz/dev): reason de 6 linhas copiada VERBATIM de skills/init/SKILL.md.
    // PRD R1, G1. Esta eh a reason que fase-03 deste plano vai produzir DE VERDADE.
    const reason = [
      'Migration: partial',
      '  entries: 12',
      '  written: 10',
      '  skipped: 0',
      '  CONFLICTS: docs/exec-plans/active/2026-05-12-foo/PLAN.md, docs/product-specs/bar.md',
      '  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.',
    ].join('\n')
    const logs: string[] = []
    const result = await runInit([], {
      registry: [makeAbortingStep({ code: 1, reason }), downstream],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result.kind).toBe('aborted')
    if (result.kind === 'aborted') {
      expect(result.code).toBe(1)
      // 2026-05-17 (Luiz/dev): reason completa preservada (6 linhas).
      expect(result.reason.split('\n')).toHaveLength(6)
      expect(result.reason.split('\n')[4]).toMatch(/^  CONFLICTS: /)
    }
  })

  test('downstream step NAO executa apos AbortError (loop interrompido)', async () => {
    let downstreamCalled = false
    const probe: Step = {
      id: 'probe', async run() { downstreamCalled = true; return { mutated: false, summary: '' } },
    }
    await runInit([], {
      registry: [makeAbortingStep({ code: 1, reason: 'stop' }), probe],
      cwd: '/tmp',
      log: () => {},
    })
    expect(downstreamCalled).toBe(false)
  })
})
```

### Passo 3: Criar goldens (referencia humana — testes ja sao stricter)

`skills/init/lib/__golden__/abort-needs-migration.txt`:
```
Detected v5.x artifacts: planning-dir
Run `/init migrate` (or `--dry-run` to preview).
```

`skills/init/lib/__golden__/abort-ambiguity.txt`:
```
Project has both v5 artifacts AND docs/exec-plans/ — partial migration?
Run `/init migrate --resume` or remove residuals manually.
```

`skills/init/lib/__golden__/abort-migrate2-conflict.txt`:
```
Migration: partial
  entries: 12
  written: 10
  skipped: 0
  CONFLICTS: docs/exec-plans/active/2026-05-12-foo/PLAN.md, docs/product-specs/bar.md
  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.
```

> **Nota:** os goldens existem como REFERENCIA visual. O teste compara `result.reason` diretamente
> com a constante inline — nao le os goldens. Trade-off aceito: humanos revisam o golden file,
> CI compara via constante. Se quiser CI ler do golden, basta `await Bun.file(...).text()` no teste.

### Passo 4: Paranoia grep contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): as 3 strings de gate canonicas DEVEM existir no SKILL.md ATUAL.
# Pre-condicao para a fase rodar. Se alguma sumir antes do cutover, falhar com vermelho.
grep -F 'Detected v5.x artifacts:' skills/init/SKILL.md
grep -F 'Run `/init migrate` (or `--dry-run` to preview).' skills/init/SKILL.md
grep -F 'Project has both v5 artifacts AND docs/exec-plans/ — partial migration?' skills/init/SKILL.md
grep -F 'Run `/init migrate --resume` or remove residuals manually.' skills/init/SKILL.md
grep -F '  CONFLICTS:' skills/init/SKILL.md
grep -F '  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.' skills/init/SKILL.md
```

Todos exit 0 ANTES da fase. Se algum falhar, a string foi removida do SKILL.md por outro plano —
sincronizar o golden com a nova fonte.

---

## Gotchas

- **G1 do plano (wording byte-identico):** este eh o ponto onde o wording dos 3 gates fica
  CRAVADO em teste. Qualquer divergencia futura em fases 02/03 vai estourar este teste
  primeiro — isso eh sinal de bom isolamento.
- **G5 do plano (semantica do `code`):** 3 codigos canonicos: 1 (needs-migration/conflict),
  2 (ambiguity), N!=0 (generico). Esta fase prova os 3 com fixtures. Fase-02/03 reusam.
- **Local — captura de `log`:** o dispatcher pode chamar `log(reason)` uma unica vez com a
  string multi-linha, OU iterar `reason.split('\n').forEach(log)`. Os testes acima usam
  `logs.join('\n').toContain(...)` para tolerar ambos. NAO assertar `logs.length === N`
  porque depende da decisao de Plano 01 fase-02.
- **Local — `runInit` sem registry global:** todos os testes injetam `registry` via opts —
  nao toca o registry global (que pode estar em qualquer estado, dependendo do Plano 02 ter
  rodado antes). Isolamento total.
- **Local — `downstream` step com `throw`:** o segundo step do registry arremessa Error
  generico se chamado. O dispatcher (Plano 01 fase-02) re-throw nao-AbortError, entao se o
  loop nao tiver interrompido, o teste explode com a mensagem `'downstream must not run...'`.
  Diagnostico claro de regressao.

---

## Verificacao

### TDD

- [ ] **RED:** Escrever testes primeiro. Se `runInit` ja captura AbortError corretamente
      (Plano 01 fase-02), os testes ja passam — eh um teste de REGRESSAO, nao de feature
      nova. Se algum falhar, eh sinal de que o dispatcher precisa ajuste.
  - Comando: `bun run test skills/init/lib/run-init-abort.test.ts`
  - Resultado esperado (Plano 01 ja entregue): 4 testes passam imediatamente.
  - Resultado esperado (se algum falhar): patch minimal em `run-init.ts` ate todos passarem.

- [ ] **GREEN:** Todos os 4 testes passam.
  - Comando: `bun run test skills/init/lib/`
  - Resultado esperado: testes acumulados de Plano 01 + Plano 02 + esta fase passam.

### Checklist

- [ ] `skills/init/lib/run-init-abort.test.ts` criado com 4 testes
- [ ] 3 goldens criados em `skills/init/lib/__golden__/abort-*.txt` (referencia humana)
- [ ] Teste 1 valida code=1 + reason needs-migration (2 linhas)
- [ ] Teste 2 valida code=2 + reason ambiguity (2 linhas)
- [ ] Teste 3 valida code=1 + reason migrate.2 conflict (6 linhas, indice 4 inicia com `'  CONFLICTS: '`)
- [ ] Teste 4 valida que downstream step NAO eh chamado apos AbortError
- [ ] `skills/init/lib/run-init.ts` NAO modificado (Plano 01 fase-02 ja entregou — esta fase apenas testa)
- [ ] `skills/init/SKILL.md` NAO modificado
- [ ] Paranoia grep (6 strings) retorna exit 0 contra SKILL.md atual
- [ ] Lint limpo: `bun run lint skills/init/lib/run-init-abort.test.ts`
- [ ] Zero uso de `any`/`as` no teste

---

## Criterio de Aceite

Dispatcher comprovadamente captura AbortError com 3 codigos canonicos (1, 2, N) e
propaga `reason` multi-linha intacta. Loop interrompe no primeiro AbortError. Esses
testes funcionam como contrato para as fases seguintes deste plano — qualquer step de
migrate.* ou Step 0.5 que lance AbortError vai dialogar com este catch.

**Por maquina:**
- `bun run test skills/init/lib/run-init-abort.test.ts` exit 0 com 4 testes passando
- `bun run test skills/init/lib/` exit 0 (toda regression do Plano 01 + Plano 02 + esta fase)
- `git diff --stat skills/init/SKILL.md skills/init/lib/run-init.ts` retorna 0 arquivos
- `grep -E '\bany\b|\bas\s' skills/init/lib/run-init-abort.test.ts` retorna 0 matches

**Por humano:**
- Inspecao visual dos 3 goldens: cada linha bate caractere a caractere com o SKILL.md
  (em-dash em U+2014, backticks ao redor de `/init migrate`, ponto final em todas as linhas)

---

<!-- Gerado por /plan-feature em 2026-05-17 -->

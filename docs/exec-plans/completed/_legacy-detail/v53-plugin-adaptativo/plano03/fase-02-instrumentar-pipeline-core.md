# Fase 02: Instrumentar Pipeline Core (5 Skills)

**Plano:** 03 — Telemetria Passiva
**Sizing:** ~1.5h
**Depende de:** fase-01 (`telemetry-utils.md` exportando `writeTelemetryStart` / `writeTelemetryEnd`)
**Visual:** false

---

## O que esta fase entrega

5 skills do pipeline core (`grill-me`, `write-prd`, `plan-feature`, `execute-plan`, `verify-work`) com 2 chamadas cada (`writeTelemetryStart` no início, `writeTelemetryEnd` no fim — sucesso OU erro). Cobre metade da meta de D13 (10 skills) e a parte do PRD que mais reflete o pipeline canônico v5.x. Cumprimento parcial de CA-03 e RF4.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/grill-me/SKILL.md` | Modify | Adiciona bloco de instrumentação no início e final |
| `anti-vibe-coding/skills/write-prd/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/verify-work/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/lib/telemetry-utils.test.ts` | Modify | Adiciona smoke test "5 pipeline-core skills emit start+end" |

NÃO criar arquivos novos. Modificar SKILL.md existentes apenas no início (bloco `start`) e no final (bloco `end`). Não tocar lógica intermediária — G7 do README ("Skills continuam fazendo o mesmo trabalho").

---

## Implementacao

### Passo 1: Padrão canônico de instrumentação

Bloco copy-pasted nas 5 skills (com `skillName` e `fasePipeline` substituídos). Vai como **bloco de código TypeScript executável** dentro de `SKILL.md` (G8 — texto fora de blocos é ignorado).

**Bloco INÍCIO (logo após o frontmatter YAML, antes da primeira instrução de prosa executável):**

```typescript
// === Telemetria passiva (Plano 03 fase-02) — não remover sem registrar em MEMORY.md ===
// G5: telemetria SEMPRE ativa, ignora architectureDetectorEnabled
// G7: skill name canônico fixo — não derivar de variável

import { writeTelemetryStart, writeTelemetryEnd } from '../../lib/telemetry-utils'
import type { TelemetryStart, TelemetryEnd } from '../../lib/telemetry-types'

const __telemetry_skillName = 'plan-feature' // <- substituir por nome da skill em cada SKILL.md
const __telemetry_fasePipeline = 'plan-feature' // <- mesmo nome (D13)
const __telemetry_startTimestamp = new Date().toISOString()
const __telemetry_startMs = Date.now()

const __telemetry_startEntry: TelemetryStart = {
  evento: 'start',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  profile_arquitetura: 'disabled', // G5: Plano 04 troca para profile real quando implementado
  fase_pipeline: __telemetry_fasePipeline,
}

writeTelemetryStart(__telemetry_startEntry)
// === Fim do bloco de início ===
```

**Bloco FIM (na última seção do SKILL.md, depois de toda lógica da skill — captura sucesso ou erro):**

```typescript
// === Telemetria passiva (Plano 03 fase-02) — registra fim ===
// CA-03: end emitido SEMPRE, com sucesso = true ou false

const __telemetry_endEntry: TelemetryEnd = {
  evento: 'end',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  timestamp_fim: new Date().toISOString(),
  duracao_ms: Date.now() - __telemetry_startMs,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
  tokens_aproximados_consumidos: 0, // G6: aceito como "não medido" — ver MEMORY.md
  arquivos_lidos: 0,                 // G6: idem (heurística futura na Onda 2)
  arquivos_modificados: 0,           // G6: idem
  sucesso: true,                     // troca para false + error_message se a skill capturar erro
}

writeTelemetryEnd(__telemetry_endEntry)
// === Fim do bloco de fim ===
```

### Passo 2: Mapeamento skill → constantes

Tabela de substituições para as 5 skills. Hash-list, não switch:

| Skill | `__telemetry_skillName` | `__telemetry_fasePipeline` |
|-------|--------------------------|-----------------------------|
| grill-me | `'grill-me'` | `'grill-me'` |
| write-prd | `'write-prd'` | `'write-prd'` |
| plan-feature | `'plan-feature'` | `'plan-feature'` |
| execute-plan | `'execute-plan'` | `'execute-plan'` |
| verify-work | `'verify-work'` | `'verify-work'` |

(Mapping 1:1 — cada skill É a sua própria fase no schema. Centralizado em `inferFasePipeline` da fase-01, mas SKILL.md hardcoda o literal para evitar lookup em tempo de execução de skill.)

### Passo 3: Posicionamento exato do bloco em cada SKILL.md

Convenção: **bloco INÍCIO logo após o frontmatter `---` e antes da primeira heading `##`**. **Bloco FIM como última subseção** (depois da seção "Output" / "Resultado" / similar de cada skill).

Cada SKILL.md das 5 já tem estrutura:

```markdown
---
name: plan-feature
description: ...
---

## Quando Acionar
...

## Fluxo
...

## Output
...
```

Após instrumentação:

```markdown
---
name: plan-feature
description: ...
---

\`\`\`typescript
// === Telemetria passiva (Plano 03 fase-02) ===
// (BLOCO INÍCIO — passo 1 acima)
\`\`\`

## Quando Acionar
...

## Fluxo
...

## Output
...

\`\`\`typescript
// === Telemetria passiva (Plano 03 fase-02) — registra fim ===
// (BLOCO FIM — passo 1 acima)
\`\`\`
```

### Passo 4: Captura de erro em cada skill (sucesso=false)

Se a skill já tem error handling explícito (try/catch ao redor da lógica principal), o `__telemetry_endEntry.sucesso` deve ser ajustado dentro do `catch` antes de relançar. Se a skill NÃO tem try/catch (caso da maioria das skills declarativas), aceitar limitação: `sucesso: true` é sempre escrito. Skill que crashar antes do bloco FIM gera linha `start` órfã (G9) — Plano 05 lida com isso.

Para skills com try/catch já presente, padrão:

```typescript
try {
  // lógica original da skill
  __telemetry_endEntry.sucesso = true
} catch (err) {
  __telemetry_endEntry.sucesso = false
  __telemetry_endEntry.error_message = err instanceof Error ? err.message : String(err)
  throw err
} finally {
  writeTelemetryEnd(__telemetry_endEntry)
}
```

NÃO introduzir try/catch novo só para telemetria — G7 ("Skills continuam fazendo o mesmo trabalho"). Se a skill original não tem captura, deixe `sucesso: true` hardcoded e documente em MEMORY.md como limitação conhecida.

### Passo 5: Smoke test agregado

Adicionar caso ao `telemetry-utils.test.ts` que simula execução das 5 skills lendo o conteúdo dos blocos de instrumentação:

```typescript
// telemetry-utils.test.ts (append)

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('pipeline-core skills (fase-02 smoke)', () => {
  const PIPELINE_CORE = ['grill-me', 'write-prd', 'plan-feature', 'execute-plan', 'verify-work'] as const

  test('each pipeline-core SKILL.md contains writeTelemetryStart and writeTelemetryEnd calls', () => {
    for (const skill of PIPELINE_CORE) {
      const skillPath = join('anti-vibe-coding', 'skills', skill, 'SKILL.md')
      expect(existsSync(skillPath)).toBe(true)
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toContain('writeTelemetryStart')
      expect(content).toContain('writeTelemetryEnd')
      expect(content).toContain(`skill_invocada: '${skill}'`).or // forma alternativa: const com literal
        .toContain(`skillName = '${skill}'`)
    }
  })

  test('each pipeline-core SKILL.md imports from telemetry-utils', () => {
    for (const skill of ['grill-me', 'write-prd', 'plan-feature', 'execute-plan', 'verify-work']) {
      const skillPath = join('anti-vibe-coding', 'skills', skill, 'SKILL.md')
      const content = readFileSync(skillPath, 'utf-8')
      // import relativo da skill para a lib: ../../lib/telemetry-utils
      expect(content).toMatch(/from ['"]\.\.\/\.\.\/lib\/telemetry-utils['"]/)
    }
  })

  test('runtime smoke: invoking start+end blocks produces 2 valid lines (manual integration)', () => {
    // Este teste é integração manual — invoca os helpers diretamente para
    // simular o comportamento do bloco copiado em cada SKILL.md.
    const tmp = mkdtempSync(join(tmpdir(), 'pipeline-core-smoke-'))
    const originalCwd = process.cwd()
    process.chdir(tmp)

    try {
      const { writeTelemetryStart, writeTelemetryEnd } = require('./telemetry-utils')

      const startedAt = Date.now()
      writeTelemetryStart({
        evento: 'start',
        skill_invocada: 'plan-feature',
        timestamp_inicio: new Date(startedAt).toISOString(),
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
      })

      writeTelemetryEnd({
        evento: 'end',
        skill_invocada: 'plan-feature',
        timestamp_inicio: new Date(startedAt).toISOString(),
        timestamp_fim: new Date(startedAt + 100).toISOString(),
        duracao_ms: 100,
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
        tokens_aproximados_consumidos: 0,
        arquivos_lidos: 0,
        arquivos_modificados: 0,
        sucesso: true,
      })

      const expected = join(tmp, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(expected, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(2)
    } finally {
      process.chdir(originalCwd)
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
```

---

## Gotchas

- **G5 do README — flag ignorada:** `profile_arquitetura: 'disabled'` é literal hardcoded nesta fase. Plano 04 (`readArchitectureProfile`) vai trocar isso quando flag = true. NÃO antecipar essa troca aqui — manteria branching que não funciona ainda (manifest pode nem ter o campo).
- **G6 do README — campos numéricos zerados:** `tokens_aproximados_consumidos`, `arquivos_lidos`, `arquivos_modificados` ficam em `0`. Documentar em MEMORY.md como limitação conhecida (heurística futura na Onda 2).
- **G7 do README — não alterar comportamento:** apenas 2 blocos novos (início/fim). Lógica da skill intacta. Se aparecer urgência de "também medir X" durante implementação, registrar em MEMORY.md e adiar.
- **G8 do README — markdown executável:** blocos com triple backtick e `typescript`. Texto fora dos blocos é ignorado pelo modelo (lição CLAUDE.md raiz). NÃO colocar lógica em prosa.
- **G9 do README — start órfão:** se a skill crashar entre os 2 blocos sem try/catch envolvendo, ficará linha `start` sem `end`. Aceitar — Plano 05 detecta.
- **Local — variáveis com prefixo `__telemetry_`:** evita colisão com qualquer variável existente nas skills. Convenção: prefixo + nome descritivo. NÃO encurtar para `__t_skill` ou similar — legibilidade ganha.
- **Local — paths relativos do import:** `../../lib/telemetry-utils` assume estrutura `skills/<skill>/SKILL.md → skills/lib/telemetry-utils.md`. Se a estrutura mudar (Plano 01 movou helpers para outro lugar), atualizar nas 5 skills + smoke test.

---

## Verificacao

### TDD

- [ ] **RED:** Smoke test escrito antes da modificação das 5 SKILL.md. Falha porque blocos de telemetria ainda não existem.
  - Comando: `bun run test --grep 'pipeline-core skills'`
  - Resultado esperado: 3 falhas (each contains, each imports, runtime smoke)

- [ ] **GREEN:** Bloco INÍCIO + bloco FIM colado nas 5 SKILL.md com substituição correta de `skill_invocada`. Smoke test passa.
  - Comando: `bun run test --grep 'pipeline-core skills'`
  - Resultado esperado: `3 passed, 0 failed`

- [ ] **REFACTOR:** Verificar que as 5 SKILL.md mantêm formatação consistente, sem variáveis duplicadas, sem texto solto fora de blocos.

### Checklist

- [ ] Cada uma das 5 SKILL.md tem bloco INÍCIO no topo (após frontmatter)
- [ ] Cada uma das 5 SKILL.md tem bloco FIM no final
- [ ] `__telemetry_skillName` e `__telemetry_fasePipeline` casam com o nome da skill (verificar 1 a 1)
- [ ] Imports relativos `../../lib/telemetry-utils` corretos em cada SKILL.md
- [ ] Nenhuma skill teve sua lógica intermediária alterada (apenas blocos de instrumentação adicionados — `git diff` mostra apenas adições delimitadas pelos comentários `=== Telemetria passiva ===`)
- [ ] `bun run test --grep 'pipeline-core'` retorna verde
- [ ] `bun run test --grep 'telemetry-utils'` continua verde (não regrediu)
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por máquina:**
- `bun run test --grep 'pipeline-core'` retorna `3 passed, 0 failed`
- `grep -c "writeTelemetryStart" anti-vibe-coding/skills/{grill-me,write-prd,plan-feature,execute-plan,verify-work}/SKILL.md` retorna 5 (uma ocorrência por skill)
- `grep -c "writeTelemetryEnd" anti-vibe-coding/skills/{grill-me,write-prd,plan-feature,execute-plan,verify-work}/SKILL.md` retorna 5
- `git diff --stat anti-vibe-coding/skills/grill-me/SKILL.md` mostra apenas adições (zero deleções de linhas pré-existentes que não fazem parte do bloco)

**Por humano:**
- Invocar `/anti-vibe-coding:plan-feature` em um repo de teste e confirmar que `.claude/metrics/YYYY-MM.jsonl` ganhou exatamente 2 linhas (uma `start`, uma `end`) com `skill_invocada = "plan-feature"`. Comportamento da skill em si idêntico ao anterior.

---

## Próxima Fase

`fase-03-instrumentar-iterate-e-consultivas.md` — aplica o mesmo padrão nas 5 skills consultivas (`iterate`, `consultant`, `architecture`, `design-twice`, `quick-plan`), fechando D13.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

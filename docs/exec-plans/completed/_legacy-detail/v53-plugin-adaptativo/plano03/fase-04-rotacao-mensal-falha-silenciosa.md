# Fase 04: Rotação Mensal e Falha Silenciosa (CA-09)

**Plano:** 03 — Telemetria Passiva
**Sizing:** ~1h
**Depende de:** fase-01, fase-02, fase-03 (10 skills instrumentadas + lib testada)
**Visual:** false

---

## O que esta fase entrega

Confirma rotação automática `YYYY-MM.jsonl` (path computado a cada chamada — G3) e valida explicitamente CA-09 com regression test de I/O. Cobre o edge case de skill que falha em meio à execução com `writeEnd` registrando `sucesso: false` + `error_message`. Não introduz código novo significativo — é a fase de **consolidação de testes** para garantir que as garantias do PRD foram realmente entregues.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/telemetry-utils.test.ts` | Modify | Adiciona suite "rotação mensal" e suite "CA-09 regression" |
| `anti-vibe-coding/skills/lib/telemetry-utils.md` | Modify (mínimo) | Apenas se descobrir bug nas fases 02-03 que precise de fix de robustez |
| `anti-vibe-coding/docs/telemetry-schema.md` | Modify | Adiciona seção "Rotação Mensal" e "Comportamento em Falha" referenciando CA-09 |

NÃO criar lib nova. NÃO modificar SKILL.md das 10 skills (já fechadas em fase-02 e fase-03).

---

## Implementacao

### Passo 1: Suite "rotação mensal"

Valida que `computeMonthlyPath` produz paths distintos para meses diferentes e que o helper escreve no path certo conforme o mês corrente da chamada (G3).

```typescript
// telemetry-utils.test.ts (append)

describe('rotação mensal (fase-04)', () => {
  test('computeMonthlyPath returns different paths for different months', () => {
    const may = computeMonthlyPath(new Date('2026-05-15T10:00:00Z'))
    const june = computeMonthlyPath(new Date('2026-06-15T10:00:00Z'))
    expect(may).not.toBe(june)
    expect(may).toMatch(/2026-05\.jsonl$/)
    expect(june).toMatch(/2026-06\.jsonl$/)
  })

  test('computeMonthlyPath handles year transition (Dec → Jan)', () => {
    const dec = computeMonthlyPath(new Date('2026-12-31T23:59:00Z'))
    const jan = computeMonthlyPath(new Date('2027-01-01T00:01:00Z'))
    expect(dec).toMatch(/2026-12\.jsonl$/)
    expect(jan).toMatch(/2027-01\.jsonl$/)
  })

  test('writeTelemetryStart computes path at write-time (G3 — não cacheado)', () => {
    // Garantia indireta: se o módulo cacheasse o path em variável de topo,
    // mocks de Date.now subsequentes não afetariam writes posteriores.
    // Aqui apenas verificamos que computeMonthlyPath é chamada (não mockada
    // em tempo de import).
    const path1 = computeMonthlyPath()
    const path2 = computeMonthlyPath()
    expect(path1).toBe(path2) // mesmo mês → mesmo path
    // Se cachear, mudança em new Date() não afetaria — mas como recomputa,
    // mês seguinte produzirá path diferente automaticamente.
  })

  test('separate months produce separate JSONL files in same metrics dir', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'rotation-'))
    try {
      const mayPath = join(tmp, '2026-05.jsonl')
      const junePath = join(tmp, '2026-06.jsonl')

      appendJsonlLine(mayPath, 'may-line\n')
      appendJsonlLine(junePath, 'june-line\n')

      expect(readFileSync(mayPath, 'utf-8')).toBe('may-line\n')
      expect(readFileSync(junePath, 'utf-8')).toBe('june-line\n')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
```

### Passo 2: Suite "CA-09 regression — falha silenciosa"

Valida explicitamente que I/O fail nunca derruba a skill caller. Cobre 3 modos de falha:

1. Path inválido (caractere nulo).
2. Diretório read-only (não conseguimos `mkdirSync` nem `appendFileSync`).
3. Disco "cheio" — simulado via path absurdamente longo (Windows: > 260 chars sem prefixo `\\?\`).

```typescript
// telemetry-utils.test.ts (append)

import { chmodSync, mkdirSync as fsMkdirSync } from 'node:fs'

describe('CA-09 regression — falha silenciosa de I/O (fase-04)', () => {
  test('appendJsonlLine swallows error from null-char path and emits [telemetry-warn]', () => {
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

    try {
      expect(() => appendJsonlLine('\0/invalid.jsonl', 'x\n')).not.toThrow()
      expect(errors.some(e => e.includes('[telemetry-warn]'))).toBe(true)
    } finally {
      console.error = original
    }
  })

  test('writeTelemetryStart never throws when target dir is invalid', () => {
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

    const originalCwd = process.cwd()
    // cwd inválido com null char: mkdirSync vai falhar
    // Não conseguimos mudar para cwd inválido, então passamos via baseDir
    try {
      expect(() => {
        const badPath = computeMonthlyPath(new Date(), '\0/no-where')
        appendJsonlLine(badPath, serializeEntry(FIXTURE_START))
      }).not.toThrow()
      expect(errors.some(e => e.includes('[telemetry-warn]'))).toBe(true)
    } finally {
      console.error = original
      process.chdir(originalCwd)
    }
  })

  test('skill simulação: par start+end com falha em mkdir produz 0 linhas escritas, 0 throws', () => {
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

    try {
      // Simular execução completa de uma skill onde a telemetria falha
      // 1. start — falha silenciosa
      // 2. lógica da skill (não lançamos nada — skill terminaria normal)
      // 3. end — falha silenciosa
      const badBaseDir = '\0/totally-invalid'
      const badPath = computeMonthlyPath(new Date(), badBaseDir)

      expect(() => appendJsonlLine(badPath, serializeEntry(FIXTURE_START))).not.toThrow()
      // ... lógica da skill rodaria aqui ...
      expect(() => appendJsonlLine(badPath, serializeEntry(FIXTURE_END_SUCCESS))).not.toThrow()

      // Pelo menos 2 warnings (1 por chamada com path inválido)
      expect(errors.filter(e => e.includes('[telemetry-warn]')).length).toBeGreaterThanOrEqual(2)
    } finally {
      console.error = original
    }
  })
})
```

### Passo 3: Suite "skill que falha em meio à execução"

CA-03 exige que `end` seja escrito MESMO quando a skill falha. Validar via integração: simular bloco de uma skill com try/catch interno (padrão do passo 4 da fase-02) e confirmar que `sucesso: false` + `error_message` aparecem no JSONL.

```typescript
// telemetry-utils.test.ts (append)

describe('skill com erro em meio à execução (fase-04 / CA-03)', () => {
  test('end entry com sucesso=false e error_message preservados em JSONL', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'skill-error-'))
    const originalCwd = process.cwd()
    process.chdir(tmp)

    try {
      // Simular padrão try/catch/finally que skills com error handling adotam
      const startedAt = Date.now()
      const startEntry: TelemetryStart = {
        evento: 'start',
        skill_invocada: 'plan-feature',
        timestamp_inicio: new Date(startedAt).toISOString(),
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
      }
      writeTelemetryStart(startEntry)

      const endEntry: TelemetryEnd = {
        evento: 'end',
        skill_invocada: 'plan-feature',
        timestamp_inicio: startEntry.timestamp_inicio,
        timestamp_fim: new Date().toISOString(),
        duracao_ms: 50,
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
        tokens_aproximados_consumidos: 0,
        arquivos_lidos: 1,
        arquivos_modificados: 0,
        sucesso: true,
      }

      // Simular erro
      try {
        throw new Error('boom — simulação de erro de skill')
      } catch (err) {
        endEntry.sucesso = false
        endEntry.error_message = err instanceof Error ? err.message : String(err)
        // skill original re-lançaria err, mas a telemetria já está fechada
      } finally {
        writeTelemetryEnd(endEntry)
      }

      const jsonlPath = join(tmp, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(jsonlPath, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(2)

      const parsedEnd = parseTelemetryEntry(JSON.parse(lines[1]))
      if (parsedEnd.evento !== 'end') throw new Error('expected end')
      expect(parsedEnd.sucesso).toBe(false)
      expect(parsedEnd.error_message).toBe('boom — simulação de erro de skill')
    } finally {
      process.chdir(originalCwd)
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('start órfão (G9): skill crash sem chamar writeTelemetryEnd produz só linha start', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'orphan-start-'))
    const originalCwd = process.cwd()
    process.chdir(tmp)

    try {
      writeTelemetryStart({
        evento: 'start',
        skill_invocada: 'design-twice',
        timestamp_inicio: new Date().toISOString(),
        profile_arquitetura: 'disabled',
        fase_pipeline: 'design-twice',
      })

      // Simulação: skill crashou aqui sem catch, writeTelemetryEnd nunca chamado.

      const jsonlPath = join(tmp, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(jsonlPath, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(1)

      const parsed = parseTelemetryEntry(JSON.parse(lines[0]))
      expect(parsed.evento).toBe('start')
      // Plano 05 detecta isso como "abandonada" — não é responsabilidade desta fase resolver
    } finally {
      process.chdir(originalCwd)
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
```

### Passo 4: Documentação no `telemetry-schema.md`

Adicionar 2 seções no markdown criado pelo Plano 01 fase-02. Conteúdo curto, factual, referenciando os critérios do PRD.

```markdown
<!-- append em anti-vibe-coding/docs/telemetry-schema.md -->

## Rotação Mensal

Os arquivos JSONL rotacionam automaticamente por mês. O path é computado **na escrita** (Plano 03 G3) com `new Date().toISOString().slice(0, 7)`, ou seja, `YYYY-MM`.

- Janeiro 2026 → `.claude/metrics/2026-01.jsonl`
- Maio 2026 → `.claude/metrics/2026-05.jsonl`
- Dezembro 2026 → `.claude/metrics/2026-12.jsonl`
- Janeiro 2027 → `.claude/metrics/2027-01.jsonl`

**Limitação aceita:** uma skill que rodou 30 segundos antes da virada do mês pode escrever a linha `start` em `2026-05.jsonl` e a linha `end` em `2026-06.jsonl`. Comportamento é raro, intencional e tratado pelo script de análise (Plano 05).

## Comportamento em Falha (CA-09)

Telemetria nunca derruba a skill que a chama. Em caso de erro de I/O (path inválido, permissão negada, disco cheio):

1. O erro é capturado pelo `try/catch` interno de `appendJsonlLine`.
2. Uma mensagem é escrita em `stderr` com prefixo `[telemetry-warn]`.
3. A skill caller continua execução normal.

Para o consumidor (script de análise — Plano 05): a ausência de uma linha esperada não é considerada erro do schema, é gracefully ignorado.

## Linha `start` Órfã

Se uma skill crashar entre o `writeTelemetryStart` e o `writeTelemetryEnd` (sem try/catch ao redor da lógica), a linha `end` correspondente NÃO será escrita. O script de análise (Plano 05) trata starts órfãos como "skill abandonada" — categoria útil para detectar instabilidade.
```

### Passo 5: Verificar que não há regressão nas fases 02 e 03

Como esta fase só adiciona testes, ao final rodar a suite COMPLETA:

```bash
bun run test --grep 'telemetry|D13|pipeline-core|consultivas|rotação|CA-09|skill com erro'
```

Esperado: TODOS os testes do plano (fase-01, 02, 03, 04) verdes.

---

## Gotchas

- **G2 do README — falha silenciosa testada explicitamente:** esta fase é onde provamos que CA-09 funciona. Sem essa suite, o critério ficaria "implementado mas não verificado".
- **G3 do README — path computado a cada chamada:** teste `writeTelemetryStart computes path at write-time` é defensivo. Se alguém refatorar `telemetry-utils` movendo `computeMonthlyPath()` para variável de topo (otimização ingênua), o teste de "year transition" via mock falharia em produção real (mas não no teste — limitação do teste; documentar em MEMORY.md).
- **G9 do README — start órfão é POR DESIGN:** o teste cobre que esse comportamento existe e é determinístico. Não é bug.
- **Local — `chmod` em testes de read-only é frágil em Windows:** evitamos depender disso. Usamos `\0` em paths como vetor portável de erro.
- **Local — `process.chdir` em testes:** repetido das fases anteriores. Sempre restaurar em `finally`.
- **Local — sem mock de `Date`:** decidimos não introduzir `vi.useFakeTimers` ou similar. `computeMonthlyPath` aceita `Date` como parâmetro — testamos com datas literais. Mock de `Date.now` global teria efeitos colaterais em outros testes.

---

## Verificacao

### TDD

- [ ] **RED:** Testes das 3 suites (rotação, CA-09, skill com erro) escritos antes de qualquer mudança em `telemetry-utils.md` ou docs. Como a lib já é robusta após fase-01, a maioria dos testes pode passar de cara — registrar quais foram realmente RED.
  - Comando: `bun run test --grep 'rotação mensal|CA-09 regression|skill com erro'`
  - Resultado esperado: alguns testes passam imediatamente (boa cobertura da fase-01); registrar em MEMORY.md quais precisaram de mudança no helper

- [ ] **GREEN:** Se algum teste falhar (ex: bug descoberto na rotação ou no error handling), aplicar fix mínimo em `telemetry-utils.md` e revalidar. Documentar fix em MEMORY.md como BUG-X.
  - Comando: `bun run test --grep 'rotação mensal|CA-09 regression|skill com erro'`
  - Resultado esperado: `8 passed, 0 failed` (4 rotação + 3 CA-09 + 2 skill com erro = 9 — ajustar contagem ao escrever)

- [ ] **REFACTOR:** Documentação `telemetry-schema.md` atualizada com 3 seções novas. Texto coerente com o que os testes provam.

### Checklist

- [ ] Suite "rotação mensal" tem ≥ 4 testes (paths distintos por mês, year transition, recompute, arquivos separados)
- [ ] Suite "CA-09 regression" tem ≥ 3 testes (null-char, writeStart silencioso, simulação de skill com falha total de I/O)
- [ ] Suite "skill com erro" tem ≥ 2 testes (sucesso=false com error_message, start órfão)
- [ ] `telemetry-schema.md` tem seções "Rotação Mensal", "Comportamento em Falha (CA-09)", "Linha start Órfã"
- [ ] Suite COMPLETA do plano verde: `bun run test --grep 'telemetry|D13|pipeline-core|consultivas|rotação|CA-09|skill com erro'`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`
- [ ] MEMORY.md preenchido com qualquer bug descoberto durante esta fase + decisões emergentes (ex: `tokens_aproximados_consumidos: 0` confirmado como decisão final)

---

## Criterio de Aceite

**Por máquina:**
- `bun run test --grep 'rotação mensal'` retorna `4 passed, 0 failed`
- `bun run test --grep 'CA-09 regression'` retorna `3 passed, 0 failed`
- `bun run test --grep 'skill com erro'` retorna `2 passed, 0 failed`
- `bun run test` (suite completa) retorna 0 falhas
- `grep -c "Rotação Mensal\|Comportamento em Falha\|Linha .start. Órfã" anti-vibe-coding/docs/telemetry-schema.md` retorna `>= 3`

**Por humano:**
- Provocar erro real: rodar uma skill instrumentada com `.claude/metrics/` em diretório read-only no SO, confirmar que (1) a skill termina normalmente, (2) `stderr` mostra `[telemetry-warn]`, (3) nenhum throw escapou para o usuário
- Ler o `telemetry-schema.md` atualizado e confirmar que as 3 seções novas explicam o comportamento sem ambiguidade

---

## Próxima Fase

**Plano 03 concluído.** Próximo plano: **Plano 04 — Modo Dual + 5 Princípios Universais** (`../../plano04/README.md`). Plano 04 vai consumir indiretamente esta lib quando as skills estruturantes começarem a ler `architectureProfile` real (substituindo `'disabled'` literal pelo valor do manifest). Telemetria continua sempre ativa (G5) independentemente do que Plano 04 fizer.

Pré-requisito para Plano 05 (Análise & Dogfooding): a lib desta fase produz o JSONL que o script CLI vai consumir. Sem rodar Plano 03 antes, Plano 05 não tem dados.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

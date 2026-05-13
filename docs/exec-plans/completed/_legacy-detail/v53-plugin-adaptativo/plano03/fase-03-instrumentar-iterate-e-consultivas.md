# Fase 03: Instrumentar Iterate e Consultivas (5 Skills)

**Plano:** 03 — Telemetria Passiva
**Sizing:** ~1.5h
**Depende de:** fase-01 (`telemetry-utils.md`). Pode rodar em paralelo com fase-02.
**Visual:** false

---

## O que esta fase entrega

5 skills consultivas (`iterate`, `consultant`, `architecture`, `design-twice`, `quick-plan`) instrumentadas com o mesmo padrão da fase-02. Fecha a meta de D13 (10 skills total: 5 do pipeline core + 5 consultivas). Cumpre RF4 e CA-03 totais.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/iterate/SKILL.md` | Modify | Bloco INÍCIO + bloco FIM |
| `anti-vibe-coding/skills/consultant/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/architecture/SKILL.md` | Modify | Mesmo padrão (cuidado: Plano 01 fase-06 já tocou esta skill — Tracer Bullet) |
| `anti-vibe-coding/skills/design-twice/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/quick-plan/SKILL.md` | Modify | Mesmo padrão |
| `anti-vibe-coding/skills/lib/telemetry-utils.test.ts` | Modify | Adiciona smoke test "5 consultivas skills emit start+end" |

---

## Implementacao

### Passo 1: Reusar padrão canônico da fase-02

Mesmo bloco INÍCIO + bloco FIM da fase-02 (passo 1). Substituir apenas `__telemetry_skillName` e `__telemetry_fasePipeline` por skill. Repetir com cuidado para evitar copy-paste com nome errado.

| Skill | `__telemetry_skillName` | `__telemetry_fasePipeline` |
|-------|--------------------------|-----------------------------|
| iterate | `'iterate'` | `'iterate'` |
| consultant | `'consultant'` | `'consultant'` |
| architecture | `'architecture'` | `'architecture'` |
| design-twice | `'design-twice'` | `'design-twice'` |
| quick-plan | `'quick-plan'` | `'quick-plan'` |

### Passo 2: Cuidado especial com `architecture` (interação com Plano 01 fase-06)

Plano 01 fase-06 (Tracer Bullet) já modifica `architecture/SKILL.md` para ler `architectureProfile` e adaptar 1 mensagem. Ao instrumentar nesta fase:

1. **Não remover** o código do Tracer Bullet (lê profile + adapta mensagem).
2. **Posicionar bloco INÍCIO antes** do Tracer Bullet (instrumentação envolve a skill inteira).
3. **Posicionar bloco FIM depois** do Tracer Bullet.
4. Conferir via `git log -p anti-vibe-coding/skills/architecture/SKILL.md` que o Tracer Bullet (commit do Plano 01 fase-06) ainda está presente após esta fase.

Layout final esperado de `architecture/SKILL.md`:

```markdown
---
name: architecture
description: ...
---

\`\`\`typescript
// === Telemetria passiva (Plano 03 fase-03) ===
// (BLOCO INÍCIO)
\`\`\`

## Quando Acionar
...

\`\`\`typescript
// === Tracer Bullet — Plano 01 fase-06 ===
// (lê profile, adapta UMA mensagem do recommendation table)
\`\`\`

## Fluxo
...

## Output
...

\`\`\`typescript
// === Telemetria passiva (Plano 03 fase-03) — registra fim ===
// (BLOCO FIM)
\`\`\`
```

**Decisão sugerida (registrar em MEMORY.md ao executar):** se Tracer Bullet do Plano 01 fase-06 declarou variáveis com prefixo `__profile_`, esta fase NÃO conflita (prefixo `__telemetry_`). Confirmar ausência de colisão com `grep` antes de finalizar.

### Passo 3: Skills sem try/catch existente — limitação conhecida

Das 5 consultivas:
- `iterate` — tipicamente SEM try/catch (skill declarativa)
- `consultant` — SEM try/catch (orquestração de prompts)
- `architecture` — SEM try/catch
- `design-twice` — SEM try/catch (chama subagentes em paralelo)
- `quick-plan` — SEM try/catch

Conclusão: nas 5 consultivas, `__telemetry_endEntry.sucesso = true` é hardcoded. Limitação documentada em MEMORY.md (coerente com decisão da fase-02).

### Passo 4: Smoke test agregado

Mesmo padrão da fase-02 mas com lista das 5 consultivas:

```typescript
// telemetry-utils.test.ts (append — após bloco da fase-02)

describe('consultivas skills (fase-03 smoke)', () => {
  const CONSULTIVAS = ['iterate', 'consultant', 'architecture', 'design-twice', 'quick-plan'] as const

  test('each consultiva SKILL.md contains writeTelemetryStart and writeTelemetryEnd calls', () => {
    for (const skill of CONSULTIVAS) {
      const skillPath = join('anti-vibe-coding', 'skills', skill, 'SKILL.md')
      expect(existsSync(skillPath)).toBe(true)
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toContain('writeTelemetryStart')
      expect(content).toContain('writeTelemetryEnd')
    }
  })

  test('each consultiva SKILL.md imports from telemetry-utils', () => {
    for (const skill of ['iterate', 'consultant', 'architecture', 'design-twice', 'quick-plan']) {
      const skillPath = join('anti-vibe-coding', 'skills', skill, 'SKILL.md')
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toMatch(/from ['"]\.\.\/\.\.\/lib\/telemetry-utils['"]/)
    }
  })

  test('architecture skill preserves Tracer Bullet code from Plano 01 fase-06', () => {
    const path = join('anti-vibe-coding', 'skills', 'architecture', 'SKILL.md')
    const content = readFileSync(path, 'utf-8')
    // Tracer Bullet do Plano 01 fase-06 declara leitura de architectureProfile
    expect(content).toContain('architectureProfile')
    // E o bloco de telemetria desta fase também está presente
    expect(content).toContain('writeTelemetryStart')
  })
})

describe('D13 cobertura completa (fase-02 + fase-03)', () => {
  const ALL_TEN = [
    'grill-me', 'write-prd', 'plan-feature', 'execute-plan', 'verify-work',
    'iterate', 'consultant', 'architecture', 'design-twice', 'quick-plan',
  ] as const

  test('all 10 instrumented skills have telemetry blocks (D13 / RF4)', () => {
    for (const skill of ALL_TEN) {
      const path = join('anti-vibe-coding', 'skills', skill, 'SKILL.md')
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain(`skill_invocada: '${skill}'`).or
        .toContain(`skillName = '${skill}'`)
    }
  })

  test('exactly 10 skills are instrumented (no more, no less — G7)', () => {
    // Sanity check: lista canônica em INSTRUMENTED_SKILLS bate com SKILL.md realmente modificadas
    const { INSTRUMENTED_SKILLS } = require('./telemetry-utils')
    expect(INSTRUMENTED_SKILLS).toHaveLength(10)

    const sortedExpected = [...ALL_TEN].sort()
    const sortedActual = [...INSTRUMENTED_SKILLS].sort()
    expect(sortedActual).toEqual(sortedExpected)
  })
})
```

### Passo 5: Verificação visual após cada SKILL.md

Antes de fazer commit, abrir cada uma das 5 SKILL.md modificadas e ler:
1. Bloco INÍCIO está logo após o frontmatter `---` de fechamento.
2. Bloco FIM está como última seção do arquivo.
3. `__telemetry_skillName` literal bate com o nome da skill (sem typo).
4. Texto fora dos blocos não foi acidentalmente alterado.

Comando útil:

```bash
# Mostra apenas as primeiras 30 e últimas 30 linhas de cada SKILL.md
for skill in iterate consultant architecture design-twice quick-plan; do
  echo "=== $skill ==="
  head -n 30 anti-vibe-coding/skills/$skill/SKILL.md
  echo "..."
  tail -n 30 anti-vibe-coding/skills/$skill/SKILL.md
  echo ""
done
```

---

## Gotchas

- **G5 do README — flag ignorada:** `profile_arquitetura: 'disabled'` literal aqui também. Plano 04 substituirá com leitura real do manifest.
- **G6 do README — campos zerados:** mesma decisão da fase-02 (consistência entre as 10 skills).
- **G7 do README — exatamente 10 skills:** o teste `D13 cobertura completa` valida isso. Se `INSTRUMENTED_SKILLS` divergir das skills realmente modificadas, falha.
- **G8 do README — markdown executável:** mesma convenção de blocos `typescript`.
- **G9 do README — start órfão:** das 5 consultivas, `design-twice` é a mais propensa a "abandono" (usuário cancela a exploração paralela). Aceitar.
- **Local — colisão com Tracer Bullet em `architecture`:** Plano 01 fase-06 já editou esta skill. Verificar que ambos os blocos coexistem. Teste explícito (`preserves Tracer Bullet code`) cobre.
- **Local — `design-twice` paraleliza subagentes:** o tempo entre `start` e `end` pode ser longo (subagentes rodam em paralelo). `duracao_ms` vai refletir o tempo total da orquestração, não o tempo de cada subagente individual. Decisão emergente: aceitar — registrar em MEMORY.md.
- **Local — `consultant` pode ser entrada de pipeline:** quando usuário invoca `consultant` antes de `grill-me`, telemetria registra como `fase_pipeline: 'consultant'` (não como entrada do pipeline). Coerente — schema do Plano 01 fase-02 trata cada skill como sua própria fase.

---

## Verificacao

### TDD

- [ ] **RED:** Smoke test (passo 4) escrito antes da modificação das 5 SKILL.md consultivas. Falha pelos mesmos motivos da fase-02.
  - Comando: `bun run test --grep 'consultivas skills|D13 cobertura'`
  - Resultado esperado: 4 falhas

- [ ] **GREEN:** Blocos colados nas 5 SKILL.md consultivas. Tracer Bullet preservado em `architecture`. Smoke test passa.
  - Comando: `bun run test --grep 'consultivas skills|D13 cobertura'`
  - Resultado esperado: `4 passed, 0 failed`

- [ ] **REFACTOR:** Verificar consistência visual entre as 10 SKILL.md. Comentários de delimitação (`=== Telemetria passiva ===`) presentes em todas as 10 (5 da fase-02 + 5 da fase-03).

### Checklist

- [ ] Cada uma das 5 SKILL.md consultivas tem bloco INÍCIO + bloco FIM
- [ ] `architecture/SKILL.md` mantém código do Tracer Bullet (Plano 01 fase-06) intacto
- [ ] `__telemetry_skillName` e `__telemetry_fasePipeline` corretos por skill (5 conferidos)
- [ ] Imports `from '../../lib/telemetry-utils'` presentes nas 5
- [ ] Nenhum text body fora dos blocos foi alterado (apenas adições delimitadas)
- [ ] `bun run test --grep 'D13'` retorna verde — confirma 10/10 skills instrumentadas
- [ ] `bun run test` (suite completa) continua verde
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`
- [ ] Commits atômicos por skill (recomendado): `feat(telemetry): instrumentar <skill>` × 5

---

## Criterio de Aceite

**Por máquina:**
- `bun run test --grep 'consultivas skills'` retorna `3 passed, 0 failed`
- `bun run test --grep 'D13 cobertura'` retorna `2 passed, 0 failed`
- `grep -l "writeTelemetryStart" anti-vibe-coding/skills/*/SKILL.md | wc -l` retorna `10` (G7 / D13)
- `grep -c "Tracer Bullet" anti-vibe-coding/skills/architecture/SKILL.md` retorna `>= 1` (preservação confirmada)
- `git diff --stat` mostra apenas as 5 SKILL.md modificadas + telemetry-utils.test.ts (sem deleções de linhas funcionais pré-existentes)

**Por humano:**
- Invocar `/anti-vibe-coding:design-twice` num repo de teste e confirmar 2 linhas em `.claude/metrics/YYYY-MM.jsonl` (`evento: start` e `evento: end`)
- Invocar `/anti-vibe-coding:architecture` e confirmar que (1) telemetria foi gravada E (2) recommendation table adaptado pelo Tracer Bullet ainda funciona — provando convivência entre Plano 01 fase-06 e Plano 03 fase-03

---

## Próxima Fase

`fase-04-rotacao-mensal-falha-silenciosa.md` — confirma rotação `YYYY-MM`, valida CA-09 com regression test de I/O com path inválido, e cobre o edge case de skill que crasha em meio à execução (`writeEnd` com `sucesso: false`).

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

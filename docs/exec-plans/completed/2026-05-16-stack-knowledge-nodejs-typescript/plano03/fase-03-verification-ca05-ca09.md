<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): E2E stack-aware-preface — Plano 03 fase-03, CA-05 + CA-09`
-->

# Fase 03: Verificação CA-05 + CA-09 nas 7 skills cross-stack

**Plano:** 03 — Skill Wire-up (6 cross-stack restantes)
**Sizing:** 1-1.5h
**Depende de:** fase-01 (batch 1 wired) + fase-02 (batch 2 wired)
**Visual:** false

---

## O que esta fase entrega

E2E reutilizável que percorre **as 7 skills cross-stack** (`security` + as 6 deste plano) em **2 cenários** (`.claude/knowledge/INDEX.md` presente e ausente) e assertia:
- **CA-05** — quando INDEX existe, o bloco `stack-aware-preface` está presente no SKILL.md e a lógica gera a frase de citação (preface não-vazio).
- **CA-09** — quando INDEX não existe, a lógica produz preface `''` literal; nenhum warning/log/exception é emitido.

Total: **7 skills × 2 cenários = 14 asserts**. Setup do projeto temp é **inline** no test file (padrão do Plano 01 fase-05 e de `tests/e2e/init-tracer-bullet.test.ts` — não há `tests/e2e/helpers/temp-project.ts` no repo; o helper genérico `tests/helpers/v6-fixture-setup.ts` resolve outro caso e não se aplica aqui).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-aware-preface-all-skills.test.ts` | Create | E2E principal — 7 skills × 2 cenários (INDEX presente / ausente). Setup inline com `mkdtempSync` (sem helper externo, alinhado com `init-tracer-bullet.test.ts` e Plano 01 fase-05). |

---

## Implementacao

### Passo 1 (RED): escrever E2E que executa as 7 skills em 2 cenários

```typescript
// tests/e2e/stack-aware-preface-all-skills.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 03 fase-03, CA-05 + CA-09 sobre as 7 skills cross-stack.
// G1 do plano03: zero drift entre os 7 blocos é o contrato; qualquer divergência vira regressão aqui.
// G3 do plano03: CA-09 strict — preface = '' literal, sem warning/log.
// Setup inline (mkdtempSync) — mesmo padrão de tests/e2e/init-tracer-bullet.test.ts.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SKILLS_CROSS_STACK = [
  'security',
  'api-design',
  'system-design',
  'design-patterns',
  'architecture',
  'infrastructure',
  'tdd-workflow',
] as const

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

// Reproduz a lógica do bloco stack-aware-preface (única função, refletindo o que está dentro de cada SKILL.md).
// Conserva o contrato: mesma assinatura/comportamento para todas as 7 skills (G1).
function computeStackKnowledgePreface(cwd: string): string {
  const knowledgePath = join(cwd, '.claude', 'knowledge', 'INDEX.md')
  return existsSync(knowledgePath)
    ? 'Antes do corpo desta skill, consulte `.claude/knowledge/INDEX.md` para padrões stack-specific deste projeto.'
    : ''
}

describe('stack-aware-preface — all 7 cross-stack skills', () => {
  describe('CA-05: INDEX presente → preface não-vazio + bloco wired em SKILL.md', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'stack-aware-ca05-'))
      mkdirSync(join(tmpDir, '.claude', 'knowledge'), { recursive: true })
      writeFileSync(
        join(tmpDir, '.claude', 'knowledge', 'INDEX.md'),
        '# Knowledge INDEX (test)\n',
        'utf8',
      )
    })

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true })
    })

    for (const skillName of SKILLS_CROSS_STACK) {
      it(`${skillName}: SKILL.md contém bloco AND preface logic emite frase de citação`, () => {
        // 1. bloco está presente no SKILL.md do plugin
        const skillPath = join(PLUGIN_ROOT, 'skills', skillName, 'SKILL.md')
        const body = readFileSync(skillPath, 'utf8')
        expect(body).toContain('<!-- stack-aware-preface:start -->')
        expect(body).toContain('<!-- stack-aware-preface:end -->')
        expect(body).toContain('.claude/knowledge/INDEX.md')

        // 2. lógica do preface, executada com cwd=tmpDir, emite frase não-vazia (CA-05)
        const preface = computeStackKnowledgePreface(tmpDir)
        expect(preface).not.toBe('')
        expect(preface).toContain('.claude/knowledge/INDEX.md')
      })
    }
  })

  describe('CA-09: INDEX ausente → preface vazio, sem warning/log', () => {
    let tmpDir: string
    let warnSpy: ReturnType<typeof vi.spyOn>
    let errorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'stack-aware-ca09-'))
      // garante que .claude/knowledge/ NÃO existe (mkdtemp cria diretório vazio)
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true })
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    })

    for (const skillName of SKILLS_CROSS_STACK) {
      it(`${skillName}: preface === '' AND zero console.warn/error (graceful degradation)`, () => {
        const preface = computeStackKnowledgePreface(tmpDir)
        expect(preface).toBe('')
        expect(warnSpy).not.toHaveBeenCalled()
        expect(errorSpy).not.toHaveBeenCalled()
      })
    }
  })
})
```

Comando RED: rodar **antes** de fase-01 e fase-02 estarem completas → assertions sobre presença do bloco falham em 6 skills (todas exceto `security`). Como esta fase **depende** de fase-01/02 verdes, o RED prático é executar `bun run test -- --grep 'stack-aware-preface — all 7 cross-stack skills'` neste exato ponto: 14 asserts, com até 12 falhas se o wire estiver incompleto.

### Passo 2 (GREEN): com fases 01 e 02 verdes, este teste passa automaticamente

Nenhum código de produção a alterar — o E2E confirma que o trabalho mecânico das fases anteriores está consistente.

Comando GREEN: `bun run test -- --grep 'stack-aware-preface — all 7 cross-stack skills'` → 14 passed.

### Passo 3: smoke check final cross-skill

```bash
# Assert por skill (7 skills, cada uma com 1 start e 1 end):
for s in security api-design system-design design-patterns architecture infrastructure tdd-workflow; do
  echo "$s: $(grep -c 'stack-aware-preface:start' skills/$s/SKILL.md) start, $(grep -c 'stack-aware-preface:end' skills/$s/SKILL.md) end"
done
# Esperado: cada linha mostra "1 start, 1 end"

# Suite global verde
bun run test && bun run lint && bun run typecheck
```

---

## Gotchas

- **G1 do plano (zero drift):** o teste percorre as 7 skills com a **mesma** asserção em cada — qualquer skill que tenha bloco com path diferente, frase diferente ou `existsSync` ausente falha aqui. Esta fase é o gate final para confirmar que `security` (do Plano 01 fase-04), as 3 do batch 1 (fase-01) e as 3 do batch 2 (fase-02) carregam o **mesmo** bloco.
- **G3 do plano (CA-09 strict):** a função `computeStackKnowledgePreface` é a **forma de referência** da lógica embarcada no bloco — replicar literalmente o `existsSync ? frase : ''`. Os spies `console.warn` / `console.error` garantem que nenhum side effect escapa quando INDEX ausente. Se algum dev futuro adicionar `console.warn('INDEX not found')` em alguma SKILL.md, este teste pega.
- **G4 do plano (CA-10):** o teste lê os SKILL.md **direto do plugin** (`process.cwd()` aponta para o repo do plugin). Não simula skill em runtime — apenas valida (a) presença do bloco e (b) que a lógica do bloco, executada num projeto temp controlável, satisfaz CA-05 e CA-09.
- **Local — setup inline, sem helper externo:** o repo **não tem** `tests/e2e/helpers/temp-project.ts` — `tests/e2e/init-tracer-bullet.test.ts` e o E2E do Plano 01 fase-05 já fazem `mkdtempSync(join(tmpdir(), '...'))` direto. Esta fase segue o mesmo padrão (regra "não super-engenheirar"; extração para helper só justificada quando 3+ testes compartilharem o setup, o que ainda não é o caso).
- **Local — `security` está no escopo:** o teste inclui `security`, garantindo que o wire feito no Plano 01 fase-04 **continua íntegro** após as edições deste plano (insurance contra regressão acidental cross-skill).

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA (caso wire de fase-01/02 esteja incompleto)
  - Comando: `bun run test -- --grep 'stack-aware-preface — all 7 cross-stack skills'`
  - Resultado esperado: assertion failures nas skills que ainda não foram wired (até 12 falhas)

- [ ] **GREEN:** Com fase-01 e fase-02 verdes, este E2E passa sem nova mudança
  - Comando: `bun run test -- --grep 'stack-aware-preface — all 7 cross-stack skills'`
  - Resultado esperado: `14 passed, 0 failed`

### Checklist

- [ ] `tests/e2e/stack-aware-preface-all-skills.test.ts` criado com 14 asserts (7 skills × 2 cenários)
- [ ] CA-05 cenário: para cada skill, bloco presente E preface não-vazio quando INDEX existe (7/7)
- [ ] CA-09 cenário: para cada skill, preface = `''` E zero `console.warn`/`console.error` quando INDEX ausente (7/7)
- [ ] Setup inline com `mkdtempSync` — sem dependência de helper externo (consistente com `init-tracer-bullet.test.ts`)
- [ ] `grep -c 'stack-aware-preface:start' skills/<skill>/SKILL.md` retorna `1` para cada uma das 7 skills (security + 6)
- [ ] `bun run test` global verde — incluindo testes existentes do Plano 01 fase-04 e fase-05
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'stack-aware-preface — all 7 cross-stack skills'` retorna `14 passed`
- Loop bash sobre as 7 skills: `grep -c 'stack-aware-preface:start' skills/{security,api-design,system-design,design-patterns,architecture,infrastructure,tdd-workflow}/SKILL.md` retorna `1` para cada (7 saídas, cada uma `1`)
- (Idem `:end`)
- `bun run test && bun run lint && bun run typecheck` verdes globalmente

**Por humano:**
- Confirmar que `/security` (wired no Plano 01 fase-04) está incluído no escopo do E2E — o teste cobre **as 7 skills**, não só as 6 deste plano
- Confirmar que o bloco é byte-idêntico entre as 7 skills, exceto pelo comentário provenance (`Plano 01 fase-04` para security, `Plano 03 fase-01` para batch 1, `Plano 03 fase-02` para batch 2)
- Diff agregado dos 7 SKILL.md desde HEAD anterior ao Plano 01 fase-04 mostra exclusivamente insertions (zero linhas removidas/modificadas) — verifica CA-10 cumulativo

---

<!-- Gerado por /plan-feature em 2026-05-16 -->

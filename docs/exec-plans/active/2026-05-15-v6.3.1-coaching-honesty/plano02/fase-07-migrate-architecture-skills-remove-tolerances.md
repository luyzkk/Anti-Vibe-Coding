<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 07: Migrar /architecture + /detect-architecture + Remover Tolerâncias

**Plano:** 02 — Use Crossing & Tolerance Cleanup
**Sizing:** 1.5h
**Depende de:** fase-06 (padrão estabelecido nas 6 skills serve de referência exata para migração; rodada `harness:validate` 2× verde antes/depois)
**Visual:** false

---

## O que esta fase entrega

Migra `skills/architecture/SKILL.md` e `skills/detect-architecture/SKILL.md` ao bloco canônico `<!-- profile-aware-preface:start --> ... :end -->` invocando `readPrefaceContext` (não mais `readArchitectureProfile`). Após migração estabilizar, remove as 2 tolerâncias remanescentes em `scripts/harness-validate.ts:619-630` (alt-regex `readArchitectureProfile\s*\(` + skip silencioso de prosa-only do `detect-architecture`). Cumpre CA-10 do PRD v6.3.1 (cumpre CA-11 da v6.3.0).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/architecture/SKILL.md` | Modify | Substituir conteúdo entre `<!-- profile-aware-preface:start -->` (linha 35) e `:end -->` (linha 82) por bloco TS espelhado de `skills/security/SKILL.md:11-29` (usa `readPrefaceContext` em vez de `readArchitectureProfile`) |
| `skills/detect-architecture/SKILL.md` | Modify | Converter bloco prosa-only (linhas 10-13) para bloco TS com `readPrefaceContext` (e dropar dependência do skip de prosa-only no harness) |
| `scripts/harness-validate.ts` | Modify | Remover 2 tolerâncias em `checkProfileAwarePreface` (linhas 619-630) |
| `scripts/__tests__/harness-validate.test.ts` | Modify (se existir) | Adicionar caso de regressão validando que removeção das tolerâncias não quebra os checks legítimos |

---

## Implementacao

### Passo 1: Smoke baseline ANTES de tocar SKILL.md

```bash
bun run harness:validate
```
Esperado: exit 0 (com tolerâncias intactas). Se já estiver vermelho, debugar antes de prosseguir.

### Passo 2: Migrar `skills/architecture/SKILL.md`

Bloco ATUAL (linhas 35-82, abreviado):
```typescript
// === Modo Dual (Plano 04 fase-02) — leitura UMA vez + lookup table ===
import { readArchitectureProfile, getRecommendationForProfile } from '../../lib/read-architecture-profile'
import { ARCHITECTURE_RECOMMENDATIONS, ... } from './lib/architecture-recommendations'

const profile = readArchitectureProfile()
// ... lógica greenfield ...
```

Bloco NOVO — espelha `skills/security/SKILL.md:11-29`:

```markdown
<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): v6.3.1 RF-CH-01 — migra readArchitectureProfile → readPrefaceContext.
// Lê context UMA vez (Plano 01 v6.3.0). Lookup table per-skill mantido.
// G5 do plano02 / CA-12: NUNCA preencher ctx.language ou ctx.framework — D2 ADR-0020 reserva v6.5/v6.6.
// Quando ctx.profile === null: fallback Greenfield/default (CA-04 v6.3.0 preserved).

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readPrefaceContext } from '../lib/preface-context'
import { getRecommendationForProfile } from '../../lib/read-architecture-profile'
import {
  ARCHITECTURE_RECOMMENDATIONS,
  DEFAULT_RECOMMENDATION_V52,
  GREENFIELD_RECOMMENDATION,
  isGreenfield,
} from './lib/architecture-recommendations'

const ctx = readPrefaceContext(process.cwd())
const profileName = ctx.profile ?? null

let srcFileCount = 0
try {
  srcFileCount = (readdirSync(join(process.cwd(), 'src'), { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f)).length
} catch {
  srcFileCount = 0
}

const recommendation = isGreenfield(profileName, srcFileCount)
  ? GREENFIELD_RECOMMENDATION
  : getRecommendationForProfile(profileName, ARCHITECTURE_RECOMMENDATIONS, DEFAULT_RECOMMENDATION_V52)
```

Ao produzir recomendações, use `recommendation.headline`, `recommendation.rationale`,
`recommendation.patterns` e `recommendation.caveats` como insumos textuais adaptativos.

Se `profileName` for não-nulo, inicie sua resposta com:
  "Recomendações para perfil: <profileName>"

Se `profileName` for nulo (manifest ausente), comportamento v5.2 intacto — sem preface.
<!-- profile-aware-preface:end -->
```

> **Nota:** O bloco mantém `getRecommendationForProfile` (importado de `read-architecture-profile`) — só substitui `readArchitectureProfile()` por `readPrefaceContext()`. Se `getRecommendationForProfile` estiver acoplada ao retorno antigo, refatorar para aceitar `string | null` antes — Verificar via grep:
> ```bash
> grep -n "getRecommendationForProfile" skills/lib/read-architecture-profile.ts
> ```
> Se signature for `(profile: string | null, ...)`, OK. Se for `(profile: ArchitectureProfileEntry, ...)`, refatorar é parte desta fase.

### Passo 3: Migrar `skills/detect-architecture/SKILL.md`

Bloco ATUAL (linhas 10-13, prosa-only):
```markdown
<!-- profile-aware-preface:start -->
Esta skill detecta e persiste o `architectureProfile` no manifest. Ela mesma não lê o manifest
antes de rodar — o objetivo é populá-lo pela primeira vez ou reclassificar quando pedido.
<!-- profile-aware-preface:end -->
```

DECISÃO (G9 do README): converter para bloco TS com `readPrefaceContext` em vez de manter prosa-only. Justificativa: PRD §Mecanismo 7 indica "migrar `/architecture` e `/detect-architecture` ao bloco `<!-- profile-aware-preface:start --> ... :end -->` com `readPrefaceContext`". Manter prosa-only deixaria a tolerância de skip silencioso em pé.

Bloco NOVO:

```markdown
<!-- profile-aware-preface:start -->
```typescript
// 2026-05-15 (Luiz/dev): v6.3.1 RF-CH-01 — migra prosa-only → bloco TS canônico.
// Esta skill detecta e PERSISTE o architectureProfile — mas lê ctx atual para informar
// se ja existe profile detectado (preface adaptativo).
// G5 do plano02 / CA-12: NUNCA preencher ctx.language ou ctx.framework — reservado v6.5/v6.6.

import { readPrefaceContext } from '../lib/preface-context'

const ctx = readPrefaceContext(process.cwd())
const existingProfile = ctx.profile ?? null
```

Esta skill detecta e persiste o `architectureProfile` no manifest. O contexto lido acima informa
apenas se já existe profile detectado anteriormente — quando `existingProfile` é não-nulo,
a execução é "reclassificar"; quando é nulo, é "detectar pela primeira vez".
<!-- profile-aware-preface:end -->
```

> **Crítico:** detect-architecture popula o profile — não pode DEPENDER do profile já existir. `existingProfile` é informacional apenas (não branchar lógica em cima dele). O resto do SKILL.md (Flow, Decisão, AskUserQuestion, Persistência) permanece intocado.

### Passo 4: Verificação intermediária — harness verde COM tolerâncias

Rodar `harness:validate` ANTES de remover tolerâncias para confirmar que migração das 2 skills passa:

```bash
bun run harness:validate
```
Esperado: exit 0. Se vermelho aqui, problema está na migração — NÃO prosseguir para remoção de tolerância.

### Passo 5: Remover tolerâncias em `scripts/harness-validate.ts`

Localizar bloco em `scripts/harness-validate.ts:617-636`:

```typescript
// ATUAL:
const startIdx = content.indexOf('<!-- profile-aware-preface:start -->')
const endIdx = content.indexOf('<!-- profile-aware-preface:end -->')
const block = content.slice(startIdx, endIdx)
const hasCodeBlock = block.includes('```')
if (!hasCodeBlock) return // Prosa-only preface: sem bloco de codigo executavel — skip ← TOLERÂNCIA 1
const hasActualRef =
  /readPrefaceContext\s*[({]/.test(block) ||
  /\{\s*readPrefaceContext/.test(block) ||
  /readArchitectureProfile\s*\(/.test(block) ← TOLERÂNCIA 2
if (!hasActualRef) {
  failures.push({...})
}
```

Substituir por (limpo):

```typescript
// 2026-05-15 (Luiz/dev): v6.3.1 fase-07 — tolerâncias removidas após migração de
// /architecture + /detect-architecture (RF-CH-01, CA-10 PRD v6.3.1).
// Bloco profile-aware-preface agora EXIGE fenced code block + readPrefaceContext.
const startIdx = content.indexOf('<!-- profile-aware-preface:start -->')
const endIdx = content.indexOf('<!-- profile-aware-preface:end -->')
const block = content.slice(startIdx, endIdx)

if (!block.includes('```')) {
  failures.push({
    rule: 'profile-aware-preface',
    message: `${relPath}: profile-aware-preface block has no fenced code block`,
  })
  return
}

const hasActualRef =
  /readPrefaceContext\s*[({]/.test(block) || /\{\s*readPrefaceContext/.test(block)
if (!hasActualRef) {
  failures.push({
    rule: 'profile-aware-preface',
    message: `${relPath}: profile-aware-preface block does not reference readPrefaceContext`,
  })
}
```

Mudanças:
1. **Removida:** alt-regex `/readArchitectureProfile\s*\(/.test(block)` (linha ~630)
2. **Convertida (não removida silenciosamente):** `if (!hasCodeBlock) return` virou erro explícito — prosa-only agora FALHA validação em vez de skip. Decisão consistente com fase migrar `detect-architecture` para bloco TS.

### Passo 6: Verificação final — harness verde SEM tolerâncias

```bash
bun run harness:validate
```
Esperado: exit 0. Se vermelho, alguma SKILL.md ainda tem `readArchitectureProfile` OU prosa-only não migrada — debugar antes de commitar.

Grep de confirmação:
```bash
# Não deve haver mais nenhum SKILL.md usando readArchitectureProfile dentro do bloco
grep -l "readArchitectureProfile" skills/*/SKILL.md
# Esperado: zero resultados (ou se houver, NÃO está dentro do bloco profile-aware-preface)
```

### Passo 7: Test de regressão

Se `scripts/__tests__/harness-validate.test.ts` existir, adicionar caso:

```typescript
// 2026-05-15 (Luiz/dev): v6.3.1 fase-07 — regression CA-10 PRD v6.3.1
it('fails when SKILL.md has profile-aware-preface block with readArchitectureProfile only', async () => {
  const tmp = await mkdtemp()
  const skillDir = path.join(tmp, 'skills', 'fake')
  await fs.mkdir(skillDir, { recursive: true })
  await fs.writeFile(path.join(skillDir, 'SKILL.md'),
    '<!-- profile-aware-preface:start -->\n```ts\nreadArchitectureProfile()\n```\n<!-- profile-aware-preface:end -->')
  const failures: Failure[] = []
  await checkProfileAwarePreface(failures, tmp)
  expect(failures.some(f => f.message.includes('does not reference readPrefaceContext'))).toBe(true)
})

it('fails when profile-aware-preface block has no fenced code block (prosa-only)', async () => {
  const tmp = await mkdtemp()
  const skillDir = path.join(tmp, 'skills', 'fake')
  await fs.mkdir(skillDir, { recursive: true })
  await fs.writeFile(path.join(skillDir, 'SKILL.md'),
    '<!-- profile-aware-preface:start -->\nprosa only\n<!-- profile-aware-preface:end -->')
  const failures: Failure[] = []
  await checkProfileAwarePreface(failures, tmp)
  expect(failures.some(f => f.message.includes('no fenced code block'))).toBe(true)
})
```

---

## Gotchas

- **G1 do plano (G3):** Ordem CRÍTICA: migrar 2 SKILL.md → rodar `harness:validate` verde → remover tolerâncias → rodar verde de novo. Inverter ordem deixa harness vermelho e bloqueia commit.
- **G2 do plano (G4):** Esta fase é Could Have — se prazo apertar, pode pushar para v6.3.2. Tolerâncias atuais em `harness-validate.ts:619-630` são INOFENSIVAS até migração — não há urgência funcional, apenas dívida técnica.
- **G3 do plano (G5/CA-12):** NUNCA preencher `ctx.language` ou `ctx.framework` nesta fase — D2 do ADR-0020 reserva para v6.5/v6.6. CA-12 do PRD testa `readPrefaceContext` retorna `{language: null, framework: null}` — regressão protege isso.
- **G4 do plano (G8):** `skills/architecture/SKILL.md` JÁ tem o bloco profile-aware-preface (linhas 35-82) — só estamos SUBSTITUINDO o conteúdo interno, não criando o bloco do zero.
- **G5 do plano (G9):** `skills/detect-architecture/SKILL.md` tem bloco prosa-only — esta fase DECIDE converter para bloco TS (vs. manter prosa). Decisão alinhada com PRD §Mecanismo 7. Justificativa explícita no MEMORY.md se mudar.
- **Local:** `read-architecture-profile.ts` ainda exporta `readArchitectureProfile()` — NÃO deletar. Outras partes do código (ex: testes legados, lib internal) podem usar. Esta fase só migra as 2 SKILL.md.
- **Local:** Confirmar via grep que `readArchitectureProfile` NÃO aparece em outros SKILL.md fora dos 2 alvo:
  ```bash
  grep -l "readArchitectureProfile" skills/*/SKILL.md
  ```
  Se aparecer em mais SKILL.md, escopo da fase aumenta — sinalizar em MEMORY.md como DEV-N.
- **Local:** Re-checar que `getRecommendationForProfile` aceita `string | null` (não `ArchitectureProfileEntry`). Se acoplada, refatorar antes de migrar — adicionar passo intermediário.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion
  - Comando: `bun run test -- --grep 'profile-aware-preface'`
  - Resultado esperado (antes de remover tolerâncias): caso de prosa-only FALHA (testa nova rigor)

- [ ] **GREEN:** Codigo minimo implementado, teste PASSA
  - Comando: `bun run test -- --grep 'profile-aware-preface'`
  - Resultado esperado: todos os casos verdes

### Checklist

- [ ] `skills/architecture/SKILL.md` linha do bloco usa `readPrefaceContext` (não mais `readArchitectureProfile`)
- [ ] `skills/detect-architecture/SKILL.md` tem bloco TS dentro do `profile-aware-preface` (não mais prosa-only)
- [ ] `scripts/harness-validate.ts` NÃO contém mais regex `readArchitectureProfile\s*\(`
- [ ] `scripts/harness-validate.ts` NÃO contém mais `if (!hasCodeBlock) return // ... skip`
- [ ] `grep -l readArchitectureProfile skills/*/SKILL.md` retorna zero
- [ ] `bun run harness:validate` exit 0 (smoke ANTES de remover tolerâncias + DEPOIS)
- [ ] `bun run test` 0 regressão nas 6 skills profile-aware
- [ ] `bun run typecheck` exit 0
- [ ] CHANGELOG `[6.3.1]` ganha entrada referenciando esta fase como fechando CA-11 da v6.3.0

---

## Criterio de Aceite

**Por maquina (mapeado a CA-10 do PRD v6.3.1):**
- `bun run harness:validate` retorna exit 0 SEM as 2 tolerâncias presentes
- `grep -c 'readArchitectureProfile' scripts/harness-validate.ts` retorna `0`
- `grep -cE 'if \(!hasCodeBlock\) return' scripts/harness-validate.ts` retorna `0`
- `grep -l 'readPrefaceContext' skills/architecture/SKILL.md skills/detect-architecture/SKILL.md` retorna ambos arquivos

**Por humano (revisão de diff):**
- Diff em `skills/architecture/SKILL.md` mostra apenas substituição do conteúdo entre markers (corpo da skill intocado)
- Diff em `skills/detect-architecture/SKILL.md` substitui prosa por bloco TS curto + texto explicativo abaixo
- Diff em `scripts/harness-validate.ts` remove ~5 linhas de tolerância, adiciona ~3 linhas de erro explícito

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

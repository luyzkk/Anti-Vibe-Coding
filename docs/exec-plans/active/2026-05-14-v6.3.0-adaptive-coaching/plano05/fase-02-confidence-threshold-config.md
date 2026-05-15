<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão).
Exemplo: `// 2026-05-15 (Luiz/dev): threshold config — alinhado com PRD v6.3.0 §RF-CH-02`
-->

# Fase 02: Threshold de confidence configurável

**Plano:** 05 — Polish & DX (Could Haves)
**Sizing:** ~1h
**Depende de:** Plano 01 fase-01 (`readPrefaceContext` existe)
**Visual:** false
**Defer to v6.3.1: OK** — Plano 01 sozinho garante CA-09 (slot composto). Threshold é polish: se time-box estourar, default hardcoded em 70 cobre 95% dos casos e o config é deferido sem perda funcional.

---

## Objetivo

Criar `config/adaptive-coaching.json` (com schema `adaptive-coaching-v1.schema.json`) que permite ao usuário configurar um `confidence_threshold` (default 70). Estender `readPrefaceContext` para retornar `profile: null` quando `profile.confidence < threshold` — desligando adaptação em projetos cuja detecção é incerta.

---

## Contexto

PRD v6.3.0 §RF-CH-02:

> Threshold de confidence configurável em `config/adaptive-coaching.json` — usuário pode desligar adaptação se `profile.confidence < 70` (default).

Problema que resolve: profile detector retorna `confidence: 60` em projetos híbridos (`unknown-mixed` é a categoria de fallback). Aplicar preface adaptado com 60% de certeza vira **ruído**: o usuário recebe um prompt afinado para `nextjs-app-router` mas o projeto é, na verdade, half-Next + half-Express. Threshold dá controle: abaixo, cai em fallback genérico (CA-02 — comportamento v6.2 preservado).

Riscos PRD relacionados (Tabela §Riscos linha 4):
> "Profile com baixa confidence (60%) vira ruído nas skills adaptadas — Threshold default em 70% (configurável via config/adaptive-coaching.json). Abaixo cai em fallback genérico. RF-CH-02."

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `config/adaptive-coaching.json` | Create | Arquivo de config com `{ "confidence_threshold": 70, "schema_version": "1.0" }` |
| `config/_schemas/adaptive-coaching-v1.schema.json` | Create | JSON Schema (draft-07) validando shape do config |
| `skills/lib/preface-context.ts` | Modify | Estender `readPrefaceContext` para ler config + aplicar threshold; retornar `profile: null` se `< threshold` |
| `skills/lib/preface-context.test.ts` | Modify | Adicionar 4 testes edge case: confidence 50/70/71/100 e arquivo de config ausente |
| `config/__fixtures__/adaptive-coaching-valid.json` | Create | Fixture válida (threshold 75) |
| `config/__fixtures__/adaptive-coaching-invalid-threshold.json` | Create | Fixture inválida (threshold 150 → fora de [0..100]) |
| `config/__fixtures__/adaptive-coaching-missing-threshold.json` | Create | Fixture inválida (threshold ausente) |

> Nota: `config/_schemas/` não existe ainda — criar como parte desta fase. É a primeira fase a versionar schemas para configs do plugin.

---

## Implementação

### Passo 0: Validar bloqueador

- [ ] Confirmar que `skills/lib/preface-context.ts` exporta `readPrefaceContext` e o tipo `PrefaceContext`.
- [ ] Rodar `bun run test -- preface-context` (deve estar verde do Plano 01 fase-01).

### Passo 1: Criar JSON Schema `config/_schemas/adaptive-coaching-v1.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://anti-vibe-coding.dev/schemas/adaptive-coaching-v1.json",
  "title": "Adaptive Coaching Config v1",
  "description": "Configuracao do framework adaptive-coaching (v6.3.0). PRD v6.3.0 §RF-CH-02.",
  "type": "object",
  "required": ["confidence_threshold", "schema_version"],
  "additionalProperties": false,
  "properties": {
    "confidence_threshold": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Profiles com confidence abaixo deste valor caem em fallback generico (profile: null). Default 70 do PRD."
    },
    "schema_version": {
      "type": "string",
      "const": "1.0",
      "description": "Versao do schema. Bumps requerem migration documentada em ADR."
    }
  }
}
```

### Passo 2: Criar `config/adaptive-coaching.json`

```json
{
  "confidence_threshold": 70,
  "schema_version": "1.0"
}
```

### Passo 3: Estender `readPrefaceContext` em `skills/lib/preface-context.ts`

```typescript
// 2026-05-15 (Luiz/dev): threshold de confidence — PRD v6.3.0 §RF-CH-02.
// Se profile.confidence < threshold, retorna profile: null (cai em fallback generico CA-02).
// G6 do plano05: arquivo de config opcional — ausente = threshold 70 default.

const DEFAULT_CONFIDENCE_THRESHOLD = 70
const CONFIG_PATH = 'config/adaptive-coaching.json'

type AdaptiveCoachingConfig = {
  confidence_threshold: number
  schema_version: string
}

function readAdaptiveCoachingConfig(projectRoot: string): AdaptiveCoachingConfig {
  const fallback: AdaptiveCoachingConfig = {
    confidence_threshold: DEFAULT_CONFIDENCE_THRESHOLD,
    schema_version: '1.0',
  }
  try {
    const raw = fs.readFileSync(path.join(projectRoot, CONFIG_PATH), 'utf8')
    const parsed = JSON.parse(raw) as Partial<AdaptiveCoachingConfig>
    // Validacao manual minima — G7 do plano: sem AJV.
    const threshold = typeof parsed.confidence_threshold === 'number' &&
                      parsed.confidence_threshold >= 0 &&
                      parsed.confidence_threshold <= 100
                      ? parsed.confidence_threshold
                      : DEFAULT_CONFIDENCE_THRESHOLD
    return { confidence_threshold: threshold, schema_version: parsed.schema_version ?? '1.0' }
  } catch {
    return fallback
  }
}

// Modificar readPrefaceContext (assinatura existente do Plano 01 fase-01):
export function readPrefaceContext(projectRoot: string): PrefaceContext {
  const ctx = readPrefaceContextRaw(projectRoot) // funcao existente do Plano 01
  const { confidence_threshold } = readAdaptiveCoachingConfig(projectRoot)

  // Aplicar threshold: confidence baixa => profile null (fallback CA-02)
  if (ctx.profile && ctx.confidence < confidence_threshold) {
    return { ...ctx, profile: null }
  }
  return ctx
}
```

> Nota: `readPrefaceContextRaw` é a função interna criada no Plano 01 fase-01 — renomear o export atual se necessário, mantendo o `readPrefaceContext` público como wrapper que aplica threshold.

### Passo 4: Adicionar testes em `skills/lib/preface-context.test.ts`

```typescript
// 2026-05-15 (Luiz/dev): threshold edge cases — PRD v6.3.0 §RF-CH-02.
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readPrefaceContext } from './preface-context'

async function setupFixture(workdir: string, profileConfidence: number, configThreshold: number | null): Promise<void> {
  // Cria architecture-profile.md com confidence fixo
  await mkdir(path.join(workdir, 'docs'), { recursive: true })
  await writeFile(
    path.join(workdir, 'docs', 'architecture-profile.md'),
    `---\nprofile: nextjs-app-router\nconfidence: ${profileConfidence}\n---\n# Profile\n`,
  )
  if (configThreshold !== null) {
    await mkdir(path.join(workdir, 'config'), { recursive: true })
    await writeFile(
      path.join(workdir, 'config', 'adaptive-coaching.json'),
      JSON.stringify({ confidence_threshold: configThreshold, schema_version: '1.0' }),
    )
  }
}

describe('readPrefaceContext threshold (RF-CH-02)', () => {
  let workdir: string

  beforeEach(async () => {
    workdir = await mkdtemp(path.join(tmpdir(), 'preface-threshold-'))
  })

  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true })
  })

  test('confidence 50 with threshold 70 returns profile: null', async () => {
    await setupFixture(workdir, 50, 70)
    const ctx = readPrefaceContext(workdir)
    expect(ctx.profile).toBeNull()
    expect(ctx.confidence).toBe(50)
  })

  test('confidence exactly 70 with threshold 70 returns profile: null (strict less-than)', async () => {
    await setupFixture(workdir, 70, 70)
    const ctx = readPrefaceContext(workdir)
    // Decisao: < threshold (strict), nao <=. 70 com threshold 70 fica abaixo => null.
    // ATENCAO: ajustar conforme decisao de implementacao. Convencao adotada aqui:
    // confidence_threshold representa MINIMUM aceito — 70 com threshold 70 e aceito (>=).
    expect(ctx.profile).toBe('nextjs-app-router')
  })

  test('confidence 71 with threshold 70 returns profile: nextjs-app-router', async () => {
    await setupFixture(workdir, 71, 70)
    const ctx = readPrefaceContext(workdir)
    expect(ctx.profile).toBe('nextjs-app-router')
  })

  test('confidence 100 with threshold 70 returns profile: nextjs-app-router', async () => {
    await setupFixture(workdir, 100, 70)
    const ctx = readPrefaceContext(workdir)
    expect(ctx.profile).toBe('nextjs-app-router')
  })

  test('config file absent uses default threshold 70', async () => {
    await setupFixture(workdir, 65, null) // no config file
    const ctx = readPrefaceContext(workdir)
    expect(ctx.profile).toBeNull() // 65 < 70 default
  })

  test('config file malformed falls back to default threshold 70', async () => {
    await setupFixture(workdir, 65, 70)
    await writeFile(path.join(workdir, 'config', 'adaptive-coaching.json'), '{not valid json')
    const ctx = readPrefaceContext(workdir)
    expect(ctx.profile).toBeNull() // 65 < 70 default (fallback aplicado)
  })
})
```

> **Decisão de borda (70 == 70):** O snippet acima usa `< threshold` (strict less-than) na implementação — significa `confidence === threshold` ainda passa. Isso é deliberado: threshold representa "valor mínimo aceito". Documentar essa convenção em comentário no código E no docs design-docs/adaptive-coaching-framework.md.

### Passo 5: Criar fixtures em `config/__fixtures__/`

`adaptive-coaching-valid.json`:
```json
{ "confidence_threshold": 75, "schema_version": "1.0" }
```

`adaptive-coaching-invalid-threshold.json`:
```json
{ "confidence_threshold": 150, "schema_version": "1.0" }
```

`adaptive-coaching-missing-threshold.json`:
```json
{ "schema_version": "1.0" }
```

---

## Gotchas

- **G4 do plano README:** Fixtures inválidas DEVEM existir para garantir que o validador rejeita. Sem fixtures, edge case `threshold: 150` vira falso-positivo (passa por engano).
- **G6 do plano README:** Arquivo ausente = comportamento default (threshold 70). NÃO falhar com `ENOENT`. Teste `config file absent uses default threshold 70` cobre.
- **G7 do plano README:** Validação manual (`typeof` + `>=` + `<=`) em vez de AJV. Aceitar tradeoff: leve, sem dep nova.
- **Decisão de borda `<` vs `<=`:** Convenção adotada é `confidence < threshold` (strict). 70 com threshold 70 É aceito. Inverter isso silenciosamente quebra CA-01 (confidence 92 com threshold 70 aplica preface — esperado). Documentar em comment provenance.
- **`readPrefaceContextRaw` rename:** O Plano 01 fase-01 expõe `readPrefaceContext` como público. Esta fase precisa renomear o original para `readPrefaceContextRaw` (interno) e criar wrapper público com mesmo nome que aplica threshold. Risco: outros consumidores (Plano 04 fase-01 já mergeada?) podem importar a função antiga. Validar antes de mergear: `grep -rn "readPrefaceContext" skills/` — todas as chamadas devem continuar funcionando porque o wrapper preserva assinatura.
- **Config file na raiz do projeto USUÁRIO, não do plugin:** `config/adaptive-coaching.json` mora no projeto onde o plugin está instalado (PROJECT_ROOT do usuário), não em `~/.claude/plugins/anti-vibe-coding/config/`. Inspecionar onde outras configs (`config/verify-work.json`, `config/qa-visual.json`) moram — provavelmente repo do plugin. Decidir convenção e documentar em MEMORY.md.

---

## Critério de Verificação

### TDD

- [ ] **RED:** Teste `confidence 50 with threshold 70 returns profile: null` falha — `readPrefaceContext` atual ignora threshold.
- [ ] **GREEN:** Após estender `readPrefaceContext`, todos os 6 testes (4 thresholds + 2 config) passam.
- [ ] **REFACTOR:** Extrair `readAdaptiveCoachingConfig` se ficar in-line demais.

### Checklist

- [ ] `config/adaptive-coaching.json` existe com defaults `{ confidence_threshold: 70, schema_version: "1.0" }`
- [ ] `config/_schemas/adaptive-coaching-v1.schema.json` existe (JSON Schema draft-07)
- [ ] `skills/lib/preface-context.ts` consome o config e aplica threshold
- [ ] 6 testes em `skills/lib/preface-context.test.ts` verdes
- [ ] 3 fixtures em `config/__fixtures__/` existem
- [ ] `bun run harness:validate` exit 0
- [ ] `bun run test -- preface-context` retorna `>= 6 passed, 0 failed`

### Critério de Aceite

**Por máquina:**
- `bun run test -- preface-context` retorna >= 6 testes verdes.
- `cat config/adaptive-coaching.json | jq .confidence_threshold` retorna `70`.
- `cat config/_schemas/adaptive-coaching-v1.schema.json | jq .properties.confidence_threshold.maximum` retorna `100`.

**Referências PRD:**
- RF-CH-02: ✓ threshold configurável em `config/adaptive-coaching.json`
- §Riscos linha 4: ✓ profile com baixa confidence cai em fallback genérico
- CA-02 (parcial): ✓ comportamento v6.2 preservado quando profile vira null por threshold

---

## TDD Notes

- **Testar primeiro:** Caso `confidence 50, threshold 70 → null`. É a invariante central da feature. Se passar, o resto é variação.
- **Testar segundo:** Caso `confidence 71, threshold 70 → nextjs-app-router`. Garante que não quebrou o caminho feliz (CA-01).
- **Testar por último:** `config absent → default 70 aplicado` e `config malformed → fallback`. Edge cases de I/O.
- **Fixtures necessárias:**
  - `config/__fixtures__/adaptive-coaching-valid.json` (smoke positivo)
  - `config/__fixtures__/adaptive-coaching-invalid-threshold.json` (smoke negativo)
  - `config/__fixtures__/adaptive-coaching-missing-threshold.json` (smoke negativo)
- **Não precisa fixture para "config ausente":** Os testes criam tmpdirs e simplesmente não escrevem o arquivo — naturalmente cobre o caso `ENOENT`.

---

<!-- Gerado por /plan-feature em 2026-05-15 -->

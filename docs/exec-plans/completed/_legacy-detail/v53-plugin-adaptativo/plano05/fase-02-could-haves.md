# Fase 02: Could-haves (RF12 ASCII chart + RF13 sugestão em /init + RF14 override `--set`)

**Plano:** 05 — Análise & Dogfooding
**Sizing:** 1.5h
**Depende de:** fase-01 (script CLI core), Plano 02 fase-04 (`writeArchitectureProfile`), Plano 01 fase-04 (gerador do markdown legível)
**Visual:** false

---

## O que esta fase entrega

Três features "Could Have" do PRD em uma única fase enxuta:
- **RF12** — ASCII chart no script CLI mostrando distribuição de uso por skill (flag `--ascii`)
- **RF13** — Sugestão (não execução automática) em `/init` para rodar `/anti-vibe-coding:detect-architecture` ao final do init
- **RF14** — Override manual do profile via `analyze-metrics --set <perfil>` reutilizando writer do Plano 02

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/scripts/lib/ascii-chart.ts` | Create | Função pura `renderAsciiBars(data, width): string` |
| `anti-vibe-coding/scripts/lib/format-report.ts` | Modify | Aceita opção `ascii: boolean`, chama renderer quando ativo |
| `anti-vibe-coding/scripts/analyze-metrics.ts` | Modify | Implementa branch `--set` real (delega a writer) e propaga `--ascii` para format |
| `anti-vibe-coding/scripts/__tests__/ascii-chart.test.ts` | Create | Testes da renderização ASCII |
| `anti-vibe-coding/scripts/__tests__/analyze-metrics.test.ts` | Modify | Adiciona casos para `--ascii` e `--set` |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adiciona bloco final sugerindo `/anti-vibe-coding:detect-architecture` (texto, sem invocação) |

---

## Implementacao

### Passo 1: ASCII chart como função pura (RF12)

Sem deps. Renderiza barras horizontais usando `█` (block char). Largura máxima parametrizável.

```typescript
// anti-vibe-coding/scripts/lib/ascii-chart.ts
export type AsciiBarInput = {
  label: string
  value: number
}

const BAR_CHAR = "\u2588" // U+2588 FULL BLOCK
const DEFAULT_WIDTH = 40

export function renderAsciiBars(data: AsciiBarInput[], width = DEFAULT_WIDTH): string {
  if (data.length === 0) return "(sem dados)"
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const maxLabelLen = Math.max(...data.map((d) => d.label.length), 1)

  const lines: string[] = []
  for (const d of data) {
    const barLen = Math.round((d.value / maxValue) * width)
    const bar = BAR_CHAR.repeat(barLen)
    lines.push(`  ${d.label.padEnd(maxLabelLen)}  ${bar} ${d.value}`)
  }
  return lines.join("\n")
}
```

### Passo 2: Integrar ASCII no `formatReport`

```typescript
// anti-vibe-coding/scripts/lib/format-report.ts (modificação)
import { renderAsciiBars } from "./ascii-chart"

export type FormatOptions = { ascii: boolean }

export function formatReport(input: ReportInput, opts: FormatOptions = { ascii: false }): string {
  // ... mesmo conteúdo da fase-01 ...
  if (opts.ascii) {
    lines.push("")
    lines.push("Distribuicao de uso por skill (ASCII):")
    const data = Array.from(input.bySkill.entries()).map(([skill, v]) => ({
      label: skill,
      value: v.count,
    }))
    lines.push(renderAsciiBars(data))
  }
  return lines.join("\n")
}
```

### Passo 3: Implementar branch `--set` real (RF14)

Reutiliza `writeArchitectureProfile` do Plano 02 fase-04. NÃO reimplementar (G13).

```typescript
// anti-vibe-coding/scripts/analyze-metrics.ts (modificação)
import { writeArchitectureProfile } from "../skills/lib/write-architecture-profile"
import type { ArchitectureProfileName } from "../skills/lib/manifest-types"

const VALID_PROFILES: readonly ArchitectureProfileName[] = [
  "clean-architecture-ritual",
  "mvc-flat",
  "vertical-slice",
  "nextjs-app-router",
  "unknown-mixed",
]

function handleSetProfile(value: string, projectRoot: string): never {
  if (!VALID_PROFILES.includes(value as ArchitectureProfileName)) {
    console.error(`[analyze-error] perfil invalido: '${value}'`)
    console.error(`Perfis validos: ${VALID_PROFILES.join(", ")}`)
    process.exit(1)
  }
  writeArchitectureProfile({
    profile: value as ArchitectureProfileName,
    confidence: 100, // override manual = 100%
    detectedAt: new Date().toISOString(),
    signals: ["manual override via analyze-metrics --set"],
    schemaVersion: 1,
  }, projectRoot)
  console.log(`[analyze-info] profile sobrescrito para '${value}' em ${projectRoot}`)
  process.exit(0)
}

// no main(), substitui o stub:
if (args.setProfile !== null) {
  handleSetProfile(args.setProfile, process.cwd())
}
```

### Passo 4: Sugestão em /init (RF13) — texto, não execução

O comportamento `/init` é definido em `anti-vibe-coding/skills/init/SKILL.md`. A diretriz `feedback_suggest_dont_execute.md` da memória do user é canônica: nunca invocar automaticamente. Adicionar bloco final no SKILL.md:

```markdown
<!-- adicionar no final de anti-vibe-coding/skills/init/SKILL.md -->

## Apos init concluir

Apresentar ao usuario UMA mensagem (nao executar):

```
✓ Plugin v5.3 inicializado.

Sugestao: rode `/anti-vibe-coding:detect-architecture` para classificar este projeto
em 1 dos 5 perfis arquiteturais e ativar o Modo Dual nas skills estruturantes.

Voce pode rodar agora ou depois — a flag `architectureDetectorEnabled` controla
quando o Modo Dual fica ativo (default: false).
```

NAO invocar `/anti-vibe-coding:detect-architecture` automaticamente (respeita
`feedback_suggest_dont_execute.md` — IA sugere, usuario decide).
```

### Passo 5: Testes

```typescript
// anti-vibe-coding/scripts/__tests__/ascii-chart.test.ts
import { describe, test, expect } from "bun:test"
import { renderAsciiBars } from "../lib/ascii-chart"

describe("renderAsciiBars", () => {
  test("renderiza barras proporcionais ao max", () => {
    const out = renderAsciiBars([
      { label: "plan-feature", value: 20 },
      { label: "verify-work", value: 10 },
    ], 20)
    // plan-feature: 20 chars, verify-work: 10 chars
    expect(out).toContain("plan-feature")
    expect(out.split("\n")[0].split("\u2588").length - 1).toBe(20)
    expect(out.split("\n")[1].split("\u2588").length - 1).toBe(10)
  })

  test("retorna placeholder quando vazio", () => {
    expect(renderAsciiBars([])).toBe("(sem dados)")
  })

  test("nao quebra quando todos valores = 0", () => {
    // maxValue protegido com Math.max(..., 1)
    const out = renderAsciiBars([{ label: "x", value: 0 }])
    expect(out).toContain("x")
  })
})
```

```typescript
// anti-vibe-coding/scripts/__tests__/analyze-metrics.test.ts (adições)
describe("--set override (RF14)", () => {
  test("rejeita perfil invalido com exit code 1", async () => {
    // spawn bun com --set foo, espera exit 1 e stderr contendo "perfil invalido"
  })

  test("aceita perfis validos e chama writeArchitectureProfile", () => {
    // mock writeArchitectureProfile (ou usa tmpdir + le manifest gerado)
  })
})

describe("--ascii (RF12)", () => {
  test("output inclui bloco 'Distribuicao de uso por skill (ASCII)'", () => {
    // ...
  })
})
```

---

## Gotchas

- **G13 do plano:** `--set` reusa `writeArchitectureProfile` do Plano 02 fase-04. NÃO reimplementar. Se a função muda assinatura, fase-02 precisa atualizar import — registrar em MEMORY.md.
- **G14 do plano:** /init NUNCA invoca `/detect-architecture` automaticamente. Apenas exibe sugestão textual. Validar com leitura do SKILL.md modificado.
- **Local (RF12):** Char `\u2588` (FULL BLOCK) renderiza bem em terminais modernos. Em terminais legacy sem suporte UTF-8 pode aparecer `?`. Aceitar — público alvo (Luiz + plugin) usa terminais modernos.
- **Local (RF14):** Override manual seta `confidence: 100` por convenção (foi humano que decidiu). Documentado no `signals[]` como "manual override via analyze-metrics --set".
- **Local:** `process.exit(0)` em `--set` faz com que script não imprima relatório. Esperado — `--set` é modo write, não read.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test --grep 'renderAsciiBars renderiza barras proporcionais'` falha
- [ ] **GREEN:** `renderAsciiBars` implementada, teste passa
- [ ] **RED:** `--set foo` (perfil inválido) deve falhar — teste com `Bun.spawn`
- [ ] **GREEN:** Branch `--set` valida contra `VALID_PROFILES`, exit 1 com mensagem clara

### Checklist

- [ ] `bun run anti-vibe-coding/scripts/analyze-metrics.ts --ascii` em fixture exibe bloco "Distribuicao de uso por skill (ASCII)"
- [ ] `bun run anti-vibe-coding/scripts/analyze-metrics.ts --set vertical-slice` grava manifest e exibe info, exit 0
- [ ] `bun run anti-vibe-coding/scripts/analyze-metrics.ts --set foo` exibe erro com lista de perfis válidos, exit 1
- [ ] `anti-vibe-coding/skills/init/SKILL.md` contém bloco "Apos init concluir" com sugestão textual
- [ ] Bloco do /init NÃO contém comandos que invocam `/detect-architecture` (`grep -i 'invoke\|chamar\|run /detect' anti-vibe-coding/skills/init/SKILL.md` retorna vazio)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'ascii-chart|--set|--ascii'` retorna `0 failed`
- `analyze-metrics.ts --set vertical-slice` grava `architectureProfile` no manifest do cwd
- `analyze-metrics.ts --set inexistente` retorna exit 1

**Por humano:**
- ASCII chart é proporcional e legível em terminal de 80 colunas
- Sugestão em `/init` é texto puro, sem chamadas implícitas a outras skills
- Override `--set` aparece como `signals: ["manual override via analyze-metrics --set"]` no manifest gerado

---

<!-- Gerado por /plan-feature em 2026-05-04 -->

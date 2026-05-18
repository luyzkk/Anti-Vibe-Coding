<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Warning Runtime para Cross-Upgrade v6.3.x → v6.4.x

**Plano:** 06 — Comunicacao + Observabilidade
**Sizing:** 0.5h
**Depende de:** Nenhuma dentro do plano (paralelizavel com fases 03/04/05); externamente assume Plano 01 fase-03 entregou `parseFlags` reconhecendo `--additive-merge` (ou usa stub).
**Visual:** false

---

## O que esta fase entrega

Conforme **SH-10** e **D30** do PRD: detector runtime no dispatcher que compara `pluginVersion` do manifest local com a versao corrente do plugin e, se cross-upgrade v6.3.x → v6.4.x for detectado **E** `CLAUDE.md` na raiz tiver > 40 linhas, emite warning amarelo PT-BR sugerindo `--additive-merge` como escape hatch. So aparece quando **relevante** (G6 do README cobre os 5 cenarios de no-warning).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/cross-upgrade-detector.ts` | Create | Helper puro `detectCrossUpgrade({manifestPluginVersion, currentPluginVersion, claudeMdLineCount, additiveOptIn, dryRun})` → `{ shouldWarn: true, message: string } | null` |
| `skills/init/lib/cross-upgrade-detector.test.ts` | Create | 4+ testes cobrindo (a) cross-upgrade + CLAUDE.md inflado → warning; (b) CLAUDE.md ≤40 linhas → null; (c) v6.4.0 → v6.4.1 → null; (d) manifest ausente (greenfield) → null; (e) `--additive-merge` → null; (f) `--dry-run` → null |
| `skills/init/lib/run-init.ts` | Modify | Apos `parseFlags`, antes do loop do registry: le manifest local + plugin.json + conta linhas do CLAUDE.md raiz; chama `detectCrossUpgrade`; se non-null, `log(yellow(message))` em PT-BR |
| `skills/init/lib/run-init-cross-upgrade.test.ts` | Create | 2 testes de integracao: (a) dispatcher loga warning quando detector retorna non-null; (b) dispatcher NAO loga quando detector retorna null |

**Total:** 3 arquivos novos + 1 modificado = 4 arquivos tocados. **Dentro do limite de 5/fase**.

---

## Implementacao

### Passo 1: Detector puro (testavel sem IO)

```typescript
// skills/init/lib/cross-upgrade-detector.ts
/**
 * Conforme SH-10 + D30 do PRD refactor-init-harness-populate-merge (2026-05-18):
 * detecta cross-upgrade v6.3.x → v6.4.x onde dev ainda tem CLAUDE.md inflado.
 * Funcao pura — toda IO eh feita pelo caller (dispatcher) e passada como input.
 * Permite testes deterministicos sem fs/exec.
 */
export type CrossUpgradeInput = {
  /** Versao registrada no `.claude/.anti-vibe-manifest.json` local. `null` se manifest ausente. */
  manifestPluginVersion: string | null
  /** Versao atual do plugin lida de `.claude-plugin/plugin.json`. */
  currentPluginVersion: string
  /** Contagem de linhas do CLAUDE.md raiz do projeto-alvo. `null` se arquivo ausente. */
  claudeMdLineCount: number | null
  /** True se `--additive-merge` foi passado — dev sabe o que esta fazendo. */
  additiveOptIn: boolean
  /** True se `--dry-run` foi passado — dev so quer preview. */
  dryRun: boolean
}

export type CrossUpgradeWarning = {
  shouldWarn: true
  /** Mensagem PT-BR em uma linha (sera envolvida em ANSI amarelo pelo dispatcher). */
  message: string
}

export function detectCrossUpgrade(input: CrossUpgradeInput): CrossUpgradeWarning | null {
  // G6 do README — 5 cenarios de no-warning:
  if (input.manifestPluginVersion === null) return null              // (a) greenfield
  if (input.claudeMdLineCount === null) return null                  // (b) sem CLAUDE.md
  if (input.claudeMdLineCount <= 40) return null                     // (c) ja eh espelho (sinal de merge ja feito)
  if (input.additiveOptIn) return null                               // (d) dev escolheu opt-in
  if (input.dryRun) return null                                      // (e) dev so quer preview

  const manifestMajorMinor = input.manifestPluginVersion.split('.').slice(0, 2).join('.')
  const currentMajorMinor = input.currentPluginVersion.split('.').slice(0, 2).join('.')

  // SH-10: warning especifico v6.3.x → v6.4.x. Bumps maiores (ex: 6.4.x → 6.5.x) tem seus
  // proprios canais; bumps patch (6.4.0 → 6.4.1) nao mudam comportamento default.
  if (manifestMajorMinor !== '6.3' || currentMajorMinor !== '6.4') return null

  return {
    shouldWarn: true,
    message:
      'v6.4.0 mudou o comportamento default do /init para destrutivo. ' +
      'Seu CLAUDE.md (' + input.claudeMdLineCount + ' linhas) sera transformado em espelho <=40 linhas, ' +
      'com backup automatico em .anti-vibe/backup/. ' +
      'Use --additive-merge se preferir o comportamento v6.3.x. ' +
      'Ver docs/design-docs/ADR-NNNN-destructive-merge-default.md.',
  }
}
```

### Passo 2: Integracao no dispatcher

```typescript
// skills/init/lib/run-init.ts (adicao apos parseFlags + audit-log factory)
import { detectCrossUpgrade } from './cross-upgrade-detector'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// dentro de runInit, apos const ctxWithAudit = ...:
async function readManifestPluginVersion(cwd: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(cwd, '.claude', '.anti-vibe-manifest.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { pluginVersion?: string }
    return parsed.pluginVersion ?? null
  } catch {
    return null
  }
}

async function countClaudeMdLines(cwd: string): Promise<number | null> {
  try {
    const raw = await fs.readFile(path.join(cwd, 'CLAUDE.md'), 'utf-8')
    return raw.split('\n').length
  } catch {
    return null
  }
}

const warning = detectCrossUpgrade({
  manifestPluginVersion: await readManifestPluginVersion(ctx.cwd),
  currentPluginVersion: CURRENT_PLUGIN_VERSION, // import const do helper plugin-version.ts (ou lib resolve)
  claudeMdLineCount: await countClaudeMdLines(ctx.cwd),
  additiveOptIn: ctx.flags['--additive-merge'] === true,
  dryRun: ctx.flags['--dry-run'] === true,
})

if (warning !== null) {
  // 2026-05-18 (Luiz/dev): SH-10 + D30 — warning amarelo PT-BR ANTES do loop do registry.
  // Convencao ANSI yellow inline (sem dependencia de chalk para preservar bundle size).
  const NO_COLOR = process.env.NO_COLOR === '1' || ctx.flags['--no-color'] === true
  const yellow = NO_COLOR ? warning.message : `\x1b[33m${warning.message}\x1b[0m`
  log(yellow)
}
```

### Passo 3: Test do detector puro

```typescript
// skills/init/lib/cross-upgrade-detector.test.ts
import { describe, it, expect } from 'bun:test'
import { detectCrossUpgrade } from './cross-upgrade-detector'

describe('detectCrossUpgrade', () => {
  const base = {
    currentPluginVersion: '6.4.0',
    additiveOptIn: false,
    dryRun: false,
  }

  it('returns warning when v6.3.x → v6.4.x and CLAUDE.md > 40 lines', () => {
    const result = detectCrossUpgrade({
      ...base,
      manifestPluginVersion: '6.3.2',
      claudeMdLineCount: 287,
    })
    expect(result).not.toBeNull()
    expect(result?.message).toContain('--additive-merge')
    expect(result?.message).toContain('287')
  })

  it('returns null when CLAUDE.md is already a mirror (<= 40 lines)', () => {
    expect(detectCrossUpgrade({ ...base, manifestPluginVersion: '6.3.2', claudeMdLineCount: 36 })).toBeNull()
  })

  it('returns null when patch bump within 6.4.x (no behavior change)', () => {
    expect(detectCrossUpgrade({ ...base, manifestPluginVersion: '6.4.0', currentPluginVersion: '6.4.1', claudeMdLineCount: 100 })).toBeNull()
  })

  it('returns null when manifest is absent (greenfield)', () => {
    expect(detectCrossUpgrade({ ...base, manifestPluginVersion: null, claudeMdLineCount: 100 })).toBeNull()
  })

  it('returns null when --additive-merge is set', () => {
    expect(detectCrossUpgrade({ ...base, manifestPluginVersion: '6.3.2', claudeMdLineCount: 100, additiveOptIn: true })).toBeNull()
  })

  it('returns null when --dry-run is set', () => {
    expect(detectCrossUpgrade({ ...base, manifestPluginVersion: '6.3.2', claudeMdLineCount: 100, dryRun: true })).toBeNull()
  })
})
```

---

## Gotchas

- **G1 herdado (G6 do README) — 5 cenarios de no-warning:** Cobertos pelos testes (b), (c), (d), (e), (f). NAO pular nenhum — cada cenario refletido em assertion explicita.
- **G2 herdado (G7 do README) — ANSI yellow + NO_COLOR:** Respeitar `NO_COLOR=1` (convencao Unix) e flag explicita `--no-color` (Windows Terminal as vezes nao interpreta sequencias mesmo modernos). Default eh **emitir cor** (dev percebe).
- **G3 herdado (notas de friccao no MEMORY) — leitura do plugin.json:** O `CURRENT_PLUGIN_VERSION` precisa vir de algum lugar. Opcoes: (a) constante inline atualizada manualmente a cada bump (frageis); (b) helper `lib/plugin-version.ts` lendo `.claude-plugin/plugin.json` em runtime (mais robusto); (c) injecao em build-time (overkill). **Escolher (b)** + testes mockando o reader. Documentar em MEMORY se houver decisao final divergente.
- **Local — `.claude/.anti-vibe-manifest.json` schema:** Conforme `lib/manifest-writer.ts:25-31`, schema eh `{ pluginVersion: string, initMode: InitMode, installedAt: string, ... }`. Leitura defensiva — `try/catch` engole ENOENT e JSON.parse error (greenfield ou manifest corrompido = no warning, sem crash).
- **Local — Linha count do CLAUDE.md:** Usar `raw.split('\n').length` (consistente com `bun run scripts/harness-validate.ts` que checa `<= 40 linhas`). Atencao: arquivo com EOL `\r\n` (Windows) tem `\n` final entao split funciona; arquivo sem newline final tem count exato.
- **Local — Mensagem cita ADR-NNNN placeholder:** A mensagem inclui referencia `docs/design-docs/ADR-NNNN-destructive-merge-default.md`. Apos fase-03 entregar o ADR, **fazer pass posterior** substituindo `NNNN` pelo numero real (registrar em MEMORY como DEV-N se fases 02 e 03 rodaram em paralelo).

---

## Verificacao

### TDD

- [ ] **RED — detector puro:** Teste falha por `Cannot find module './cross-upgrade-detector'`
  - Comando: `bun test skills/init/lib/cross-upgrade-detector.test.ts`
  - Resultado esperado: error compilation

- [ ] **GREEN — detector puro:** Helper criado, 6 testes verdes
  - Comando: `bun test skills/init/lib/cross-upgrade-detector.test.ts`
  - Resultado esperado: `6 passed, 0 failed`

- [ ] **RED — integration dispatcher:** Teste falha porque `runInit` ainda nao chama o detector (log nao contem o warning)
  - Comando: `bun test skills/init/lib/run-init-cross-upgrade.test.ts`
  - Resultado esperado: `Expected log to contain '\x1b[33m'; got [...]` (assertion failure)

- [ ] **GREEN — integration dispatcher:** Wiring entregue, 2 testes verdes
  - Comando: `bun test skills/init/lib/run-init-cross-upgrade.test.ts`
  - Resultado esperado: `2 passed, 0 failed`

### Checklist

- [ ] `detectCrossUpgrade` retorna `null` em todos os 5 cenarios de no-warning (testado por assertion explicita por cenario).
- [ ] Mensagem contem **literais**: `'--additive-merge'`, `'.anti-vibe/backup/'`, `'ADR-NNNN'` (placeholder, atualizado pos-fase-03).
- [ ] Warning eh emitido **ANTES** do loop do registry — assertable via mock de log capturando ordem dos calls.
- [ ] `NO_COLOR=1` ou `--no-color` desativa ANSI sequences (assertion: `log.mock.calls[0][0]` nao contem `\x1b[33m`).
- [ ] Greenfield (fixture sem manifest, sem CLAUDE.md) NAO loga warning (assertion: log nao contem qualquer fragmento da mensagem).
- [ ] `bun run lint && bun run typecheck` clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/cross-upgrade-detector.test.ts skills/init/lib/run-init-cross-upgrade.test.ts` retorna `0 failed`.
- Em fixture `tests/fixtures/inverted-merge-v6.4/` (Plano 07 fase-02) com manifest mockado `{ pluginVersion: '6.3.2', ... }` + CLAUDE.md de 287 linhas, primeira linha do `log` capturado por `runInit` contem `'v6.4.0 mudou o comportamento default'` e `'--additive-merge'`.
- Em fixture greenfield (`tests/fixtures/greenfield-populate-plan-tracer/`), `log` capturado **NAO** contem `'v6.4.0 mudou'`.

**Por humano:**
- Spot-check visual: rodar `/anti-vibe-coding:init` em projeto local com manifest v6.3.x + CLAUDE.md inflado → mensagem aparece amarela no terminal antes do scaffold.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

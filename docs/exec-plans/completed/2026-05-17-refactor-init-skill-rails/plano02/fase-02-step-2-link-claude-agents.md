<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Portar Step 2 — `linkClaudeToAgents` (3 tiers)

**Plano:** 02 — Steps puros
**Sizing:** 2h
**Depende de:** fase-01 (registry com 2 entradas; padrao golden estabelecido)
**Visual:** false

---

## O que esta fase entrega

Step 2 do `SKILL.md` (linhas 273-294) portado para `skills/init/lib/steps/02-link-claude-agents.ts`,
envelopando `linkClaudeToAgents` (helper preservado). Step emite **dois logs** — o tier escolhido
e, se Tier 3 (copy-with-hook), uma nota sobre o hook em `.claude/settings.local.json`. Registrado
como TERCEIRA entrada do registry. CA-08 do PRD cobre o fallback Tier 1/2 -> Tier 3 em Windows.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/02-link-claude-agents.ts` | Create | Step que invoca `linkClaudeToAgents` e emite logs por tier |
| `skills/init/lib/registry.ts` | Modify | Adicionar `linkClaudeAgentsStep` como TERCEIRA entrada |
| `skills/init/lib/steps/02-link-claude-agents.test.ts` | Create | 3 testes: cada tier separadamente |
| `skills/init/lib/steps/__fixtures__/link-targets/AGENTS.md` | Create | Fixture com AGENTS.md presente (pre-requisito do helper) |
| `skills/init/lib/steps/__golden__/link-claude-symlink.txt` | Create | stdout esperado para Tier 1 |
| `skills/init/lib/steps/__golden__/link-claude-hardlink.txt` | Create | stdout esperado para Tier 2 |
| `skills/init/lib/steps/__golden__/link-claude-copy-hook.txt` | Create | stdout esperado para Tier 3 (2 linhas) |

---

## Implementacao

### Passo 1: Portar o step (`02-link-claude-agents.ts`)

**REGRA ABSOLUTA (G1):** wording dos logs byte-identico ao bloco inline em SKILL.md linhas 285-290.
O log do Tier 3 tem DUAS linhas; os outros tiers, UMA. Forma final em `summary` com `\n` quando aplicavel.

```typescript
// skills/init/lib/steps/02-link-claude-agents.ts
import { linkClaudeToAgents } from '../symlink-fallback'
import type { Step } from './types'

export const linkClaudeAgentsStep: Step = {
  id: 'link-claude-agents',
  async run(ctx) {
    const r = await linkClaudeToAgents(ctx.cwd)

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 287-290 (PRD R1, G1).
    // O tier eh logado SEMPRE. A segunda linha SO aparece quando tier === 'copy-with-hook'.
    const lines = [`Linked via tier: ${r.tier}`]
    if (r.tier === 'copy-with-hook') {
      lines.push('Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits to AGENTS.md')
    }

    return {
      mutated: true,
      summary: lines.join('\n'),
    }
  },
}
```

### Passo 2: Registrar no `registry.ts`

```typescript
// skills/init/lib/registry.ts (apos fase-01)
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'

export const registry: readonly Step[] = [
  detectLegacyStep,
  scaffoldFullTreeStep,
  // 2026-05-17 (Luiz/dev): link DEPOIS de scaffold — AGENTS.md precisa existir para o link/copia.
  linkClaudeAgentsStep,
]
```

### Passo 3: Criar fixture base

```
skills/init/lib/steps/__fixtures__/link-targets/
  AGENTS.md       (conteudo qualquer; helper le este arquivo para criar CLAUDE.md espelho)
```

`AGENTS.md` da fixture: `# AGENTS\n\nThis is the source of truth.\n`.

### Passo 4: Testes com mock de tier (`02-link-claude-agents.test.ts`)

O helper `linkClaudeToAgents` decide o tier baseado em capabilities do OS (symlink permissions,
hardlink support, fallback copy). Testes deterministicos exigem MOCK do helper. Como `mock.module`
no Bun causa pollution cross-file (ver `docs/compound/2026-05-16-bun-mock-module-pollution.md` —
licao recente), usar **dependency injection via re-export local** OU isolar testes em arquivo
unico que ja faz mock.module no top-level.

**Decisao:** injetar via parametro de funcao usando uma versao **testavel** do step. O step
publico (`linkClaudeAgentsStep`) chama o helper diretamente; uma funcao `runLinkClaudeStep(linker)`
exposta APENAS para teste recebe o linker como argumento.

```typescript
// skills/init/lib/steps/02-link-claude-agents.ts (versao com hook de teste)
import { linkClaudeToAgents } from '../symlink-fallback'
import type { LinkResult } from '../symlink-fallback'
import type { Step, StepReport } from './types'

// 2026-05-17 (Luiz/dev): hook de teste — injecao via parametro evita mock.module pollution.
// PROD usa o linker default (re-exportado). Testes passam um stub.
type Linker = (targetDir: string) => Promise<LinkResult>

export async function runLinkClaudeStep(targetDir: string, linker: Linker = linkClaudeToAgents): Promise<StepReport> {
  const r = await linker(targetDir)
  const lines = [`Linked via tier: ${r.tier}`]
  if (r.tier === 'copy-with-hook') {
    lines.push('Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits to AGENTS.md')
  }
  return { mutated: true, summary: lines.join('\n') }
}

export const linkClaudeAgentsStep: Step = {
  id: 'link-claude-agents',
  run: (ctx) => runLinkClaudeStep(ctx.cwd),
}
```

```typescript
// skills/init/lib/steps/02-link-claude-agents.test.ts
import { describe, test, expect } from 'bun:test'
import { runLinkClaudeStep } from './02-link-claude-agents'
import type { LinkResult } from '../symlink-fallback'

const stubLinker = (tier: LinkResult['tier']): (() => Promise<LinkResult>) => async () => ({
  tier,
  source: 'AGENTS.md',
  target: 'CLAUDE.md',
})

describe('linkClaudeAgentsStep', () => {
  test('symlink tier: single log line', async () => {
    const r = await runLinkClaudeStep('/tmp', stubLinker('symlink'))
    expect(r.summary).toBe('Linked via tier: symlink')
    expect(r.mutated).toBe(true)
  })

  test('hardlink tier: single log line', async () => {
    const r = await runLinkClaudeStep('/tmp', stubLinker('hardlink'))
    expect(r.summary).toBe('Linked via tier: hardlink')
  })

  test('copy-with-hook tier: two-line summary (CA-08)', async () => {
    const r = await runLinkClaudeStep('/tmp', stubLinker('copy-with-hook'))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('Linked via tier: copy-with-hook')
    expect(lines[1]).toBe('Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits to AGENTS.md')
  })
})
```

> **Decisao explicita — checar tipo `LinkResult`:** o stub precisa retornar exatamente o shape
> que `linkClaudeToAgents` retorna. Antes de fechar a fase, abrir `symlink-fallback.ts` e
> conferir os campos do tipo `LinkResult` (alem de `tier`, ha `source`/`target`/etc?). Ajustar
> stub. NAO acoplar o teste a campos que o step NAO usa — usar apenas `tier`.

### Passo 5: Goldens (referencia humana)

`__golden__/link-claude-symlink.txt`:
```
Linked via tier: symlink
```

`__golden__/link-claude-hardlink.txt`:
```
Linked via tier: hardlink
```

`__golden__/link-claude-copy-hook.txt`:
```
Linked via tier: copy-with-hook
Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits to AGENTS.md
```

### Passo 6: Paranoia grep contra SKILL.md (G1)

```bash
grep -F 'Linked via tier:' skills/init/SKILL.md
grep -F 'Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits to AGENTS.md' skills/init/SKILL.md
```

Ambos exit 0 antes E depois da fase.

---

## Gotchas

- **G1 do plano (wording):** O log do Tier 3 tem em-dash (`—` U+2014) entre `.json` e `CLAUDE.md`.
  NAO substituir por dois hifens. Conferir com `xxd` em caso de duvida.
- **G2 do plano (helper preservado):** `linkClaudeToAgents` em `symlink-fallback.ts` NAO eh
  modificado. Se OS detection falhar nos testes (por isso usamos stub), eh responsabilidade do
  teste do helper — NAO desta fase.
- **G3 do plano (importacao estatica):** import direto de `../symlink-fallback`. Nada de
  `await import`.
- **Local — Bun mock.module pollution (compound note):** documentado em
  `docs/compound/2026-05-16-bun-mock-module-pollution.md`. POR ISSO usamos injecao via
  parametro (`runLinkClaudeStep(targetDir, linker?)`) em vez de `mock.module('../symlink-fallback', ...)`.
  Confirmar que o pattern eh aceito pelo lint do projeto.
- **Local — `mutated: true` mesmo no copy-with-hook:** o tier 3 mexe em `.claude/settings.local.json`,
  cria `CLAUDE.md` copia. Definitivamente mutated. Em Tier 1/2 (sym/hardlink) tambem cria o arquivo
  link CLAUDE.md — sempre `mutated: true`.
- **Local — fixture AGENTS.md:** o helper le AGENTS.md para criar CLAUDE.md (no Tier 3, copy literal;
  Tier 1/2, link aponta). Em testes com stub, AGENTS.md nao precisa existir (stub nao acessa FS).
  Mas se algum teste futuro chamar `linkClaudeAgentsStep.run(ctx)` direto (sem stub), o ctx.cwd
  precisa apontar para um cwd que contenha AGENTS.md — daí a fixture `link-targets/` existir
  para futuras integracoes.

---

## Verificacao

### TDD

- [ ] **RED:** 3 testes escritos. Falham por modulo nao encontrado.
  - Comando: `bun run test skills/init/lib/steps/02-link-claude-agents.test.ts`

- [ ] **GREEN:** Step + registry atualizados. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: testes da fase-02 + fases anteriores passam

### Checklist

- [ ] `02-link-claude-agents.ts` criado, exporta `linkClaudeAgentsStep` E `runLinkClaudeStep`
- [ ] `registry.ts` atualizado: 3 entradas em ordem (detect-legacy, scaffold-full-tree, link-claude-agents)
- [ ] Fixture `link-targets/AGENTS.md` criada
- [ ] 3 goldens criados (referencia humana)
- [ ] 3 testes passam (cada tier)
- [ ] Helper `symlink-fallback.ts` NAO modificado
- [ ] `SKILL.md` NAO modificado
- [ ] Paranoia grep: 2 strings encontradas no SKILL.md (exit 0)
- [ ] Step nao usa `await import` nem `bun -e`: grep retorna 0 matches
- [ ] Lint limpo

---

## Criterio de Aceite

Step `link-claude-agents` portado e validado em 3 cenarios (cada tier). Wording byte-identico ao
bloco inline. CA-08 (Tier 3 fallback) coberto pelo terceiro teste.

**Por maquina:**
- `bun run test skills/init/lib/steps/02-link-claude-agents.test.ts` exit 0 com 3 testes passando
- `git diff --stat skills/init/SKILL.md skills/init/lib/symlink-fallback.ts` retorna 0 arquivos
- `grep -c 'Linked via tier' skills/init/lib/steps/02-link-claude-agents.ts` retorna 1 (uma ocorrencia, literal)

**Por humano:**
- Inspecao visual: linha 2 do golden `copy-hook.txt` bate com SKILL.md linha 290 caractere a caractere

---

<!-- Gerado por /plan-feature em 2026-05-17 -->

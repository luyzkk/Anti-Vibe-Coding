# Fase 04: Drift test — `mustCover` H2 names == H2 names mencionadas em cada `.md`

**Plano:** 01 — Schema, Renderer e Data
**Sizing:** 30min
**Depende de:** fase-02 + fase-03 (precisa do `mustCover` populado e dos 16 `.md` no disco)
**Visual:** false

---

## O que esta fase entrega

Um teste que pega divergencia semantica entre o **schema** (`mustCover` keys em `populate-instructions-table.ts`) e a **prosa** (subsecoes `### {H2 name}` em cada `.md` de guidance). Sem isso, alguem pode renomear "Auth Flow" para "Authentication Flow" no `mustCover` e esquecer de atualizar a prosa — a LLM consumindo o plano fica com sinais contraditorios.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-guidance-drift.test.ts` | Create | Teste que parsea `.md` e compara com `mustCover` |

---

## Implementacao

### Passo 1: Parser simples de H3 em cada `.md`

Cada `.md` de guidance segue convencao: dentro de `## Por H2 — o que escrever`, cada H2 do doc-alvo vira uma subsecao `### {H2 name}`. O teste extrai todas as `### ` que aparecem APOS a linha `## Por H2 — o que escrever` e antes da proxima `## ` H2.

```typescript
// skills/init/lib/populate-guidance-drift.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — drift test entre mustCover e prosa.

import { describe, test, expect } from 'bun:test'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { POPULATE_INSTRUCTIONS_BY_DOC } from './populate-instructions-table'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')

/**
 * Extrai os nomes de H3 que aparecem dentro da secao "## Por H2 — o que escrever"
 * em um arquivo de guidance .md.
 *
 * Regra: pega todas as linhas que comecam com `### ` apos a linha que comeca com
 * `## Por H2` e antes da proxima linha que comeca com `## ` (proxima H2).
 */
function extractH2NamesFromGuidance(content: string): string[] {
  const lines = content.split('\n')
  const result: string[] = []
  let inSection = false
  for (const line of lines) {
    if (line.startsWith('## Por H2')) {
      inSection = true
      continue
    }
    if (inSection && line.startsWith('## ')) {
      // chegou na proxima H2
      break
    }
    if (inSection && line.startsWith('### ')) {
      result.push(line.replace(/^###\s+/, '').trim())
    }
  }
  return result
}

describe('drift test: mustCover keys ↔ guidance .md H3 names', () => {
  test('every mustCover key has a matching ### subsection in the guidance .md', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const guidancePath = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(guidancePath, 'utf-8')
      const proseSubsections = new Set(extractH2NamesFromGuidance(content))
      const mustCoverKeys = Object.keys(instr.mustCover)

      for (const key of mustCoverKeys) {
        expect(
          proseSubsections.has(key),
          `${doc}: mustCover key "${key}" has no matching ### in ${instr.guidanceFile}\n` +
          `  Prose subsections found: ${[...proseSubsections].join(', ') || '(none)'}`,
        ).toBe(true)
      }
    }
  })

  test('no orphan ### in guidance .md (every prose subsection is in mustCover)', async () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const guidancePath = path.join(REPO_ROOT, instr.guidanceFile)
      const content = await fs.readFile(guidancePath, 'utf-8')
      const proseSubsections = extractH2NamesFromGuidance(content)
      const mustCoverKeys = new Set(Object.keys(instr.mustCover))

      for (const sub of proseSubsections) {
        expect(
          mustCoverKeys.has(sub),
          `${doc}: orphan ### "${sub}" in ${instr.guidanceFile} (no matching mustCover key)`,
        ).toBe(true)
      }
    }
  })
})
```

### Passo 2: Validar manualmente em 1 doc complexo

Antes de rodar a suite completa, validar no doc com mais H2 (provavelmente SECURITY.md ou ARCHITECTURE.md):

```bash
bun test skills/init/lib/populate-guidance-drift.test.ts --grep "Auth Flow"
```

Se falhar, ajustar OU prosa OU `mustCover`. Drift test eh _intencionalmente_ rigido — eh ele que segura a feature longo prazo.

### Passo 3: Documentar a convencao no `_template.md`

Adicionar nota no `_template.md` (criado em fase-03):

```markdown
> **Convencao para drift test:** as subsecoes `### {nome}` dentro de `## Por H2 — o que escrever`
> DEVEM bater 1:1 com as chaves de `mustCover` no `populate-instructions-table.ts`.
> Test `populate-guidance-drift.test.ts` valida.
```

---

## Gotchas

- **G1:** Test eh CASE-SENSITIVE. "Auth Flow" != "auth flow". Decisao explicita — H2 names sao titulos, capitalizacao importa.
- **G2:** Espacos e caracteres especiais (`/`, `-`) sao literais. "Threat Model (opcional)" no `.md` deve casar com `mustCover: { 'Threat Model (opcional)': [...] }`.
- **G3:** Se quiser uma subsecao no `.md` que NAO seja H2 do doc-alvo (ex: "Tips and tricks"), use H4 (`#### `) — o parser so pega H3 dentro da secao "Por H2".
- **G4:** Drift test pega divergencia mas NAO valida CONTEUDO das subsecoes. Se a prosa dizer coisa errada, eh outro problema (revisao humana).
- **G5:** Parser eh simples (string `startsWith`) — robusto o suficiente para o formato controlado dos `.md` de guidance. Se prosa usar `###` dentro de bloco de codigo, parser confunde. Decisao: NAO usar `###` em fences de codigo.
- **G6:** O segundo teste ("no orphan ###") eh simetrico — pega se a prosa tem subsecao que `mustCover` esqueceu. Importante para prevenir o caso oposto.

---

## Verificacao

### TDD

- [ ] **RED simulado:** renomear temporariamente "Auth Flow" para "Authentication Flow" em `mustCover` de SECURITY.md. Rodar `bun test skills/init/lib/populate-guidance-drift.test.ts`. DEVE falhar com mensagem clara apontando o doc, a chave e a prosa real.
- [ ] **GREEN:** reverter a mudanca. Test passa novamente.
- [ ] **REFACTOR:** `bun run lint` limpo.

### Checklist

- [ ] Test parsea `### ` apenas dentro de `## Por H2 — o que escrever`
- [ ] Teste 1 (mustCover → prosa) passa para os 16 docs
- [ ] Teste 2 (prosa → mustCover, simetrico) passa para os 16 docs
- [ ] Mensagem de erro nomeia: doc, chave/subsecao, e qual lado esta orfao
- [ ] Convencao documentada em `_template.md`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-guidance-drift.test.ts` retorna `2 passed, 0 failed`
- Mutacao manual (renomear 1 H2) ativa o test corretamente — validacao do RED

**Por humano:**
- Mensagem de erro do test eh acionavel ("ah, eu sei o que mudar")

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->

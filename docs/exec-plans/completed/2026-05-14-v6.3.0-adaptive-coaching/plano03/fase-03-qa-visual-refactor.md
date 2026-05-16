<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): pre-check via tool-registry-inspector — RF-MH-04, CA-06`
-->

# Fase 03: qa-visual refactor — consumir tool-registry-inspector sem mudança UX

**Plano:** 03 — /parity-audit + tool-registry-inspector ([README](./README.md))
**Sizing:** ~0.5h
**Depende de:** fase-01 (precisa de `inspectToolRegistry`)
**Visual:** false (refactor não muda UI — CA-06)

---

## O que esta fase entrega

Adiciona bloco de pre-check em `skills/qa-visual/SKILL.md` que valida (via `inspectToolRegistry`) se o Playwright MCP está instalado ANTES de prosseguir com o fluxo do usuário. Quando presente, comportamento UX é idêntico ao v6.2 (CA-06). Quando ausente, emite mensagem clara e aborta cedo. O frontmatter `allowed-tools:` permanece INTOCADO — é parseado pelo harness do Claude Code para autorização, refactor não pode mexer (PRD §Decisão #9).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/qa-visual/SKILL.md` | Modify | Adicionar bloco de pre-check no início, ANTES do "Passo 0 — Resolver URL". Frontmatter NÃO muda. |
| `skills/qa-visual/__tests__/qa-visual-precheck.test.ts` | Create | 2 testes (Playwright presente → prossegue; Playwright ausente → mensagem de erro) |

---

## Pre-trabalho

1. **Reler `skills/qa-visual/SKILL.md` completamente** (não confiar em memória — pode ter mudado em v6.2). Localizar onde está "Passo 0 — Resolver URL" e o bloco atual de telemetria. Bloco novo entra DEPOIS da telemetria, ANTES do Passo 0 (PLAN.md risco "blocos profile-aware-preface conflituam com bloco de telemetria").
2. **Confirmar que `inspectToolRegistry` foi mergeada** (fase-01 verde). Se não, criar stub temporário e registrar em MEMORY.md.
3. **Conferir o nome exato do MCP Playwright no manifest:** rodar `Grep` por `playwright` em `.anti-vibe-manifest.json`. O nome real usado em produção é `plugin_playwright_playwright` (visto no contexto de tools deferidas). A função de filtro deve casar isso.
4. **Importante:** o `allowed-tools:` frontmatter hoje lista as tools `mcp__plugin_playwright_playwright__*` hardcoded. NÃO REMOVER — só adicionar bloco de runtime check.

---

## Implementacao

### Passo 1: Bloco de pre-check no SKILL.md (após telemetria, antes do Passo 0)

```markdown
<!-- 2026-05-14 (Luiz/dev): pre-check via tool-registry-inspector — RF-MH-04, CA-06 -->
<!-- Bloco defensivo: se Playwright MCP ausente, abortar com mensagem clara. UX idêntica a v6.2 quando presente. -->

## Pre-check — Playwright MCP disponível?

Antes de prosseguir, valide que o Playwright MCP está disponível no registry runtime.

\`\`\`typescript
// Pseudocódigo declarativo — EXECUTOR-LLM chama via Read+Bash, não inline
import { inspectToolRegistry } from '../lib/tool-registry-inspector'

const snapshot = await inspectToolRegistry(process.cwd())
const hasPlaywright = snapshot.mcps.some(m =>
  m.name.toLowerCase().includes('playwright')
)

if (!hasPlaywright) {
  console.error('Playwright MCP nao esta instalado ou nao foi declarado no .anti-vibe-manifest.json.')
  console.error('Instale o plugin Playwright MCP antes de rodar /qa-visual.')
  return  // early return — UX idêntica ao caso sem MCP em v6.2 (mensagem antes era genérica)
}
\`\`\`

Se o pre-check passar, prossiga para o Passo 0 abaixo — comportamento idêntico ao v6.2.
```

Notas:
- A skill é declarativa: o LLM-executor lê os passos e chama as libs. O bloco TypeScript é referência para o LLM saber qual função chamar, não código inline rodando.
- `console.error` vs `console.log`: erros vão para stderr, ficam visíveis no terminal mesmo se stdout for redirecionado.
- `return` aqui é semântico ("aborte o fluxo da skill") — o LLM-executor interpreta isso como "não continue para o Passo 0".

### Passo 2: Frontmatter NÃO muda

```yaml
# Estado atual (manter):
allowed-tools: Read, Glob, Grep, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_click, [...]
```

Notas:
- Removendo `mcp__plugin_playwright_playwright__*` daqui quebraria autorização do harness do Claude Code — o pre-check de runtime é defensivo, não substituto.
- PRD §Decisão #9: "qa-visual migra pra tool-registry-inspector, sem mudança UX". Frontmatter é parte da autorização interna do harness — não é UX do usuário.
- CA-06: "comportamento UX idêntico ao v6.2" — usuário não percebe diferença quando Playwright instalado.

### Passo 3: Teste smoke (não-runtime — valida a presença do bloco)

```typescript
// skills/qa-visual/__tests__/qa-visual-precheck.test.ts
import { describe, it, expect } from 'bun:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const SKILL_PATH = path.resolve(__dirname, '..', 'SKILL.md')

describe('qa-visual SKILL.md — pre-check refactor', () => {
  it('preserves allowed-tools frontmatter with Playwright MCP tools', async () => {
    const raw = await readFile(SKILL_PATH, 'utf-8')
    const { data } = matter(raw)
    const allowed = typeof data['allowed-tools'] === 'string' ? data['allowed-tools'] : ''
    expect(allowed).toContain('mcp__plugin_playwright_playwright__')
  })

  it('contains pre-check block referencing inspectToolRegistry', async () => {
    const raw = await readFile(SKILL_PATH, 'utf-8')
    expect(raw).toContain('inspectToolRegistry')
    expect(raw).toContain('Playwright MCP nao esta instalado')
  })
})
```

Notas:
- Não simula o runtime — apenas verifica que o bloco existe no SKILL.md (smoke estrutural).
- Segundo teste valida AMBOS: o nome da função importada E a mensagem de erro. Garante que ninguém remova um sem remover o outro.
- Os 2 testes cobrem RF-MH-04 + CA-06 sem precisar rodar o Playwright real.

---

## Gotchas

- **G1 do plano:** `allowed-tools:` frontmatter NÃO PODE mudar. É parseado pelo harness do Claude Code antes da skill rodar — remover lista hardcoded quebraria autorização. Pre-check é defensivo, não substituto.
- **G2 do plano:** `inspectToolRegistry` lê do manifest, não introspecta MCPs. Pre-check confia no manifest como fonte de verdade.
- **PLAN.md risco "qa-visual refactoring quebra fluxo já validado":** mitigação é smoke test ANTES de mergear (este `qa-visual-precheck.test.ts` + smoke manual abaixo).
- **PLAN.md risco "blocos profile-aware-preface conflituam com bloco de telemetria":** colocar pre-check DEPOIS do bloco de telemetria, antes do Passo 0. Seguir estrutura de `/architecture/SKILL.md`.
- **Local — nome do MCP é `plugin_playwright_playwright` (sem prefixo `mcp__`):** o snapshot vem do manifest, onde o `name` é o identificador do servidor MCP, não o nome das tools. Filtro: `m.name.toLowerCase().includes('playwright')` é tolerante a variações de nomenclatura.
- **Local — Skill é declarativa:** snippet TypeScript no SKILL.md é REFERÊNCIA, não código executado. EXECUTOR-LLM lê e chama as libs via Read+Bash.

---

## Verificacao

### TDD

Comando para rodar: `bun test skills/qa-visual/__tests__/qa-visual-precheck.test.ts`

### Caso 1: "preserves allowed-tools frontmatter with Playwright MCP tools"

(definido acima na seção Implementação Passo 3)

### Caso 2: "contains pre-check block referencing inspectToolRegistry"

(definido acima na seção Implementação Passo 3)

### Checklist

- [ ] Os 2 testes acima passam: `bun test skills/qa-visual/__tests__/qa-visual-precheck.test.ts` → `2 pass, 0 fail`
- [ ] `bun run test` global: continua verde
- [ ] `skills/qa-visual/SKILL.md` frontmatter `allowed-tools:` continua listando `mcp__plugin_playwright_playwright__*` (não foi removido)
- [ ] Bloco de pre-check está DEPOIS da telemetria e ANTES do Passo 0 (verificar visualmente)
- [ ] Comentário de provenance `// 2026-05-14 (Luiz/dev): pre-check via tool-registry-inspector — RF-MH-04, CA-06` presente no bloco

### Smoke manual (PLAN.md risco "qa-visual quebra fluxo já validado")

- [ ] Em projeto real com Playwright MCP instalado, rodar `/anti-vibe-coding:qa-visual http://localhost:3000`
- [ ] Confirmar: browser abre, snapshot é capturado, screenshots geradas — IDÊNTICO a v6.2 (CA-06)
- [ ] Em ambiente SEM Playwright MCP (remover do manifest temporariamente), rodar a mesma skill
- [ ] Confirmar: mensagem clara "Playwright MCP nao esta instalado..." aparece, fluxo aborta antes de tentar `browser_navigate`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/qa-visual/__tests__/qa-visual-precheck.test.ts` retorna `2 pass, 0 fail`.
- `bun run test` global: 0 failed.

**Por humano (smoke obrigatório antes do merge):**
- Em projeto real COM Playwright MCP instalado, `/qa-visual` funciona idêntico a v6.2 — usuário não percebe diferença (CA-06).
- Em projeto SEM Playwright MCP, `/qa-visual` aborta cedo com mensagem clara apontando o gap.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): regex literal "1.0" — alinhado com PRD §Decisões #7`
-->

# Fase 01: Harness-Validate Extension (checkAgentContracts)

**Plano:** 05 — Validacao Final + Harness + Unlock /init
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano); externamente depende de Plano 03 fase-05 (13 agentes ja emitindo contrato v1)
**Visual:** false

---

## O que esta fase entrega

`scripts/harness-validate.ts` ganha funcao `checkAgentContracts()` que regex-valida cada `agents/*.md` instruindo emissao de contrato v1 — falha rapida (<50ms total para 13 arquivos) com caminho e linha do violador. Cumpre **CA-10** do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `scripts/harness-validate.ts` | Modify | adicionar funcao `checkAgentContracts(failures)` + invocacao em `Promise.all` do `main()` |
| `tests/harness-validate-agent-contracts.test.ts` | Create | testes RED para arquivos com/sem contrato v1 + 1 caso golden de cada kind |
| `tests/fixtures/agent-contract-fixtures/` | Create | fixtures minimas: `valid-audit.md`, `valid-mutation.md`, `missing-contract-version.md`, `missing-reasoning.md`, `missing-kind.md` |

---

## Implementacao

### Passo 1: TDD RED — escrever testes que falham

Antes de tocar em `scripts/harness-validate.ts`, escrever `tests/harness-validate-agent-contracts.test.ts` com casos golden:

```typescript
// 2026-05-14 (Luiz/dev): RED-first — Plano 05 fase-01.
// Testa checkAgentContracts() contra fixtures minimas. Aplica G-P05-01 (regex linha-por-linha).
import { describe, it, expect } from 'bun:test'
import { checkAgentContracts } from '../scripts/harness-validate' // sera exportado

describe('checkAgentContracts', () => {
  it('passa quando agent declara contract_version 1.0 + kind + status + reasoning + payload', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/valid-audit')
    expect(failures).toHaveLength(0)
  })

  it('falha quando agent omite contract_version', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/missing-contract-version')
    expect(failures).toHaveLength(1)
    expect(failures[0].message).toContain('contract_version')
    expect(failures[0].message).toContain('missing-contract-version.md')
  })

  it('falha quando agent omite kind', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/missing-kind')
    expect(failures).toHaveLength(1)
    expect(failures[0].message).toContain('kind')
  })

  it('falha quando agent omite reasoning instruction', async () => {
    const failures: Array<{ rule: string; message: string }> = []
    await checkAgentContracts(failures, 'tests/fixtures/agent-contract-fixtures/missing-reasoning')
    expect(failures).toHaveLength(1)
    expect(failures[0].message).toContain('reasoning')
  })
})
```

Rodar: `bun test tests/harness-validate-agent-contracts.test.ts` => 4 failed (funcao nao existe). **RED confirmado.**

### Passo 2: Criar fixtures de teste

Cada fixture e um `agents/*.md` minimo. Exemplo `valid-audit.md`:

```markdown
---
name: example-auditor
kind: audit
---

# Example Auditor

Voce e um auditor exemplo. Emita output JSON contendo:

\`\`\`json
{
  "contract_version": "1.0",
  "agent": "example-auditor",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Frase livre descrevendo o que observou.",
  "payload": {
    "issues": []
  }
}
\`\`\`
```

Fixtures invalidas omitem um campo cada (control comparison).

### Passo 3: Implementar checkAgentContracts em scripts/harness-validate.ts

Adicionar funcao + exportar para testes + chamar em `main()`:

```typescript
// 2026-05-14 (Luiz/dev): contract v1 prompt check — PRD CA-10 + RF-MH-02.
// Regex linha-por-linha (G-P05-01): nao parse YAML completo. <50ms para 13 arquivos.
// Tokens obrigatorios sao instrucoes literais que o prompt do agent precisa conter
// para o LLM emitir envelope v1. Ausencia = prompt regrediu.
const CONTRACT_TOKENS = [
  'contract_version',
  '"1.0"',
  'kind',
  'status',
  'reasoning',
  'payload',
] as const

export async function checkAgentContracts(
  failures: Failure[],
  agentsDir = 'agents',
): Promise<void> {
  // Glob agents/*.md (apenas top-level, nao recursivo — fixtures vivem em __fixtures__/).
  const entries = await fs.readdir(path.join(root, agentsDir), { withFileTypes: true })
  const agentFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('_'))
    .map((e) => path.join(agentsDir, e.name))

  for (const file of agentFiles) {
    const content = await fs.readFile(path.join(root, file), 'utf8')
    const missing = CONTRACT_TOKENS.filter((token) => !content.includes(token))
    if (missing.length > 0) {
      failures.push({
        rule: 'agent-contract-v1',
        message: `${file}: missing contract v1 tokens in prompt: ${missing.join(', ')}. See docs/design-docs/subagent-contract-v1.md.`,
      })
    }
  }
}
```

E invocar em `main()`:

```typescript
await Promise.all([
  checkRequiredFiles(failures),
  checkAgentsConstraints(failures),
  checkActivePlans(failures),
  checkQualityScoreFormat(failures),
  checkV6PathWhitelist(failures),
  checkAgentContracts(failures), // 2026-05-14 (Luiz/dev): novo — CA-10
])
```

### Passo 4: TDD GREEN — rodar testes

```bash
bun test tests/harness-validate-agent-contracts.test.ts
# expected: 4 passed, 0 failed
```

### Passo 5: Validar contra os 13 agents reais

```bash
bun run harness:validate
# Deve passar (Plano 03 fase-05 deixou os 13 prompts compliant).
# Se falhar: significa que algum prompt regrediu — registrar em MEMORY como bug, voltar para o plano que migrou.
```

---

## Gotchas

- **G-P05-01 (deste plano):** Regex linha-por-linha, sem parse YAML. Usar `content.includes(token)` simples — substrings literais. Performance < 50ms para 13 arquivos.
- **G-P05-01 corolario:** Falsa positiva possivel se um prompt mencionar `contract_version` em comentario didatico mas nao no template de output. Tradeoff aceito em v1 — mensagem de erro lista o agent, dev verifica visualmente. Se virar problema, refinar para regex que casa bloco `\`\`\`json` contendo o token (v6.2).
- **G8 do Plano 01 (Comment Provenance):** Comentarios inline em `harness-validate.ts` precisam de quem/quando/por que. Snippets acima ja seguem o padrao.
- **Local:** Pasta `agents/__fixtures__/` deve ser ignorada pelo glob — usar nao-recursivo (`fs.readdir`, nao walk). Arquivos `_contract/`, `_archived/` tambem nao sao agents.

---

## Verificacao

### TDD

- [ ] **RED:** `tests/harness-validate-agent-contracts.test.ts` falha porque `checkAgentContracts` nao existe
  - Comando: `bun test tests/harness-validate-agent-contracts.test.ts`
  - Resultado esperado: `Cannot find export 'checkAgentContracts'` ou similar (compile/import failure no test runner)

- [ ] **GREEN:** Funcao exportada de `scripts/harness-validate.ts`, testes passam
  - Comando: `bun test tests/harness-validate-agent-contracts.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `checkAgentContracts` exportada de `scripts/harness-validate.ts`
- [ ] Invocada em `Promise.all` do `main()`
- [ ] Fixtures em `tests/fixtures/agent-contract-fixtures/` (5 arquivos: 1 valid + 4 invalid)
- [ ] `bun run harness:validate` passa contra os 13 agents reais
- [ ] Tempo de execucao do check < 100ms (`time bun run harness:validate` e ver delta — sanity)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit code 0 (com os 13 agents reais)
- Editar um `agents/*.md` real removendo a string `contract_version` => `bun run harness:validate` exit code != 0 e mensagem contem nome do arquivo
- Reverter edicao => exit code 0 de novo

**Por humano:**
- Mensagem de erro contem caminho do arquivo + tokens faltantes + link para `docs/design-docs/subagent-contract-v1.md`

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->

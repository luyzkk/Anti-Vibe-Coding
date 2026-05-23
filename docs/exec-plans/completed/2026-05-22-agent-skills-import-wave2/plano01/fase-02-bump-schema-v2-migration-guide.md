<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código devem ter linhagem: autor + papel + data + razão.
Exemplo: `// 2026-05-22 (Luiz/dev): contract_version "2.0.0" — bump MAJOR per PRD DT-2`
-->

# Fase 02: Bump Schema -> v2.0.0 + Migration Guide

**Plano:** 01 — Tracer Bullet Schema v2.0.0 + Gold Standard
**Sizing:** 1h (S)
**Depende de:** fase-01 (precisa do audit map para saber quais parsers ajustar)
**Visual:** false

---

## O que esta fase entrega

Schema doc `subagent-contract-v1.md` atualizado descrevendo a versao `2.0.0` (campos novos, tabela severity->SLA inline, secoes Anti-Degeneration + Composition) e migration guide novo com exemplo antes/depois de parser TypeScript.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md` | Modify | Bumpar versao para `2.0.0`, adicionar campos obrigatorios novos, tabela severity_action_map, descricao das secoes Anti-Degeneration e Composition |
| `f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v2-migration.md` | Create | Migration guide com schema JSON v2.0.0 completo + exemplo antes/depois de parser TS |

---

## Implementacao

### Passo 1: Reler o schema atual

Antes de qualquer edicao:

```bash
cat f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md
```

Anotar:
- Linha onde `contract_version` esta documentado como `"1.0"`
- Lista atual de campos obrigatorios
- Se ja existe alguma referencia a `positive_observations` ou `verdict`

### Passo 2: Atualizar `subagent-contract-v1.md` — bump para v2.0.0

**Editar (NAO sobrescrever todo o arquivo):**

a) Bumpar versao documentada de `"1.0"` para `"2.0.0"` no texto e nos exemplos JSON.

b) Adicionar secao `## Campos obrigatorios v2.0.0` (ou atualizar a existente) com:

```markdown
### Novos campos obrigatorios em v2.0.0

- `contract_version`: string literal `"2.0.0"` (BREAKING — antes `"1.0"`).
- `positive_observations`: `string[]` com `length >= 1`. Mesmo quando a auditoria nao encontra issues, o agente DEVE registrar pelo menos uma observacao positiva especifica (cita arquivo, funcao ou padrao verificavel — proibido tautologia). Ver `docs/design-docs/subagent-contract-v2-migration.md` para regex blacklist e exemplos.
- `verdict`: enum literal `"approve" | "request_changes" | "block"`. Substitui o campo opcional `status` quando aplicavel — convencao:
  - `approve`: nenhum issue critical/high, observacoes positivas validas.
  - `request_changes`: pelo menos 1 issue medium/high; recomendacoes acionaveis.
  - `block`: pelo menos 1 issue critical OU bloqueio de seguranca/contrato.

### Campos novos opcionais (recomendados para issues critical/high)

- `exploitation_scenario`: string descrevendo passo-a-passo como o issue pode ser explorado.
- `impact`: string descrevendo blast radius (dados, usuarios, sistemas afetados).
- `fix_with_example`: string com snippet de codigo correto (antes/depois quando aplicavel).
```

c) Adicionar tabela `severity_action_map` canonica (DT-3 do PRD — inline + ref):

```markdown
### Tabela canonica `severity_action_map`

| Severity | Acao obrigatoria | SLA sugerido | Bloqueia merge? |
|----------|------------------|--------------|------------------|
| critical | block + fix imediato | < 24h | sim |
| high | request_changes + fix antes do release | < 1 semana | sim |
| medium | request_changes + fix no proximo sprint | < 1 mes | nao |
| low | nota informativa, sem bloqueio | best-effort | nao |
| info | observacao positiva ou contexto | n/a | nao |

Ver tambem: `docs/references/severity-glossary.md` (se existir; caso contrario, esta tabela e canonica para o plugin).
```

d) Adicionar secao `## Anti-Degeneration Rules` (descritiva — cada agente lista as proprias regras no seu .md):

```markdown
## Anti-Degeneration Rules (secao obrigatoria em cada agente)

Todo agente DEVE declarar pelo menos 4 regras anti-degeneration no seu `.md`:
- >= 2 regras GENERICAS aplicaveis a todo agente (sugestoes baseline):
  - "Never suggest disabling type checks (`@ts-ignore`, `as any`) as a fix."
  - "Never suggest disabling lint (`eslint-disable`) as the primary fix."
  - "Never suggest `test.skip` / `xit` para silenciar testes."
  - "Never suggest desabilitar validator, gate, hook ou guardrail como solucao."
- >= 2 regras ESPECIFICAS do dominio do agente (ex: security-auditor tem regras de seguranca).

Total minimo agregado: 4 regras x 13 agentes = 52 regras (CA-10 do PRD).
```

e) Adicionar secao `## Composition` (descritiva):

```markdown
## Composition (secao obrigatoria em cada agente)

Todo agente DEVE declarar:
- **Invoke directly when:** condicoes em que o usuario invoca o agente sozinho.
- **Invoke via:** lista de skills/slash-commands que orquestram este agente (`/security`, `/verify-work`, etc).
- **Do not invoke from:** contextos onde o agente NAO deve ser chamado (ex: nao chamar `security-auditor` dentro de `code-smell-detector`).
```

### Passo 3: Criar `subagent-contract-v2-migration.md`

**Conteudo completo do arquivo (template):**

````markdown
# Migration Guide: Subagent Contract v1.0 -> v2.0.0

**Data:** 2026-05-22
**Trigger:** Wave 2 do PRD agent-skills-import. Bump MAJOR por adicao de campos obrigatorios.

---

## TL;DR

- Adicione 2 campos obrigatorios no parser: `positive_observations: string[]` (len >= 1), `verdict: "approve"|"request_changes"|"block"`.
- Bump `contract_version` literal de `"1.0"` para `"2.0.0"` em emissores E validators.
- Campos opcionais novos (issues critical/high): `exploitation_scenario`, `impact`, `fix_with_example`.

---

## Schema JSON v2.0.0 completo

```json
{
  "contract_version": "2.0.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "verdict": "approve",
  "positive_observations": [
    "src/auth/middleware.ts:42 usa bcrypt com saltRounds=12 (acima do minimo OWASP)",
    "src/api/users/route.ts:88 valida input com zod antes de tocar DB"
  ],
  "issues": [
    {
      "id": "SEC-001",
      "severity": "high",
      "title": "Endpoint /api/admin nao valida role",
      "file": "src/api/admin/route.ts",
      "line": 23,
      "exploitation_scenario": "Usuario autenticado mas sem role 'admin' chama POST /api/admin/users e cria conta com privilegio elevado.",
      "impact": "Escalacao de privilegio. Qualquer usuario logado pode promover-se a admin. Afeta toda a base de usuarios.",
      "fix_with_example": "Adicionar `if (session.user.role !== 'admin') return new Response('forbidden', { status: 403 })` no inicio do handler."
    }
  ],
  "metadata": {
    "files_scanned": 18,
    "duration_ms": 4231
  }
}
```

---

## Exemplo de migration de parser TypeScript

### Antes (v1.0)

```typescript
// 2025-XX (legado): parser do contract v1.0
type SubagentReportV1 = {
  contract_version: '1.0'
  agent: string
  kind: 'audit' | 'review' | 'plan'
  status: 'complete' | 'blocked' | 'needs_human'
  issues?: Array<{ id: string; severity: string; title: string }>
}

function parseReport(json: unknown): SubagentReportV1 {
  // validacao basica de shape
  if (typeof json !== 'object' || json === null) throw new Error('invalid')
  const obj = json as Record<string, unknown>
  if (obj.contract_version !== '1.0') throw new Error('unsupported version')
  return obj as SubagentReportV1
}
```

### Depois (v2.0.0)

```typescript
// 2026-05-22 (Luiz/dev): parser v2.0.0 — Wave 2 do PRD agent-skills-import (DT-2)
type SubagentReportV2 = {
  contract_version: '2.0.0'
  agent: string
  kind: 'audit' | 'review' | 'plan'
  status: 'complete' | 'blocked' | 'needs_human'
  verdict: 'approve' | 'request_changes' | 'block'
  positive_observations: string[] // length >= 1
  issues?: Array<{
    id: string
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    title: string
    file?: string
    line?: number
    exploitation_scenario?: string
    impact?: string
    fix_with_example?: string
  }>
}

function isSubagentReportV2(obj: Record<string, unknown>): obj is SubagentReportV2 {
  return (
    obj.contract_version === '2.0.0' &&
    typeof obj.agent === 'string' &&
    Array.isArray(obj.positive_observations) &&
    obj.positive_observations.length >= 1 &&
    obj.positive_observations.every((s) => typeof s === 'string') &&
    typeof obj.verdict === 'string' &&
    ['approve', 'request_changes', 'block'].includes(obj.verdict as string)
  )
}

function parseReport(json: unknown): SubagentReportV2 {
  if (typeof json !== 'object' || json === null) throw new Error('invalid payload')
  const obj = json as Record<string, unknown>

  if (obj.contract_version === '1.0') {
    throw new Error('contract v1.0 nao suportado a partir de 2026-05-22. Migrar para v2.0.0. Ver docs/design-docs/subagent-contract-v2-migration.md')
  }
  if (!isSubagentReportV2(obj)) {
    throw new Error('payload nao conforma com schema v2.0.0')
  }
  return obj
}
```

---

## Checklist de migracao por consumidor

Para cada parser/validator identificado no `audit-consumers.md`:

- [ ] Tipo TS atualizado (campos novos obrigatorios)
- [ ] Type guard / schema validator atualizado (length >= 1, enum de verdict)
- [ ] Erro de v1.0 e mensagem clara apontando este guide
- [ ] Testes do parser cobrem caso v2.0.0 valido E v1.0 rejeitado
- [ ] Fixture atualizada (se houver)

---

## Compatibilidade

- v1.0 -> v2.0.0 e BREAKING. Sem coexistencia — todos os agentes da Wave 2 emitem v2.0.0 simultaneamente apos Plano 02.
- Plano 01 desta Wave bumpa apenas `security-auditor`. Durante esse intervalo (entre Plano 01 e Plano 02 completos), parsers DEVEM aceitar AMBAS as versoes em modo transitional — OU o pipeline corre apenas com `security-auditor` ate Plano 02 fechar (recomendado).

---

## Rationale (link com PRD)

- **DT-2:** Bump MAJOR (2.0.0) — campos obrigatorios novos quebram parsers v1.0 silenciosamente. Versao explicita > evolucao implicita.
- **DT-7:** `positive_observations` obrigatorio (length >= 1) mesmo em auditoria limpa — forca o agente a verbalizar o que foi conferido (anti-tautologia).
- **DC-5:** Validacao anti-generico (regex blacklist + fixture) entregue na fase-04.
````

### Passo 4: Atualizar o audit-consumers (fase-01) com decisao de migracao

Apos finalizar o migration guide, voltar em `audit-consumers.md` (fase-01) e:
- Para cada parser listado como "leitura/consume", preencher coluna "Acao na fase-03" com referencia ao guide.
- Atualizar nota: "Migration guide disponivel em `docs/design-docs/subagent-contract-v2-migration.md`."

---

## Gotchas

- **G1 do plano:** Bump e MAJOR — qualquer parser silenciosamente quebra. Cruzar com `audit-consumers.md` (fase-01) ANTES de finalizar o guide para garantir cobertura.
- **G7 do plano:** Nome do arquivo continua `subagent-contract-v1.md` (preserva historico de URL/refs). Conteudo descreve v2.0.0. Decisao: NAO renomear nesta wave; reavaliar em Wave 3 se ficar dissonante.
- **Local:** Se o arquivo `subagent-contract-v1.md` nao existir (audit falhou em encontra-lo), criar novo `subagent-contract.md` e atualizar todas as refs descobertas na fase-01 — registrar como DEV (desvio) no `MEMORY.md` do plano.
- **Local:** `severity` no JSON inclui `info` (DT-3) — usado para observacoes neutras. NAO confundir com `severity` de issues (critical/high/...). A tabela canonica cobre ambos no mesmo eixo.

---

## Verificacao

### TDD

Sem TDD de codigo — entregaveis sao documentos markdown. Verificacao por grep + lint de markdown.

### Checklist

- [ ] `subagent-contract-v1.md` modificado: contem `contract_version` documentado como `"2.0.0"` (texto + JSON de exemplo)
- [ ] `subagent-contract-v1.md` contem secao `Anti-Degeneration Rules` (descritiva)
- [ ] `subagent-contract-v1.md` contem secao `Composition` (descritiva)
- [ ] `subagent-contract-v1.md` contem tabela `severity_action_map`
- [ ] `subagent-contract-v2-migration.md` criado e contem schema JSON v2.0.0 completo
- [ ] `subagent-contract-v2-migration.md` contem exemplo antes/depois de parser TS
- [ ] `subagent-contract-v2-migration.md` contem checklist de migracao por consumidor
- [ ] Markdown lint passa (se configurado): `bun run lint -- docs/design-docs/`
- [ ] `audit-consumers.md` da fase-01 atualizado com referencia ao migration guide

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "contract_version.*2.0.0" f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md` retorna >= 2 (texto + JSON)
- `grep -c "## Anti-Degeneration Rules" f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md` retorna >= 1
- `grep -c "## Composition" f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v1.md` retorna >= 1
- `test -f f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v2-migration.md && echo OK`
- `grep -c "positive_observations" f:/Projetos/Anti-Vibe-Coding/docs/design-docs/subagent-contract-v2-migration.md` retorna >= 3

**Por humano:**
- Migration guide e legivel sem contexto adicional (teste com olhos frescos: um dev sem conhecer o PRD entende o que mudou e como migrar)

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

# Migration Guide: Subagent Contract v1.0 -> v2.0.0

**Data:** 2026-05-23
**Trigger:** Wave 2 do PRD agent-skills-import. Bump MAJOR por adicao de campos obrigatorios.

---

## TL;DR

- Adicione 2 campos obrigatorios no parser: `positive_observations: string[]` (len >= 1), `verdict: "approve"|"request_changes"|"block"`.
- Bump `contract_version` literal de `"1.0"` para `"2.0.0"` em emissores E validators.
- Campos opcionais novos (recomendados para issues critical/high): `exploitation_scenario`, `impact`, `fix_with_example`.

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
  "reasoning": "Verifiquei 18 arquivos. Encontrei 1 issue high em /api/admin. Autenticacao principal esta robusta — bcrypt e zod em uso consistente.",
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
  "payload": {
    "domain_status": "issues_found",
    "issues": [
      {
        "severity": "high",
        "file": "src/api/admin/route.ts",
        "line": 23,
        "description": "Endpoint /api/admin nao valida role — escalacao de privilegio possivel"
      }
    ]
  },
  "metadata": {
    "files_scanned": 18,
    "duration_ms": 4231,
    "model": "sonnet"
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
// 2026-05-23 (Luiz/dev): parser v2.0.0 — Wave 2 do PRD agent-skills-import (DT-2)
type SubagentReportV2 = {
  contract_version: '2.0.0'
  agent: string
  kind: 'audit' | 'mutation' | 'proposal' | 'verification'
  status: 'complete' | 'blocked' | 'needs_human' | 'needs_retry'
  verdict: 'approve' | 'request_changes' | 'block'
  positive_observations: string[] // length >= 1
  reasoning: string // minLength 20
  payload: Record<string, unknown>
  issues?: Array<{
    id?: string
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
    typeof obj.reasoning === 'string' &&
    obj.reasoning.length >= 20 &&
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
    throw new Error(
      'contract v1.0 nao suportado a partir de 2026-05-23. Migrar para v2.0.0. Ver docs/design-docs/subagent-contract-v2-migration.md'
    )
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

- [ ] Tipo TS atualizado (`contract_version: '2.0.0'` + campos `positive_observations` e `verdict` obrigatorios)
- [ ] Type guard / schema validator atualizado (length >= 1, enum de verdict)
- [ ] Erro de v1.0 e mensagem clara apontando este guide
- [ ] Testes do parser cobrem caso v2.0.0 valido E v1.0 rejeitado
- [ ] Fixture atualizada (se houver) — bumpar de `"1.0"` para `"2.0.0"` e adicionar `positive_observations` + `verdict`

### Parsers identificados em `audit-consumers.md` que requerem migracao

| Arquivo | Caller de | Acao |
|---------|-----------|------|
| `skills/lib/subagent-contract.ts` | schema AJV + tipo literal | Adicionar tipo `SubagentContractBaseV2`, adaptar `parseContract()` para aceitar v2.0.0 |
| `skills/verify-work/lib/audit-consolidator.ts` | `parseContract()` (2 call-sites) | Adaptacao automatica quando `parseContract` aceitar v2 |
| `skills/design-twice/index.ts` | `parseContract()` | Adaptacao automatica quando `parseContract` aceitar v2 |
| `skills/init/lib/compound-writer.ts` | `parseContract()` | Adaptacao automatica quando `parseContract` aceitar v2 |
| `skills/init/lib/migration-planner.ts` | `parseContract()` | Adaptacao automatica quando `parseContract` aceitar v2 |
| `skills/init/lib/reconciler.ts` | `parseContract()` | Adaptacao automatica quando `parseContract` aceitar v2 |
| `skills/verify-work/lib/audit-consolidator.ts:170` | emissor sintetico | Adaptar `contract_version: '1.0' as const` para `'2.0.0'` |

Migration guide completo para parsers: adaptar `skills/lib/subagent-contract.ts` e os downstream sao atualizados automaticamente.

---

## Compatibilidade

- v1.0 -> v2.0.0 e BREAKING. Sem coexistencia permanente — todos os agentes da Wave 2 emitem v2.0.0 simultaneamente apos Plano 02.
- Plano 01 desta Wave bumpa apenas `security-auditor`. Durante esse intervalo (entre Plano 01 e Plano 02 completos), parsers DEVEM aceitar AMBAS as versoes em modo transitional — OU o pipeline corre apenas com `security-auditor` ate Plano 02 fechar (recomendado).
- Schema v1 (`agents/_contract/v1.schema.json`) permanece imutavel — referencia historica, nao remover.

---

## Rationale (link com PRD)

- **DT-2:** Bump MAJOR (2.0.0) — campos obrigatorios novos quebram parsers v1.0 silenciosamente. Versao explicita > evolucao implicita.
- **DT-7:** `positive_observations` obrigatorio (length >= 1) mesmo em auditoria limpa — forca o agente a verbalizar o que foi conferido (anti-tautologia).
- **DC-5:** Validacao anti-generico (regex blacklist + fixture) entregue na fase-04 deste Plano 01.

---

## Regex Blacklist para `positive_observations` (fase-04)

Strings que serao rejeitadas pelo validator anti-generico (implementado em fase-04):

- `"no issues found"` — tautologia
- `"code looks good"` — nao verificavel
- `"everything is fine"` — nao verificavel
- `"audit complete"` — nao verificavel
- `"nothing to report"` — nao verificavel

Strings que PASSAM:

- `"src/auth/middleware.ts:42 usa bcrypt com saltRounds=12"` — arquivo + linha + parametro especifico
- `"funcao validateUser em users/service.ts verifica nulls antes de DB call"` — funcao + arquivo + comportamento
- `"rate-limiting aplicado em todos os endpoints publicos via middleware"` — padrao verificavel por terceiro

<!-- 2026-05-23 (Luiz/dev): migration guide criado — Wave 2 Plano 01 fase-02. Ver audit-consumers.md para lista completa de callers. -->

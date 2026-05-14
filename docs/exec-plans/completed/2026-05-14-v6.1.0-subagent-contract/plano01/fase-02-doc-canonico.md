<!--
Princípio universal #5 — Comment Provenance.
Aplica em código de runtime gerado nas fases 04 e 05. Esta fase é documental.
-->

# Fase 02: Documento Canonico do Contrato

**Plano:** 01 — Fundacao do Contrato
**Sizing:** 1h
**Depende de:** Nenhuma (paralela com fase-01)
**Visual:** false

---

## O que esta fase entrega

Documento canonico em `docs/design-docs/subagent-contract-v1.md` com shape completo do contrato, schema JSON inline ou referenciado, **migration guide <30min** (RF-SH-04, G7) e **1 exemplo de output para cada `kind`** (audit / mutation / proposal / verification — CA-09).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/design-docs/subagent-contract-v1.md` | Create | Doc canonico — shape, schema, migration guide, 4 exemplos |

---

## Implementacao

### Passo 1: Estrutura do documento

```markdown
# Subagent Contract v1 — Especificacao Canonica

**Status:** Active
**Version:** 1.0
**Schema:** `agents/_contract/v1.schema.json`
**ADR:** [ADR-0002](../../../../design-docs/ADR-0002-subagent-contract.md)
**Date:** 2026-05-14

---

## 1. Visao Geral

[3-5 linhas — por que existe, o que padroniza, link para ADR para racional completo]

## 2. Shape do Contrato

[Snippet JSON completo com TODOS os campos — ver Passo 2]

## 3. Campos Obrigatorios

[Tabela: campo / tipo / regra de validacao / exemplo]

## 4. Lifecycle vs Domain Status

[Explicacao da distincao com exemplo contrastante — ver Passo 3]

## 5. Exemplos por Kind

### 5.1 kind: audit (security-auditor)
[Exemplo completo]

### 5.2 kind: verification (plan-verifier)
[Exemplo completo]

### 5.3 kind: proposal (design-explorer)
[Exemplo completo]

### 5.4 kind: mutation (documentation-writer — STUB em v1)
[Exemplo completo]

## 6. Migration Guide — Portar Subagente Existente em <30min

[Passos numerados — ver Passo 4]

## 7. Erros e Warnings do Validator

[Tabela: codigo / quando dispara / como corrigir]

## 8. FAQ

[3-5 perguntas comuns esperadas dos autores de subagente]
```

### Passo 2: Shape completo (secao 2)

```json
{
  "contract_version": "1.0",
  "agent": "string — nome do subagente, igual ao filename sem .md",
  "kind": "audit | mutation | proposal | verification",
  "status": "complete | needs_retry | needs_human | blocked",
  "reasoning": "string — minimo 20 chars, recomendado 50+. Prosa livre. O que voce observou, inclusive fora do schema esperado.",
  "payload": {
    "// shape depende de kind, ver secao 5": "..."
  },
  "human_readable": "string opcional — markdown para apresentacao ao operador",
  "metadata": {
    "run_id": "uuid v4",
    "duration_ms": 0,
    "model": "sonnet | opus | haiku"
  }
}
```

### Passo 3: Distincao lifecycle vs domain_status (secao 4, G2)

```markdown
**`status` (top-level) = lifecycle.** Diz ao orquestrador o que fazer agora:
- `complete` — terminei, prossiga.
- `needs_retry` — falhei por algo transiente, tente de novo (1x).
- `needs_human` — preciso de input humano antes de prosseguir.
- `blocked` — nao consigo continuar, reporte ao operador.

**`payload.domain_status` (opcional) = dominio.** Diz o que voce achou:
- security-auditor: `vulnerabilities_found`, `secure`, `critical_issues`
- tdd-verifier: `compliant`, `non_compliant`, `partially_compliant`

**Erro comum:** colocar `VULNERABILITIES_FOUND` em `status` top-level. Validator rejeita
com `INVALID_LIFECYCLE_STATUS`. Mova para `payload.domain_status`.

### Exemplo contrastante

CORRETO:
\`\`\`json
{
  "status": "complete",
  "payload": { "domain_status": "vulnerabilities_found", "issues": [...] }
}
\`\`\`

ERRADO:
\`\`\`json
{
  "status": "VULNERABILITIES_FOUND",
  "payload": { "issues": [...] }
}
\`\`\`
```

### Passo 4: Migration Guide <30min (secao 6, RF-SH-04, G7)

Numerar passos. Cada passo executavel em ~3-5min. Total <30min.

```markdown
## 6. Migration Guide

### Passo 1 (3min): Identificar o `kind` do seu agente
- Le codigo / nao modifica → `audit`
- Verifica criterios de plano/task → `verification`
- Propoe arquitetura / opcoes → `proposal`
- Modifica arquivos → `mutation`

### Passo 2 (2min): Adicionar frontmatter `kind`
[Diff exemplo no proprio arquivo .md do agente]

### Passo 3 (10min): Reescrever secao "Formato de Saida" do prompt
- Trocar markdown table por JSON conforme contrato
- Incluir exemplo completo de output (LLM copia o shape)
- Domain enum vai para `payload.domain_status` (nao `status`)

### Passo 4 (5min): Escrever `reasoning` bom no exemplo
- 1-3 frases focadas em "o que vi fora do schema"
- Nao re-narre o que ja esta em `payload.issues[]`
- Bom: "Pattern de SQL concatenado aparece 3x mas em arquivos legacy marcados deprecated — recomendar substituicao em batch."
- Ruim: "Encontrei vulnerabilidades de SQL injection." (re-narra issues)

### Passo 5 (5min): Criar fixture em `agents/__fixtures__/{nome}/`
- `input.md` (ou input.json) — entrada minima representativa
- `expected-output.json` — output esperado do agente

### Passo 6 (5min): Rodar `bun run agent:simulate {nome}` (quando disponivel — RF-CH-02) ou validar manual
- Output deve passar pelo validator sem erros
- Reasoning >=50 chars (evita warning)
- `kind` consistente com payload shape
```

### Passo 5: Exemplos por kind (secao 5)

Para cada kind, fornecer 1 exemplo JSON completo, valido, real-ish. Cobre CA-09.

**Audit (security-auditor):**

```json
{
  "contract_version": "1.0",
  "agent": "security-auditor",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Encontrei MD5 usado para hash de senha em src/auth.ts:42 e SQL concatenado em src/api.ts:15. Tambem notei que .env.example tem placeholders mas .env real nao esta no .gitignore — fora do schema padrao mas relevante.",
  "payload": {
    "domain_status": "critical_issues",
    "issues": [
      { "severity": "critical", "file": "src/auth.ts", "line": 42, "description": "MD5 usado para hash de senha" },
      { "severity": "high", "file": "src/api.ts", "line": 15, "description": "SQL concatenado manualmente — usar prepared statement" }
    ]
  },
  "human_readable": "## Security Audit\n\n2 issues encontrados (1 critical, 1 high)...",
  "metadata": { "run_id": "550e8400-e29b-41d4-a716-446655440000", "duration_ms": 1240, "model": "sonnet" }
}
```

**Verification (plan-verifier):**

```json
{
  "contract_version": "1.0",
  "agent": "plan-verifier",
  "kind": "verification",
  "status": "complete",
  "reasoning": "Acceptance criteria executado e passou. Testes verdes (12/12). Lint limpo. Arquivos esperados criados conforme listagem da task. Nenhum desvio detectado.",
  "payload": {
    "domain_status": "pass",
    "checks": [
      { "name": "acceptance_met", "status": "pass", "detail": "Comando `bun run test -- --grep notifications` retornou 12 passed" },
      { "name": "tests_pass", "status": "pass", "detail": "12 testes passando" },
      { "name": "lint_pass", "status": "pass", "detail": "limpo" }
    ]
  },
  "metadata": { "run_id": "...", "duration_ms": 3200, "model": "sonnet" }
}
```

**Proposal (design-explorer):**

```json
{
  "contract_version": "1.0",
  "agent": "design-explorer",
  "kind": "proposal",
  "status": "complete",
  "reasoning": "Explorei 3 abordagens. A opcao B (event-sourced) tem trade-off claro de complexidade vs auditabilidade — vale destacar que o requisito de auditoria pode mudar em 6 meses conforme o roadmap.",
  "payload": {
    "proposal_summary": "Migrar fluxo de notificacoes para event-sourcing",
    "options": [
      { "label": "A — CRUD simples", "pros": "...", "cons": "..." },
      { "label": "B — event-sourced", "pros": "...", "cons": "..." }
    ],
    "recommendation": "A com plano de evolucao para B"
  },
  "human_readable": "## Design Proposal\n\n### Opcao A\n...",
  "metadata": { "run_id": "...", "duration_ms": 8500, "model": "opus" }
}
```

**Mutation (documentation-writer — STUB em v1):**

```json
{
  "contract_version": "1.0",
  "agent": "documentation-writer",
  "kind": "mutation",
  "status": "complete",
  "reasoning": "Atualizei README.md secao Setup com novo passo de bun install. Tambem detectei que CONTRIBUTING.md menciona npm — fora do escopo desta task mas vale TODO.",
  "payload": {
    "mutation": {
      "note": "STUB em v1 — payload.mutation aceita qualquer shape. Spec real em v6.2 (PRD §Won't Have)."
    }
  },
  "metadata": { "run_id": "...", "duration_ms": 4100, "model": "sonnet" }
}
```

### Passo 6: Erros e Warnings do Validator (secao 7, G3, G4)

```markdown
| Codigo | Tipo | Quando dispara | Como corrigir |
|--------|------|---------------|---------------|
| `INVALID_CONTRACT_VERSION` | Error | `contract_version` != `"1.0"` | Usar literal `"1.0"` em v1 |
| `MISSING_REQUIRED_FIELD` | Error | Campo obrigatorio ausente | Adicionar campo (ver secao 3) |
| `INVALID_LIFECYCLE_STATUS` | Error | `status` top-level fora dos 4 valores | Usar `complete/needs_retry/needs_human/blocked`. Domain enum vai em `payload.domain_status` |
| `REASONING_TOO_SHORT` | Error | `reasoning` <20 chars ou ausente | Escrever 1-3 frases focadas em "o que vi fora do schema" |
| `REASONING_LIKELY_WEAK` | Warning | `reasoning` 20-49 chars | Nao bloqueia, mas indica prompt subotimo — ajustar prompt do agente |
| `INVALID_KIND` | Error | `kind` fora dos 4 valores | Usar audit/mutation/proposal/verification |
| `PAYLOAD_SCHEMA_MISMATCH` | Error | Shape de `payload` nao casa com `kind` | Ver secao 5 (exemplo do kind correspondente) |
| `SECRET_PATTERN_DETECTED` | Error | `API_KEY=`, `SECRET=`, `PASSWORD=` no payload/reasoning | Remover secrets crus; usar referencias ou redacted |
| `INVALID_JSON` | Error | `JSON.parse` falhou | Validator retry mecanico 1x com prompt ajustado |
```

---

## Gotchas

- **G7 do plano (migration guide <30min):** Se o passo 3 (reescrever Formato de Saida) demorar mais de 10min, o guide falhou. Fornecer **diff antes/depois ja pronto** para copy-paste, nao so descricao.
- **G2 do plano (lifecycle vs domain_status):** Exemplo contrastante na secao 4 e o que vai grudar. Nao soltar so a explicacao — colocar JSON corretA e errado lado a lado.
- **Local:** Os 4 exemplos da secao 5 precisam **validar contra o schema da fase-03** quando ele existir. Se fase-03 mudar shape, voltar e atualizar os exemplos.
- **Local:** Evitar emojis e mesmo formatacao excessiva — alinhar com tom do ADR-0001 e do CLAUDE.md (sem caixas Unicode).

---

## Verificacao

### TDD

Nao aplicavel — documento. "Teste" e revisao estrutural + validacao dos exemplos contra o schema (que so existe apos fase-03 — voltar e revalidar).

### Checklist

- [ ] Arquivo `docs/design-docs/subagent-contract-v1.md` criado
- [ ] Secao 2 (Shape) tem **todos os campos obrigatorios + metadata** do PRD §Solucao
- [ ] Secao 4 (lifecycle vs domain_status) tem **exemplo contrastante CORRETO vs ERRADO** lado a lado
- [ ] Secao 5 tem **1 exemplo completo para cada um dos 4 kinds** (audit, verification, proposal, mutation)
- [ ] Cada exemplo tem `reasoning` >=50 chars (modela uso bom)
- [ ] Migration guide tem **6 passos numerados** com **sizing em minutos** somando <30min
- [ ] Migration guide passo 3 inclui **diff antes/depois** para copy-paste, nao so descricao
- [ ] Secao 7 (Erros) lista **todos os 9 codigos** com como corrigir
- [ ] Apos fase-03 existir: os 4 exemplos da secao 5 validam contra `agents/_contract/v1.schema.json` (rodar manualmente: `bun -e "..."` ou ajv-cli)

---

## Criterio de Aceite

**Por maquina:**
- `test -f docs/design-docs/subagent-contract-v1.md` retorna 0
- `grep -c "^### 5\." docs/design-docs/subagent-contract-v1.md` retorna 4 (4 exemplos de kind)
- `grep -c "^### Passo [1-6]" docs/design-docs/subagent-contract-v1.md` retorna 6 (6 passos do migration guide)

**Por humano:**
- Autor novo de subagente le **so a secao 6 (migration guide)** e consegue portar agente em <30min sem ler outras secoes
- Revisor consegue distinguir "lifecycle" de "domain_status" apos ler **so a secao 4**

---

<!-- Gerado por /plan-feature subagente em 2026-05-14 -->

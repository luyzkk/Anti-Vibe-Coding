<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): fixture lesson-evaluator usa licao real do compound — input nao e sintetico`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: 10 fixtures novas + `bun test agents:contract` verde nos 13

**Plano:** 03 — Migracao em Escala
**Sizing:** 1h
**Depende de:** fase-01, fase-02, fase-03, fase-04 deste plano (todos os 10 prompts migrados)
**Visual:** false

---

## O que esta fase entrega

10 fixtures de regressao em `agents/__fixtures__/{nome}/{input.json,expected-output.json}`, uma por agente migrado nas fases 01-04 deste plano. Somadas as 3 fixtures pilotos do Plano 02 (security, plan-verifier, design-explorer), totalizam **13 fixtures = cobertura completa do CA-07**. `bun test agents:contract` passa nos 13. Esta fase NAO edita `agents/*.md` — apenas cria pares de fixture e roda o suite de teste.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/__fixtures__/react-auditor/input.json` | Create | Cenario sintetico para react-auditor (codigo de exemplo com useEffect anti-pattern) |
| `agents/__fixtures__/react-auditor/expected-output.json` | Create | Output esperado conforme contrato v1 (kind audit, payload.issues[]) |
| `agents/__fixtures__/solid-auditor/{input,expected-output}.json` | Create | Idem; cenario SRP/DI violation |
| `agents/__fixtures__/code-smell-detector/{input,expected-output}.json` | Create | Idem; cenario Long Method ou Feature Envy |
| `agents/__fixtures__/tdd-verifier/{input,expected-output}.json` | Create | Idem; cenario `PARTIALLY_COMPLIANT` (cobertura parcial) — mapeia para `domain_status: issues_found` |
| `agents/__fixtures__/api-auditor/{input,expected-output}.json` | Create | Idem; cenario idempotencia ausente em POST |
| `agents/__fixtures__/database-analyzer/{input,expected-output}.json` | Create | Idem; cenario indice multi-coluna na ordem errada |
| `agents/__fixtures__/infrastructure-auditor/{input,expected-output}.json` | Create | Idem; cenario sem pod anti-affinity / sem health check |
| `agents/__fixtures__/lesson-evaluator/{input,expected-output}.json` | Create | Cenario `clean` — licao com evidencia + prescricao |
| `agents/__fixtures__/plan-executor/{input,expected-output}.json` | Create | Cenario `partial` — 4 de 5 tasks rodaram; kind verification |
| `agents/__fixtures__/documentation-writer/{input,expected-output}.json` | Create | Cenario `complete` com `payload.mutation` STUB (qualquer shape) |

Total: 10 pares = 20 arquivos novos.

---

## Implementacao

### Passo 1: Reler 3 fixtures pilotos do Plano 02 (template visual)

Antes de criar 10 fixtures novas, **ler** `agents/__fixtures__/security-auditor/`, `agents/__fixtures__/plan-verifier/`, `agents/__fixtures__/design-explorer/` (as 3 pilotos). Confirmar:
- nome dos arquivos (`input.json` + `expected-output.json` — ou variacao do Plano 01/02)
- formato do `input.json` (campos esperados — provavelmente algo como `{ "prompt_input": "...", "context_files": [...] }`)
- formato do `expected-output.json` (envelope v1 completo)
- shape e linguagem do `reasoning` (>50 chars, dominio especifico)

As 10 fixtures novas seguem **exatamente** o mesmo padrao — variando dominio.

### Passo 2: Criar fixtures audit-only (7 agentes das fases 01 e 02)

Para cada um dos 7 audit-only (`react-auditor`, `solid-auditor`, `code-smell-detector`, `tdd-verifier`, `api-auditor`, `database-analyzer`, `infrastructure-auditor`):

**input.json** — cenario realista do dominio:

```json
{
  "files": [
    {
      "path": "<arquivo de exemplo>",
      "content": "<snippet com problema do dominio — ex: react useEffect anti-pattern>"
    }
  ],
  "scope": "<descricao do que o agente deve auditar>"
}
```

**expected-output.json** — envelope v1 conforme contrato:

```json
{
  "contract_version": "1.0",
  "agent": "<react-auditor|...|infrastructure-auditor>",
  "kind": "audit",
  "status": "complete",
  "reasoning": "<>50 chars com vocabulario do dominio especifico>",
  "payload": {
    "domain_status": "<clean|issues_found|critical>",
    "issues": [
      {
        "severity": "<warning|error|critical>",
        "location": "<endpoint|arquivo:linha|recurso>",
        "description": "<descricao especifica>"
      }
    ]
  },
  "metadata": { "run_id": "<uuid-fixo-do-test>", "duration_ms": 0, "model": "test" }
}
```

**Variacoes a cobrir entre os 7** (nao todos identicos):
- 2 fixtures com `domain_status: "clean"` (issues vazio ou warning info)
- 4 fixtures com `domain_status: "issues_found"` (1-3 issues warning/error)
- 1 fixture com `domain_status: "critical"` (1 issue critical) — recomendado `database-analyzer` com indice errado afetando query frequente

Sugestao de distribuicao por agente:
- react-auditor → `issues_found` (useEffect anti-pattern)
- solid-auditor → `issues_found` (SRP violado)
- code-smell-detector → `clean` (codigo limpo, info-only)
- tdd-verifier → `issues_found` (cobertura parcial, mocks excessivos)
- api-auditor → `issues_found` (idempotencia ausente)
- database-analyzer → `critical` (indice errado em query frequente)
- infrastructure-auditor → `clean` (config ok, info sobre observabilidade)

### Passo 3: Criar fixture `lesson-evaluator` (kind audit, vocabulario novo)

**input.json**:
```json
{
  "lesson_path": "docs/compound/2026-05-14-reasoning-forca-observacao-meta.md",
  "lesson_content": "<conteudo da licao avaliada>",
  "related_lessons": [
    "docs/compound/2026-04-12-formatacao-prompts.md"
  ]
}
```

**expected-output.json**:
```json
{
  "contract_version": "1.0",
  "agent": "lesson-evaluator",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Licao tem evidencia concreta (3 ocorrencias documentadas no Plano 02 fase-01) e prescricao acionavel (manter reasoning obrigatorio). Nao redundante com lesson-2026-04-12 que so cobre formatacao. Vale capturar como compound durarvel.",
  "payload": {
    "domain_status": "clean",
    "issues": []
  },
  "metadata": { "run_id": "test-lesson-001", "duration_ms": 0, "model": "test" }
}
```

### Passo 4: Criar fixture `plan-executor` (kind verification, cenario partial)

**input.json**:
```json
{
  "plan_phase": "docs/exec-plans/active/2026-05-14-v6.1.0-subagent-contract/plano03/fase-01-batch-audit-1.md",
  "executed_tasks": [
    { "id": "edit-react-auditor", "status": "done" },
    { "id": "edit-solid-auditor", "status": "done" },
    { "id": "edit-code-smell-detector", "status": "done" },
    { "id": "edit-tdd-verifier", "status": "done" },
    { "id": "lint-diff", "status": "skipped", "reason": "linter de markdown nao configurado no projeto" }
  ]
}
```

**expected-output.json**:
```json
{
  "contract_version": "1.0",
  "agent": "plan-executor",
  "kind": "verification",
  "status": "complete",
  "reasoning": "4 das 5 tasks rodaram. Task lint-diff pulada porque o projeto nao tem markdownlint configurado — nao bloqueia merge, mas vale registrar para Plano 05 considerar adicionar.",
  "payload": {
    "domain_status": "partial",
    "tasks_completed": [
      { "id": "edit-react-auditor", "summary": "envelope v1 aplicado ao prompt" },
      { "id": "edit-solid-auditor", "summary": "envelope v1 aplicado ao prompt" },
      { "id": "edit-code-smell-detector", "summary": "envelope v1 aplicado ao prompt" },
      { "id": "edit-tdd-verifier", "summary": "envelope v1 aplicado ao prompt" }
    ],
    "tasks_skipped": [
      { "id": "lint-diff", "summary": "verificacao de markdown lint", "reason": "linter nao configurado" }
    ]
  },
  "metadata": { "run_id": "test-executor-001", "duration_ms": 0, "model": "test" }
}
```

### Passo 5: Criar fixture `documentation-writer` (kind mutation, stub)

**input.json**:
```json
{
  "target_doc": "docs/PIPELINE.md",
  "instruction": "Adicionar step 'iterate' apos 'verify-work' no diagrama do pipeline"
}
```

**expected-output.json**:
```json
{
  "contract_version": "1.0",
  "agent": "documentation-writer",
  "kind": "mutation",
  "status": "complete",
  "reasoning": "Adicionei step 'iterate' apos 'verify-work' em PIPELINE.md (diagrama + tabela). Tambem notei que MODEL_PROFILES.md menciona 'balanced' como default mas SKILL.md ja usa 'quality' — inconsistencia fora do escopo desta operacao mas vale alinhar.",
  "payload": {
    "mutation": "step 'iterate' added after 'verify-work' in docs/PIPELINE.md (diagram + table)"
  },
  "metadata": { "run_id": "test-writer-001", "duration_ms": 0, "model": "test" }
}
```

Nota: `payload.mutation` aqui e string descritiva — qualquer shape e aceito em v6.1.0 (STUB explicito da fase-04).

### Passo 6: Rodar `bun test agents:contract`

Comando do suite de teste (mesmo do Plano 01 fase-05 / Plano 02 fase-03):

```bash
bun test agents:contract
```

Resultado esperado: **13 passed, 0 failed**. Os 3 do Plano 02 ja estavam verdes; os 10 novos passam apos commit dos pares input/expected.

Se algum falhar, ler mensagem de erro:
- `INVALID_LIFECYCLE_STATUS` → expected-output.json tem `status` errado (provavel: copiei enum dominio do prompt).
- `MISSING_REASONING` / `REASONING_TOO_SHORT` → expected-output.json tem `reasoning` < 20 chars.
- `REASONING_LIKELY_WEAK` (warning) → expected-output.json tem `reasoning` 20-49 chars. Warning nao falha o teste mas e sinal de fixture mal escrita — fixar.
- Schema oneOf miss → `kind` nao bate com shape do `payload` (ex: `kind: audit` mas faltou `payload.issues[]`).

### Passo 7: Verificar warnings

Mesmo com 13 passed, verificar se algum emitiu warning (`REASONING_LIKELY_WEAK`). Se sim, refinar `reasoning` da fixture para >50 chars com observacao concreta — fixtures servem como contrato de regressao E como **exemplo bom** para autores futuros. Reasoning fraco em fixture vira reasoning fraco em prompt copiado.

---

## Gotchas

- **G1 (LLM JSON malformado):** Nao se aplica aqui — fixtures sao JSON estaticos commitados, nao output de LLM. Mas: ao escrever expected-output.json, NAO incluir code fences ```` ```json ```` (parser do test pode rejeitar).
- **G3 (reasoning 20/50):** Todas as 10 fixtures devem ter reasoning >50 chars com observacao do dominio. Risco: copy-paste reasoning generico em 10 fixtures = warning em massa.
- **G5 (contract_version "1.0"):** Literal nos 10 expected-output.json.
- **G6 (schema oneOf por kind):** Critico aqui. Fixture `lesson-evaluator` precisa `payload.issues[]` (kind audit); `plan-executor` precisa `payload.tasks_completed[]/tasks_skipped[]` (kind verification); `documentation-writer` precisa `payload.mutation` (kind mutation). Trocar = teste falha com schema mismatch.
- **G8 (Comment Provenance):** Nao se aplica em JSON (sem comentarios). Aplica-se em mensagens de commit se separar — uma mensagem por fixture e overkill; agrupar como "feat(agents): 10 contract fixtures (fase-05 Plano 03)".
- **G-P02-01 (Mapping nao mecanico):** Fixture `tdd-verifier` deve usar `domain_status: "issues_found"` (nao `critical`) para `PARTIALLY_COMPLIANT` — refletindo a decisao da fase-01 deste plano.
- **G-P02-05 (destilar nao concatenar):** Reasoning das 10 fixtures deve ser **distinto** entre auditores — vocabulario do dominio. Fixture com reasoning generico = exemplo ruim no projeto.
- **Local (fixture vs prompt drift):** Se algum prompt das fases 01-04 emitir output que NAO bate com a expected-output.json correspondente, e bug. Suite de teste detecta. Anotar em MEMORY.md como BUG-N e fixar prompt (nao a expected-output — o contrato e mestre).
- **Local (run_id determinismo):** Fixtures usam `run_id` fixo (`test-{agente}-001`) para idempotencia do test. NUNCA usar uuid gerado em fixture commitada.

---

## Verificacao

### TDD

- [ ] **RED:** Antes de criar as 10 fixtures, rodar `bun test agents:contract`. Esperar: 3 passed (do Plano 02), 10 failed/missing (fixtures inexistentes). Comando confirma estado base.

- [ ] **GREEN:** Apos criar os 20 arquivos (10 pares), rodar `bun test agents:contract`. Esperar: **13 passed, 0 failed**, 0 warnings (ou plano para corrigir warnings antes do commit).

### Checklist

- [ ] 3 fixtures pilotos do Plano 02 lidas antes de criar as novas (template visual)
- [ ] 10 pares (input.json + expected-output.json) criados em `agents/__fixtures__/{agente}/`
- [ ] Distribuicao de `domain_status` cobre `clean` / `issues_found` / `critical` (nao todos `issues_found`)
- [ ] Fixture `plan-executor` usa `kind: "verification"` com `tasks_completed[]` + `tasks_skipped[]`
- [ ] Fixture `documentation-writer` usa `kind: "mutation"` com `payload.mutation` em shape livre
- [ ] Fixture `lesson-evaluator` usa vocabulario novo (`clean = commit`, `issues_found = revisar`, `critical = rejeitar`)
- [ ] Reasoning de cada fixture e **distinto** (vocabulario do dominio), todos >50 chars
- [ ] Nenhuma fixture usa `uuid` gerado dinamicamente em `run_id` — todos fixos (`test-{agente}-001`)
- [ ] `bun test agents:contract` retorna **13 passed, 0 failed, 0 warnings**
- [ ] Anotacao em `MEMORY.md` se algum prompt das fases 01-04 desviou do esperado (BUG-N)
- [ ] `bun run lint` limpo (se aplicavel a JSON)

---

## Criterio de Aceite

**Por maquina:**
- `bun test agents:contract` retorna exatamente: **13 passed, 0 failed**.
- Nenhum warning `REASONING_LIKELY_WEAK` em nenhuma das 13 fixtures (se houver, corrigir antes de fechar).
- Schema validation passa para todos os `kind` (3 audit + 1 verification + 1 mutation, somadas as 3 pilotos).

**Por humano:**
- Revisor lendo os 10 expected-output.json em sequencia detecta vocabulario do dominio especifico em cada reasoning. Se 2+ fixtures tem reasoning identico ou trivialmente similar, copy-paste laziness — reprova.
- Revisor consegue, em <5min, usar uma das 10 fixtures como template para adicionar uma 14a (extensibilidade — CA-06 do PRD).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

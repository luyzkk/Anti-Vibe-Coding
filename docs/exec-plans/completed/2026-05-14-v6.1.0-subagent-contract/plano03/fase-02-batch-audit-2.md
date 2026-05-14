<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): CRITICAL_PERFORMANCE → domain_status:critical — consumidor decide se aborta`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Batch Audit 2 — api, database, infrastructure

**Plano:** 03 — Migracao em Escala
**Sizing:** 1h
**Depende de:** Plano 02 fase-04 (migration guide v2 destilado) — independente da fase-01 deste plano (pode rodar em paralelo)
**Visual:** false

---

## O que esta fase entrega

3 auditores read-only emitindo contrato v1 — `api-auditor`, `database-analyzer`, `infrastructure-auditor`. Mesmo padrao da fase-01 (`kind: audit`, `payload.issues[]` com shape do security-auditor, `payload.domain_status` 3-tier). Execucao via 3 subagentes paralelos editando 3 arquivos `agents/*.md` distintos. Sizing menor que fase-01 porque tres auditores tem enum dominio com mesmo shape (`COMPLIANT/ISSUES_FOUND/CRITICAL`) — mapping mecanico.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/api-auditor.md` | Modify | Substituir secao de output por envelope v1; injetar blocos Status Mapping (vocabulario `COMPLIANT/ISSUES_FOUND/CRITICAL`), Reasoning guideline (dominio API), Output template |
| `agents/database-analyzer.md` | Modify | Idem; vocabulario `OPTIMIZED/ISSUES_FOUND/CRITICAL_PERFORMANCE` |
| `agents/infrastructure-auditor.md` | Modify | Idem; vocabulario `COMPLIANT/ISSUES_FOUND/CRITICAL` |

Nenhum codigo TS de runtime e tocado. Fixtures vem na fase-05.

---

## Implementacao

### Passo 1: Reler estado atual dos 3 prompts (CLAUDE.md §Integridade)

Antes de editar, **releia cada arquivo completo**. INVENTORY afirma:

- `api-auditor`: markdown, status `COMPLIANT/ISSUES_FOUND/CRITICAL`.
- `database-analyzer`: markdown, status `OPTIMIZED/ISSUES_FOUND/CRITICAL_PERFORMANCE`.
- `infrastructure-auditor`: markdown, status `COMPLIANT/ISSUES_FOUND/CRITICAL`.

Confirmar antes de assumir — INVENTORY pode estar defasado.

### Passo 2: Definir envelope v1 alvo (identico ao da fase-01, com `agent` e `payload.issues[]` adaptados)

```json
{
  "contract_version": "1.0",
  "agent": "<api-auditor|database-analyzer|infrastructure-auditor>",
  "kind": "audit",
  "status": "complete",
  "reasoning": "<prosa livre >50 chars com observacao do dominio>",
  "payload": {
    "domain_status": "<clean|issues_found|critical>",
    "issues": [
      {
        "severity": "<info|warning|error|critical>",
        "location": "<endpoint, tabela, hostname, ou arquivo:linha>",
        "description": "<descricao no dominio do auditor>"
      }
    ]
  },
  "human_readable": "<markdown opcional>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```

Observacoes especificas:
- `payload.issues[].location` aceita formato variavel por auditor — api usa endpoint (`POST /users`), database usa tabela.coluna (`users.email`), infra usa hostname/recurso (`prod-vm-01`). Schema do Plano 01 fase-03 trata como string livre — sem validacao estrutural.
- `human_readable` faz mais sentido aqui (especialmente database — tabela de queries lentas com EXPLAIN ANALYZE) — preservar se o prompt antigo ja produzia markdown valioso.

### Passo 3: Bloco "Status Mapping" a injetar em CADA prompt

**Para api-auditor (tabela base):**

```markdown
## Status Mapping (obrigatorio — NAO usar enum de dominio no campo top-level `status`)

| Resultado de dominio (antigo) | `status` (top-level) | `payload.domain_status` |
|-------------------------------|----------------------|-------------------------|
| `COMPLIANT`                   | `complete`           | `clean`                 |
| `ISSUES_FOUND`                | `complete`           | `issues_found`          |
| `CRITICAL`                    | `complete`           | `critical`              |
| Arquivo nao parseou / timeout | `needs_retry`        | (omitir)                |
| Arquivo nao existe / permissao| `blocked`            | (omitir)                |

`status` diz ao orquestrador o que fazer agora. `payload.domain_status` diz o que voce achou.
NUNCA emita `status: "COMPLIANT"` etc — o validador rejeita com `INVALID_LIFECYCLE_STATUS`.
`critical` no domain_status NAO mapeia para `blocked` — consumidor decide se aborta.
```

**Para database-analyzer:** substituir 3 primeiras linhas por:
| `OPTIMIZED` | `complete` | `clean` |
| `ISSUES_FOUND` | `complete` | `issues_found` |
| `CRITICAL_PERFORMANCE` | `complete` | `critical` |

**Para infrastructure-auditor:** mesmo da api-auditor (3 valores `COMPLIANT/ISSUES_FOUND/CRITICAL` identicos).

### Passo 4: Bloco "Reasoning guideline" a injetar — adaptado por dominio

Estrutura identica a fase-01. Exemplos bons (>50 chars) por dominio:

```markdown
## Reasoning (obrigatorio — minimo 20 chars, ideal >50)

Use `reasoning` para sinalizar o que voce viu **fora do schema esperado**:
- padroes que `issues[]` nao captura porque sao meta (ex: api: "todos os endpoints POST sao idempotentes exceto /payments — anti-pattern conhecido mas issue lista so o endpoint, nao a politica")
- conflitos com outros aspectos (ex: database: "indice cobre query A mas multi-coluna esta na ordem errada para query B mais frequente")
- observacoes que ajudam o consumidor a decidir politica (ex: infra: "VM em prod nao tem health check mas o load balancer assume readiness — quebra em deploy")

NAO use `reasoning` para repetir `issues[].description`, listar passos ou criticar em abstrato.

Ruim (<50, generico):
> "Auditoria rodada, 3 issues encontradas."

Bom (>50, info nova no dominio):
> [api] "POST /orders sem rate limit + DB sem unique constraint em order_id — bug em retry vai criar duplicatas. Issue lista os dois mas a interacao e o risco real."
> [database] "Tabela orders cresce 200k/dia. Indice em (status, created_at) cobre o admin dashboard mas o cron de cleanup faz full scan pq usa apenas created_at. Vale indice parcial."
> [infra] "Cluster k8s tem 3 nodes mas pod anti-affinity nao configurado — todos os replicas do api-gateway estao no mesmo node. Falha de node = downtime total."
```

### Passo 5: Bloco "Output template" — identico a fase-01, com `agent` literal

```markdown
## Output (obrigatorio JSON — sem code fences ao redor)

Emita exatamente um objeto JSON valido. Nao envolva em ```json ... ```. Nao adicione texto antes ou depois.

```
{
  "contract_version": "1.0",
  "agent": "<api-auditor|database-analyzer|infrastructure-auditor>",
  "kind": "audit",
  "status": "<complete|needs_retry|blocked>",
  "reasoning": "<prosa livre, min 20 chars>",
  "payload": {
    "domain_status": "<clean|issues_found|critical>",
    "issues": [
      { "severity": "<info|warning|error|critical>", "location": "<endpoint|tabela|host|arquivo:linha>", "description": "<descricao>" }
    ]
  },
  "human_readable": "<markdown opcional>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```
```

### Passo 6: Re-ler os 3 arquivos apos as edicoes

Confirmar em cada:
- secao antiga de output (markdown table com enum dominio) substituida
- 4 blocos novos na ordem correta
- referencia ao enum antigo so na coluna "antigo" da tabela
- `agent:` literal bate com nome do arquivo

### Passo 7: Execucao em paralelo (3 subagentes)

Idem fase-01: 3 subagentes, 3 arquivos distintos, sem ordem entre eles. Fase-02 inteira pode rodar em paralelo com fase-01 (6 subagentes simultaneos no total no `/execute-plan`).

---

## Gotchas

- **G1 (LLM JSON malformado):** Mesmo padrao. Instruir "sem code fences" no template.
- **G2 (lifecycle vs dominio):** Critico — 3 vocabularios diferentes (`COMPLIANT`, `OPTIMIZED`, `CRITICAL_PERFORMANCE` etc). Tabela do passo 3 e a defesa. api-auditor e infra-auditor compartilham `COMPLIANT/ISSUES_FOUND/CRITICAL` — alta tentacao de copy-paste laziness; verificar que `agent:` literal e o nome correto em cada Output template.
- **G3 (reasoning 20/50):** Passo 4 da 3 exemplos bons distintos. Reasoning vazio ou generico falha threshold ou pega warning.
- **G5 (contract_version "1.0"):** Literal fixo nos 3 prompts.
- **G8 (Comment Provenance):** Quando snippet contiver decisao especifica (ex: por que `CRITICAL_PERFORMANCE` mapeia para `critical` e nao para `needs_retry`), inline comment com linhagem.
- **G-P02-01 (Mapping nao mecanico):** `CRITICAL_PERFORMANCE` do database e dominio — consumidor (ex: verify-work) decide se aborta build/deploy. Plano nao mapeia mecanicamente para `blocked`.
- **G-P02-05 (destilar nao concatenar):** Os 3 exemplos de reasoning do passo 4 devem refletir dominio especifico (api fala de idempotencia/rate limit; database fala de indice/EXPLAIN; infra fala de health check/affinity). Reasoning copy-pasted em 2+ prompts = revisor reprova.
- **Local (api e infra com enum identico, risco de prompt clone):** api-auditor e infrastructure-auditor tem mesmo enum (`COMPLIANT/ISSUES_FOUND/CRITICAL`) — risco de subagente paralelo gerar 2 prompts identicos exceto pelo `agent:`. Revisor deve checar que `reasoning` exemplo, `human_readable`, e `payload.issues[].location` refletem dominios diferentes (api fala endpoint, infra fala recurso).

---

## Verificacao

### TDD (simulacao — fixtures concretas vem na fase-05)

- [ ] **RED (por agente):** Antes da edicao, output do prompt atual contra `parseAndDispatch` retorna 3+ erros (`INVALID_LIFECYCLE_STATUS`, `MISSING_REASONING`, `MISSING_CONTRACT_VERSION`).
  - Comando (mental, por agente): rodar output antigo string contra `parseAndDispatch`.

- [ ] **GREEN (por agente):** Output exemplo apos edicao retorna `{ ok: true, kind: "audit" }`, sem warnings.
  - Comando: `bun run --eval "import { parseAndDispatch } from './skills/lib/subagent-contract'; console.log(parseAndDispatch(JSON.stringify(<output>)))"`

### Checklist

- [ ] 3 arquivos `agents/{api,database,infrastructure}-{auditor,analyzer}.md` (note: `api-auditor.md`, `database-analyzer.md`, `infrastructure-auditor.md`) lidos completos antes da edicao
- [ ] 4 blocos novos presentes em cada
- [ ] Tabela de mapping cobre 5 casos por prompt
- [ ] Exemplos de reasoning **distintos** entre api/database/infra (api fala idempotencia, database fala indice, infra fala health check)
- [ ] Nenhuma referencia residual ao enum antigo fora da coluna "antigo"
- [ ] `agent:` literal em cada Output template bate com nome do arquivo
- [ ] 3 arquivos re-lidos apos edicao
- [ ] Anotacao em `MEMORY.md` se descobriu armadilha (ex: database-analyzer ja tinha bloco JSON?)
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun run --eval` com output exemplo de cada um dos 3 agentes retorna `{ ok: true, kind: "audit" }` sem erros e sem warnings.

**Por humano:**
- Revisor lendo os 3 prompts detecta que api/database/infra tem reasoning exemplo com vocabulario distinto. Se 2+ tem reasoning identico (especialmente api vs infra que compartilham enum), copy-paste laziness — reprova.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

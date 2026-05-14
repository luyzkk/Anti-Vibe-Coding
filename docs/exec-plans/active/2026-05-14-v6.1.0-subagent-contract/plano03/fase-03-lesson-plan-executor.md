<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): partial → status:complete + domain_status:partial — lifecycle ja era parcialmente OK`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: lesson-evaluator (audit) + plan-executor (verification, lifecycle normalizado)

**Plano:** 03 — Migracao em Escala
**Sizing:** 1.5h
**Depende de:** Plano 02 fase-04 (migration guide) — independente da fase-04 deste plano
**Visual:** false

---

## O que esta fase entrega

Dois auditores migrados com perfis distintos:
- `lesson-evaluator` — kind `audit`, padrao identico aos das fases 01-02 mas com dominio "qualidade de licoes/compound notes". Sem enum dominio claro no estado atual (INVENTORY: "markdown sem Status field claro") — esta fase **define** o vocabulario `clean/issues_found/critical` para qualidade de licao.
- `plan-executor` — kind `verification` (NAO audit). Lifecycle ja era parcialmente OK (`done | partial | blocked` — INVENTORY linha plan-executor), mas precisa normalizar nomes para o lifecycle v1 (`complete | needs_retry | blocked`) e separar `done | partial` em `status: complete` + `payload.domain_status`. `reasoning` passa a ser obrigatorio (antes era disperso no campo "Blockers").

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/lesson-evaluator.md` | Modify | Substituir secao de output por envelope v1 `kind: audit`; injetar blocos Status Mapping (com vocabulario novo para qualidade de licao), Reasoning guideline, Output template; preservar campos especificos do dominio em `payload.issues[]` se aplicavel |
| `agents/plan-executor.md` | Modify | Substituir secao de output por envelope v1 `kind: verification`; normalizar lifecycle `done/partial/blocked` → `status: complete/blocked` + `payload.domain_status: done/partial`; estruturar `payload.tasks_completed[]` e `payload.tasks_skipped[]`; tornar `reasoning` obrigatorio |

---

## Implementacao

### Passo 1: Reler estado atual dos 2 prompts (CLAUDE.md §Integridade)

INVENTORY afirma:

- `lesson-evaluator`: markdown sem Status field claro, sem reasoning, dominio = avaliar qualidade de compound notes (sao licoes durarveis? sao redundantes com lessons existentes?).
- `plan-executor`: markdown estruturado, status `done | partial | blocked` (lifecycle parcialmente OK), reasoning disperso em "Blockers".

Confirmar com leitura. Para plan-executor especialmente: identificar **quais campos do markdown atual** se mapeiam para `tasks_completed[]` e `tasks_skipped[]` no payload novo.

### Passo 2: Definir envelope v1 alvo — `lesson-evaluator` (kind audit)

```json
{
  "contract_version": "1.0",
  "agent": "lesson-evaluator",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Licao 'reasoning forcou auditores a notar coisas fora do schema' tem evidencia concreta (3 ocorrencias no Plano 02) e prescricao acionavel. Nao redundante com lesson-2026-04-12 que cobre apenas formatacao. Vale capturar.",
  "payload": {
    "domain_status": "<clean|issues_found|critical>",
    "issues": [
      {
        "severity": "<info|warning|error|critical>",
        "location": "<arquivo da licao avaliada>",
        "description": "<problema na licao — ex: 'sem evidencia concreta', 'redundante com licao X', 'sem prescricao acionavel'>"
      }
    ]
  },
  "human_readable": "<markdown opcional — recomendacao para o autor>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```

Convencao especifica de dominio:
- `clean` = licao tem evidencia + prescricao + nao e redundante; pode ser commitada.
- `issues_found` = problemas corrigiveis (ex: falta exemplo concreto, prescricao vaga).
- `critical` = licao deveria ser rejeitada (ex: redundante com 2+ licoes ja capturadas, ou trivial — anti-padrao do quality filter).

### Passo 3: Definir envelope v1 alvo — `plan-executor` (kind verification, lifecycle normalizado)

```json
{
  "contract_version": "1.0",
  "agent": "plan-executor",
  "kind": "verification",
  "status": "complete",
  "reasoning": "Executei 4 das 5 tasks da fase-02. Task 'criar fixture design-explorer' nao rodou porque depende de schema atualizado no Plano 01 fase-03 — sinalizado como bloqueio em payload.tasks_skipped, mas nao e blocked do orquestrador (e info para o consumer decidir aguardar ou seguir).",
  "payload": {
    "domain_status": "<done|partial>",
    "tasks_completed": [
      { "id": "<task_id>", "summary": "<o que foi feito>" }
    ],
    "tasks_skipped": [
      { "id": "<task_id>", "summary": "<o que foi pulado>", "reason": "<motivo>" }
    ]
  },
  "human_readable": "<markdown opcional — resumo legivel>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```

Decisoes embutidas:
- `done` → `status: "complete"`, `payload.domain_status: "done"`, `tasks_skipped: []`.
- `partial` → `status: "complete"`, `payload.domain_status: "partial"` (algo nao rodou mas nao e bloqueio do orquestrador — consumer decide se aguarda ou avanca).
- `blocked` (irrecuperavel, ex: arquivo referenciado nao existe, dependencia externa down) → `status: "blocked"` (e lifecycle, sobe pra humano).
- `needs_retry` so se o LLM falhou em emitir JSON valido (capturado pelo retry mecanico do parser, nao por escolha do agente).

### Passo 4: Bloco "Status Mapping" — `lesson-evaluator`

```markdown
## Status Mapping (obrigatorio — NAO usar enum de dominio no campo top-level `status`)

| Resultado de dominio                                  | `status` (top-level) | `payload.domain_status` |
|-------------------------------------------------------|----------------------|-------------------------|
| Licao limpa, evidencia + prescricao + nao-redundante  | `complete`           | `clean`                 |
| Licao com problemas corrigiveis                       | `complete`           | `issues_found`          |
| Licao deveria ser rejeitada (redundante/trivial)      | `complete`           | `critical`              |
| Arquivo da licao nao parseou / timeout                | `needs_retry`        | (omitir)                |
| Arquivo da licao nao existe / permissao               | `blocked`            | (omitir)                |

`critical` aqui significa "rejeite, nao commite" — consumidor (lessons-learned skill) decide se mostra ao usuario ou descarta direto.
```

### Passo 5: Bloco "Status Mapping" — `plan-executor`

```markdown
## Status Mapping (obrigatorio — normalize o lifecycle antigo `done/partial/blocked` para v1)

| Resultado de execucao                                 | `status` (top-level) | `payload.domain_status` |
|-------------------------------------------------------|----------------------|-------------------------|
| Todas as tasks da fase rodaram com sucesso (done)     | `complete`           | `done`                  |
| Algumas tasks rodaram, outras puladas (partial)       | `complete`           | `partial`               |
| Erro irrecuperavel — arquivo nao existe, dependencia  | `blocked`            | (omitir)                |
| externa down, plano referencia recurso inexistente    |                      |                         |

NUNCA emita `status: "done"`, `status: "partial"` — o validador rejeita com `INVALID_LIFECYCLE_STATUS`.
`partial` no domain_status NAO mapeia para `blocked` no lifecycle — consumidor decide.
`needs_retry` so se LLM falhar em emitir JSON valido (retry e mecanico, capturado pelo parser).
```

### Passo 6: Bloco "Reasoning guideline" — adaptado para cada agente

```markdown
## Reasoning (obrigatorio — minimo 20 chars, ideal >50)

[lesson-evaluator]
Use `reasoning` para meta-observacoes que `issues[]` nao captura: "essa licao se sobrepoe com a 2026-04-12 mas adiciona um angulo novo — sugiro merge ao inves de capturar separada".

[plan-executor]
Use `reasoning` para sinalizar o que voce viu ao executar que pode mudar o plano: "task 3 rodou mas o test que ela criou falha intermitentemente — sugiro investigar antes de prosseguir pra fase-04". NAO repita o que ja esta em `tasks_completed[]`/`tasks_skipped[]`.

Ruim (<50, generico):
> [lesson-evaluator] "Licao boa."
> [plan-executor] "Tasks executadas."

Bom (>50, info nova):
> [lesson-evaluator] "Licao tem evidencia concreta (3 ocorrencias documentadas) e prescricao acionavel. Nao redundante com lesson-2026-04-12 que so cobre formatacao. Vale capturar como compound durarvel."
> [plan-executor] "4 de 5 tasks rodaram. Task 5 (fixture design-explorer) pulada porque schema do Plano 01 nao foi commitado — nao e blocker do orquestrador, mas consumer talvez queira aguardar antes de fase-04."
```

### Passo 7: Bloco "Output template" — por agente, com `agent:` literal

**Para lesson-evaluator** (mesmo template das fases 01-02, com `agent: "lesson-evaluator"` e `kind: "audit"`).

**Para plan-executor** (template novo — kind verification):

```markdown
## Output (obrigatorio JSON — sem code fences ao redor)

Emita exatamente um objeto JSON valido. Nao envolva em ```json ... ```. Nao adicione texto antes ou depois.

```
{
  "contract_version": "1.0",
  "agent": "plan-executor",
  "kind": "verification",
  "status": "<complete|needs_retry|blocked>",
  "reasoning": "<prosa livre, min 20 chars>",
  "payload": {
    "domain_status": "<done|partial>",
    "tasks_completed": [
      { "id": "<task_id>", "summary": "<o que foi feito>" }
    ],
    "tasks_skipped": [
      { "id": "<task_id>", "summary": "<o que foi pulado>", "reason": "<motivo>" }
    ]
  },
  "human_readable": "<markdown opcional>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```

Notas especificas:
- Se TUDO rodou com sucesso, `tasks_skipped` deve ser `[]` (array vazio), nao omitido.
- Se nada rodou (blocker irrecuperavel logo na primeira task), use `status: "blocked"` e omita `payload.domain_status`; tasks_completed e tasks_skipped podem ser arrays vazios mas `reasoning` precisa explicar o blocker.
```

### Passo 8: Re-ler ambos arquivos apos as edicoes

Confirmar em cada:
- secao antiga de output substituida
- 4 blocos novos na ordem correta (Status Mapping → Reasoning → Output template → exemplo)
- `agent:` e `kind:` literal corretos (lesson-evaluator/audit vs plan-executor/verification)
- plan-executor: nenhuma referencia residual a `status: "done"` ou `status: "partial"` fora da tabela de mapping
- lesson-evaluator: nenhuma referencia residual ao "markdown sem status" — agora tem dominio claro

### Passo 9: Execucao

fase-03 pode rodar como 2 subagentes paralelos (lesson-evaluator e plan-executor sao arquivos distintos sem acoplamento). fase-03 inteira pode rodar em paralelo da fase-04 deste plano.

---

## Gotchas

- **G1 (LLM JSON malformado):** Padrao. "Sem code fences" no template.
- **G2 (lifecycle vs dominio):** Critico em **plan-executor** — ele JA tinha lifecycle proprio (`done/partial/blocked`) que parecia OK mas mistura dominio e lifecycle. Pegadinha: autor pode preservar `done` no top-level achando que e lifecycle valido. NAO E — tem que ir para `domain_status`. Tabela do passo 5 e a defesa.
- **G3 (reasoning 20/50):** Especial em **plan-executor**, que antes tinha "Blockers" como prosa livre nao obrigatoria — agora `reasoning` e obrigatorio em TODOS os casos (mesmo quando tudo rodou). Exemplo do passo 6 mostra reasoning >50 em caso de sucesso (nao so falha).
- **G5 (contract_version "1.0"):** Literal nos 2 prompts.
- **G8 (Comment Provenance):** plan-executor edicao tem decisao nao obvia (por que normalizar `done → complete + domain_status:done` ao inves de manter `done` como lifecycle). Comentar inline ou em MEMORY.md.
- **G-P02-01 (Mapping nao mecanico):** Especialmente plan-executor — `partial` NAO e `needs_retry`. O auditor encontrou tasks que nao rodaram, mas o lifecycle do orquestrador continua "complete" (consumer decide o que fazer). Confundir = perda de informacao.
- **G-P02-04 (analog — alguns agentes nunca emitem `needs_retry`):** plan-executor nao emite `needs_retry` voluntariamente — retry mecanico e do parser quando JSON falha. `needs_retry` semantico ficaria estranho para este agente (re-executar tasks tem efeito colateral, nao e idempotente).
- **Local (plan-executor mistura lifecycle e dominio no estado atual):** Maior risco desta fase. Diferente dos audit-only (que tinham enum claramente dominio), plan-executor parecia ter lifecycle. Revisor humano deve checar que `done` foi movido para `payload.domain_status` e nao deixado no top-level por mimetismo.
- **Local (lesson-evaluator dominio novo):** INVENTORY diz "sem Status field claro". Esta fase **define** o vocabulario do dominio. Decisao registrar em MEMORY.md (`DI-N`) — se Plano 04 ou Plano 05 quiser handler especifico para lesson-evaluator, precisa saber que `critical` aqui significa "rejeite" (nao "abortar pipeline").

---

## Verificacao

### TDD (simulacao — fixtures concretas vem na fase-05)

- [ ] **RED (lesson-evaluator):** Output do prompt atual contra `parseAndDispatch` retorna 3+ erros (sem `contract_version`, sem `kind`, sem `status` lifecycle valido — markdown puro).

- [ ] **RED (plan-executor):** Output do prompt atual contra `parseAndDispatch` retorna `INVALID_LIFECYCLE_STATUS` (top-level `done` nao e valor valido), `MISSING_CONTRACT_VERSION`, `MISSING_REASONING` (ou warning se "Blockers" tem ≥20 chars).

- [ ] **GREEN (ambos):** Output exemplo apos edicao retorna `{ ok: true, kind: "audit" }` para lesson-evaluator e `{ ok: true, kind: "verification" }` para plan-executor, sem warnings.

### Checklist

- [ ] `agents/lesson-evaluator.md` e `agents/plan-executor.md` lidos completos antes da edicao
- [ ] 4 blocos novos presentes em cada
- [ ] Tabela de mapping de lesson-evaluator cobre 5 casos (3 dominio + 1 mecanico + 1 irrecuperavel)
- [ ] Tabela de mapping de plan-executor cobre 3 casos de dominio (done/partial/blocked) + nota sobre `needs_retry` mecanico
- [ ] plan-executor: nenhuma referencia residual a `status: "done"` ou `status: "partial"` fora da coluna "antigo" da tabela
- [ ] Output template de plan-executor distingue corretamente `tasks_completed[]` de `tasks_skipped[]` (com `reason` em skipped)
- [ ] `agent:` e `kind:` literais corretos em ambos
- [ ] Anotacao em `MEMORY.md`: dominio novo de lesson-evaluator (DI-N), decisao de normalizacao do plan-executor lifecycle (DI-M)
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `parseAndDispatch(<output lesson-evaluator exemplo>)` retorna `{ ok: true, kind: "audit" }` sem erros e sem warnings.
- `parseAndDispatch(<output plan-executor exemplo>)` retorna `{ ok: true, kind: "verification" }` sem erros e sem warnings.

**Por humano:**
- Revisor lendo `agents/plan-executor.md` entende em <2min por que `done` foi movido para `payload.domain_status` (e nao mantido no top-level) — explicacao deve estar inline ou no exemplo do passo 6.
- Revisor lendo `agents/lesson-evaluator.md` entende em <2min o vocabulario novo: `clean = commit`, `issues_found = revisar`, `critical = rejeitar`.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

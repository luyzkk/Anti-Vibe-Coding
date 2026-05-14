<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): warn → complete — alinhado com regra mapping fase-01`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Migracao do `plan-verifier` (JSON parcial → envelope v1 completo)

**Plano:** 02 — Migracao Piloto (3 padroes)
**Sizing:** 1.5h
**Depende de:** Plano 01 fase-05 (security-auditor migrado serve como template visual de envelope v1 + fixture)
**Visual:** false

---

## O que esta fase entrega

`agents/plan-verifier.md` emitindo output conforme contrato v1 completo: envelope `contract_version/agent/kind/status/reasoning/payload/metadata`, com `payload.checks[]` preservando shape compativel com consumidores atuais e `payload.domain_status` opcional para retrocompatibilidade semantica. Regra de mapeamento `pass/warn/fail → complete/needs_retry/blocked` documentada inline no prompt (sera destilada em fase-04 para o migration guide canonico).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/plan-verifier.md` | Modify | Reescrever secao de output do prompt para instruir emissao do envelope v1; adicionar bloco "Status Mapping Rule" inline |

Nenhum codigo TS de runtime e tocado nesta fase — e edicao de prompt apenas. Validator e fixture vem das fases 04 (Plano 01) e 03 (Plano 02 — proxima fase deste plano).

---

## Implementacao

### Passo 1: Reler estado atual de `plan-verifier.md`

Antes de editar, **releia o arquivo completo** (CLAUDE.md §Integridade das Edicoes). INVENTORY linha `plan-verifier` afirma:

- Output atual: JSON estruturado.
- Status atual: `pass | warn | fail` + `checks[]`.
- Reasoning: nao ha campo livre — so `detail` por check.

Confirmar com leitura antes de assumir.

### Passo 2: Definir o envelope v1 alvo (formato exato)

Output esperado depois da migracao:

```json
{
  "contract_version": "1.0",
  "agent": "plan-verifier",
  "kind": "verification",
  "status": "complete",
  "reasoning": "Verifiquei 4 checks contra o plano. 3 passaram, 1 emitiu warn em 'cobertura de teste' — o plano nao especifica matriz de fixtures por kind. Nao bloqueia merge, mas sinalizo porque o Plano 02 fase-03 vai criar essas fixtures e o gap pode confundir o autor do Plano 03.",
  "payload": {
    "domain_status": "warn",
    "checks": [
      { "id": "ac_coverage", "result": "pass", "detail": "Todos os CAs do PRD tem fase associada." },
      { "id": "phase_sizing", "result": "pass", "detail": "Total 5h, alinhado com overview." },
      { "id": "dependency_graph", "result": "pass", "detail": "fase-03 depende corretamente de fase-01 e fase-02." },
      { "id": "fixture_matrix", "result": "warn", "detail": "Matriz por kind nao especificada explicitamente; sera produzida em fase-03." }
    ]
  },
  "human_readable": "## Resumo da verificacao\n- 3 checks OK\n- 1 warn em fixture_matrix (nao bloqueante)",
  "metadata": {
    "run_id": "uuid-gerado",
    "duration_ms": 0,
    "model": "sonnet"
  }
}
```

**Decisoes chave embutidas no exemplo:**
- `status: "complete"` mesmo havendo `warn` no dominio — warn nao bloqueia, nao retry. Regra do G-P02-01.
- `payload.domain_status` carrega o "pior" resultado de dominio (`warn` aqui) — consumidores ja existentes que liam `status: warn` antigo agora leem `payload.domain_status` (migration mecanica, sem perda).
- `payload.checks[]` preserva shape antigo (`id/result/detail`) — Plano 04 fase-01 consome direto via handler generico de `kind: verification`.
- `reasoning` >50 chars (passa warning threshold), foco em "o que vi que pode confundir alguem" — nao repete o que `checks[]` ja diz.

### Passo 3: Bloco "Status Mapping Rule" a injetar no prompt

Adicionar secao explicita no prompt do `plan-verifier.md` instruindo o LLM como mapear:

```markdown
## Status Mapping (obrigatorio — NAO usar status de dominio no campo top-level `status`)

Apos rodar os checks, calcule o **lifecycle** assim:

| Resultado de dominio nos checks                       | `status` (top-level) | `payload.domain_status` |
|-------------------------------------------------------|----------------------|-------------------------|
| Todos `pass`                                          | `complete`           | `pass`                  |
| Pelo menos 1 `warn`, nenhum `fail`                    | `complete`           | `warn`                  |
| Pelo menos 1 `fail` de severidade media (ex: gap doc) | `complete`           | `fail`                  |
| Pelo menos 1 `fail` mecanico (arquivo nao parseou,    | `needs_retry`        | `fail`                  |
| schema invalido — flake possivel)                     |                      |                         |
| Erro irrecuperavel (arquivo PRD nao existe,           | `blocked`            | (omitir)                |
| permissao negada)                                     |                      |                         |

`status` diz ao orquestrador **o que fazer agora** (continuar / re-tentar / escalar).
`payload.domain_status` diz **o que voce achou** (info para o consumidor decidir politica propria).
NUNCA emita `status: "pass"`, `status: "warn"`, `status: "fail"` — o validador rejeita com `INVALID_LIFECYCLE_STATUS`.
```

### Passo 4: Bloco "Reasoning guideline" a injetar

```markdown
## Reasoning (obrigatorio — minimo 20 chars, ideal >50)

Use `reasoning` para sinalizar o que voce viu **fora do schema esperado**:
- coisas que `checks[]` nao captura porque sao meta (ex: "o plano tem 5 fases mas a fase-03 e ambigua sobre fixtures")
- conflitos com outros artefatos (ex: "PRD §X diz Y, mas plano implementa Z")
- observacoes que ajudam o consumidor a decidir politica

NAO use `reasoning` para:
- repetir o que ja esta em `checks[].detail`
- enumerar passos do que voce fez
- elogiar/criticar o plano em abstrato

Ruim (passa min mas warning):
> "Verifiquei o plano e esta OK."

Bom (>50 chars, info nova):
> "Plano cobre os CAs mas nao define fixture por kind — Plano 03 vai precisar dessa matriz, vale antecipar em fase-03 deste plano."
```

### Passo 5: Bloco "Output template" a injetar (final do prompt)

```markdown
## Output (obrigatorio JSON — sem code fences ao redor)

Emita exatamente um objeto JSON valido. Nao envolva em ```json ... ```. Nao adicione texto antes ou depois.

```
{
  "contract_version": "1.0",
  "agent": "plan-verifier",
  "kind": "verification",
  "status": "<complete|needs_retry|needs_human|blocked>",
  "reasoning": "<prosa livre, min 20 chars>",
  "payload": {
    "domain_status": "<pass|warn|fail>",
    "checks": [
      { "id": "<id_check>", "result": "<pass|warn|fail>", "detail": "<frase descritiva>" }
    ]
  },
  "human_readable": "<markdown opcional>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```
```

### Passo 6: Re-ler `plan-verifier.md` apos a edicao

Confirmar que:
- secao antiga de output (que descrevia JSON parcial) foi substituida, nao duplicada
- os 4 blocos novos estao na ordem correta
- nao sobrou referencia a `status: "pass"` fora da tabela de mapping

---

## Gotchas

- **G1 do plano (LLM malformado):** Mesmo `plan-verifier` ja emitindo JSON hoje, o envelope v1 e novo. Instruir explicitamente "sem code fences" no template (passo 5). Parser do Plano 01 fase-04 e tolerante, mas reduzir variancia ajuda.
- **G2 do plano (lifecycle vs dominio):** Critico aqui. `pass/warn/fail` sao **dominio**, nao lifecycle. Erro mais provavel: deixar prompt antigo emitir `"status": "pass"` no top. A tabela do passo 3 e a defesa.
- **G3 do plano (threshold reasoning):** Passo 4 exemplifica bom vs ruim. Reasoning de 1 frase generica passa min (20) mas vai pegar warning (`<50`) — sinal para revisar prompt antes de comitar.
- **G-P02-01 (mapping nao e 1:1):** Documentado na tabela do passo 3. NAO simplificar para "fail → blocked" — perde informacao (fail medio e diferente de fail mecanico).
- **Local (regressao silenciosa):** Se algum consumidor atual do `plan-verifier` (Plano 04 fase-01 vai ser `execute-plan`) le campo `status` esperando `pass/warn/fail`, ele quebra. Mitigacao: ja sabido — Plano 04 fase-01 reescreve consumer, e essa quebra e parte do refactor big-bang (PRD §Decisoes #6). Anotar em MEMORY.md como Notas para Planos Seguintes.

---

## Verificacao

### TDD (simulacao — fixture concreta vem em fase-03)

- [ ] **RED:** Antes da edicao, simular output mental do prompt atual contra o validator (`parseAndDispatch` do Plano 01 fase-04). Esperar: `INVALID_LIFECYCLE_STATUS` (top-level `status: "pass"`), `MISSING_REASONING`, `MISSING_CONTRACT_VERSION`.
  - Comando (mental): rodar fixture do prompt atual contra validator → 3+ erros esperados.

- [ ] **GREEN:** Apos edicao, escrever um output exemplo (copiar o JSON do passo 2 deste arquivo) e validar:
  - Comando: `bun run --eval "import { parseAndDispatch } from './skills/lib/subagent-contract'; console.log(parseAndDispatch(require('./fixtures/inline-test.json')))"` (ou equivalente test inline)
  - Resultado esperado: `{ ok: true, kind: "verification" }`, sem warnings (reasoning >50).

### Checklist

- [ ] `agents/plan-verifier.md` lido completo ANTES da edicao (CLAUDE.md §Integridade)
- [ ] 4 blocos novos presentes: Status Mapping, Reasoning guideline, Output template, exemplo concreto
- [ ] Tabela de mapping cobre os 5 casos (3 dominio + 1 mecanico + 1 irrecuperavel)
- [ ] Exemplo de reasoning bom passa threshold 50 chars
- [ ] Nenhuma referencia residual a `status: "pass|warn|fail"` fora da tabela de mapping
- [ ] `agents/plan-verifier.md` re-lido APOS edicao
- [ ] Anotacao em `MEMORY.md` se descobriu algo nao obvio (ex: prompt antigo ja tinha JSON wrapper parcial reutilizavel)
- [ ] `bun run lint` limpo no diff (linter de markdown se houver)

---

## Criterio de Aceite

**Por maquina:**
- `bun run --eval` injetando output exemplo (passo 2) em `parseAndDispatch()` retorna `{ ok: true, kind: "verification" }` sem erros e sem warnings.

**Por humano:**
- Revisor lendo `agents/plan-verifier.md` atualizado entende a tabela de mapping em <2min e consegue prever lifecycle para um caso novo (ex: "2 fails sendo um medio e um mecanico" → `needs_retry` porque o mecanico domina).

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-14 (Luiz/dev): ISSUES_FOUND → domain_status:issues_found — alinhado com regra mapping migration guide v2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Batch Audit 1 — react, solid, code-smell, tdd

**Plano:** 03 — Migracao em Escala
**Sizing:** 1.5h
**Depende de:** Plano 02 fase-04 (migration guide v2 destilado com regra mapping dominio→lifecycle)
**Visual:** false

---

## O que esta fase entrega

4 auditores read-only emitindo contrato v1 — `react-auditor`, `solid-auditor`, `code-smell-detector`, `tdd-verifier`. Padrao uniforme: `kind: audit`, `payload.issues[]` com shape herdado do security-auditor (severity/location/description), `payload.domain_status` para preservar enum antigo, `reasoning` >50 chars com observacao do dominio especifico de cada auditor. Execucao via 4 subagentes paralelos editando 4 arquivos `agents/*.md` distintos — sem acoplamento entre eles.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/react-auditor.md` | Modify | Substituir secao de output por envelope v1; injetar blocos Status Mapping (com vocabulario `OPTIMIZED/ISSUES_FOUND/PERFORMANCE_RISK`), Reasoning guideline, Output template |
| `agents/solid-auditor.md` | Modify | Idem; vocabulario `COMPLIANT/ISSUES_FOUND/REFACTORING_NEEDED` |
| `agents/code-smell-detector.md` | Modify | Idem; vocabulario `CLEAN/SMELLS_FOUND/REFACTORING_NEEDED` |
| `agents/tdd-verifier.md` | Modify | Idem; vocabulario `COMPLIANT/NON_COMPLIANT/PARTIALLY_COMPLIANT` (tdd-verifier tem 3 niveis com semantica de "partial" — mapear conforme tabela do passo 3) |

Nenhum codigo TS de runtime e tocado. Fixtures vem na fase-05.

---

## Implementacao

### Passo 1: Reler estado atual dos 4 prompts (CLAUDE.md §Integridade)

Antes de editar, **releia cada um dos 4 arquivos completos**. INVENTORY tabela principal afirma:

- `react-auditor`: markdown table, status `OPTIMIZED/ISSUES_FOUND/PERFORMANCE_RISK`, reasoning disperso.
- `solid-auditor`: markdown, status `COMPLIANT/ISSUES_FOUND/REFACTORING_NEEDED`, reasoning ausente.
- `code-smell-detector`: markdown, status `CLEAN/SMELLS_FOUND/REFACTORING_NEEDED`, reasoning ausente.
- `tdd-verifier`: markdown, status `COMPLIANT/NON_COMPLIANT/PARTIALLY_COMPLIANT`, reasoning ausente.

Confirmar com leitura — INVENTORY pode estar defasado.

### Passo 2: Definir envelope v1 alvo (template comum aos 4)

Output esperado por agente (variando `agent`, `payload.domain_status` valores aceitos, e exemplos de `issues[]` no dominio):

```json
{
  "contract_version": "1.0",
  "agent": "<react-auditor|solid-auditor|code-smell-detector|tdd-verifier>",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Frase livre >50 chars com observacao do dominio. Ex (react): 'Componente UserList usa useEffect para data fetching — anti-pattern conhecido. Migrar para useQuery do TanStack. Notei tambem que props nao memoizadas causam re-render em 3 ancestrais.'",
  "payload": {
    "domain_status": "<clean|issues_found|critical>",
    "issues": [
      {
        "severity": "<info|warning|error|critical>",
        "location": "<arquivo:linha ou identificador semantico>",
        "description": "<descricao da issue, especifica do dominio>"
      }
    ]
  },
  "human_readable": "<markdown opcional — tabela de issues por severidade>",
  "metadata": {
    "run_id": "<uuid-gerado>",
    "duration_ms": 0,
    "model": "<modelo>"
  }
}
```

**Decisoes embutidas:**
- `payload.issues[]` reusa shape do security-auditor (Plano 01 fase-05) — handler generico do Plano 04 fase-03 consome 8 auditores via mesma logica.
- `payload.domain_status` tem 3 valores canonicos (`clean | issues_found | critical`) — preserva semantica do enum antigo sem permitir 11 vocabularios diferentes.
- `human_readable` e opcional — se o auditor tinha tabela markdown valiosa antes, preservar; se nao, omitir.

### Passo 3: Bloco "Status Mapping" a injetar em CADA prompt

Adicionar secao explicita instruindo o LLM como mapear o enum antigo para envelope v1. Vocabulario varia por auditor — tabela abaixo e a referencia.

**Para react-auditor:**

```markdown
## Status Mapping (obrigatorio — NAO usar enum de dominio no campo top-level `status`)

| Resultado de dominio (antigo)     | `status` (top-level) | `payload.domain_status` |
|-----------------------------------|----------------------|-------------------------|
| Codigo limpo (OPTIMIZED)          | `complete`           | `clean`                 |
| Issues encontradas (ISSUES_FOUND) | `complete`           | `issues_found`          |
| Performance critica (PERFORMANCE_RISK) | `complete`     | `critical`              |
| Arquivo nao parseou / timeout     | `needs_retry`        | (omitir)                |
| Arquivo nao existe / permissao    | `blocked`            | (omitir)                |

`status` diz ao orquestrador **o que fazer agora** (continuar / re-tentar / escalar).
`payload.domain_status` diz **o que voce achou** (info para o consumidor decidir).
NUNCA emita `status: "OPTIMIZED"` ou `status: "PERFORMANCE_RISK"` — o validador rejeita com `INVALID_LIFECYCLE_STATUS`.
`critical` no domain_status NAO mapeia para `blocked` no lifecycle — consumidor decide se aborta.
```

**Para solid-auditor:** substituir 3 primeiras linhas por:
| `COMPLIANT` | `complete` | `clean` |
| `ISSUES_FOUND` | `complete` | `issues_found` |
| `REFACTORING_NEEDED` | `complete` | `critical` |

**Para code-smell-detector:**
| `CLEAN` | `complete` | `clean` |
| `SMELLS_FOUND` | `complete` | `issues_found` |
| `REFACTORING_NEEDED` | `complete` | `critical` |

**Para tdd-verifier (atencao — semantica "partial" especifica):**
| `COMPLIANT` | `complete` | `clean` |
| `PARTIALLY_COMPLIANT` | `complete` | `issues_found` |
| `NON_COMPLIANT` | `complete` | `critical` |

Justificativa do mapping do tdd-verifier: `PARTIALLY_COMPLIANT` semanticamente equivale a "achei coisas mas nao critico" — encaixa em `issues_found`. `NON_COMPLIANT` (zero ou quase zero cobertura) e o caso critico.

### Passo 4: Bloco "Reasoning guideline" a injetar em CADA prompt

Texto base (adaptar exemplo bom ao dominio do auditor):

```markdown
## Reasoning (obrigatorio — minimo 20 chars, ideal >50)

Use `reasoning` para sinalizar o que voce viu **fora do schema esperado**:
- padroes que `issues[]` nao captura porque sao meta (ex: react: "todos os componentes da pasta X foram migrados pra hooks mas Y ficou pra tras")
- conflitos com outros aspectos do codigo (ex: solid: "interface segrega bem mas constructor injection vaza dependencia concreta")
- observacoes que ajudam o consumidor a decidir politica (ex: tdd: "cobertura subiu pra 80% mas testes novos testam mocks, nao comportamento")

NAO use `reasoning` para:
- repetir o que ja esta em `issues[].description`
- enumerar passos do que voce fez
- elogiar/criticar o codigo em abstrato

Ruim (passa min mas warning <50):
> "Codigo analisado, achei 3 issues."

Bom (>50 chars, info nova no dominio do auditor):
> [react] "Hook useUsers refetch em mount sem deps — vai derrubar staleTime do TanStack. Issues lista isso mas o padrao se repete em 4 outras paginas — vale fix em batch."
> [solid] "Classe OrderService respeita SRP mas usa new() em Repository — DI quebrada. Issue cita linha 23 mas o problema e arquitetural, nao pontual."
> [code-smell] "Funcao calculateTotal tem 89 linhas. Issue marca como Long Method mas o smell e mais profundo — mistura calculo, formatacao e log."
> [tdd] "Cobertura 84% mas 12 testes mocam o sistema sob teste — nao testam comportamento real, so passam mocks adiante."
```

Cada um dos 4 prompts recebe versao adaptada — vocabulario do dominio mas estrutura identica.

### Passo 5: Bloco "Output template" a injetar (final do prompt)

Texto base para todos (substituindo `<agent>` literal pelo nome do agente):

```markdown
## Output (obrigatorio JSON — sem code fences ao redor)

Emita exatamente um objeto JSON valido. Nao envolva em ```json ... ```. Nao adicione texto antes ou depois.

```
{
  "contract_version": "1.0",
  "agent": "<react-auditor|solid-auditor|code-smell-detector|tdd-verifier>",
  "kind": "audit",
  "status": "<complete|needs_retry|blocked>",
  "reasoning": "<prosa livre, min 20 chars, foco em observacao do dominio>",
  "payload": {
    "domain_status": "<clean|issues_found|critical>",
    "issues": [
      { "severity": "<info|warning|error|critical>", "location": "<arquivo:linha>", "description": "<descricao>" }
    ]
  },
  "human_readable": "<markdown opcional>",
  "metadata": { "run_id": "<uuid>", "duration_ms": 0, "model": "<modelo>" }
}
```
```

### Passo 6: Re-ler os 4 arquivos apos as edicoes

Confirmar em cada:
- secao antiga de output (que descrevia markdown table com enum dominio) foi substituida, nao duplicada
- os 4 blocos novos estao na ordem correta: Status Mapping → Reasoning guideline → Output template → exemplo concreto
- nao sobrou referencia ao enum antigo (`OPTIMIZED`, `COMPLIANT`, `CLEAN`, `NON_COMPLIANT` etc) fora da coluna "antigo" da tabela de mapping
- `agent:` no Output template literal bate com nome do arquivo (`react-auditor.md` → `"agent": "react-auditor"`)

### Passo 7: Execucao em paralelo (4 subagentes)

Esta fase **pode** rodar como 4 subagentes paralelos no `/execute-plan` — cada subagente recebe 1 arquivo + os passos 1-6 acima aplicados ao auditor especifico. Nao ha ordem obrigatoria entre os 4. Subagentes herdam contexto via fork; nenhum precisa esperar outro.

---

## Gotchas

- **G1 (LLM JSON malformado):** Mesmo padrao do Plano 02 fase-01 — instruir explicitamente "sem code fences" no template (passo 5). Parser do Plano 01 fase-04 e tolerante; reduzir variancia ajuda.
- **G2 (lifecycle vs dominio):** Critico aqui. Os 4 auditores tem enums diferentes (4 vocabularios) — tabela do passo 3 e a defesa contra leak no top-level `status`. O risco maior e o autor copy-paste a tabela do react-auditor e esquecer de trocar os valores no solid-auditor.
- **G3 (reasoning 20/50 threshold):** Passo 4 da 4 exemplos bons (1 por auditor). Reasoning generico "Codigo analisado, achei 3 issues" passa min (20) mas warning (<50) — sinal para revisar prompt antes de comitar.
- **G5 (contract_version "1.0" literal):** Aplica-se aos 4 prompts. Sem logica de selecao.
- **G8 (Comment Provenance):** Quando snippets de exemplo no prompt contiverem decisao nao obvia (ex: por que tdd `PARTIALLY_COMPLIANT` mapeia para `issues_found` e nao `critical`), comentario inline com linhagem.
- **G-P02-01 (Mapping nao mecanico):** Aplica-se aos 4. Especialmente em tdd-verifier — `PARTIALLY_COMPLIANT` e dominio, nao lifecycle. NUNCA mapear para `needs_retry`.
- **G-P02-05 (destilar nao concatenar):** Passo 4 mostra adaptacao por dominio. Resistir tentacao de usar reasoning generico copy-pasted nos 4 prompts — cada um tem dominio distinto, exemplo bom deve refletir.
- **Local (4 prompts em paralelo, risco de copy-paste laziness):** Subagentes paralelos podem trivializar a tarefa e gerar 4 prompts quase identicos com so o nome do agente trocado. Mitigacao: passo 4 exige reasoning exemplo no dominio do auditor; revisor humano deve checar que exemplos sao distintos antes de aprovar.

---

## Verificacao

### TDD (simulacao — fixtures concretas vem na fase-05)

- [ ] **RED (por agente):** Antes da edicao, simular output do prompt atual contra `parseAndDispatch` do Plano 01 fase-04. Esperar 3 erros:
  - `INVALID_LIFECYCLE_STATUS` (top-level `status: "OPTIMIZED"` etc)
  - `MISSING_REASONING`
  - `MISSING_CONTRACT_VERSION`
  - Comando (mental, por agente): rodar string do output antigo contra `parseAndDispatch` → 3+ erros esperados.

- [ ] **GREEN (por agente):** Apos edicao, escrever um output exemplo (espelhando o JSON do passo 2 com payload real do dominio) e validar:
  - Comando: `bun run --eval "import { parseAndDispatch } from './skills/lib/subagent-contract'; console.log(parseAndDispatch(JSON.stringify(<output exemplo>)))"`
  - Resultado esperado: `{ ok: true, kind: "audit" }`, sem warnings (reasoning >50).

### Checklist

- [ ] 4 arquivos `agents/{react,solid,code-smell,tdd}-auditor.md` (nota: `code-smell-detector.md`, `tdd-verifier.md`) lidos completos ANTES da edicao
- [ ] 4 blocos novos presentes em cada: Status Mapping, Reasoning guideline, Output template, exemplo concreto
- [ ] Tabela de mapping de cada prompt cobre os 5 casos (3 dominio + 1 mecanico + 1 irrecuperavel)
- [ ] Exemplos de reasoning bom no passo 4 sao **distintos** entre os 4 auditores (vocabulario do dominio)
- [ ] Nenhuma referencia residual ao enum antigo fora da coluna "antigo" da tabela
- [ ] `agent:` literal em cada Output template bate com nome do arquivo
- [ ] 4 arquivos re-lidos APOS edicao
- [ ] Anotacao em `MEMORY.md` se descobriu algo nao obvio (ex: tdd-verifier ja tinha JSON parcial antes? `PARTIALLY_COMPLIANT` ambiguo?)
- [ ] `bun run lint` limpo no diff (linter de markdown se houver)

---

## Criterio de Aceite

**Por maquina:**
- `bun run --eval` injetando output exemplo de cada um dos 4 agentes em `parseAndDispatch()` retorna `{ ok: true, kind: "audit" }` sem erros e sem warnings.

**Por humano:**
- Revisor lendo os 4 prompts em sequencia detecta que blocos Reasoning guideline tem 4 exemplos **distintos** (vocabulario do dominio diferente — react menciona memoization/TanStack, solid menciona SRP/DI, code-smell menciona Long Method, tdd menciona cobertura/mocks). Se 2+ prompts tem reasoning exemplo identico, copy-paste laziness — falhar.

---

<!-- Gerado por /plan-feature em 2026-05-14 -->

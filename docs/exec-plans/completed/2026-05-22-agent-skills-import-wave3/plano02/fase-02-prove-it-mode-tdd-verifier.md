# Fase 02: Adicionar `## Prove-It Mode` em `tdd-verifier.md`

**Plano:** 02 — Prove-It Mode no tdd-verifier
**Sizing:** 1h
**Depende de:** fase-01 (decisao "PROSSEGUIR" registrada em `audit-tdd-verifier.md`)
**Visual:** false

---

## O que esta fase entrega

Secao `## Prove-It Mode` adicionada em `agents/tdd-verifier.md` (apos a secao `## Formato de Saida (Contrato v1)`, antes do EOF) com: protocolo RED genuino de 5 passos, descricao dos 3 novos campos no payload (`test_status` enum, `failing_test_snippet`, `failure_message`), guardrail mandatory `already_green`, exemplo JSON do payload em modo prove-it para cada um dos 3 estados, e nota explicita sobre como ativar o modo via campo `mode: "prove-it"` no input. Cumpre MH-03, CA-03 e CA-04 parcialmente (texto + contrato; fixtures ficam em fase-03).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `agents/tdd-verifier.md` | Modify | Adicionar secao `## Prove-It Mode` apos `## Formato de Saida (Contrato v1)`; adicionar comentario HTML de linhagem |

**Preservado integralmente:** todo conteudo anterior (frontmatter, comentarios HTML pre-existentes, secoes `## O que verificar`, `## Regras`, `## Formato de Saida (Contrato v1)`). Edicao e ADICAO no final do arquivo — sem substituir conteudo existente (principio P-3 do PRD, DT-5).

---

## Implementacao

### Passo 1: Re-ler `agents/tdd-verifier.md` (integridade das edicoes)

Confirma estrutura atual antes de editar (per regra "releia antes de editar"). Identificar o EOF e o ultimo bloco markdown.

```bash
wc -l agents/tdd-verifier.md
tail -20 agents/tdd-verifier.md
```

Esperado pos-Wave-2: arquivo termina em bloco de regras/notas do Output Contract. Ponto de insercao: nova secao H2 APOS a ultima secao existente, no final do arquivo.

### Passo 2: Adicionar comentario HTML de linhagem antes da nova secao

Apos a ultima secao existente, antes da nova:

```markdown
<!-- 2026-05-23 (Luiz/dev): prove-it mode — PRD Wave 3 Item 2, MH-03, CA-03 + CA-04, DC-7 -->
```

(Linhagem segue Principio universal #5 — Comment Provenance do template.)

### Passo 3: Adicionar secao `## Prove-It Mode`

Texto exato a inserir (em portugues consistente, sem emojis exceto onde o contract permite):

```markdown
## Prove-It Mode

Modo opt-in que prova um RED genuino antes de qualquer fix. Ativado via campo top-level `mode: "prove-it"` no input do agente. Invocacao SEM `mode:` mantem comportamento padrao (auditoria read-only descrito em "O que verificar") — backward-compat total preservado.

### Protocolo (5 passos)

1. **Identificar** o comportamento a ser testado — bug a reproduzir ou feature ainda nao implementada
2. **Escrever** um teste que DEVE FALHAR com o codigo atual (assertion failure, nao compilation error)
3. **Confirmar** que o teste falha — rodar o test runner (via Bash, tool ja disponivel) e capturar a mensagem de erro
4. **Retornar** envelope JSON com `payload.test_status: "red_confirmed"` + `payload.failing_test_snippet` (codigo do teste) + `payload.failure_message` (output do test runner)
5. **PARAR** — NAO sugere fix, NAO modifica codigo de producao. Fix e responsabilidade do dev ou de ciclo subsequente (`tdd-workflow` GREEN phase)

### Guardrail: `already_green` (mandatory)

Se o teste escrito JA PASSA na primeira execucao (codigo existente satisfaz o comportamento), o agente DEVE retornar:

- `payload.test_status: "already_green"`
- `payload.failure_message`: diagnostico curto explicando o que aconteceu (possibilidades: teste escrito errado, codigo ja correto, escopo do bug nao reproduzido com este teste)

Por que mandatory: sem este guardrail, agente poderia retornar `red_confirmed` em estado verde — RED falso — quebrando o invariante do ciclo TDD. R-02 do PRD Wave 3.

### Guardrail: `inconclusive` (fallback)

Se o teste nao roda (compilation error, dependencia ausente, infrastructure problem) ou o output do runner e ambiguo (test name nao matched, framework nao reconhecido), retornar:

- `payload.test_status: "inconclusive"`
- `payload.failure_message`: descricao do problema de execucao + sugestao de proximo passo (ajustar import, instalar dep, escolher framework)

### Campos novos no payload (apenas em mode prove-it)

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `test_status` | enum: `"red_confirmed"` \| `"already_green"` \| `"inconclusive"` | sim (apenas em mode prove-it) | Resultado do RED check |
| `failing_test_snippet` | string | sim (apenas se `test_status` = `"red_confirmed"` ou `"already_green"`) | Codigo do teste escrito (literal, executavel) |
| `failure_message` | string | sim (apenas em mode prove-it) | Output literal do test runner OU diagnostico (se `already_green`/`inconclusive`) |

Os 3 campos coexistem com `payload.issues` (que continua obrigatorio no kind `audit` per `agents/_contract/v1.schema.json`). Em mode prove-it, `payload.issues` pode ser array vazio `[]` se nao ha findings adicionais — o "finding" do modo e o `test_status` em si.

### Exemplo: red_confirmed

```json
{
  "contract_version": "1.0",
  "agent": "tdd-verifier",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Bug de divisao por zero em calcDiscount nao tem teste. Escrevi teste que invoca calcDiscount(0, 0.1) e espera erro especifico. Test runner reportou assertion failure como esperado — RED confirmado, codigo nao trata divisor zero. Nao sugiro fix; ciclo seguinte do dev cobre GREEN.",
  "payload": {
    "domain_status": "red_confirmed",
    "issues": [],
    "test_status": "red_confirmed",
    "failing_test_snippet": "describe('calcDiscount', () => {\n  it('throws on divisor zero', () => {\n    expect(() => calcDiscount(0, 0.1)).toThrow('divisor cannot be zero')\n  })\n})",
    "failure_message": "FAIL src/discount.test.ts > calcDiscount > throws on divisor zero\n  Expected function to throw 'divisor cannot be zero'\n  Received: TypeError: Cannot read property 'amount' of NaN"
  },
  "metadata": { "run_id": "prove-it-001", "duration_ms": 0, "model": "test" }
}
```

### Exemplo: already_green

```json
{
  "contract_version": "1.0",
  "agent": "tdd-verifier",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Teste escrito para reproduzir suposto bug em formatPhone(null) — esperava throw. Mas formatPhone ja retorna string vazia em null gracefully. Teste passou na primeira execucao. Possivel que o bug-report tenha sido outdated ou que o codigo foi corrigido sem teste de regressao. Retornando already_green com diagnostico.",
  "payload": {
    "domain_status": "already_green",
    "issues": [],
    "test_status": "already_green",
    "failing_test_snippet": "describe('formatPhone', () => {\n  it('throws on null input', () => {\n    expect(() => formatPhone(null)).toThrow()\n  })\n})",
    "failure_message": "Test passed unexpectedly. formatPhone(null) returned '' instead of throwing. Hipoteses: (1) bug ja corrigido sem teste de regressao; (2) teste escrito com expectativa errada; (3) escopo do bug nao reproduzido com este input — testar com outros inputs (undefined, {}, [])."
  },
  "metadata": { "run_id": "prove-it-002", "duration_ms": 0, "model": "test" }
}
```

### Exemplo: inconclusive

```json
{
  "contract_version": "1.0",
  "agent": "tdd-verifier",
  "kind": "audit",
  "status": "complete",
  "reasoning": "Tentei escrever teste para parseQuery(input) mas o modulo importa uma dependencia nao instalada (drizzle-orm). Test runner falha em load do modulo — nao consegue distinguir RED de problema de infra. Retornando inconclusive com diagnostico de setup; dev precisa instalar dep antes de re-rodar.",
  "payload": {
    "domain_status": "inconclusive",
    "issues": [],
    "test_status": "inconclusive",
    "failure_message": "Cannot run test — module load failed: Cannot find module 'drizzle-orm'. Resolucao: rodar 'bun add drizzle-orm' OU verificar se o caminho do import esta correto. Re-invocar prove-it apos resolver dependencia."
  },
  "metadata": { "run_id": "prove-it-003", "duration_ms": 0, "model": "test" }
}
```

(No exemplo `inconclusive`, `failing_test_snippet` foi omitido — campo obrigatorio apenas em `red_confirmed`/`already_green`. Schema v1 trata `payload` como `object` aberto, entao a omissao e valida ao nivel do envelope; agentes consumidores devem checar `test_status` antes de ler `failing_test_snippet`.)

### Notas operacionais

- O modo NAO altera o `contract_version` ("1.0") nem o `kind` ("audit"). Os 3 campos novos vivem dentro de `payload`, que e tipo `object` aberto no schema v1 — extensao backward-compat.
- O modo NAO modifica arquivos. Mesmo escrevendo um teste novo para confirmar RED, o agente NAO comita o teste em disco — apenas inclui o snippet no payload. Dev decide se vai persistir como arquivo `.test.ts`.
- Telemetria pode logar `mode: "prove-it"` separado para distinguir metricas de auditoria vs prova de RED (PRD secao "Observabilidade").
```

### Passo 4: Edit cirurgico

Usar `Edit` (NAO `Write` — arquivo nao deve ser reescrito do zero) para anexar o comentario HTML + a secao `## Prove-It Mode` ao final do arquivo. Estrategia: `old_string` = ultima(s) linha(s) atuais, `new_string` = mesmas linhas + `\n\n<!-- comentario -->\n\n## Prove-It Mode\n\n...`.

Antes do Edit, capturar a ultima linha real:

```bash
tail -3 agents/tdd-verifier.md
```

Garantir que o `old_string` do Edit inclui contexto unico (ex: ultima linha de codigo do exemplo JSON + linha "## Regras:" seguinte se existir). Releia o arquivo apos o Edit para confirmar:

```bash
grep -c "^## Prove-It Mode" agents/tdd-verifier.md  # esperado: 1
grep -c "test_status" agents/tdd-verifier.md  # esperado: >=4 (tabela + 3 exemplos)
grep -c "already_green" agents/tdd-verifier.md  # esperado: >=3 (guardrail + exemplo + tabela)
grep -c "red_confirmed" agents/tdd-verifier.md  # esperado: >=3
grep -c "inconclusive" agents/tdd-verifier.md  # esperado: >=3
grep -c "failing_test_snippet" agents/tdd-verifier.md  # esperado: >=4
grep -c "failure_message" agents/tdd-verifier.md  # esperado: >=4
grep -c '"mode": "prove-it"' agents/tdd-verifier.md  # esperado: >=1
```

### Passo 5: Rodar agents:contract (sanity check)

```bash
bun run agents:contract
```

Esperado: VERDE. O teste `subagent-contract.test.ts` valida o fixture EXISTENTE em `agents/__fixtures__/tdd-verifier/expected-output.json` (que nao foi tocado). Como Plano 02 apenas adiciona texto no `.md` (sem alterar fixture root nem schema), o teste deve continuar passando.

### Passo 6: Rodar harness:validate

```bash
bun run harness:validate
```

Esperado: VERDE. Harness valida estrutura do plugin (manifests, frontmatter). Adicao de secao em `.md` nao quebra harness — mas se quebrar, investigar (pode haver regra de "secoes esperadas" no harness que precisa atualizacao).

### Passo 7: Atualizar `MEMORY.md` do Plano 02

Registrar em "Notas para Planos Seguintes":
- Arquivo modificado: `agents/tdd-verifier.md` (checksum mudou — Plano 04 fase-04 regenera manifest)
- Convencao decidida: `mode: "prove-it"` e campo top-level no input (G7 do README)
- Linhagem do comentario HTML adicionado

---

## Gotchas

- **G3 do plano:** Texto do protocolo de 5 passos DEVE encerrar explicitamente em "PARAR — NAO sugere fix". Se omitir essa frase, agente tende a continuar para sugestao de fix (failure mode tipico observado em outros prove-it patterns).
- **G4 do plano (R-02 PRD):** Guardrail `already_green` aparece em 3 lugares: (a) bloco "Guardrail: `already_green` (mandatory)", (b) coluna do enum em tabela, (c) exemplo JSON dedicado. Triplicacao e intencional — eleva visibilidade do invariante critico.
- **G5 do plano (backward-compat):** Primeira frase da secao "Modo opt-in [...] Invocacao SEM `mode:` mantem comportamento padrao" e o contrato de backward-compat. NAO remover essa frase em refactor futuro.
- **G6 do plano:** NAO tocar o fixture root `agents/__fixtures__/tdd-verifier/{input.json, expected-output.json}` nesta fase. Fixtures novos vao para subdir em fase-03.
- **G7 do plano:** Convencao escolhida — `mode: "prove-it"` top-level no input. Esta fase documenta a convencao no texto do agent; fase-03 aplica nos fixtures.
- **Local — Edit vs Write:** Sempre Edit cirurgico. NUNCA Write para regravar `agents/tdd-verifier.md` — risco de perder conteudo Wave-2 que esta no arquivo se Wave 2 ja mergeada.
- **Local — schema v1:** `payload` no schema (`agents/_contract/v1.schema.json` linha 33) e tipo `object` sem properties fechadas. Adicionar `test_status`/`failing_test_snippet`/`failure_message` e extensao 100% backward-compat dentro de v1. NAO precisa bump para v2.
- **Local — `payload.issues` obrigatorio:** `auditVariant` do schema (linha 65) tem `required: ["issues"]`. Exemplos em prove-it mode SEMPRE incluem `"issues": []` para satisfazer o schema. Sem isso, fixtures de fase-03 quebram o contract test.

---

## Verificacao

### TDD

- [ ] **RED:** Antes do Edit, `grep -c "^## Prove-It Mode" agents/tdd-verifier.md` retorna `0`
- [ ] **GREEN:** Apos o Edit, `grep -c "^## Prove-It Mode" agents/tdd-verifier.md` retorna `1`

### Checklist

- [ ] `agents/tdd-verifier.md` contem secao `## Prove-It Mode` (grep retorna 1 match)
- [ ] Secao contem protocolo de 5 passos numerados (grep `"^[1-5]\. "` >= 5 dentro da nova secao)
- [ ] Tabela de campos novos lista os 3 campos: `test_status`, `failing_test_snippet`, `failure_message`
- [ ] Guardrail `already_green` documentado como mandatory (grep `mandatory` no contexto da secao)
- [ ] 3 exemplos JSON (red_confirmed, already_green, inconclusive) presentes
- [ ] Cada exemplo JSON tem `"issues": []` (ou array nao-vazio) para satisfazer schema v1 auditVariant
- [ ] Comentario HTML de linhagem `<!-- 2026-05-23 (Luiz/dev): prove-it mode — PRD Wave 3 Item 2 -->` adicionado
- [ ] Conteudo PRE-existente intacto (frontmatter, `## O que verificar`, `## Regras`, `## Formato de Saida (Contrato v1)` — verificar via diff comparativo)
- [ ] `bun run agents:contract` verde
- [ ] `bun run harness:validate` verde
- [ ] `bun run typecheck` verde (nao deveria mudar nada, mas confirmar)

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "^## Prove-It Mode" agents/tdd-verifier.md` retorna `1`
- `grep -c "test_status" agents/tdd-verifier.md` retorna `>=4`
- `grep -c "already_green" agents/tdd-verifier.md` retorna `>=3`
- `grep -c "failing_test_snippet" agents/tdd-verifier.md` retorna `>=4`
- `grep -c "failure_message" agents/tdd-verifier.md` retorna `>=4`
- `grep -c "mode.*prove-it" agents/tdd-verifier.md` retorna `>=1`
- `bun run agents:contract` exit code 0
- `bun run harness:validate` exit code 0
- `bun run typecheck` exit code 0
- `git diff agents/tdd-verifier.md` mostra APENAS adicao no final (sem mudancas em linhas pre-existentes)

**Por humano:**
- Ler a secao `## Prove-It Mode` end-to-end como se fosse o agente — o protocolo de 5 passos e suficiente para escrever teste, rodar, retornar payload sem ambiguidade? O guardrail `already_green` esta claro o suficiente para evitar RED falso?

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

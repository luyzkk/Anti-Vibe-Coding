<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `<!-- 2026-09-01 (Luiz/dev): contexto de seguranca chega ao executor — PRD §RF-07 -->`
-->

# Fase 05: Contexto de seguranca do slice chega ao executor

**Plano:** 02 — Pipeline (codigo nasce seguro)
**Sizing:** 1h
**Depende de:** fase-02 (nomeia o `Abuse-It`), fase-03 (nomeia o `CA-SEC-*` e o bloco `### Seguranca` da fase)
**Visual:** false

---

## O que esta fase entrega

O ultimo elo: o subagente que escreve a primeira linha de codigo passa a **receber** o modelo de
ameaca do slice — a secao "Ameacas & Dados" do PRD e os `CA-SEC-*` da fase — em vez de descobrir
depois, na auditoria. Sem estourar a regra de isolamento: continua sem receber o PRD inteiro.

Cobre **RF-07**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/execute-plan/SKILL.md` | Modify | Step 4b: itens no `RECEBE` + precisao no `NAO RECEBE`. Step 4c: contexto no Subagente RED |
| `agents/plan-executor.md` | Modify | Bullet no `## Contexto` + secao `## Slice de Risco` + regra 7 de anti-degeneration + 1 linha nas regras do contrato |
| `plugin-manifest.json` | Modify | Regenerado — os dois sao rastreados |

---

## Implementacao

### Passo 0: Baseline, branch e pre-condicao

```bash
bun run test
git checkout -b feat/execute-plan-security-context   # G13

# Pre-condicao real: os nomes que esta fase referencia precisam existir
grep -c "Abuse-It" skills/tdd-workflow/SKILL.md                       # fase-02 mergeada → >= 1
grep -c "CA-SEC" skills/plan-feature/SKILL.md                         # fase-03 mergeada → >= 4
grep -c "### Seguranca" skills/plan-feature/templates/fase-template.md # fase-03 mergeada → 1
```

> Se algum retornar `0`, **pare**: esta fase escreveria ponteiro para conteudo inexistente, e um
> ponteiro quebrado em prosa de skill nao e pego por teste nenhum (e a gotcha registrada no
> `grill-me-contract`: caminho-em-doc nao e executado). Rodar a fase-02/03 primeiro, ou rebasear.

### Passo 1: `execute-plan` Step 4b — o que o subagente RECEBE

No bloco `### 4b. Spawn de Subagente por Fase`, dentro da lista `RECEBE:`, acrescentar **apos** a
linha de "Padrao de codigo existente" e antes das linhas de `Instrucao:`:

```
  - Se a fase tem o bloco `### Seguranca (apenas fase de slice [RISCO])` no `## Verificacao`:
    - A secao "Ameacas & Dados" do PRD — SO ela, recortada; nao o PRD inteiro
    - Os criterios `CA-SEC-*` da fase
    - Instrucao: "Este slice e de risco. Escreva o teste de abuso ANTES da defesa (Abuse-It,
      /anti-vibe-coding:tdd-workflow). Nenhum gatilho de aprovacao humana se auto-aplica —
      apresente o diff e aguarde."
```

E, na lista `NAO RECEBE:`, tornar a primeira linha precisa **sem tirar nada dela**:

```
  - PRD completo (o subagente ve apenas a fase — a unica excecao e a secao "Ameacas & Dados",
    recortada, e somente quando a fase e de risco)
```

> Por que recortar em vez de mandar o PRD: o isolamento existe para o executor implementar **o
> slice**, nao a feature. Mandar o PRD inteiro "porque tem seguranca dentro" desfaz o isolamento por
> uma porta lateral — e a secao recortada entrega 100% do que ele precisa para escrever a defesa.

### Passo 2: `execute-plan` Step 4c — o Subagente RED

No bloco `### 4c. Ciclo TDD por Fase`, o `Subagente RED (contexto isolado)` ganha uma linha (as
demais permanecem):

```
  Subagente RED (contexto isolado):
  - Recebe: especificacao da fase (arquivos, descricao, verificacao)
  - Recebe, se a fase e de risco: a secao "Ameacas & Dados" do PRD + os CA-SEC-* da fase
    — sem isso o RED escreve so o happy path e a defesa nunca chega ao GREEN
  - NAO recebe: implementacao existente
  - Produz: teste que FALHA por assertion failure
  - Registra: .tdd-phase.json
```

> Simetria proposital com a fase-02, que fez a mesma insercao no `## Context Isolation RED/GREEN` do
> `tdd-workflow`. As duas skills descrevem o mesmo mecanismo em lugares diferentes; divergir aqui
> criaria dois contratos.

### Passo 3: `plan-executor.md` — contexto recebido

Na secao `## Contexto`, acrescentar um bullet a lista "Voce recebera":

```markdown
- Quando a fase e de slice de risco: a secao "Ameacas & Dados" do PRD (classificacao do dado,
  fronteiras de confianca, casos de abuso `AB-*`) e os criterios `CA-SEC-*` da fase
```

### Passo 4: `plan-executor.md` — secao nova

Inserir apos `## TDD no Ciclo Red-Green-Refactor` e antes de
`## Verificacao de Acceptance Criteria`:

````markdown
## Slice de Risco — Defensivo da Primeira Linha

<!-- 2026-09-01 (Luiz/dev): contexto de seguranca do slice chega ao executor — PRD §RF-07 -->

Se a task traz a secao "Ameacas & Dados" ou criterios `CA-SEC-*`, o slice e **de risco**. Entao:

1. **O RED comeca pelo abuso.** O primeiro teste do slice e o teste de abuso (`Abuse-It` do
   `tdd-workflow`): ele executa o que o atacante tentaria e falha enquanto a defesa nao existe.
   Defesa escrita antes do teste e defesa nao verificada.
2. **Validar no boundary.** Input externo e validado onde entra — nao "mais pra frente, quando
   alguem lembrar". Se a validacao ficou espalhada, sinalize (Push Back Protocol).
3. **Deny-by-default.** Caminho nao previsto **nega**. Nunca `if (!temPermissao) { /* segue */ }`.
4. **Nenhum secret literal.** Chave, token e connection string vem de env — nunca no codigo, nem
   "temporario", nem em teste: fixture usa valor **sintetico**.
5. **Gatilho de aprovacao humana NAO se auto-aplica.** Se a task exige novo fluxo de auth, nova
   categoria de PII/pagamento, integracao terceira, mudanca de CORS, handler de upload, role elevado
   ou afrouxar rate limiting: apresente o diff e sinalize — nao aplique. Isso vale mesmo com a task
   pedindo explicitamente; e o mesmo protocolo da regra 5 (blocker honesto).
6. **`CA-SEC-*` e acceptance criteria como qualquer outro** — verificado antes de reportar done
   (secao "Verificacao de Acceptance Criteria"). `CA-SEC` nao verificado = task **incompleta**, nao
   "task feita com observacao".

O alvo e sempre o codigo **deste** projeto, na suite local: sao testes de defesa contra o proprio
sistema, nunca ferramenta apontada para terceiro.
````

### Passo 5: `plan-executor.md` — anti-degeneration e contrato

Em `## Anti-Degeneration Rules`, no bloco de regras especificas (apos a regra 6):

```markdown
7. **Never entregar slice de risco sem teste de abuso vermelho antes da defesa.** Defesa implementada
   sem um teste que provava o abuso e defesa nao verificada — e a proxima refatoracao a remove sem
   que nada acuse. Se o teste de abuso nao existe, a fase nao esta pronta.
```

E, em `## Formato de Saida (Contrato v2.0.0)` → "Regras especificas", uma linha:

```markdown
- Quando a fase e de risco: incluir um check por `CA-SEC-*` em `payload.checks[]` — ex:
  `{ "name": "fase-03-CA-SEC-1-idor", "status": "pass", "detail": "GET /api/orders/{id} de outro dono → 403" }`.
```

> **Nao mexer no JSON de exemplo nem no schema.** A linha acima e uma regra de preenchimento de um
> campo que **ja existe** (`payload.checks[]`); nenhum campo novo, nenhuma versao de contrato nova.
> Alterar o contrato v2.0.0 esta em `Perguntar antes` no PRD §Boundaries.

### Passo 6: verificacao e manifest

```bash
bun run test
bun run agents:contract
bun run harness:validate
bun run generate:manifest
git diff --numstat skills/execute-plan/SKILL.md agents/plan-executor.md
```

---

## Gotchas

- **Local (o mais importante) — ponteiro quebrado nao e pego por teste.** Esta fase referencia
  `Abuse-It`, `CA-SEC-*` e `### Seguranca (apenas fase de slice [RISCO])` **pelo nome**. Se as fases
  02 e 03 nao mergearam, o texto aponta para nada e nenhum gate reclama. Por isso o Passo 0 tem greps
  de pre-condicao — sao o gate que o repo nao tem.
- **G10-adjacente — `harness:validate` valida o prompt de todo `agents/*.md`.** `checkAgentContracts`
  exige que o texto contenha `contract_version`, `kind`, `status`, `reasoning`, `payload` e a string
  `"2.0.0"`. Nenhuma edicao desta fase remove esses tokens — mas rodar `bun run harness:validate` e
  `bun run agents:contract` e obrigatorio antes do PR.
- **G4 do plano — todas as edicoes sao aditivas, com UMA excecao controlada:** a linha do
  `NAO RECEBE` ("PRD completo...") e reescrita para ganhar a ressalva. Os termos originais permanecem
  integralmente; se o diff mostrar essa unica linha como removida+adicionada, conferir palavra por
  palavra. Nenhuma outra remocao e aceitavel.
- **G1 do plano — os dois arquivos sao rastreados** (`skills/execute-plan/SKILL.md` linha 1106 e
  `agents/plan-executor.md` linha 482 do manifest). `bun run generate:manifest` obrigatorio.
- **G12 do plano — fronteira defensiva no texto do agente.** A frase final da secao nova ("o alvo e
  sempre o codigo deste projeto") existe porque o `plan-executor` tem `Bash` nas ferramentas. Ela e a
  linha que impede a leitura de "escreva testes de abuso" como licenca para apontar algo para fora.
- **Local — nao criar um "Step 4b-SEC".** O contexto de seguranca entra **dentro** das listas que ja
  existem. Um passo separado sugeriria um fluxo paralelo, e o subagente e spawned uma vez so.
- **Local — a numeracao da regra 7 depende do arquivo real.** O `plan-executor.md` tem regras
  genericas 1-2 e especificas 3-6. Confirmar com
  `grep -n "^[0-9]\+\. \*\*Never" agents/plan-executor.md` antes de escrever "7." — se outro plano
  tiver adicionado uma regra no meio-tempo, usar o proximo numero livre.

---

## Verificacao

### Por que esta fase NAO tem TDD

Prosa de skill e prompt de agente. Nao ha unidade de codigo: o "comportamento" aqui e o que um LLM
faz ao ler o prompt, que e justamente o que o `grill-me-contract` declara nao testavel por assertion.
O que **e** verificavel por maquina: (a) os textos foram inseridos nos lugares certos (greps);
(b) o contrato do agente continua valido (`bun run agents:contract`, `harness:validate`); (c) nada
foi removido (`git diff --numstat`).

### GREP-RED (rodar ANTES de editar — registrar a saida)

```bash
grep -c "Ameacas & Dados" skills/execute-plan/SKILL.md   # esperado agora: 0
grep -c "CA-SEC" agents/plan-executor.md                 # esperado agora: 0
grep -c "Slice de Risco" agents/plan-executor.md         # esperado agora: 0
```

### Checklist

- [ ] **Pre-condicao:** greps do Passo 0 confirmam que fase-02 e fase-03 estao no branch base
- [ ] GREP-RED registrado
- [ ] Branch criada, **nao** e a `main` (G13)
- [ ] `execute-plan` Step 4b — contexto recortado no `RECEBE`:
      `grep -n "Ameacas & Dados" skills/execute-plan/SKILL.md` → aparece **3x**
      (RECEBE do 4b, ressalva do NAO RECEBE, Subagente RED do 4c)
- [ ] `execute-plan` — a ressalva do `NAO RECEBE` preserva "PRD completo":
      `grep -n "PRD completo" skills/execute-plan/SKILL.md` → 1 linha, contendo tambem `excecao`
- [ ] `plan-executor` — bullet no Contexto:
      `grep -n "casos de abuso" agents/plan-executor.md` → `>= 1`
- [ ] `plan-executor` — secao nova posicionada corretamente:
      `grep -n "## TDD no Ciclo Red-Green-Refactor\|## Slice de Risco\|## Verificacao de Acceptance Criteria" agents/plan-executor.md`
      → as tres **nesta ordem**
- [ ] `plan-executor` — os 6 itens da secao existem (leitura) e o item 5 lista os 7 gatilhos de
      aprovacao humana: `grep -c "rate limiting" agents/plan-executor.md` → `>= 1`
- [ ] `plan-executor` — regra 7 de anti-degeneration:
      `grep -n "Never entregar slice de risco" agents/plan-executor.md` → 1 linha, numerada como a
      proxima livre (conferir com `grep -n "^[0-9]\+\. \*\*Never" agents/plan-executor.md`)
- [ ] `plan-executor` — linha do contrato sem alterar schema:
      `grep -c "contract_version" agents/plan-executor.md` → **inalterado** em relacao ao baseline;
      `grep -c "\"2.0.0\"" agents/plan-executor.md` → inalterado
- [ ] `grep -c "CA-SEC" agents/plan-executor.md` → `>= 3`
- [ ] Fronteira defensiva presente: `grep -c "deste projeto" agents/plan-executor.md` → `>= 1` (G12)
- [ ] **Nunca diminuir (G4):** `git diff --numstat skills/execute-plan/SKILL.md agents/plan-executor.md`
      → linhas removidas = `0` ou `1` (exclusivamente a linha do `NAO RECEBE`, com os termos originais
      preservados)
- [ ] Contrato do agente: `bun run agents:contract` → verde
- [ ] Testes passam: `bun run test`
- [ ] Estrutural: `bun run harness:validate`
- [ ] TypeCheck: `bun run typecheck` — comparar delta com GT-01
- [ ] **Manifest (G1):** `bun run generate:manifest` no mesmo commit

---

## Criterio de Aceite

**Por maquina:**

- `grep -c "Ameacas & Dados" skills/execute-plan/SKILL.md` → `3`
- `grep -c "## Slice de Risco" agents/plan-executor.md` → `1`
- `grep -c "Never entregar slice de risco" agents/plan-executor.md` → `1`
- `grep -c "PRD completo" skills/execute-plan/SKILL.md` → `1` (a linha continua existindo)
- `bun run agents:contract && bun run harness:validate` → verde
- `git diff --numstat HEAD~1 -- skills/execute-plan/SKILL.md agents/plan-executor.md`
  → linhas removidas `<= 1`
- `bun run test` → verde

**RF-07 (verificacao por humano — o teste de fecho do plano):**

- Simule o prompt que o Step 4b montaria para uma fase de authz: ele contem a secao "Ameacas &
  Dados" recortada, os `CA-SEC-*` e a instrucao do Abuse-It — **e nao contem** o PRD inteiro?
- Leia so o `plan-executor.md`, sem contexto desta feature: um executor que nunca ouviu falar de
  shift-left saberia que precisa escrever o teste de abuso primeiro e que gatilho de aprovacao humana
  nao se auto-aplica?
- **Fecho do fio (o plano inteiro):** PRD (fase-01) → grill-me/design (fase-04) → slice + CA-SEC
  (fase-03) → RED com abuso (fase-02) → executor com o contexto (fase-05). Se algum elo aponta para
  nome que nao existe, o fio esta quebrado — e o grep de pre-condicao do Passo 0 e onde isso aparece.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

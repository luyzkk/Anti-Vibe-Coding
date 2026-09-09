<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `<!-- 2026-09-01 (Luiz/dev): teste de abuso no RED — PRD §RF-05 -->`
-->

# Fase 02: Abuse-It — teste de abuso no RED

**Plano:** 02 — Pipeline (codigo nasce seguro)
**Sizing:** 2h
**Depende de:** Nenhuma (arquivo diferente da fase-01 e da fase-03 — as tres rodam em paralelo)
**Visual:** false

---

## O que esta fase entrega

Um slice de risco deixa de entrar em GREEN sem que o ataque tenha sido escrito primeiro: o
`tdd-workflow` ganha o **Abuse-It**, gemeo do `Prove-It` — teste vermelho que prova a vulnerabilidade
antes de existir a defesa — e o subagente RED passa a receber o modelo de ameaca que ate agora
ficava parado no PRD.

Cobre **RF-05** e **CA-05**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/tdd-workflow/SKILL.md` | Modify | 5 insercoes aditivas: subsecao `Abuse-It`, contexto de ameaca no Subagente RED, 1 regra inviolavel, 2 red flags, 1 item de Verification |
| `plugin-manifest.json` | Modify | Regenerado (`bun run generate:manifest`) — o SKILL.md e rastreado |

**Um unico arquivo de skill.** Nenhuma outra fase deste plano o toca — merge limpo.

---

## Implementacao

### Passo 0: Baseline e branch

```bash
bun run test
git checkout -b feat/tdd-abuse-red     # G13: nunca na main
grep -n "### Prove-It" skills/tdd-workflow/SKILL.md   # ~linha 395 — a ancora desta fase
```

> **Leia o `### Prove-It` inteiro antes de escrever qualquer coisa.** Ele e o precedente exato:
> "quando a task e um bug report, NAO comece tentando corrigir; escreva primeiro um teste que
> reproduz o bug e confirme que ele FALHA". O Abuse-It e a mesma forma com outro gatilho — teste do
> ataque antes da defesa. **Mesmo tom, mesma estrutura, mesmo tamanho.** Nao inventar formato novo
> (**G9 desta fase**).

### Passo 1: Subsecao `Abuse-It`, logo apos o `### Prove-It`

Inserir entre o fim do paragrafo do Prove-It (a linha que aponta para
`/anti-vibe-coding:incident-response`) e a abertura de `<step id="4" ...>`:

````markdown
### Abuse-It (slice de risco) — teste de abuso ANTES da defesa

<!-- 2026-09-01 (Luiz/dev): teste de abuso no RED para slice de risco — PRD §RF-05, §CA-05.
     Modelado sobre o Prove-It acima: mesma forma (teste vermelho primeiro), outro gatilho. -->

Quando o slice e **de risco**: NAO comece implementando a defesa.
Escreva primeiro o teste que executa o abuso e confirme que ele FALHA. Falhar aqui significa "o
ataque passou" — a vulnerabilidade esta confirmada, do mesmo jeito que o Prove-It confirma o bug.
So entao implemente a defesa, rode o teste (deve passar) e rode a suite completa (sem regressoes).
Antes (errado): escrever o `checkPermission` e depois conferir manualmente se "esta funcionando".
Depois (certo): teste em que o usuario A le o recurso de B -> vermelho (o ataque passou) -> defesa
minima -> verde -> suite verde.

**O slice e de risco quando toca ao menos um destes seis:**
`auth/authz` · `PII/sensivel` · `input externo` (body, query, webhook, arquivo importado) ·
`upload` · `pagamento` · `integracao terceira`.
Sao os mesmos gatilhos da secao "Ameacas & Dados" do PRD
(`skills/write-prd/templates/prd-template.md`). Se o PRD tem a secao, os casos de abuso `AB-*` ja
estao escritos — cada `AB-*` vira um teste aqui, e o trabalho e traduzir, nao inventar.
Se o slice e de risco e o PRD nao tem a secao: o gatilho se perdeu na especificacao. Diga isso ao
dev antes de escrever o teste; nao monte o modelo de ameaca sozinho no meio do RED.

**Exemplos por categoria.** O teste e sempre escrito do ponto de vista do atacante, e a assertion e
a defesa que se espera:

| Categoria | O que o teste tenta | Assertion (defesa esperada) |
|---|---|---|
| Autorizacao (IDOR) | usuario A pede o recurso de B pelo id | `403` — e o corpo nao permite distinguir "nao e seu" de "nao existe" |
| Autenticacao | request sem token, e com token expirado | `401`, e nenhum efeito colateral persistido |
| Input externo | payload com `<script>`, `' OR 1=1 --`, `../../etc/passwd` | rejeitado na validacao do boundary, antes de virar query/HTML/caminho |
| Upload | MIME `image/png` declarado, magic bytes de outro tipo | rejeitado; o arquivo nao chega ao storage |
| Financeiro | valor negativo; a mesma cobranca reenviada duas vezes | rejeitado / idempotente — saldo final identico |
| Integracao terceira | webhook com assinatura HMAC invalida | descartado sem processar o corpo |

**Um teste de abuso por ciclo**, como qualquer outro teste (`## Deteccao: Test-First vs
Test-Driven`). Escrever os seis de uma vez e horizontal slicing com outro nome — e o pior lugar para
isso, porque testes de seguranca em lote sao escritos contra a ameaca **imaginada**, nao contra a que
o codigo revela quando existe.

**Onde o teste vive:** na mesma suite do slice, com o mesmo runner. Teste de abuso nao e categoria
separada nem pasta a parte — se ele so roda com flag especial, ele nao roda (`## Red Flags`).

**Escopo, sem ambiguidade:** estes testes atacam o codigo **deste** projeto, na suite local. Nao sao
ferramenta apontada para sistema de terceiro, e o valor de payload em fixture e o minimo que prova a
defesa — nunca um catalogo de exploracao.
````

### Passo 2: Contexto de ameaca chega ao Subagente RED

Em `## Context Isolation RED/GREEN` (~linha 180), o bloco `**Subagente RED (escreve testes):**`
(~linha 187) ganha uma linha, e o bloco GREEN ganha uma nota. **As linhas existentes permanecem
identicas** (G4):

```markdown
**Subagente RED (escreve testes):**
- Recebe: requisitos da task + codigo existente
- Recebe tambem, quando o slice e de risco: a secao "Ameacas & Dados" do PRD — classificacao do
  dado, fronteiras de confianca e os casos de abuso `AB-*`. Sem ela o RED escreve so o happy path:
  o subagente nao tem como adivinhar um modelo de ameaca que ficou no documento que ele nao recebeu.
  <!-- 2026-09-01 (Luiz/dev): contexto de ameaca chega ao RED — PRD §RF-05 -->
- Produz: arquivos de teste que FALHAM por assertion
- NAO produz codigo de producao
```

E, apos o bloco `**Subagente GREEN (implementa):**`, antes do paragrafo "**Quando usar:**":

```markdown
O GREEN continua sem ver o PRD, e isso nao muda com seguranca no jogo: **os testes de abuso sao a
forma como a ameaca chega ate ele**. A consequencia e direta — defesa que nao esta expressa num teste
nao vai existir no codigo, porque o unico contrato que o implementador enxerga sao os testes.
```

### Passo 3: Regra inviolavel

No bloco `<constraints>` / `## Regras Inviolaveis` (~linha 460), **acrescentar** um bullet ao fim da
lista (nenhum bullet existente muda):

```markdown
- Slice de risco (auth/authz, PII/sensivel, input externo, upload, pagamento, integracao terceira) NAO entra em GREEN sem ao menos um teste de abuso vermelho antes (Abuse-It)
```

### Passo 4: Red Flags

Em `## Red Flags` (~linha 501), acrescentar dois itens ao fim:

```markdown
- Slice que toca auth, PII, upload ou pagamento e cuja suite so exercita o caminho autorizado
- Teste chamado "de seguranca" em que `401`/`403`/"rejeitado" nunca aparece em nenhuma assertion — ele testa a feature, nao a defesa
```

### Passo 5: Verification

Em `## Verification — Auto-Auditoria Antes de Reportar "Pronto"` (~linha 514), acrescentar um item
apos o do Prove-It (a vizinhanca e intencional — sao a mesma disciplina):

```markdown
- [ ] Slice de risco inclui ao menos um teste de abuso que FALHAVA antes da defesa (Abuse-It)
```

### Passo 6: Verificacao e manifest

```bash
bun run test
bun run harness:validate
bun run generate:manifest
git diff --numstat skills/tdd-workflow/SKILL.md
```

---

## Gotchas

- **G9/local — modelar sobre o `Prove-It`, nao inventar.** O precedente ja existe no arquivo e e
  perfeito: bug report → teste que reproduz → fix. O Abuse-It e slice de risco → teste que abusa →
  defesa. Se a subsecao nova ficar com o dobro do tamanho do Prove-It ou com estrutura diferente
  (checklists, decision tree), ela destoa do arquivo — encurtar.
- **G3 do plano — `bun run lint` aparece neste arquivo e NAO se corrige.** O Step 7 e a Verification
  do `tdd-workflow` mencionam `bun run lint`: isso e instrucao da skill sobre o **projeto do
  usuario**, nao sobre este repo. Nao remover, nao "consertar" — regra "nunca diminuir" (G4).
- **G4 do plano — cinco insercoes, zero remocoes.** As quatro edicoes em listas existentes (Regras
  Inviolaveis, Red Flags, Verification, Subagente RED) sao **append**; nenhum bullet existente e
  reescrito. Guard: `git diff --numstat` com coluna de removidas = 0.
- **G12 do plano — fronteira defensiva no proprio texto.** A subsecao termina dizendo que o alvo e o
  codigo deste projeto na suite local. Manter essa frase: ela e o que impede a tabela de exemplos de
  ser lida como catalogo ofensivo.
- **G11 do plano — nada que pareca credencial viva nos exemplos.** Os payloads da tabela sao os
  canonicos minimos de validacao (`' OR 1=1 --`, `../../etc/passwd`); nenhum token, nenhuma chave.
- **Local — vocabulario identico ao da fase-01.** Os seis gatilhos aparecem com os mesmos termos e na
  mesma ordem (DP-3 do README). Se a fase-01 ainda nao mergeou, escrever assim mesmo: as duas
  convergem por definicao, e um grep futuro precisa achar o conjunto nos dois arquivos.
- **Local — o arquivo tem blocos `<step>`, `<constraints>`, `<context>` e `<verification>`.** A
  subsecao nova fica **fora** deles (como o `### Prove-It`, que vive entre `</step>` do 3 e `<step
  id="4">`). Nao aninhar markdown novo dentro de uma tag `<step>` existente — muda o contrato de
  leitura do passo.

---

## Verificacao

### Por que esta fase NAO tem TDD

Ela edita **prosa de skill** — nao ha unidade de codigo para exercitar. Um teste que afirmasse "o
arquivo contem a string Abuse-It", escrito logo depois de eu escrever a string, seria tautologico no
nascimento: nao consegue discordar da edicao. E, diferente da secao condicional da fase-01, aqui nao
ha fragilidade estrutural que justifique pagar um gate — o `Abuse-It` fica dentro de `## Os 7 Passos`,
colado ao `Prove-It`, num arquivo cujo conteudo nao tem historico de remocao silenciosa.

A verificacao e, portanto: **greps antes e depois** (GREP-RED / GREP-GREEN), guard de nao-remocao no
diff, e a suite como rede de nao-regressao estrutural.

### GREP-RED (rodar ANTES de editar — registrar a saida)

```bash
grep -c "Abuse-It" skills/tdd-workflow/SKILL.md            # esperado agora: 0
grep -c "teste de abuso" skills/tdd-workflow/SKILL.md      # esperado agora: 0
grep -n "Ameacas & Dados" skills/tdd-workflow/SKILL.md     # esperado agora: nenhuma linha
```

### Checklist

- [ ] GREP-RED registrado (as tres saidas acima, antes da edicao)
- [ ] Branch criada, **nao** e a `main` (G13)
- [ ] `### Prove-It` lido inteiro antes de escrever o `Abuse-It`
- [ ] Subsecao posicionada entre o Prove-It e o `<step id="4"`:
      `grep -n "### Prove-It\|### Abuse-It\|<step id=\"4\"" skills/tdd-workflow/SKILL.md`
      → as tres linhas **nesta ordem**
- [ ] Os 6 gatilhos aparecem na subsecao:
      `grep -c "auth/authz\|PII/sensivel\|input externo\|upload\|pagamento\|integracao terceira" skills/tdd-workflow/SKILL.md`
      → `>= 1` para cada termo (conferir a linha do bullet)
- [ ] Tabela de exemplos com as 6 categorias:
      `grep -c "IDOR\|magic bytes\|HMAC" skills/tdd-workflow/SKILL.md` → `>= 3`
- [ ] Contexto de ameaca no Subagente RED:
      `grep -n "Ameacas & Dados" skills/tdd-workflow/SKILL.md` → aparece **2x**
      (na subsecao Abuse-It e no bloco do Subagente RED)
- [ ] Regra inviolavel adicionada:
      `grep -n "NAO entra em GREEN sem ao menos um teste de abuso" skills/tdd-workflow/SKILL.md` → 1 linha
- [ ] Item de Verification adicionado:
      `grep -n "FALHAVA antes da defesa" skills/tdd-workflow/SKILL.md` → 1 linha
- [ ] Red flags adicionadas: `grep -c "so exercita o caminho autorizado" skills/tdd-workflow/SKILL.md` → `1`
- [ ] Fronteira defensiva presente: `grep -n "deste projeto" skills/tdd-workflow/SKILL.md` → `>= 1` (G12)
- [ ] **Nunca diminuir (G4):** `git diff --numstat skills/tdd-workflow/SKILL.md` → linhas removidas = `0`
- [ ] Blocos `<step>`/`<constraints>` intactos:
      `grep -c "<step id=" skills/tdd-workflow/SKILL.md` → `7` (mesmo numero de antes)
- [ ] Testes passam: `bun run test`
- [ ] Estrutural: `bun run harness:validate`
- [ ] TypeCheck: `bun run typecheck` — comparar delta com GT-01
- [ ] **Manifest (G1):** `bun run generate:manifest` no mesmo commit
- [ ] `bun run lint` NAO existe neste repo (G3) — nao tentar

---

## Criterio de Aceite

**Por maquina:**

- `grep -c "### Abuse-It" skills/tdd-workflow/SKILL.md` → `1`
- `grep -c "Ameacas & Dados" skills/tdd-workflow/SKILL.md` → `2` (subsecao + Subagente RED)
- `grep -c "NAO entra em GREEN sem ao menos um teste de abuso" skills/tdd-workflow/SKILL.md` → `1`
- `grep -c "<step id=" skills/tdd-workflow/SKILL.md` → `7` (inalterado)
- `git diff --numstat HEAD~1 -- skills/tdd-workflow/SKILL.md` → linhas removidas = `0`
- `bun run test && bun run harness:validate` → verde
- `git status --porcelain plugin-manifest.json` → vazio apos o commit

**CA-05 do PRD (verificacao por humano):**

- Lendo so a subsecao nova, com um slice de authz em maos: da para saber **qual teste escrever
  primeiro** e **qual assertion usar**, sem abrir outro arquivo? Se precisar consultar o `/security`
  para dar o primeiro passo, a subsecao esta incompleta.
- Um leitor que conhece o `Prove-It` reconhece a mesma forma no `Abuse-It`? (mesmo tom, mesmo
  tamanho, mesma promessa: vermelho primeiro)

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

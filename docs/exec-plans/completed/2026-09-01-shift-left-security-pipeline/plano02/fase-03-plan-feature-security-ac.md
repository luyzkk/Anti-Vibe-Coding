<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `<!-- 2026-09-01 (Luiz/dev): criterio de aceite de seguranca — PRD §RF-06 -->`
-->

# Fase 03: Slice de risco carrega criterio de aceite de seguranca

**Plano:** 02 — Pipeline (codigo nasce seguro)
**Sizing:** 1.5h
**Depende de:** Nenhuma (arquivos disjuntos das fases 01 e 02 — as tres em paralelo)
**Visual:** false

---

## O que esta fase entrega

Risco vira **propriedade do slice**, nao impressao do executor: o `/plan-feature` classifica cada
slice contra os seis gatilhos, e o slice marcado carrega ao menos um `CA-SEC-*` — criterio de aceite
de seguranca com a mesma forca dos outros. A fase gerada a partir dele nasce com o item de seguranca
no `## Verificacao`, e so ela: fase trivial continua trivial.

Cobre **RF-06**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/plan-feature/SKILL.md` | Modify | Step 3: subsecao "Classificacao de Risco do Slice" + formato `CA-SEC-*`. Step 5: 1 linha na lista "Uma fase DEVE conter" |
| `skills/plan-feature/templates/fase-template.md` | Modify | Bloco **condicional** `### Seguranca` dentro de `## Verificacao` |
| `plugin-manifest.json` | Modify | Regenerado — os dois sao rastreados |

---

## Implementacao

### Passo 0: Baseline, branch e leitura de alcance

```bash
bun run test
bun test skills/lib/__tests__/universal-principles.test.ts   # o teste que le o fase-template (G7)
git checkout -b feat/plan-feature-security-ac                # G13
```

> **Antes de tocar no `fase-template.md`, entenda o alcance (G9).** Esse arquivo e consumido por
> **toda** fase que o `/plan-feature` gerar daqui pra frente — inclusive as triviais. Cada linha
> adicionada la se multiplica por centenas. Por isso o bloco novo e condicional e vem com comentario
> HTML dizendo quando omitir, no mesmo padrao de `## Boundaries` e `## Fluxos UX por Ator` do
> `prd-template.md`.

### Passo 1: `Classificacao de Risco do Slice` no Step 3

Inserir no fim do `## Step 3 — Decompor em Vertical Slices`, apos o bloco `### Slices Subsequentes`
e antes do separador que abre o `## Step 4`:

````markdown
### Classificacao de Risco do Slice

<!-- 2026-09-01 (Luiz/dev): risco e propriedade do slice, nao impressao do executor — PRD §RF-06 -->

Ao nomear cada slice, marcar se ele e **de risco**. E de risco quando toca ao menos um dos seis
gatilhos — os mesmos da secao "Ameacas & Dados" do PRD e do Abuse-It do `/anti-vibe-coding:tdd-workflow`:

`auth/authz` · `PII/sensivel` · `input externo` · `upload` · `pagamento` · `integracao terceira`

Notacao, direto no nome do slice:

```
Slice 3: usuario autenticado ve apenas os proprios pedidos  [RISCO: auth/authz]
Slice 4: importar planilha de alunos                        [RISCO: input externo, PII/sensivel]
Slice 5: trocar a cor do badge de status
```

Slice sem gatilho **nao recebe marca** — nao existe `[RISCO: nenhum]`. A ausencia e a marca, e e o
que mantem o plano legivel: se tudo e marcado, nada e.

A marca tem quatro consequencias (nao e etiqueta decorativa):

1. O slice carrega ao menos UM criterio de aceite de seguranca `CA-SEC-*` (formato abaixo).
2. A fase gerada dele preenche o bloco `### Seguranca` do `## Verificacao` (`templates/fase-template.md`).
3. O `/anti-vibe-coding:tdd-workflow` exige teste de abuso no RED antes da defesa (Abuse-It).
4. Vale o principio 5 do Step 4 — **risco pede task MENOR**. Slice marcado que estourou 2h se divide;
   nao se aceita "e maior porque e mais delicado".

**Formato do criterio de aceite de seguranca.** Um `CA-SEC-*` diz o que o atacante tenta, o que o
sistema responde e — a parte que costuma faltar — o que NAO pode acontecer:

```
CA-SEC-{n}: Dado {ator sem direito, ou input hostil},
            quando {acao de abuso},
            entao {defesa observavel: 403 / 401 / rejeicao na validacao / evento no log}
            — e NAO {vazar existencia do recurso / persistir / cobrar / gravar sem sanitizar}
```

Exemplo preenchido (assim, nao com placeholders):

```
CA-SEC-1: Dado um usuario autenticado que NAO e dono do pedido, quando faz GET /api/orders/{id},
          entao a API responde 403 — e NAO permite distinguir "nao e seu" de "nao existe"
CA-SEC-2: Dado um CSV com formula `=cmd|...` numa celula, quando o admin importa,
          entao o valor e gravado como texto — e NAO e interpretado na exportacao
```

**De onde vem o conteudo:** se o PRD tem a secao "Ameacas & Dados", cada caso de abuso `AB-*` de la
vira um `CA-SEC-*` aqui — traducao direta, um para um. Se o slice e de risco e o PRD **nao** tem a
secao, o gatilho se perdeu na especificacao: registrar como risco no `README.md` do plano e sinalizar
ao dev. Nao montar o modelo de ameaca sozinho durante o planejamento — e a mesma regra de "nao
inventar requisito que o dev nao mencionou".
````

### Passo 2: uma linha no Step 5

Em `### Cada Plano tem Fases`, dentro do bloco `Uma fase DEVE conter:`, acrescentar apos
`- Checklist de verificacao`:

```markdown
- Criterio de aceite de seguranca (CA-SEC-*), quando a fase vem de slice marcado [RISCO]
```

> Insercao de **uma** linha dentro de um bloco cercado. Nenhum item existente muda (G4).

### Passo 3: bloco condicional no `fase-template.md`

Dentro de `## Verificacao`, entre o bloco `### TDD` e o `### Checklist`:

````markdown
### Seguranca (apenas fase de slice [RISCO])

<!-- 2026-09-01 (Luiz/dev): criterio de seguranca first-class na fase — PRD §RF-06 -->
<!-- OPCIONAL — OMITIR este bloco inteiro quando a fase NAO vem de slice marcado [RISCO] no
     Step 3 do /plan-feature (auth/authz, PII/sensivel, input externo, upload, pagamento,
     integracao terceira). Fase trivial nao paga o atrito. -->

- [ ] **Teste de abuso no RED:** o teste do abuso FALHOU antes de a defesa existir (Abuse-It)
  - Comando: `{comando que roda so o teste de abuso}`
  - Resultado esperado no RED: o ataque passa — a defesa ainda nao existe
- [ ] **{CA-SEC-N}:** {colar o criterio inteiro} — verificado por `{comando}`
- [ ] **Nenhum gatilho de aprovacao humana foi auto-aplicado.** Se a fase tocou novo fluxo de auth,
      nova categoria de PII/pagamento, integracao terceira, configuracao de CORS, handler de upload,
      role elevado ou rate limiting: o diff foi apresentado e confirmado antes de aplicar
- [ ] Nenhum secret literal entrou no codigo ou na fixture (valor sintetico apenas)
````

### Passo 4: verificacao e manifest

```bash
bun run test
bun test skills/lib/__tests__/universal-principles.test.ts
bun run harness:validate
bun run generate:manifest
git diff --numstat skills/plan-feature/
```

---

## Gotchas

- **G9 do plano — alcance do `fase-template.md`.** Toda fase futura herda o que entrar ali. O bloco
  e condicional **e** curto: quatro checkboxes. Se crescer para dez, ele deixa de ser omitido na
  pratica e vira ruido em fase trivial — que e exatamente o que a condicionalidade existe para evitar.
- **G7 do plano — o teste que le o `fase-template.md`.**
  `skills/lib/__tests__/universal-principles.test.ts` exige que o arquivo contenha o literal
  `Comment Provenance` **e** um comentario no formato `// YYYY-MM-DD (autor):`. Ambos vivem no
  cabecalho HTML do topo do template — **nao mexer nesse cabecalho**. O bloco novo usa comentario
  HTML (`<!-- -->`), que nao interfere com a regex `//`.
- **G4 do plano — tres insercoes, zero remocoes.** A linha do Step 5 entra dentro de um bloco
  cercado ` ``` ` — cuidado para inserir **dentro** do bloco (antes do fechamento), nao depois.
- **G3 do plano — o `### Checklist` do `fase-template.md` sugere `bun run lint`.** Isso e conteudo do
  template sobre o projeto do usuario; **nao corrigir nem remover** nesta fase (nunca diminuir). O
  que a fase-03 nao pode fazer e **copiar** esse comando para o bloco novo.
- **Local — `CA-SEC-*` e prefixo novo, e proposital.** Os criterios normais do PRD sao `CA-01..N`.
  Usar um prefixo distinto deixa o grep trivial (`grep -rn "CA-SEC-" docs/exec-plans/`) e evita
  colisao de numeracao quando o PRD ja tem 12 criterios.
- **Local — a marca vai no NOME do slice, nao numa tabela separada.** Uma tabela paralela de "riscos
  por slice" duplicaria informacao e sairia de sincronia na primeira renomeacao. `[RISCO: ...]` no
  nome viaja junto com o slice para o plano, para a fase e para o prompt do executor.
- **Local — nao criar um "Step 3.5".** A classificacao e parte de decompor slices; um passo proprio
  sugeriria que ela acontece depois, quando o slice ja tem nome e escopo fechados. Ela e subsecao do
  Step 3 justamente para acontecer **enquanto** o slice esta sendo desenhado.

---

## Verificacao

### Por que esta fase NAO tem TDD

Duas edicoes de prosa de skill e um bloco de template. Nao ha unidade de codigo para exercitar, e um
teste "o arquivo contem `CA-SEC`" escrito logo apos eu escrever `CA-SEC` seria tautologico no
nascimento. Diferente da fase-01, aqui **ja existe** um teste lendo o `fase-template.md`
(`universal-principles.test.ts`, G7) — a guarda estrutural do arquivo esta coberta, e o que esta fase
adiciona e conteudo opcional que nao carrega contrato entre skills.

Verificacao: GREP-RED → editar → GREP-GREEN, guard de nao-remocao, suite verde.

### GREP-RED (rodar ANTES de editar — registrar a saida)

```bash
grep -c "CA-SEC" skills/plan-feature/SKILL.md                      # esperado agora: 0
grep -c "\[RISCO" skills/plan-feature/SKILL.md                     # esperado agora: 0
grep -c "RISCO" skills/plan-feature/SKILL.md                       # esperado agora: 1 (o "5. RISCO
                                                                   #   PROPORCIONAL A GRANULARIDADE"
                                                                   #   do Step 4 — pre-existente)
grep -c "Seguranca" skills/plan-feature/templates/fase-template.md # esperado agora: 0
```

> **Verificado no codebase:** `RISCO` ja aparece **uma** vez no `SKILL.md` (principio 5 do Step 4,
> "risco proporcional a granularidade"). Nao e regressao nem duplicacao — a subsecao nova referencia
> justamente esse principio na consequencia 4. O grep util para o depois e `\[RISCO`, que so casa com
> a notacao nova.

### Checklist

- [ ] GREP-RED registrado (as tres saidas acima)
- [ ] Branch criada, **nao** e a `main` (G13)
- [ ] Subsecao no lugar certo:
      `grep -n "### Slices Subsequentes\|### Classificacao de Risco do Slice\|## Step 4" skills/plan-feature/SKILL.md`
      → as tres **nesta ordem**
- [ ] Os 6 gatilhos, com o vocabulario exato do plano (DP-3):
      `grep -n "auth/authz.*PII/sensivel.*input externo.*upload.*pagamento.*integracao terceira" skills/plan-feature/SKILL.md`
      → 1 linha
- [ ] Formato do criterio presente:
      `grep -c "CA-SEC-{n}\|CA-SEC-1" skills/plan-feature/SKILL.md` → `>= 2`
- [ ] As 4 consequencias da marca estao escritas (leitura — a lista numerada 1..4 existe)
- [ ] Linha nova no Step 5:
      `grep -n "quando a fase vem de slice marcado" skills/plan-feature/SKILL.md` → 1 linha, **dentro**
      do bloco cercado de "Uma fase DEVE conter"
- [ ] Bloco condicional no template:
      `grep -n "### Seguranca (apenas fase de slice" skills/plan-feature/templates/fase-template.md` → 1 linha
- [ ] Condicionalidade explicita:
      `grep -c "OPCIONAL" skills/plan-feature/templates/fase-template.md` → `1`
- [ ] Bloco posicionado entre TDD e Checklist:
      `grep -n "### TDD\|### Seguranca\|### Checklist" skills/plan-feature/templates/fase-template.md`
      → as tres **nesta ordem**
- [ ] **G7 preservado:** `bun test skills/lib/__tests__/universal-principles.test.ts` → verde
      (o cabecalho `Comment Provenance` + comentario `// YYYY-MM-DD` intactos)
- [ ] **Nunca diminuir (G4):** `git diff --numstat skills/plan-feature/` → linhas removidas = `0` nos
      dois arquivos
- [ ] O bloco novo NAO contem `bun run lint` (G3):
      `grep -c "bun run lint" skills/plan-feature/templates/fase-template.md` → `1` (so o pre-existente)
- [ ] Testes passam: `bun run test`
- [ ] Estrutural: `bun run harness:validate`
- [ ] TypeCheck: `bun run typecheck` — comparar delta com GT-01
- [ ] **Manifest (G1):** `bun run generate:manifest` no mesmo commit

---

## Criterio de Aceite

**Por maquina:**

- `grep -c "### Classificacao de Risco do Slice" skills/plan-feature/SKILL.md` → `1`
- `grep -c "CA-SEC" skills/plan-feature/SKILL.md` → `>= 4`
- `grep -c "\[RISCO" skills/plan-feature/SKILL.md` → `>= 3` (notacao no exemplo + consequencias)
- `grep -c "### Seguranca (apenas fase de slice" skills/plan-feature/templates/fase-template.md` → `1`
- `grep -c "OPCIONAL" skills/plan-feature/templates/fase-template.md` → `1`
- `grep -c "bun run lint" skills/plan-feature/templates/fase-template.md` → `1` (inalterado)
- `git diff --numstat HEAD~1 -- skills/plan-feature/` → linhas removidas = `0`
- `bun test skills/lib/__tests__/universal-principles.test.ts` → `0 fail`
- `bun run test && bun run harness:validate` → verde

**RF-06 (verificacao por humano):**

- Pegue um slice real de authz e escreva um `CA-SEC-1` seguindo so o formato da subsecao nova: o
  resultado e verificavel por um comando, ou virou frase de boa intencao ("o endpoint deve ser
  seguro")? Se virou frase, o formato precisa de mais um exemplo preenchido.
- Pegue uma fase trivial (trocar cor de badge): o bloco `### Seguranca` do template e obviamente
  omitivel para quem esta gerando a fase, sem precisar perguntar?

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

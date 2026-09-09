<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `<!-- 2026-09-01 (Luiz/dev): secao condicional — PRD §RF-04 -->`
-->

# Fase 01: Secao "Ameacas & Dados" condicional no PRD

**Plano:** 02 — Pipeline (codigo nasce seguro)
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase; paralelizavel com fase-02 e fase-03)
**Visual:** false

---

## O que esta fase entrega

Um PRD de feature de risco passa a carregar o modelo de ameaca **antes** de qualquer codigo — e uma
feature trivial continua cabendo em 1-2 paginas, porque a secao e condicional a seis gatilhos
explicitos e o gate novo trava isso contra remocao silenciosa.

Cobre **RF-04** e **CA-03**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/write-prd-contract.test.ts` | Create | Gate de contrato do write-prd: a secao existe, tem os 5 blocos, e a skill conhece os 6 gatilhos |
| `skills/write-prd/templates/prd-template.md` | Modify | Nova secao `## Ameacas & Dados` condicional, entre `## Requisitos Nao-Funcionais` e `## Boundaries` |
| `skills/write-prd/SKILL.md` | Modify | Linha nova na tabela do Step 3 + subsecao "Triagem de risco" + destaque no Step 4 + item na Verification |
| `plugin-manifest.json` | Modify | Regenerado (`bun run generate:manifest`) — os dois arquivos acima sao rastreados |

---

## Implementacao

### Passo 0: Baseline verde (antes de tocar em qualquer coisa)

```bash
bun run test
bun run harness:validate
git rev-parse --abbrev-ref HEAD   # confirmar que NAO e main (G13)
git checkout -b feat/prd-threat-section
```

Anotar o numero de testes que passam. **Este e o baseline** — no fim da fase o numero sobe pelos
testes novos e nao desce por nenhum.

> **G8:** nao ha teste que enumere secoes do `prd-template.md`. O unico que le o arquivo e
> `skills/lib/__tests__/universal-principles.test.ts`, e ele so exige o literal `Comment Provenance`
> e a ordem `Outcomes` antes de `Mecanismo`. Nao ha teste de contrato a **ajustar** nesta fase — ha
> um a **criar**.

### Passo 1: RED — escrever `tests/write-prd-contract.test.ts`

Novo arquivo, no estilo do `tests/grill-me-contract.test.ts` (**G10**: helper com fences, CRLF
normalizado, mensagem de falha explicando o porque, assercao ancorada no conteudo):

```typescript
// 2026-09-01 (Luiz/dev): gate de contrato do write-prd — PRD §RF-04, §CA-03.
//
// Ate aqui o write-prd tinha ZERO cobertura de contrato: nenhum teste enumera secoes do
// prd-template.md (universal-principles.test.ts so olha "Comment Provenance" e a ordem
// Outcomes → Mecanismo). A secao "Ameacas & Dados" e CONDICIONAL por design (PRD §Decisoes D2) —
// ela e legitimamente ausente da maioria dos PRDs gerados, e conteudo condicional e exatamente o
// que uma passada de "simplificacao" apaga sem que nada acuse.
//
// Assere apenas **contrato** — o que nao pode mudar em silencio. A prosa de dentro da secao (as
// perguntas, os exemplos) pode ser reescrita a vontade sem tocar neste arquivo.
//
// ─────────────────────────────────────────────────────────────────────────────
// O que este arquivo deliberadamente NAO testa:
//   - que o agente CLASSIFICA o risco corretamente — comportamento de LLM, nao verificavel
//   - que os casos de abuso escritos num PRD real sao bons
//   - o fluxo write-prd → plan-feature → tdd-workflow — exigiria fixture de conversa
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.join(import.meta.dir, '..')

/** CRLF quebra regex ancorada em `$` — repo Windows, mesmo cuidado do grill-me-contract. */
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/\r/g, '')

const template = read('skills/write-prd/templates/prd-template.md')
const skill = read('skills/write-prd/SKILL.md')

/**
 * Corpo de uma secao `## Titulo` ate o proximo `## ` de topo (exclusivo).
 * Rastreia fences porque templates markdown embutem headings DENTRO de blocos cercados —
 * uma busca ingenua por `\n## ` corta a secao no primeiro deles.
 */
function section(doc: string, startsWith: string): string {
  const lines = doc.split('\n')
  const start = lines.findIndex((l) => l.startsWith(startsWith))
  if (start === -1) return ''

  const out: string[] = []
  let inFence = false
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('```')) inFence = !inFence
    if (!inFence && line.startsWith('## ')) break
    out.push(line)
  }
  return out.join('\n')
}

describe('write-prd — secao "Ameacas & Dados" no template (RF-04)', () => {
  // Tolera acento: um "conserto" futuro de ortografia nao deve reprovar o gate (G14).
  const HEADING = /^## Amea[cç]as & Dados/m

  test('a secao existe no template', () => {
    expect(
      HEADING.test(template),
      `[parity gate "nunca diminuir" — RF-04] Secao "Ameacas & Dados" ausente do prd-template.md. ` +
        `E onde o modelo de ameaca entra ANTES do codigo: classificacao do dado, fronteiras de ` +
        `confianca, superficie nova e casos de abuso. Sem ela o PRD volta a delegar seguranca para ` +
        `a auditoria do fim do pipeline. Restaure a secao, nao remova esta assercao.`,
    ).toBe(true)
  })

  const body = () => section(template, '## Ameacas & Dados') || section(template, '## Ameaças & Dados')

  // Ancorado no CONTEUDO, nao no token do heading: `includes('## Ameacas & Dados')` casaria com
  // `## Ameacas & Dados REMOVIDO` e passaria vacuamente (licao do grill-me-contract).
  test.each([
    ['### Classificacao do dado', 'que dado a feature toca e de que classe (PII, credencial, financeiro)'],
    ['### Fronteiras de confianca', 'onde input nao-confiavel entra e precisa de validacao'],
    ['### Superficie nova', 'rotas, handlers e campos que passam a existir'],
    ['### Casos de abuso', 'o que um usuario mal-intencionado tentaria — vira teste no RED'],
    ['### Gatilhos de aprovacao humana', 'o que exige diff apresentado antes de aplicar'],
  ])('a secao mantem o bloco "%s"', (heading, why) => {
    expect(
      body().includes(heading),
      `[parity gate "nunca diminuir" — RF-04] Bloco ausente de "Ameacas & Dados": ${heading} — ` +
        `${why}. Os cinco blocos sao o contrato consumido adiante: os casos de abuso viram CA-SEC-* ` +
        `no /plan-feature e teste de abuso no RED do /tdd-workflow.`,
    ).toBe(true)
  })

  test('a secao e CONDICIONAL, como Boundaries e Fluxos UX (D2)', () => {
    const idx = template.search(HEADING)
    const preamble = template.slice(Math.max(0, idx - 900), idx)
    expect(
      /OPCIONAL/.test(preamble) && /omitir/i.test(preamble),
      `[parity gate — PRD §Decisoes D2] O comentario de condicionalidade sumiu do topo da secao. ` +
        `Sem ele a secao vira sempre-on e o PRD deixa de caber em 1-2 paginas para feature trivial — ` +
        `que e exatamente o custo que D2 recusou. O padrao e o mesmo de "## Boundaries".`,
    ).toBe(true)
  })
})

describe('write-prd — triagem de risco na skill (CA-03)', () => {
  // Os seis gatilhos sao vocabulario COMPARTILHADO: tdd-workflow (Abuse-It), plan-feature
  // (classificacao do slice) e grill-me (ramos de abuso) usam a mesma lista. Divergir aqui
  // desalinha o pipeline inteiro em silencio.
  test.each([
    ['autenticacao ou autorizacao', /auth|autoriza/i],
    ['dados sensiveis / PII', /PII|sens[ií]ve/i],
    ['input externo', /input externo/i],
    ['upload de arquivo', /upload/i],
    ['pagamento / financeiro', /pagamento|financeir/i],
    ['integracao com terceiro', /terceir/i],
  ])('a skill conhece o gatilho "%s"', (label, re) => {
    expect(
      re.test(skill),
      `[parity gate — RF-04 / CA-03] Gatilho de risco ausente do write-prd/SKILL.md: ${label}. ` +
        `Os seis gatilhos decidem se a secao "Ameacas & Dados" existe. Um gatilho que some faz a ` +
        `feature correspondente nascer sem modelo de ameaca, e nenhum passo adiante recupera isso.`,
    ).toBe(true)
  })

  test('omitir a secao exige justificativa registrada, nao silencio', () => {
    expect(
      /justificativa/i.test(skill) && /omitir/i.test(skill),
      `[parity gate — CA-03] Sumiu a regra de que omitir a secao exige justificativa de 1 linha nos ` +
        `Nao-funcionais. Sem ela "nao tem secao" fica indistinguivel de "ninguem pensou no assunto" — ` +
        `e a ausencia deixa de ser uma decisao revisavel pelo dev.`,
    ).toBe(true)
  })
})
```

**Rodar e confirmar o RED:**

```bash
bun test tests/write-prd-contract.test.ts
```

Esperado: **falha por assertion**, com as mensagens `[parity gate ...] Secao "Ameacas & Dados"
ausente...`. Se falhar por `Cannot find module` ou erro de sintaxe, **nao e RED** — e teste quebrado;
corrigir antes de prosseguir.

### Passo 2: GREEN (a) — secao no `prd-template.md`

Inserir **entre** o fim de `## Requisitos Nao-Funcionais` e o comentario HTML que abre
`## Boundaries` (hoje linhas ~119-124). Posicao escolhida por dois motivos: (1) o bullet
`**Seguranca:**` dos Nao-funcionais e a porta de entrada natural do assunto, e a secao o expande;
(2) **G7** — precisa ficar bem abaixo de `Outcomes`/`Mecanismo`, porque o
`universal-principles.test.ts` compara a posicao da **primeira** ocorrencia dessas duas palavras no
arquivo.

````markdown
<!-- 2026-09-01 (Luiz/dev): modelo de ameaca entra na spec, nao na auditoria — PRD §RF-04, §Decisoes D2 -->
<!-- OPCIONAL — incluir SOMENTE se a feature dispara ao menos UM gatilho de risco:
     autenticacao/autorizacao · dados sensiveis ou PII · input externo (body, query, webhook,
     arquivo importado) · upload de arquivo · pagamento/financeiro · integracao com terceiro.
     Nenhum gatilho? OMITIR a secao inteira e registrar UMA linha em "Requisitos Nao-Funcionais":
     "Seguranca: nenhum gatilho de risco disparado — secao Ameacas & Dados omitida."
     Feature trivial nao paga o atrito — o PRD continua cabendo em 1-2 paginas. -->
## Ameacas & Dados (apenas features de risco)

**Gatilhos disparados:** {listar os que se aplicam — se nenhum se aplica, esta secao nao deveria existir}

### Classificacao do dado

| Dado que a feature toca | Classe | Onde vive |
|---|---|---|
| {ex: email do aluno} | PII | tabela `users`, coluna `email` |
| {ex: token do provider} | credencial | secret manager / env — nunca no banco, nunca no repo |

Classes: `publico` · `interno` · `PII` · `credencial` · `financeiro`.
Classificar ANTES de modelar: a classe decide criptografia, retencao, log e quem enxerga.

### Fronteiras de confianca

Onde input NAO-confiavel entra no sistema. Cada fronteira precisa de validacao **no boundary**,
nao "mais pra frente":

- {ex: body de `POST /api/enrollments` — vem do browser; nada aqui e confiavel}
- {ex: webhook do gateway — validar assinatura HMAC ANTES de parsear o corpo}
- {ex: CSV importado pelo admin — admin confiavel nao torna o arquivo confiavel}

### Superficie nova

O que passa a existir e antes nao existia (rota, endpoint, campo de formulario, job, handler):

- {ex: `POST /api/uploads` — primeiro handler de arquivo do projeto}

### Casos de abuso

"O que um usuario mal-intencionado tentaria?" Cada linha vira criterio de aceite e, no
`/anti-vibe-coding:tdd-workflow`, um teste de abuso escrito ANTES da defesa:

| # | Abuso tentado | Defesa esperada | Vira CA |
|---|---|---|---|
| AB-1 | {usuario A pede `GET /api/orders/{id}` de B} | 403 — e o corpo nao revela se o id existe | CA-0X |
| AB-2 | {upload com MIME `image/png` declarado e magic bytes de executavel} | rejeitado antes de chegar ao storage | CA-0X |
| AB-3 | {mesma cobranca reenviada duas vezes (retry/replay)} | idempotente — saldo final identico | CA-0X |

### Gatilhos de aprovacao humana

Marcar os que esta feature dispara. Cada um exige **diff apresentado e confirmacao do humano** antes
de aplicar — nunca auto-aplicar (`skills/security/SKILL.md` §Aprovacao Humana Necessaria):

- [ ] Novo fluxo de autenticacao ou alteracao de logica de auth existente
- [ ] Armazenar nova categoria de PII ou dados de pagamento
- [ ] Nova integracao com servico terceiro (OAuth provider, webhook externo, SDK de pagamento)
- [ ] Mudanca na configuracao de CORS (ampliar origens ou metodos permitidos)
- [ ] Novo handler de upload de arquivos
- [ ] Conceder roles ou permissoes elevadas
- [ ] Alterar configuracao de rate limiting (afrouxar limites ou desabilitar)

---
````

> **G4 (nunca diminuir):** esta e uma **insercao**. Nenhuma linha de `## Requisitos Nao-Funcionais`
> nem de `## Boundaries` muda. O separador `---` no fim do bloco preserva o ritmo do arquivo.

### Passo 3: GREEN (b) — triagem de risco no `skills/write-prd/SKILL.md`

**3.1 — Linha nova na tabela do Step 3** (`| Secao | Fonte dos dados |`), imediatamente apos a linha
`| Nao-funcionais | ... |`:

```markdown
| Ameacas & Dados | **Condicional** — triagem de risco abaixo. Sem gatilho: omitir e justificar em 1 linha nos Nao-funcionais |
```

**3.2 — Subsecao nova no Step 3**, logo apos o bloco "Regras de geracao" e antes do exemplo de
transformacao vago→mensuravel:

```markdown
### Triagem de risco — decidir a secao "Ameacas & Dados" (RF-04 / D2)

<!-- 2026-09-01 (Luiz/dev): secao condicional preserva "PRD cabe em 1-2 paginas" — PRD §Decisoes D2 -->

Antes de escrever o PRD, responder SIM/NAO aos seis gatilhos. **Um SIM basta** para a secao existir:

| # | Gatilho | Sinal na descricao ou no Step 2 |
|---|---------|--------------------------------|
| 1 | Autenticacao ou autorizacao | login, sessao, token, role, permissao, RLS, "so o dono" |
| 2 | Dados sensiveis / PII | email, CPF, telefone, endereco, saude, documento, foto |
| 3 | Input externo | body de request, query param, webhook, CSV importado, conteudo de terceiro |
| 4 | Upload de arquivo | multipart, storage bucket, avatar, anexo |
| 5 | Pagamento / financeiro | cobranca, saldo, split, gateway, assinatura, reembolso |
| 6 | Integracao com terceiro | OAuth provider, SDK externo, API de parceiro, webhook recebido |

- **Ao menos 1 SIM** → incluir `## Ameacas & Dados` PREENCHIDA (nao com os placeholders do template).
  Cada caso de abuso `AB-*` vira criterio de aceite aqui e teste de abuso no RED do
  `/anti-vibe-coding:tdd-workflow`.
- **Zero SIM** → OMITIR a secao e gravar UMA linha nos Nao-funcionais:
  `**Seguranca:** nenhum gatilho de risco disparado — secao Ameacas & Dados omitida.`
  A justificativa e obrigatoria: sem ela, "nao tem secao" fica indistinguivel de "ninguem pensou no
  assunto", e o dev perde a chance de discordar.
- **Na duvida entre incluir e omitir: incluir.** Falso positivo custa oito linhas de PRD; falso
  negativo custa uma vulnerabilidade que nasce dentro do codigo e so aparece na auditoria do fim.
```

**3.3 — Destaque no Step 4** (bloco numerado "Apresentar o PRD gerado destacando"), item 5 novo apos
"4. PEDIR VALIDACAO":

```markdown
5. AMEACAS — se a secao "Ameacas & Dados" existe: listar os gatilhos disparados e os casos AB-*, e
   perguntar "falta algum abuso obvio que alguem tentaria? Cada AB-* vira teste ANTES do codigo".
   Se a secao foi omitida: dizer em uma linha qual justificativa foi gravada, para o dev poder
   discordar da triagem em vez de descobrir a omissao depois.
```

**3.4 — Item novo na `## Verification`**, no fim da lista:

```markdown
- [ ] A triagem de risco foi feita: a secao "Ameacas & Dados" esta presente e preenchida, OU ausente
      com justificativa de 1 linha nos Nao-funcionais.
```

### Passo 4: GREEN — rodar o gate

```bash
bun test tests/write-prd-contract.test.ts
```

Esperado: todos passam. Se algum gatilho ainda falhar, o termo correspondente nao entrou no
`SKILL.md` — a tabela da triagem cobre os seis.

### Passo 5: Manifest e verificacao final

```bash
bun run test
bun run harness:validate
bun run generate:manifest
git diff --stat
```

---

## Gotchas

- **G8 do plano:** nao existe teste enumerando secoes do `prd-template.md`. Risco real desta fase e
  **baixo** (o PRD estimava medio). Nao ha teste de contrato existente a ajustar.
- **G7 do plano (o que de fato pode quebrar):** `skills/lib/__tests__/universal-principles.test.ts`
  compara `prd.indexOf('Outcomes') < prd.indexOf('Mecanismo')` — **primeira ocorrencia de cada
  palavra no arquivo inteiro**. Por isso a secao entra depois dos Nao-funcionais, e por isso o texto
  dela nao usa a palavra "Mecanismo". Se alguem mover a secao para cima, o teste reprova.
- **G14 do plano:** heading ASCII (`Ameacas`), consistente com `## Requisitos Nao-Funcionais` e
  `## Decisoes Tecnicas`. O teste tolera acento via `[cç]` para nao reprovar um conserto ortografico.
- **G10 do plano:** o helper `section()` precisa rastrear fences — o `prd-template.md` embute exemplos
  em blocos cercados, e uma busca ingenua por `\n## ` corta a secao no lugar errado.
- **G4 do plano:** edicao 100% aditiva. `git diff --stat` com 0 linhas removidas nos dois arquivos de
  skill (o `plugin-manifest.json` regenerado nao conta — e derivado).
- **G1 do plano:** os dois arquivos editados sao rastreados; `bun run generate:manifest` obrigatorio.
- **Local — as duas listas de gatilhos nao se fundem.** Os **seis** gatilhos de *risco* decidem se a
  secao existe. Os **sete** gatilhos de *aprovacao humana* (`skills/security/SKILL.md` linhas 101-107)
  decidem o que nao se auto-aplica. Listas diferentes, com sobreposicao parcial e proposital. A secao
  nova referencia as duas — nao reduzir a uma so.
- **Local — o exemplo `AB-*` e generico de proposito.** O template e template: os exemplos ficam com
  placeholders `{...}`. Quem preenche e o `/write-prd` com o contexto real do projeto (regra 1 do
  Step 3 da skill: "PRD CONTEXTUALIZADO — usar nomes reais").

---

## Verificacao

### TDD

Esta fase **tem** RED/GREEN genuino — e a unica do plano (ver `README.md` §TDD Strategy, DP-2). O
teste novo nao e tautologico: ele nasce assertando conteudo que **ainda nao existe** no template, e
seu valor permanente e barrar a remocao futura de uma secao que e legitimamente ausente da maioria
dos PRDs.

- [ ] **RED:** `tests/write-prd-contract.test.ts` escrito e FALHA por assertion (nao por erro de
      import/sintaxe)
  - Comando: `bun test tests/write-prd-contract.test.ts`
  - Resultado esperado: falhas com a mensagem `[parity gate "nunca diminuir" — RF-04] Secao
    "Ameacas & Dados" ausente do prd-template.md...`

- [ ] **GREEN:** template + skill editados, o gate passa
  - Comando: `bun test tests/write-prd-contract.test.ts`
  - Resultado esperado: `0 fail`

### Checklist

- [ ] Baseline verde registrado ANTES da edicao (`bun run test` — anotar o total)
- [ ] Branch criada, **nao** e a `main` (G13): `git rev-parse --abbrev-ref HEAD`
- [ ] Secao inserida entre `## Requisitos Nao-Funcionais` e `## Boundaries`:
      `grep -n "Requisitos Nao-Funcionais\|Ameacas & Dados\|## Boundaries" skills/write-prd/templates/prd-template.md`
      → as tres linhas aparecem **nesta ordem**
- [ ] Os 5 sub-blocos existem:
      `grep -c "### Classificacao do dado\|### Fronteiras de confianca\|### Superficie nova\|### Casos de abuso\|### Gatilhos de aprovacao humana" skills/write-prd/templates/prd-template.md`
      → `5`
- [ ] Condicionalidade presente no padrao do repo:
      `grep -n "OPCIONAL" skills/write-prd/templates/prd-template.md` → **2** ocorrencias
      (a de `## Boundaries`, que ja existia, e a nova)
- [ ] Os 6 gatilhos estao na skill:
      `grep -c "Autenticacao ou autorizacao\|Dados sensiveis\|Input externo\|Upload de arquivo\|Pagamento\|Integracao com terceiro" skills/write-prd/SKILL.md`
      → `>= 6`
- [ ] Linha nova na tabela do Step 3: `grep -n "| Ameacas & Dados |" skills/write-prd/SKILL.md` → 1 linha
- [ ] Item de triagem na Verification: `grep -n "triagem de risco foi feita" skills/write-prd/SKILL.md` → 1 linha
- [ ] **G7 preservado:** `bun test skills/lib/__tests__/universal-principles.test.ts` → verde
- [ ] **Nunca diminuir (G4):** `git diff --numstat skills/write-prd/` → coluna de **linhas removidas
      = 0** nos dois arquivos
- [ ] Testes passam: `bun run test` (total >= baseline + testes novos; nenhum teste que passava falha)
- [ ] Estrutural: `bun run harness:validate`
- [ ] TypeCheck: `bun run typecheck` — comparar o **delta** com GT-01 (erros pre-existentes em
      `lazy-import.test.ts` e `subagent-contract.ts` nao contam)
- [ ] **Manifest (G1):** `bun run generate:manifest` rodado e `plugin-manifest.json` no mesmo commit
- [ ] NAO existe `bun run lint` neste repo (G3) — nao tentar

---

## Criterio de Aceite

**Por maquina:**

- `bun test tests/write-prd-contract.test.ts` → `0 fail` (e o arquivo existe)
- `grep -c "### Casos de abuso" skills/write-prd/templates/prd-template.md` → `1`
- `grep -c "OPCIONAL" skills/write-prd/templates/prd-template.md` → `2`
- `git diff --numstat HEAD~1 -- skills/write-prd/` → linhas removidas = `0`
- `bun run test && bun run harness:validate` → verde
- `git status --porcelain plugin-manifest.json` → vazio apos o commit (manifest regenerado e commitado)

**CA-03 do PRD (verificacao por humano, uma leitura de 2 minutos):**

- Lendo a secao do template com a cabeca de um PRD de auth: da para preencher os cinco blocos sem
  inventar formato? (classificacao, fronteiras, superficie, abusos, gatilhos de aprovacao)
- Lendo a triagem da skill com a cabeca de um PRD de "mudar a cor de um botao": os seis gatilhos dao
  todos NAO, e a instrucao de omitir com justificativa de 1 linha e inequivoca?

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

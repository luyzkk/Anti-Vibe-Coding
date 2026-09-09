<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `<!-- 2026-09-01 (Luiz/dev): ramos de abuso na semente SEGURANCA — PRD §RF-07 -->`
-->

# Fase 04: Perguntas de abuso no grill-me + defaults seguros no design

**Plano:** 02 — Pipeline (codigo nasce seguro)
**Sizing:** 2h
**Depende de:** fase-01 (herda o vocabulario dos seis gatilhos)
**Visual:** false

---

## O que esta fase entrega

A entrevista passa a perguntar o que um mal-intencionado tentaria — nao apenas "quem pode acessar" —
e as duas skills de design fixam os defaults seguros **no momento em que a decisao ainda e barata**:
modelo de authz, gestao de secrets, dado em repouso, isolamento de tenant, e as armadilhas de
plataforma (cache por-ator, autorizacao congelada em fila, replica sem fronteira de tenant).

Cobre **RF-07 (parcial)** — a parte de `grill-me` + `architecture` + `system-design`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/grill-me/SKILL.md` | Modify | ESTENDE a semente `### SEGURANCA` com ramos de abuso + amplia a regra de ramificacao obrigatoria |
| `skills/architecture/SKILL.md` | Modify | Nova secao `## 8. Defaults Seguros no Design` + 1 regra do consultor |
| `skills/system-design/SKILL.md` | Modify | Nova secao `## 12. Defaults Seguros de Plataforma` + 3 linhas no Cheat Sheet + 2 anti-patterns |
| `plugin-manifest.json` | Modify | Regenerado — os tres sao rastreados |

---

## Implementacao

### Passo 0: Baseline, branch e leitura do gate

```bash
bun run test
bun test tests/grill-me-contract.test.ts     # OBRIGATORIO — o gate que esta fase pode quebrar
git checkout -b feat/grill-and-design-defaults   # G13
```

> **Leia `tests/grill-me-contract.test.ts` antes de editar o grill-me (G5).** Ele assere
> `skill.includes('### ${SEED}')` para as 7 sementes — `ESCOPO`, `DADOS`, `UX`, `EDGE CASES`,
> `PERFORMANCE`, **`SEGURANCA`**, `INTEGRACAO` — e tambem `## As 7 Sementes da Arvore`.
> **`### SEGURANCA — Acesso e autorizacao` JA EXISTE.** Esta fase **estende** o que vem por baixo do
> heading. Renomear para `### SEGURANCA E ABUSO`, mover o conteudo para outra secao ou criar uma
> oitava semente **quebra o gate** — e, pior, quebraria o modelo: as 7 sao raizes do design tree, nao
> uma lista a que se acrescentam itens.

### Passo 1: ramos de abuso na semente `### SEGURANCA`

As quatro perguntas existentes **permanecem exatamente como estao**. O bloco novo entra logo abaixo
delas, antes de `### INTEGRACAO`:

````markdown
### SEGURANCA — Acesso e autorizacao
- "Quem pode acessar? Todos, logados, ou roles especificas?"
- "Dados sensiveis que precisam de encriptacao em repouso?"
- "Rate limiting necessario nesse endpoint?"
- "RLS (Row Level Security) aplicavel?"

Ramos de abuso — a pergunta que muda o design nao e "isso esta seguro?", e "o que alguem
mal-intencionado tentaria?". Ramificar quando as respostas acima acenderem um dos seis gatilhos de
risco (`auth/authz` · `PII/sensivel` · `input externo` · `upload` · `pagamento` ·
`integracao terceira`):

- "Se o usuario A trocar o id na URL pelo id do usuario B, o que acontece hoje?"
- "Que dado dessa feature vem de fora e ninguem valida? Onde ele e usado depois — query, HTML,
  caminho de arquivo, comando?"
- "Se um arquivo for enviado com a extensao trocada, o que barra?"
- "Se a mesma requisicao chegar duas vezes (retry, replay), o efeito acontece duas vezes?"
- "Se o webhook do terceiro vier de um remetente falso, o que verifica a assinatura?"
- "Quem, alem do dono, PRECISA enxergar esse dado?" — a resposta honesta costuma ser "ninguem", e e
  ela que define o default de authz.

Cada resposta aqui vira um caso de abuso `AB-*` na secao "Ameacas & Dados" do PRD, e de la um teste
de abuso no RED (`/anti-vibe-coding:tdd-workflow`). Ramo que nao se aplica **fecha explicitamente**
numa linha, como qualquer outra semente — "sem input externo, ramo fechado".

<!-- 2026-09-01 (Luiz/dev): ramos de abuso na semente SEGURANCA — PRD §RF-07. Heading preservado:
     `### SEGURANCA` e token asserido em tests/grill-me-contract.test.ts. -->
````

**E a regra de ramificacao obrigatoria** (secao `## Priorizacao por Tipo de Feature`, bloco `Regras`)
ganha os tres gatilhos que faltavam — **os termos originais permanecem**:

```markdown
- SEGURANCA ramifica obrigatoriamente se detectar auth, dados sensiveis ou pagamentos — e tambem
  input externo, upload de arquivo ou integracao com terceiro (os seis gatilhos de risco)
```

### Passo 2: `## 8. Defaults Seguros no Design` no `architecture/SKILL.md`

Inserir apos o fim da secao `## 7. Dependency Injection` e antes de
`## Template de Analise Arquitetural`:

````markdown
## 8. Defaults Seguros no Design

<!-- 2026-09-01 (Luiz/dev): seguranca e decisao arquitetural, cai no design e nao na auditoria — PRD §RF-07 -->

Quatro decisoes de seguranca sao **arquiteturais**: trocar depois custa migracao, nao patch. Fechar
junto com as outras decisoes de design — nao no fim, quando o codigo ja assumiu uma delas em silencio.

| Decisao | Default seguro | Custo de adiar |
|---------|----------------|----------------|
| **Modelo de authz** | Deny-by-default; checagem no servidor, por recurso (dono + role) — nunca "todo logado ve tudo" | Cada endpoint novo herda o buraco; o retrofit toca toda rota existente |
| **Gestao de secrets** | Fora do repo e fora do banco: env / secret manager, injetado no runtime | Secret em codigo vaza no historico do git — e historico nao se apaga, so se rotaciona a chave |
| **Dado em repouso** | Classificar antes de modelar (`publico` / `interno` / `PII` / `credencial` / `financeiro`). Credencial e **hasheada** (bcrypt/Argon2), nunca encriptada | Migracao de coluna com dado ja em producao |
| **Isolamento de tenant** | A fronteira do tenant fica na camada mais BAIXA possivel (RLS ou filtro no repositorio), nao repetida em cada handler | Um handler que esqueceu o `where tenant_id` vaza tudo — e a auditoria de codigo nao encontra o que nao esta escrito |

### Arvore de Decisao — onde a autorizacao mora

```
A checagem de "pode?" esta em quantos lugares?
  Repetida em cada handler/rota
    → um handler novo vai esquecer; e questao de tempo. Puxe a checagem para baixo.
  Numa camada unica (middleware / policy / repositorio)
    → o default e NEGAR quando nenhuma regra casa?
        SIM  → ok
        NAO  → allow-by-default disfarcado; e o mesmo buraco com menos linhas
  No banco (RLS)
    → mais forte. Confirme que os servicos internos NAO usam a conexao que ignora RLS
      (service_role / superuser) para operacao de usuario final
```

Consequencia no fluxo: cada default **aceito** aqui vira linha da secao "Ameacas & Dados" do PRD;
cada default **recusado** vira linha da tabela `## Decisoes Tecnicas`, com a razao e a alternativa.
Seguranca recusada sem registro nao e trade-off — e esquecimento com aparencia de decisao.
Para consultoria de profundidade (OWASP, authn/authz, cripto): `/anti-vibe-coding:security`.

---
````

E, em `## Regras do Consultor`, um item novo no fim da lista:

```markdown
6. **Seguranca e decisao de design, nao revisao** — authz, secrets, dado em repouso e isolamento de tenant fecham junto com as outras decisoes (secao 8), nao na auditoria do fim
```

### Passo 3: `## 12. Defaults Seguros de Plataforma` no `system-design/SKILL.md`

Inserir apos `## 11. Resiliência Distribuída` e antes de `## Cheat Sheet — Referencia Rapida`:

````markdown
## 12. Defaults Seguros de Plataforma

<!-- 2026-09-01 (Luiz/dev): defaults seguros escolhidos no design da plataforma — PRD §RF-07 -->

Decisoes de plataforma carregam seguranca junto, e quase sempre de um jeito que nao aparece em code
review — o codigo esta certo, a plataforma e que entrega o dado para a pessoa errada.

| Decisao | Default seguro | Por que no design |
|---------|----------------|-------------------|
| **Cache de resposta** | Se o conteudo varia por ator, a chave inclui o ator. Conteudo por-ator nunca em cache compartilhado | Cache compartilhado entrega o dado de A para B — e o bug parece "intermitente", que e o pior tipo de bug para diagnosticar |
| **Fila / worker** | O payload leva o `id` do ator; o consumidor **reautoriza**. Nunca carregar "ja autorizado" | Mensagem e replayavel e frequentemente persistida: autorizacao congelada vira bypass com data de validade infinita |
| **Replica de leitura** | A replica herda a mesma fronteira de tenant da primaria (RLS / filtro), nao so o mesmo schema | "Replica so pra relatorio" sem RLS e um vazamento com outro nome |
| **CDN** | Conteudo autenticado nao passa por cache compartilhado (`Cache-Control: private` / `no-store`) | Um `public` num endpoint autenticado vaza para todo mundo, e o TTL decide por quanto tempo |
| **Secrets em serverless** | Injetados por env do provider; nunca no bundle, nunca em log de cold start | Bundle e artefato distribuido — quem tem o artefato tem o secret |

### Arvore de Decisao — posso cachear esta resposta?

```
A resposta muda conforme QUEM pediu?
  NAO → cache compartilhado ok (TTL normal)
  SIM → e dado sensivel / PII?
    NAO → cache com chave que INCLUI o ator; nunca em CDN publica
    SIM → nao cachear em camada compartilhada.
          Se a latencia exigir, cache no cliente + `no-store` no proxy
```

---
````

**Cheat Sheet** — tres linhas novas no fim da tabela (nenhuma linha existente muda):

```markdown
| Cache de resposta por-ator | chave inclui o ator; CDN publica so p/ conteudo anonimo | nunca — `public` em endpoint autenticado e vazamento |
| Autorizacao em fila/worker | payload leva o ator; consumidor reautoriza | nunca congelar "ja autorizado" no payload |
| Replica de leitura | mesma fronteira de tenant da primaria | nunca "replica so pra relatorio" sem RLS |
```

**Anti-Patterns Universais** — dois itens novos no fim da lista:

```markdown
- **Cachear resposta autenticada em camada compartilhada** — o dado de um usuario aparece para outro, e o sintoma parece intermitencia de rede
- **Confiar em autorizacao congelada no payload da fila** — a mensagem e replayavel; quem consome reautoriza
```

### Passo 4: rodar o gate e o manifest

```bash
bun test tests/grill-me-contract.test.ts    # OBRIGATORIO
bun run test
bun run harness:validate
bun run generate:manifest
git diff --numstat skills/grill-me/ skills/architecture/ skills/system-design/
```

---

## Gotchas

- **G5 do plano (o risco real desta fase) — `### SEGURANCA` e token asserido.**
  `tests/grill-me-contract.test.ts` roda `skill.includes('### SEGURANCA')`. **Nao renomear, nao
  mover, nao criar oitava semente.** O gate tambem assere `## As 7 Sementes da Arvore` e as outras
  6 sementes — nao encostar em nenhuma. `bun test tests/grill-me-contract.test.ts` e obrigatorio no
  checklist, nao opcional.
- **G6 do plano — nao escrever `%` na `## Condicao de Parada`.** Ha assercao que reprova qualquer
  `/\d{1,3}\s?%/` **dentro daquela secao**. Esta fase nao encosta la; se por algum motivo encostar,
  nenhum percentual — nem em comentario explicando por que o limiar saiu (o teste escaneia texto).
- **G4 do plano — as quatro perguntas existentes da semente permanecem palavra por palavra.** O
  bloco novo e **append** por baixo delas. A regra de ramificacao ("auth, dados sensiveis ou
  pagamentos") preserva os tres termos originais e ganha tres — nao e substituicao.
- **G13 do plano — nunca na main**, branch + PR.
- **Local — os blocos HTML-comment do topo do `architecture/SKILL.md` sao intocaveis.**
  `profile-aware-preface` (linhas 10-52) e `stack-aware-preface` (54-66) tem logica espelhada em
  helpers e testes de preface (`tests/harness-validate-preface.test.ts`). A secao nova entra bem
  abaixo, entre a secao 7 e o Template de Analise. Idem no `system-design/SKILL.md` (prefaces no topo).
- **Local — numeracao das secoes.** `architecture` vai ate `## 7`; `system-design` vai ate `## 11`.
  As novas sao `## 8` e `## 12`, na sequencia natural. Registrar os numeros finais na `MEMORY.md`
  (§Notas para Planos Seguintes) — planos futuros referenciam secao por numero.
- **Local — tres arquivos numa fase e o limite.** O README ja sinaliza risco de "L escondida" aqui.
  Se ao executar o Passo 3 o relogio passar de ~2h, **parar e dividir**: `grill-me` fecha um PR, e
  `architecture` + `system-design` fecham outro. Os dois grupos sao independentes.
- **Local — o `architecture` e skill de consultoria, nao de implementacao.** A secao nova ensina e
  recomenda; nao gera codigo (regra da propria skill: "o papel e ensinar e orientar decisoes, nao
  gerar codigo"). Por isso e tabela de decisao + arvore, nunca snippet de middleware.

---

## Verificacao

### Por que esta fase NAO tem TDD

Tres arquivos de prosa de skill. Sem unidade de codigo, um teste textual escrito junto com a edicao
seria tautologico. A diferenca importante em relacao as outras fases: **aqui ja existe um gate**
(`tests/grill-me-contract.test.ts`) e ele nao e decorativo — e o unico gate de paridade do pipeline.
Ele nao valida o conteudo novo (nem deve: prosa muda), mas valida que a edicao **nao encolheu** a
skill. Isso e exatamente a verificacao de que esta fase precisa.

### GREP-RED (rodar ANTES de editar — registrar a saida)

```bash
grep -c "mal-intencionado" skills/grill-me/SKILL.md          # esperado agora: 0
grep -c "## 8. Defaults Seguros" skills/architecture/SKILL.md      # esperado agora: 0
grep -c "## 12. Defaults Seguros" skills/system-design/SKILL.md    # esperado agora: 0
bun test tests/grill-me-contract.test.ts                     # esperado agora: VERDE (baseline)
```

### Checklist

- [ ] GREP-RED registrado, com o gate do grill-me verde ANTES da edicao
- [ ] Branch criada, **nao** e a `main` (G13)
- [ ] **Gate obrigatorio verde depois:** `bun test tests/grill-me-contract.test.ts` → `0 fail`
- [ ] Heading da semente inalterado:
      `grep -n "### SEGURANCA — Acesso e autorizacao" skills/grill-me/SKILL.md` → 1 linha, **texto
      identico** ao de antes
- [ ] As 7 sementes continuam presentes:
      `grep -c "^### ESCOPO\|^### DADOS\|^### UX\|^### EDGE CASES\|^### PERFORMANCE\|^### SEGURANCA\|^### INTEGRACAO" skills/grill-me/SKILL.md`
      → `7`
- [ ] As 4 perguntas originais da semente continuam la:
      `grep -c "Quem pode acessar?\|encriptacao em repouso\|Rate limiting necessario\|RLS (Row Level Security)" skills/grill-me/SKILL.md`
      → `>= 4`
- [ ] Ramos de abuso presentes:
      `grep -c "mal-intencionado" skills/grill-me/SKILL.md` → `>= 1`;
      `grep -c "trocar o id na URL" skills/grill-me/SKILL.md` → `1`
- [ ] Regra de ramificacao ampliada **sem perder os termos originais**:
      `grep -n "SEGURANCA ramifica obrigatoriamente" skills/grill-me/SKILL.md` → 1 linha contendo
      `auth`, `dados sensiveis`, `pagamentos`, `input externo`, `upload`, `terceiro`
- [ ] Nenhum `%` entrou na `## Condicao de Parada` (G6) — o proprio gate reprova, mas conferir
- [ ] `architecture`: `grep -n "## 8. Defaults Seguros no Design" skills/architecture/SKILL.md` → 1 linha,
      posicionada **entre** `## 7. Dependency Injection` e `## Template de Analise Arquitetural`
- [ ] `architecture`: regra 6 do consultor presente:
      `grep -c "Seguranca e decisao de design" skills/architecture/SKILL.md` → `1`
- [ ] `architecture`: prefaces intactos:
      `grep -c "profile-aware-preface:start\|stack-aware-preface:start" skills/architecture/SKILL.md` → `2`
- [ ] `system-design`: `grep -n "## 12. Defaults Seguros de Plataforma" skills/system-design/SKILL.md` → 1 linha,
      **antes** de `## Cheat Sheet`
- [ ] `system-design`: 3 linhas novas no Cheat Sheet + 2 anti-patterns:
      `grep -c "Cache de resposta por-ator\|Autorizacao em fila/worker\|Replica de leitura" skills/system-design/SKILL.md` → `>= 3`
- [ ] **Nunca diminuir (G4):** `git diff --numstat skills/grill-me/ skills/architecture/ skills/system-design/`
      → linhas removidas = `0` nos tres (a linha da regra de ramificacao e a **unica** modificacao
      in-place; se ela aparecer como `1 removida / 1 adicionada`, conferir palavra por palavra que
      nenhum termo original saiu)
- [ ] Testes passam: `bun run test`
- [ ] Estrutural: `bun run harness:validate`
- [ ] TypeCheck: `bun run typecheck` — comparar delta com GT-01
- [ ] **Manifest (G1):** `bun run generate:manifest` no mesmo commit
- [ ] Se a fase passou de ~2h: parou e dividiu em dois PRs (grill-me | design) — registrar DEV na MEMORY

---

## Criterio de Aceite

**Por maquina:**

- `bun test tests/grill-me-contract.test.ts` → `0 fail` (**dealbreaker desta fase**)
- `grep -c "^### SEGURANCA — Acesso e autorizacao" skills/grill-me/SKILL.md` → `1`
- `grep -c "## 8. Defaults Seguros no Design" skills/architecture/SKILL.md` → `1`
- `grep -c "## 12. Defaults Seguros de Plataforma" skills/system-design/SKILL.md` → `1`
- `git diff --numstat HEAD~1 -- skills/grill-me/ skills/architecture/ skills/system-design/`
  → linhas removidas = `0` (ou `1`, exclusivamente a regra de ramificacao reescrita, com todos os
  termos originais preservados)
- `bun run test && bun run harness:validate` → verde

**RF-07 parcial (verificacao por humano):**

- Rode a semente SEGURANCA mentalmente contra uma feature de upload: as perguntas de abuso produzem
  respostas que viram `AB-*`, ou produzem "sim, precisa ser seguro"? Se produzem a segunda, a
  pergunta ainda esta abstrata demais.
- Leia a tabela da secao 8 com a cabeca de quem esta escolhendo o modelo de authz agora: da para
  decidir hoje, ou ela so descreve o que ja se sabe depois de errar?

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

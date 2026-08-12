---
fase: 01
plano: 01
status: planned
---

# Fase 01: Porte do Nucleo — `SKILL.md` + `SKILL-MECHANICS.md`

**Plano:** 01 — Porte da `writing-for-agents` + Auditoria
**Sizing:** ~2.5h
**Depende de:** Nenhuma
**Visual:** false

**Decisoes:** DI-01 (skill model-invoked) · DI-03 (corpo pt-BR / description EN / leading words EN)
**Invariantes:** INV-01 (description < 250 chars) · INV-02 (leading words EN) · INV-04 (Invocation reescrita) · INV-05 (atribuicao MIT)

---

## O que esta fase entrega

A referencia canonica de escrita para agentes, em dois arquivos. Copia literal do nucleo conceitual
do Matt, com a secao de invocacao **reescrita** para o nosso frontmatter e tres blocos **novos** que
so existem aqui: as armadilhas de `SKILL.md` deste harness, a convencao `docs/` vs runtime asset, e
o par `Common Rationalizations` / `Red Flags` no formato que 19 outras skills ja usam.

---

## Arquivos Afetados

**NOVOS**
- `skills/writing-for-agents/SKILL.md`
- `skills/writing-for-agents/SKILL-MECHANICS.md`

**MODIFICADOS**
- `THIRD-PARTY-NOTICES.md` — bloco de atribuicao MIT (INV-05)

**FORA do escopo**
- Nenhum `SKILL.md` existente e tocado (INV-03)
- A docs page do Matt (`docs/productivity/writing-for-agents.md`) nao e portada — e marketing do
  aihero.dev, com links absolutos e dependencia do AI Coding Dictionary

---

## Implementacao

### Passo 0: invariantes de formato (nao negociaveis)

- Fence externo com **quadruple backticks** em qualquer secao que contenha triple backticks
  internos (compound `2026-04-21-blocos-codigo-aninhados-skill-md`)
- Arquivo gravado em **LF**, nunca CRLF — o regex do frontmatter quebra
  (compound `2026-05-19-crlf-breaks-frontmatter-regex`)
- Nenhum bloco de codigo com intencao de executar: `SKILL.md` e prompt, nao runtime
  (compound `2026-05-12-skill-md-code-blocks-do-not-execute`)

### Passo 1: frontmatter da `SKILL.md`

Campos: `name`, `description` (EN, **< 250 chars**, front-loaded, um trigger por branch),
`user-invocable: true`, `disable-model-invocation: false`, `allowed-tools: Read, Grep, Glob`,
`argument-hint`.

Os branches reais que devem disparar: criar/editar skill · editar `AGENTS.md`/`CLAUDE.md` ·
revisar um doc que um agente le (PRD, ticket, prompt de subagente). **Tres branches, tres triggers.**
Sinonimos que renomeiam o mesmo branch nao entram — a skill precisa passar no proprio teste (INV-01).

`allowed-tools` fica em read-only de proposito: a skill e referencia, nao executa mutacao. Quem
edita e o agente chamador, com a referencia carregada.

### Passo 2: corpo — os 6 conceitos (copia literal, traduzida)

Ordem preservada do original. Cada secao traduzida para pt-BR mantendo os termos-ancora em ingles (INV-02).

1. **Context pointers** — a description de uma skill e uma linha no `AGENTS.md` apontando um doc sao
   o mesmo objeto. A *redacao* do ponteiro, nao o alvo, decide se o agente alcanca o material.
   Regras: front-load a leading word · um trigger por branch · corte identidade que o corpo ja carrega.
2. **As duas cargas** — *context load* (material sempre carregado) vs *cognitive load* (o humano
   lembrar o que existe). Cognitive load **nao e para minimizar** — e o preco da agencia humana.
3. **Hierarquia da informacao** — escada de 3 degraus (step in-file / reference in-file / disclosed
   atras de ponteiro). *Progressive disclosure* e o movimento para baixo. Teste: inline o que todo
   branch precisa, empurra o que so alguns alcancam. Companheiro: **co-location**. Modo de falha: **sprawl**.
4. **Criterios de completude** — **clareza** (o agente distingue pronto de nao-pronto? bound vago
   convida *premature completion*; afia o bound primeiro, so esconda steps seguintes se for
   irredutivelmente difuso E voce observar a pressa — e esconder so funciona atravessando fronteira
   de contexto real) e **demanda** (quanto exige; gera *legwork*).
5. **Leading words** — conceito compacto ja no pre-treino, repetido como **token**, nunca como frase.
   Exemplos: "fast, deterministic, low-overhead" -> *tight*; "um loop em que voce confia" -> *red*.
   Modo de falha ao lado: **negacao** — proibir arrasta o comportamento proibido para o contexto e
   o torna *mais* disponivel. Prompt o positivo.
6. **Poda** — single source of truth · **environment como fonte de verdade** (doc que reafirma
   `package.json` e um *cache*; so se paga quando o lookup e caro) · relevancia · **no-ops**
   (teste **comportamental, nao estetico**: delete a linha, o comportamento mudou? Discordancia se
   resolve rodando o documento). Modo de falha acumulado: **sediment**.

### Passo 3: secao nova — `## Armadilhas deste harness`

O que o agente **nao descobre olhando** o ambiente. Pela regra do "environment como fonte de verdade",
so entra aqui o que nao esta em nenhum config:

| Armadilha | Regra | Fonte |
|---|---|---|
| Fences aninhados | quadruple backticks como fence externo | compound 2026-04-21 |
| Code block nao executa | `SKILL.md` e prompt; efeito colateral exige hook externo | compound 2026-05-12 |
| CRLF | grava LF; CRLF quebra o regex do frontmatter | compound 2026-05-19 |
| Skill paths pos-v6 | caminhos mudaram no flatten; conferir antes de referenciar | compound 2026-05-14 |

### Passo 4: secao nova — `## docs/ vs runtime asset`

Duas linhas + ponteiro para `ARCHITECTURE.md` §Conventions. A decisao operacional: se o material
precisa chegar ao projeto-alvo via `/init`, ele **nao pode** viver em `docs/` — `sync-to-global.sh`
propositalmente nao copia `docs/`.

### Passo 5: `SKILL-MECHANICS.md` — Invocation **reescrita** (INV-04)

Nao traduzir. O original assume 2 estados; nos temos 6 campos. Mapear:

| Campo | Quando usar | Custo |
|---|---|---|
| `disable-model-invocation: false` (default nosso, 36/39) | o agente precisa alcancar sozinha | description sempre carregada |
| `disable-model-invocation: true` | so o humano dispara | zero context load, paga cognitive load |
| `user-invocable: true` | aparece no listing de slash-commands | — |
| `allowed-tools` | menor conjunto que faz o trabalho | superficie de risco |
| `context: fork` | subtarefa relacionada que herda contexto pai | cache-otimizado |
| `agent: <tipo>` | delega a subagente com contexto limpo | isolamento vs custo de re-descoberta |
| `argument-hint` | a skill aceita argumento | 1 linha |

**O achado que esta secao precisa registrar:** 36 das nossas 39 skills sao model-invoked, entao
pagamos context load em quase tudo e nao colhemos o trade-off que o original descreve. Isso e
condicao de partida, nao recomendacao — a fase-03 mede quanto disso e justificado.

### Passo 6: `SKILL-MECHANICS.md` — `Common Rationalizations` + `Red Flags`

**Verificado em 2026-08-10:** o padrao ja existe em **19 skills** (`Common Rationalizations`) e
**17** (`Red Flags`) — o item #1 do `ANALYSIS.md` de 2026-05-22 foi substancialmente executado.
`decision-registry` e um exemplar bom do formato.

Entao aqui nao e resgate de pendencia: e **aplicar o padrao existente** a esta skill nova, com as
racionalizacoes especificas do ato de escrever documento para agente ("preciso explicar o contexto
antes", "melhor deixar detalhado por seguranca", "essa secao pode ser util algum dia").

Seguir o formato de `decision-registry` (tabela racionalizacao -> realidade) em vez de inventar outro.

### Passo 7: atribuicao MIT

Bloco em `THIRD-PARTY-NOTICES.md`: fonte, commit `84fdeff`, licenca MIT, copyright, e **quais
secoes sao derivadas** vs quais sao originais deste repo.

---

## Gotchas

- **G1** — A tentacao de traduzir `sediment` e `sprawl`. INV-02 existe porque a palavra E o
  mecanismo; "sedimento" nao recruta o mesmo prior.
- **G2** — A secao Invocation e a unica que da conselho **errado** se copiada. CO-03.
- **G3** — Escrever esta skill convida a violar a propria skill. Ao terminar, rode os 6 testes nela
  mesma antes de considerar pronta (ver Criterio de Aceite).
- **G4** — `harness:validate` checa links de markdown. Todo ponteiro para compound note precisa
  resolver a partir de `skills/writing-for-agents/`.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `bun run typecheck` verde
- [ ] Frontmatter parseavel; `description` < 250 chars
- [ ] Arquivos em LF (`file` ou `git ls-files --eol`)
- [ ] Todos os links markdown resolvem
- [ ] Skill aparece no listing (`/plugin` ou o mecanismo de listagem do harness)
- [ ] `THIRD-PARTY-NOTICES.md` com o bloco de atribuicao

### Auto-aplicacao (G3)

Rodar os 6 testes da propria skill contra ela mesma:

- [ ] **Ponteiro** — a description tem 3 branches distintos, zero sinonimo
- [ ] **Duas cargas** — nada que so um branch precisa esta inline
- [ ] **Hierarquia** — mechanics esta atras de ponteiro, nao inline
- [ ] **Completude** — cada passo tem condicao de pronto checavel
- [ ] **Leading words** — pelo menos 4 termos-ancora fazendo trabalho em mais de um lugar
- [ ] **Poda** — nenhum no-op sobrevive a leitura frase a frase; nada dito duas vezes

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run typecheck` exit 0
- `description` do frontmatter < 250 chars
- 2 arquivos novos existem, ambos em LF, ambos com frontmatter valido
- Zero diff em `skills/*/SKILL.md` pre-existentes (INV-03)

**Por humano:**
- Ler a `SKILL.md` inteira e nao encontrar uma linha que o modelo ja obedeceria por padrao
- As 4 armadilhas do harness estao la e nenhuma delas e descobrivel lendo um config
- A secao Invocation descreve os **nossos** 6 campos, e o achado dos 36/39 esta registrado

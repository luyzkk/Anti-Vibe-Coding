---
fase: 03
plano: 08
status: planned
---

# Fase 03: Ponteiros e a Convencao de Captura

**Plano:** 08 — `prototype`
**Sizing:** ~1.5h
**Depende de:** fase-01 (a fase-02 nao e pre-requisito para escrever os ponteiros)
**Visual:** false

**Decisoes:** DI-28 (ponteiro em `design-twice` + ponteiro em `qa-visual`)
**Invariantes:** INV-05 (prototipo nunca vai para a `main`)

---

## O que esta fase entrega

Os dois ponteiros que fazem a skill ser alcancada de dentro do fluxo, e o alinhamento da captura com
a convencao de branch que o repo ja tem.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/design-twice/SKILL.md`
- `skills/qa-visual/SKILL.md`
- `skills/prototype/SKILL.md` — a captura referencia a convencao existente

**FORA do escopo**
- `git-workflow-and-versioning` — a captura **consome** a convencao dele; nao a altera

---

## Implementacao

### Passo 1: ponteiro em `design-twice`

O par mais forte. `design-twice` gera 3 propostas divergentes **em texto** — e texto e exatamente o
que o prototipo existe para superar quando a pergunta e "isso parece certo?".

Gatilho a nomear: as propostas divergentes sao sobre algo que da para **sentir clicando** — modelo
de estado, fluxo, tela. Aí vale tornar uma delas executavel em vez de decidir no abstrato.

Cuidado de fronteira: nao e "sempre prototipe depois de design-twice". Proposta sobre escolha de
tecnologia ou schema de dados nao se resolve clicando. O ponteiro precisa dizer **quando**, nao
"depois".

Nota: `design-twice` tambem recebe o Dominio 5 no plano02 fase-03 e um ponteiro no plano02 fase-02.
Terceiro toque no mesmo arquivo — **reler antes de editar**.

### Passo 2: ponteiro em `qa-visual`

`qa-visual` dirige browser via Playwright MCP em UI existente. Tres variantes numa rota, trocaveis
por `?variant=`, e exatamente o que ele sabe percorrer.

Gatilho: existe prototipo de UI com variantes no ar — em vez de clicar em cada uma a mao, pedir uma
varredura, que traz screenshot, erro de console e checagem de acessibilidade por variante.

Isso vale mais do que parece: comparar tres variantes **na mesma dimensao** (mesma viewport, mesmos
dados, mesma checagem de a11y) e mais justo que impressao sequencial.

### Passo 3: a captura, alinhada a convencao existente

A fonte manda: dobrar a decisao validada no codigo real, e commitar o prototipo numa **branch
descartavel** fora da `main`, deixando ponteiro de contexto na issue de implementacao. A `main` fica
so com a decisao validada.

Nosso repo ja tem convencao de branch em `git-workflow-and-versioning`, e a regra registrada de
nunca commitar direto na `main`. As duas coisas se encaixam — a captura **consome** a convencao, nao
inventa outra.

O que precisa ficar explicito no `prototype/SKILL.md`:

- nome de branch previsivel para prototipo (seguir o padrao do `git-workflow-and-versioning`)
- o ponteiro de contexto: onde ele fica, dado que nosso pipeline usa `docs/exec-plans/`, nao issue
  tracker. O destino natural e o PRD ou o plano da feature que o prototipo serviu
- **a resposta tambem e capturada** — o veredito e a pergunta que ele resolveu. Nao so o artefato

O ultimo item e o que mais se perde: guardar o prototipo sem guardar a conclusao deixa um artefato
sem sentido para quem achar depois.

### Passo 4: conferir disparo

Para cada ponteiro, um cenario concreto:

- `design-twice`: "tres formas de modelar o fluxo de aprovacao" → o ponteiro dispara?
- `design-twice`: "Postgres vs SQLite para este caso" → o ponteiro **nao** deve disparar
- `qa-visual`: "tenho 3 variantes da tela de settings em `?variant=`" → dispara?

O segundo cenario e o teste importante: ponteiro que dispara sempre nao esta dizendo nada.

---

## Gotchas

- **G1** — Ponteiro em `design-twice` que sugere prototipar sempre. Passo 1, cuidado de fronteira.
- **G2** — Terceiro toque em `design-twice` nesta serie de planos (plano02 fase-02 e fase-03, e
  agora). Reler antes de editar — Edit falha em silencio contra contexto desatualizado.
- **G3** — Inventar convencao de branch nova. Consumir a de `git-workflow-and-versioning`.
- **G4** — Capturar o artefato e esquecer a resposta (Passo 3).
- **G5** — Inflar `description` das duas skills tocadas. O ponteiro vai no corpo.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Cada ponteiro tem no maximo 1 linha, com gatilho distinto
- [ ] O ponteiro do `design-twice` diz **quando**, nao "sempre depois"
- [ ] Nenhuma `description` tocada
- [ ] Captura referencia `git-workflow-and-versioning`, sem convencao nova
- [ ] Ponteiro de contexto tem destino definido no nosso pipeline (PRD ou plano)
- [ ] A resposta e capturada junto com o artefato
- [ ] Os 3 cenarios do Passo 4 conferidos — inclusive o que **nao** deve disparar

---

## Criterio de Aceite

**Por maquina:**
- `git diff` mostra 3 arquivos, so no corpo
- `bun run harness:validate` exit 0

**Por humano:**
- O cenario "Postgres vs SQLite" nao dispara o ponteiro de prototipo
- Dado um prototipo pronto, saber exatamente onde o artefato e onde a resposta vao parar

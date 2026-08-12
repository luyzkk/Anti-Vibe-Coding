---
fase: 01
plano: 06
status: planned
---

# Fase 01: Reenquadrar o Escopo + A Fase do Loop *Tight*

**Plano:** 06 — Loop-First no `incident-response`
**Sizing:** ~2.5h
**Depende de:** plano01 fase-01 (a lente)
**Visual:** false

**Decisoes:** DI-20 (absorver e reenquadrar) · DI-21 (template HITL entra)
**Invariantes:** INV-01 (o que e nosso fica) · INV-02 (`iterate` nao quebra) · INV-03 (o gate) · INV-04 (nao rodar HITL)

---

## O que esta fase entrega

O escopo novo, a fase que passa a vir antes de tudo, e o reparo do acoplamento que ela quebraria.

---

## Arquivos Afetados

**NOVOS**
- `skills/incident-response/scripts/hitl-loop.template.sh`
- `skills/incident-response/references/feedback-loops.md` — as 10 formas + tighten + nao-determinismo

**MODIFICADOS**
- `skills/incident-response/SKILL.md`
- `skills/iterate/SKILL.md` — ancoras nomeadas (INV-02)
- `THIRD-PARTY-NOTICES.md`

Cinco arquivos: no limite do cap. Nada mais entra nesta fase.

**FORA do escopo**
- Minimizacao, multi-hipotese, instrumentacao, perf (fase-02)
- Seam correto, cleanup, post-mortem (fase-03)

---

## Implementacao

### Passo 1: reparar `iterate` PRIMEIRO (INV-02)

Antes de renumerar qualquer coisa. `skills/iterate/SKILL.md:108` aponta "Etapa 1" e `:243` aponta
"Etapa 5" de `incident-response`.

Trocar por **ancora nomeada** — referenciar o titulo da secao, nao o numero. Numero renumera; nome
nao. E adicionar um comentario curto no `incident-response` avisando que ha ponteiro externo por
nome, para o proximo que for renomear secao.

Fazer isso primeiro significa que o resto da fase nao pode quebrar `iterate` por descuido.

### Passo 2: reenquadrar o escopo (DI-20)

`description`: de "resposta a incidentes pos-deploy" para **bug dificil ou regressao de performance,
em producao ou em desenvolvimento**.

Branches a cobrir: usuario diz "diagnostica"/"debuga isso" · reporta algo quebrado, lancando
excecao, falhando · reporta lentidao ou regressao de performance · incidente pos-deploy com log.

O ultimo branch preserva a entrada atual — `iterate` continua chegando aqui pelo mesmo caminho.

Manter `< 250 chars`.

### Passo 3: a fase do loop, antes de tudo

Nova primeira fase, **antes** da hipotese. O que ela pede: um comando — script, invocacao de teste,
curl — que fica **red** neste bug.

O texto precisa carregar o porque, senao vira burocracia: com um sinal pass/fail apertado que fica
red *neste* bug, voce acha a causa; bisect, teste de hipotese e instrumentacao apenas o consomem.
Sem ele, olhar codigo nao salva.

E a instrucao de esforco: **gastar esforco desproporcional aqui.** Ser agressivo, criativo, nao
desistir.

### Passo 4: o gate (INV-03)

Criterio de completude checavel, nao "entendimento alcancado". A fase so fecha quando existe **um
comando** que:

- **red-capable** — percorre o caminho real do bug e assevera o **sintoma exato do usuario**. Nao
  "roda sem erro" — precisa poder pegar *este* bug e ficar verde quando corrigido
- **deterministico** — mesmo veredito toda rodada
- **rapido** — segundos, nao minutos
- **rodavel pelo agente** — sem humano no meio, exceto via o script HITL

E ja foi **executado ao menos uma vez**, com invocacao e saida mostradas (redigidas).

O gate literal, que fecha a fase: *se voce se pegar lendo codigo para montar teoria antes desse
comando existir, **pare**. Sem comando red-capable, sem Fase 2.*

Escrever tambem o alvo positivo ao lado da proibicao — negacao pura arrasta o comportamento
proibido para o contexto (regra do plano01).

### Passo 5: `references/feedback-loops.md` (satelite)

Material que so alguns branches alcancam vai atras de ponteiro — senao a skill estoura.

Conteudo: as **10 formas ranqueadas** (teste falhando · curl/HTTP · CLI+fixture com diff · browser
headless · replay de trace capturado · harness descartavel · property/fuzz · bisect automatizado ·
loop diferencial · script HITL) · **tighten the loop** (mais rapido, sinal mais afiado, mais
deterministico — com a linha que ancora: *um loop flaky de 30s e pouco melhor que nenhum; um
deterministico de 2s e superpoder*) · **bugs nao-deterministicos** (o objetivo nao e repro limpo, e
**elevar a taxa** — 50% e depuravel, 1% nao; loop 100x, paraleliza, estressa, injeta sleeps) ·
**quando genuinamente nao da para construir loop** (parar e dizer; listar o que tentou; pedir acesso
ao ambiente, artefato capturado redigido, ou permissao para instrumentar producao — e **nao**
prosseguir para hipotese).

### Passo 6: o template HITL (DI-21)

`scripts/hitl-loop.template.sh`, 44 linhas, copia literal. Dois helpers: `step` (mostra instrucao,
espera Enter) e `capture` (pergunta, le resposta na variavel). Ao fim imprime `KEY=VALUE` para o
agente ler.

E o **ultimo recurso** das 10 formas: quando um humano precisa clicar, dirige ele de forma
estruturada em vez de perder o loop.

INV-04: o agente **gera** o script; quem roda e a pessoa. Grava em LF, `chmod +x`.

### Passo 7: costurar com o que e nosso (INV-01)

A arvore de flakiness (Etapa 1 atual) e o parente natural da secao de nao-determinismo do satelite:
a arvore **classifica**; a secao diz **o que fazer com a taxa**. Cruzar as duas explicitamente, ou
viram duas respostas para a mesma pergunta.

A defesa contra injecao via log continua na ingestao, intocada. A arvore de camada permanece — ela
alimenta a geracao de hipoteses da fase-02.

### Passo 8: passar a lente do plano01

Alvos: `tight` e `red` sao os termos-ancora — repetir como token, nunca reexplicar. E conferir que a
skill **nao cresceu** proporcionalmente ao que entrou: o satelite existe para isso.

---

## Gotchas

- **G1** — Renumerar antes de consertar `iterate`. Passo 1 e primeiro por isso.
- **G2** — O gate virar recomendacao no meio do texto. Precisa de criterio checavel e posicao de
  fechamento de fase.
- **G3** — Rodar o `hitl-loop` para "testar". Bloqueia em input (INV-04). Verificacao e `bash -n`.
- **G4** — Duplicar nao-determinismo entre a arvore de flakiness e o satelite (Passo 7).
- **G5** — `description` inflada ao acomodar 4 branches. Teto de 250 chars vale.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `iterate` referencia por ancora nomeada; zero referencia a numero de etapa
- [ ] `description` < 250 chars, cobre os 4 branches
- [ ] Gate presente, com os 4 criterios + a exigencia de ja ter rodado uma vez
- [ ] Satelite criado; as 10 formas **nao** estao inline
- [ ] `bash -n skills/incident-response/scripts/hitl-loop.template.sh` exit 0; LF; executavel
- [ ] Arvore de flakiness e arvore de camada intactas (INV-01)
- [ ] Defesa contra injecao via log intacta (INV-01)
- [ ] `SKILL.md` nao passou de ~220 linhas

### Teste de acoplamento

- [ ] Ler as duas referencias em `iterate` e confirmar que caem na secao certa **depois** da
      renumeracao

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test` exit 0
- `grep -n "Etapa [0-9]" skills/iterate/SKILL.md` nao retorna referencia a `incident-response`
- `bash -n` no template exit 0
- `SKILL.md` ≤ ~220 linhas

**Por humano:**
- Ler a fase do loop e saber, para um bug real seu, qual das 10 formas usaria
- O gate e inequivoco: da para dizer se foi cumprido sem julgamento
- Nada do que era nosso sumiu

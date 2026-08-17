---
fase: 02
plano: 06
status: planned
---

# Fase 02: O Miolo — Minimizar, Multi-Hipotese, Instrumentar

**Plano:** 06 — Loop-First no `incident-response`
**Sizing:** ~2h
**Depende de:** fase-01 (o loop precisa existir para ser minimizado)
**Visual:** false

**Decisoes:** DI-22 (3-5 hipoteses com predicao, mostradas ao dev)
**Invariantes:** INV-01 (a arvore de camada permanece e passa a alimentar as hipoteses)

---

## O que esta fase entrega

O trecho entre "tenho um loop red" e "sei o que consertar". Hoje esse trecho e uma hipotese e uma
pergunta de confirmacao.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/incident-response/SKILL.md`

**FORA do escopo**
- Seam correto, cleanup, post-mortem (fase-03)
- O satelite de feedback loops (fase-01, fechado)

---

## Implementacao

### Passo 1: reproduzir e minimizar

Nao temos etapa de minimizacao. Entra depois do loop ficar red:

**Confirmar antes de encolher** — o loop produz o modo de falha que o **usuario** descreveu, nao uma
falha vizinha (bug errado = fix errado); reproduz em rodadas repetidas (ou, se nao-deterministico,
numa taxa alta o bastante); e o sintoma exato esta capturado para as fases seguintes verificarem.

**Encolher** — reduzir ao menor cenario que ainda fica red. Cortar entrada, caller, config, dado e
passo **um por vez**, re-rodando o loop apos cada corte. Manter so o que e load-bearing.

O porque, que precisa estar escrito: repro minimo encolhe o espaco de hipoteses (menos peca movel
para suspeitar) **e** vira o regression test limpo depois.

Pronto quando remover qualquer elemento restante deixa o loop verde.

### Passo 2: 3-5 hipoteses ranqueadas (DI-22)

Substitui a hipotese unica de hoje. A razao, literal: **gerar uma hipotese so ancora na primeira
ideia plausivel.**

Regras:

- Gerar **3-5**, ranqueadas, **antes** de testar qualquer uma
- Cada uma **falsificavel**, declarando a predicao: *"se X e a causa, entao mudar Y faz o bug sumir /
  mudar Z piora"*
- Sem predicao enunciavel, e palpite — descartar ou afiar
- **Mostrar a lista ranqueada ao dev antes de testar.** Ele re-ranqueia na hora ("acabamos de fazer
  deploy de uma mudanca na #3") ou ja descartou alguma. Checkpoint barato
- Nao bloquear: se o dev estiver AFK, seguir com o proprio ranking

### Passo 3: a arvore de camada vira geradora (INV-01)

Nossa arvore (UI · API · banco · build tooling · servico externo · o proprio teste) hoje serve para
localizar **uma** hipotese. Passa a ser **geradora de diversidade**: hipoteses em camadas diferentes
sao estruturalmente diferentes, e e isso que quebra a ancoragem.

O item "o proprio teste (falso negativo)" e nosso e nao existe na fonte — vale manter em destaque,
porque e a hipotese que ninguem gera sozinho.

### Passo 4: instrumentar

Cada probe mapeia a uma **predicao especifica** do passo 2. **Uma variavel por vez.**

Ordem de ferramenta: **debugger/REPL** se o ambiente suportar (um breakpoint vale dez logs) →
**logs direcionados** nas fronteiras que distinguem hipoteses → **nunca** "loga tudo e grepa".

**Taggear todo log de debug com prefixo unico**, ex. `[DEBUG-a4f2]`. Limpeza no fim vira um grep.
Log sem tag sobrevive; log com tag morre.

### Passo 5: branch de performance

Nao cobrimos perf hoje, e o escopo novo (DI-20) inclui regressao de performance.

Para perf, **log geralmente e a ferramenta errada**. Em vez disso: estabelecer medida de baseline
(harness de tempo, `performance.now()`, profiler, plano de query) e entao bisect. **Medir primeiro,
corrigir depois.**

### Passo 6: costurar com a instrumentacao que ja temos

A Etapa 5 atual tem rubrica de instrumentacao temporaria (quando adicionar, quando remover, o que
manter permanente — error boundaries, log de erro de API com contexto, metricas em fluxo critico).

Isso e sobre **instrumentacao de producao que fica**. O passo 4 e sobre **probe de diagnostico que
morre**. Marcar a distincao explicitamente, ou o agente remove o error boundary junto com os
`[DEBUG-]`.

### Passo 7: passar a lente do plano01

Alvo: o teto de linhas. Se a skill estourar, o candidato natural a satelite e o branch de perf — so
alguns branches o alcancam.

---

## Gotchas

- **G1** — Minimizar antes de confirmar que o loop pega o bug **do usuario**. Encolher em cima do
  bug errado produz repro minimo perfeito do problema errado.
- **G2** — Gerar 3-5 hipoteses que sao variacoes da mesma. A arvore de camada existe para forcar
  divergencia estrutural (Passo 3).
- **G3** — Bloquear esperando o dev re-ranquear. Checkpoint, nao gate.
- **G4** — Confundir probe de diagnostico com instrumentacao permanente (Passo 6).
- **G5** — Cortar varias coisas por vez ao minimizar. Um por vez, re-rodando — senao nao se sabe
  qual era load-bearing.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Minimizacao presente, com corte um-por-vez e criterio de pronto
- [ ] Confirmacao "e o bug do usuario" antes de encolher (G1)
- [ ] 3-5 hipoteses com predicao obrigatoria; hipotese unica removida
- [ ] Lista mostrada ao dev antes de testar, **sem bloquear**
- [ ] Arvore de camada presente como geradora, com "o proprio teste" preservado
- [ ] Convencao de tag `[DEBUG-xxxx]` presente
- [ ] Branch de perf presente com "medir primeiro"
- [ ] Distincao probe-temporario vs instrumentacao-permanente explicita (Passo 6)
- [ ] `SKILL.md` dentro do teto

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test` exit 0
- `SKILL.md` ≤ ~220 linhas (satelite se estourar)

**Por humano:**
- Pegar um bug real ja resolvido e checar se as 3-5 hipoteses teriam incluido a causa verdadeira —
  e se ela **nao** seria a #1. Se seria sempre a #1, o passo 2 nao esta gerando divergencia
- Ler o passo 6 e saber o que remover e o que fica, sem reler a Etapa 5

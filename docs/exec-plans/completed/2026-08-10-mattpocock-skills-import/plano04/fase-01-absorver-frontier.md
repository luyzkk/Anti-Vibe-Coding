---
fase: 01
plano: 04
status: planned
---

# Fase 01: Absorver Design Tree, Frontier e Rounds no `grill-me`

**Plano:** 04 — Modelo de Frontier
**Sizing:** ~2.5h
**Depende de:** plano01 fase-01 (o conceito de *premature completion* que justifica DI-15)
**Visual:** false

**Decisoes:** DI-14 (absorver) · DI-15 (fronteira vazia) · DI-16 (fatos nao-bloqueantes)
**Invariantes:** INV-01..INV-04 do plano04

---

## O que esta fase entrega

`grill-me` conduzido por estrutura em vez de varredura de checklist, mantendo a cobertura que a
varredura garantia.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/grill-me/SKILL.md`

**FORA do escopo**
- `write-prd`, `design-twice` — consomem a saida, que nao muda (INV-01)
- O teste (fase-02)
- Extrair skill separada (DI-14 adiou)

---

## Implementacao

### Passo 0: reler o arquivo inteiro

463 linhas, centro do pipeline, sem teste. Reler antes de editar nao e formalidade aqui.

### Passo 1: as 7 categorias viram sementes da arvore

Hoje sao lista paralela varrida em ordem. Passam a ser as **raizes** do design tree: cada categoria
entra como um ramo inicial, e as decisoes do usuario fazem ramificar dali.

Isso e o que impede a falha prevista no README — design tree puro pode fechar sem tocar em seguranca
uma unica vez, porque nenhuma decisao ramificou para la. Como semente, seguranca esta na arvore
desde o inicio; se o usuario responder "nao se aplica", o ramo fecha **explicitamente** em vez de
nunca existir (INV-02).

### Passo 2: reescrever o Passo 3 — rounds

Substituir "Fazer Perguntas (Minimo 5, Maximo 20)" pelo modelo de rodadas:

- A **fronteira** e o conjunto de decisoes cujos pre-requisitos ja estao resolvidos
- Pergunta-se a fronteira **inteira** numa rodada, numerada, cada pergunta com sua recomendacao
- Espera as respostas. Cada resposta remodela a arvore e empurra a fronteira
- Recalcula e faz a proxima rodada
- **Pergunta que depende de outra ainda aberta pertence a uma rodada posterior** — nao a esta

Preservar as regras invioláveis que ja temos: uma decisao por pergunta · resposta vaga vira opcoes
concretas A/B/C · "nao sei" vira trade-offs com recomendacao · "tanto faz" nao e aceito (Passo 4) ·
nunca gerar codigo durante a entrevista.

A recomendacao obrigatoria (INV-04) ja e nossa e coincide com o `➡️` da fonte — manter o nosso
formato, nao trocar por trocar.

### Passo 3: trocar a condicao de parada (DI-15)

`## Condição de Parada (95%)` sai. Entra: **a sessao acaba quando a fronteira esvazia** — todo ramo
do design tree visitado, nada assumido em silencio.

O piso de 5 sai junto. O teto de 20 sai. Justificar no proprio doc, senao alguem re-adiciona:

- `95%` e bound vago — o agente nao distingue pronto de nao-pronto e para quando parece suficiente
- Piso de 5: fronteira vazia com 2 perguntas significa feature simples; forcar mais 3 produz ruido
- Teto de 20: cortaria a fronteira pela metade e devolveria decisao nao resolvida — o oposto do que
  a skill existe para fazer

### Passo 4: a fronteira que nao esvazia

Sem teto, uma feature mal escopada pode gerar fronteira que so cresce. Instrucao explicita: quando
uma rodada produzir mais fronteira do que resolveu, **duas vezes seguidas**, parar e nomear ao
usuario — o escopo esta grande demais, e a saida e fatiar, nao continuar perguntando.

Isso e achado, nao bug. E o sinal que o `wayfinder` da fonte trata como "voce precisa de um mapa,
nao de uma entrevista".

### Passo 5: fatos nao-bloqueantes (DI-16)

`## Passo 2 — Explorar Codebase para Contexto` deixa de ser fase unica e vira regra permanente:

> Achar **fatos** e trabalho do agente; **decisoes** sao do usuario.

Quando uma pergunta da fronteira precisa de um fato do ambiente (arquivo, config, dependencia,
como algo funciona hoje), despachar subagente — nunca perguntar ao usuario algo que da para
descobrir sozinho.

E **nao bloqueia**: uma exploracao em curso e um pre-requisito nao resolvido, entao apenas as
perguntas a jusante daquele fato esperam. O resto da fronteira vai agora.

Manter uma exploracao inicial curta antes da primeira rodada — o suficiente para semear a arvore.
O que sai e a ideia de que a exploracao **termina** ali.

### Passo 6: preservar o que e nosso (INV-02, INV-03)

Nao tocar: Passo 1.5 (hipotese com confianca antes da primeira pergunta) · Passo 4 (respostas vagas
e "tanto faz", incluindo a sondagem quer-vs-acha-que-deveria-querer) · Passo 4.5 (gate de
sintetizar-e-confirmar) · o formato do `CONTEXT.md` de saida (INV-01) · a integracao com o pipeline
e o Learn Point.

Nada disso existe na fonte.

### Passo 7: passar a lente do plano01

Rodar os 6 testes da `writing-for-agents`. Dois alvos especificos:

- **Leading words** — `frontier`, `design tree` e `round` sao os termos-ancora desta reescrita.
  Repetir como token, nunca reexplicar como frase
- **Sprawl** — o arquivo tem 463 linhas. A reescrita **nao pode** aumentar isso; o modelo estrutural
  substitui a varredura sequencial, entao a troca deveria sair no maximo neutra em tamanho

---

## Gotchas

- **G1** — Trocar o formato de pergunta pelo `❓/➡️` da fonte. Nossa recomendacao obrigatoria ja faz
  o mesmo trabalho (INV-04); trocar e churn sem ganho.
- **G2** — Deixar as 7 categorias como lista paralela ao design tree. Duas estruturas dizendo o que
  perguntar e duplicacao, e o agente escolhe uma. Elas sao **sementes**, nao lista.
- **G3** — Mexer no formato do `CONTEXT.md` "de passagem". INV-01: mudar interview e output no mesmo
  plano torna impossivel saber qual quebrou o `write-prd`.
- **G4** — Remover o teto de 20 sem a instrucao do Passo 4 deixa a skill sem freio nenhum.
- **G5** — Fences aninhados: o arquivo tem blocos de exemplo. Quadruple backticks onde houver triple
  interno (compound `2026-04-21`).

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Arquivo **nao maior** que 463 linhas
- [ ] `95%`, piso de 5 e teto de 20 removidos, cada remocao justificada no texto
- [ ] Parada por fronteira vazia presente e binaria
- [ ] Instrucao da fronteira que nao esvazia (2 rodadas seguidas) presente
- [ ] As 7 categorias presentes **como sementes**, nao como lista paralela (G2)
- [ ] Regra de fatos nao-bloqueantes presente e permanente
- [ ] Passos 1.5, 4 e 4.5 intactos (INV-03)
- [ ] Formato do `CONTEXT.md` de saida byte-identico (INV-01)

### Simulacao (antes da fase-02)

- [ ] Percorrer no papel uma feature real com o modelo novo e confirmar que (a) alguma pergunta caiu
      para rodada posterior por dependencia, e (b) a fronteira esvaziou

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- `grep -c "95%"` retorna 0
- Contagem de linhas ≤ 463
- Diff nao toca a secao de formato do `CONTEXT.md`

**Por humano:**
- Ler o Passo 3 e saber dizer, para uma feature sua, quais perguntas ficam na rodada 1 e quais esperam
- A condicao de parada e verificavel sem julgamento
- Nenhuma das 7 categorias virou opcional

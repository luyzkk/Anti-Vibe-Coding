# Memory: Plano 06 — Loop-First no `incident-response`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** in-progress — fase-01 concluida
**Depende de:** plano01 fase-01 (a lente) · plano02 fase-01 (vocabulario de `seam`, so a fase-03)

Precondicoes reconferidas em 2026-08-13: lente presente (`skills/writing-for-agents/`), `seam` no
`tdd-workflow/references/deep-modules.md` (15 ocorrencias), `incident-response` com 176 linhas —
este numero o plano acertou.

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Reenquadrar + a fase do loop | **done** | 5/5 |
| 02 | O miolo | **done** | 1 novo + 3 modificados (plano previa 1) |
| 03 | A saida | **done** | 1/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano06-faseNN-<slug>: <o que mudou e por que>`.

### fase-01 (2026-08-13)

- `DI-Plano06-fase01-posicao-do-loop`: o loop ficou em **Etapa 2**, entre a ingestao de logs e a
  hipotese — nao "antes de tudo", como o Passo 3 do fase doc escreve. Tres razoes: (a) o criterio de
  fechamento exige asseverar **o sintoma exato do usuario**, e o sintoma so se conhece depois dos
  logs; (b) a arvore de flakiness da Etapa 1 e insumo do desenho do loop — ela diz qual taxa de
  reproducao precisa ser elevada, que e exatamente o que a secao de nao-determinismo do satelite
  trata (o Passo 7 pede essa costura, e ela so fecha nesta ordem); (c) o gate e contra pular para
  **hipotese**, e morde igual em posicao 2. A enfase da fonte ("This is the skill") entrou no texto
  da etapa, nao na posicao. Colocar o loop em 1o exigiria duplicar a coleta do sintoma dentro dele.
- `DI-Plano06-fase01-acoplamento-4-nao-2`: o plano nomeia `iterate:108` e `:243`. **Os reais sao
  `:83` e `:222`** — e existem **duas referencias internas** por numero dentro do proprio
  `incident-response` que o plano nao menciona: `Voltar a Etapa 2` (no Regression Test) e
  `Fix sem teste | Voltar a Etapa 3` (em Sinais de Alerta). Renumerar quebraria as quatro. Todas
  viraram ancora nomeada, e o `SKILL.md` ganhou comentario no topo avisando que os titulos de secao
  sao ponteiros externos.
- `DI-Plano06-fase01-description-pt-br`: a `description` continua em pt-BR (240 chars). DI-03 pede
  EN, mas vale para material **portado**; esta e skill pre-existente sendo reenquadrada, e trocar a
  lingua seria churn sem ganho de invocacao.
- `DI-Plano06-fase01-sh-fora-do-manifest`: `generate:manifest` **nao indexa `.sh`** — o total foi de
  419 para 420 com dois arquivos novos. Nao e regressao: `skills/wizard/template.sh` (plano03)
  tambem esta fora. Exec bit garantido no index via `git update-index --add --chmod=+x` (`100755`,
  igual ao do wizard).

### fase-02 (2026-08-13)

- `DI-Plano06-fase02-teto-220-nao-cabe`: **o teto de ~220 linhas foi estimado antes do conteudo
  existir e nao cabe.** Medido: so as tres etapas novas do miolo somam **63 linhas** (Reproduzir e
  Minimizar 18 · Formular Hipoteses 26 · Instrumentar 19), e sao o fluxo principal — nao ha o que
  remover delas. Fechou em **229**. Para chegar la foram feitas tres extracoes e duas podas, todas
  registradas abaixo. **A fase-03 ainda adiciona seam, cleanup e post-mortem** — o teto precisa ser
  renegociado ali, nao espremido.
- `DI-Plano06-fase02-tres-satelites`: o fase doc previa **1 arquivo modificado**; foram 1 novo + 3
  modificados. O Passo 7 nomeia o branch de perf como "candidato natural a satelite", mas ele custa
  8 linhas — sozinho nao resolvia 40. As tres extracoes, por coesao e nao por corte cego:

  | O que saiu | Para onde | Por que ali |
  |---|---|---|
  | Branch de performance | `references/feedback-loops.md` §Regressao de performance | o satelite ja tinha harness de bisect e loop diferencial, que sao as ferramentas do branch |
  | Rubrica de instrumentacao | `references/instrumentation.md` (novo) | so e alcancada por quem instrumentou — reference de branch, nao de fluxo |
  | Arvore de flakiness | `references/feedback-loops.md` §Bugs nao-deterministicos | **o Passo 7 da fase-01 pedia "cruzar as duas explicitamente"; junta-las no mesmo arquivo e o cruzamento mais forte.** Classificar e elevar a taxa viraram uma coisa so |

  INV-01 preservado: as quatro coisas nossas continuam existindo — tres no `SKILL.md`, a arvore de
  flakiness no satelite da propria skill.
- `DI-Plano06-fase02-ponteiros-do-iterate-mudaram-de-novo`: as duas referencias que a fase-01 acabou
  de trocar para ancora nomeada **mudaram outra vez**, agora para os satelites:
  `iterate:83` -> `references/feedback-loops.md` §Bugs nao-deterministicos, e `iterate:222` ->
  `references/instrumentation.md`. Ficou **melhor** que ancora de secao: apontam direto ao alvo em
  vez de a uma secao que o contem. Nao e churn evitavel — a fase-01 nao tinha como saber que o teto
  forcaria extracao na fase-02.
- `DI-Plano06-fase02-poda-por-duplicacao-rendeu-pouco`: a hipotese inicial era podar a rubrica de
  instrumentacao do Hardening por duplicar a Etapa 5 nova. **Medido item a item, quase nada
  duplicava**: "quando adicionar" e criterio de decisao, "log com dado sensivel sai na hora" e regra
  unica, e "o que fica permanente" e o alvo do ponteiro do `iterate`. Cortar teria removido conteudo
  vivo — o erro do §Descartados do plano01. Virou extracao inteira para satelite, nao poda.
  A poda real e sem perda rendeu 10 linhas: `Fix Cirurgico` (12 -> 6) e `Commit` (16 -> 11), os dois
  blocos de pseudo-codigo mais verbosos, convertidos para prosa densa.

### fase-03 (2026-08-13)

- `DI-Plano06-fase03-principio-contradizia-o-seam`: o Passo 2 manda ajustar **os Sinais de Alerta**
  para nao contradizer o teste do seam. Havia um segundo lugar, nao previsto: a secao `## Principio`
  abria com *"Cada fix vem com regression test"* e *"o teste vem antes do fix"* — incondicional, que
  e exatamente o que a Etapa 6 passa a qualificar. Ficou o alerta ajustado **e** o Principio, que
  agora nomeia a unica dispensa (nao ha seam correto) e diz que ela nao e atalho. Mesmo G1, dois
  sites — o plano nomeava um.
- `DI-Plano06-fase03-comentario-do-topo-envelheceu`: o comentario HTML que a **fase-01** colocou no
  topo avisava que `iterate` referencia "Ingestao de Logs Brutos" e "Hardening" **por nome de secao**.
  A fase-02 mudou os dois ponteiros para os satelites, e o comentario virou falso em duas semanas de
  distancia zero. Reescrito para nomear os arquivos reais. E o proprio modo de falha que ele descreve
  ("path-em-doc nao quebra teste"), acontecido dentro do plano que o documenta.
- `DI-Plano06-fase03-ponteiro-arquitetural`: `improve-codebase-architecture` nao existe (G3).
  Encaminha para `/anti-vibe-coding:architecture`, com `code-simplification` como alternativa quando
  o problema for excesso de indirecao. Ambas verificadas em disco. **Se `improve-codebase-architecture`
  entrar pelo plano07, este ponteiro muda de destino** — ja estava anotado neste MEMORY, segue valendo.
- `DI-Plano06-fase03-seam-veio-do-plano02`: o sentido tecnico de `seam` usado aqui e o de
  `tdd-workflow/references/deep-modules.md` (plano02 fase-01), que inclui a linha diretamente
  aplicavel — *"callers e testes atravessam o mesmo seam; se o teste precisa chegar alem da interface,
  o achado e a forma do modulo"*. O ponteiro aponta para la em vez de redefinir o termo.

## Tamanho final e o teto (fechamento do plano06)

| Momento | Linhas do `SKILL.md` |
|---|---|
| Antes do plano | 176 |
| Apos fase-01 | 218 |
| Apos fase-02 | 229 |
| **Apos fase-03** | **255** |

O teto de ~220 do plano nao se sustentou — ver `DI-Plano06-fase02-teto-220-nao-cabe`. Nao foi por
falta de poda: foram **tres extracoes para satelite** (perf, rubrica de instrumentacao, arvore de
flakiness), duas conversoes de pseudo-codigo verboso para prosa, e nenhuma linha de fluxo removida.
O que a skill ganhou nas tres fases — loop com gate, minimizacao, 3-5 hipoteses, instrumentacao,
teste de seam, cleanup, quarta pergunta da autopsia — sao **9 etapas**, e 255 linhas e o custo real
disso com o material de reference ja empurrado para 2 satelites (95 + 29 linhas).

Proximo corte possivel, se alguem quiser voltar a ~220: dividir **por sequencia** (diagnostico ate o
loop red · da minimizacao ao commit). E o corte que a lente recomenda para documento com muitos
steps, e o unico que sobra sem tirar conteudo vivo. Nao feito aqui: e mudanca de superficie de
invocacao, nao de conteudo, e mereceria plano proprio.

## Descricoes do fluxo — RESOLVIDAS na fase-03

A sequencia antiga — "logs brutos -> hipotese -> regression test -> fix" — aparece descrita em tres
lugares fora da skill. Com o loop entrando no meio, ficam **incompletas, nao falsas**; nenhuma e link
quebrado:

| Onde | O que diz |
|---|---|
| `README.md:157` | "Investigação disciplinada: raw logs → hipótese → regression test → fix" |
| `README.md:358` | mesma sequencia, no bloco de comandos |
| `skills/tdd-workflow/SKILL.md:346` | "fluxo completo pos-deploy (logs brutos -> hipotese -> ...)" |

Atualizadas na fase-03, depois de o fluxo estabilizar — reescrever a cada fase teria sido trabalho
triplicado. Os tres agora nomeiam o loop; o do `tdd-workflow` tambem trocou "pos-deploy" pelo escopo
novo (producao **ou** desenvolvimento) e lista as etapas do miolo. `README.md:279` (diagrama de
pipeline) e `README.md:590` (lista de skills) nao descrevem etapas — nao precisaram mudar.

## Estado do alvo antes da mudanca

`skills/incident-response/SKILL.md` — 176 linhas, 6 etapas:

1. Ingestao de logs brutos (+ arvore de flakiness: timing/ambiente/estado/aleatorio)
2. Formular hipotese (+ arvore de camada: UI/API/DB/build/externo/o-proprio-teste)
3. Regression test ANTES do fix (RED obrigatorio)
4. Fix cirurgico
5. Hardening como habito (+ rubrica de instrumentacao temporaria)
6. Commit

Mais: secao de defesa contra injecao via log · tabela Sinais de Alerta · Autopsia pos-fix (3 perguntas).

**O que e nosso e nao existe na fonte (INV-01):** arvore de flakiness · arvore de camada (em especial
"o proprio teste — falso negativo") · defesa contra injecao via log · autopsia, com a pergunta
*"por que passou pela revisao e pelos testes existentes?"*

## Acoplamento fragil (reparar na fase-01, PRIMEIRO)

`skills/iterate/SKILL.md` referencia `incident-response` **por numero de etapa**:

| Linha | Aponta para |
|---|---|
| 108 | "Etapa 1" (diagnostico completo) |
| 243 | "Etapa 5" (rubrica de hardening) |

Inserir a fase do loop no inicio renumera tudo. **Quebra em silencio** — sem erro, sem teste
falhando; o leitor cai na secao errada. Trocar por ancora nomeada.

## Custo aceito em DI-20

O nome `incident-response` deixa de descrever o escopo (que passa a incluir bug em dev e regressao
de perf). Aceito. Mitigacao parcial: a `description` carrega o escopo novo, e e ela que dirige a
invocacao — nao o nome.

Se o nome incomodar depois, renomear e trabalho separado: toca `iterate`, `commands/`, e o hook
SessionStart.

## Ponteiro que nao existe ainda

A fonte encaminha o post-mortem arquitetural para `improve-codebase-architecture`, que **nao esta
portada**. A fase-03 aponta para `architecture` ou `code-simplification`.

**Se `improve-codebase-architecture` entrar, este ponteiro muda de destino.** Anotado aqui para nao
virar link morto.

**Entrou — plano07 fase-01, 2026-08-13.** A skill existe e o ponteiro em `skills/incident-response/`
ganhou o branch de forma de modulo. Como ela e user-invoked, o ponteiro **recomenda ao dev rodar**
em vez de encaminhar por invocacao. Nada mais pendurado aqui.

## Teto de tamanho

176 linhas hoje. Teto de ~220 apos as tres fases. Satelites previstos:
`references/feedback-loops.md` (fase-01, obrigatorio) e, se estourar, o branch de perf da fase-02.

## Gates entre fases

- **fase-01 -> fase-02:** o loop precisa existir para ser minimizado.
- **fase-02 -> fase-03:** o repro minimizado alimenta o regression test.
- **fase-03** tambem depende de **plano02 fase-01** — usa `seam` no sentido tecnico. Sem isso, o
  teste do seam correto vira prosa.

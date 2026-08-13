# Memory: Plano 04 — Modelo de Frontier no `grill-me`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fase-01 executada (2026-08-12) — fase 02 (teste de paridade) pendente
**Depende de:** plano01 fase-01 — **satisfeita**, mergeado. (o conceito de *premature completion* que justifica DI-15)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Absorver design tree / frontier / rounds | **done** | 1/1 |
| 02 | Teste de paridade do contrato | planned | 0/1 |

## Decisoes de implementacao (DI) — fase-01 (2026-08-12)

- **DI-Plano04-fase01-463-e-numero-velho**: o plano repete "463 linhas" em 4 lugares. O arquivo tem
  **415** — `057398c` (plano01 fase-04, remocao de telemetria) cortou 48 linhas. Rastreado por
  `git log` do arquivo. O criterio escrito (`≤ 463`) e o intento declarado ("nao pode aumentar",
  logo ≤ 415) divergem. **Decisao do usuario: aceitar 437**, porque as +22 linhas sao mecanismo que
  nao existia (design tree, fronteira, rounds, fatos nao-bloqueantes, semantica de semente) e nao
  enchimento — pela propria lente, sprawl e "documento longo demais mesmo com toda linha viva".
  Alternativa recusada: podar as perguntas-exemplo das 7 sementes para caber num numero.
- **DI-Plano04-fase01-95-porcento-so-no-heading**: a fase trata `95%` como bound vago implementado.
  Na verdade ele so existia no **titulo** da secao; o corpo ja era um teste preditivo
  ("consigo prever a reacao do dev as proximas 3 perguntas?"), que o proprio texto chamava de
  "verificavel, nao um feeling". Entao a troca nao foi bound-vago → binario, foi **auto-avaliacao
  preditiva → estrutura enumeravel**. O teste preditivo **nao foi jogado fora**: virou cross-check
  com a fronteira vazia, porque ele pega o caso que a fronteira nao pega (ramo fechado cedo demais).
- **DI-Plano04-fase01-absorver-o-piso-existente**: a secao de parada ja tinha um "piso de
  nao-convergencia" ("ja fiz N perguntas e ainda nao consigo prever... quer dar um passo atras?"),
  que e o ancestral direto da regra que o Passo 4 da fase manda **adicionar**. Adicionar sem olhar
  teria criado duas regras de parada-antecipada competindo. Foi **transformado**, nao duplicado: o
  gatilho mudou de "confianca nao sobe" para "round abre mais fronteira do que fecha, 2x seguidas",
  que e observavel em vez de introspectivo.
- **DI-Plano04-fase01-seis-sites-nao-dois**: o plano nomeia 2 lugares com piso/teto/95%. Sao **6**:
  heading do Passo 3, heading da Condicao de Parada, `## Regras` item 3, os tiers do Passo 6
  (`15-20 decisoes` → `15+`), o item de `## Verification`, e o piso de nao-convergencia. Achados por
  grep com controle positivo. Os 3 que o plano nao cita quebrariam em silencio — nenhum tem teste.
- **DI-Plano04-fase01-tabela-de-categorias-era-duplicata**: o Passo 3 tinha uma tabela de 7 linhas
  ("Categoria | O que investigar") **e** o `## Guia de Perguntas por Categoria` logo abaixo, com os
  mesmos 7 itens em forma de probes. Duas estruturas dizendo o que perguntar — exatamente o G2 do
  plano, ja presente antes da minha edicao. A tabela saiu; o guia virou `## As 7 Sementes da Arvore`.
  Isso financiou boa parte do custo do modelo novo.

### Simulacao exigida pelo checklist

Feature real percorrida no papel: **"`.env` fora do `.gitignore`"** (achado do plano03).

| Round | Fronteira | Por que estas |
|---|---|---|
| 1 | ESCOPO: so este repo, ou tambem o scaffold que o `/init` gera nos projetos-alvo? | Raiz da qual quase tudo depende |
| 2 | DADOS: que padroes entram (`.env`, `.env.*`, excecoes como `.env.example`)? · INTEGRACAO: o `TEMPLATE_MANIFEST` precisa rastrear o arquivo novo? | **So existem se o round 1 responder "tambem o /init"** — se for so este repo, os dois ramos fecham |
| 3 | SEGURANCA: o wizard passa a gravar segredo, ou continua so path? | Depende de DADOS: se `.env` fica ignorado, muda o que e seguro gravar la |

(a) **Perguntas cairam para round posterior por dependencia** — os 2 ramos do round 2 nao existem sob
o outro branch do round 1. (b) **A fronteira esvaziou** no round 3: UX e PERFORMANCE fecharam
explicitamente como "nao se aplica — mudanca de config, sem superficie de usuario nem volume".

## Achado registrado, nao corrigido (INV-01 / G3)

`## Pipeline Integration` §1 carrega um **segundo template de CONTEXT.md que contradiz o do Passo 5**:
um usa `## Decisions` / `### D1:` com campos indexados, o outro `## Decisoes Confirmadas` /
`## Requisitos Funcionais` / `## Restricoes`. Sao ~24 linhas e resolveriam o teto de uma vez.

**Nao tocado de proposito.** INV-01 e G3 proibem mexer no formato de saida nesta fase, e `write-prd` e
`design-twice` consomem esse arquivo — mudar interview e output no mesmo plano tornaria impossivel
saber qual quebrou. Verificado que ambas as secoes ficaram **byte-identicas** ao original.

Vale um plano proprio: hoje o agente escolhe um dos dois formatos por sorteio.

## Estado do alvo antes da mudanca

`skills/grill-me/SKILL.md` — **415 linhas, zero teste.** (O plano dizia 463; era o tamanho ate
`057398c`. Ver `DI-Plano04-fase01-463-e-numero-velho`.) Depois da fase-01: **437**.

Estrutura atual: Loading Constraints · Objetivo · Passo 1 (descricao) · Passo 1.5 (hipotese +
confianca) · Passo 2 (explorar codebase) · Passo 3 (perguntas, min 5 / max 20) · Guia por categoria
(7) · Priorizacao por tipo de feature · Passo 4 (respostas vagas) · Passo 4.5 (sintetizar e
confirmar) · Condicao de Parada (95%) · Passo 5 (gerar CONTEXT.md) · Passo 6 (proximo passo) ·
Passo 7 (learn point) · Pipeline Integration.

Consumidores da saida (nao podem quebrar — INV-01):
- `skills/write-prd/SKILL.md` — le e importa as decisoes indexadas
- `skills/design-twice/SKILL.md:50` — importa para reaproveitar decisoes

Padrao de teste a seguir: `tests/plan-feature-template.test.ts` e `tests/quick-plan-template.test.ts`
— paridade de secoes com gate "nunca diminuir".

## Contagem de consumidores (para reavaliar DI-14)

Hoje, mencoes a entrevista por skill:

| Skill | Mencoes |
|---|---|
| `grill-me` | 17 |
| `write-prd` | 6 |
| `consultant` | 2 |
| `quick-plan` | 1 |

DI-14 adiou a extracao do primitivo porque 2 consumidores pesados nao pagam uma description
permanente. **Reavaliar quando `wayfinder` ou `improve-codebase-architecture` entrarem** — a fonte
tem 5 consumidores, e com esses dois nos teriamos 4-6.

## Riscos a observar na execucao

- **Fronteira que nao esvazia.** Sem teto de 20, feature mal escopada gera fronteira crescente. A
  fase-01 exige instrucao de parar apos 2 rodadas que produzam mais fronteira do que resolvem, e
  nomear o problema de escopo ao usuario.
- **Categorias virando decorativas.** Design tree conduzindo pode nunca ramificar para seguranca.
  Por isso as 7 entram como **sementes** da arvore, nao como lista paralela.
- **Sprawl.** Fechou em 437 (de 415), decisao registrada acima. O que financiou o modelo novo foi a
  remocao da tabela de categorias, que ja era duplicata do guia de probes.

## Gates entre fases

- **fase-01 -> fase-02:** o teste e escrito contra o comportamento novo. Escrever antes travaria o
  comportamento antigo.
- **dentro da fase-02:** RED validado a mao (remover uma secao, ver falhar, restaurar) antes de
  declarar o teste pronto. Registrar aqui que foi feito.

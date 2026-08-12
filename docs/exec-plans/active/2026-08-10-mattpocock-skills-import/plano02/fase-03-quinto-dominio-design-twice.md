---
fase: 03
plano: 02
status: planned
---

# Fase 03: Dominio 5 — Interface de Modulo no `design-twice`

**Plano:** 02 — Vocabulario de Seam
**Sizing:** ~1h
**Depende de:** fase-01 (o vocabulario precisa existir)
**Visual:** false

**Decisoes:** DI-08 (fase propria) · **Conflitos:** CF-02 (DESIGN-IT-TWICE redundante)

---

## O que esta fase entrega

Um 5o dominio no `design-twice`, para quando o problema em exploracao **e a interface de um modulo**
— e nao arquitetura, tecnologia, schema ou frontend.

Isto **nao** e o porte do `DESIGN-IT-TWICE.md`. Aquele arquivo e redundante com o nosso (CF-02): o
nosso tem 385 linhas, 4 dominios, 7 divergence lenses, deteccao de convergencia e registro de
decisao; o dele tem ~40 linhas e uma especializacao estreita. O que se aproveita sao as restricoes
divergentes que o nosso Dominio 1 nao cobre, mais o contrato de output.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/design-twice/SKILL.md` — nova subsecao em `## Restricoes Divergentes por Dominio`, nova
  linha em `## Heuristicas de Selecao de Dominio`

**FORA do escopo**
- `references/divergence-lenses.md` — as 7 lentes seguem validas e nao mudam
- Os outros 4 dominios
- O contrato de output geral dos subagentes (v1) — o Dominio 5 **estende**, nao substitui

---

## Implementacao

### Passo 0: reler o arquivo (G4 da fase-02)

`design-twice` recebe ponteiro na fase-02 e dominio aqui. Segundo toque no mesmo arquivo — reler
antes de editar.

### Passo 1: as 3 restricoes divergentes

O Dominio 1 (Arquitetura de Codigo) usa: minimize complexity / maximize flexibility / optimize
performance. Para interface de modulo, "otimize performance" e o eixo errado — nao produz interface
estruturalmente diferente, produz a mesma interface com implementacao diferente.

As 3 do Dominio 5:

| Agente | Restricao (enviada ao subagente) | Filosofia |
|---|---|---|
| A | "Minimize a interface — no maximo 1-3 pontos de entrada. Maximize leverage por ponto de entrada." | Deep radical |
| B | "Otimize para o caller mais comum — torne o caso default trivial, mesmo que o caso raro fique verboso." | Caller-first |
| C | "Desenhe em torno de ports & adapters — assuma que a dependencia atravessa um seam e precisa de dois adapters (producao + teste)." | Ports & adapters |

B e C sao as duas que vieram do repo-fonte; A e reformulacao da nossa "minimize complexity" no
vocabulario de leverage da fase-01. "Maximize flexibility" nao entra: no contexto de interface ela
converge com C e violaria a regra 1 do proprio `design-twice` ("as 3 restricoes DEVEM ser
genuinamente diferentes").

### Passo 2: extensao do contrato de output

Para este dominio, o output do subagente carrega 2 campos alem do contrato v1:

- **Interface completa** — nao so tipos e metodos: invariantes, restricoes de ordem, modos de erro,
  config obrigatoria. Pela definicao da fase-01, interface e tudo que o caller precisa saber.
- **O que fica escondido atras do seam** — e qual a estrategia de dependencia (usando as 4
  categorias da fase-01).

Sem esses dois, as 3 propostas viram assinaturas de funcao e a comparacao perde o que importa.

### Passo 3: eixos de comparacao

A tabela comparativa do Step 4 do `design-twice` ganha, neste dominio, os eixos **depth**
(leverage na interface), **locality** (onde a mudanca concentra) e **posicionamento do seam**.

### Passo 4: heuristica de selecao

Linha nova na tabela de `## Heuristicas de Selecao de Dominio`:

| Sinal nas constraints | Dominio recomendado |
|---|---|
| "Que interface expor", assinatura, encapsulamento, o que esconder, onde por a fronteira | Interface de Modulo |

Cuidado com a fronteira contra o Dominio 1: **Arquitetura de Codigo** e sobre como as pecas se
organizam; **Interface de Modulo** e sobre o que uma peca expoe. Deixar isso explicito, ou a
heuristica manda tudo para o Dominio 1.

### Passo 5: ponteiro para o vocabulario

O brief dos subagentes deste dominio referencia `skills/tdd-workflow/references/deep-modules.md`,
para as 3 propostas nomearem as coisas igual. Sem isso, uma proposta fala "boundary", outra
"camada", outra "seam", e a comparacao vira traducao.

---

## Gotchas

- **G1** — Fronteira Dominio 1 vs Dominio 5. Sem a distincao escrita, a heuristica nunca seleciona
  o 5.
- **G2** — A tentacao de portar `DESIGN-IT-TWICE.md` inteiro. CF-02: o nosso ja e mais completo.
  Isso e absorcao cirurgica de 2 restricoes + contrato, nao porte.
- **G3** — Segundo toque no arquivo apos a fase-02. Reler.
- **G4** — `design-twice` tem 385 linhas. Um 5o dominio e ~15 linhas; se passar disso, o material
  extra pertence a `references/`.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Dominio 5 presente com 3 restricoes genuinamente divergentes
- [ ] Extensao do contrato de output documentada (interface completa + o que fica atras do seam)
- [ ] Eixos depth / locality / seam na comparacao
- [ ] Linha na tabela de heuristicas + fronteira contra Dominio 1 explicita
- [ ] Ponteiro para a referencia dentro do brief dos subagentes
- [ ] Adicao ≤ ~15 linhas (G4)

### Teste de divergencia

- [ ] Pegar um modulo real do repo e verificar, no papel, que as 3 restricoes produziriam interfaces
      **estruturalmente** diferentes — nao a mesma interface com nomes trocados. Se convergirem, as
      restricoes estao mal escritas (regra 2 do proprio `design-twice`)

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- 1 arquivo modificado, adicao ≤ ~15 linhas
- Tabela de heuristicas com a linha nova

**Por humano:**
- Ler as 3 restricoes e conseguir prever 3 interfaces diferentes para o mesmo modulo
- Conseguir dizer, para um problema concreto, se ele e Dominio 1 ou Dominio 5 — sem hesitar

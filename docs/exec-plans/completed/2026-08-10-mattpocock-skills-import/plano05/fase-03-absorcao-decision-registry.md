---
fase: 03
plano: 05
status: planned
---

# Fase 03: Absorcao no `decision-registry` — Filtro, Categorias e Tier Leve

**Plano:** 05 — `domain-modeling`
**Sizing:** ~1.5h
**Depende de:** nenhuma — independente das fases 01 e 02
**Visual:** false

**Decisoes:** DI-17 (ADR absorve, nao vira skill) · DI-18 (tier leve ao lado do completo)
**Invariantes:** INV-03 (template completo intocado)

---

## O que esta fase entrega

Tres adicoes ao `decision-registry`. Nenhuma substituicao — nosso ADR ganha da fonte em quase tudo,
e o que entra e o que ele nao tem.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/decision-registry/SKILL.md`

**FORA do escopo**
- `lib/adr-writer.ts` — o tier leve usa o mesmo writer; se exigir mudanca de codigo, e sinal de que
  o tier foi desenhado grande demais
- O template completo (INV-03)
- ADRs existentes — continuam validos, sem migracao

---

## Implementacao

### Passo 1: o filtro de 3 criterios

Nossa secao `## When to Write an ADR` tem tabela de **gatilhos por topico** (framework, schema,
auth, arquitetura de API, build tool, "qualquer decisao expensive to reverse"). Temos 1 dos 3
criterios da fonte.

Adicionar o filtro **acima** da tabela, porque ele e o gate e a tabela e o catalogo:

1. **Dificil de reverter** — mudar de ideia depois custa de verdade
2. **Surpreendente sem contexto** — um leitor futuro vai olhar o codigo e pensar "por que raios
   fizeram assim?"
3. **Resultado de trade-off real** — havia alternativa genuina e escolheu-se uma por razoes especificas

Os tres precisam ser verdadeiros. E a fonte da o motivo de cada um, que vale copiar: se e facil de
reverter, voce vai reverter mesmo; se nao e surpreendente, ninguem vai se perguntar; se nao havia
alternativa, nao ha o que registrar alem de "fizemos o obvio".

Manter a tabela de gatilhos — ela e catalogo util. Mas o filtro passa a mandar: gatilho que nao
passa nos 3 criterios nao vira ADR.

### Passo 2: as 3 categorias ausentes

Adicionar ao que qualifica:

- **Desvio deliberado do caminho obvio** — *"SQL manual em vez de ORM porque X"*. Qualquer coisa em
  que um leitor razoavel assumiria o contrario. **Impede o proximo engenheiro de "consertar" o que
  foi intencional** — e a categoria de maior retorno da lista
- **Restricoes invisiveis no codigo** — *"nao podemos usar AWS por compliance"*, *"resposta abaixo
  de 200ms por contrato com o parceiro"*. Nao estao em lugar nenhum do repo
- **Decisoes de fronteira e escopo** — *"dados de Customer pertencem ao contexto Customer; os outros
  referenciam por ID"*. Os **naos** explicitos valem tanto quanto os sins

### Passo 3: o tier leve (DI-18)

O problema concreto: nossos Red Flags marcam "ADR sem Alternatives Considered" e "sem Consequences".
O ADR do Passo 2 e uma frase — nao ha alternativa a comparar, porque a decisao foi *nao seguir o
caminho obvio*, e o caminho obvio nao e uma alternativa avaliada, e o default que se rejeitou.

Hoje esse ADR nao cabe no formato sem parecer incompleto. Resultado: **nao e escrito.**

Dois tiers:

| Tier | Quando | Formato |
|---|---|---|
| **Completo** (atual, INV-03) | decisao com alternativas reais avaliadas | Context · Decision · Alternatives (A/B/C) · Consequences |
| **Leve** | desvio deliberado · restricao invisivel · fronteira/escopo | titulo + 1-3 frases: contexto, o que se decidiu, por que |

O Red Flag "sem Alternatives Considered" passa a valer **so no tier completo**. Ajustar o texto do
Red Flag, senao ele contradiz o tier novo — e um Red Flag que se contradiz treina o leitor a ignorar
os outros.

O tier leve usa o mesmo `adr-writer.ts`, mesma numeracao sequencial, mesmo `docs/design-docs/`.
So o corpo e menor.

### Passo 4: como escolher o tier

Uma linha, para nao virar julgamento livre: **existe alternativa que foi genuinamente avaliada?**
Sim → completo. Nao → leve.

Isso amarra o tier ao criterio 3 do filtro do Passo 1, em vez de deixar por conta do humor.

### Passo 5: passar a lente do plano01

Alvos: o filtro e a tabela de gatilhos nao podem dizer a mesma coisa de duas formas (duplicacao);
e a secao ja e longa, entao o que entrar precisa caber sem empurrar a skill para sprawl.

---

## Gotchas

- **G1** — Tier leve virando desculpa para nunca escrever o completo. O Passo 4 amarra por criterio,
  nao por preferencia. E o tier leve e **restrito as 3 categorias**, nao disponivel para tudo.
- **G2** — Red Flag contraditorio. Se "sem Alternatives" continuar valendo para todo ADR, o tier
  leve nasce marcado como problema.
- **G3** — Mexer no `adr-writer.ts`. Se o tier leve exigir codigo novo, ele foi desenhado grande
  demais — e titulo mais tres frases, nao um segundo schema.
- **G4** — Duplicar o filtro e a tabela de gatilhos. Filtro = gate (propriedades); tabela = catalogo
  (topicos). Deixar a relacao explicita.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Filtro de 3 criterios presente, acima da tabela, com o motivo de cada criterio
- [ ] As 3 categorias novas presentes com exemplo
- [ ] Tier leve definido com criterio de escolha objetivo (Passo 4)
- [ ] Red Flag de Alternatives escopado ao tier completo (G2)
- [ ] Template completo inalterado (INV-03)
- [ ] `adr-writer.ts` nao tocado (G3)

### Teste retroativo

- [ ] Pegar 3 ADRs existentes em `docs/design-docs/` e conferir que ainda passariam no filtro de 3
      criterios. Se algum nao passar, e informacao: ou o filtro esta apertado demais, ou aquele ADR
      nao precisava existir. **Registrar qual dos dois** no MEMORY
- [ ] Achar 1 decisao real deste repo que hoje **nao** tem ADR e caberia no tier leve. Se nao achar
      nenhuma, o tier leve pode ser solucao para problema inexistente — registrar isso tambem

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test` exit 0
- `git diff` toca 1 arquivo
- Secao do template completo byte-identica

**Por humano:**
- Dada uma decisao concreta, saber em 10 segundos se ela vira ADR e de qual tier
- O teste retroativo rodou e o resultado esta registrado, mesmo que tenha sido inconveniente

---
fase: 01
plano: 05
status: planned
---

# Fase 01: A Skill de Glossario

**Plano:** 05 — `domain-modeling`
**Sizing:** ~2h
**Depende de:** plano01 fase-01 (a lente)
**Visual:** false

**Decisoes:** DI-12 (`docs/GLOSSARY.md`) · DI-17 (glossario vira skill) · DI-19 (sem multi-contexto) · DI-03 (corpo pt-BR)
**Invariantes:** INV-01 (glossario e so glossario) · INV-02 (so termos do dominio) · INV-04 (sem multi-contexto)

---

## O que esta fase entrega

A disciplina ativa de construir e afiar o vocabulario do projeto. **Ativa** e a palavra que separa
esta skill de um habito: apenas *ler* o glossario para escolher uma palavra e uma linha de prosa que
qualquer skill faz. Esta skill e para quando o modelo esta sendo **mudado**.

---

## Arquivos Afetados

**NOVOS**
- `skills/domain-modeling/SKILL.md`
- `skills/domain-modeling/GLOSSARY-FORMAT.md`

**MODIFICADOS**
- `THIRD-PARTY-NOTICES.md` — atribuicao MIT

**FORA do escopo**
- Scaffold e ponteiro no `AGENTS.md` (fase-02)
- `decision-registry` (fase-03)
- Multi-contexto (DI-19)

---

## Implementacao

### Passo 1: frontmatter

`name: domain-modeling` · `description` EN < 250 chars · `user-invocable: true` ·
`disable-model-invocation: false` · `allowed-tools: Read, Grep, Glob, Write, Edit`.

Os branches que devem disparar — e sao momentos em que o humano **nao** lembraria de pedir:

- o usuario usa um termo que conflita com o glossario
- o usuario usa termo difuso ou sobrecarregado
- o modelo de dominio esta sendo discutido
- outra skill precisa manter o glossario

A description precisa carregar tambem a **fronteira passiva-vs-ativa**: ler o glossario para nomear
algo nao e esta skill. So o construir/afiar e.

### Passo 2: as quatro disciplinas de sessao

Copia traduzida. Cada uma vem com a **forma da intervencao**, nao so o principio — e a forma que faz
a disciplina acontecer:

| Disciplina | Forma |
|---|---|
| Desafiar contra o glossario | *"seu glossario define 'cancelamento' como X, mas voce parece querer dizer Y — qual e?"* |
| Afiar linguagem difusa | *"voce diz 'conta' — e Customer ou User? Sao coisas diferentes"* |
| Cenarios concretos | inventar cenarios que sondam borda e forcam precisao na fronteira entre conceitos |
| Cruzar com o codigo | *"seu codigo cancela Orders inteiras, mas voce disse que cancelamento parcial existe — qual esta certo?"* |

### Passo 3: gravar inline, nunca em lote

Quando um termo e resolvido, atualizar `docs/GLOSSARY.md` **naquele momento**. Nao acumular para o
fim — termo acumulado e termo perdido, e o valor esta em capturar enquanto a distincao esta fresca.

### Passo 4: os dois invariantes, escritos como invariantes

**INV-01 — glossario e glossario e nada mais.** Sem detalhe de implementacao. Nao e spec, nao e
rascunho, nao e repositorio de decisao tecnica — decisao vai para ADR (`decision-registry`).

**INV-02 — so termos especificos deste dominio.** Conceito geral de programacao (timeout, retry,
DTO, feature flag) nao entra, mesmo que o projeto use muito. O teste antes de adicionar: *este
conceito e unico deste contexto, ou e programacao em geral?* So o primeiro entra.

Escrever os dois como alvo positivo alem da proibicao — negacao pura arrasta o comportamento
proibido para o contexto (regra do plano01).

### Passo 5: `GLOSSARY-FORMAT.md`

O formato, atras de ponteiro (so quem vai gravar precisa):

- Entrada = **termo** + 1-2 frases + linha `_Evitar_:` com os sinonimos rejeitados
- **Ser opinativo** — quando existem varias palavras para o mesmo conceito, escolher a melhor e
  listar as outras em `_Evitar_`. Um glossario que aceita tres nomes nao resolveu nada
- Definir o que a coisa **e**, nao o que ela faz
- Agrupar sob subtitulo quando surgirem clusters naturais; lista plana serve enquanto for coeso

Adaptar para `docs/GLOSSARY.md` (DI-12), nao `CONTEXT.md` — e a reescrita obrigatoria que CO-01
deixou registrada.

### Passo 6: fronteira com o `decision-registry`

Uma linha, para as duas skills nao brigarem: **termo** vai para o glossario; **decisao** vai para
ADR. Quando a conversa produzir os dois, gravar nos dois lugares.

Sem isso o modo de falha e previsivel — o glossario comeca a receber justificativa de decisao e
vira spec, que e exatamente INV-01.

### Passo 7: passar a lente do plano01

Alvos: a fronteira passiva-vs-ativa esta na description (senao a skill dispara toda vez que alguem
le o glossario); INV-01 e INV-02 aparecem como alvo positivo; o formato esta atras de ponteiro e nao
inline.

---

## Gotchas

- **G1** — Traduzir para `CONTEXT.md` por reflexo, seguindo a fonte. CO-01: e `docs/GLOSSARY.md`.
- **G2** — A skill disparar toda vez que alguem menciona um termo do dominio. A fronteira e
  *mudanca* do modelo, nao *consumo* dele.
- **G3** — `GLOSSARY.md` recebendo justificativa de decisao. INV-01 + a fronteira do Passo 6.
- **G4** — Multi-contexto entrando de carona pela traducao do formato. DI-19.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `description` < 250 chars e carrega a fronteira passiva-vs-ativa
- [ ] As 4 disciplinas presentes, cada uma com a forma da intervencao
- [ ] Gravacao inline (nunca em lote) explicita
- [ ] INV-01 e INV-02 como alvo positivo, nao so proibicao
- [ ] Fronteira glossario-vs-ADR presente
- [ ] Zero mencao a `CONTEXT.md` como destino (G1)
- [ ] Zero multi-contexto (G4)
- [ ] `THIRD-PARTY-NOTICES.md` atualizado

### Teste de aplicacao

- [ ] Pegar 3 termos reais deste repo (ex: `harness`, `compound note`, `parity gate`) e escrever as
      entradas seguindo o formato. Se algum nao passar em INV-02, e sinal de que o teste de "unico
      deste contexto vs programacao em geral" precisa estar mais afiado no doc

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run typecheck` exit 0
- `description` < 250 chars
- `grep -c "CONTEXT.md"` retorna 0 nos dois arquivos novos

**Por humano:**
- Ler a description e saber quando a skill **nao** deve disparar
- Ler INV-02 e conseguir decidir, para um termo concreto, se ele entra ou nao
- Ler o Passo 6 e saber onde vai um termo e onde vai uma decisao

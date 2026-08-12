---
fase: 03
plano: 11
status: planned
---

# Fase 03: `grill-with-docs` — Um Ponteiro no `grill-me`

**Plano:** 11 — Absorcoes Finais
**Sizing:** ~1h
**Depende de:** **plano05** (`domain-modeling` precisa existir) · plano04 recomendado
**Visual:** false

**Decisoes:** DI-37 (ponteiro, nao skill)
**Invariantes:** INV-01 (sem skill nova) · INV-04 (nao apontar para o que nao existe)

---

## O que esta fase entrega

A composicao grilling-com-docs, sem uma skill para ela.

A skill da fonte tem sete linhas, e o conteudo inteiro e *"Run a `/grilling` session, using the
`/domain-modeling` skill."* Com plano04 (frontier no `grill-me`) e plano05 (`domain-modeling`
model-invoked), a composicao ja esta disponivel — falta so o `grill-me` saber que deve alcanca-la.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/grill-me/SKILL.md`

**FORA do escopo**
- Criar `skills/grill-with-docs/` (DI-37, INV-01)
- `domain-modeling` — e **consumida**, nao alterada

---

## Implementacao

### Passo 0: confirmar que o plano05 entregou (INV-04)

`domain-modeling` precisa existir, e `docs/GLOSSARY.md` precisa estar no scaffold. Apontar antes
disso cria link morto — e o `harness:validate` faz link-check, entao quebra a validacao.

Se o plano05 nao entregou, **esta fase nao roda.**

### Passo 1: reler o `grill-me`

O plano04 reescreveu o coracao dele (design tree, frontier, rounds, parada por fronteira vazia,
fatos nao-bloqueantes). Editar contra a versao antiga falharia em silencio.

### Passo 2: o ponteiro

Uma linha, no corpo — nunca na `description`.

O gatilho tem duas metades, e as duas importam:

- **termo novo ou disputado** aparece na entrevista → oferecer registrar no glossario
- **decisao dificil de reverter** e tomada → oferecer ADR, pelo filtro de 3 criterios do plano05
  fase-03

E o **inline**: gravar no momento em que a decisao cristaliza, nao acumular para o fim da entrevista.
Termo acumulado e termo perdido — a distincao que estava clara na conversa some meia hora depois.

### Passo 3: oferecer, nunca fazer sozinho

Sua regra registrada: sugerir, nunca executar. E o `domain-modeling` grava em arquivo do projeto.

O ponteiro precisa dizer **oferecer**. A entrevista nao pode parar para escrever glossario sem o
usuario querer — e o `grill-me` ja tem o gate de sintetizar-e-confirmar (Passo 4.5) para o que vai
para disco.

Conferir se o registro do glossario cabe naquele gate ou se precisa de confirmacao propria.
Registrar como `DI-Plano11-fase03-gate`.

### Passo 4: a fronteira contra o `CONTEXT.md`

`grill-me` grava decisoes indexadas em `docs/exec-plans/.../CONTEXT.md`. `domain-modeling` grava
termos em `docs/GLOSSARY.md`. **Dois destinos, dois conteudos** (CO-01, DI-12).

O ponteiro precisa deixar isso obvio, ou o modo de falha e previsivel: termo indo para o `CONTEXT.md`
da feature, onde some quando o plano fecha e vai para `completed/`.

Regra de uma linha: **decisao daquela feature → `CONTEXT.md`; termo do dominio do projeto →
`GLOSSARY.md`.**

### Passo 5: conferir disparo

Dois cenarios:

- entrevista sobre uma feature em que o usuario usa "conta" para duas coisas diferentes → o
  ponteiro dispara?
- entrevista em que todas as decisoes sao de implementacao, sem termo novo → **nao** deve disparar

O segundo e o teste que importa. Ponteiro que dispara em toda entrevista transforma `grill-me` em
sessao de glossario.

---

## Gotchas

- **G1** — Rodar antes do plano05 (Passo 0). Link morto quebra `harness:validate`.
- **G2** — Editar contra a versao pre-plano04 do `grill-me` (Passo 1).
- **G3** — Ponteiro que grava em vez de oferecer (Passo 3).
- **G4** — Termo indo para o `CONTEXT.md` da feature (Passo 4). Some quando o plano fecha.
- **G5** — Inflar a `description` do `grill-me`, que ja e das maiores do repo.

---

## Verificacao

### Checklist

- [ ] `plano05` entregue; `docs/GLOSSARY.md` no scaffold (Passo 0)
- [ ] `bun run harness:validate` verde — link-check passa
- [ ] `bun test tests/grill-me-contract.test.ts` verde (o teste do plano04 fase-02)
- [ ] Ponteiro tem 1 linha, no corpo
- [ ] `description` do `grill-me` nao tocada
- [ ] As duas metades do gatilho presentes (termo · decisao dificil de reverter)
- [ ] Inline explicito, com o porque
- [ ] Verbo e **oferecer**
- [ ] Fronteira `CONTEXT.md` vs `GLOSSARY.md` em uma linha
- [ ] Os 2 cenarios do Passo 5 conferidos, inclusive o que nao deve disparar

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test` exit 0
- `git diff` mostra 1 arquivo, so no corpo, +1 linha

**Por humano:**
- Numa entrevista so de decisao de implementacao, o ponteiro fica quieto
- Dado um termo novo, saber que ele vai para `GLOSSARY.md` e nao para o `CONTEXT.md` da feature

---
fase: 02
plano: 11
status: planned
---

# Fase 02: `tdd` — Tautologico Afiado, Seams Pre-Acordados, e uma Divergencia Registrada

**Plano:** 11 — Absorcoes Finais
**Sizing:** ~1.5h
**Depende de:** plano01 fase-01 (a lente) · **plano02 fase-01** (o vocabulario de `seam`)
**Visual:** false

**Decisoes:** DI-36 (rejeitar "refactoring fora do loop", registrando por que)
**Invariantes:** INV-03 (RED-GREEN-REFACTOR permanece)

---

## O que esta fase entrega

Uma afiacao, um gap, e uma discordancia escrita como discordancia.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/tdd-workflow/SKILL.md`
- `agents/tdd-verifier.md` — a definicao afiada de tautologico

**FORA do escopo**
- `references/deep-modules.md` — o vocabulario de `seam` vem do plano02, e citado aqui
- Mudar o ciclo RED-GREEN-REFACTOR (INV-03, DI-36)

---

## Implementacao

### Passo 1: tautologico, a versao que importa

Nosso `tdd-verifier:82` pega a versao trivial: `expect(true).toBe(true)`, snapshot vazio,
`expect(undefined).toBeUndefined()` sem setup. Essas sao obvias.

A versao da fonte e sobre **recomputacao**:

> a assertion recalcula o valor esperado do mesmo jeito que o codigo faz —
> `expect(add(a, b)).toBe(a + b)`, um snapshot derivado a mao pela mesma logica, uma constante
> asseverada igual a si mesma — entao **passa por construcao e nunca pode discordar do codigo**.

E o remedio, que e a parte acionavel: **o valor esperado tem que vir de fonte independente** —
literal conhecido-bom, exemplo trabalhado a mao, a spec.

Isto parece um teste de verdade. E a razao de passar despercebido.

Adicionar em **dois lugares diferentes, com papeis diferentes**:

- `agents/tdd-verifier.md` — para **pegar** depois (junto da versao trivial que ja esta la)
- `skills/tdd-workflow/SKILL.md` — para **evitar** enquanto escreve

Nao e duplicacao: sao momentos distintos. Mas a definicao canonica fica num lugar so, e o outro cita.
Decidir qual e registrar como `DI-Plano11-fase02-tautologico-canonico`.

### Passo 2: seams pre-acordados

Regra: **nenhum teste e escrito num seam nao confirmado.**

Antes de escrever qualquer teste, anotar em quais seams vai testar e **confirmar com o usuario**. A
pergunta que a fonte usa: *"qual e a interface publica, e em quais seams devemos testar?"*

O porque, que precisa estar escrito senao vira ritual: **voce nao consegue testar tudo** — acordar os
seams antes e como o esforco de teste cai nos caminhos criticos e na logica complexa, em vez de em
toda borda.

Usa `seam` no sentido do plano02 fase-01 — dai a dependencia. Sem aquele vocabulario, "seam" aqui
vira sinonimo vago de "lugar onde testar".

Quando a **forma** da interface e que esta em questao — quao profundo o modulo deveria ser, onde o
seam pertence, o que a interface expoe — apontar para `references/deep-modules.md`. E referencia a
consultar, nao sessao a rodar.

### Passo 3: a divergencia, escrita como divergencia (DI-36)

A fonte diz: *"Refactoring nao e parte do loop. Pertence a etapa de review, nao ao ciclo red → green."*

**Rejeitamos.** E o registro precisa dizer o que rejeitamos e por que, porque quem comparar as duas
skills depois vai achar que passou batido:

> Divergimos da fonte aqui. Refatorar com o teste verde na mao **e** a rede de seguranca que torna o
> refactor seguro — e o momento em que o codigo esta mais fresco na cabeca. Empurrar para a review
> separa o momento em que voce entende o codigo do momento em que voce o melhora, e o segundo chega
> sem o primeiro. Mantemos RED-GREEN-REFACTOR.

Uma observacao honesta a incluir: a preocupacao da fonte e legitima — refactor grande escondido num
commit de feature. Mas o remedio nosso e outro: `git-workflow-and-versioning` ja pede atomicidade,
e refactor amplo deveria ser commit separado. **O problema e de granularidade de commit, nao de
posicao no ciclo.**

Dizer isso e mais forte que so discordar.

### Passo 4: horizontal slicing

A fonte nomeia como anti-padrao: escrever todos os testes primeiro, depois toda a implementacao.
Testes em lote verificam comportamento **imaginado** — voce testa a forma das coisas em vez do
comportamento real, os testes ficam insensiveis a mudanca de verdade, e voce se compromete com a
estrutura de teste antes de entender a implementacao.

Nosso `tdd-workflow` ja tem "vertical slices" na description — temos o positivo. Conferir se o
**anti-padrao** esta nomeado. Se nao estiver, entra: nomear o erro e o que o torna reconhecivel.

### Passo 5: passar a lente do plano01

Alvo: `tdd-workflow` tem 450 linhas. O que entra aqui e pequeno, mas conferir se a secao de
anti-padroes ja existe ou se estamos criando uma terceira lista paralela de "coisas que dao errado".

---

## Gotchas

- **G1** — Adotar "refactoring fora do loop" por reflexo de fidelidade a fonte. DI-36 e explicito.
- **G2** — Rejeitar em silencio. Divergencia nao registrada vira omissao aparente.
- **G3** — Duplicar a definicao de tautologico nos dois arquivos. Canonica num lugar, citada no
  outro (Passo 1).
- **G4** — Usar `seam` sem o vocabulario do plano02. Vira sinonimo vago.
- **G5** — Criar terceira lista de anti-padroes se ja houver uma (Passo 5).

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `bun run agents:contract` verde
- [ ] Tautologico-por-recomputacao presente, com o remedio (fonte independente)
- [ ] Definicao canonica num lugar so; `DI-Plano11-fase02-tautologico-canonico` registrado
- [ ] Seams pre-acordados, com o porque e a pergunta ao usuario
- [ ] Ponteiro para `references/deep-modules.md` quando a forma da interface esta em questao
- [ ] Divergencia do refactor **escrita**, com o argumento e a observacao sobre granularidade de commit
- [ ] RED-GREEN-REFACTOR intacto (INV-03)
- [ ] Horizontal slicing nomeado como anti-padrao

### Teste da afiacao

- [ ] Escrever um exemplo de teste tautologico-por-recomputacao que **passaria** no nosso
      `tdd-verifier` de hoje. Se nao conseguir construir um, a versao trivial ja cobria e a afiacao
      nao se paga — registrar isso

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test && bun run agents:contract` exit 0
- `grep -c "RED-GREEN-REFACTOR"` continua > 0 em `tdd-workflow`
- Diff em 2 arquivos

**Por humano:**
- Ler a definicao de tautologico e reconhecer o padrao num teste que parece bom
- Ler a divergencia e entender **por que** discordamos, nao so que discordamos
- Saber, antes de escrever um teste, o que "confirmar o seam" exige na pratica

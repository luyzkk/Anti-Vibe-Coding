---
fase: 02
plano: 03
status: planned
---

# Fase 02: Ponteiros — `infrastructure` e `init`

**Plano:** 03 — `wizard`
**Sizing:** ~45min
**Depende de:** fase-01
**Visual:** false

**Decisoes:** DI-10 (model-invoked, logo alcancavel por outra skill) · DI-11 (os dois ponteiros)

---

## O que esta fase entrega

Duas linhas que transformam a skill de "existe" em "e alcancada no momento certo".

A `wizard` e model-invoked, entao o agente ja pode chegar nela sozinho. Os ponteiros existem para o
caso mais provavel: o agente esta **dentro** de `infrastructure` ou `init`, chega num passo que so o
humano executa, e precisa saber que existe uma saida melhor do que despejar instrucoes em prosa.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/infrastructure/SKILL.md`
- `skills/init/SKILL.md`

**FORA do escopo**
- `description` de qualquer uma das duas — o ponteiro vai no corpo
- Reestruturar `infrastructure` (426 linhas) — so a linha nova

---

## Implementacao

### Passo 1: `infrastructure`

O buraco medido: 426 linhas sobre DNS, SSL, Let's Encrypt, Route 53, CloudFront, Docker e CI/CD,
com **zero** ocorrencias de `dashboard`, `console`, `painel`, `manualmente`, `acesse`, `credencia`.

Gatilho a nomear: a consulta terminou numa acao que o agente nao pode executar — apontar nameserver
no registrador, revelar chave num painel, aprovar um certificado, criar zona hospedada num console.

O ponteiro precisa dizer **oferecer**, nao **gerar**. Regra registrada do usuario: sugerir, nunca
executar por conta propria.

### Passo 2: `init`

O `/init` faz onboarding e ja usa `AskUserQuestion`. A distincao que o ponteiro tem que carregar:

- Pergunta cuja resposta o **agente** usa para agir → `AskUserQuestion`, como hoje
- Passo que o **humano** executa fora da sessao, e talvez de novo depois → wizard

Sem essa distincao escrita, o ponteiro compete com o `AskUserQuestion` em vez de complementar.

### Passo 3: conferir disparo

Para cada uma, descrever um cenario concreto e verificar que o texto cobre o caminho:

- `infrastructure`: "preciso apontar meu dominio na Hostinger para a Vercel"
- `init`: "o projeto precisa de `DATABASE_URL` e de um secret de deploy no GitHub Actions"

Se o ponteiro nao dispararia nesses, afiar a redacao — pela regra do plano01, afia o ponteiro antes
de mover qualquer material.

---

## Gotchas

- **G1** — Dois ponteiros com a mesma frase generica sao duplicacao com custo dobrado e disparo
  nenhum. Cada um nomeia o gatilho **daquela** skill.
- **G2** — Nao inchar `description`. O ponteiro vai no corpo; description e o material mais caro do
  repo (15.149 chars medidos no plano01).
- **G3** — Em `init`, o risco e o ponteiro canibalizar o `AskUserQuestion`. A distincao do passo 2
  precisa estar na linha, nao subentendida.
- **G4** — `infrastructure` tem 426 linhas. Achar o lugar certo importa: perto de onde o
  procedimento manual aparece, nao no fim.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Cada ponteiro tem no maximo 1 linha
- [ ] Gatilhos distintos; zero frase repetida entre os dois
- [ ] Nenhuma `description` tocada
- [ ] Os 2 cenarios do passo 3 conferidos
- [ ] O ponteiro do `init` distingue wizard de `AskUserQuestion`

---

## Criterio de Aceite

**Por maquina:**
- `git diff` mostra exatamente 2 arquivos, so no corpo
- Cada arquivo ganhou ≤ 1 linha
- `harness:validate` exit 0

**Por humano:**
- Ler o ponteiro do `init` e saber quando **nao** e wizard
- Simular mentalmente os 2 cenarios e ver o ponteiro disparar

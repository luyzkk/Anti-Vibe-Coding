---
fase: 03
plano: 06
status: planned
---

# Fase 03: A Saida — Seam Correto, Cleanup, Post-Mortem

**Plano:** 06 — Loop-First no `incident-response`
**Sizing:** ~1.5h
**Depende de:** fase-02 · **plano02 fase-01** (o vocabulario de `seam`)
**Visual:** false

**Invariantes:** INV-01 (a autopsia e nossa e fica)

---

## O que esta fase entrega

O fechamento do fluxo, e a mudanca mais sutil do plano: **o regression test deixa de ser
incondicional.**

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/incident-response/SKILL.md`

**FORA do escopo**
- O formato de commit (Etapa 6 atual) — so ganha uma linha
- `improve-codebase-architecture` — nao portada; o ponteiro fica condicional

---

## Implementacao

### Passo 1: o teste do seam correto

Hoje mandamos escrever regression test incondicionalmente. A fonte qualifica, e a qualificacao
importa.

Um **seam correto** e aquele em que o teste exercita o **padrao real do bug** como ele ocorre no
call site. Se o unico seam disponivel for raso demais — teste de caller unico quando o bug precisa
de multiplos callers, teste unitario que nao consegue replicar a cadeia que disparou o bug — um
regression test ali da **falsa confianca**. Pior que nao ter: parece coberto.

Usa `seam` no sentido do plano02 fase-01 — por isso a dependencia.

**Se nao existe seam correto, isso em si e o achado.** Registrar. A arquitetura esta impedindo o bug
de ser travado. Sinalizar para a fase seguinte em vez de escrever um teste que mente.

Quando existe: transformar o repro minimizado (fase-02) em teste falhando naquele seam → ver falhar
→ aplicar o fix → ver passar → **re-rodar o loop da fase-01 contra o cenario original, nao
minimizado**.

Esse ultimo passo e o que fecha o ciclo: o repro minimo prova a causa; o cenario original prova a
correcao.

### Passo 2: ajustar os Sinais de Alerta

A tabela atual tem "Fix sem teste → Voltar a Etapa 3". Com o passo 1, existe um caso legitimo de fix
sem teste: **nao ha seam correto**.

Reescrever a linha para distinguir *fix sem teste porque pulamos* (volta) de *fix sem teste porque
nao ha seam, e isso esta registrado* (segue, com o achado anotado). Sem isso o Sinal de Alerta
contradiz o passo 1 — e alerta que se contradiz treina o leitor a ignorar os outros.

### Passo 3: checklist de cleanup

Antes de declarar pronto:

- [ ] O repro original nao reproduz mais (re-rodar o loop da fase-01)
- [ ] Regression test passa — **ou** a ausencia de seam esta documentada
- [ ] Toda instrumentacao `[DEBUG-...]` removida (grepar o prefixo)
- [ ] Prototipos descartaveis deletados, ou movidos para local claramente marcado
- [ ] A hipotese que se confirmou esta no commit / PR — para o proximo que depurar aprender

O grep do prefixo so funciona por causa da convencao de tag da fase-02. As duas se pagam juntas.

### Passo 4: a hipotese vencedora no commit

Nosso formato de commit ja tem "Causa raiz" e "Regression test". Ganha uma linha: **qual hipotese se
confirmou** — e, quando informativo, quais foram descartadas.

Barato de escrever e caro de reconstruir depois.

### Passo 5: costurar com a autopsia (INV-01)

Nossa autopsia pos-fix tem 3 perguntas, e a do meio — *por que passou pela revisao e pelos testes
existentes?* — nao existe na fonte. Fica.

A fonte acrescenta uma quarta pergunta com **timing** explicito: *o que teria prevenido este bug?*,
feita **depois** do fix estar dentro, nunca antes — porque agora ha mais informacao do que no
inicio.

E o encaminhamento: se a resposta envolver mudanca arquitetural (sem bom seam de teste, callers
emaranhados, acoplamento escondido), encaminhar com as especificidades.

**Ponteiro condicional:** `improve-codebase-architecture` nao esta portada. Encaminhar para o que
temos hoje — `architecture` ou `code-simplification` — e deixar registrado no CONTEXT que, se
`improve-codebase-architecture` entrar, este ponteiro muda de destino.

Nao prometer skill que nao existe.

> **Resolvido em 2026-08-13, pelo plano07 fase-01.** `improve-codebase-architecture` entrou. O
> ponteiro vivo e `skills/incident-response/SKILL.md`, secao `## Autopsia Pos-Fix` — nao este doc,
> que fica como registro do estado em que a fase-03 foi executada. Os dois destinos originais
> continuam; o branch novo (atrito de **forma de modulo**) **recomenda ao dev rodar** a skill, em vez
> de encaminhar por invocacao, porque ela e `disable-model-invocation: true`.

### Passo 6: passar a lente do plano01

Alvo final: ler a skill inteira de ponta a ponta. Depois de tres fases de adicao, e a leitura
completa que revela duplicacao entre secoes escritas em momentos diferentes.

---

## Gotchas

- **G1** — Sinal de Alerta contradizendo o teste do seam (Passo 2).
- **G2** — Esquecer de re-rodar contra o cenario **original**. O repro minimo prova a causa, nao a
  correcao.
- **G3** — Apontar para `improve-codebase-architecture`, que nao existe aqui (Passo 5).
- **G4** — Fazer a pergunta "o que teria prevenido" antes do fix. O timing e o ponto.
- **G5** — Cleanup remover error boundary junto com os `[DEBUG-]`. A distincao vem da fase-02
  Passo 6; conferir que sobreviveu.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Teste do seam correto presente, com o caso "nao ha seam = e o achado"
- [ ] Sinais de Alerta ajustados; zero contradicao (G1)
- [ ] Checklist de cleanup com o grep do prefixo
- [ ] Re-rodar contra o cenario original explicito (G2)
- [ ] Hipotese vencedora no formato de commit
- [ ] Autopsia com as 3 perguntas nossas + a quarta, com timing
- [ ] Ponteiro arquitetural aponta para skill **existente** (G3)
- [ ] Leitura completa feita; duplicacao entre fases removida

### Leitura de ponta a ponta

- [ ] Ler a skill inteira e confirmar que as tres fases produziram **um** fluxo, nao tres pedacos
      costurados

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test` exit 0
- `SKILL.md` ≤ ~220 linhas
- Zero referencia a `improve-codebase-architecture`

**Por humano:**
- Dado um bug com seam ruim, saber que a resposta e registrar o achado, nao escrever teste fraco
- A skill le como um fluxo unico
- Nada do que era nosso sumiu nas tres fases

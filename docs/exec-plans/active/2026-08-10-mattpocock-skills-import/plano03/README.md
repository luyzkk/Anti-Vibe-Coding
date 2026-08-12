# Plano 03: `wizard` — Entrega de Passos Humano-Only

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~5h
**Depende de:** plano01 fase-01 (a `writing-for-agents` e a lente contra a qual a SKILL.md e escrita)
**Desbloqueia:** nada — auto-contido
**Branch:** `feat/wizard-skill`

---

## O que este plano entrega

Uma skill que gera **wizard bash interativo**: um script que caminha o humano, estagio por estagio,
por um procedimento que so ele pode executar. Abre cada URL, diz o que clicar e copiar, captura os
valores, grava onde eles pertencem (`.env`, secret do GitHub), confirma a cada etapa e mostra quantos
estagios faltam.

Mais os dois ponteiros que fazem ela ser alcancada, e um wizard real gerado para este proprio repo.

---

## O buraco que isto fecha

`skills/infrastructure/SKILL.md` tem 426 linhas sobre DNS, SSL, Let's Encrypt, Route 53, CloudFront,
Docker e CI/CD — e **zero** ocorrencias de `dashboard`, `console`, `painel`, `manualmente`, `acesse`
ou `credencia`.

A skill que mais obviamente produz trabalho humano-only consulta sobre a decisao e nao tem mecanismo
nenhum de entrega. O passo manual evapora no fim da conversa.

## O modelo de interacao e novo aqui

`AskUserQuestion` (17 arquivos) e como o plugin interage hoje: **o agente pergunta, o agente age**.

Um wizard e outra coisa: o agente **gera um artefato** que o humano roda sozinho — possivelmente sem
sessao ativa, possivelmente varias vezes. Ganha quando os passos estao numa UI de terceiro, sao
muitos, vao ser repetidos por outra pessoa, ou acontecem fora da sessao.

A fronteira que a propria skill impoe: **nao invocar para passo que o agente executa sozinho.**

---

## Analise de Dependencias

### Bloqueadores

| O que | De onde vem | Status |
|---|---|---|
| `template.sh` (204 linhas) do repo-fonte | clone efemero no scratchpad — reclonar se necessario | pronto |
| Verificacao de dependencias nesta maquina | `explorer.exe`, `tput`, `mktemp`, `gh` presentes; Git Bash 5.2.37 | pronto |
| Os 2 defeitos identificados (D1 CRLF, D2 exit-code) | este README, secao abaixo | pronto |
| Decisoes DI-09..DI-11 | `../CONTEXT.md` §Decisoes | pronto |
| A lente de escrita | plano01 fase-01 | pendente |

### Produz para

| O que | Quem consome |
|---|---|
| `skills/wizard/` (SKILL.md + template.sh) | `infrastructure` e `init` por invocacao nominal; o agente por conta propria ao topar em passo humano-only |
| Wizard real de dogfood | o proprio repo, e serve de exemplar para os proximos |

---

## Os 2 defeitos a corrigir na fase-01

**D1 — CRLF corrompe segredo. Deterministico.**
`_existing()` faz `grep` no `.env` e devolve `${line#*=}`. Com `.env` em CRLF — provavel no Windows —
o valor volta com `\r` no fim, e esse valor alimenta `write_env` e `set_secret`. Vai um `\r`
invisivel para dentro do secret do GitHub Actions; a falha so aparece em runtime de CI.
Compound relacionado: `2026-05-19-crlf-breaks-frontmatter-regex`.

**D2 — aviso espurio ao abrir URL. A verificar.**
`explorer.exe` e conhecido por retornar exit ≠ 0 mesmo abrindo o navegador. O bloco tem
`|| warn "couldn't open a browser"`, entao pode avisar em toda abertura bem-sucedida. **Nao
confirmado** — verificar na execucao antes de mexer. Se nao reproduzir, nao mexer.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Porte da skill + template](./fase-01-porte-skill-template.md) | 2 novos + 1 modificado | ~2.5h | — |
| 02 | [Ponteiros: infrastructure + init](./fase-02-ponteiros.md) | 2 modificados | ~45min | fase-01 |
| 03 | [Dogfood: wizard real](./fase-03-dogfood.md) | 1 novo (o wizard) | ~1.5h | fase-01 |

Fases 02 e 03 sao independentes entre si.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | A biblioteca acima do marcador `STAGES` e **identica em todo wizard gerado** | E a regra do proprio template, e o motivo da UX ser consistente. Wizard que edita a biblioteca a mao perde a garantia |
| INV-02 | `template.sh` gravado em **LF** | CRLF quebraria o shebang e o parsing do bash |
| INV-03 | A skill nunca roda o wizard gerado end-to-end | Ele abre navegador e bloqueia em input humano. Verificacao e estatica: `bash -n`, `shellcheck`, e conferencia de que todo valor cai onde o escopo disse |
| INV-04 | Atribuicao MIT em `THIRD-PARTY-NOTICES.md` | Obrigacao de licenca. `template.sh` e copia quase literal |

---

## Como este plano pode falhar

**Geramos wizards para coisas que o agente faria sozinho.** E o anti-padrao que a propria skill
nomeia. Mitigacao: a fronteira entra na `description` (o ponteiro e onde ela faz o trabalho de
disparo) e o dogfood da fase-03 tem criterio explicito de selecao — se o alvo nao passar, troca-se
o alvo em vez de afrouxar o criterio.

**O template funciona na leitura e quebra na maquina.** Mitigacao: e exatamente o que a fase-03
existe para pegar. As dependencias ja foram verificadas nesta maquina, mas dependencia presente nao
e o mesmo que fluxo funcionando.

**A correcao do D1 mascara o problema em vez de resolver.** Strip de `\r` so na leitura deixa o
`.env` mixado. Mitigacao: a fase-01 exige decidir entre normalizar na leitura ou na escrita, e
registrar qual — nao aplicar as duas por precaucao.

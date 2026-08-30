# Memoria: Plano 02 — Atoms T1 + Verifier + Rastreio ECC

**Feature:** Stack Knowledge Python
**Iniciado:** {YYYY-MM-DD}
**Status:** nao iniciado

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** TypeIs tratado como nota inline 3.13+ em vez de python_versions do átomo inteiro
  - Por que: só 2 dos N patterns dependem de 3.13
  - Impacto: python_versions permanece ['>=3.11']
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

---

## Resultado do Rastreio ECC (RF12 — preencher na fase-06)

Obrigatorio documentar aqui, mesmo se a busca falhar (risco aceito D5).

- **Data da tentativa:** {YYYY-MM-DD}
- **Trechos característicos buscados:** {quais frases/estruturas dos SKILL.md foram usadas como query}
- **Repositórios/fontes consultados:** {lista}
- **Resultado:** {origem identificada + licença | origem identificada sem licença declarada | origem não identificada}
- **Ação tomada:** {entrada adicionada ao THIRD-PARTY-NOTICES.md | nenhuma — tentativa registrada, risco aceito D5}

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Ciclos de verifier (v1/v2/v3) por atomo | {preencher na fase-06} |
| Atomos com excedente de cap → TODO.md | {N} |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do Plano 03 le este campo.

<!-- Preencher ao concluir. Minimo esperado:
- Resultado do rastreio ECC (Plano 03 nao repete a busca)
- Ajustes de prompt extrator/verifier descobertos neste batch (Planos 03-04 herdam)
- Excedentes de cap registrados no TODO.md (para o INDEX final nao rotear conteudo inexistente)
- Confirmar: nenhum atomo tocou INDEX.md (G11)
-->

---

<!-- Atualizado automaticamente durante execucao -->

---

## Resultado do Rastreio ECC (RF12) — 2026-08-30

**RASTREADO COM SUCESSO. Licenca MIT (permissiva) — risco D5 resolvido, nao apenas aceito.**

- **Ponto de partida:** `origin: ECC` no frontmatter era a UNICA metadata de proveniencia. As duas
  pastas (`python-patterns/`, `python-testing/`) nao tem LICENSE nem README — so o SKILL.md.
- **Busca:** trechos distintivos das descricoes + o rotulo "ECC" combinado com "skill"/"claude".
- **Resultado:** ECC = **Everything Claude Code**, repo `affaan-m/ECC`
  (<https://github.com/affaan-m/ECC>, tambem exposto em <https://ecc.tools/skills>). Skills upstream
  em `skills/python-patterns/SKILL.md` e `skills/python-testing/SKILL.md`.
- **Licenca:** **MIT**, `Copyright (c) 2026 Affaan Mustafa` — obtida da API do GitHub, nao inferida.
- **Acao tomada:** entrada nova no `THIRD-PARTY-NOTICES.md` com o texto MIT VERBATIM, seguindo o
  formato das entradas de Addy Osmani e Matt Pocock.

**Achado que o plano nao previa:** o upstream esta em **INGLES**; as copias em
`Infos/knowledge/Python/` estao em **ESPANHOL**, com o mesmo `name` e o mesmo `origin: ECC`. Ou
seja, o material local ja e obra derivada (traducao) do original MIT — e os nossos atomos sao uma
segunda derivacao (destilacao PT-BR). MIT permite as duas expressamente. Registrado no NOTICES.

Como a licenca e permissiva, nao foi preciso escalar ao dev (o plano so exigia parar se fosse
restritiva). D5 deixa de ser "risco aceito" e passa a "risco resolvido".

---

## Notas para Planos Seguintes

- **Prompt do extrator:** reusar como esta, MAIS uma clausula de preservacao de hedge. Ver
  `verifier-report-plano02.md`, observacao de calibracao 1 — amplificacao de tom foi o modo de
  falha dominante deste batch (4 dos 5 atomos), e a clausula anti-drift nao cobre esse eixo.
- **Prompt do verifier:** manter a checagem de amplificacao de tom (veio do piloto) e manter os
  checks calibrados por atomo. Foi um check calibrado ("confira o conteudo por tras do ID, nao so
  a existencia") que pegou a unica falha real do batch.
- **NAO e drift sistematico:** `typing-and-static-analysis` veio com zero warns. A clausula de hedge
  e melhoria, nao conserto de causa raiz. Nao reescrever o prompt inteiro.
- **Cap:** `security-fastapi-owasp` esta em **200/200** e `typing-and-static-analysis` em 197/200.
  Adicao nesses dois exige remocao antes. Critico para o Plano 04 fase-06 (audit humano do security).
- **INDEX intacto (G11):** nenhum dos 5 extratores tocou `knowledge/python/INDEX.md`. Ele segue com
  so o piloto roteado. A consolidacao dos 18 e o Plano 04 fase-04.
- **GT — link checker vs generics do Python:** `scripts/harness-validate.ts` acusa `broken-link`
  falso em sintaxe PEP 695, porque varre markdown cru sem pular spans de codigo. Custou 3 iteracoes
  aqui (inclusive o proprio texto do TODO que descrevia o bug reproduzia o padrao). Registrado no
  TODO.md. **Os Planos 03-04 vao esbarrar nisso** — ao escrever atomo com generics, evitar
  parametro de tipo colado a parenteses, ou corrigir o checker antes.

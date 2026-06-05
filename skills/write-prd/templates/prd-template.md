---
slug: {feature-kebab}
date: {YYYY-MM-DD}
status: draft
# Metadados opcionais do PRD (formato YAML).
# `requires:` lista PRDs que devem estar completos antes deste.
# Aceita string unica (`requires: auth`) ou array (`requires: [auth, billing]`).
# Pode referenciar slug curto (`auth`) ou pasta completa (`2026-04-20-auth`).
# Se ausente ou vazio, nenhuma verificacao eh feita.
requires: []
---

<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este PRD/plan deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-04 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# PRD: {Feature Name}

**Status:** Draft
**Author:** {dev} + AI
**Date:** {YYYY-MM-DD}
**Context:** ./CONTEXT.md

---

<!-- Guia MoSCoW:
  Must Have: Sem isso a feature nao tem valor. Maximo 40% dos requisitos.
  Should Have: Importante mas nao bloqueia a primeira entrega.
  Could Have: Nice-to-have. Apenas se sobrar tempo.
  Won't Have: Explicitamente excluido DESTA versao. Evita scope creep.

  Teste: Se mover de Must para Should, a feature ainda resolve o problema core? Se sim, nao era Must.
-->

## Problema

{Descrever o problema que esta feature resolve — foco no PROBLEMA, nao na solucao}
{Por que esse problema importa? Qual o impacto de nao resolvê-lo?}

---

## Solucao

### Outcomes (declarativo — o QUE, não o COMO)

Liste os resultados observáveis que esta feature entrega. Use linguagem de resultado:
"o usuário consegue X", "o sistema garante Y", "Z é mensurável via W".
NÃO inclua passos de implementação aqui.

- {outcome 1}
- {outcome 2}

### Mecanismo (algorítmico — o COMO)

{Apenas após os outcomes estarem listados. Descrever fluxos, algoritmos, integrações.}
{Se veio do /design-twice: "Baseado na Proposta {letra} — {filosofia}"}
{Alinhamento com stack e padroes existentes do projeto}

{- structure-snippet -}

---

## Fluxos UX por Ator

<!-- Pular se a feature for backend-only (API, migration, cron).
     Para features com UI: fluxo numerado por ator, copy das mensagens,
     modais, toasts e notificacoes para outros atores. -->

### {Ator Principal — ex: Aluno}

1. {o que o ator ve e faz no passo 1}
2. {passo 2}
3. → Caminho A: {se X acontece — descrever}
3. → Caminho B: {se Y acontece — descrever}

**Copy relevante:**
- Confirmacao: _"{texto da mensagem}"_
- Aviso/Educativo: _"{texto}"_
- Erro: _"{mensagem de erro exibida}"_

**Notifica {outro ator}:** _"{texto da notificacao}"_ quando {evento}

### {Ator 2 — ex: Professor | Admin}

1. ...

---

## Requisitos Funcionais

### Must Have (maximo 40% do total)
- [ ] {requisito funcional inegociavel — sem isso a feature nao tem valor}
- [ ] {requisito funcional inegociavel}

### Should Have
- [ ] {funcionalidade importante mas nao bloqueia a primeira entrega}
- [ ] {funcionalidade importante}

### Could Have
- [ ] {nice-to-have — apenas se sobrar tempo}

### Won't Have (desta versao)
- {o que foi explicitamente excluido e por que}

---

## Requisitos Nao-Funcionais

- **Performance:** {ex: API responde em < 200ms p95; pagina carrega em < 2s com 1000 registros}
- **Seguranca:** {autenticacao necessaria? autorizacao por papel ou recurso? dados sensiveis?}
- **Acessibilidade:** WCAG 2.0 level AA — {especificidades para esta feature}
- **Observabilidade:** {logs, metricas, alertas especificos desta feature}

---

<!-- OPCIONAL — incluir SOMENTE se a feature toca schema de banco, dependencias novas
     ou secrets. Para features comuns, omitir (guardrails globais ja vivem no
     CLAUDE.md do usuario e no AGENTS.md gerado pelo init). -->
## Boundaries (apenas features de risco: schema / deps / secrets)

- **Sempre:** {ex: rodar testes antes de commit; validar inputs no boundary}
- **Perguntar antes:** {ex: alterar schema de banco; adicionar dependencia; mudar CI}
- **Nunca:** {ex: commitar secrets; remover teste falhando sem aprovacao}

---

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | {decisao que teve alternativa real} | {escolha feita} | {alternativa rejeitada} | {por que a alternativa foi rejeitada} |

<!-- Incluir APENAS decisoes que tiveram alternativa real. Nao criar decisoes falsas. -->

---

## Premissas a Validar

<!-- Cada premissa que, se falsa, muda a decisao. Pareie com COMO testar antes de construir.
     Premissas dealbreaker (Must Be True) primeiro. Ver consultant `references/assumption-audit.md`. -->

| # | Premissa (o que estamos apostando ser verdade) | Tier (Must/Should/Might) | Como validar |
|---|---|---|---|
| 1 | {premissa} | {tier} | {experimento, medicao, ou pergunta a fazer ao usuario} |

---

## Criterios de Aceite

- [ ] CA-01: Dado {pre-condicao}, quando {acao do usuario}, entao {resultado esperado e mensuravel}
- [ ] CA-02: Dado {pre-condicao}, quando {acao do usuario}, entao {resultado esperado}
- [ ] CA-03 (edge case): Dado {pre-condicao de erro}, quando {acao}, entao {comportamento esperado no erro}

<!-- Minimo 3 criterios. Minimo 1 de erro/edge case. Cada criterio verificavel com sim/nao. -->
<!-- Reframe vago->mensuravel: "mais rapido" -> "LCP < 2.5s em 4G; carga < 500ms". -->

---

## Out of Scope

- {o que NAO sera feito nesta versao — com razao breve}
- {funcionalidade excluida e por que}

---

## Dependencias

| Tipo | Dependencia | Status |
|------|------------|--------|
| Servico externo | {nome e proposito} | {disponivel / a configurar} |
| Feature pre-requisito | {nome} | {pronta / em desenvolvimento} |
| Lib/pacote | {nome e versao} | {ja no projeto / a instalar} |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| {risco tecnico ou de negocio} | {baixa/media/alta} | {baixo/medio/alto} | {acao de mitigacao} |

# PRD: {Feature Name}

**Status:** Draft
**Author:** {dev} + AI
**Date:** {YYYY-MM-DD}
**Context:** {caminho do CONTEXT.md se importado do /grill-me, ou "Mini-entrevista"}

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

{Abordagem escolhida para resolver o problema}
{Se veio do /design-twice: "Baseado na Proposta {letra} — {filosofia}"}
{Alinhamento com stack e padroes existentes do projeto}

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

## Decisoes Tecnicas

| # | Decisao | Escolha | Alternativa Rejeitada | Razao |
|---|---------|---------|----------------------|-------|
| 1 | {decisao que teve alternativa real} | {escolha feita} | {alternativa rejeitada} | {por que a alternativa foi rejeitada} |

<!-- Incluir APENAS decisoes que tiveram alternativa real. Nao criar decisoes falsas. -->

---

## Criterios de Aceite

- [ ] CA-01: Dado {pre-condicao}, quando {acao do usuario}, entao {resultado esperado e mensuravel}
- [ ] CA-02: Dado {pre-condicao}, quando {acao do usuario}, entao {resultado esperado}
- [ ] CA-03 (edge case): Dado {pre-condicao de erro}, quando {acao}, entao {comportamento esperado no erro}

<!-- Minimo 3 criterios. Minimo 1 de erro/edge case. Cada criterio verificavel com sim/nao. -->

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

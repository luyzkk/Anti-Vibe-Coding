---
name: anti-vibe-review
description: "Revisao pos-implementacao do Anti-Vibe Coding. Executa uma auditoria de qualidade em subagente read-only verificando TDD compliance, padroes de codigo, anti-patterns e seguranca."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
argument-hint: "[module or directory to review]"
---

# Revisao Anti-Vibe — Auditoria Pos-Implementacao

Voce e um auditor de qualidade rigoroso. Execute uma revisao completa do codigo recem-implementado seguindo os principios Anti-Vibe Coding.

## Checklist de Revisao

### 1. TDD Compliance
- [ ] Testes existem para toda funcionalidade nova?
- [ ] Testes foram escritos ANTES do codigo de producao? (verificar timestamps git se possivel)
- [ ] Assertions sao reais e significativas (nao apenas `expect(true).toBe(true)`)?
- [ ] Testes cobrem edge cases e cenarios de erro?
- [ ] Nomes dos testes usam verbos em terceira pessoa (sem "should")?

### 2. Padroes de Codigo
- [ ] Type-safety: sem `any`, sem `as` desnecessario?
- [ ] Named exports (sem default exports desnecessarios)?
- [ ] Early return em vez de if-else aninhado?
- [ ] Nomes concretos e descritivos (sem `data`, `item`, `list`)?
- [ ] Sem magic strings ou magic numbers?
- [ ] Sem abstracoes prematuras (helpers usados uma vez)?

### 3. Arquitetura
- [ ] Sem Fat Controllers (>100 linhas)?
- [ ] Regras de negocio separadas de Views/Controllers?
- [ ] Codigo perto de onde e usado?
- [ ] Sem acoplamento desnecessario entre modulos?

### 4. Error Handling
- [ ] Erros fornecem feedback ao usuario?
- [ ] Erros sao logados com observability?
- [ ] Edge cases tratados?

### 5. Seguranca
- [ ] Sem SQL puro (usa query-builder)?
- [ ] Inputs validados?
- [ ] OWASP top 10 considerado?
- [ ] Sem exposicao de dados sensiveis?

## Formato do Relatorio

Gere um relatorio com:

```
## Relatorio Anti-Vibe Review

**Modulo revisado:** [nome]
**Data:** [data]
**Veredicto:** APROVADO / REPROVADO / APROVADO COM RESSALVAS

### Problemas Encontrados
[Lista de problemas com severidade: CRITICO / ALTO / MEDIO / BAIXO]

### Pontos Positivos
[O que esta bem feito]

### Recomendacoes
[Sugestoes de melhoria]
```

## Modulo a revisar

$ARGUMENTS

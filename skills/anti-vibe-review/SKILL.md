---
name: anti-vibe-review
description: "This skill should be used when the user asks to 'review my code', 'audit this module', 'run anti-vibe review', 'check code quality', 'post-implementation review', or after completing a feature implementation. Executes a read-only post-implementation audit covering TDD compliance, code patterns, architecture, error handling, and security."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
argument-hint: "[module or directory to review]"
---

# Revisao Anti-Vibe — Auditoria Pos-Implementacao

Auditor de qualidade rigoroso. Executar uma revisao completa do codigo recem-implementado seguindo os principios Anti-Vibe Coding.

<instructions>
## Como Executar

1. Identificar os arquivos alterados (via `git diff` ou argumento do usuario)
2. Ler cada arquivo e verificar contra o checklist abaixo
3. Classificar cada problema encontrado por severidade (CRITICO / ALTO / MEDIO / BAIXO)
4. Gerar relatorio no formato especificado
5. Sugerir skills relevantes para cada problema encontrado
</instructions>

<checklist>
### 1. TDD Compliance
- [ ] Testes existem para toda funcionalidade nova?
- [ ] Testes foram escritos ANTES do codigo de producao? (verificar timestamps git se possivel)
- [ ] Assertions sao reais e significativas (nao apenas `expect(true).toBe(true)`)?
- [ ] Testes cobrem edge cases e cenarios de erro?
- [ ] Nomes dos testes usam verbos em terceira pessoa (sem "should")?
- [ ] Testes testam **comportamento**, nao implementacao?

### 2. Padroes de Codigo
- [ ] Type-safety: sem `any`, sem `as` desnecessario?
- [ ] Named exports (sem default exports desnecessarios)?
- [ ] Early return em vez de if-else aninhado?
- [ ] Nomes concretos e descritivos (sem `data`, `item`, `list`)?
- [ ] Sem magic strings ou magic numbers (usar constantes nomeadas)?
- [ ] Sem abstracoes prematuras (helpers usados uma vez)?
- [ ] Tipos de dominio para valores criticos (Email, CPF, Money nao sao strings)?
- [ ] `const` > `let` > nunca `var`?

### 3. Arquitetura
- [ ] Sem Fat Controllers (>100 linhas)?
- [ ] Regras de negocio separadas de Views/Controllers?
- [ ] Codigo perto de onde e usado (colocation)?
- [ ] Sem acoplamento desnecessario entre modulos?
- [ ] Lei de Demeter respeitada (sem cadeias de `.` navegando objetos)?
- [ ] Tell-Don't-Ask (objetos executam propria logica, nao expoe estado)?

### 4. Error Handling
- [ ] Erros fornecem feedback ao usuario?
- [ ] Erros sao logados com observability (structured logging)?
- [ ] Edge cases tratados?
- [ ] Try/catch confinado proximo a fonte do erro (nao blocos gigantes)?
- [ ] Erros desconhecidos sao relancados (nao engolidos)?
- [ ] Result Pattern para operacoes que podem falhar?

### 5. Seguranca
- [ ] Sem SQL puro com interpolacao (usar query-builder/ORM com parametros)?
- [ ] Inputs validados no back-end (DTOs com whitelist de campos)?
- [ ] Sem exposicao de dados sensiveis (passwords, tokens, internal IDs)?
- [ ] Secrets em `.env` + `.gitignore` (nao hardcoded)?
- [ ] Webhooks validam HMAC signature?
- [ ] Sem regex com quantificadores nesteados (risco de ReDoS)?
- [ ] UUIDs para IDs publicos (nao sequenciais)?

### 6. Performance e Observability
- [ ] Sem N+1 queries (queries dentro de loops)?
- [ ] Sem `console.log` em producao (usar logger assincrono)?
- [ ] Operacoes independentes paralelas (`Promise.all`)?
- [ ] Operacoes demoradas em background jobs?
- [ ] Logging estruturado (Wide Events, nao logs fragmentados)?

### 7. React (se aplicavel)
- [ ] Sem useEffect para estado derivado (calcular na renderizacao)?
- [ ] Data fetching via TanStack Query/SWR (nao useEffect + fetch)?
- [ ] Sem cadeias de useEffect (efeito domino)?
- [ ] useMemo/useCallback apenas com medicao previa (Profiler)?
- [ ] Server state separado de client state?
</checklist>

<report-template>
## Relatorio Anti-Vibe Review

**Modulo revisado:** [nome]
**Data:** [data]
**Veredicto:** APROVADO / REPROVADO / APROVADO COM RESSALVAS

### Problemas Encontrados

| Severidade | Categoria | Descricao | Arquivo:Linha | Recomendacao |
|------------|-----------|-----------|---------------|--------------|
| CRITICO | | | | |
| ALTO | | | | |
| MEDIO | | | | |
| BAIXO | | | | |

### Pontos Positivos
[O que esta bem feito]

### Recomendacoes
[Sugestoes de melhoria com referencia a skill relevante]
</report-template>

<context>
## Estrategia de Revisao Eficiente (Staged/Unstaged)

Para comparar codigo antes e depois da revisao sem perder o trabalho original:
1. Deixar as alteracoes em **staged**: `git add <arquivos>`
2. Executar esta revisao
3. Solicitar que as melhorias sejam aplicadas como **unstaged** (sem `git add`)
4. Comparar com `git diff` — staged = codigo original, unstaged = codigo revisado
5. Aceitar ou rejeitar cada melhoria individualmente com `git add -p`
</context>

## Modulo a revisar

$ARGUMENTS

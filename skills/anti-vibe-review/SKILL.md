<!-- 2026-05-14 (Luiz/dev): Agent e Bash adicionados para permitir delegacao opcional a auditores em v6.2.
     v6.1.0 mantem checklist inline como default — Agent so e usado se dev pedir explicitamente.
     Bash adicionado para harness/validate se aplicavel. Nao muda fluxo padrao. -->
---
name: anti-vibe-review
description: "This skill should be used when the user asks to 'review my code', 'audit this module', 'run anti-vibe review', 'check code quality', 'post-implementation review', or after completing a feature implementation. Executes a read-only post-implementation audit covering TDD compliance, code patterns, architecture, error handling, and security."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Agent, Bash
context: fork
agent: Explore
argument-hint: "[module or directory to review]"
---

# Revisao Anti-Vibe — Auditoria Pos-Implementacao

## ⚠️ Deprecation Notice (Wave 3 — 2026-05-22)

Esta skill foi consolidada em `/verify-work`.

**Migracao:** substitua `/anti-vibe-coding:anti-vibe-review` por `/anti-vibe-coding:verify-work` no seu workflow.

A skill permanece **funcional** durante grace period — todos os comandos, opcoes e formato de relatorio continuam operando normalmente. Nenhuma alteracao de comportamento.

**Por que migrar:** `/verify-work` executa o mesmo audit pipeline + adiciona testes/lint automatizados, debug agent, mutation testing, hallucination check e consolidacao paralela de auditores. Ver `## Diferencas com anti-vibe-review` em `/verify-work` para detalhes.

**Sem data de remocao definida** — Wave 4 reavalia delete fisico baseado em telemetria de uso. Nao ha urgencia artificial.

---

Auditor de qualidade rigoroso. Executar uma revisao completa do codigo recem-implementado seguindo os principios Anti-Vibe Coding.

## Modos de Invocacao

Esta skill pode ser invocada de duas formas:

- **Diretamente pelo dev:** `/anti-vibe-coding:anti-vibe-review`
  Executa o review completo com todos os auditores

- **Automaticamente pelo `/verify-work`:** como parte do audit pipeline pos-execucao
  Neste caso, recebe contexto adicional sobre o que foi implementado e foca nos
  auditores mais relevantes para o tipo de mudanca

O comportamento e identico em ambos os casos — a diferenca e o contexto disponivel.

## Resolucao de Modelo via Model Profiles

Antes de spawnar agentes auditores (se aplicavel):
1. Verificar se `config/model-profiles.json` existe no plugin
2. Se SIM: ler o perfil ativo e resolver o modelo para o tipo de agente (auditor)
3. Se NAO (arquivo ausente ou perfil nao encontrado): usar comportamento padrao (haiku como fallback)
4. Passar o modelo resolvido via parametro `model` no Agent tool quando spawnar

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
- [ ] Nomes grepáveis — rode `grep <nome> src/` e verifique se retorna <5 hits não relacionados. Se >10 hits, o nome é genérico demais e dificulta refatoração segura.
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
- [ ] **Deep Modules:** A interface do modulo e simples relativamente a sua implementacao?
  - Sinal de modulo raso (shallow): interface quase tao complexa quanto implementacao (muitos metodos publicos, muitos parametros expostos)
  - Sinal de modulo profundo (deep): interface pequena, implementacao rica
  - Se modulo raso detectado → warning com sugestao de encapsulamento
  - Referencia: `skills/tdd-workflow/references/deep-modules.md`

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

### 8. Severidade por Comentario e Verificacao

**Prefixos por comentario de revisao** (sinalizam ao autor a acao esperada; distintos das linhas `CRITICO/ALTO/MEDIO/BAIXO` do `<report-template>`, que classificam findings para o relatorio):

| Prefixo | Acao esperada do autor |
|---------|------------------------|
| *(sem prefixo)* | Mudanca obrigatoria — deve ser corrigido antes do merge |
| `Critical:` | Bloqueia merge — falha de seguranca ou corretude grave |
| `Nit:` | Opcional / estilo — autor decide se incorpora |
| `Optional:` / `Consider:` | Sugestao de melhoria — nao bloqueia |
| `FYI` | Informativo — nenhuma acao necessaria |

**Verifique a Verificacao** — antes de aprovar, audite a narrativa de verificacao do autor (distinto do `/verify-work`, que executa verificacao ativamente, e do "Verificacao Forcada" do CLAUDE.md, que e auto-checagem do implementador):

- [ ] Quais testes foram executados? O log foi compartilhado?
- [ ] O build passou? Ha evidencia (CI verde ou output local)?
- [ ] A funcionalidade foi testada manualmente?
- [ ] Para mudancas de UI: screenshots ou recording antes/depois?
- [ ] Para correcoes de bug: existe teste de regressao que reproduz o problema?
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

### Reasoning dos auditores (apenas quando delegacao opcional foi usada)

{Para cada agent em consolidation.reasoningByAgent:}
**{agent}**: {reasoning}

{Se algum agent em incomplete[]:}
**{agent}** (incomplete): {reason}

### Domain Status por auditor (apenas quando delegacao opcional foi usada)

| Auditor | domain_status |
|---------|---------------|
| security-auditor | {clean / issues_found / critical} |
| code-smell-detector | {clean / issues_found / critical} |
| tdd-verifier | {clean / issues_found / critical} |
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

## Honesty na Revisao

Honestidade com o autor e um requisito da revisao — nao uma preferencia de estilo. Este bloco trata da postura do *revisor* ao comunicar findings; e distinto do "nao carimbe o REVISOR" do `doubt-driven-development` (que e lado do orquestrador).

- **Nao carimbe aprovacao sem evidencia.** "LGTM" sem ler o codigo e falha de revisao, nao cortesia.
- **Nao suavize problemas reais.** Se ha um bug, diga que ha um bug — nao "talvez valha considerar".
- **Quantifique o impacto quando possivel.** "Esta query N+1 adiciona ~50ms por item da lista" e mais util que "isso pode ser lento". Numeros concretos ajudam o autor a priorizar.
- **Questione abordagens com problemas evidentes.** Sycophancy e um modo de falha — aprovar codigo ruim para evitar conflito prejudica o produto e o autor.
- **Aceite override com elegancia.** Se o autor ouviu o feedback e decidiu de outra forma com justificativa, registre o desacordo e siga em frente. Revisores nao tem veto infinito.

## Red Flags do Processo de Revisao

- PR mergeado sem revisao de nenhum par
- Revisao que verifica apenas se os testes passam — necessario mas nao suficiente
- "LGTM" sem evidencia de leitura do codigo (tempo de revisao irreal para o tamanho do PR)
- Mudanca sensivel a seguranca sem revisao especializada de seguranca
- PR grande demais para revisar com qualidade — pedir split antes de aprovar
- Bug fix sem teste de regressao que reproduz o problema
- Comentarios de revisao sem indicacao de severidade (autor nao sabe o que e bloqueante)
- Aceitar "corrijo depois" sem rastrear onde e quando

## Common Rationalizations (revisao)

| Rationalization | Reality |
|---|---|
| "Codigo gerado por IA provavelmente esta OK" | Precisa de **mais** escrutinio, nao menos — IA nao conhece o modelo de dominio, os invariantes de negocio nem o contexto de seguranca do projeto. |
| "Os testes passam, esta bom" | Necessario mas nao suficiente. Testes nao capturam problemas de arquitetura, falhas de seguranca contextuais nem legibilidade de longo prazo. |
| "Eu escrevi, entao sei que esta certo" | Autores sao cegos as proprias suposicoes. Revisao por par existe precisamente porque o autor nao consegue avaliar o proprio trabalho com olhos frescos. |
| "Funciona, isso e suficiente" | Correctude funcional e a barra minima. Manutencao, seguranca e performance sao parte do contrato de qualidade. |
| "Limpamos depois" | "Depois" raramente chega. Divida tecnica acumula juros — o custo de corrigir cresce a cada sprint. |

## Delegacao Opcional a Auditores (v6.1.0+)

Por padrao, este skill avalia o checklist inline diretamente — o orquestrador (Claude) le os arquivos
e pontua cada item. Esse fluxo nao mudou em v6.1.0.

Para fluxo automatizado (delegar partes do checklist a auditores especializados), use:

```typescript
// 2026-05-14 (Luiz/dev): delegacao opcional — PRD §Decisoes #5 (handler unico por kind)
// Default em v6.1.0 e manter checklist inline. Esta delegacao e opt-in.

import { invokeAndConsolidate } from '../verify-work/lib/audit-consolidator'

// Spawn dos auditores aplicaveis (subset do verify-work)
const consolidation = await invokeAndConsolidate([
  { agent: 'security-auditor', invoke: () => spawnAudit('security-auditor', files) },
  { agent: 'code-smell-detector', invoke: () => spawnAudit('code-smell-detector', files) },
  { agent: 'tdd-verifier', invoke: () => spawnAudit('tdd-verifier', files) },
])

// Mesmo shape do verify-work — alimenta secoes 1, 2, 4 do checklist
// (TDD, Padroes de Codigo, Error Handling tem auditores correspondentes;
// secoes 3, 5, 6, 7 ainda dependem do orquestrador avaliar inline).
```

**Quando usar delegacao:**
- Codebase grande (>50 arquivos no diff) onde leitura manual via checklist demora muito
- Fluxo CI/CD que precisa de saida estruturada (JSON via consolidation, nao prosa)
- Equipe quer reutilizar findings ja gerados pelo verify-work sem re-rodar tudo

**Quando manter inline (default v6.1.0):**
- Dev quer feedback educacional ao percorrer cada item do checklist (caso uso classico)
- Codebase pequeno onde overhead de spawn nao compensa
- Foco em itens que nao tem auditor dedicado (Arquitetura, Seguranca contextual, React patterns)
- Skill usa `context: fork` — invocar Agent dentro de fork spawna sub-fork, overhead de contexto adicional

## Modulo a revisar

$ARGUMENTS

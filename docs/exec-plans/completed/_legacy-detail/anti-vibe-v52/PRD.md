---
slug: anti-vibe-v52
date: 2026-04-21
status: draft
requires: []
---

# PRD: Anti-Vibe Coding v5.2 — Princípios Akita

**Status:** Draft
**Author:** Luiz + Claude
**Date:** 2026-04-21
**Context:** ./CONTEXT-anti-vibe-v52.md
**Fontes:** cleancode.md · "Do Zero à Pós-Produção em 1 Semana" · "Software Nunca Está 'Pronto'" (Fabio Akita, 2026)

---

## Problema

O Anti-Vibe Coding v5.1 cobre bem o ciclo de *construção* de software (grill-me → write-prd → plan-feature → execute-plan → verify-work). Mas três lacunas críticas foram identificadas ao confrontar o plugin com evidência empírica de 692 commits e 4 projetos reais em produção:

1. **O pipeline termina onde o software começa.** `verify-work` é o fim do fluxo. Mas 125 dos 274 commits de um projeto real aconteceram *após* o deploy. O plugin não cobre a vida pós-produção — onde os bugs que nenhuma spec prevê aparecem, onde features emergem do uso real, onde o sistema precisa iterar.

2. **Regras de "código limpo para agentes" estão ausentes ou conflitantes.** A política atual ("sem comentários por padrão") contradiz diretamente o que a evidência mostra: comentários de proveniência são contexto de primeira classe para o agente. Não há limites de tamanho de arquivo/função, não há auditoria de nomes grepáveis, não há thresholds de coverage definidos — todas restrições técnicas mensuráveis, não opiniões estéticas.

3. **A dinâmica humano-agente não está ensinada.** O princípio "humano navega, agente pilota" é a tese central do XP com IA — mas não existe como skill ensinável. Devs júnior não sabem quando interromper, quando injetar contexto de domínio, quando o agente está errando antes de terminar.

**Impacto de não resolver:** devs usam o plugin para construir mas não para operar; código gerado viola restrições técnicas do agente sem que ninguém perceba; bugs que surgem em produção não têm fluxo disciplinado de resolução.

---

## Solução

Anti-Vibe Coding v5.2 adiciona a **quarta pata** do mantra:

> *"Ensinar antes de codar. Planejar antes de executar. Verificar antes de entregar. **Iterar em produção.**"*

Concretamente: 2 hooks novos, 5 skills novas, atualizações em 6 componentes existentes, e resolução do conflito de política de comentários — tudo organizado em 7 fases de entrega, cada uma independentemente deployável.

---

## Requisitos Funcionais

### Must Have (6 de 16 — 37%)

- [ ] **RF-01 — hook `file-size-guard`:** warning (não-blocking) quando arquivo >500 linhas ou função >40 linhas é editado. Emite mensagem identificando arquivo + linha + sugestão de split. Integrado ao `PostToolUse Write|Edit` no `hooks.json`.

- [ ] **RF-02 — hook `grepping-names`:** pré-commit script que greppa nomes novos introduzidos no diff. Se nome genérico (`data`, `handler`, `process`, `Manager`, `Service`) ou com >10 hits no codebase, emite warning com sugestão de nome mais específico. Integrado ao `PreToolUse Bash` (git commit) no `hooks.json`.

- [ ] **RF-03 — política de comentários (D3):** atualizar `C:\Users\luizf\.claude\CLAUDE.md` global e `rules/code-quality.md`:
  - WHY comments: sempre permitidos (proveniência, decisão, workaround, bug ref, constraint)
  - WHAT comments: proibidos (comentário óbvio do código — `// increment i` acima de `i++`)
  - Não podar comentários que o agente escreveu em refactor
  - Docstrings em funções públicas: intenção + 1 exemplo de uso

- [ ] **RF-04 — thresholds TDD hardcoded:** atualizar `rules/testing-standards.md` com:
  - Business logic (services, models, domain): ≥95% line coverage
  - Global (incluindo integrações mockadas): ≥80% line coverage
  - Branch coverage global: ≥70%
  - Ratio teste/código como referência (não enforçado): 1.2x–1.5x

- [ ] **RF-05 — skill `/iterate`:** nova skill standalone + integrada como sugestão pós-`verify-work`. Cobre o ciclo pós-deploy:
  - Incident response: raw logs → hipótese → regression test (ANTES do fix) → fix → commit
  - Hardening pós-feature: checklist de defensive code (rate limit, circuit breaker, timeout, fallback, centralize config)
  - Princípio: "cada fix vem com regression test; hardening não é fase, é hábito"

- [ ] **RF-06 — skill `/pair-programming-with-agent`:** nova skill tutorial ensinando a dinâmica humano-navega/agente-pilota:
  - Quando interromper (sinal de over-engineering, path errado, contexto insuficiente)
  - Como injetar contexto de domínio que o agente não tem (TLS fingerprinting, regras de negócio, workarounds conhecidos)
  - Tabela "agente faz bem / faz mal" (Akita) como referência
  - Exemplos reais extraídos dos 274 commits (interrupção por excesso de engenharia, contexto de domínio, decisão conjunta, prompt refinement)

### Should Have

- [ ] **RF-07 — merge template Akita no `/init`:** integrar ao template de CLAUDE.md gerado pelo `/init` as seções de Akita (Code style for agents, Comments, Tests, Dependencies, Logging). Multi-linguagem: TS/JS + Python + Ruby.

- [ ] **RF-08 — `/update` com upgrade gerenciado:** ao rodar `/update` de v5.1 → v5.2, mostrar diff das mudanças em CLAUDE.md do projeto e pedir confirmação por seção antes de aplicar.

- [ ] **RF-09 — `anti-vibe-review` + auditoria de nomes grepáveis:** novo item no checklist: "Rode `grep <nome> src/` — se retorna >5 hits não relacionados, o nome é genérico demais".

- [ ] **RF-10 — skill advisor hook + tabela faz bem/mal:** atualizar o hook de startup para incluir contexto da tabela de Akita na lógica de sugestão de skills: recomendar `/consultant` e `/architecture` quando detectar decisões de arquitetura, `/security` quando detectar ausência de proteções proativas.

- [ ] **RF-11 — skills standalone: `incident-response`, `defensive-patterns`, `centralize-config`:**
  - `/incident-response`: fluxo disciplinado raw-log → regression test → fix
  - `/defensive-patterns`: lista de categorias de defensive code para o dev escolher quais aplicar
  - `/centralize-config`: padrão de centralização de config espalhada (ex: model LLM em 24 arquivos → 1 constante)

- [ ] **RF-12 — `regression-fix` e `hardening` integrados ao pipeline:** aparecem como opções sugeridas após `verify-work` concluir (no hook `Stop`).

- [ ] **RF-13 — exemplos multi-linguagem nas regras:** atualizar `rules/` com exemplos em TS/JS, Python e Ruby para: formatadores, tipos explícitos, logging estruturado, comandos de teste.

### Could Have

- [ ] **RF-14 — auditor de estrutura de diretório:** novo sub-auditor no `anti-vibe-review` que verifica se o projeto segue convenção previsível de paths (controller/model/view, src/lib/test, etc.).

- [ ] **RF-15 — auditor de logging estruturado:** checklist item em `anti-vibe-review`: logs usam JSON estruturado para debug/observabilidade? Plain text apenas para output CLI?

- [ ] **RF-16 — auto-diagnóstico "FrankMD vs M.Akita":** hook ou checklist que detecta sinais de acúmulo de dívida técnica: último arquivo editado >500 linhas? último commit sem teste? último commit não passou CI? Emite warning pré-commit se 2+ sinais positivos.

### Won't Have (desta versão)

- **Modo "conversational execute"** (humano no loop do execute-plan interativo): complexidade alta, requer mudança arquitetural no execute-plan. Registrado para v6.0.
- **Migration script separado para v5.1 → v5.2**: coberto pelo RF-08 (`/update` gerenciado).
- **Mutation testing integrado ao verify-work**: já planejado em PRD v5.0, não regride.
- **Suporte a Go/Rust nos exemplos multi-linguagem**: TS/JS + Python + Ruby cobre 95% dos projetos do usuário.

---

## Requisitos Não-Funcionais

- **Semver:** v5.2.0 — breaking changes gerenciados (explícitos via `/update` com confirmação)
- **Performance:** hooks com timeout ≤15s (alinhado com hooks existentes); skills novas sem chamadas externas
- **Compatibilidade:** skills novas funcionam standalone (pipeline é atalho, não obrigação)
- **Extensibilidade:** não alterar API pública (frontmatter, argumentos) de skills existentes
- **Observabilidade:** hooks emitem mensagens claras com `[HOOK_NAME]` prefix para rastreabilidade nos logs do Claude Code
- **Tamanho:** cada skill nova em markdown de ≤200 linhas (manter densidade, evitar prosa)

---

## Decisões Técnicas

| # | Decisão | Escolha | Alternativa Rejeitada | Razão |
|---|---------|---------|----------------------|-------|
| 1 | Severidade do file-size-guard | Warning (não-blocking) | Blocking | Friction mínima; educação > punição; dev decide quando split é prático |
| 2 | Coverage thresholds | Hardcoded em testing-standards.md | Configurável por projeto | Elimina bikeshedding; valores de Akita baseados em evidência (274 commits) |
| 3 | Política de comentários | Akita vence — WHY sim, WHAT não | Status quo (sem comentários) | Evidência empírica: comentários de proveniência são contexto de primeira classe para o agente |
| 4 | Loop pós-produção | Nova skill `/iterate` | Estender `execute-plan` | Standalone + composável; execute-plan não deve saber sobre produção |
| 5 | Breaking v5.1 → v5.2 | Gerenciado via `/update` com confirmação | Silent breaking | Breaking gerenciado ≠ breaking silencioso; semver v5.2 válido |
| 6 | "Faz bem/mal" de Akita | Integrar ao skill advisor hook | README ou cada skill | Hook é lido a cada sessão; README é ignorado; per-skill polui o frontmatter |
| 7 | Grepping names | Hook pré-commit + auditor no review | Só documentação | Automação de verificação tem retorno maior; hook é educational, não blocking |

---

## Critérios de Aceite

- [ ] **CA-01:** Dado um arquivo com >500 linhas editado via Write/Edit, quando o hook `file-size-guard` roda (PostToolUse), então emite warning com formato `[FILE-SIZE] arquivo.ts (523 linhas) excede limite de 500. Considere dividir por responsabilidade.`

- [ ] **CA-02:** Dado um commit com nome genérico novo (`handler`, `data`, `process`) no diff, quando o hook `grepping-names` roda (PreToolUse Bash git commit), então emite warning com `[GREPPING] 'handler' retorna 47 hits — nome genérico. Prefira nome específico como 'InvoiceSubmitHandler'.`

- [ ] **CA-03:** Dado que `rules/code-quality.md` é lido pelo agente antes de um refactor, quando o agente encontra um comentário de proveniência (`// workaround para bug upstream #1234`), então **não** remove o comentário — a regra é explícita: "não pode comentários do agente em refactor".

- [ ] **CA-04:** Dado `rules/testing-standards.md` com thresholds definidos, quando o agente escreve testes para um service de domínio, então aplica ≥95% de cobertura de linha e ≥70% de branch coverage.

- [ ] **CA-05:** Dado um desenvolvedor invoca `/iterate` após um deploy, quando descreve um bug de produção, então a skill guia sequencialmente: (1) captura raw logs, (2) escreve regression test que reproduz o bug, (3) implementa fix, (4) confirma que o teste passou, (5) commit com convenção `fix: <descrição> + regression test`.

- [ ] **CA-06:** Dado um desenvolvedor invoca `/pair-programming-with-agent`, então a skill apresenta: tabela "agente faz bem/mal", exemplos concretos de quando interromper, como injetar contexto de domínio, e o princípio "humano navega, agente pilota" com exemplos dos 274 commits do Akita.

- [ ] **CA-07 (edge):** Dado um projeto que rodou `/init` em v5.1, quando `/update` é executado em v5.2, então: (a) mostra diff das mudanças em CLAUDE.md, (b) pede confirmação por seção, (c) não aplica mudança sem confirmação explícita.

- [ ] **CA-08 (edge):** Dado `/iterate` invocado sem contexto de deploy (projeto novo, sem commits de produção), então a skill detecta o contexto e responde: "Esta skill é mais útil após o primeiro deploy. Quer continuar mesmo assim ou prefere `/tdd-workflow` para a fase de construção?"

---

## Out of Scope

- **Modo conversational execute:** requer redesign do execute-plan. v6.0.
- **Go/Rust nos exemplos:** cobertura de TS/JS + Python + Ruby é suficiente para os projetos atuais.
- **Mutation testing no verify-work:** planejado no PRD v5.0, não regride — out of scope *desta* atualização.
- **Auto-update via npx/bun:** install manual mantido por decisão de design (controle explícito).
- **Métricas de token/latência por arquivo:** requer acesso a dados do Claude Code que não estão expostos na CLI.

---

## Dependências

| Tipo | Dependência | Status |
|------|------------|--------|
| Plugin existente | Anti-Vibe Coding v5.1.0 (`plugin-manifest.json`) | Disponível |
| Hook existente | `hooks/hooks.json` (onde novos hooks serão integrados) | Disponível |
| Skill existente | `skills/anti-vibe-review/skill.md` (receberá novos checklist items) | Disponível |
| Skill existente | `skills/verify-work/` (receberá sugestões de regression-fix + hardening) | Disponível |
| Skill existente | `skills/init/` (receberá merge do template Akita) | Disponível |
| Skill existente | `skills/tdd-workflow/` (receberá thresholds do RF-04) | Disponível |
| Arquivo externo | `C:\Users\luizf\.claude\CLAUDE.md` (política de comentários — D3) | Disponível |
| Regra existente | `rules/testing-standards.md` (receberá thresholds RF-04) | Disponível |
| Regra existente | `rules/code-quality.md` (receberá política de comentários RF-03) | Disponível |

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Escopo grande para v5.2 (16 gaps, 5 skills, 2 hooks) causa scope creep | Média | Alto | D11 define ordem; cada fase é entregável independente; Could Have pode ser cortado |
| Threshold de 10 hits no grepping-names dá falso positivo em codebases pequenos | Alta | Baixo | Warning não-blocking; dev ignora se irrelevante; threshold documentado como heurístico |
| Conflito D1 × D10 (v5.2 sem breaking × breaking aceito) confunde usuários | Baixa | Médio | Documentar explicitamente no CHANGELOG: "breaking gerenciado via /update com confirmação" |
| Skill `/iterate` sobrepõe com `verify-work` na percepção do dev | Média | Médio | Delimitar claramente: `verify-work` = pré-deploy; `/iterate` = pós-deploy |
| Template Akita no `/init` quebra projetos que customizaram CLAUDE.md | Média | Médio | RF-08 `/update` gerenciado resolve; `/init` em projeto novo não tem esse problema |
| Exemplos Ruby/Python envelhecem mais rápido que TS/JS | Baixa | Baixo | Marcar exemplos com versão de linguagem; revisar a cada major version |

---

## Ordem de Implementação (D11)

| Fase | Entregável | RFs | Justificativa |
|------|-----------|-----|---------------|
| 1 — Infraestrutura | 2 hooks novos | RF-01, RF-02 | Beneficia todas as fases seguintes |
| 2 — Política | Comentários + testing-standards | RF-03, RF-04 | Resolve conflito principal antes das skills |
| 3 — Skills standalone | incident-response, defensive-patterns, centralize-config, pair-programming-with-agent | RF-06, RF-11 | Retorno imediato para o dev |
| 4 — Skill /iterate + pipeline | /iterate + integração pós-verify-work | RF-05, RF-12 | Depende das skills do passo 3 |
| 5 — /init e /update | Template Akita + upgrade gerenciado | RF-07, RF-08 | Depende da política consolidada do passo 2 |
| 6 — Auditores | anti-vibe-review + verify-work atualizados | RF-09, RF-14, RF-15 | Depende das regras estabelecidas |
| 7 — Advisor + multi-lang | hook advisor + exemplos linguagens | RF-10, RF-13 | Pode rodar em paralelo com fase 6 |

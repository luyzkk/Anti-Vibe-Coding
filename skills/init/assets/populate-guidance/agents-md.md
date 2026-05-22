# Guidance: AGENTS.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

AGENTS.md eh o **contrato operacional entre humanos e agentes** no projeto. Quem le esse arquivo — humano ou LLM — deve sair sabendo exatamente quando delegar para um subagente, quais ferramentas cada agente pode usar, e o que registrar no audit log. Nao eh um catalogo de skills nem lista de capacidades abstratas. Eh um contrato de comportamento com consequencias.

O publico primario sao os proprios agentes (Claude Code lendo ao iniciar uma sessao) e humanos que precisam entender como o trabalho assistido por IA esta organizado neste repositorio.

## Espirito do doc (tom esperado)

Prescritivo e especifico. "Delegue para um subagente quando a task toca mais de 5 arquivos independentes" eh bom. "Use agentes de forma responsavel" eh ruim — vago ao ponto de ser inutil. Cada regra deve ser verificavel: ou voce fez ou nao fez.

## Sinais a procurar no codebase

- `subagent_type:` em qualquer arquivo `.md` — indica que subagentes ja sao declarados neste repositorio. Mapeie quais IDs existem.
- `allowed-tools:` — restringe o que cada subagente pode fazer. Fundamental para o campo "Operating Contract".
- `model:` junto com `subagent_type:` — define qual perfil de modelo cada agente usa. Afeta custo e qualidade.
- `Agent(` em TypeScript/JavaScript — indica invocacao programatica de subagentes. Aponta para onde a logica de delegacao vive.
- `.claude/CLAUDE.md` existindo — confirma que o mirror esta no lugar. Se nao existir, o scaffold nao terminou.

## Por H2 — o que escrever

### Operating Contract
O contrato operacional define QUANDO um agente age autonomamente versus quando para e pede confirmacao. Este nao eh um paragrafo de filosofia — eh uma lista de condicoes verificaveis. O que distingue uma task que o agente executa direto de uma que exige checkpoint? Qual o custo de uma troca de contexto errada (em tokens, em retrabalho)?

**Cubra:** quando delegar vs fazer diretamente, custo de context switch, limites de autonomia
**NAO escreva:** descricao generica de "o que sao agentes IA", comparativos com outros frameworks de agentes

### Delegation Triggers
Delegation triggers sao os sinais especificos que ativam a decisao de usar um subagente. Devem ser concretos o suficiente para um agente verificar em runtime: "esta task toca mais de 5 arquivos independentes? Sim — delegue." Inclua tanto os triggers positivos (quando USAR subagente) quanto os negativos (quando NAO usar — ex: tasks que exigem contexto acumulado da sessao atual).

**Cubra:** tasks paralelas-safe, requisitos de isolamento, threshold de arquivos tocados
**NAO escreva:** lista exaustiva de todas as possibilidades hipoteticas — mantenha em 5-8 triggers acionaveis

### Audit Log Fields
O audit log eh a trilha de evidencias de que o trabalho assistido por IA foi executado com disciplina. Cada campo tem um proposito: `run_id` para rastreabilidade, `model` para custo e reproducibilidade, `status` para saude do pipeline. Se o projeto nao tem audit log configurado ainda, este campo deve ter um `TODO(<audit-setup needed>)` explicito — nao omitir a secao.

**Cubra:** campos obrigatorios do log, politica de retencao, onde os logs vivem
**NAO escreva:** implementacao do logger (vive no codigo), comparativos de ferramentas de logging

### Subagent Patterns
Dois patterns dominam o uso de subagentes neste ecossistema: fork (herda contexto do pai, cache-otimizado) e worktree (branch git isolada, para trabalho verdadeiramente paralelo). A escolha entre eles nao eh estilisticamente arbitraria — tem implicacoes concretas em isolamento, custo e conflitos de merge. Este campo deve descrever qual pattern o projeto adota por default e por que.

**Cubra:** fork vs worktree com criterio de escolha, isolamento de contexto, como os resultados sao reconciliados
**NAO escreva:** tutorial de como usar git worktree (vive na documentacao do git)

## Links obrigatorios

`.claude/CLAUDE.md` eh o mirror canonico — qualquer instrucao em AGENTS.md deve ser reflitida la, porque agentes externos podem ler qualquer um dos dois. Se os dois divergem, o comportamento do agente fica imprevisivel. Documente qual eh a fonte da verdade (AGENTS.md) e como o sync funciona.

`docs/AGENTS_LIST.md` cataloga os subagentes disponiveis — AGENTS.md define o contrato, AGENTS_LIST.md lista quem implementa esse contrato. O link entre os dois deve ser explicito para que um leitor possa transitar de "quando delegar" para "delegar para quem".

## Quando deixar TODO

Se o projeto nao declarou IDs de subagentes ainda (sem `subagent_type:` em lugar nenhum), deixe `TODO(<subagent-ids needed>): IDs de subagentes nao identificados — verificar com dev antes de popular Delegation Triggers`. NAO invente IDs — a tabela de audit log dependera deles sendo estaveis.

## Anti-patterns

- NAO copiar o conteudo de `.claude/CLAUDE.md` aqui diretamente — AGENTS.md eh a fonte, o mirror vem depois
- NAO listar capacidades hipoteticas de agentes que ainda nao existem no projeto
- NAO usar voz futura ("vamos adicionar suporte a...") — descritivo do estado atual apenas
- NAO misturar instrucoes para humanos com instrucoes para agentes sem deixar claro qual eh qual

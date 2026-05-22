# Guidance: .claude/CLAUDE.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

`.claude/CLAUDE.md` eh o **mirror canonico de AGENTS.md** para agentes que leem a partir do diretorio `.claude/`. Alguns agentes externos e integradores de Claude Code leem `.claude/CLAUDE.md` em vez de `AGENTS.md` — os dois devem ter o mesmo contrato operacional. A fonte da verdade eh `AGENTS.md`; este arquivo eh o espelho.

O publico primario sao agentes Claude Code que iniciam uma sessao no repositorio e leem `.claude/CLAUDE.md` como parte do contexto inicial.

## Espirito do doc (tom esperado)

Espelho fiel, nao interpretacao. O conteudo de `.claude/CLAUDE.md` deve ser uma copia do contrato operacional de `AGENTS.md`, precedida por um aviso explicito de que este eh um mirror e que `AGENTS.md` eh a fonte de verdade. Divergencias entre os dois criam comportamento imprevisivel em agentes — o custo de manter o sync eh menor do que o custo de debug de agentes com instrucoes diferentes.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `subagent_type:` em `.claude/` — indica que subagentes especificos do `.claude/` ja estao configurados e precisam aparecer no Operating Contract.
- `MCP` ou `mcpServers` em `.claude/settings.json` ou similar — servidores MCP configurados que ampliam as capacidades dos agentes neste repositorio.
- `allowed-tools:` em qualquer arquivo `.claude/` — restricoes de ferramentas especificas desta instalacao.
- `AGENTS.md` na raiz — confirma que a fonte da verdade existe. Se nao existir, `.claude/CLAUDE.md` nao pode ser um mirror valido.

## Por H2 — o que escrever

### Mirror Notice
O aviso que abre o documento — deve ser a primeira coisa que um agente ve. Formato sugerido: "Este arquivo eh um mirror de `AGENTS.md` (fonte da verdade). Qualquer modificacao deve ser feita em `AGENTS.md` primeiro, depois sincronizada aqui. Ultimo sync: [data]." Esta secao nao deve ter mais de 3 linhas — eh um aviso, nao documentacao.

**Cubra:** aviso explicito de mirror, link para AGENTS.md como fonte da verdade, data do ultimo sync
**NAO escreva:** justificativa de por que os dois arquivos existem — o aviso basta

### Operating Contract
O espelho do contrato operacional de AGENTS.md. Deve ser copiado (nao resumido) do AGENTS.md, com o mesmo nivel de especificidade. Se AGENTS.md define triggers de delegacao, este campo os espelha integralmente. Se AGENTS.md define campos de audit log, este campo os espelha.

**Cubra:** conteudo espelhado de AGENTS.md (Operating Contract + Delegation Triggers + o que for relevante), data do ultimo sync
**NAO escreva:** interpretacao ou resumo do conteudo de AGENTS.md — copie fielmente

## Links obrigatorios

`AGENTS.md` — o link entre o mirror e a fonte da verdade deve ser explicito e clicavel. Um agente lendo `.claude/CLAUDE.md` deve poder navegar para `AGENTS.md` com um clique.

## Quando deixar TODO

Se `AGENTS.md` ainda nao foi populado (este doc eh gerado antes de AGENTS.md), deixe `TODO(<agents-md-sync needed>): AGENTS.md ainda nao foi populado — sincronizar este mirror apos popular AGENTS.md`. NAO preencha o Operating Contract antes de AGENTS.md existir.

## Anti-patterns

- NAO adicionar instrucoes novas aqui que nao existem em AGENTS.md — esse eh um mirror, nao uma extensao
- NAO omitir o mirror notice — sem ele, um agente pode tratar este arquivo como fonte primaria
- NAO usar linguagem diferente de AGENTS.md para o mesmo conceito — mirror significa identico, nao equivalente
- NAO deixar a data de ultimo sync vazia — divergencia temporal entre os dois arquivos sem indicador eh um bug silencioso

# Guidance: docs/STATE.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/STATE.md eh o **snapshot do estado da instalacao do plugin neste repositorio**: qual stack foi detectada, qual versao do manifest esta instalada, quando o init foi executado pela ultima vez, e quais features opcionais foram habilitadas. NAO eh configuracao — eh observabilidade do proprio plugin. Permite que um agente ou humano entenda o estado atual do harness sem executar nada.

O publico primario sao agentes lendo STATE.md para orientar decisoes baseadas no estado atual (ex: "o init rodou com deteccao de stack? qual stack foi detectada?"), e humanos investigando por que o harness se comporta de uma forma especifica.

## Espirito do doc (tom esperado)

Gerado e factual. STATE.md nao eh narrativo — eh um registro de fatos sobre a instalacao atual. Cada campo tem um valor especifico ou um `TODO` explicito se nao foi preenchido pelo init. "Stack primaria: node-ts (detectada via package.json em 2026-05-21)" eh bom. "Stack: TypeScript" eh ruim — falta o ID canonico e a fonte de deteccao.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `package.json` — primary source para deteccao de stack Node/TypeScript. Scripts, dependencies e devDependencies revelam o stack.
- `Gemfile` — confirma stack Rails. Versao do Rails e gems principais informam o perfil de deteccao.
- `requirements.txt` ou `pyproject.toml` — confirma Python.
- `manifest` ou `schemaVersion` em arquivos de config do plugin — versao instalada do manifest.
- `.claude/` — a propria existencia e estrutura interna confirma que o init rodou.

## Por H2 — o que escrever

### Detected Stack
O resultado da deteccao de stack pelo init: qual stack primaria foi identificada (usando o ID canonico: `rails`, `nextjs`, `node-ts`, `laravel`, `python`), quais stacks secundarias existem, e qual sinal de deteccao confirmou cada identificacao. Se a deteccao foi manual (override), documente isso.

**Cubra:** primary stack id canonico, secondary stacks se houver, sinal de deteccao usado
**NAO escreva:** descricao narrativa de "o que o projeto usa" — use os IDs canonicos definidos em detect-stack.ts

### Manifest Version
Qual versao do manifest do plugin esta instalada, incluindo o checksum se disponivel. Esta informacao permite que o sistema de atualizacao saiba se um upgrade eh necessario. Se o manifest versao nao for identificavel, TODO.

**Cubra:** versao instalada do manifest, checksum se disponivel, data de instalacao
**NAO escreva:** changelog do manifest — link para CHANGELOG.md ou docs/UPGRADE.md

### Init Date
A data da ultima execucao do `/init` neste repositorio. Formato ISO 8601 (YYYY-MM-DD). Esta data permite avaliar se o STATE.md esta desatualizado em relacao a mudancas recentes no codebase.

**Cubra:** data ISO da ultima execucao do init, modo de execucao (dry-run vs real)
**NAO escreva:** historico de todas as execucoes anteriores — apenas a mais recente

### Enabled Features
Quais features opcionais do plugin foram habilitadas nesta instalacao: steps que rodaram, flags de configuracao, modulos opcionais ativados. Se nenhuma feature opcional foi habilitada alem do default, documente isso explicitamente — silence nao eh informacao.

**Cubra:** feature flags ativas, steps opcionais que rodaram, configuracoes nao-default
**NAO escreva:** lista de todas as features possiveis do plugin — apenas as que estao ativas

## Links obrigatorios

`ARCHITECTURE.md` — STATE.md documenta o estado da camada de tooling; ARCHITECTURE.md documenta o sistema em si. O link contextualiza STATE.md dentro do mapa maior do projeto.

## Quando deixar TODO

Se o init nao completou (dry-run ou interrupcao), deixe `TODO(<init-incomplete>): init nao completado — STATE.md pode estar parcialmente preenchido. Rode `/init` para completar`. NAO preencha campos que nao foram determinados pelo init.

## Anti-patterns

- NAO editar STATE.md manualmente exceto em uma secao "Overrides" explicita — ele deve refletir o estado real do init
- NAO usar IDs de stack inventados — use os IDs canonicos definidos em detect-stack.ts
- NAO omitir a data de init — sem data, nao ha como saber se o estado ainda eh atual
- NAO misturar configuracao do projeto (vai em CLAUDE.md) com estado do plugin (vai aqui)

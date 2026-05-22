# Guidance: docs/design-docs/core-beliefs.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/design-docs/core-beliefs.md documenta os **principios de engenharia senior** que governam decisoes de qualidade, seguranca e arquitetura em todos os projetos que usam este plugin. NAO eh um guia de estilo. NAO eh documentacao de features. Eh o conjunto de valores que um engenheiro experiente aplicaria antes de existir qualquer spec — as verdades que sobrevivem a mudancas de framework, stack e contexto de negocio.

O publico primario sao os proprios agentes lendo antes de tomar decisoes arquiteturais significativas, e humanos calibrando se um agente esta tomando as decisoes certas.

## Espirito do doc (tom esperado)

Prescritivo e fundamentado. Cada principio deve ter um "por que" — nao apenas "faca X", mas "faca X porque Y". Principios sem justificativa viram dogma. Principios com justificativa podem ser debatidos e evoluidos. Se um principio foi aprendido com custo (bug em producao, incidente de seguranca, acumulo de divida tecnica), o contexto torna o principio mais memoravel e aplicavel.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `docs/design-docs/` — ADRs existentes revelam que o time ja documentou decisoes arquiteturais. Esses ADRs informam os defaults de arquitetura.
- `docs/compound/` — notas de licoes aprendidas. Principios que sobreviveram a varios projetos devem ser promovidos para core-beliefs.
- `ADR-` em qualquer arquivo — indica tomada de decisao arquitetural formal. O padrao de decisoes revela os valores do time.
- `CLAUDE.md` global — os principios de core-beliefs herdam de CLAUDE.md. Qualquer conflito deve ser explicitamente resolvido com "CLAUDE.md tem precedencia".

## Por H2 — o que escrever

### Quality Principles
Os criterios de "done" que o time aplica antes de declarar algo completo. Inclui: definicao de done (quais gates devem passar), o que conta como codigo de qualidade neste contexto, e quais shortcuts sao aceitaveis vs inaceitaveis. Ancore cada principio em uma situacao concreta onde ele importa.

**Cubra:** definicao de done do time, gates de qualidade obrigatorios, linha entre pragmatismo e divida tecnica
**NAO escreva:** lista generica de boas praticas sem ancoragem no contexto do projeto

### Security Defaults
O baseline de seguranca que se aplica a todo o codigo, independente de contexto. O que NUNCA fazer (hardcode de secrets, SQL string interpolation, deserializacao de input nao validado), e o que aplicar por default (validacao de input na borda, principle of least privilege, dependencias auditadas). Esses defaults devem ser verificaveis em code review.

**Cubra:** lista do que nunca fazer, defaults que se aplicam a todo codigo, como verificar em code review
**NAO escreva:** comparativos de ferramentas de seguranca, analise de ameacas especificas do projeto

### Architecture Defaults
Os patterns arquiteturais que o time adota por default — e quando desviar deles. "Separacao de concerns entre camadas" eh um default; "quando usar microservicos vs monolifto" eh uma decisao contextual documentada em ADR. Inclua links para os ADRs que registram os maiores desvios.

**Cubra:** patterns arquiteturais default, criterios para desviar de um default, links para ADRs relevantes
**NAO escreva:** comparativos academicos de patterns — cite o que o time usa e por que

### Push Back Triggers
Os sinais que indicam que uma decisao tecnica merece questionamento antes de implementacao. Diferentes de "Push Back Criteria" em PRODUCT_SENSE.md (que eh sobre requisitos de produto), estes triggers sao tecnicos: "a task pede uma abstracao que sera usada apenas uma vez", "a spec contradiz uma invariante documentada em ARCHITECTURE.md", "o escopo da task toca mais de 5 arquivos sem justificativa".

**Cubra:** sinais que indicam over-engineering, quando o spec contradiz codigo existente, como sinalizar sem bloquear
**NAO escreva:** lista de quando dizer "nao" ao usuario — o objetivo eh qualidade, nao obstrucao

## Links obrigatorios

`docs/PRODUCT_SENSE.md` — o produto informa a engenharia. Principios de core-beliefs nao existem no vacuo — eles servem ao produto. O link lembra o leitor que principios de engenharia e julgamento de produto sao complementares.

## Quando deixar TODO

Se o time ainda nao documentou decisoes em ADRs (sem `docs/design-docs/ADR-*.md`), deixe `TODO(<adr-history needed>): sem ADRs encontrados — principios de core-beliefs serao mais genericos ate que decisoes especificas do projeto sejam documentadas`. Principios genericos sao validos como ponto de partida, mas ganham poder com exemplos concretos.

## Anti-patterns

- NAO repetir o conteudo de CLAUDE.md aqui — core-beliefs herdam de CLAUDE.md, nao duplicam
- NAO listar ferramentas especificas como principios — ferramentas mudam, principios sobrevivem
- NAO escrever principios que o time claramente nao segue — o doc deve refletir a realidade, nao a aspiracao
- NAO deixar principios sem justificativa — "faca assim" sem "porque" vira lei sem sentido

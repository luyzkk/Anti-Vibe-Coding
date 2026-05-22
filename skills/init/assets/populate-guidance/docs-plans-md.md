# Guidance: docs/PLANS.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/PLANS.md eh o **indice de navegacao do trabalho em andamento e historico**. Nao eh o conteudo dos planos — eh a porta de entrada para encontra-los. Um contribuidor olhando para o projeto pela primeira vez deve conseguir, em 30 segundos, saber o que esta sendo construido agora e o que ja foi concluido. O indice tambem serve de ponto de entrada para encontrar decisoes historicas que ficaram registradas em planos completados.

O publico primario sao contribuidores (humanos e agentes) que precisam orientar-se sobre o estado atual do projeto.

## Espirito do doc (tom esperado)

Navegacional e utilitario. Nao eh narrativa — eh lista com links. Cada entrada deve ter no minimo: link para o plano, status (ativo/concluido), e 1 linha de contexto sobre o que o plano entregou ou esta entregando. A data de criacao ajuda a ordenar historicamente.

## Sinais a procurar no codebase

- `docs/exec-plans/active/` — lista de diretorios de planos ativos. Cada subdiretorio eh um plano.
- `docs/exec-plans/completed/` — archive de planos concluidos. O historico de decisoes vive aqui.
- `new-plan.ts` ou `scripts/new-plan.ts` — se existe, eh o workflow oficial para criar novos planos. O README desse script deve ser citado em "Creating a New Plan".
- `exec-plans` em qualquer arquivo de configuracao — indica integracao do workflow de planos com ferramentas.

## Por H2 — o que escrever

### Active Plans
Lista todos os planos em `docs/exec-plans/active/`, um por linha, com link relativo e 1 linha de status. Se um plano tem um PRD ou README interno, link para ele diretamente. Mantenha a lista ordenada por data de criacao (mais recente primeiro) para que o trabalho atual apareca no topo.

**Cubra:** link para cada diretorio de plano ativo, status em 1 linha por plano
**NAO escreva:** conteudo dos planos aqui — link para eles

### Completed Plans
Link para o diretorio `docs/exec-plans/completed/` e instrucoes de como navegar no historico. Se o volume de planos concluidos eh grande, pode ser util ter uma lista dos 5-10 mais recentes com 1 linha de contexto, apontando para o diretorio completo para o restante. Enfatize que planos concluidos sao a principal fonte de decisoes historicas.

**Cubra:** link para o arquivo de planos concluidos, como encontrar decisoes historicas especificas
**NAO escreva:** lista exaustiva de todos os planos concluidos — link para o diretorio

### Creating a New Plan
O workflow para criar um novo plano, seja via script (`scripts/new-plan.ts`) ou via convencao manual. Inclua: convencao de nome de diretorio, estrutura esperada (quais arquivos o plano deve ter), e quando criar um novo plano vs adicionar uma fase a um plano existente.

**Cubra:** link para scripts/new-plan.ts, convencao de nomenclatura de diretorios de plano
**NAO escreva:** conteudo do script de criacao de plano (vive no script)

## Links obrigatorios

`docs/PRODUCT_SENSE.md` define os criterios de priorizacao — por que alguns planos existem e outros nao. O link entre PLANS.md e PRODUCT_SENSE.md ajuda o leitor a entender que planos nao sao arbitrarios: refletem decisoes de produto.

## Quando deixar TODO

Se o diretorio `docs/exec-plans/active/` esta vazio (projeto ainda nao tem planos), escreva `TODO(<first-plan needed>): nenhum plano ativo encontrado — criar o primeiro plano com scripts/new-plan.ts`. NAO deixe a secao "Active Plans" vazia sem contexto.

## Anti-patterns

- NAO copiar o conteudo dos planos para PLANS.md — eh um indice, nao um resumo
- NAO listar milestones ou roadmap aqui — pertence a docs/PRODUCT_SENSE.md ou ao plano especifico
- NAO deixar links quebrados — se um plano foi movido ou renomeado, atualizar PLANS.md eh obrigatorio
- NAO misturar planos ativos com planos concluidos na mesma lista

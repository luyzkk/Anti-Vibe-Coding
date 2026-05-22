# Guidance: ARCHITECTURE.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

ARCHITECTURE.md eh o **mapa do territorio** do sistema. Um engenheiro chegando no projeto deve conseguir, em 10 minutos, entender quais sao os componentes principais, como os dados fluem entre eles, e quais invariantes nao podem ser quebradas sem uma discussao de arquitetura. NAO eh documentacao de API. NAO eh spec de implementacao. Eh o nivel de abstracao certo para raciocinar sobre mudancas estruturais.

O publico eh tanto humanos (novos contribuidores, revisores de PR) quanto agentes (Claude Code decidindo onde colocar um novo modulo).

## Espirito do doc (tom esperado)

Descritivo e estrutural. Preferencia por diagramas em texto (mermaid ou ASCII simples) com 1-2 sentencas de explicacao — nao o contrario. Se voce precisar de 3 paragrafos para descrever um componente, o diagrama esta faltando. Cada componente deve ter um link para o path real no codebase — sem links, o doc vira especulacao.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `import\s` e `require(` — mapeia dependencias entre modulos. Revela a estrutura real, nao a imaginada.
- `export default` — entry points de modulos. Cada export default significativo provavelmente eh um componente arquitetural.
- `config/routes` (Rails) ou `src/app/` (Next) — entry point do routing. Define a borda entre a web e a logica de negocio.
- `package.json` scripts e `main` field — entry point da aplicacao em Node-TS.
- `docker-compose.yml`, `Dockerfile` — revelam servicos externos (DB, Redis, workers) que precisam aparecer no diagrama de componentes.

## Por H2 — o que escrever

### System Overview
Um paragrao e um diagrama. O paragrafo responde: qual o problema que este sistema resolve, para quem, em que escala aproximada. O diagrama mostra os 3-7 componentes principais e suas conexoes. Se o sistema tem mais de 7 componentes no nivel top, agrupe-os — um diagrama com 15 caixas nao ajuda ninguem.

**Cubra:** primary stack, deployment target (serverless/VM/container), modelo de dados dominante
**NAO escreva:** historia de como o projeto nasceu, pitch comercial, lista de features

### Components
Uma subsecao por componente principal. Cada subsecao: 2-3 sentencas de responsabilidade + link para o path no codebase. Se um componente nao tem path verificavel, eh provavel que nao existe — nao invente.

**Cubra:** cada componente com link para source path, descricao de responsabilidade clara
**NAO escreva:** implementacao interna do componente (vive no codigo), opcoes que foram consideradas mas nao adotadas

### Data Flow
Descreve como uma requisicao tipica percorre o sistema de ponta a ponta. Um happy-path sequence diagram (mermaid ou texto) com os componentes listados na secao anterior. Foque no ciclo de vida do dado — onde entra, onde persiste, onde sai.

**Cubra:** request lifecycle da borda (HTTP/job/evento) ate persistencia, camada de dados
**NAO escreva:** tratamento de erros detalhado (vive em docs/RELIABILITY.md), casos de borda raros

### Key Invariants
Invariantes sao as verdades que DEVEM ser mantidas atraves de qualquer refatoracao. "O modulo de pagamento NUNCA le do banco diretamente — sempre via PaymentRepository" eh uma invariante. "Procure escrever codigo limpo" nao eh. Esta secao deve ser curta (3-7 itens) e cada item deve ser verificavel em code review.

**Cubra:** invariantes que devem sobreviver a refatoracoes, pre-condicoes de componentes criticos
**NAO escreva:** boas praticas genericas de engenharia, preferencias estilisticas

### Decision Log Links
Aponta para os ADRs relevantes para as decisoes arquiteturais documentadas acima. Se uma escolha de stack ou componente parece nao-obvio sem contexto, deve ter um ADR linkado explicando o raciocinio. Esta secao NAO reescreve o conteudo dos ADRs — apenas lista com 1 linha de contexto cada.

**Cubra:** links para ADR-*.md relevantes com 1 linha de contexto
**NAO escreva:** conteudo resumido dos ADRs (leia o ADR original)

## Stack-specific

### Rails
A entrada do sistema eh `config/routes.rb`. O layout de componentes segue MVC: `app/models/` para dados, `app/controllers/` para coordenacao, `app/views/` para apresentacao. Services extras ficam em `app/services/`. O diagrama deve mostrar esta separacao explicitamente, nao sumir tudo em "Rails MVC".

### Next + React
A entrada eh `src/app/` com App Router. A divisao Server Components / Client Components eh uma decisao arquitetural que deve aparecer no diagrama — nao assuma que o leitor conhece a convencao. `src/lib/` normalmente contem integracao com servicos externos e logica de negocio.

### Node + TypeScript
Entry point via `package.json` main ou `src/index.ts`. O layout mais comum eh `src/routes/`, `src/services/`, `src/repositories/` — mas confirme no codebase antes de assumir. O diagrama deve mostrar onde cada camada vive.

## Links obrigatorios

`docs/PLANS.md` — mudancas arquiteturais em andamento devem ser rastreadas em planos ativos. O link garante que um leitor de ARCHITECTURE.md saiba que o diagrama pode estar desatualizado para um componente em refatoracao.

`docs/DESIGN.md` — se o sistema tem frontend, DESIGN.md complementa ARCHITECTURE.md descrevendo a camada visual. Os dois documentos devem ser coerentes sobre a borda entre backend e frontend.

## Quando deixar TODO

Se um componente nao tem path verificavel no codebase apos grep dos signals listados, escreva `TODO(<component-path needed>): componente X referenciado mas path nao identificado — verificar com dev`. NAO descreva um componente sem ancoragem em codigo.

## Anti-patterns

- NAO duplicar o conteudo de ADRs aqui — link para eles
- NAO descrever o sistema como "planejamos ter" — apenas o estado atual
- NAO listar todos os arquivos do projeto como "componentes" — agrupe por responsabilidade
- NAO omitir servicos externos (DB, Redis, APIs de terceiros) do diagrama — eles sao componentes

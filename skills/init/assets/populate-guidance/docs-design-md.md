# Guidance: docs/DESIGN.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/DESIGN.md eh o **ponto de referencia do sistema de design visual** do projeto. Responde perguntas como: quais sao as cores do sistema? Como um componente novo deve ser nomeado? Onde encontrar os arquivos do Figma? NAO eh a implementacao em codigo — eh a ponte entre decisoes de design e a camada de codigo.

O publico primario eh quem trabalha na interface visual: designers que precisam saber o que ja existe, e engenheiros frontend que precisam implementar sem inventar tokens novos.

## Espirito do doc (tom esperado)

Referencial e preciso. Cada token mencionado deve ter um link para o arquivo de origem real (tailwind.config.ts, CSS vars, etc.) — nao duplicar os valores aqui. "Cor primaria: ver tailwind.config.ts#L42" eh melhor do que "Cor primaria: #3B82F6" porque o arquivo de origem eh a fonte da verdade e nao fica desatualizado.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `tailwind.config` — define tokens de cor, espacamento e tipografia. Eh a fonte primaria para projetos Next/React.
- `globals.css` com variaveis CSS (`--color-`, `--spacing-`) — tokens via CSS custom properties.
- `design-tokens` em qualquer path — indica que tokens sao gerenciados separadamente do framework.
- `docs/design-docs/ADR-` — ADRs podem registrar decisoes de design system que informam esta documentacao.
- `src/components/ui/` ou `app/components/` — biblioteca interna de componentes. A convencao de nomes aqui informa "Component Guidelines".

## Por H2 — o que escrever

### Design Tokens
Descreve o sistema de tokens (cores, espacamento, tipografia, bordas) e aponta para os arquivos onde eles sao definidos. NAO duplica os valores — isso cria duas fontes da verdade. Se os tokens sao gerados automaticamente (ex: Figma Tokens plugin), explica o workflow de geracao.

**Cubra:** links para arquivos de tokens (tailwind.config, CSS vars), sistemas de cor e espacamento, tipografia
**NAO escreva:** valores de tokens hardcoded aqui — link para o arquivo de origem

### Component Guidelines
Como um componente novo deve ser criado e nomeado neste projeto. Inclui convencao de nomenclatura (PascalCase para componentes React? prefixo por feature?), quando criar um componente atomico vs composto, e onde os componentes compartilhados ficam no projeto.

**Cubra:** convencao de nomenclatura, regra de quando atomico vs composto, onde ficam componentes compartilhados
**NAO escreva:** tutorial de como usar o framework de componentes (pertence a docs/FRONTEND.md)

### Design-to-Code Conventions
O processo de handoff entre design e implementacao. Como um designer comunica para um engenheiro o que precisa ser implementado? Qual a convencao para usar tokens em vez de valores hardcoded? Quem eh o dono de cada token?

**Cubra:** processo de handoff, convencao para usar tokens em codigo, dono das definicoes de token
**NAO escreva:** instrucoes de uso de ferramentas de design especificas (pertence a onboarding de designer)

### Design Tool Links
Links para os arquivos de design (Figma, Sketch, etc.) com instrucoes de acesso. Se o projeto nao tem ferramenta de design, essa secao deve dizer isso explicitamente em vez de ficar em branco.

**Cubra:** URL do arquivo de design, instrucoes de acesso (quem tem permissao), ultimo update relevante
**NAO escreva:** instrucoes de uso interno da ferramenta de design

## Links obrigatorios

`ARCHITECTURE.md` — o design system vive na camada de apresentacao e ARCHITECTURE.md mapeia como essa camada se relaciona com o resto do sistema. O link ajuda a contextualizar onde DESIGN.md se encaixa no mapa maior.

## Quando deixar TODO

Se o projeto nao tem arquivo de tokens identificavel (sem tailwind.config, sem CSS vars, sem design-tokens), deixe `TODO(<tokens-source needed>): tokens de design nao encontrados — verificar com designer ou dev responsavel pelo frontend`. NAO invente uma estrutura de tokens que nao existe.

## Anti-patterns

- NAO duplicar valores de tokens aqui — quando o valor mudar no arquivo de origem, o doc fica desatualizado
- NAO descrever um sistema de design que o projeto nao implementou ainda — descritivo, nao aspiracional
- NAO misturar guias de implementacao tecnica com decisoes de design (o tecnico vai para docs/FRONTEND.md)
- NAO omitir esta secao inteira se o projeto tem frontend — mesmo um doc minimo com links eh melhor que ausencia

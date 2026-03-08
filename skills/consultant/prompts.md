# Prompts Estruturados — Modo Consultor

## Prompt 1 — Mapa de Decisões Arquiteturais

Use quando estiver começando um projeto ou feature nova:

> Eu preciso implementar [funcionalidade].
> ANTES de escrever qualquer código, preciso entender as decisões arquiteturais:
> 1. Qual é a decisão que preciso tomar?
> 2. Quais são as 2-3 opções mais comuns?
> 3. Para cada opção: pró, contra, e quando usar?
> 4. Qual você recomenda para MEU contexto e por quê?
> 5. Que consequências essa escolha terá no futuro?

## Prompt 2 — Validação de Abordagem

Use quando a IA sugerir algo e você não tiver certeza:

> Você sugeriu [abordagem X]. Antes de eu aprovar:
> 1. Existe forma mais otimizada? Se sim, qual e por quê?
> 2. Quais os trade-offs dessa abordagem?
> 3. Em que cenário essa abordagem QUEBRARIA?
> 4. Com 10x mais usuários/dados, ainda funcionaria?
> 5. Um dev sênior faria diferente? Como e por quê?

## Prompt 3 — Explicação Pós-Implementação

Use DEPOIS que a IA gerou código, antes de aprovar:

> Explique o código como se eu fosse um dev júnior. Para cada decisão:
> 1. O que você fez e por quê?
> 2. Qual alternativa existia e por que não escolheu?
> 3. Tem algum ponto frágil que eu deveria monitorar?
> 4. O que eu deveria estudar para entender melhor?

## Prompt 4 — Detector de Padrões Ruins

Use quando desconfiar que algo não está certo:

> Revise o código do módulo [X] como code review sênior rigoroso:
> 1. Acoplamentos problemáticos para quando o projeto crescer
> 2. Padrões que parecem funcionar mas são anti-patterns
> 3. Decisões que um júnior tomaria mas um sênior evitaria
> 4. Oportunidades de simplificação
> 5. Riscos de segurança ou performance

## Prompt 5 — Decisão Crítica (Irreversível)

Use quando a decisão vai afetar o projeto inteiro:

> Você está propondo [decisão X]. Preciso ter certeza:
> 1. REVERSÍVEL ou IRREVERSÍVEL? Se irreversível, quais riscos?
> 2. Qual o custo de mudar daqui a 3 meses?
> 3. Projetos similares usam essa abordagem?
> 4. Existe convenção estabelecida na comunidade?
> 5. Vou encontrar exemplos e documentação facilmente?

## Cheat Sheet

| Situação | Prompt |
|----------|--------|
| "Não sei por onde começar" | Prompt 1 (Mapa de Decisões) |
| "Será que é a melhor forma?" | Prompt 2 (Validação) |
| "Não entendi o que a IA fez" | Prompt 3 (Explicação Pós) |
| "Algo parece errado" | Prompt 4 (Detector) |
| "Decisão vai afetar tudo" | Prompt 5 (Decisão Crítica) |

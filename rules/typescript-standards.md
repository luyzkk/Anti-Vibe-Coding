# TypeScript Standards — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos `.ts` e `.tsx`.

## Type Safety

- Use strict TypeScript, NUNCA use `any`
- Quase nunca use casting com `as` — se precisar, questione o design
- Deixe o compilador inferir tipos de retorno sempre que possível
- Use query-builders em vez de raw SQL para type-safety
- Prefira `type` sobre `interface`
- Mantenha tipos perto de onde são usados

## Naming

- Seja concreto: `retryAfterMs` > `timeout`, `emailValidator` > `validator`
- NUNCA use nomes vagos: `data`, `item`, `list`, `component`, `info`
- Não abrevie: use nomes descritivos
- `SNAKE_CAPS` para constantes, `camelCase` para funções, `kebab-case` para arquivos
- Sem sufixos como Manager, Helper, Service a menos que essencial
- `users` não `userList` — sem nomes redundantes

## Estrutura

- SEMPRE use named exports; evite default exports a menos que requerido pelo framework
- Não crie arquivos index apenas para re-exportar
- Prefira `await/async` sobre `Promise().then()`
- Variáveis não utilizadas devem começar com `_` (ou não devem existir)
- SEMPRE use early return em vez de if-else aninhado
- Prefira hash-lists sobre switch-case
- Prefira string literals sobre concatenação de strings

## Organização

- Mantenha código perto de onde é usado (a menos que reutilizado 2-3+ vezes)
- Uma pasta com um único arquivo deve ser apenas o arquivo (sem pasta)
- Comentários são desnecessários 98% das vezes — converta em funções ou variáveis descritivas
- Evite níveis de indentação, busque código flat

## Anti-Patterns

- NUNCA: otimização prematura
- NUNCA: abstrações inúteis (funções que só chamam uma função, helpers usados uma vez)
- NUNCA: over-engineering
- NUNCA: magic strings ou magic numbers — extraia para constantes ou enums
- Use objetos aninhados para contexto: `config.public.ENV_NAME` em vez de `ENV_NAME` solto

## Error Handling

- SEMPRE forneça feedback ao usuário em caso de erro
- Logue erros com ferramentas de observability
- Use Higher-Order Functions para monitoring e error handling
- NUNCA ignore edge cases ou exceções

## Tooling

- Use pre-commit hooks para linting, parsing e remoção de dead code

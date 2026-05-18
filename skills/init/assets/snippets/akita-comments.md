## Comments

**Escreva o WHY. Nunca o WHAT.**

**Comente quando:**
- Proveniência externa: `# via Stripe docs §3.2 — idempotency key obrigatório aqui`
- Decisão não óbvia: `# usar created_at em vez de updated_at — updated_at muda em reindexações`
- Workaround documentado: `# workaround: SDK retorna 200 em falha silenciosa (issue #4821)`
- Referência a bug: `# bug #1234: race condition se chamar sem lock`
- Constraint externo: `# limite da API: máx 100 itens por batch`
- Docstrings em funções públicas: sempre — parâmetros, retorno, exceções esperadas

**NUNCA comente:**
- O que o código já diz: `i += 1  # incrementa i`
- Nomes redundantes: `# calcula total` acima de `calculateTotal()`
- Código comentado (morto): delete, o git guarda o histórico

**Em refactor por IA:** não podar comentários do tipo WHY. Se um comentário explicar uma decisão ou workaround, ele sobrevive à refatoração mesmo que o código ao redor mude.

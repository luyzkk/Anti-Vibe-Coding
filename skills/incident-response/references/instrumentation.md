# Rubrica de instrumentação

Referência das Etapas 5 e 8 de [`SKILL.md`](../SKILL.md): o que decidir sobre instrumentação durante
o diagnóstico e depois do fix.

A distinção que governa tudo aqui: **probe de diagnóstico morre, observabilidade de produção fica.**
Probe leva tag `[DEBUG-xxxx]` e sai no grep de limpeza; o que é para ficar não leva tag, justamente
para não sair junto.

## Quando adicionar

- A linha exata do erro não aparece nos logs existentes.
- O bug é intermitente (heisenbug) e é preciso capturar a próxima ocorrência.
- Múltiplos componentes envolvidos e a fronteira de falha está ambígua.

## Quando remover

- O bug foi corrigido e o regression test passa a guardar o comportamento.
- O log servia só ao desenvolvimento local e não agrega nada em produção.
- **O log contém dado sensível** — remover imediatamente, sem exceção. Esta não espera o fim do
  diagnóstico.

## O que fica permanente

- Error boundaries com reporting (Sentry, structured log de erro).
- Log de erro de API com contexto de request: método, path, status, `user_id`.
- Métricas nos fluxos críticos — pagamento, autenticação, escrita em banco.

Arquitetura de logging de produção: `design-patterns/references/structured-logging.md`.

---
id: 24
title: "Revoga a regra 'copiar e nunca diminuir'"
status: "active"
created: 2026-10-13
---

# ADR-0024: Revoga a regra "copiar e nunca diminuir"

## Context

Em 2026-05-19, depois de comparar o `/init` do plugin com o harness do André Prado no projeto
Carreirarte, ficou registrada a regra: ao portar de uma ferramenta validada, copiar literalmente e
só melhorar por adição, nunca "adaptar para baixo". A regra corrigiu um problema real naquele
momento: o `/init` deixava de fora documentos que o harness do André cobria.

Com o tempo, a regra passou a valer para tudo e virou uma catraca. Conteúdo só entrava, nada saía,
e testes de contrato passaram a ter a frase "nunca diminuir" nas mensagens de falha, o que ensina o
agente a restaurar qualquer corte.

A auditoria de 2026-10-10 (232 peças, uso real de 90 dias) mostrou o custo:

- 18 das 46 skills sem nenhum uso em 90 dias, e as de consulta com mais de 16 mil linhas para
  poucas dezenas de usos;
- 9 a 11 dos 16 comandos automáticos sem rodar, com a suíte verde;
- texto errado onde o erro custa caro, como o exemplo de webhook da Stripe.

A fonte da regra também mudou de posição: o próprio André agora apaga o harness a cada modelo novo
e só devolve o que faz falta. Uncle Bob, Boris Cherny e Karpathy convergem num ponto: regra em texto
não segura o modelo; o que segura é ferramenta que falha.

## Decision

A regra está revogada. Decisão D1 da entrevista da 8.0, tomada pelo dono em 2026-10-13
(`docs/exec-plans/active/2026-10-13-anti-vibe-8/PRD.md`).

No lugar dela:

1. **Cortar é permitido** quando há uma decisão registrada e evidência, como uso medido, teste que
   prova a peça morta ou duplicação com recurso nativo do Claude Code.
2. **Portar continua começando pela versão completa.** Copia-se inteiro, mede-se, e poda-se o que
   não paga o próprio custo.
3. **A cada modelo novo, testa-se sem.** Peça que não muda o resultado sai.
4. **Paridade com referência continua sendo teste, não documento** (nota compound de 2026-05-19).
   O que muda é a direção: o teste guarda o contrato vigente, não proíbe o contrato de encolher.

## Consequences

- Os testes de contrato continuam guardando o conteúdo combinado. Quando uma decisão registrada
  remove um item, a asserção correspondente muda no mesmo commit, citando a decisão.
- As mensagens desses testes deixam de invocar a regra revogada.
- O modelo de plano que o `/init` distribui deixa de ensinar que "nunca diminuir precede custo".
- A memória do agente que registrava a regra como preferência do dono passa a apontar para esta ADR.

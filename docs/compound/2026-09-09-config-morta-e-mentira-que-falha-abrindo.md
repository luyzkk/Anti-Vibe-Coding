---
title: "Config morta é mentira que falha abrindo — e por isso nunca é descoberta pelo uso"
category: armadilha
tags: [config, hooks, enforcement, codigo-morto, deteccao, honestidade, tdd-gate]
created: 2026-09-09
---

## Problem

Seis lugares do plugin documentavam enforcement que não rodava:

- `config/tdd-gate.json` declarava um modo de operação cujo ramo no hook era um bloco vazio com
  `TODO`, e que caía no modo anterior sem avisar ninguém.
- Cinco chaves do mesmo arquivo eram lidas para dentro de um objeto de defaults e **nunca lidas de
  novo**.
- A skill afirmava, em texto, que uma dessas chaves dava "bloqueio real via hook".
- O hook lia um arquivo de estado que **nenhum código escrevia**, e por isso a proteção inteira que
  dependia dele estava desligada, levando junto mais duas chaves.
- O pre-commit lia uma variável de ambiente que o Claude Code nunca preenche.
- Um config prometia uma chave que não existia, e o auditor correspondente não rodava.

Tudo isso atravessou um gate de paridade com dezenas de assertions, uma rodada de dogfood e três
releases.

O motivo de nada disso ter sido descoberto é a **direção da falha**: todos falhavam **abrindo**. Nada
quebra, nada trava, nenhum teste fica vermelho. O sistema simplesmente deixa de fazer o que o texto
promete, e a única forma de perceber é ler o código procurando por isso.

## Solution

O sinal detectável é barato e não exige julgamento:

> **Chave de configuração que aparece uma única vez no código, dentro do objeto de defaults, não tem
> leitor.**

Contar ocorrências por chave levou segundos e apontou as cinco. A partir daí, cada item virou uma
pergunta só, respondida item a item: **implementar ou admitir**. A resposta não foi a mesma para
todos, e essa é a parte que importa. O modo de operação saiu por medição (o mecanismo não existia e
não cabia no orçamento do hook). A âncora ficou, porque a medição mostrou o oposto: o mecanismo
estava inteiro e faltava só o gatilho.

A leitura do config virou um arquivo só, `hooks/lib/gate-config.cjs`, com a regra escrita no topo:
toda chave ali precisa ter leitor real em algum hook.

## Prevention

- Rode a contagem por chave antes de confiar em qualquer config: chave com uma ocorrência só é
  candidata a morta. Vale um teste de fumaça.
- **Comentário que lista os nomes removidos envenena essa mesma busca.** Ao documentar uma remoção,
  descreva a regra sem citar os tokens, e deixe a lista nominal no ADR.
- Antes de decidir um pacote de promessas quebradas, meça cada uma. Promessas quebradas têm sinais
  opostos: umas pedem remoção, outras pedem só o gatilho que ficou faltando. Decisão única para o
  pacote inteiro erra metade.
- Ao consertar, não substitua a promessa falsa por outra: se o mecanismo protege mas pode ser
  contornado, documente que ele **torna o desvio visível**, nunca que ele impede.

## Affected files

- `config/tdd-gate.json` e `hooks/lib/gate-config.cjs` — as chaves e o leitor único
- `hooks/tdd-gate.cjs`, `hooks/tdd-gate-bash.cjs`, `hooks/pre-commit-suite.cjs` — os três leitores
- `config/verify-work.json` — a chave que o doc prometia e o arquivo não tinha
- `skills/execute-plan/SKILL.md` — o passo que passou a armar e desarmar a âncora
- `docs/design-docs/ADR-0023-honestidade-config-tdd-gate.md` — as seis decisões, com a alternativa
  rejeitada de cada uma
- `docs/exec-plans/completed/2026-09-09-honestidade-de-config.md` — o log das sete etapas
- Notas irmãs: `2026-09-09-gate-reprovou-nao-e-gate-nao-rodou.md` e
  `2026-09-09-token-prefixo-cria-assertion-vacua.md`

---
title: "Fonte dividida entre duas fases cria lacuna que ninguém reivindica — cada extrator assume que o outro pegou"
category: processo
tags: [subagents, planejamento, decomposicao, knowledge-atoms, escopo, lacuna-silenciosa, fronteira]
created: 2026-08-31
---

## Problem

Quando um plano divide **uma fonte** entre **duas fases** — aqui, um relatório de pesquisa que
alimentava tanto `sqlalchemy-async-and-orm` (runtime ORM) quanto `migrations-and-schema-evolution`
(evolução de schema) — a fronteira é escrita como duas listas de inclusão. O que cai fora das duas
listas não é reivindicado por ninguém, e nada no processo denuncia.

Foi o que aconteceu com a subárea *"constraints do banco vs validação da aplicação"* (L260-296 da
fonte): constraint como árbitro atômico contra o race de "check-then-insert", com o argumento de
que validação na aplicação roda num snapshot e não impede outra requisição de passar pela mesma
checagem antes do primeiro `INSERT`. Conteúdo sênior de verdade.

O extrator de migrations a excluiu por julgá-la runtime. O extrator de ORM nunca a viu — ela não
estava na lista dele. O plano, escrito antes de qualquer um dos dois rodar, não a atribuiu a
ninguém. Os dois átomos passaram no verifier com 5/5, porque **rastreabilidade mede o que foi
escrito, nunca o que faltou**.

A lacuna só apareceu por um acidente feliz: o extrator de migrations reportou a exclusão dizendo
que **não pôde confirmar** se o átomo irmão a cobria, porque ler o irmão estava fora do escopo
dele. Se ele tivesse decidido calado — a decisão dele era defensável —, o conteúdo teria sumido
dos 18 átomos sem deixar rastro.

O mesmo plano produziu uma segunda evidência do padrão: rotulou um conflito de repository como
"Percival vs **Bayer**". Bayer aparece na fonte **só em contexto de Alembic** — a *outra* metade
do split. O nome migrou de uma metade para a outra durante o planejamento, e o rótulo errado ficou.

## Solution

Três mudanças, em ordem de retorno:

1. **Escrever a fronteira nos dois sentidos, não só no de inclusão.** O prompt de cada fase declara
   o que é dela **e nomeia explicitamente o que pertence à irmã**. Foi o que passou a ser feito nas
   waves seguintes:

   > **ESTE átomo = ORM em RUNTIME:** sessões async, `MissingGreenlet`, pooling, deadlocks (...)
   > **NÃO ENTRA AQUI — pertence a `migrations-and-schema-evolution`:** Alembic, zero-downtime,
   > backfill, evolução de constraints. Claim de migração neste átomo é defeito.

   Isso ainda não fecha a lacuna, mas torna a fronteira legível e o buraco visível.

2. **Instruir o extrator a reportar exclusão duvidosa em vez de decidir calado.** A regra que
   funcionou não foi "decida certo" — foi "quando você excluir algo por julgar que pertence ao
   irmão, e não puder confirmar, **diga**". O relato do subagente é o único ponto do pipeline que
   enxerga a fronteira de dentro.

3. **Fechar a lacuna com quem tem a fonte em contexto.** Ao confirmar que a subárea não estava em
   nenhum dos dois, o pattern foi escrito pelo **próprio extrator** de migrations, retomado por
   mensagem — ele ainda tinha a fonte aberta. Redigir a claim no orquestrador teria produzido
   conteúdo sem a disciplina de fidelidade que o resto do átomo tem.

## Prevention

1. **Fonte compartilhada é sinal de risco, não de eficiência.** Sempre que duas unidades de
   trabalho lerem o mesmo arquivo, alguém precisa responder "o que não é de nenhuma das duas?"
   antes de rodar — e a resposta pertence ao plano, não aos executores.

2. **Gate de rastreabilidade não detecta omissão, por construção.** Ele amostra o que está escrito
   e procura na fonte. A pergunta inversa — "o que da fonte não virou nada?" — exige varrer a
   fonte, não o artefato. Se a completude importa, é um segundo gate, não o mesmo.

3. **Peça o relato de exclusão como entregável.** "Liste o que você deliberadamente deixou de fora
   e por quê" custa um parágrafo por subagente e é o que transforma decisão silenciosa em decisão
   auditável. Neste projeto foi o que expôs tanto esta lacuna quanto o sub-escopo de outra fase.

4. **Erro de rótulo migra junto com o split.** Quando o plano é escrito lendo uma fonte que depois
   é dividida, nomes próprios e IDs atravessam a fronteira e ficam do lado errado. Um extrator fiel
   vai discordar do prompt — e essa discordância deve ser tratada como sinal, não como
   desobediência: aqui, ele estava certo e o plano errado.

5. **Esta lição se aplica a:** decomposição de qualquer fonte grande entre tarefas paralelas —
   migração de arquivo grande dividida por seção, documentação dividida por capítulo, refactor
   dividido por módulo com um arquivo compartilhado.

## Affected files

- `knowledge/python/atoms/migrations-and-schema-evolution.md` — onde a subárea órfã foi alocada
- `knowledge/python/atoms/sqlalchemy-async-and-orm.md` — a outra metade do split
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano03/fase-03-sqlalchemy-async-and-orm.md` — nota de correção do rótulo "Percival vs Bayer"
- `docs/exec-plans/completed/2026-08-30-stack-knowledge-python/plano03/verifier-report-plano03.md` — registro da lacuna e do fechamento

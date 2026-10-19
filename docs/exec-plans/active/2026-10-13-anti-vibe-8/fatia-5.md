# Fatia 5 — A memória

Detalhe da fatia 5 do [PRD da 8.0](./PRD.md), escrito quando ela começou (D3). As decisões abaixo
saíram da entrevista de 2026-10-18 e aplicam a D5.

## O problema medido

O plugin escreve o que o projeto aprende, mas ninguém lê de volta. O `/lessons-learned` grava cada lição
em `docs/compound/` (76 neste repositório), e nenhuma skill consulta essa pasta antes de planejar,
programar ou diagnosticar. O único conteúdo relido são as "Notas para Planos Seguintes" de cada plano.
O plugin não fala com o ai-memory em lugar nenhum.

## Decisões

| # | Decisão |
|---|---|
| F5-1 | Um índice na pasta de lições, uma linha por lição: título, etiquetas e caminho. O Claude lê o índice, que é barato, e abre a lição inteira só quando uma linha bate com o trabalho. |
| F5-2 | O índice é gerado por script a partir dos próprios arquivos de lição. O `/lessons-learned` roda o script depois de gravar, e o `compound-check` falha se o índice estiver desatualizado. |
| F5-3 | O Claude consulta o índice em quatro momentos: ao escrever a página da feature, ao detalhar uma fatia, ao diagnosticar um bug e na revisão final. A revisão final também passa a ler as listas de revisão do projeto (`docs/review-checklists/`). |
| F5-4 | No fim de cada fatia, depois da explicação, o Claude olha os bugs e armadilhas que a fatia registrou, passa pelo filtro de sênior e propõe no máximo 3 candidatas a lição. O usuário escolhe quais viram lição; nada é gravado sem a escolha dele. |
| F5-5 | O ai-memory é opcional. Se estiver ligado, ao registrar uma lição o Claude grava lá um ponteiro (título, resumo e caminho), e ao diagnosticar um bug pergunta se outro projeto já passou por isso. A lição mora na pasta do projeto; sem ai-memory, tudo funciona igual. |
| F5-6 | Saem as peças de memória que nunca rodam: o agente avaliador de lições, que ninguém chama; os módulos do init que importariam lições antigas; e o gerador do retrato do projeto (`docs/STATE.md` continua, como arquivo editado à mão). Ficam na tag v7.9.0. |
| F5-7 | A pasta continua `docs/compound/`: os projetos que já usam o plugin têm essa pasta, e o init, o checker e o harness esperam esse nome. |
| F5-8 | A limpeza e o índice rodam em sequência e param juntos para o usuário ver; a leitura e a captura param cada uma para aprovação. |

## Fases

1. **Limpeza (F5-6).** As peças que nunca rodam saem, com a suíte verde.
2. **O índice (F5-1, F5-2).** O script que gera o índice, a conferência no `compound-check` (no repositório
   e no modelo que o init distribui) e o índice deste repositório.
3. **A leitura (F5-3).** write-prd, plan-feature, incident-response e verify-work passam a consultar o índice.
4. **A captura e o ai-memory (F5-4, F5-5).** As candidatas no fim de cada fatia e o ponteiro opcional no
   ai-memory.

A fase 1 segue direto para a 2; as fases 2, 3 e 4 param para aprovação.

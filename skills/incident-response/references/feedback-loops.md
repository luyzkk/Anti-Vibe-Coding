# Construir e apertar o loop de feedback

Referência da Etapa 2 de [`SKILL.md`](../SKILL.md): as formas de obter um sinal pass/fail que fica
*red* no bug, como apertá-lo, e o que fazer quando o bug não é determinístico.

## As dez formas, mais ou menos nesta ordem

1. **Teste falhando** no seam que alcança o bug — unit, integração ou e2e.
2. **Curl / script HTTP** contra um dev server rodando.
3. **Invocação de CLI** com input de fixture, comparando stdout contra um snapshot conhecido.
4. **Script de browser headless** (Playwright / Puppeteer) — dirige a UI e assevera sobre DOM,
   console ou rede.
5. **Replay de um trace capturado.** Salvar em disco um request, payload ou event log real e
   reproduzi-lo isoladamente pelo caminho de código.
6. **Harness descartável.** Subir um subconjunto mínimo do sistema — um serviço, dependências
   mockadas — que exercita o caminho do bug numa única chamada de função.
7. **Loop de property / fuzz.** Quando o bug é "às vezes a saída sai errada", rodar 1000 inputs
   aleatórios e procurar o modo de falha.
8. **Harness de bisect.** Quando o bug apareceu entre dois estados conhecidos (commit, dataset,
   versão), automatizar "sobe no estado X, checa, repete" até dar para rodar `git bisect run`.
9. **Loop diferencial.** Mesmo input pela versão antiga e pela nova (ou por duas configs), com diff
   das saídas.
10. **Script HITL.** Último recurso. Se um humano precisa clicar, dirigir *a pessoa* com
    [`../scripts/hitl-loop.template.sh`](../scripts/hitl-loop.template.sh), para o loop continuar
    estruturado. A saída capturada volta para o agente.

Com o loop certo construído, o bug está 90% resolvido.

## Apertar o loop

Tratar o loop como produto. Uma vez que exista *um* loop, **apertar**:

- Dá para deixar mais rápido? Cachear setup, pular init não relacionado, estreitar o escopo do teste.
- Dá para deixar o sinal mais afiado? Asseverar o sintoma específico, não "não quebrou".
- Dá para deixar mais determinístico? Fixar o tempo, semear o RNG, isolar o filesystem, congelar a
  rede.

Um loop flaky de 30 segundos é pouco melhor que nenhum; um determinístico de 2 segundos é *tight* —
e é superpoder de depuração.

## Bugs não-determinísticos

O objetivo não é um repro limpo, é uma **taxa de reprodução maior**. Rodar o gatilho 100×,
paralelizar, adicionar estresse, estreitar janelas de timing, injetar sleeps. Um bug que falha em 50%
das vezes é depurável; em 1% não é — seguir elevando a taxa até virar depurável.

A classificação da Etapa 1 (timing / ambiente / estado / verdadeiramente aleatório) diz **por onde**
elevar: janela de race pede sleep injetado e timestamps; dependência de estado pede isolamento;
dependência de ambiente pede rodar em CI. Lá se classifica, aqui se eleva.

## Quando genuinamente não dá para construir um loop

Parar e dizer isso explicitamente, listando o que já foi tentado. Pedir ao usuário uma destas três:

- acesso ao ambiente onde o bug reproduz;
- um artefato capturado e redigido (HAR, dump de log, core dump, gravação de tela com timestamps);
- permissão para instrumentar produção temporariamente.

Seguir para a hipótese sem loop é o caminho que esta skill existe para fechar — o que se faz aqui é
esperar pelo insumo, não adivinhar sem ele.

## Redigir antes de mostrar

Esta etapa faz você mostrar comandos, saídas e artefatos capturados. **Redigir todo segredo antes**,
escrevendo `<REDACTED>` no lugar. Construir os loops contra variáveis de ambiente, para a credencial
ficar no ambiente e não no que você exibe. Artefato capturado carrega header de autenticação: citar
só as linhas que carregam o sinal.

Se a saída redigida não bastar para diagnosticar, dizer isso e perguntar ao usuário.

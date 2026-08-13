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

Classificar primeiro — a categoria diz por onde elevar, e cada uma tem uma ação diferente:

```
├── Dependente de timing   → timestamps ao redor da área suspeita; ampliar
│                            artificialmente as janelas de race condition
├── Dependente de ambiente → rodar em CI para obter ambiente limpo; comparar
│                            variáveis de ambiente entre local e produção
├── Dependente de estado   → rodar em isolamento para revelar estado vazado;
│                            checar fixtures/mocks que compartilham estado entre testes
└── Verdadeiramente aleatório → logging defensivo + alerta na assinatura do erro;
                                aguardar nova ocorrência já com dados instrumentados
```

Não seguir para hipótese sem ao menos um dado observado da categoria identificada.

## Regressão de performance

Para perf, log é quase sempre a ferramenta errada — ele diz *que* passou por ali, não *quanto* custou.
O loop aqui é uma **medida**, e a ordem é **medir primeiro, corrigir depois**:

1. Estabelecer o baseline com o instrumento certo: harness de tempo, `performance.now()`, profiler ou
   plano de query (`EXPLAIN`) quando o suspeito é o banco.
2. Fixar o que varia — mesma máquina, mesmo dataset, mesmo estado de cache — senão o ruído engole o
   sinal e qualquer mudança "parece" ter funcionado.
3. Bisect contra essa medida, com as formas 8 e 9 acima: o harness de bisect automatiza "sobe no
   estado X, mede, repete", e o loop diferencial compara versão antiga contra nova no mesmo input.

Sem baseline não há como provar que a correção melhorou alguma coisa — só que o número de hoje é
diferente do número que ninguém anotou ontem.

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

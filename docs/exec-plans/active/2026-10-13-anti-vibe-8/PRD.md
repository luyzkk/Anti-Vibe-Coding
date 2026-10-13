# Anti-Vibe-Coding 8.0

Página de entrada da 8.0, no formato em camadas decidido na entrevista de 2026-10-13. As 12
decisões abaixo foram tomadas pelo Luiz, uma por uma, em linguagem simples. Nada entra na 8.0
fora delas sem uma nova pergunta.

- **Versão de volta:** [v7.9.0 no GitHub](https://github.com/luyzkk/Anti-Vibe-Coding/releases/tag/v7.9.0)
- **Desenho e evidência:** [Auditoria Anti-Vibe 7.9](https://claude.ai/artifact/ALCmfWu3MzmXRobEwdEPdp), com o
  veredito de cada uma das 232 peças. Os vereditos de arquivar as skills de consulta foram revistos pela D4.

## Problema

O plugin foi criado para dar a quem não é engenheiro o conhecimento de um engenheiro sênior e para
ensinar a pedir à IA. Na 7.9 ele pesa mais do que ajuda em boa parte do caminho:

- toda sessão começa com a lista de todas as skills e a ordem de perguntar antes de implementar;
- os documentos de planejamento chegam a pesar mais que o código entregue;
- 9 a 11 dos 16 comandos automáticos nunca rodaram, com a suíte verde;
- há defeitos onde o erro custa caro: o init apaga o CLAUDE.md do projeto, o exemplo de webhook
  da Stripe está errado e o grep de segredos não pega a chave secreta da Stripe.

O que falta ao usuário não é conhecimento no modelo. É saber o que perguntar, ver as opções com
prós e contras e ter prova de que funcionou.

## Apetite

Duas semanas em meio período. O que não couber fica para depois. Correções de segurança e o que
mais pesa no dia a dia entram primeiro.

## Princípio

O Claude faz sozinho o que já faz bem. O plugin entra onde ele falha: perguntar o que importa,
mostrar as opções e conferir com prova. Regra escrita que pode virar verificação vira verificação.

## Decisões da entrevista

| # | Decisão |
|---|---|
| D1 | A regra "copiar a ferramenta de outra pessoa e nunca diminuir" está revogada. A 8.0 pode cortar o que não ajudou. |
| D2 | Nas partes com dinheiro, saúde ou dados, o usuário aprova os cenários de teste uma vez, no início, em linguagem de negócio. A máquina confere se os testes pegam o erro. Substitui a decisão de 2026-10-02 de manter o gate humano a cada fase. |
| D3 | O documento de cada feature cresce em camadas: toda feature começa com uma página; sistema complexo ganha também um documento de desenho; o plano vem em fatias, e cada fatia só é detalhada quando for começar. |
| D4 | Os guias de arquitetura, system design, API, infraestrutura e segurança viram roteiros de perguntas: o Claude pergunta o que só o usuário sabe, mostra duas ou três opções com prós e contras em português simples e registra a escolha. O texto atual fica guardado como referência, lido só quando o usuário pedir. |
| D5 | O que o projeto aprende fica numa pasta versionada do próprio projeto. O ai-memory é a camada mais profunda: histórico das sessões, busca entre projetos e ponteiros para a pasta. |
| D6 | O aviso de início de sessão tem no máximo seis linhas: versão, nível de risco do projeto e por onde começar. |
| D7 | Ficam só os comandos automáticos úteis: bloqueio de comandos perigosos, bloqueio de código sem teste nas partes de risco e teste antes do commit. Os outros saem depois de um teste que prove quais estavam mortos. |
| D8 | Apetite de duas semanas em meio período. |
| D9 | As 18 skills sem uso em 90 dias saem da instalação e ficam guardadas na tag v7.9.0. |
| D10 | Os revisores automáticos passam por um teste com erros de dinheiro plantados. Fica só quem pegar o erro, comparado com a revisão nativa do Claude Code. |
| D11 | O init atual é a base. Ele é melhorado com o que um engenheiro sênior consideraria essencial, nunca apaga arquivo existente do projeto e deixa declarado o nível de risco. |
| D12 | Toda mudança da 8.0 passa por uma pergunta ao usuário antes de entrar. |

## Fatias, na ordem

Cada fatia é detalhada só quando for começar.

1. **Segurança e base.** Corrigir o init que apaga o CLAUDE.md, o exemplo de webhook da Stripe, o grep
   de segredos e o caminho padrão do script de instalação. Registrar a D1 e ajustar o teste que trava
   o texto com "nunca diminuir".
2. **O que pesa todo dia.** Teste que executa cada comando automático e prova quais estão mortos; tirar
   os mortos; aviso curto; tirar da instalação as 18 skills sem uso.
3. **A porta de entrada.** Página de uma folha com nível de risco; documento de desenho só quando o
   sistema pede; cenários aprovados no início nas partes de risco.
4. **Os guias de decisão.** Reescrever como roteiros de perguntas, começando por system design,
   segurança e arquitetura.
5. **A memória.** Uma pasta por projeto, com o ai-memory como camada profunda.
6. **Os revisores.** Teste com erros plantados e enxugamento.
7. **O init.** Base atual com o essencial de um sênior.

## Fora desta versão

Ficam para o próximo esforço, nos projetos de produto: CI por nível de risco no produto, teste do
checkout com reenvio de webhook, rotina diária de verificação, avaliação dos limites clínicos da
Jéssica e teste de mutação nas funções de preço e de acesso.

## Premissa mais arriscada

O plugin enxuto entrega mais rápido sem aumentar os problemas depois do deploy.

**Teste mais barato:** as duas primeiras entregas reais da Bloom feitas com a 8.0 são comparadas com as
anteriores em três medidas: dias entre o pedido e a produção, problemas encontrados depois do deploy, e
se o usuário consegue explicar o que foi feito. Se piorar, volta-se para a v7.9.0.

## Cenários de aceite

- **Dado** um projeto com CLAUDE.md próprio, **quando** o plugin é instalado, **então** o CLAUDE.md continua lá, com o mesmo texto.
- **Dado** um pedido de feature com pagamento, **quando** o trabalho começa, **então** o Claude apresenta os cenários de risco em português e só escreve código depois da aprovação.
- **Dado** uma decisão de system design, **quando** o usuário pede ajuda, **então** recebe as perguntas que só ele pode responder, duas ou três opções com prós e contras e uma recomendação, e a escolha fica registrada.
- **Dado** uma sessão nova, **então** o aviso do plugin tem no máximo seis linhas.
- **Dado** um comando automático do plugin, **quando** a suíte roda, **então** um teste executa o comando de verdade e falha se ele não fizer nada.
- **Dado** que a 8.0 não agradou, **quando** o usuário segue as instruções do release v7.9.0, **então** volta para a versão anterior sem perder nada.

## Como saber que ficou pronto

Todos os cenários acima passam, a suíte está verde e uma entrega real da Bloom foi feita com a 8.0.

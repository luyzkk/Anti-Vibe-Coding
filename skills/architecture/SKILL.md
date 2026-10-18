---
name: architecture
description: "Roteiro de decisão de arquitetura: faz até 3 perguntas que só o usuário sabe, mostra 2 ou 3 opções com prós, contras e custo, recomenda e registra a escolha. Use ao decidir monólito vs microsserviços, CQRS e event sourcing, REST vs GraphQL, escolha de tecnologia (stack), quanto de SOLID aplicar, injeção de dependência, princípios de design (Lei de Demeter, composição vs herança) e os defaults de segurança do design (onde a autorização mora, segredos, dado em repouso, isolamento de cliente)."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch, AskUserQuestion
argument-hint: "[decisão de arquitetura: monólito, API, stack, DI...]"
---

<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-02 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G1 do plano: bloco verbatim do Plano 01 fase-04 (security wire). Path fixo .claude/knowledge/INDEX.md (D11).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.

import { getStackKnowledgePreface } from '../security/lib/stack-aware-preface'

const stackKnowledgePreface = getStackKnowledgePreface(process.cwd())
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta. Se vazio, ignore — a skill segue sem mudança (CA-09).
<!-- stack-aware-preface:end -->

# Arquitetura — Roteiro de Decisão

Decidir como o sistema é organizado por dentro. A skill **conduz a decisão**: pergunta o que só o usuário sabe (tamanho do time, prazo, o que o negócio exige), mostra as opções com prós e contras em português simples e registra a escolha. O papel é orientar a decisão, não gerar código; para implementar depois, direcione para `/anti-vibe-coding:tdd-workflow`.

## Como Operar

1. **Diga a decisão em uma frase**, sem jargão: "Vamos decidir se o app fica numa aplicação só ou se divide em serviços."
2. **Leia o projeto antes de perguntar** (`Read`, `Grep`): estrutura de pastas, quantos módulos, o que já existe. Depois **faça até 3 perguntas numa tela só** (`AskUserQuestion`, uma pergunta por item), só do que o usuário sabe: tamanho do time, prazo, o que o negócio exige, o que já deu problema.
3. **Mostre 2 ou 3 opções**, cada uma com: o que é (uma linha), prós, contras, custo (de construir e de manter) e quando seria a escolha errada. Não invente uma terceira só para fechar número.
4. **Recomende uma**, ligando a recomendação às respostas dele: "Recomendo o monólito modular porque o time tem 3 pessoas e o domínio ainda está mudando."
5. **Se o usuário não souber responder**, use o padrão de um sênior para aquela decisão (catálogo abaixo) e diga qual usou e o que mudaria a resposta.
6. **Registre a escolha** (seção Registro) e só então encerre.

Antes de qualquer recomendação, **questione a premissa**: "isso realmente precisa existir?" vem antes de "como implementar". Pedido de explicação completa ou de aprofundamento ("me explica de verdade", "quero o texto completo"): leia `references/guia-completo.md`, e o arquivo do tópico quando houver. Esse texto longo só é lido quando o usuário pedir; o roteiro não depende dele.

## Catálogo de decisões

Cada bloco diz o que perguntar, as opções, o padrão de um sênior e quando ele erra. Use o bloco da decisão em discussão; não percorra todos.

### Monólito ou microsserviços
- **Perguntas:** (1) Quantas pessoas mexem no código, e elas se atrapalham? (2) Alguma parte precisa crescer ou ser publicada sozinha, e você mediu isso? (3) Já existe monitoramento que acompanha várias partes ao mesmo tempo?
- **Opções:** A) Monólito: uma aplicação só. B) Monólito modular: módulos com fronteiras claras, um deploy só. C) Microsserviços: extrair só a parte que precisa.
- **Padrão:** monólito (modular) até existir resposta concreta para "por que fazer chamada de rede em vez de chamada de função?". Time pequeno (menos de 10), domínio ainda sendo descoberto ou MVP: monólito. Antes de migrar, tente balanceador, bibliotecas compartilhadas e módulos internos. Quando precisar mesmo, extraia só o serviço que precisa escalar sozinho.
- **Errada quando:** microsserviços sem monitoramento distribuído pronto; "tudo precisa escalar" sem medição.
- **Referência:** `references/monolith-vs-microservices.md`

### Histórico completo de mudanças (CQRS e Event Sourcing)
- **Perguntas:** (1) A lei ou o negócio exige saber como se chegou a cada estado (financeiro, saúde, auditoria)? (2) Alguém precisa reconstruir o que aconteceu no passado? (3) Ler e gravar têm necessidades muito diferentes?
- **Opções:** A) CRUD simples. B) CQRS sem event sourcing: modelos separados de leitura e de gravação. C) Event sourcing: guardar cada evento como fonte da verdade.
- **Padrão:** A, salvo exigência de auditoria. É decisão de domínio, não técnica: "meu negócio precisa do histórico?". Se sim, eventos são imutáveis, e reversão é um novo evento que compensa o anterior.
- **Errada quando:** event sourcing sem exigência de histórico (complexidade sem retorno); tela que precisa mostrar o dado na hora sobre leitura que atrasa alguns milissegundos.
- **Referência:** `references/cqrs-event-sourcing.md`

### API — REST ou GraphQL
- **Perguntas:** (1) Quantos front-ends consomem a API (site, app, parceiros)? (2) O time já usou GraphQL em produção? (3) Alguma tela junta muitos dados de uma vez?
- **Opções:** A) REST, com endpoints especializados quando preciso. B) REST mais um BFF (um backend sob medida por front-end). C) GraphQL, ou híbrido: REST na maioria e GraphQL só nas telas complexas.
- **Padrão:** REST para 1 ou 2 front-ends. GraphQL só com 3 ou mais e com time que já conhece. O híbrido é válido: não é tudo ou nada.
- **Errada quando:** GraphQL sem experiência no time (cache, monitoramento e upload de arquivo viram problema); GraphQL "porque é moderno".
- **Referência:** `references/api-architecture.md` (e `/anti-vibe-coding:api-design` para o desenho dos endpoints)

### Escolha de tecnologia (stack)
- **Perguntas:** (1) Que problema exato isso resolve, e em que volume (ex.: quantas mensagens por segundo)? (2) Quem do time já sabe usar? (3) Há prazo para validar a ideia?
- **Opções:** A) A tecnologia madura e "chata" que o time já domina. B) A nova, depois de um protótipo curto que valide o risco técnico. C) Adiar a escolha até o problema ficar claro.
- **Padrão:** o processo: definir o escopo, achar o núcleo, pesquisar opções maduras, fazer um protótipo (PoC) do que for arriscado, registrar a decisão (ADR). Maturidade vale mais que modernidade: ecossistema maduro tem mais bibliotecas, respostas e candidatos.
- **Errada quando:** "todo mundo usa", "é novo" ou "é o que eu conheço" sem avaliar alternativas; tecnologia crítica adotada sem protótipo; decisão grande sem registro.
- **Referência:** `references/api-architecture.md` (seção Stack Selection)

### Quanto de SOLID aplicar
- **Perguntas:** (1) É protótipo ou MVP, ou está crescendo em produção? (2) Cada feature nova obriga a mexer em `if/else` antigo? (3) Mais de uma pessoa mexe no mesmo módulo?
- **Opções:** A) Só SRP e LSP (MVP). B) Os cinco, com pragmatismo (produção). C) Nenhum rigor (script de uso único).
- **Padrão:** SOLID são alvos, não regras absolutas. Liskov sempre (é a única que é lei). Aberto/Fechado quando o `switch` cresce a cada feature. Responsabilidade única quando a classe faz coisas demais no sentido do domínio. Inversão de dependência nas fronteiras (infraestrutura contra domínio). Segregação de interface em bibliotecas e APIs públicas.
- **Errada quando:** aplicar os cinco num MVP (boilerplate sem retorno); fragmentar interface a ponto de ninguém achar nada.
- **Referência:** `references/solid-principles.md`

### Injeção de dependência
- **Perguntas:** (1) A classe depende de algo de fora (pagamento, e-mail, armazenamento, banco)? (2) Ela precisa ser testada sem chamar o serviço real? (3) O fornecedor pode mudar (trocar de gateway)?
- **Opções:** A) Criar direto (`new`). B) Injeção pelo construtor, com interface na fronteira. C) Container de injeção.
- **Padrão:** B nas fronteiras arquiteturais (pagamento, e-mail, armazenamento, cache, autenticação); não em utilitários nem em funções puras. Container só com 50 ou mais classes com dependências, ou quando o framework já traz (NestJS, Spring, Angular). Teste da fronteira: um adaptador é fronteira hipotética, dois é real ([deep-modules](../tdd-workflow/references/deep-modules.md)). No banco, guarde o id do domínio, não o do fornecedor (o id do produto da Stripe).
- **Errada quando:** Service Locator (dependência escondida); interface para função pura com uma implementação só; injeção circular (sinal de responsabilidade mal dividida).
- **Referência:** `references/dependency-injection.md`

### Princípios de design — acoplamento e herança
- **Perguntas:** (1) O código está difícil de mudar porque uma coisa conhece demais da outra? (2) Há hierarquia de classes com mais de 2 níveis? (3) Há passos que precisam ser chamados numa ordem exata (iniciar, validar, executar)?
- **Opções:** A) Deixar como está. B) Aplicar Lei de Demeter e Tell-Don't-Ask onde dói. C) Trocar herança por composição.
- **Padrão:** `order.shippingZip()` em vez de `order.customer.address.zip` (Demeter); `account.withdraw(amount)` em vez de conferir o saldo por fora (Tell-Don't-Ask); composição sobre herança; esconder a sequência dentro de um método (`processor.run()`).
- **Errada quando:** refatorar o que não dói; encadear getters; esquecer que a ordem das chamadas é regra do domínio e não de quem chama.
- **Referência:** `references/design-principles.md`

### Defaults de segurança — onde a autorização mora
- **Perguntas:** (1) Cada usuário (ou empresa) enxerga só o que é seu, ou todo mundo logado vê tudo? (2) Existe mais de um cliente, empresa ou turma usando o mesmo banco? (3) Quem pode chamar o banco diretamente, além do seu servidor?
- **Opções:** A) A checagem de "pode?" repetida em cada rota. B) Uma camada única (middleware, policy ou repositório) que nega quando nenhuma regra casa. C) No próprio banco (RLS).
- **Padrão:** negar por padrão, checagem no servidor, por recurso (dono e papel), nunca "todo logado vê tudo". A fronteira do cliente fica na camada mais baixa possível (RLS ou filtro no repositório), em vez de repetida em cada handler. B ou C.
- **Errada quando:** A (um handler novo vai esquecer, é questão de tempo); camada única que permite quando nenhuma regra casa (é o mesmo buraco com menos linhas); RLS desligado na prática porque os serviços internos usam a conexão `service_role` ou de superusuário em operação de usuário final.
- **Custo de adiar:** cada endpoint novo herda o buraco, e o conserto depois toca toda rota existente.
- **Referência:** `/anti-vibe-coding:security`

### Defaults de segurança — segredos e dado em repouso
- **Perguntas:** (1) Que chaves e senhas o sistema usa, e onde elas ficam hoje (repositório, banco, ambiente)? (2) Que dados pessoais ou financeiros ele guarda? (3) Algum desses dados é credencial de outra pessoa (senha, token)?
- **Opções:** A) Segredo no código ou no banco "por enquanto". B) Segredo no ambiente (variável de ambiente injetada na execução). C) Gerenciador de segredos (secret manager) com rotação.
- **Padrão:** B ou C, sempre fora do repositório e fora do banco. Classificar o dado antes de modelar (público, interno, PII, credencial, financeiro). Credencial é hasheada (bcrypt ou Argon2), nunca encriptada.
- **Errada quando:** segredo no código (vaza no histórico do git, e histórico não se apaga: só se rotaciona a chave); credencial encriptada em vez de hasheada; classificar o dado depois de modelar (migração de coluna com dado já em produção).
- **Custo de adiar:** migração de coluna com dado em produção, e chave que já vazou.
- **Referência:** `/anti-vibe-coding:security`

## Registro

Depois que o usuário escolher, registre numa destas duas:

- **Há uma feature em andamento** (`docs/exec-plans/active/<pasta>/DESIGN.md`; se houver mais de uma, pergunte qual): escolha entre opções vira linha da tabela `## Decisões` — `| N | decisão | opções | escolha | por quê |`. Nos defaults de segurança, default **aceito** vira linha de `## Ameaças & Dados`; default **recusado** vira linha de `## Decisões`, com a razão e a alternativa. Escreva o "por quê" com as respostas do usuário.
- **A decisão vale para o projeto inteiro** (monólito ou serviços, stack, estilo de API) **ou não há feature em andamento:** crie um ADR com `/anti-vibe-coding:decision-registry`, que guarda o contexto, a decisão, as alternativas e as consequências.

Segurança recusada sem registro não é trade-off, é esquecimento com aparência de decisão. Para profundidade em OWASP, autenticação, autorização e criptografia: `/anti-vibe-coding:security`.

## Regras do consultor

1. Nunca recomende sem contexto: pergunte escopo, time e domínio antes.
2. Questione a premissa antes de resolver: "isso realmente precisa existir?".
3. Todo trade-off é explícito: toda decisão tem custo, e o custo aparece na resposta.
4. Tecnologia chata primeiro: prove que a solução simples não funciona antes de adotar complexidade.
5. Ensine o raciocínio: o processo de chegar na resposta vale mais que a resposta.
6. Segurança é decisão de design, não revisão: autorização, segredos, dado em repouso e isolamento de cliente fecham junto com as outras decisões, e não na auditoria do fim.

$ARGUMENTS

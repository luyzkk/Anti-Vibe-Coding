---
name: design-patterns
description: "This skill should be used when the user asks about 'code smells', 'code quality', 'Result Pattern', 'error handling patterns', 'structured logging', 'domain types', 'JavaScript internals', 'closures', 'event loop', 'race conditions', 'design patterns', 'GoF', 'Observer pattern', 'Factory pattern', 'Singleton', 'Decorator', 'Strategy pattern', 'Adapter', or requests a code quality analysis. Provides expert consultation on 28 code quality concepts covering code smells, error handling, logging, domain modeling, GoF design patterns, and JavaScript/TypeScript advanced patterns."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[code quality issue or pattern to analyze]"
---

# Design Patterns & Code Quality

Consultor senior de qualidade de codigo. O papel e ENSINAR conceitos, identificar problemas e guiar solucoes. NAO gerar codigo pronto -- explicar o principio e mostrar o caminho.

Ao receber um pedido de ajuda, identificar qual dos 22 conceitos abaixo se aplica, explicar o problema e mostrar a direcao correta.

---

## 1. Os 9 Code Smells

> Referencia completa: `references/code-smells.md`

### 1.1 Funcoes Longas (> 100 linhas)
Funcao com mais de 100 linhas esta fazendo coisas demais. **Extrair cada bloco logico em funcoes menores** com nomes descritivos. Se existem comentarios separando "secoes", cada secao deveria ser uma funcao propria. Usar `Grep` para encontrar funcoes longas no codebase.

### 1.2 God Objects
Classe que faz tudo: valida, calcula, salva, envia email, gera relatorio. **Usar composicao + servicos separados.** O "gerenciador" orquestra, nao executa. Indicadores: mais de 10 metodos publicos, depende de mais de 5 modulos, mudancas em qualquer parte do sistema exigem mexer nessa classe.

### 1.3 Violacao DRY (Regra de 3)
Duplicar em 2 lugares pode ser aceitavel. **Abstrair na TERCEIRA ocorrencia.** Abstrair cedo demais cria acoplamento desnecessario. Usar `Grep` para buscar padroes de codigo repetidos.

### 1.4 Condicionais Gigantes
Cadeias de if-elif-else com 5+ ramos. **Substituir por HashMap/dicionario** mapeando tipo -> acao, ou polimorfismo. Cada tipo sabe executar sua propria logica:
```
acoes = { "A": fazer_a, "B": fazer_b }
acoes[tipo]()
```

### 1.5 Numeros Magicos
Valores literais sem explicacao no meio de condicoes e calculos. **Extrair para constantes nomeadas do dominio:** `MAX_TENTATIVAS_LOGIN = 3`, `DESCONTO_BLACK_FRIDAY = 0.85`. Se alguem novo no time nao saberia o significado, e numero magico.

### 1.6 Feature Envy
Metodo que acessa 3+ atributos de outro objeto. **Mover a logica para a classe dona dos dados.** `funcionario.calcularBonus()` em vez de `relatorio.calcularBonus(funcionario)`. Quem tem os dados faz o calculo.

### 1.7 Grupos de Dados (Data Clumps)
Variaveis que SEMPRE aparecem juntas (lat/lng, inicio/fim, nome/email/telefone). **Criar data class / struct** agrupando-as. Indicador: mesmos 3+ parametros aparecem juntos em multiplas funcoes.

### 1.8 Comentarios Inuteis
Comentarios que repetem o que o codigo diz. **Comentar o PORQUE, nunca o COMO.** Teste: deletar o comentario -- se o codigo continua claro, era inutil. Comentarios bons: `// Limite de 30 dias exigido pela LGPD`.

### 1.9 Obsessao por Tipos Primitivos
Usar `string` para email, CPF, dinheiro -- sem validacao, sem garantia. **Criar tipos de dominio com validacao embutida na construcao** (ver secao 4). Indicador: validacao do mesmo campo espalhada em 5 lugares.

---

## 2. Result Pattern vs Try/Catch

> Referencia completa: `references/error-handling.md`

Try/catch funciona como Go To -- interrompe o fluxo e pula para outro lugar. O Result Pattern forca o chamador a lidar com o erro EXPLICITAMENTE.

**Regras fundamentais:**

1. **Retornar `(error, value)`** em vez de lancar excecoes
2. **Chamador OBRIGADO a verificar** o erro antes de usar o valor
3. **Confinar try/catch** a funcao utilitaria que PODE falhar (I/O, rede), convertendo para Result internamente
4. **NUNCA engolir erros desconhecidos** -- relancar sempre. So capturar erros que SABE tratar
5. **Custom Errors** para cada tipo de falha, com dados relevantes para debug

```
(erro, usuario) = buscarUsuario(123)
se erro:
    lidarComErro(erro)
    retornar
// continuar com usuario garantidamente existente
```

**Anti-pattern tipico:** bloco `catch` que so faz `console.log("deu ruim")` -- engole o erro, ninguem sabe o que aconteceu.

**Verificacao:** Usar `Grep` para encontrar blocos catch com apenas `console.log` ou `console.error`. Buscar `catch` seguido de bloco vazio.

---

## 3. Structured Logging (Wide Events)

> Referencia completa: `references/structured-logging.md`

Logging tradicional espalha N `console.log` por request. Structured Logging emite UM evento rico por request com todos os dados necessarios para debug e monitoring.

**Regras fundamentais:**

1. **Canonical Log Lines:** um evento por request contendo request_id, user_id, rota, status, latencia, dados de negocio, erro
2. **Middleware inicializa**, handlers enriquecem progressivamente, middleware emite no final
3. **`console.log` e SINCRONO no Node.js** -- bloqueia o event loop. 100 logs/request = 18x reducao de throughput
4. **Usar loggers assincronos** (Pino: 5x mais rapido que Winston, 10x mais que console.log) em producao
5. **NUNCA `console.log` em producao** com carga real -- reservar para desenvolvimento local

```
// Middleware emite UM evento no final
request.log = { request_id: gerarId(), inicio: agora() }
// ... handlers enriquecem: request.log.user_id, request.log.items ...
logger.info(request.log)  // UM evento com TUDO
```

**Verificacao:** Contar `console.log` em arquivos de producao (excluir testes). Verificar se existe middleware de logging centralizado. Buscar por `request_id` sendo propagado.

---

## 4. Tipos de Dominio

> Referencia completa: `references/domain-types.md`

Valores do dominio (email, CPF, dinheiro) NAO devem ser strings/numbers soltos. Criar tipos com validacao embutida na construcao. Se o objeto existe, ele e VALIDO -- impossivel ter estado invalido.

**Fluxo de vida do tipo:**

1. **ENTRADA (fronteira):** `email = novo Email(request.body.email)` -- valida e normaliza
2. **DENTRO do sistema:** todo codigo trabalha com `Email`, nao `string` -- impossivel passar invalido
3. **SAIDA (API/banco):** `apiExterna.enviar({ email: usuario.email.valor })` -- extrai primitivo

**Tipos criticos que DEVEM ter classes proprias:**
- **Dinheiro:** NUNCA float (`0.1 + 0.2 !== 0.3`). Usar inteiros (centavos) ou lib de precisao
- **Email:** validacao de formato + lowercase + trim
- **CPF/CNPJ:** validacao de digitos verificadores (regex simples NAO basta)
- **Telefone, CEP, UUID/ID:** formato + validacao especifica

**Verificacao:** Usar `Grep` para buscar `email: string` em interfaces. Buscar `parseFloat` ou aritmetica com valores monetarios.

---

## 5. JavaScript/TypeScript Avancado

> Referencia completa: `references/javascript-patterns.md`

### 5.1 Hoisting
`var` sofre hoisting (declaracao sobe pro topo do escopo), criando bugs sutis. `console.log(x)` com `var x = 10` retorna `undefined` em vez de erro. **Hierarquia: `const` > `let` >> NUNCA `var`.** Usar `Grep` para buscar `var ` e migrar todas as ocorrencias.

### 5.2 Closures e Memoria
Closures capturam variaveis do escopo externo. **Extrair o minimo necessario ANTES de criar a closure** -- evitar segurar objetos grandes. Usar WeakMap para caches que permitem garbage collection. Em React: sempre cleanup em useEffect para evitar closures stale.

### 5.3 Event Loop
Fila de prioridades: Call Stack (sincrono) -> Microtask Queue (Promises) -> Macrotask Queue (setTimeout, I/O). **Microtasks SEMPRE executam antes de macrotasks.** `Promise.resolve().then(...)` roda antes de `setTimeout(..., 0)`. Cuidado: microtasks em loop podem starvar macrotasks.

### 5.4 Promises
SEMPRE ter `.catch()` ou `try/catch` com `await`. **Usar `Promise.all()` para operacoes independentes** (nao await sequencial -- desperdicar tempo). Usar `Promise.allSettled()` quando precisa resultados de TODAS, mesmo com falhas. NUNCA misturar callbacks com Promises.

### 5.5 Garbage Collection
GC usa mark-and-sweep -- objetos sem referencia sao coletados. **Fontes de leak:** closures segurando objetos grandes, `addEventListener` sem `removeEventListener`, `setInterval` sem `clearInterval`, variaveis globais acumulando dados, `useEffect` sem funcao de cleanup.

### 5.6 Recursao vs Iteracao
JavaScript NAO tem Tail Call Optimization na pratica (apenas Safari/JSC). Recursao profunda causa stack overflow. **Usar loops para iteracoes potencialmente longas.** Reservar recursao para arvores e estruturas com profundidade conhecida e limitada (< 1000 frames).

### 5.7 Map, Filter, Reduce
- **map:** transforma cada item (1:1) -- N entra, N sai
- **filter:** seleciona items por teste -- N entra, 0..N sai
- **reduce:** agrega em um valor -- N entra, 1 sai

**Preferir encadeamento legivel** (`.filter().map().sort()`) sobre forEach com push manual. Usar reduce apenas para agregacao real (soma, contagem).

---

## 6. Race Conditions

> Referencia completa: `references/race-conditions.md`

Node.js e single-threaded, MAS nao e imune a race conditions. Cluster mode, horizontal scaling e operacoes async concorrentes causam interleaving.

**5 solucoes por complexidade crescente:**

| Solucao | Quando usar | Limitacao |
|---------|-------------|-----------|
| Async/Await sequencial | Single instance, simples | Nao escala horizontalmente |
| Atomic Update | Banco suporta operacao atomica | Nao serve para regras complexas |
| Mutex | Logica complexa, single instance | Fraco em ambiente distribuido |
| Ledger Pattern | Financeiro, auditoria | Maior complexidade |
| Lock no Banco (FOR UPDATE) | Distribuido, multiplas instancias | Impacto em performance |

**Regra fundamental:** a regra de NEGOCIO determina a solucao tecnica.

**Verificacao:** Buscar padroes read-then-write. Verificar se operacoes financeiras usam transacoes. Buscar `Promise.all` em operacoes que modificam o MESMO recurso.

---

## 7. GoF Design Patterns

> **Referencia completa:** `references/gof-patterns.md`

Os 6 patterns mais utilizados na pratica, dos 23 originais do livro "Gang of Four" (1994). **Regra de ouro:** patterns existem para resolver problemas reais. Se o problema nao existe, o pattern tambem nao precisa ser usado.

### Resumo dos 6 Patterns

| Pattern | Problema que resolve | Exemplo no mundo real | Quando usar |
|---------|---------------------|----------------------|-------------|
| **Observer** | Multiplos modulos reagem ao mesmo evento sem se conhecerem | `addEventListener`, `EventEmitter`, `useEffect` | Eventos desacoplados entre modulos |
| **Factory** | Logica de criacao espalhada pelo codigo, switch/if por tipo | `React.createElement`, `document.createElement` | Criacao condicional de objetos por tipo |
| **Singleton** | Recurso que DEVE ter exatamente uma instancia (DB pool, config) | `PrismaClient`, logger, connection pool | Recursos genuinamente unicos |
| **Decorator** | Adicionar comportamento sem modificar o objeto original | Middleware (Express), interceptors (NestJS), HOCs (React) | Composicao flexivel de comportamentos |
| **Strategy** | Algoritmo que varia por contexto — evitar cadeia de if/else | `Array.sort()`, Passport.js, payment processors | Comportamento intercambiavel em runtime |
| **Adapter** | Interfaces incompativeis precisam trabalhar juntas | ORMs (Prisma, TypeORM), Axios → Fetch, API wrappers | Traduzir formato externo para interno |

### Arvore de Decisao

```
Qual problema estou resolvendo?
  Multiplos modulos precisam reagir ao mesmo evento?
    → Observer
  Logica de criacao condicional (switch/if por tipo)?
    → Factory
  Recurso que precisa ser unico (DB, config, logger)?
    → Singleton (ou IoC container do framework)
  Adicionar comportamento sem modificar o original?
    → Decorator
  Algoritmo que varia por contexto?
    → Strategy
  Integrar interfaces incompativeis?
    → Adapter
  Nenhum dos acima?
    → Provavelmente nao precisa de pattern
```

### Anti-Patterns por Pattern

| Pattern | Anti-Pattern | Problema |
|---------|-------------|---------|
| Observer | Event soup | Dezenas de eventos sem documentacao — fluxo invisivel |
| Observer | Sem cleanup | `addEventListener` sem `removeEventListener` = memory leak |
| Factory | Factory para um tipo | Se so existe UMA implementacao, Factory e overengineering |
| Singleton | Variavel global elegante | Singleton para compartilhar estado mutavel = bugs |
| Singleton | Dificultando testes | Estado persistente entre testes causa flakiness |
| Decorator | Stack profundo | 10+ decorators empilhados — debug impossivel |
| Strategy | Strategy com um algoritmo | Se nunca vai mudar, YAGNI |
| Adapter | Adapter que faz logica | Adapter so TRADUZ formato, nao valida ou processa |

### Principio Central

> Patterns podem se combinar: Factory + Singleton (DB pool), Observer + Strategy (notificacao customizada), Adapter + Factory (adapter correto por API). Entender O PROBLEMA antes de aplicar O PATTERN.

---

## Modo de Operacao

Ao receber pedido de ajuda com qualidade de codigo:

1. **Identificar** qual dos 28 conceitos se aplica
2. **Explicar** o problema usando o anti-pattern como exemplo
3. **Mostrar** a direcao correta com pseudocodigo
4. **Sugerir** como verificar no codebase real usando `Grep` e `Glob`
5. **NAO gerar codigo pronto** -- ensinar o principio para o dev aplicar

Ao receber pedido de analise de arquivo especifico:
1. Usar `Read` para ler o arquivo
2. Identificar code smells e problemas
3. Listar cada problema com referencia a secao relevante deste guia
4. Sugerir a direcao de refatoracao (sem escrever o codigo)

Para detalhes completos de cada conceito, consultar os arquivos em `references/`.

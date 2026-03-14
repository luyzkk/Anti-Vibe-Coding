# Structured Logging (Wide Events)

Referencia detalhada para logging estruturado e Canonical Log Lines.

---

## Conceito

Logging tradicional espalha 17 console.logs por request. Structured Logging emite UM evento rico por request com todos os dados necessarios para debug e monitoring.

---

## Anti-pattern: Console.log espalhado

```
console.log("inicio request")
console.log("usuario:", userId)
console.log("buscando dados...")
console.log("dados encontrados:", dados)
console.log("processando...")
console.log("erro no passo 3:", err)
console.log("fim request")
// 7 linhas para UMA request. Em producao com 1000 req/s = caos
```

Problemas:
- Impossivel correlacionar logs de uma mesma request
- Volume de logs explode em producao
- Sem estrutura para queries/alertas
- Performance degradada (console.log e sincrono)

---

## Canonical Log Lines

Um evento por request contendo TUDO que importa:

```
{
    request_id: "abc-123",
    user_id: "usr-456",
    metodo: "POST",
    rota: "/api/pedidos",
    status: 201,
    latencia_ms: 142,
    items_pedido: 3,
    valor_total: 299.90,
    erro: nulo
}
```

Beneficios:
- UM evento = UMA request. Correlacao trivial
- Estruturado para queries: "mostre requests com latencia > 500ms"
- Volume controlado: 1 log por request, nao 17
- Dados de negocio incluidos (items, valor)

---

## Arquitetura de Logging

### 1. Middleware inicializa o evento

```
middleware(request, response, proximo):
    request.log = { request_id: gerarId(), inicio: agora() }
    proximo()
    request.log.latencia = agora() - request.log.inicio
    request.log.status = response.statusCode
    logger.info(request.log)  // UM evento emitido
```

O middleware cria o objeto de log no inicio, e emite no final. Tudo entre esses pontos enriquece o mesmo objeto.

### 2. Handlers enriquecem progressivamente

```
funcao criarPedido(request):
    request.log.user_id = request.usuario.id
    // ... processar ...
    request.log.items = pedido.items.length
    request.log.valor = pedido.total
```

Cada handler adiciona dados relevantes ao evento. Nao emite logs proprios -- apenas enriquece.

### 3. Servicos adicionam contexto

```
funcao processarPagamento(request, pedido):
    request.log.gateway = "stripe"
    request.log.payment_intent = intent.id
    // ... processar ...
    request.log.pagamento_status = resultado.status
```

---

## ALERTA: Console.log e SINCRONO

`console.log` e uma operacao SINCRONA no Node.js:
- Bloqueia o event loop enquanto escreve no stdout
- Impacto medido: 100 console.logs por request = **18x reducao de throughput**
- Em producao com carga real, console.log se torna gargalo

### Solucao: Loggers ASSINCRONOS

**Pino** -- logger mais rapido para Node.js:
- Usa streams para escrita assincrona em buffer
- Serializa para JSON nativamente
- 5x mais rapido que Winston, 10x mais que console.log

**Node Streams** -- escrita assincrona em buffer:
- Desacopla a geracao do log da escrita em disco/rede
- Buffer absorve picos de carga

**Regra absoluta:** NUNCA usar `console.log` em producao com carga real. Reservar para desenvolvimento local apenas.

---

## Verificacao no codebase

- **Contar console.logs:** Usar `Grep` em arquivos de producao (excluir testes, scripts)
- **Middleware centralizado:** Verificar se existe middleware de logging
- **Request ID:** Buscar por `request_id` sendo propagado entre servicos
- **Logger estruturado:** Verificar se Pino, Winston ou similar esta configurado

### Padroes de busca sugeridos:
```
Grep: console\.(log|warn|error) -- em arquivos de producao
Grep: request_id
Grep: pino|winston|bunyan -- verificar se logger estruturado existe
```

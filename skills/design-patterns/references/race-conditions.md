# Race Conditions

Referencia detalhada para identificacao e solucao de race conditions em Node.js.

---

## Conceito

Node.js e single-threaded, MAS nao e imune a race conditions. Qualquer operacao async pode causar interleaving:
- **Cluster mode:** multiplos processos compartilhando porta
- **Horizontal scaling:** multiplas instancias acessando mesmo banco
- **Operacoes async concorrentes:** no mesmo processo, requests simultaneos

---

## Exemplo classico: Read-Then-Write

```
// Dois requests simultaneos para mesmo usuario
saldo = await buscarSaldo(userId)    // Request A: le 100
saldo = await buscarSaldo(userId)    // Request B: le 100
await salvar(userId, saldo - 50)     // Request A: salva 50
await salvar(userId, saldo - 50)     // Request B: salva 50
// Saldo final: 50 (deveria ser 0!)
```

O problema: entre o READ e o WRITE, outro processo pode alterar o valor. A leitura fica "stale".

---

## 5 Solucoes por complexidade crescente

### 1. Async/Await sequencial

```
// Simples, mas nao escala horizontalmente
await fila.processar(async () => {
    saldo = await buscarSaldo(userId)
    await salvar(userId, saldo - 50)
})
```

**Quando usar:** Operacoes simples, single instance.
**Limitacao:** Nao funciona com multiplas instancias. A fila e local ao processo.

---

### 2. Atomic Update

```
// Banco faz a operacao atomicamente
await db.query("UPDATE contas SET saldo = saldo - 50 WHERE id = ?", [userId])
```

**Quando usar:** Operacoes que o banco suporta atomicamente (incrementos, decrementos simples).
**Limitacao:** Nao funciona com regras de negocio complexas (ex: "so debitar se saldo >= valor E conta nao bloqueada E limite diario nao excedido").
**Vantagem:** Simples, performatico, sem locks explicitos.

---

### 3. Mutex (Mutual Exclusion)

```
lock = await adquirirLock("saldo:" + userId)
tentar:
    saldo = await buscarSaldo(userId)
    se saldo < 50:
        lancar ErroSaldoInsuficiente()
    await salvar(userId, saldo - 50)
finalmente:
    await liberarLock(lock)
```

**Quando usar:** Logica complexa com multiplas verificacoes, single instance.
**Limitacao:** Fraco em ambiente distribuido -- o lock e local ao processo. Pode usar Redis para lock distribuido (Redlock), mas adiciona complexidade.
**Cuidado:** Sempre liberar o lock no `finally`. Deadlocks sao dificeis de debugar.

---

### 4. Ledger Pattern (para financeiro)

```
// Nunca altera saldo diretamente
// Insere transacao e calcula saldo como SUM
await inserirTransacao({ userId, tipo: "debito", valor: -50 })
saldo = await db.query("SELECT SUM(valor) FROM transacoes WHERE userId = ?")
```

**Quando usar:** Sistemas financeiros, qualquer cenario que exige auditoria.
**Vantagem:**
- Auditavel: historico completo de todas as operacoes
- Imutavel: nunca altera dados existentes, so insere
- Race-condition-proof: INSERT nao conflita com INSERT
- Reversivel: estorno e uma nova transacao positiva

**Limitacao:** Maior complexidade. Calculo de saldo requer SUM (pode ser otimizado com snapshot periodico).

---

### 5. Lock no Banco (distribuido)

```
// Inicia transacao
await db.query("BEGIN")

// Lock na linha -- outras transacoes esperam
await db.query("SELECT * FROM contas WHERE id = ? FOR UPDATE", [userId])

// Linha locked ate COMMIT
saldo = await buscarSaldo(userId)
se saldo < 50:
    await db.query("ROLLBACK")
    lancar ErroSaldoInsuficiente()

await salvar(userId, saldo - 50)
await db.query("COMMIT")
```

**Quando usar:** Ambiente distribuido, multiplas instancias, regras de negocio complexas.
**Vantagem:** Garantia forte. Funciona com qualquer numero de instancias.
**Limitacao:** Impacto em performance. Outras transacoes ficam esperando. Pode causar deadlocks se locks adquiridos em ordem diferente.

**Variantes:**
- `FOR UPDATE` -- lock exclusivo (escrita)
- `FOR SHARE` -- lock compartilhado (leitura)
- `FOR UPDATE SKIP LOCKED` -- pula linhas ja lockadas (filas de trabalho)
- `FOR UPDATE NOWAIT` -- falha imediatamente se lockado

---

## Regra fundamental

A regra de NEGOCIO determina a solucao tecnica:

| Cenario | Solucao |
|---------|---------|
| Pode perder dados? | Atomic update basta |
| Precisa de auditoria? | Ledger Pattern |
| Distribuido? | Lock no banco |
| Single instance simples? | Mutex ou sequencial |
| Financeiro? | Ledger + Lock no banco |

Nao escolher a solucao mais complexa "por garantia". Escolher a solucao adequada ao problema.

---

## Verificacao no codebase

- **Read-then-write:** Buscar padroes de ler valor, processar, salvar -- sem transacao ou lock
- **Operacoes financeiras:** Verificar se usam transacoes ou atomic updates
- **Promise.all perigoso:** Buscar `Promise.all` em operacoes que modificam o MESMO recurso
- **Falta de transacao:** Buscar multiplos `UPDATE` ou `INSERT` sequenciais sem `BEGIN/COMMIT`

### Padroes de busca sugeridos:
```
Grep: await.*buscar.*await.*salvar -- read-then-write
Grep: Promise\.all -- verificar se modifica mesmo recurso
Grep: BEGIN|COMMIT|ROLLBACK -- verificar uso de transacoes
Grep: FOR UPDATE -- verificar uso de locks
```

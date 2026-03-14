# Serverless vs Serverfull — Referencia Detalhada

## Definicoes

### Serverfull
Maquina dedicada (VPS, EC2, VM) que fica disponivel 24/7. Controle total sobre OS, CPU, memoria, disco. Aplicacao fica carregada em memoria permanentemente.

### Serverless
Bloco de codigo (funcao) enviado ao cloud provider. Infraestrutura provisionada APENAS quando a funcao e invocada. Sem maquina dedicada.

## Comparativo

| Aspecto | Serverfull | Serverless |
|---------|-----------|------------|
| Controle | Total (OS, CPU, memoria) | Apenas runtime e codigo |
| Disponibilidade | 24/7 (sempre ligado) | Sob demanda (invocado) |
| Cold Start | Zero (app em memoria) | Sim (provisiona infra) |
| Connection Pool | Persistente em memoria | Problematico (nova conexao por invocacao) |
| Cache em memoria | Sim (persistente) | Nao (efemero) |
| Cobranca | Por uptime (mesmo sem uso) | Por invocacao (zero se nao usar) |
| Escala | Manual (mais servidores) | Automatica (provider escala) |
| Complexidade ops | Alta (gerenciar servidor) | Baixa (provider gerencia) |
| Latencia | Consistente (app quente) | Variavel (cold start) |
| Max execution | Ilimitado | Limitado (15min AWS Lambda) |

## Decision Tree: Qual Escolher

```
Aplicacao precisa estar sempre disponivel com latencia consistente?
├─ SIM → Serverfull (VPS/EC2)
├─ NAO
│   ├─ Carga e variavel/esporadica?
│   │   ├─ SIM → Serverless ✓ (paga so quando usa)
│   │   ├─ NAO (carga constante) → Serverfull (mais economico)
│   ├─ Execucao longa (>15min)?
│   │   ├─ SIM → Serverfull (Lambda tem limite)
│   │   ├─ NAO
│   │   │   ├─ Precisa de connection pool persistente?
│   │   │   │   ├─ SIM → Serverfull (ou serverless + connection pooler)
│   │   │   │   ├─ NAO → Serverless ✓
│   │   │   ├─ Event-driven (webhook, S3, cron)?
│   │   │   │   ├─ SIM → Serverless ✓ (caso de uso ideal)
│   │   │   │   ├─ NAO → Depende do custo e complexidade
```

## Cold Start — Problema e Mitigacao

### O que e
Primeira invocacao apos periodo de inatividade. Provider precisa:
1. Provisionar maquina
2. Instalar OS
3. Configurar runtime (Node.js, Java, etc.)
4. Carregar codigo
5. Executar handler

### Impacto por runtime

| Runtime | Cold Start tipico |
|---------|-------------------|
| Node.js | ~100-500ms |
| Python | ~100-500ms |
| Go | ~50-200ms |
| Java | ~1-5 segundos |
| .NET | ~500ms-2s |

### Mitigacao
- **Provisioned Concurrency (AWS):** Manter N instancias sempre quentes. Custo fixo
- **Warm-up pings:** Invocar periodicamente para evitar cold start
- **Runtime leve:** Node.js/Python > Java para cold start
- **Minimizar dependencias:** Menos codigo = cold start mais rapido
- **SnapStart (Java):** Snapshot da JVM ja inicializada

## Connection Pool em Serverless

**Problema:** Cada invocacao pode criar nova conexao ao DB. 1000 invocacoes simultaneas = 1000 conexoes abertas → DB sobrecarregado.

**Solucao:** Connection pooler externo:
- **AWS RDS Proxy:** Gerencia pool de conexoes entre Lambda e banco
- **PgBouncer:** Connection pooler para PostgreSQL
- **Supabase/Neon:** Managed PostgreSQL com connection pooling built-in

## Casos de Uso Ideais

### Serverless ✓
- Webhooks (Stripe, GitHub, Pagar.me)
- Processamento de eventos (S3 upload → resize imagem)
- Cron jobs leves (daily report, cleanup)
- APIs com carga variavel/esporadica
- Prototipos e MVPs (custo zero quando nao usa)

### Serverfull ✓
- APIs com trafego constante e alto
- WebSockets / conexoes persistentes
- Aplicacoes com state em memoria
- Processamento longo (>15min)
- Aplicacoes que precisam de latencia consistente

## Modelo de Custo

### Serverfull
```
Custo = preco_instancia × horas_ligada
Ex: EC2 t3.medium = ~$30/mes (24/7)
```

### Serverless
```
Custo = (invocacoes × preco_por_invocacao) + (duracao × memoria × preco_por_ms)
Ex: Lambda 1M invocacoes/mes, 128MB, 200ms cada = ~$3.50/mes
```

**Break-even:** Serverless e mais barato ate ~X milhoes de invocacoes/mes (depende da configuracao). Acima disso, serverfull pode ser mais economico.

## Providers

| Provider | Serverfull | Serverless |
|----------|-----------|------------|
| AWS | EC2 | Lambda |
| GCP | Compute Engine | Cloud Functions |
| Azure | Virtual Machines | Azure Functions |
| DigitalOcean | Droplets | Functions |
| Vercel | - | Edge Functions |
| Cloudflare | - | Workers |

## Anti-patterns

- **Serverless para API de alta carga constante** — mais caro que serverfull
- **Serverfull para webhook handler** — servidor 24/7 para receber eventos esporadicos
- **Lambda com Java sem SnapStart** — cold start de 5+ segundos
- **Lambda com conexao direta ao DB** — sem connection pooler = DB sobrecarregado
- **Ignorar cold start em APIs de baixa latencia** — usuario percebe delay na primeira request
- **Serverless para WebSockets** — funcoes sao efemeras, conexoes persistentes nao funcionam bem

# Deployment Patterns — Referencia Completa

Guia aprofundado sobre PM2, Docker, health checks, zero-downtime deploys, gerenciamento de ambientes e CI/CD.

---

## 1. PM2 — Process Manager para Node.js

### O que e PM2

Gerenciador de processos para Node.js em producao. Garante que a aplicacao:
- Reinicie automaticamente em caso de crash
- Use todos os cores do CPU (cluster mode)
- Faca reload sem downtime
- Inicie automaticamente no boot do servidor

### Comandos Essenciais

```bash
# Instalar globalmente
npm install -g pm2

# Iniciar aplicacao
pm2 start dist/server.js --name "minha-api"

# Cluster mode (usar todos os cores)
pm2 start dist/server.js --name "minha-api" -i max
# -i 0 ou -i max = numero de cores do CPU
# -i 4 = exatamente 4 instancias

# Listar processos
pm2 list

# Ver logs
pm2 logs "minha-api"
pm2 logs "minha-api" --lines 100

# Monitoramento em tempo real
pm2 monit

# Restart
pm2 restart "minha-api"

# Reload (zero-downtime)
pm2 reload "minha-api"
# Diferenca: restart mata e recria; reload cria novo ANTES de matar o antigo

# Parar
pm2 stop "minha-api"

# Deletar do PM2
pm2 delete "minha-api"
```

### Configuracao com Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'minha-api',
    script: 'dist/server.js',
    instances: 'max',        // cluster mode
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,             // NUNCA em producao
    max_memory_restart: '1G', // restart se usar mais de 1GB
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3001,
    },
  }],
}
```

```bash
# Usar ecosystem file
pm2 start ecosystem.config.js
pm2 start ecosystem.config.js --env staging

# Auto-start no boot
pm2 startup    # gera comando para configurar systemd
pm2 save       # salva lista atual de processos
```

### PM2 + Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/minha-api
server {
    listen 80;
    server_name meusite.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 2. Docker Basics

### Por que Docker

- **Reproducibilidade:** "Funciona na minha maquina" → funciona em qualquer lugar
- **Isolamento:** cada container tem seu proprio ambiente
- **Portabilidade:** build uma vez, roda em qualquer host com Docker
- **Consistencia:** dev, staging e producao com o mesmo ambiente

### Dockerfile — Node.js

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage (multi-stage build)
FROM node:20-alpine
WORKDIR /app

# Criar usuario nao-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar apenas o necessario
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Nao rodar como root
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Comandos Essenciais

```bash
# Build
docker build -t minha-api .

# Run
docker run -d -p 3000:3000 --name minha-api minha-api

# Compose
docker compose up -d        # iniciar
docker compose down          # parar e remover
docker compose logs -f api   # logs do servico api
docker compose ps            # listar servicos

# Debug
docker exec -it minha-api sh  # acessar shell do container
docker logs minha-api          # ver logs
```

### Boas Praticas Docker

1. **Multi-stage builds:** reduzir tamanho da imagem final (sem devDependencies, sem source code)
2. **Usuario nao-root:** NUNCA rodar container como root em producao
3. **.dockerignore:** excluir node_modules, .git, .env, testes
4. **HEALTHCHECK:** sempre definir no Dockerfile ou docker-compose
5. **Volumes para dados persistentes:** banco de dados, uploads
6. **Pinnar versoes:** `node:20-alpine`, nao `node:latest`

```
# .dockerignore
node_modules
.git
.env
*.test.*
coverage
docs
```

---

## 3. Health Check Endpoints

### Por que Health Checks sao Essenciais

- Load balancers usam para saber se o servico pode receber trafego
- Orquestradores (Docker, K8s) usam para restart automatico
- Monitoring usa para alertas
- Deploys zero-downtime dependem de health checks

### Tipos de Health Check

| Tipo | Endpoint | Verifica | Usado por |
|------|----------|----------|-----------|
| **Liveness** | `/health` | "O processo esta vivo?" | Docker HEALTHCHECK, K8s livenessProbe |
| **Readiness** | `/health/ready` | "Pode receber trafego?" | Load balancer, K8s readinessProbe |
| **Startup** | `/health/startup` | "Ja iniciou completamente?" | K8s startupProbe |

### Implementacao Completa

```typescript
// health.ts
type HealthStatus = 'ok' | 'degraded' | 'down'

interface HealthCheck {
  status: HealthStatus
  latency_ms: number
  details?: string
}

interface HealthResponse {
  status: HealthStatus
  version: string
  uptime_seconds: number
  timestamp: string
  checks: Record<string, HealthCheck>
}

// Liveness — simples, rapido
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

// Readiness — verifica dependencias
app.get('/health/ready', async (req, res) => {
  const start = Date.now()

  const checks: Record<string, HealthCheck> = {}

  // Verificar banco de dados
  try {
    const dbStart = Date.now()
    await db.query('SELECT 1')
    checks.database = { status: 'ok', latency_ms: Date.now() - dbStart }
  } catch (err) {
    checks.database = { status: 'down', latency_ms: 0, details: err.message }
  }

  // Verificar Redis/Cache
  try {
    const cacheStart = Date.now()
    await redis.ping()
    checks.cache = { status: 'ok', latency_ms: Date.now() - cacheStart }
  } catch (err) {
    checks.cache = { status: 'down', latency_ms: 0, details: err.message }
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok')
  const anyDown = Object.values(checks).some(c => c.status === 'down')

  const response: HealthResponse = {
    status: anyDown ? 'down' : allOk ? 'ok' : 'degraded',
    version: process.env.APP_VERSION || 'unknown',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  }

  res.status(anyDown ? 503 : 200).json(response)
})
```

### Regras para Health Checks

1. **Liveness deve ser RAPIDO** (< 100ms) — sem verificar dependencias externas
2. **Readiness verifica dependencias** — banco, cache, APIs criticas
3. **NUNCA bloquear health check** — timeout curto (5-10s max)
4. **Retornar 503 quando degradado** — load balancer para de enviar trafego
5. **Incluir versao** — facilita debug em deploys

---

## 4. Zero-Downtime Deploy

### Estrategias

#### Rolling Update (Recomendado para maioria)

```
Estado inicial: [v1] [v1] [v1] (3 instancias)

1. Criar nova instancia [v2]
2. Health check de [v2] passa?
   SIM → Remover uma [v1]
   NAO → Rollback (deletar [v2])
3. Estado: [v1] [v1] [v2]
4. Repetir ate: [v2] [v2] [v2]

Resultado: SEMPRE ha instancias respondendo
```

#### Blue-Green

```
Blue (producao atual): [v1] [v1]
Green (nova versao):   [v2] [v2]

1. Deploy v2 no ambiente Green
2. Testar Green (smoke tests, health checks)
3. Trocar trafego: Load Balancer aponta para Green
4. Blue vira backup (rollback instantaneo se necessario)
5. Apos validacao, desligar Blue
```

#### Canary

```
1. Deploy v2 em 1 instancia (5% do trafego)
2. Monitorar metricas (erros, latencia)
3. Se OK, aumentar para 25%, 50%, 100%
4. Se problemas, rollback imediato (remover v2)
```

### Feature Flags

Feature flags operam na **camada de aplicacao** — complementam (nao substituem) as estrategias de infra acima. O canary acima e um rollout de infraestrutura; feature flags sao um rollout de funcionalidade dentro do codigo ja deployado.

**Por que usar:**
- Enviar codigo sem ativar (merge cedo no main, sem branch de longa duracao)
- Rollback sem redeploy — desliga a flag em vez de reverter um deploy
- Canary no nivel de feature (1% dos usuarios → 10% → 100%)
- A/B test sem infra adicional

**Snippet ilustrativo:**

```typescript
// feature-flags.ts
if (featureFlags.isEnabled('new-checkout', { userId })) {
  return newCheckoutFlow(cart)
}
return legacyCheckoutFlow(cart)
```

**Lifecycle de uma flag:**

```
Criar → Habilitar p/ teste interno → Canary (1%→10%→100%) → Rollout completo → Remover flag + codigo morto
```

**Regra de limpeza:** defina uma data de limpeza ao criar a flag, ou ela vira divida tecnica. Flags sem data de expiracao acumulam e tornam o codigo ilegivel.

### PM2 Zero-Downtime

```bash
# reload (nao restart!) para zero-downtime
pm2 reload "minha-api"

# O que acontece:
# 1. PM2 cria novas instancias com codigo novo
# 2. Novas instancias sinalizam "ready"
# 3. PM2 para de enviar trafego para instancias antigas
# 4. PM2 mata instancias antigas
# 5. Zero requests perdidos (se app sinaliza ready corretamente)
```

### Docker Zero-Downtime

```bash
# Com docker-compose
docker compose up -d --build --no-deps api
# --no-deps: nao recria dependencias (DB, Redis)
# Docker cria novo container, health check passa, remove antigo

# Com Nginx upstream e multiplos containers
# nginx.conf
upstream api {
    server api-1:3000;
    server api-2:3000;
}

# Deploy:
# 1. docker compose up -d --scale api=4 --no-recreate
# 2. Novas instancias entram no upstream
# 3. docker compose stop api-old-container-ids
```

---

## Blue-Green Deploy

Padrao onde **duas versoes da aplicacao rodam em paralelo** — rotuladas "blue" e "green" — e o trafego de usuario vai para apenas uma por vez, roteado por um proxy. Os nomes sao rotulos arbitrarios para "versao atual live" e "nova versao a deployar"; o que importa e o mecanismo, nao qual cor e qual.
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Cenário da demonstração

### Dois slots paralelos, mesma maquina, portas dedicadas por cor

As duas instancias **nao precisam de duas maquinas**: podem rodar na mesma VPS, diferenciadas por porta — NGINX na 80, blue na 3001, green na 3002. Cada cor tem porta dedicada por convencao estatica; o NGINX escuta na porta publica e encaminha para a porta do slot ativo.
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Arquitetura: usuário → NGINX → instância de aplicação

### Reverse proxy faz o cutover — um script de switch e o ponto unico

O **switch via reverse proxy (NGINX)** e o coracao do padrao. Trocar a versao ativa e so mudar para qual porta ele encaminha — a config dos dois slots e estruturalmente identica, **so muda o numero da porta** no bloco `upstream`. O switch nao derruba nem sobe nenhuma instancia: e um *reload* de config, sem interromper conexoes ativas. Mantenha **um script de switch como ponto unico de cutover** (`switch myapp <cor>` so altera a config do NGINX e recarrega — nao faz deploy, nao sobe instancia, nao valida).
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: O que o script de switch faz
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Os scripts bash

### Health check na porta privada ANTES do switch

O que torna o padrao seguro (nao so sem-downtime) e validar a nova instancia **acessando diretamente a porta privada em que ela roda** (ex.: 3002) — porta que o usuario final nao acessa — ANTES de flipar o trafego. E uma "staging dentro da propria producao": mesma maquina, mesmas dependencias, mesmo banco, mas sem expor a versao nova ao trafego real ate passar na validacao. Se o teste falhar, NAO flipe — a antiga continua servindo sem interrupcao.
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: O fluxo Blue-Green na prática

### Rollback imediato invertendo o switch

Como **ambas as instancias continuam rodando** apos o switch, reverter e so re-executar o switch para a cor anterior (`switch myapp <cor-anterior>`) — a instancia antiga nunca foi derrubada. So delete a cor antiga apos um periodo de observacao em producao; deletar cedo abre mao da rede de seguranca. Instale o processo Node como servico **systemd** para reinicio automatico em falha, start no boot e controle via `systemctl` — em vez de prende-lo a uma sessao SSH.
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Testando o deploy
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Os scripts bash

### Fluxo de 5 passos

```
1. sobe a cor inativa (deploy no diretorio do slot inativo)
2. health check na PORTA PRIVADA  ← gate obrigatorio
3. confirma  ── se falhar: ABORTA. NAO flipa. Antiga continua servindo.
4. switch do NGINX (script unico de cutover)
5. observa em producao; so ENTAO deleta a antiga
     └── janela de rollback = instante 4 ate instante 5. Rollback = re-executar
         o switch para a cor anterior. Instantaneo.
```
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: O fluxo Blue-Green na prática

### Quando NAO usar / limite honesto

- **Recursos de infra limitados** para manter duas instancias ativas ao mesmo tempo — blue-green duplica consumo de memoria/CPU (**2x recursos**) durante a janela.
  > fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Cenário da demonstração
- **Downtime de poucos segundos e aceitavel** (backoffice, script interno, janela de manutencao com usuarios ausentes) — o custo de manter duas instancias nao se justifica.
  > fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: Conclusões e trade-offs
- **Migrations de banco incompativeis / estado compartilhado entre as cores.** Blue-green **nao resolve** isto: a validacao roda contra o "mesmo banco" — ou seja, **as duas cores compartilham o mesmo banco**, nao duplicado. Uma migration aplicada para a green afeta a blue que ainda serve trafego, e um rollback de codigo NAO desfaz a mudanca de schema. Compatibilidade de schema e um **pre-requisito** que o blue-green nao cobre; trate como condicao externa, nao como algo que o padrao mitiga sozinho.
  > fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: O fluxo Blue-Green na prática

> **Cross-link — health check:** o gate pre-switch aqui e um health check usado como **portao de cutover**. O padrao geral de health check (liveness / local / dependency / anomaly, fail-open, falha independente x correlacionada) esta em `defensive-patterns` #8.

---

## 5. Environment Management

### Hierarquia de Ambientes

```
Development  → Maquina local do dev
    ↓
Staging      → Replica de producao para testes
    ↓
Production   → Ambiente real com usuarios
```

### Gerenciamento de .env

```bash
# .env.example (commitado no repositorio — SEM valores reais)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
STRIPE_API_KEY=sk_test_xxx
PORT=3000

# .env (NAO commitado — .gitignore)
DATABASE_URL=postgresql://real-user:real-pass@db.prod.com:5432/proddb
JWT_SECRET=super-secret-random-string-64-chars
```

### Regras de Seguranca

1. **NUNCA commitar .env** — adicionar ao .gitignore
2. **SEMPRE ter .env.example** — documentar variaveis necessarias
3. **Secrets em vault/manager** — AWS Secrets Manager, Doppler, 1Password
4. **Variaveis diferentes por ambiente** — dev, staging, prod
5. **Validar variaveis no startup** — falhar rapido se faltarem

```typescript
// Validar variaveis no startup
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_API_KEY']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}

validateEnv() // executar ANTES de iniciar a aplicacao
```

---

## 6. CI/CD Basics

### O que e CI/CD

- **CI (Continuous Integration):** build e testes automaticos a cada push
- **CD (Continuous Delivery):** deploy automatico apos CI passar

### GitHub Actions — Workflow Basico

```yaml
# .github/workflows/deploy.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun run test

      - name: Run linter
        run: bun run lint

      - name: Type check
        run: bun run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app
            git pull origin main
            bun install --production
            bun run build
            pm2 reload minha-api
```

### Pipeline Minimo Recomendado

```
Push → Install → Lint → Type Check → Test → Build → Deploy
  |       |        |        |          |      |       |
  |       |        |        |          |      |       └─ pm2 reload / docker deploy
  |       |        |        |          |      └─ bun run build
  |       |        |        |          └─ bun run test
  |       |        |        └─ bun run typecheck
  |       |        └─ bun run lint
  |       └─ bun install
  └─ git checkout
```

### Regras de CI/CD

1. **NUNCA pular testes** — se testes falham, deploy NAO acontece
2. **Build reproducivel** — lockfile (bun.lockb) commitado
3. **Secrets no CI** — GitHub Secrets, NAO hardcoded no workflow
4. **Deploy atomico** — ou deploy completo funciona, ou rollback
5. **Notificacao de falha** — Slack, email, Discord quando pipeline quebra

### CI Optimization

Quando o pipeline passa de ~10 min, aplicar em ordem de impacto:

1. **Cachear dependencias** — `actions/cache` (GitHub Actions) ou equivalente do provedor de CI; cache do setup-bun / setup-node reduz 1-3 min por job.
2. **Rodar jobs em paralelo** — separar lint / typecheck / test / build em jobs independentes; o provedor roda em paralelo automaticamente quando nao ha dependencia entre eles.
3. **Rodar so o que mudou (path filters)** — pular e2e em PRs que tocam apenas docs; pular build de imagem Docker se nenhum arquivo relevante mudou. Exemplo GitHub Actions: `on.push.paths` / `on.pull_request.paths`.
4. **Matrix / sharding de testes** — dividir a suite em N shards rodando em paralelo (ex: `matrix: { shard: [1, 2, 3, 4] }`); reduz tempo proporcional ao numero de shards.
5. **Tirar testes lentos do caminho critico** — mover testes de integracao pesados / e2e completos para um workflow em `schedule` (ex: nightly); PR recebe apenas o subconjunto rapido.

Aplicar em ordem — o item 1 ja resolve a maioria dos casos; partir direto para sharding (4) sem cachear (1) e desperdicador.

### PR Gating

Fazer o CI ser um **gate de merge**, nao so um gate de deploy:

- **Required status checks** — configurar no provedor de CI que o merge so e possivel com CI verde. No GitHub: Settings → Branches → Branch protection rules → "Require status checks to pass before merging".
- **Branch protection no main** — bloquear force-push no main; exigir que PRs passem pelos checks antes de merge.
- **Minimo de 1 review** — ao menos uma aprovacao humana antes de merge em branches protegidas.

Isso converte a Regra 1 de CI/CD ("NUNCA pular testes") de convencao em mecanismo — o pipeline nao pode ser ignorado acidentalmente.

---

## 7. Arvore de Decisao — Deploy Completo

```
Qual o stack e infra?
  Node.js em VPS?
    → PM2 (cluster mode) + Nginx (reverse proxy) + Certbot (SSL)
    → CI: GitHub Actions
    → Deploy: SSH + git pull + pm2 reload

  Node.js com Docker?
    → Dockerfile (multi-stage) + docker-compose
    → CI: GitHub Actions + Docker build
    → Deploy: docker compose up -d --build

  Vercel / Railway / PaaS?
    → git push (deploy automatico)
    → CI: integrado na plataforma
    → Deploy: automatico no merge

  AWS com containers?
    → ECS Fargate ou App Runner
    → CI: GitHub Actions → ECR → ECS
    → Deploy: rolling update gerenciado

  Kubernetes?
    → So se REALMENTE precisa de orquestracao
    → CI: GitHub Actions → Registry → kubectl apply
    → Deploy: rolling update, canary, ou blue-green
```

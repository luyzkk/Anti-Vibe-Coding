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

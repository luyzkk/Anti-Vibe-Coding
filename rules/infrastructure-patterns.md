# Infrastructure Patterns — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar `Dockerfile`, `docker-compose.*`, `ecosystem.config.*`, `.env*`, `deploy.*`, `nginx.*`, `Procfile`.

## Health Check Endpoints

- SEMPRE implemente `/health` ou `/healthz` que retorne status das dependencias
- Health check DEVE verificar: database, cache (Redis), APIs externas criticas
- Separe liveness (processo vivo) de readiness (pronto para receber trafego)
- Health check NAO deve exigir autenticacao
- Pattern correto:
```typescript
// Liveness: processo esta rodando?
app.get('/health', () => ({ status: 'ok', uptime: process.uptime() }))

// Readiness: dependencias estao acessiveis?
app.get('/ready', async () => {
  const db = await checkDatabase()
  const cache = await checkRedis()
  const status = db && cache ? 200 : 503
  return { status, db, cache }
})
```

## Variaveis de Ambiente

- `.env` SEMPRE no `.gitignore` (NUNCA commitar secrets)
- `.env.example` commitado com placeholders descritivos (NUNCA valores reais)
- Validar TODAS as env vars na inicializacao (falhar cedo, nao em runtime)
- Pattern correto com Zod:
```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
})
export const env = envSchema.parse(process.env)
```
- NUNCA use `process.env.X` diretamente no codigo — centralize em modulo de config
- Producao: use Secrets Manager (AWS, GCP, Vault) em vez de `.env`
- NUNCA hardcode URLs de banco, API keys, ou tokens no codigo fonte

## SSL/HTTPS

- TODAS as URLs de producao devem usar `https://`
- Cookies de sessao: `Secure: true` em producao (NUNCA transmitir cookies via HTTP)
- HSTS (Strict-Transport-Security) configurado com `max-age` >= 1 ano
- Redirect automatico de HTTP para HTTPS no proxy/load balancer
- Certificados SSL: renovacao automatica (Let's Encrypt, Cloudflare)
- NUNCA desabilite verificacao de certificado (`rejectUnauthorized: false`) em producao

## CDN e Assets Estaticos

- Assets estaticos (JS, CSS, imagens, fontes) DEVEM ser servidos via CDN
- Cache headers configurados: `Cache-Control: public, max-age=31536000, immutable` para assets com hash
- Imagens: use formatos otimizados (WebP, AVIF) com fallback
- Comprima assets: gzip ou brotli em producao
- NUNCA sirva assets estaticos diretamente do servidor de aplicacao em producao
- Use hash no nome do arquivo para cache busting (`app.a1b2c3.js`)

## Process Manager

- NUNCA execute `node server.js` ou `bun run` diretamente em producao
- Use PM2, Docker, ou plataforma gerenciada (Fly.io, Railway, Vercel)
- PM2 configuracao minima:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'app',
    script: './dist/server.js',
    instances: 'max',        // usar todos os cores
    exec_mode: 'cluster',    // cluster mode para load balancing
    autorestart: true,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```
- Restart automatico em caso de crash (PM2 `autorestart`, Docker `restart: unless-stopped`)
- Limites de memoria configurados (`--max-old-space-size` ou `max_memory_restart`)
- Graceful shutdown: fechar conexoes ativas antes de desligar

## Docker Security

- SEMPRE use multi-stage builds (separar build de runtime)
- NUNCA rode como root — adicione `USER node` ou usuario nao-root
- Use versoes especificas de imagem base (NUNCA `latest`)
  - ERRADO: `FROM node:latest`
  - CORRETO: `FROM node:20-alpine`
- `.dockerignore` DEVE incluir: `node_modules`, `.env`, `.git`, `*.md`, `tests/`
- Instale apenas dependencias de producao no stage final (`--omit=dev`)
- HEALTHCHECK no Dockerfile para monitoramento
- Pattern correto:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER app
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:3000/health || exit 1
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## CI/CD

- Pipeline minimo: lint → test → build → deploy
- NUNCA deploy sem testes passando
- Branch protection em `main`: exigir PR + review + CI verde
- Secrets de CI/CD em variables seguras (NUNCA no repositorio)
- Deploy automatico em staging, manual em producao (ou com aprovacao)

## Anti-Patterns de Infraestrutura

- `.env` commitado no repositorio
- `process.env.X` espalhado pelo codigo sem validacao central
- Sem health check endpoint
- URLs `http://` em producao
- Docker rodando como root
- `FROM node:latest` (sem versao fixa)
- Sem process manager (node direto)
- Assets estaticos servidos pelo servidor de aplicacao
- Deploy sem CI/CD
- Secrets hardcoded no codigo

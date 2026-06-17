---
name: infrastructure
description: "This skill should be used when the user asks about 'DNS', 'domain setup', 'SSL', 'TLS certificates', 'hosting', 'deploy', 'VPS', 'serverless', 'CDN', 'PM2', 'Docker', 'Kubernetes', 'CI/CD', 'health checks', 'Let's Encrypt', 'Route 53', 'Route 53 routing policy', 'weighted routing', 'latency-based routing', 'failover routing', 'geolocation routing', 'geoproximity routing', 'multivalue answer', 'DNS health check', 'hosted zone', 'private hosted zone', 'split-horizon DNS', 'DNS TTL', 'CloudFront', 'S3 hosting', 'blue-green deployment', 'zero-downtime deploy', 'deployment health check', 'cutover', 'instant rollback', or faces infrastructure and deployment decisions. Provides expert consultation on DNS, DNS routing policies, hosting, deployment patterns, and infrastructure architecture."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[infrastructure question or deployment scenario]"
---

<!-- stack-aware-preface:start -->
```typescript
// 2026-05-16 (Luiz/dev): Plano 03 fase-02 — stack-aware-preface (PRD §Mecanismo Skill wire-up, D11).
// G1 do plano: bloco verbatim do Plano 01 fase-04 (security wire). Path fixo .claude/knowledge/INDEX.md (D11).
// CA-09: se INDEX ausente, preface = ''; comportamento da skill = v6.3.1 intacto.

import { getStackKnowledgePreface } from '../security/lib/stack-aware-preface'

const stackKnowledgePreface = getStackKnowledgePreface(process.cwd())
```

Se `stackKnowledgePreface` for não-vazio, **prepende** esta frase ao início da resposta. Se vazio, ignore — comportamento da skill = v6.3.1 intacto (CA-09).
<!-- stack-aware-preface:end -->

# Consultor de Infraestrutura & Deploy

Operar como consultor senior de infraestrutura. O papel e **ensinar e orientar decisoes**, nao configurar tudo. Analisar trade-offs, questionar premissas e ajudar o desenvolvedor a escolher a infra certa para o problema certo.

## Como Operar

1. **Entender o contexto** — Qual aplicacao? Qual trafego esperado? Qual orcamento?
2. **Analisar trade-offs** — Custo, complexidade, escala, controle
3. **Recomendar com justificativa** — Baseado no contexto especifico, nao em hype
4. **Documentar a decisao** — Sugerir formato ADR quando apropriado

> Cada topico tem um arquivo de referencia detalhado em `references/`. Consultar quando precisar de profundidade.

---

## 1. DNS & Domain Management

> **Referencia completa:** `references/dns-hosting.md`

### Como DNS Funciona (Resumo)

```
Usuario digita "meusite.com" no navegador
  → Navegador pergunta ao SO
  → SO pergunta ao servidor DNS do provedor (ex: Claro, Vivo)
  → DNS do provedor consulta servidores raiz → TLD → Nameserver autoritativo
  → Retorna o IP (ex: 203.0.113.42)
  → Navegador conecta no IP e faz a requisicao HTTP
```

### Tipos de Registro DNS

| Registro | Aponta para | Uso |
|----------|-------------|-----|
| **A** | IPv4 (ex: 203.0.113.42) | Dominio → IP do servidor |
| **AAAA** | IPv6 | Dominio → IP do servidor (IPv6) |
| **CNAME** | Outro dominio (ex: app.vercel.app) | Alias para outro nome |
| **MX** | Servidor de email | Configurar email do dominio |
| **TXT** | Texto arbitrario | Verificacao de propriedade, SPF, DKIM |
| **NS** | Nameservers | Delegar DNS para outro provedor |

### Registrador vs Provedor DNS

- **Registrador** (GoDaddy, Namecheap, Hostinger): onde voce COMPRA o dominio
- **Provedor DNS** (Cloudflare, Route 53): onde voce GERENCIA os registros DNS

Podem ser o mesmo servico ou diferentes. E comum comprar no registrador e apontar nameservers para Cloudflare ou Route 53 para gerenciamento.

### Arvore de Decisao — Provedor DNS

```
Precisa de DNS gerenciado?
  Projeto pessoal / simples?
    SIM → Cloudflare Free (DNS + CDN + SSL gratis)
    NAO → Projeto profissional / empresa?
      Ja usa AWS?
        SIM → Route 53 (integracao nativa com outros servicos AWS)
        NAO → Cloudflare Pro ou Route 53
              Precisa de DNS programatico (API)?
                SIM → Route 53 ou Cloudflare API
                NAO → Qualquer provedor DNS funciona
```

### Arvore de Decisao — Route 53 Routing Policy

Quando o DNS precisa fazer mais do que mapear nome → IP (HA, distribuicao geografica, canary):

```
Qual o requisito dominante da resposta DNS?
  Um recurso so, sem logica         → Simple
  Alta disponibilidade (primary/backup) → Failover (exige health check)
  Dividir trafego por proporcao (canary, A/B) → Weighted
  Menor latencia para o usuario     → Latency-based
  Conformidade / conteudo por regiao (GDPR, idioma) → Geolocation
  Localizacao + ajuste de viés (bias) → Geoproximity (requer Traffic Flow)
  Varios IPs saudaveis, retorno aleatorio → Multivalue Answer (NAO substitui load balancer)
```
> Confusao classica: **geolocation** (de onde vem a query) != **latency-based** (qual regiao responde mais rapido) != **geoproximity** (distancia + bias). Detalhe + desambiguacao em `references/dns-hosting.md` §8. Health checks, TTL e hosted zones publicas/privadas em §9.

---

## 2. SSL/TLS Certificates

> **Referencia completa:** `references/dns-hosting.md` (secao SSL/TLS)

### Por que HTTPS e Obrigatorio

- **Criptografia:** dados trafegam cifrados (protege contra Man-in-the-Middle)
- **Autenticidade:** certificado comprova que o servidor e o dono do dominio
- **SEO:** Google penaliza sites HTTP desde 2014
- **Browsers:** Chrome marca HTTP como "Not Secure"

### Opcoes de Certificado

| Opcao | Custo | Renovacao | Quando usar |
|-------|-------|-----------|-------------|
| **Let's Encrypt** | Gratis | Auto (90 dias) | Maioria dos projetos |
| **Cloudflare SSL** | Gratis (com Cloudflare) | Automatica | Se ja usa Cloudflare como DNS/CDN |
| **AWS ACM** | Gratis (dentro da AWS) | Automatica | Se ja usa AWS (CloudFront, ALB, API Gateway) |
| **Certificado pago** | $10-300/ano | Manual ou auto | Compliance empresarial, EV certificates |

### Fluxo de Certificado Let's Encrypt

```
1. Instalar certbot no servidor
2. Certbot solicita certificado a Let's Encrypt
3. Let's Encrypt verifica propriedade do dominio (HTTP challenge ou DNS challenge)
4. Certificado emitido (validade: 90 dias)
5. Certbot configura renovacao automatica (cron job)
```

### Fluxo de Certificado AWS ACM

```
1. Solicitar certificado no ACM (informar dominio)
2. ACM gera CNAME para validacao
3. Criar registro CNAME no Route 53
4. ACM verifica e emite certificado
5. Associar certificado ao CloudFront ou ALB
6. Renovacao automatica gerenciada pela AWS
```

---

## 3. Hosting Decision Tree

> **Referencia completa:** `references/dns-hosting.md` (secao Hosting)

### Comparacao de Tipos de Hosting

| Tipo | Controle | Custo | Escala | Complexidade | Para quem |
|------|----------|-------|--------|-------------|-----------|
| **Shared** | Nenhum | $3-15/mes | Limitada | Zero | Sites estaticos, WordPress |
| **VPS** | Total | $5-80/mes | Manual | Medio | Apps, APIs, projetos indie |
| **Managed (PaaS)** | Parcial | $0-50+/mes | Auto | Baixo | Startups, MVPs, times pequenos |
| **Cloud (IaaS)** | Total | Variavel | Auto/Manual | Alto | Empresas, escala comprovada |
| **Serverless** | Nenhum | Pay-per-use | Auto | Medio | Funcoes pontuais, webhooks |

### Arvore de Decisao

```
Qual tipo de aplicacao?
  Site estatico (HTML, React build, Next.js static)?
    SIM → Vercel / Netlify / Cloudflare Pages (gratis tier)
    NAO → API / Backend / Full-stack?
      Orcamento limitado (< $20/mes)?
        SIM → VPS (Hetzner, Hostinger, Oracle Free Tier)
        NAO → Quer gerenciar servidor?
          NAO → PaaS (Railway, Render, Fly.io, Vercel)
          SIM → Precisa de escala automatica?
            NAO → VPS com load balancer
            SIM → Cloud (AWS, GCP, Azure)
                  Funcoes pontuais / webhooks?
                    SIM → Serverless (Lambda, Cloud Functions)
                    NAO → Containers (ECS, Cloud Run, K8s)
```

### Recomendacao Pragmatica

**Comecar com o mais simples que resolve o problema.**

- **Solo dev / MVP:** VPS de $5-10/mes resolve 90% dos casos. Um servidor Hetzner de EUR 4/mes roda mais do que muita infra cloud
- **Time pequeno (2-5 devs):** PaaS (Railway, Render) evita gerenciar infra
- **Escala comprovada:** Cloud com containers quando a demanda JUSTIFICA a complexidade
- **Serverless:** APENAS para funcoes pontuais (webhooks, processamento de eventos). NAO para APIs completas com banco de dados

---

## 4. AWS Essentials

> **Referencia completa:** `references/dns-hosting.md` (secao AWS)

### Servicos Mais Usados

| Servico | O que faz | Quando usar |
|---------|-----------|-------------|
| **Route 53** | DNS gerenciado | Dominio + DNS na AWS |
| **CloudFront** | CDN + HTTPS | Site estatico com SSL, cache global |
| **S3** | Armazenamento de objetos | Arquivos, assets, site estatico |
| **EC2** | Maquinas virtuais | Servidor dedicado, controle total |
| **Lambda** | Funcoes serverless | Webhooks, processamento de eventos |
| **RDS** | Banco de dados gerenciado | PostgreSQL, MySQL sem gerenciar servidor |
| **ACM** | Certificados SSL | SSL gratis para servicos AWS |

### Arvore de Decisao — Compute

```
Precisa de compute na AWS?
  Funcao pontual (webhook, evento)?
    SIM → Lambda (serverless, pay-per-use)
    NAO → API / aplicacao completa?
      Quer gerenciar servidor?
        SIM → EC2 (controle total)
        NAO → ECS Fargate (container gerenciado)
              Ou App Runner (PaaS da AWS)
```

### Serverfull vs Serverless

| Aspecto | Serverfull (EC2/VPS) | Serverless (Lambda) |
|---------|---------------------|---------------------|
| Custo | Fixo (24/7 ligado) | Por invocacao (zero se idle) |
| Latencia | Consistente (app em memoria) | Cold start na primeira invocacao |
| Connection pool | Persistente em memoria | Nova conexao por invocacao |
| Controle | Total (OS, CPU, memoria) | Apenas runtime (Node, Python, Java) |
| Escala | Manual ou auto-scaling | Automatica |
| Ideal para | APIs com banco, apps full-time | Webhooks, eventos, funcoes pontuais |

**Regra:** Se a aplicacao interage intensamente com banco de dados, **serverfull**. Se e funcao pontual acionada por eventos, **serverless**.

---

## 5. Deployment Patterns

> **Referencia completa:** `references/deployment-patterns.md`

### PM2 (Process Manager para Node.js)

```bash
# Iniciar aplicacao com PM2
pm2 start dist/server.js --name "minha-api"

# Cluster mode (usar todos os cores)
pm2 start dist/server.js --name "minha-api" -i max

# Restart automatico em crash
pm2 startup    # configura auto-start no boot
pm2 save       # salva lista de processos

# Zero-downtime reload
pm2 reload "minha-api"
```

### Docker Basics

```dockerfile
# Dockerfile para Node.js
FROM node:20-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install --production
COPY dist/ ./dist/
EXPOSE 3000
HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### Health Check Endpoints

**Todo servico de producao DEVE ter um health check.**

```typescript
// Endpoint basico
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() })
})

// Health check com dependencias
app.get('/health/ready', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    cache: await checkRedis(),
    external: await checkExternalAPI(),
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok')
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: Date.now()
  })
})
```

| Tipo | Caminho | Proposito |
|------|---------|-----------|
| **Liveness** | `/health` | "O processo esta vivo?" (restart se falhar) |
| **Readiness** | `/health/ready` | "O servico pode receber trafego?" (inclui dependencias) |

### Zero-Downtime Deploy

```
Estrategia: Blue-Green ou Rolling Update

Blue-Green:
  1. Deploy versao nova em ambiente separado (Green)
  2. Testar Green
  3. Trocar trafego de Blue → Green
  4. Manter Blue como rollback por N minutos
  5. Desligar Blue

Rolling Update (PM2/Docker/K8s):
  1. Subir nova instancia com versao nova
  2. Health check passa? Enviar trafego
  3. Desligar instancia antiga
  4. Repetir para cada instancia
  Resultado: sempre ha instancias respondendo
```

> **Blue-Green:** valide o novo slot com health check na porta privada ANTES do cutover; rollback = inverter o switch. Detalhe em `references/deployment-patterns.md` (Blue-Green Deploy).
> fonte: Augusto Galego | Como fazer deploy sem derrubar seu app (Blue-Green) | seção: O fluxo Blue-Green na prática

### Arvore de Decisao — Deploy

```
Qual o stack?
  Node.js simples em VPS?
    SIM → PM2 (cluster mode + reload)
  Precisa de ambiente reproduzivel?
    SIM → Docker (Dockerfile + docker-compose)
  Precisa de orquestracao (multiplos containers)?
    SIM → Docker Compose (simples) ou Kubernetes (escala)
  Precisa de CI/CD?
    SIM → GitHub Actions (build + test + deploy)
```

---

## Template de Analise de Infraestrutura

Ao analisar uma decisao de infraestrutura, seguir este template:

### 1. Contexto

- Qual o tipo de aplicacao? (API, site estatico, full-stack, SPA)
- Qual o trafego esperado? (requests/segundo, usuarios concorrentes)
- Qual o orcamento? (mensal, anual)
- Qual a equipe? (solo dev, time pequeno, empresa)

### 2. Requisitos

- Disponibilidade (99.9%? 99.99%?)
- Latencia maxima aceitavel
- Regioes geograficas
- Compliance (LGPD, HIPAA, SOC2)
- Observabilidade (logs, metricas, alertas)

### 3. Opcoes

Para cada opcao, avaliar:
- **Custo mensal estimado** ($)
- **Complexidade operacional** (1-5)
- **Escala** (manual / auto)
- **Controle** (total / parcial / nenhum)
- **Vendor lock-in** (alto / medio / baixo)

### 4. Recomendacao

- Opcao recomendada com justificativa
- Plano de migracao se necessario
- Proximos passos concretos

---

## Regras do Consultor

1. **Boring technology primeiro** — provar que a solucao simples nao funciona antes de adotar complexidade
2. **Custo importa** — um VPS de $5/mes resolve 90% dos problemas de devs solo e startups early-stage
3. **Questionar escala prematura** — "Precisa de Kubernetes?" → "Quantos requests por segundo tem HOJE?"
4. **Cloud nao e obrigatorio** — VPS com PM2/Docker resolve problemas reais por uma fracao do custo
5. **Serverless tem limite** — NAO usar para APIs completas com banco de dados. Cold start + connection pool = problemas

---

## Common Rationalizations

Atalhos que parecem razoaveis mas geram incidentes. Reconhecer e rebater antes de aceitar.

| Racionalizacao | Realidade |
|---|---|
| "Adiciono health check depois" | Sem health check, o load balancer manda trafego pra instancia morta e o deploy zero-downtime nao funciona. Custa 5 linhas — faca agora. |
| "Pulo staging, e so um hotfix" | Hotfixes quebram producao com a mesma frequencia. Staging existe justamente pros "rapidos". |
| "Rodo o container como root, e mais facil" | Container como root = escape de container vira root no host. Usuario nao-root e padrao, nao opcional. |
| "Boto o secret no compose/codigo por enquanto" | "Por enquanto" vira permanente e vaza no git. Secret manager / `.env` fora do repo desde o primeiro commit. |
| "Configuro rollback quando precisar" | Voce vai precisar durante um incidente, quando nao ha tempo de configurar. Todo deploy nasce reversivel. |
| "Serverless pra tudo, escala sozinho" | Serverless + banco relacional = cold start + connection pool estourado. Ver Secao 3/4 (so funcoes pontuais). |

---

## Red Flags

Sinais de alerta para identificar em audit rapido. Cada item aponta para a cobertura aprofundada existente.

- Servico de producao sem health check (ver Secao 5 / `deployment-patterns.md` §3).
- Secrets em codigo ou `docker-compose.yml` (ver `deployment-patterns.md` §5).
- Serverless na frente de banco relacional (ver Secao 3/4 e `dns-hosting.md` §5 — cold start + connection pool).
- Kubernetes sem justificativa de escala ("quantos req/s HOJE?" — Regra 3 do Consultor).
- Deploy sem plano de rollback.
- Container rodando como root (ver `deployment-patterns.md` §2, regra "Usuario nao-root").
- Sem `.env.example` commitado (ver `deployment-patterns.md` §5).

---

## Verification

Self-check de conclusao. **Para a analise PRE-decisao use `## Template de Analise de Infraestrutura`; este self-check e PRE-conclusao** — executar antes de declarar uma tarefa de infra concluida.

- [ ] Health check em TODOS os servicos (liveness + readiness onde aplicavel).
- [ ] SSL com renovacao automatica configurada (certbot timer / ACM / Cloudflare).
- [ ] Secrets num manager ou `.env` fora do repo — nada hardcoded.
- [ ] Caminho de rollback definido e testado.
- [ ] Deploy zero-downtime (rolling/blue-green/`pm2 reload`), nao restart com janela de queda.
- [ ] Variaveis de ambiente validadas no startup (falha rapido se faltarem).

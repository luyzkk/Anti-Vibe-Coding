# DNS, Dominios & Hosting — Referencia Completa

Guia aprofundado sobre como a internet resolve nomes, tipos de registros DNS, escolha de hosting e configuracao SSL/TLS.

---

## 1. DNS Resolution — Como Funciona

### Fluxo Completo de Resolucao

```
1. Usuario digita "meusite.com" no navegador
2. Navegador verifica cache local do browser
3. SO verifica cache local do sistema
4. SO consulta o Resolver DNS do provedor de internet (Claro, Vivo, etc.)
5. Resolver consulta Root DNS Server (13 servidores raiz no mundo)
6. Root retorna: "Para .com, pergunte ao TLD Server de .com"
7. Resolver consulta TLD Server de .com
8. TLD retorna: "Para meusite.com, pergunte ao Nameserver ns1.cloudflare.com"
9. Resolver consulta Nameserver autoritativo (ns1.cloudflare.com)
10. Nameserver retorna: "meusite.com = 203.0.113.42"
11. Resolver retorna IP ao SO
12. SO retorna IP ao navegador
13. Navegador conecta no IP 203.0.113.42 via HTTP/HTTPS
```

### Hierarquia DNS

```
. (Root)
  └── .com (TLD - Top Level Domain)
       └── meusite.com (Dominio)
            └── api.meusite.com (Subdominio)
            └── blog.meusite.com (Subdominio)
```

### Cache e TTL

Cada resposta DNS tem um **TTL (Time To Live)** — tempo em segundos que o resultado pode ficar em cache.

| TTL | Significado | Quando usar |
|-----|-------------|-------------|
| 300 (5 min) | Cache curto | Migracoes, trocas frequentes |
| 3600 (1 hora) | Cache medio | Padrao para maioria dos registros |
| 86400 (1 dia) | Cache longo | Registros que raramente mudam |

**Cuidado:** TTL alto economiza consultas DNS mas dificulta mudancas rapidas. Antes de uma migracao, reduzir TTL com antecedencia.

### Propagacao DNS

Quando voce altera um registro DNS, a mudanca precisa se propagar para servidores DNS ao redor do mundo. Isso leva de minutos a horas dependendo do TTL anterior.

Ferramenta para verificar: **DNS Propagation Checker** (whatsmydns.net ou similar).

---

## 2. Tipos de Registro DNS

### Registro A

Mapeia dominio para **endereco IPv4**.

```
meusite.com → 203.0.113.42
```

- Mais basico e comum
- Usado para apontar dominio para IP do servidor
- Na AWS Route 53, suporta **Alias** (aponta para recursos AWS como CloudFront, ALB)

### Registro AAAA

Mapeia dominio para **endereco IPv6**.

```
meusite.com → 2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

- Formato expandido com muito mais enderecos disponiveis
- IPv4 tem ~4.3 bilhoes de enderecos (esgotando)
- IPv6 resolve o esgotamento com enderecos praticamente ilimitados

### Registro CNAME

Mapeia dominio para **outro dominio** (alias).

```
www.meusite.com → meusite.com
blog.meusite.com → meusite.netlify.app
```

- NAO pode coexistir com outros registros no mesmo nome
- NAO pode ser usado no dominio raiz (meusite.com) em DNS padrao
  - Route 53 e Cloudflare contornam com Alias/CNAME Flattening
- Comum para subdomonios e validacao de certificados SSL

### Registro MX

Aponta dominio para **servidor de email**.

```
meusite.com → mail.google.com (prioridade 10)
meusite.com → mail2.google.com (prioridade 20)
```

- Prioridade: numero menor = maior prioridade
- Necessario para receber emails no dominio
- Configuracao tipica: apontar para Google Workspace, Microsoft 365 ou servico de email

### Registro TXT

Armazena **texto arbitrario**. Usado para verificacoes e seguranca.

```
meusite.com → "v=spf1 include:_spf.google.com ~all"
meusite.com → "google-site-verification=abc123"
```

| Uso | Exemplo |
|-----|---------|
| SPF | Autorizar servidores de email (anti-spam) |
| DKIM | Assinatura digital de emails |
| DMARC | Politica de autenticacao de email |
| Verificacao | Provar propriedade do dominio (Google, AWS, etc.) |

### Registro NS

Define quais **Nameservers** sao autoritativos para o dominio.

```
meusite.com → ns1.cloudflare.com
meusite.com → ns2.cloudflare.com
```

- Configurado no registrador do dominio
- Aponta para o provedor DNS que gerencia os registros
- Mudar NS = delegar DNS para outro provedor

---

## 3. Registrador vs Provedor DNS

### Registrador de Dominio

Onde voce COMPRA o dominio. Exemplos: GoDaddy, Namecheap, Hostinger, Google Domains (descontinuado), Cloudflare Registrar.

O registrador e responsavel por:
- Registro do dominio junto ao TLD (ICANN para .com, Registro.br para .com.br)
- Renovacao anual
- Configuracao dos Nameservers

### Provedor DNS

Onde voce GERENCIA os registros DNS. Exemplos: Cloudflare DNS, AWS Route 53, Digital Ocean DNS.

O provedor DNS e responsavel por:
- Hospedar os registros (A, CNAME, MX, TXT, etc.)
- Responder consultas DNS
- Disponibilidade e velocidade de resolucao

### Configuracao Tipica

```
1. Comprar dominio na Namecheap ($10/ano)
2. Criar zona DNS na Cloudflare (gratis)
3. No painel da Namecheap, trocar Nameservers para os da Cloudflare
4. Gerenciar todos os registros DNS na Cloudflare
```

**Por que separar?** Cloudflare oferece DNS gratuito + CDN + SSL + protecao DDoS. Melhor que o DNS basico do registrador.

---

## 4. SSL/TLS Certificates — Detalhado

### Como HTTPS Funciona

```
1. Navegador conecta ao servidor via HTTPS (porta 443)
2. Servidor envia seu certificado SSL
3. Navegador verifica:
   a. Certificado emitido por autoridade confiavel (CA)?
   b. Certificado e para ESTE dominio?
   c. Certificado nao expirou?
4. Se tudo OK, estabelece conexao criptografada (TLS handshake)
5. Todos os dados trafegam cifrados
```

### Let's Encrypt — Setup Completo

```bash
# Instalar Certbot (Ubuntu/Debian)
sudo apt update
sudo apt install certbot

# Para Nginx
sudo apt install python3-certbot-nginx
sudo certbot --nginx -d meusite.com -d www.meusite.com

# Para Apache
sudo apt install python3-certbot-apache
sudo certbot --apache -d meusite.com

# Renovacao automatica (ja configurado pelo certbot)
# Verificar timer:
sudo systemctl status certbot.timer

# Teste de renovacao manual:
sudo certbot renew --dry-run
```

### cert-manager (Kubernetes)

Para clusters Kubernetes, cert-manager automatiza SSL:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@meusite.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

### AWS ACM — Fluxo

```
1. Acessar AWS Certificate Manager
2. Solicitar certificado publico
3. Informar dominio(s): meusite.com, *.meusite.com
4. Escolher validacao: DNS (recomendado) ou Email
5. Para DNS: ACM gera um CNAME especifico
6. Criar esse CNAME no Route 53
7. ACM verifica e emite o certificado
8. Associar ao CloudFront, ALB ou API Gateway
9. Renovacao automatica pela AWS
```

---

## 5. Tipos de Hosting — Detalhado

### Shared Hosting

Multiplos sites compartilham o mesmo servidor. Menor controle, menor custo.

- **Pros:** Barato ($3-15/mes), zero configuracao, gerenciado
- **Contras:** Performance limitada, sem acesso SSH, sem customizacao de servidor
- **Ideal para:** WordPress, sites estaticos, landing pages
- **Exemplos:** Hostinger, HostGator, Bluehost

### VPS (Virtual Private Server)

Maquina virtual dedicada com acesso total (SSH, root).

- **Pros:** Controle total, preco acessivel ($5-80/mes), performance previsivel
- **Contras:** Responsabilidade de gerenciar (updates, seguranca, backups)
- **Ideal para:** APIs, apps Node.js/Python, projetos indie, ferramentas internas
- **Exemplos:** Hetzner (EUR 4/mes), Hostinger VPS, DigitalOcean, Linode, Oracle Free Tier

### Setup Basico de VPS

```bash
# 1. Conectar via SSH
ssh root@203.0.113.42

# 2. Criar usuario nao-root
adduser deploy
usermod -aG sudo deploy

# 3. Configurar SSH key
ssh-copy-id deploy@203.0.113.42

# 4. Atualizar sistema
sudo apt update && sudo apt upgrade -y

# 5. Instalar Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20

# 6. Instalar PM2
npm install -g pm2

# 7. Configurar firewall
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 8. Instalar Nginx (reverse proxy)
sudo apt install nginx

# 9. Configurar SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d meusite.com
```

### Managed / PaaS (Platform as a Service)

Plataforma gerenciada que abstrai o servidor. Deploy com `git push`.

- **Pros:** Zero infra, deploy facil, escala automatica, free tier
- **Contras:** Vendor lock-in, custo pode crescer, menos controle
- **Ideal para:** Startups, MVPs, times que querem focar em codigo
- **Exemplos:** Vercel, Railway, Render, Fly.io, Heroku

### Cloud / IaaS (Infrastructure as a Service)

Infraestrutura completa sob demanda. Maximo controle e complexidade.

- **Pros:** Escala massiva, servicos integrados, compliance
- **Contras:** Complexo, custo imprevisivel, requer expertise
- **Ideal para:** Empresas com escala comprovada, compliance rigoroso
- **Exemplos:** AWS, Google Cloud, Azure

### Serverless

Funcoes executadas sob demanda. Sem servidor dedicado.

- **Pros:** Pay-per-use (zero se idle), escala automatica, zero infra
- **Contras:** Cold start, sem connection pool, limites de execucao
- **Ideal para:** Webhooks, processamento de eventos, funcoes pontuais
- **Exemplos:** AWS Lambda, Google Cloud Functions, Azure Functions

**CUIDADO:** Serverless NAO e para APIs completas com banco de dados. Cada invocacao cria nova conexao, podendo estourar rate limits do banco e degradar performance.

---

## 6. Comparacao: Serverfull vs Serverless

| Aspecto | Serverfull (VPS/EC2) | Serverless (Lambda) |
|---------|---------------------|---------------------|
| **Custo** | Fixo (24/7 ligado) | Por invocacao (zero se idle) |
| **Latencia** | Consistente (app em memoria) | Cold start na primeira invocacao |
| **Connection pool** | Persistente em memoria | Nova conexao por invocacao |
| **Controle** | Total (OS, CPU, memoria, disco) | Apenas runtime |
| **Escala** | Manual ou auto-scaling | Automatica |
| **Deploy** | Build + copy + restart | Upload de funcao |
| **Monitoring** | Voce configura (PM2, Grafana) | Provider oferece (CloudWatch) |
| **Ideal para** | APIs completas, apps full-time | Webhooks, eventos, funcoes pontuais |

### Arvore de Decisao

```
A aplicacao precisa estar sempre rodando?
  SIM → Serverfull (VPS, EC2)
  NAO → E acionada por eventos esporadicos?
    SIM → Serverless (Lambda, Cloud Functions)
    NAO → Roda periodicamente (cron)?
      SIM → Serverless com EventBridge/CloudWatch Events
      NAO → Avaliar caso a caso
```

---

## 7. Cloudflare — Swiss Army Knife

Cloudflare oferece multiplos servicos em uma unica plataforma:

| Servico | Tier | O que faz |
|---------|------|-----------|
| DNS | Free | DNS gerenciado, rapido e global |
| CDN | Free | Cache global de assets |
| SSL | Free | Certificado SSL automatico |
| DDoS Protection | Free | Protecao contra ataques |
| Pages | Free | Hosting de sites estaticos |
| Workers | Free (limitado) | Funcoes serverless no edge |
| R2 | Pay-per-use | Storage compativel com S3 (sem egress fees) |
| Email Routing | Free | Redirecionamento de email do dominio |

**Para maioria dos projetos indie/startup:** Cloudflare Free resolve DNS + CDN + SSL + protecao sem custo.

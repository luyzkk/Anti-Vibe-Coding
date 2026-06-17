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


---

## 8. Route 53 — Políticas de Roteamento

Uma routing policy decide **qual recurso o Route 53 responde a cada query DNS** quando o mesmo hostname pode apontar para mais de um destino. Todos os usuários pedem o mesmo nome; a política é a inteligência que escolhe qual IP devolver. Pressupõe os fundamentos de §1 (record types, resolução recursiva) — aqui é só a camada de decisão. O erro mais caro é confundir três critérios que parecem o mesmo: latência de rede, origem geográfica da query e proximidade física.

São 7 políticas. Duas regras transversais valem para quase todas:

- **Records homônimos exigem Record ID único.** Qualquer política "inteligente" com 2+ records de mesmo nome (weighted, geolocation, failover) precisa de um Record ID descritivo por record — invisível ao usuário final. Simple não suporta múltiplos records homônimos.
  > fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Geolocation Routing (Console)
- **Cobrança é por recurso associado, não por política.** O hosting é fixo (US$ 0,50/mês por domínio); o custo real vem dos recursos provisionados em cada região-endpoint (EC2, ALB, RDS replica). Adicionar uma segunda região dobra o compute, não o DNS.
  > fonte: desconhecido (tutorial AWS) | AWS Route 53 policies Tutorial | seção: Summary and Pricing Notes

Failover e multivalue **exigem** health checks — sem eles a política perde o sentido. A mecânica do health check (Health Check ID, endpoint `/health`, fail-open) e o TTL vivem em §9.

### As 7 políticas

| Política | Decide por | Health check | Detalhe que pega |
|---|---|---|---|
| **Simple** | um nome → um destino, zero inteligência | impossível anexar | múltiplos IPs no mesmo record = round-robin **aleatório**; IP morto continua sendo servido |
| **Weighted** | proporção = peso / soma dos pesos (inteiro 0–255) | opcional | peso 0 desativa um record; **todos** com peso 0 = distribui igual (safety net) |
| **Latency-based** | menor **latência de rede medida** (condições das últimas semanas) | opcional | a região mais rápida **pode não ser a mais próxima** |
| **Failover** | ativo/passivo, promoção automática | **obrigatório no primário**; secundário **sem** | secundário só entra quando **todos** os primários estão unhealthy |
| **Geolocation** | **origem geográfica da query DNS** (país/continente/estado) | opcional | menor escopo vence; **default record obrigatório** (senão NXDOMAIN silencioso) |
| **Geoproximity** | proximidade **física** de usuário E recurso, com **bias** | opcional | exige **Route 53 Traffic Flow** (custo por policy record) |
| **Multivalue answer** | múltiplos IPs filtrados por saúde | **por IP** (Health Check ID por record A) | máx. **8 records A**; **não é load balancer** |

> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Simple Routing Policy
> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Weighted Routing Policy
> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Latency-Based Routing Policy
> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Failover Routing Policy
> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Geolocation Routing Policy
> fonte: Michael Ellerbeck (Whizlabs) | Latency vs Geoproximity vs Geolocation Routing | seção: Geoproximity Routing
> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Multi-Value Answer Routing Policy

Notas operacionais que as fontes destacam:

- **Weighted** é fase transitória (canary 5–20%, A/B, migração) — após validar, consolide em simple. Não é substituto de failover: um endpoint degradado com peso alto continua recebendo sua fração, porque pesos não detectam falha.
  > fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Weighted Routing (Console)
  > fonte: desconhecido (tutorial AWS) | AWS Route 53 policies Tutorial | trecho: "to test out changes and collect user feedback"
- **Failover** tem health check assimétrico — o primário referencia o Health Check ID na criação (crie o health check **antes** dos records); o secundário **não** recebe health check (ativa pela lógica primário-unhealthy). Failover DNS sozinho não é HA: exige replicação de dados multi-região e deploys sincronizados, senão você troca o servidor mas o dado recente fica inacessível.
  > fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Failover Routing (Console)
  > fonte: desconhecido (tutorial AWS) | AWS Route 53 policies Tutorial | trecho: "e-commerce site such as amazon.in or flipkart.com never have downtime"
- **Geolocation** serve compliance/idioma/moeda/residência de dados (GDPR/LGPD) — não performance, e **não é geofencing de segurança** (roteia por IP da query, contornável com VPN). DNS reforça compliance mas não basta: banco e processamento também precisam estar na região correta.
  > fonte: Michael Ellerbeck (Whizlabs) | Latency vs Geoproximity vs Geolocation Routing | seção: Geolocation Routing
  > fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Geolocation Routing (Console)

### A confusão clássica: geolocation × latency × geoproximity

As três parecem "rotear pelo lugar do usuário", mas usam **critérios diferentes** — tratá-las como equivalentes é o erro mais caro do Route 53.

| Política | Critério de decisão | O que decide o roteamento |
|---|---|---|
| **Latency-based** | latência de **rede real** (condições das últimas semanas) | a região com menor *lag* — pode não ser a mais próxima |
| **Geoproximity** | localização **física** do usuário E do recurso, com **bias** | proximidade geográfica ajustável; exige Traffic Flow |
| **Geolocation** | **origem geográfica da query DNS** (país/continente/estado) | regra geográfica explícita; exige default record |

> fonte: Michael Ellerbeck (Whizlabs) | Latency vs Geoproximity vs Geolocation Routing | seção: Summary

Os dois equívocos nomeados explicitamente:

- **Geoproximity ≠ latency:** "mais próximo geograficamente" **não** implica "menor latência" — a topologia de rede inverte (o usuário africano chega à Irlanda em ~54 ms vs ~300 ms para us-east-1).
- **Geolocation ≠ performance:** a localização da query DNS não garante a menor latência; geolocation otimiza *conformidade/controle*, não tempo de resposta.
  > fonte: Michael Ellerbeck (Whizlabs) | Latency vs Geoproximity vs Geolocation Routing | seção: Summary

### Multivalue ≠ load balancer (o caveat central)

Multivalue answer retorna múltiplos IPs filtrando para incluir **apenas os saudáveis** (cada record A tem seu próprio Health Check ID) — diferente de simple com múltiplos IPs, que devolve todos sem verificação. É uma melhoria de **disponibilidade via DNS**, não um substituto de ALB/NLB: não replica sticky sessions, terminação SSL, health checks sofisticados nem roteamento por path/header. Limite de **8 records A** por query — se o pool saudável pode exceder 8, use um load balancer real. Sem health checks associados, multivalue degenera para "simple com múltiplos IPs".

> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Multi-Value Answer Routing Policy

### Árvore de decisão

```
Quantos destinos e qual o critério de escolha?
│
├── Exatamente UM destino, sem HA nem otimização?
│     → SIMPLE
│       (múltiplos IPs no mesmo record = round-robin aleatório, SEM health check)
│
├── Preciso de ALTA DISPONIBILIDADE / zero-downtime (ativo + standby)?
│     → FAILOVER (active-passive)
│       health check OBRIGATÓRIO no primário; secundário SEM health check.
│       active-active = todos servem, exclui os unhealthy.
│       (failover/multivalue REQUEREM health checks — mecânica em §9)
│
├── Preciso dividir tráfego em PROPORÇÃO controlada (canary / A/B / migração)?
│     → WEIGHTED  (peso inteiro 0–255; proporção = peso / soma dos pesos)
│       peso 0 = desativa um; TODOS peso 0 = distribui igual.
│       NÃO faz failover (sem detecção de falha).
│
├── Preciso de MÚLTIPLOS IPs filtrados por saúde, sem load balancer?
│     → MULTIVALUE ANSWER  (máx. 8 records A; health check por IP)
│       NÃO é load balancer — sem sticky session / SSL / path routing.
│
└── O critério é GEOGRÁFICO / de PERFORMANCE? → desambiguar:
      │
      ├── Quero a região com MENOR LATÊNCIA DE REDE (lag)?
      │     → LATENCY-BASED   (pode não ser a região mais próxima)
      │
      ├── Quero controle por PROXIMIDADE FÍSICA com ajuste fino (bias)?
      │     → GEOPROXIMITY   (exige Route 53 Traffic Flow)
      │
      └── Quero controle por PAÍS/REGIÃO de origem da query
          (compliance, idioma, moeda, residência de dados)?
            → GEOLOCATION   (default record OBRIGATÓRIO;
                             menor escopo geográfico vence;
                             NÃO é geofencing de segurança — VPN burla)
```

> fonte: Michael Ellerbeck (Whizlabs) | Latency vs Geoproximity vs Geolocation Routing | seção: Summary
> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Multi-Value Answer Routing Policy

---

## 9. Health Checks, TTL & Hosted Zones

Os mecanismos operacionais por trás das políticas de §8 e a fronteira de exposição (quem enxerga o nome). Health check e TTL fazem failover/multivalue funcionarem; hosted zones decidem se um nome resolve para a internet ou só dentro do VPC.

### Health checks

Um health check do Route 53 monitora **continuamente** um endpoint. No console: criar com nome descritivo e o endpoint como **URL completa com o path de health** (ex.: `https://54.123.45.67/health`); intervalo, threshold de falhas e regiões de verificação controlam a sensibilidade — e têm cobrança adicional.

> fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Failover Routing (Console)

Três fatos que governam o uso correto:

- **Ordem importa** — o record primário de failover referencia o Health Check ID **no momento da criação**. Crie o health check **antes** dos records DNS.
- **Assimetria do failover** — primário: associar Health Check ID (obrigatório); secundário: **não** associar (ativa automaticamente quando o primário fica unhealthy). Custo silencioso: o Route 53 não verifica se o backup está saudável antes de rotear para ele.
  > fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Failover Routing (Console)
- **Health check por IP no multivalue** — cada record A carrega seu próprio Health Check ID; só os IPs cujo check passa entram na resposta DNS. É o que separa multivalue de simple, que não suporta health check de jeito nenhum.
  > fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Multi-Value Answer Routing Policy
  > fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Simple Routing Policy

**Fail-open** é o comportamento não-óbvio que evita blackout de DNS. Quando **todos** os targets de um record set falham, o Route 53 pode **manter os registros ativos** em vez de devolver resposta vazia. A razão é a **falha correlacionada**: uma dependência compartilhada pode derrubar todos os health checks por falso-positivo (o mesmo vale para NLB/ALB). O trade-off é honesto — fail-open pode **mascarar uma falha real** de todos os endpoints enquanto ativo.

> fonte: David Yanacek | Implementing health checks | seção: Modo de falha aberta

Regra de decisão: se os health checks testam **dependências compartilhadas** entre todos os endpoints, habilite fail-open; se testam só **recursos locais**, é opcional. E **sempre** teste o cenário de falha **parcial** (gray failure) — fail-open dispara em falha total simultânea, não em oscilação parcial, onde a automação pode até piorar a disponibilidade.

> fonte: David Yanacek | Implementing health checks | seção: Modo de falha aberta

### TTL — o piso de propagação

O TTL é o **outro relógio** do roteamento. Toda resposta do Route 53 vem com um TTL; o tempo de failover é **TTL do DNS + frequência do health check** atuando em série — o health check detecta a falha, o TTL decide quanto tempo os resolvers ainda servem a resposta antiga em cache. Um TTL alto prolonga a janela em que clientes continuam indo ao primário morto mesmo após o Route 53 já ter promovido o secundário.

> fonte: Pythalic | Choosing a Route 53 Routing Policy | seção: Failover Routing Policy

> **Nota honesta de corpus:** as fontes cobrem TTL como **valor por record** (exemplo de 60s no multivalue) e como **co-determinante do tempo de failover**, mas **não** trazem número canônico de "TTL alto vs baixo" nem detalhe de propagação de nameserver — esta seção não inventa faixas. O princípio acionável: **o TTL é o teto inferior da latência de qualquer mudança de roteamento que dependa de health check.**

### Public × private hosted zones

Uma hosted zone é o contêiner de registros de um domínio. A pergunta que ela responde não é "como roteio?" (isso são as políticas de §8) e sim **"este nome é resolvível de onde?"**. Public e private não competem — cobrem audiências diferentes.

| Eixo | Public hosted zone | Private hosted zone |
|---|---|---|
| Quem resolve | Qualquer um na internet | Só clientes **dentro do VPC** |
| Aponta para | IP **público** (servidor, load balancer) | IP **privado** do recurso |
| Caso típico | Front-end / API exposta ao usuário externo | DB, cache, microsserviços internos |
| Domínio típico | `mecloud.dev` (público, registrado) | `mecloud.local` (interno) |

> fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Public vs Private Hosted Zones

A regra base é binária: **acessível da internet → public; interno ao VPC → private.** Criar uma public zone gera SOA + NS automáticos; a delegação só fecha apontando os name servers do *registrar* para os NS gerados pelo Route 53. A private zone tem um segundo uso além de privacidade: é **camada de desacoplamento** — referencie o **nome** interno em vez de hard-codar o IP privado; se o IP mudar, atualiza-se só o registro DNS, sem tocar no código.

> fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Public vs Private Hosted Zones
> fonte: McLeod Academy | Master AWS Route 53: Hands-On Geolocation, Weighted & Failover Routing | seção: Creating a Public Hosted Zone (Console)

**Split-horizon** é onde os dois tipos se cruzam: o **mesmo nome resolve diferente** conforme a origem da query — dentro do VPC cai na private (IP privado), fora dela cai na public (IP público).

> **Nota honesta de corpus:** o termo "split-horizon" **não aparece** nos átomos desta onda, e nenhum descreve hospedar o mesmo FQDN nas duas zonas simultaneamente. O parágrafo acima é a leitura direta que as duas definições suportam — **inferência rotulada**, não fato citado. O corpus também **não** traz a mecânica de resolução interna de uma private zone (associação VPC, `enableDnsHostnames`/`enableDnsSupport`, resolver `.2`); não preenchido com conhecimento geral de AWS.

---
name: infrastructure
description: "Roteiro de decisão de infraestrutura e deploy: faz até 3 perguntas que só o usuário sabe, mostra 2 ou 3 opções com prós, contras e custo, recomenda e registra a escolha. Use ao decidir hospedagem, domínio e DNS, certificado SSL/TLS, compute na AWS, como fazer o deploy, deploy sem derrubar o app, health check ou segredos de produção — por conceito ou por nome (Route 53, CloudFront, S3, Docker, Kubernetes, PM2, Let's Encrypt, blue-green, CI/CD)."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch, AskUserQuestion
argument-hint: "[decisão de infraestrutura ou cenário de deploy]"
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

# Infraestrutura — Roteiro de Decisão

Decidir onde o sistema roda, como chega ao usuário e como é atualizado sem cair. A skill **conduz a decisão**: pergunta o que só o usuário sabe (orçamento, quem cuida do servidor, quanta queda é aceitável), mostra as opções com prós e contras em português simples e registra a escolha. O papel é orientar, não configurar tudo; para implementar depois, direcione para `/anti-vibe-coding:tdd-workflow`.

## Como Operar

1. **Diga a decisão em uma frase**, sem jargão: "Vamos decidir onde a API do quiz vai rodar."
2. **Leia o projeto antes de perguntar** (`Read`, `Grep`): `Dockerfile`, arquivos de deploy, `.env.example`, configuração do provedor. Depois **faça até 3 perguntas numa tela só** (`AskUserQuestion`, uma pergunta por item), só do que o usuário sabe: quanto pode gastar, quem vai cuidar do servidor, quanta queda é aceitável.
3. **Mostre 2 ou 3 opções**, cada uma com: o que é (uma linha), prós, contras, custo (por mês e de manutenção) e quando seria a escolha errada.
4. **Recomende uma**, ligando a recomendação às respostas dele: "Recomendo a PaaS porque você disse que ninguém vai cuidar de servidor."
5. **Se o usuário não souber responder**, use o padrão de um sênior para aquela decisão (catálogo abaixo) e diga qual usou e o que mudaria a resposta.
6. **Registre a escolha** (seção Registro) e só então encerre.

Quando a recomendação terminar numa ação que o agente **não pode** executar (apontar o nameserver no registrador, revelar uma chave num painel, aprovar um certificado, criar a zona num console), ofereça `/anti-vibe-coding:wizard`: ele gera um script que abre cada URL, diz o que clicar e grava o que for capturado. Gerar o script é decisão do humano.

Pedido de explicação completa ou de aprofundamento ("me explica de verdade", "quero o texto completo"): leia `references/guia-completo.md`, e o arquivo do tópico quando houver. Esse texto longo só é lido quando o usuário pedir; o roteiro não depende dele.

## Catálogo de decisões

Cada bloco diz o que perguntar, as opções, o padrão de um sênior e quando ele erra. Use o bloco da decisão em discussão; não percorra todos.

### Onde hospedar
- **Perguntas:** (1) O que vai ao ar: site estático, API ou aplicação completa? (2) Quanto pode gastar por mês, e quem vai cuidar do servidor (ninguém, você, um dev)? (3) Quanta gente usa ao mesmo tempo no pico, hoje?
- **Opções:** A) PaaS (Vercel, Railway, Render, Fly.io): ninguém cuida de servidor. B) VPS (Hetzner, Hostinger): barato, mas alguém cuida. C) Nuvem com containers (AWS ECS, Cloud Run, Kubernetes).
- **Padrão:** o mais simples que resolve. Site estático: Vercel, Netlify ou Cloudflare Pages. Solo ou MVP: VPS de 5 a 10 por mês, ou PaaS. Time pequeno: PaaS. Containers em nuvem só com escala comprovada. Serverless só para funções pontuais, nunca para API completa com banco.
- **Errada quando:** Kubernetes sem saber quantas requisições por segundo existem hoje; serverless na frente de banco relacional (cold start mais conexões estouradas).
- **Referência:** `references/dns-hosting.md` (seção Hosting)

### Domínio e DNS
- **Perguntas:** (1) Onde o domínio foi comprado? (2) O projeto já usa AWS? (3) Vai precisar criar registros automaticamente, por API (um subdomínio por cliente)?
- **Opções:** A) Cloudflare Free: DNS, CDN e SSL grátis. B) Route 53: nativo da AWS, com API. C) Ficar no DNS do registrador.
- **Padrão:** projeto pessoal ou simples: Cloudflare Free. Já usa AWS: Route 53. Registrador (onde se compra) e provedor de DNS (onde se gerencia) podem ser diferentes: comprar num e apontar os nameservers para outro é comum.
- **Errada quando:** DNS do registrador sem API quando a automação é requisito.
- **Referência:** `references/dns-hosting.md`

### Alta disponibilidade e roteamento por DNS
- **Perguntas:** (1) Se o servidor principal cair, quanto tempo o sistema pode ficar fora? (2) Os usuários estão em mais de um país ou região? (3) Quer liberar a versão nova para uma parte dos usuários primeiro?
- **Opções:** A) Simple: um recurso, sem lógica. B) Failover: primário e reserva, com health check. C) Weighted (dividir tráfego para teste) ou latency-based (várias regiões).
- **Padrão:** Simple até precisar de mais. Failover sempre com health check. Geolocation (de onde vem a consulta), latency-based (que região responde mais rápido) e geoproximity (distância com ajuste) são coisas diferentes. Multivalue não substitui balanceador.
- **Errada quando:** failover sem health check (não troca quando precisa); confundir geolocation com latência.
- **Referência:** `references/dns-hosting.md` §8 e §9

### Certificado SSL/TLS
- **Perguntas:** (1) Onde fica o site ou a API: Vercel, VPS, AWS, atrás da Cloudflare? (2) Há exigência de compliance que peça certificado pago (EV)? (3) Quem renova quando expirar?
- **Opções:** A) Let's Encrypt: grátis, vale 90 dias, renova sozinho pelo certbot. B) O do provedor: Cloudflare SSL ou AWS ACM. C) Certificado pago.
- **Padrão:** HTTPS sempre. B se já usa Cloudflare ou AWS; A em VPS, com a renovação automática configurada; C só por compliance.
- **Errada quando:** renovação manual (expira num feriado); certificado pago "por segurança", sem exigência.
- **Referência:** `references/dns-hosting.md` (seção SSL/TLS)

### Compute na AWS
- **Perguntas:** (1) É uma função pontual (webhook, evento) ou uma aplicação que roda o tempo todo? (2) Alguém vai administrar o servidor (atualizar o sistema operacional)? (3) A aplicação conversa muito com o banco?
- **Opções:** A) Lambda: serverless, paga por uso. B) EC2: máquina virtual, controle total. C) ECS Fargate ou App Runner: container gerenciado.
- **Padrão:** função pontual: Lambda. Aplicação com uso intenso de banco: servidor (EC2) ou container gerenciado. Quem não quer cuidar de sistema operacional: C.
- **Errada quando:** Lambda para API com banco em uso intenso; EC2 sem ninguém para manter.
- **Referência:** `references/dns-hosting.md` (seção AWS)

### Como fazer o deploy
- **Perguntas:** (1) Em que vai rodar: VPS com Node, containers ou PaaS? (2) O ambiente na sua máquina precisa ser igual ao de produção? (3) Sobe mais de uma peça junto (app, banco, fila)?
- **Opções:** A) PM2 numa VPS (modo cluster e reload sem queda). B) Docker, com `docker-compose` para várias peças. C) Orquestração (Kubernetes), ou deixar a PaaS cuidar.
- **Padrão:** Node simples em VPS: PM2. Ambiente reproduzível: Docker. Vários containers: Compose; Kubernetes só com escala. CI/CD com GitHub Actions (build, teste, deploy). Container nunca roda como root.
- **Errada quando:** Kubernetes sem justificativa; container como root (escapar do container vira root no servidor); deploy manual por SSH sem script.
- **Referência:** `references/deployment-patterns.md`

### Deploy sem derrubar o app
- **Perguntas:** (1) Quanto tempo fora do ar é aceitável num deploy: zero, segundos, minutos? (2) Se a versão nova quebrar, em quanto tempo precisa voltar à anterior? (3) Quantas instâncias rodam hoje?
- **Opções:** A) Reiniciar, aceitando uma queda curta. B) Rolling update: sobe a nova, confere o health check, desliga a antiga. C) Blue-green: ambiente paralelo, troca o tráfego, e voltar é inverter a troca.
- **Padrão:** todo deploy nasce reversível. B com 2 ou mais instâncias, ou `pm2 reload`. C quando voltar precisa ser instantâneo: valide o ambiente novo com health check na porta privada antes de trocar.
- **Errada quando:** deploy sem plano de volta ("configuro o rollback quando precisar" acontece no meio do incidente); blue-green sem health check antes da troca.
- **Referência:** `references/deployment-patterns.md` (Blue-Green Deploy)

### Health check e prontidão
- **Perguntas:** (1) Do que o serviço depende para funcionar (banco, cache, API externa)? (2) Se uma dependência cair, o serviço deve sair do ar ou seguir parcial? (3) Quem consulta o health check: balanceador, orquestrador, monitor?
- **Opções:** A) Só liveness (`/health`: o processo está vivo?). B) Liveness mais readiness (`/health/ready`, que confere as dependências e responde 503 quando não está pronto). C) B mais degradação graciosa: o serviço segue com capacidade reduzida.
- **Padrão:** todo serviço de produção tem health check. B quando há balanceador ou orquestrador: dependências entram no readiness, não no liveness. Sob carga, o health check é a requisição mais prioritária; nunca o descarte.
- **Errada quando:** sem health check (o balanceador manda tráfego para instância morta, e o deploy sem queda não funciona).
- **Referência:** `references/deployment-patterns.md`; padrões de serviço em `/anti-vibe-coding:defensive-patterns`

### Segredos e variáveis de ambiente em produção
- **Perguntas:** (1) Onde ficam hoje as chaves de produção (código, `docker-compose.yml`, painel do provedor)? (2) Quem tem acesso a elas? (3) Se faltar uma variável, o app falha na hora com mensagem clara ou só depois?
- **Opções:** A) `.env` fora do repositório, com `.env.example` commitado. B) Variáveis no painel do provedor (Vercel, Railway). C) Gerenciador de segredos (AWS Secrets Manager, Vault).
- **Padrão:** nada no código, nada no `docker-compose.yml`. `.env.example` commitado. Variáveis validadas na subida (falha rápido se faltar). B ou C em produção.
- **Errada quando:** segredo no compose "por enquanto" (vira permanente e vaza no git); app que sobe sem a variável e quebra depois, no meio de uma requisição.
- **Referência:** `references/deployment-patterns.md` §5

## Antes de declarar pronto

Antes de dar uma tarefa de infraestrutura como concluída:

- [ ] Health check em todos os serviços (liveness, e readiness onde houver balanceador ou orquestrador).
- [ ] SSL com renovação automática configurada (timer do certbot, ACM ou Cloudflare).
- [ ] Segredos num gerenciador ou em `.env` fora do repositório; nada escrito no código.
- [ ] Caminho de volta (rollback) definido e testado.
- [ ] Deploy sem queda (rolling, blue-green ou `pm2 reload`), não reinício com janela fora do ar.
- [ ] Variáveis de ambiente validadas na subida (falha rápido se faltarem).

## Registro

Depois que o usuário escolher, registre numa destas duas:

- **Há uma feature em andamento** (`docs/exec-plans/active/<pasta>/DESIGN.md`; se houver mais de uma, pergunte qual): acrescente uma linha na tabela `## Decisões` — `| N | decisão | opções | escolha | por quê |`. Escreva o "por quê" com as respostas do usuário.
- **A decisão vale para o projeto inteiro** (onde hospedar, provedor de DNS, estratégia de deploy) **ou não há feature em andamento:** crie um ADR com `/anti-vibe-coding:decision-registry`.

## Regras do consultor

1. Tecnologia chata primeiro: prove que a solução simples não funciona antes de adotar complexidade.
2. Custo importa: uma VPS barata resolve a maioria dos casos de quem está começando.
3. Questione a escala antecipada: "precisa de Kubernetes?" vem depois de "quantas requisições por segundo existem hoje?".
4. Nuvem não é obrigatória: VPS com PM2 ou Docker resolve problemas reais por uma fração do custo.
5. Serverless tem limite: não serve para API completa com banco de dados.

$ARGUMENTS

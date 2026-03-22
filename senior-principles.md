# Conhecimento Senior (Principios Always-On)

Principios extraidos de 60+ documentos tecnicos. Detalhes completos nas skills dedicadas.

## Seguranca (Obrigatorio)
- Senhas: bcrypt/Argon2 (NUNCA MD5/SHA1 — sao quebrados e reversiveis em segundos com rainbow tables. NUNCA encriptar senhas — encriptacao e reversivel, hashing e irreversivel)
- IDs publicos: UUIDs (NUNCA sequenciais sem auth — permitem enumeration attacks: iterar /users/1, /users/2...)
- Secrets: .env + .gitignore (NUNCA hardcoded — um commit acidental expoe credenciais permanentemente no historico git)
- Inputs: sanitizar TUDO (ORM, nao SQL raw — SQL injection e a vulnerabilidade mais explorada do OWASP Top 10)
- Comparacoes sensiveis: constant-time (`crypto.timingSafeEqual`) — comparacao normal vaza timing que permite extrair dados byte a byte
- Regex: evitar quantificadores nesteados (ReDoS causa backtracking exponencial que trava o servidor)
- Webhooks: SEMPRE validar HMAC signature — sem validacao, qualquer pessoa pode forjar requests
- Authorization: RBAC padrao, middleware centralizado, IDOR prevention
- Auth Methods: PKCE para SPAs, httpOnly cookies para refresh tokens, NUNCA localStorage — vulneravel a XSS que rouba tokens
- API Security: Rate limiting 3 niveis, CSRF tokens, WAF, CORS restritivo
> Detalhes: `/anti-vibe-coding:security`

## Qualidade de Codigo
- **9 Code Smells**: funcoes longas, God Objects, DRY 3+, condicionais gigantes, numeros magicos, Feature Envy, grupos de dados, comentarios inuteis, tipos primitivos
- Erros: Result Pattern `(error, value)` > try/catch generico — try/catch generico engole erros e dificulta debugging
- Logs: Wide Events (1 evento rico/request), NUNCA console.log em prod — logs fragmentados sao impossiveis de correlacionar em escala
- Tipos: criar tipos de dominio (Email, Money) com validacao na construcao
> Detalhes: `/anti-vibe-coding:design-patterns`

## Arquitetura de Dados
- **CAP**: financeiro -> CP (consistencia), feed social -> AP (disponibilidade)
- **Cache**: cache-aside + TTL + invalidacao. Hit rate >= 85%
- **N+1**: NUNCA lazy loading em loops — gera N+1 queries que escalam linearmente com os dados
- **BD**: comece relacional (PostgreSQL). NoSQL so com problema comprovado
- **Escalar**: otimize queries -> replicacao -> sharding (ultimo recurso)
> Detalhes: `/anti-vibe-coding:system-design`

## API Design
- **Idempotencia**: obrigatoria para financeiro (UUID por request)
- **DTOs**: input (sem ID), output (sem senha). Validacao SEMPRE no back-end
- **REST vs GraphQL**: REST padrao; GraphQL para times distribuidos
- **API Protocols**: HTTP/REST 90%, WebSocket real-time, gRPC server-to-server, AMQP filas
- **GraphQL**: depth limits obrigatorios, DataLoader para N+1, input types para mutations
- **REST**: nouns nao verbs, pagination SEMPRE, status codes semanticos, versionamento /api/v1/
- Monolito primeiro. Microservicos so com problema comprovado
> Detalhes: `/anti-vibe-coding:api-design`

## JavaScript/TypeScript
- `const` > `let` >> NUNCA `var` — var tem escopo de funcao e hoisting, causa bugs sutis
- `Promise.all` para operacoes independentes (nao await sequencial)
- Closures: extrair minimo necessario, WeakMap para caches
- React: NUNCA useEffect para estado derivado — calcule na renderizacao, useEffect causa re-renders extras desnecessarios
- Race conditions: Node.js NAO e imune (Cluster, async, horizontal scaling)
> Detalhes: `/anti-vibe-coding:react-patterns`

## Infraestrutura
- **Load Balancer**: 7 algoritmos (Round Robin, Least Connections, Consistent Hashing...)
- **CDN**: Edge servers + Anycast routing, TTL por tipo de conteudo, cache busting
- **Serverless vs Serverfull**: Lambda para webhooks/eventos, VPS/EC2 para carga constante
- **Cold Start**: Node.js/Python mais rapidos, Provisioned Concurrency quando necessario
- **Deploy**: PM2, Docker, health checks, zero-downtime
> Detalhes: `/anti-vibe-coding:infrastructure`

## Design & SOLID
- **SRP**: cada classe com 1 responsabilidade (7/10 importancia)
- **LSP**: subtipos SEMPRE substituem tipos pai (10/10 — inviolavel)
- **Lei de Demeter**: nao navegue profundo (`order.customer.address.zip` -> `order.shippingZip()`)
- **Tell-Don't-Ask**: `account.withdraw(amount)` > `if balance > amount: debit`
- **Composicao > Heranca**: protocolos/interfaces > hierarquias profundas
> Detalhes: `/anti-vibe-coding:architecture`

> **Rules automaticas** detectam violacoes silenciosamente ao editar arquivos. Veja `.claude/rules/`.

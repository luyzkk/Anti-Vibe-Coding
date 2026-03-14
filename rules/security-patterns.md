# Security Patterns — Anti-Vibe Coding

Estas regras carregam automaticamente ao editar arquivos que lidam com autenticacao, criptografia e seguranca.

## Criptografia e Hashing

- Senhas: SEMPRE bcrypt ou Argon2 (>= 100ms em producao)
- NUNCA MD5, SHA1, SHA256 puro para senhas (sao rapidos demais = vulneraveis)
- Encriptacao reversivel (AES-256) SÓ para dados que precisam ser decriptados
- NUNCA encripte senhas — hashing e irreversivel, encriptacao nao e
- Salt aleatorio UNICO por usuario (KDFs modernos geram automaticamente)
- HMAC para autenticacao de mensagens (nao `hash(secret + msg)`)

## Autenticacao

- 2FA via TOTP (RFC 6238) como padrao. NUNCA SMS como fator primario (SIM swap)
- Comparacoes de senhas/tokens: `crypto.timingSafeEqual()` (constant-time)
- NUNCA compare strings sensíveis com `===` (timing attack)
- Defaults seguros: 2FA habilitado por padrao, senhas mascaradas por padrao

## IDs e Exposicao de Dados

- APIs publicas: UUIDs (NUNCA IDs sequenciais sem autenticacao)
- S3/storage: SEMPRE privado + presigned URLs com TTL (NUNCA bucket publico)
- Respostas de API: NUNCA expor stack traces, IDs internos, ou tokens
- Logs: NUNCA logar senhas, tokens, dados sensiveis

## Secrets e Credenciais

- Credenciais em `.env` + `.gitignore` (NUNCA hardcoded no codigo)
- `.env.example` commitado SEM valores reais
- Producao: Secrets Manager (AWS, GCP, Vault) ou variaveis de ambiente
- Grep no git history: `git log -S "API_KEY"` para detectar vazamentos

## Validacao de Input

- TODA entrada do usuario e potencialmente maliciosa
- SQL: SEMPRE use ORMs/query-builders (NUNCA concatene SQL manualmente)
- XSS: NUNCA use `innerHTML` sem sanitizacao
- Regex: evitar quantificadores nesteados `(a+)+` (ReDoS)
- Grupos atomicos `(?>...)` para prevenir backtracking catastrofico
- Email: regex simples no front + lib no back + confirmacao obrigatoria

## Webhooks

- SEMPRE validar HMAC signature antes de processar
- Rejeitar requests sem assinatura ou assinatura invalida
- NAO confiar em IP ou User-Agent como autenticacao

## Principio do Menor Privilegio

- DB em VPC privada, acesso via bastion host
- Usuarios com permissoes minimas necessarias
- Cada servico com credenciais proprias (nao compartilhadas)

## Autorizacao

- RBAC/ABAC centralizado em middleware (NUNCA checks de role espalhados em handlers)
- Pattern correto: `app.use('/admin', requireRole('admin'))` em vez de `if (user.role === 'admin')` em cada handler
- IDOR (Insecure Direct Object Reference): SEMPRE filtre queries pelo usuario autenticado
  - ERRADO: `db.findById(req.params.id)`
  - CORRETO: `db.findOne({ id: req.params.id, userId: req.user.id })`
- Principio do menor privilegio: roles devem ter permissoes minimas necessarias
- NUNCA aceite `role` ou `isAdmin` via request body (escalacao de privilegios)
- Endpoints que modificam permissoes devem exigir role superior (admin nao pode promover a super-admin)

## Seguranca de API

- Rate limiting em 3 niveis:
  - **Endpoint**: limites especificos para endpoints criticos (login, signup, reset-password)
  - **Usuario/IP**: limite global por usuario autenticado ou IP
  - **Global**: limite total do sistema para prevenir DDoS
- CSRF: tokens + cookies com `SameSite=Strict` (ou `Lax` como minimo)
- NUNCA confie apenas em SameSite — use tokens CSRF como segunda camada
- CORS: NUNCA `origin: '*'` em APIs com autenticacao. Liste origens permitidas explicitamente
- WAF (Web Application Firewall): recomendado em producao para protecao adicional (Cloudflare, AWS WAF)
- Headers de seguranca: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`

## Metodos de Autenticacao

- SPAs: SEMPRE OAuth2 com PKCE (`response_type=code` + `code_challenge`)
- NUNCA implicit flow (`response_type=token`) — token exposto na URL
- Refresh tokens: SEMPRE em httpOnly cookies (NUNCA localStorage ou sessionStorage)
- Access tokens: curta duracao (15min), refresh tokens: longa duracao (7-30 dias) com rotacao
- Logout: DEVE invalidar sessao/token no servidor (blacklist ou rotacao)
- NUNCA logout apenas no client (remover cookie/localStorage nao invalida o token)
- Session fixation: regenerar session ID apos login bem-sucedido

## Anti-Patterns de Seguranca

- Encriptar senhas com AES (ponto unico de falha)
- Base64 como "encriptacao" (e apenas encoding)
- Confiar em validacao apenas no front-end
- Ignorar OWASP Top 10
- Desabilitar Secure Boot ou TPM
- Checks de role dentro de handlers (nao centralizado)
- `findById` sem filtro de usuario (IDOR)
- Refresh token em localStorage (XSS = roubo de sessao)
- JWT sem expiracao (token eterno)
- Logout que apenas remove token do client
- CORS com `origin: '*'` em APIs autenticadas
- Rate limiting ausente em endpoints de autenticacao

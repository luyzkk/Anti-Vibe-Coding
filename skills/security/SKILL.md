---
name: security
description: "This skill should be used when the user asks about 'security', 'cryptography', 'hashing passwords', 'bcrypt vs argon2', '2FA', 'TOTP', 'HMAC validation', 'webhook security', 'ReDoS', 'email validation', 'CORS', 'SQL injection', 'timing attacks', 'RBAC', 'ABAC', 'ACL', 'authorization', 'OAuth2', 'PKCE', 'refresh token', 'session management', 'SSO', 'SAML', 'OpenID Connect', 'rate limiting', 'WAF', 'CSRF', 'DDoS', 'API security', or needs a security audit. Provides expert consultation on application security, cryptography, authentication, authorization, API security, and secure coding practices."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, WebSearch
argument-hint: "[security question or module to audit]"
---

# Consultor de Seguranca — Anti-Vibe Coding

Modo Consultor de Seguranca. **ENSINAR** conceitos e **AUDITAR** codigo existente. NAO gerar codigo de producao — explicar, identificar vulnerabilidades e recomendar correcoes.

<instructions>
## Como Operar

1. **Identificar o topico** de seguranca na consulta
2. **Explicar o conceito** com linguagem acessivel
3. **Mostrar o anti-pattern** (o que NAO fazer)
4. **Explicar como verificar** se o codigo esta seguro
5. **Recomendar a correcao** sem gerar codigo completo

> **Regra:** Se o desenvolvedor pedir "implementa", redirecionar para o TDD workflow com `/anti-vibe-coding:tdd-workflow` apos a consultoria.
</instructions>

---

## 1. Criptografia

> Referencia completa: `references/cryptography.md`

<constraints>
- **NUNCA encriptar senhas** — encriptacao (AES) e reversivel. Hashear com bcrypt/Argon2 (irreversivel)
- **MD5/SHA1 estao QUEBRADOS** — reversiveis em segundos com rainbow tables. Usar SHA-256 ou SHA-3
- **HMAC, nao hash simples** — `hash(secret + message)` e vulneravel a length extension attack. Usar `crypto.createHmac()`
- **Salt aleatorio UNICO por usuario** — salt fixo ou compartilhado permite rainbow tables
- **KDF hierarquia:** Argon2id > bcrypt > scrypt > PBKDF2 (ultimo recurso)
- **Hash de senha >= 100ms** — se instantaneo, parametros estao fracos
- **Base64 NAO e encriptacao** — e encoding, qualquer pessoa decodifica sem chave
- **AES-GCM > CBC > ECB** — ECB e INSEGURO (padroes repetidos expostos). CBC sem HMAC e vulneravel a padding oracle
- **Ed25519 > RSA** para SSH e assinaturas — mais rapido, seguro e chaves menores
- **Forward Secrecy:** Usar ECDHE em TLS — se chave privada vazar, comunicacoes passadas permanecem seguras
</constraints>

<verification>
```
# Buscar senhas sendo encriptadas (deve retornar 0 resultados)
grep -r "encrypt.*password\|cipher.*password\|AES.*password"

# Buscar hashes inseguros (deve retornar 0 resultados)
grep -r "createHash.*md5\|createHash.*sha1"

# Buscar Base64 como "protecao" no contexto de senhas/secrets
grep -r "btoa\|atob\|base64"

# Buscar ECB (deve retornar 0 resultados)
grep -r "ECB\|aes-128-ecb\|aes-256-ecb"
```
</verification>

---

## 2. Autenticacao

> Referencia completa: `references/authentication.md`

<constraints>
- **TOTP obrigatorio para 2FA** — SMS e vulneravel a SIM swap e SS7 attacks. SMS aceitavel apenas como fallback
- **Senhas: 12+ chars minimo, sem max restritivo** — aceitar ate 128+ chars. bcrypt trunca em 72 bytes, usar pre-hashing se necessario
- **Leet speak NAO adiciona seguranca** — `P@$$w0rd` esta em todos os dicionarios. Comprimento aleatorio e o que importa
- **Salt aleatorio torna rainbow tables inuteis** — bcrypt/Argon2 geram salt automaticamente
- **Rate limiting em login:** 5 tentativas/minuto, lockout progressivo
- **Tokens de sessao:** TTL + rotacao. Invalidar no logout
</constraints>

<context>
**Infraestrutura obrigatoria:**
- FDE (Full Disk Encryption) em TODOS os dispositivos: BitLocker / FileVault / LUKS
- VPN obrigatoria em redes publicas. WireGuard > OpenVPN > IPSec
- TPM + Secure Boot contra rootkits e bootkits
- Backups offsite testados (regra 3-2-1). Snapshots NAO sao backups
</context>

---

## 3. Seguranca de Aplicacoes

> Referencia completa: `references/application-security.md`

<constraints>
- **Minimizar superficie de ataque** — se nao precisa ser publico, NAO expor. Endpoints de admin/debug atras de auth
- **UUIDs para IDs publicos** — IDs sequenciais (`/users/1`, `/users/2`) permitem enumeracao
- **S3/storage SEMPRE privado** — acesso via presigned URLs com TTL curto
- **Menor privilegio** — DB em VPC privada, service accounts com roles minimos, API keys com escopo limitado
- **timingSafeEqual para comparacoes sensiveis** — `===` vaza timing que permite extrair dados byte a byte
- **Defaults seguros** — CORS restritivo, cookies HttpOnly+Secure+SameSite, rate limiting, tudo ON por padrao
- **ORM/prepared statements** — NUNCA SQL com concatenacao/interpolacao de strings (SQL injection e OWASP #1)
- **Secrets em `.env` + `.gitignore`** — NUNCA hardcoded. Usar `git-secrets` ou `gitleaks` como pre-commit hook
</constraints>

<context>
**ReDoS (Regular Expression Denial of Service):**
- Quantificadores nesteados causam backtracking exponencial: `(a+)+`, `(a*)*`, `(\d+\.?\d*)+`
- NUNCA aceitar regex de input do usuario
- Testar com `npx redos-checker "regex"`. Em JS, usar lib `re2` (sem backtracking)

**Validacao de email (4 camadas):**
1. Frontend: regex simples `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (UX)
2. Backend: lib como `zod.string().email()` (RFC compliance)
3. MX check: `dns.resolveMx(domain)` + fallback A record (complementar, NAO substituto)
4. Email de confirmacao com token unico e TTL (prova de posse — unica validacao definitiva)

**Punycode:** Normalizar dominios com `punycode.toASCII()` antes de armazenar. Ataques de homoglyph exploram caracteres visualmente identicos.
</context>

<verification>
```
# Buscar SQL com interpolacao (deve retornar 0 resultados)
grep -rn "query.*\`\|execute.*\`" --include="*.ts"

# Buscar IDs sequenciais expostos
grep -rn "params.id\|req.params" --include="*.ts"
# Verificar se cada um filtra pelo usuario autenticado
```
</verification>

---

## 4. Webhooks

> Referencia completa: `references/webhook-security.md`

<constraints>
- **SEMPRE validar HMAC signature** antes de processar payload
- **Comparar com `timingSafeEqual`** — nunca com `===` (timing attack)
- **Rejeitar requests sem assinatura** — retornar 401/403 imediatamente
- **NAO processar "por via das duvidas"** — sem assinatura valida, nao processar
</constraints>

<example>
**Padrao de validacao:**
1. Extrair signature do header (ex: x-hub-signature-256)
2. Recalcular HMAC do rawBody com secret
3. Comparar com crypto.timingSafeEqual()
4. Rejeitar com 403 se invalido ou ausente
</example>

<verification>
```
# Buscar endpoints de webhook
grep -r "webhook\|/hooks/\|callback"

# Verificar se usam timingSafeEqual (deve existir em cada handler de webhook)
grep -r "timingSafeEqual"
```
</verification>

---

## 5. Modelos de Autorizacao

> Referencia completa: `references/authorization-models.md`

<decision-tree>
Precisa de controle por recurso individual? -> ACL (+ RBAC)
Precisa de atributos alem de roles? -> ABAC
Caso padrao -> RBAC
</decision-tree>

<constraints>
- **RBAC e o padrao** — comece com roles (admin, editor, viewer). Migre para ABAC apenas com necessidade comprovada
- **Middleware centralizado** — NUNCA `if (role === 'admin')` espalhado pelo codigo. Usar middleware `requireRole()`
- **IDOR e vulnerabilidade CRITICA** — toda query DEVE filtrar por `userId` do token autenticado
- **Menor privilegio** — roles minimos necessarios. Admin nao e padrao, viewer e
- **JWT claims alimentam o modelo** — JWT carrega `role`/`permissions`, RBAC/ABAC aplica as regras
- **OAuth2 scopes para terceiros** — definir scopes granulares para acesso delegado
</constraints>

<context>
**Anti-patterns:**
- Verificar apenas se esta logado sem controlar permissoes
- Role explosion (>20 roles sem ABAC)
- IDOR: `findById(id)` sem filtrar pelo usuario autenticado
- Hardcoded role checks espalhados pelo codigo
</context>

<verification>
```
# Buscar queries sem filtro de usuario (IDOR) — cada uma DEVE incluir userId/ownerId
grep -rn "findById\|findOne\|findUnique" --include="*.ts"

# Buscar role checks hardcoded — DEVE estar centralizado em middleware
grep -rn "role.*===\|role.*==" --include="*.ts"
```
</verification>

---

## 6. Metodos de Autenticacao

> Referencia completa: `references/auth-methods.md`

<decision-tree>
API stateless? -> Bearer Token (JWT) + Access/Refresh
Login social? -> OpenID Connect (sobre OAuth2)
Web app tradicional? -> Session-based (Redis)
Machine-to-machine? -> OAuth2 Client Credentials
Ferramenta interna? -> API Key (com expiracao)
</decision-tree>

<constraints>
- **NUNCA localStorage para tokens** — vulneravel a XSS. Refresh token em httpOnly cookie OBRIGATORIO
- **Access token curto (15min-1h)** — limita janela de exposicao se vazado
- **Refresh token com rotacao** — emitir novo a cada uso. Se reutilizado, invalidar TODOS (possivel roubo)
- **PKCE obrigatorio** para SPAs e mobile apps usando OAuth2
- **OpenID Connect para identidade** — OAuth2 access token NAO identifica o usuario, ID token sim
- **Implicit flow e OBSOLETO** — token exposto no fragment da URL. Usar Authorization Code + PKCE
- **Session: Redis como storage** — in-memory perde ao reiniciar, file system nao escala
- **API keys: hash no banco + expiracao + rotacao** — NUNCA plaintext, NUNCA sem expiracao
</constraints>

<context>
**Cookie flags OBRIGATORIAS:**

| Flag | Obrigatorio | Razao |
|------|-------------|-------|
| httpOnly | SIM | Previne acesso via JavaScript (XSS) |
| Secure | SIM | Apenas HTTPS |
| SameSite=Strict/Lax | SIM | Previne CSRF |
</context>

<verification>
```
# Tokens em localStorage — vulnerabilidade CRITICA (deve retornar 0 resultados)
grep -rn "localStorage.*token\|localStorage.*jwt" --include="*.ts" --include="*.tsx"

# Implicit flow — OBSOLETO (deve retornar 0 resultados)
grep -rn "response_type=token" --include="*.ts"
```
</verification>

---

## 7. Seguranca de APIs

> Referencia completa: `references/application-security.md`

<constraints>
- **Rate limiting em 3 niveis:**
  - Por endpoint: limites especificos por rota (ex: `/login` mais restritivo)
  - Por usuario/IP: cada IP tem seu limite (ex: 100 req/min)
  - Global: limite total para proteger contra DDoS distribuido
- **CORS restritivo** — listar dominios EXPLICITOS, NUNCA wildcard `*` para APIs com dados sensiveis
- **CSRF tokens + SameSite cookies** — session cookies sozinhos sao vulneraveis a CSRF
- **WAF (Web Application Firewall)** — filtra trafego malicioso ANTES de chegar a API (AWS WAF, Cloudflare)
- **SQL/NoSQL Injection: ORM/prepared statements** — NUNCA concatenar input do usuario em queries
- **XSS: sanitizar TUDO** — input do usuario nunca renderizado como HTML sem escape. CSP headers como camada extra
- **VPN para APIs internas** — admin dashboards e APIs internas NUNCA expostas publicamente
- **DDoS mitigation** — CDN + rate limiting + WAF como camadas de defesa
</constraints>

<context>
**Defesa em profundidade:** Combinar TODAS as tecnicas. Nenhuma sozinha e suficiente.
</context>

<verification>
```
# Rate limiting existe?
grep -rn "rateLimit\|rate.limit\|throttle" --include="*.ts"

# CORS configurado corretamente? (verificar se origin e explicita, nao '*')
grep -rn "cors\|CORS\|Access-Control" --include="*.ts"

# CSRF tokens implementados?
grep -rn "csrf\|csrfToken\|_csrf" --include="*.ts"
```
</verification>

---

## Checklist de Seguranca Minima

Checklist obrigatoria para auditar qualquer projeto em producao.

<checklist>
### Criptografia e Senhas
- [ ] Senhas hasheadas com bcrypt (rounds >= 12) ou Argon2id
- [ ] NENHUM uso de MD5/SHA1 para seguranca
- [ ] Secrets em `.env` + `.gitignore` (nao hardcoded)
- [ ] Base64 nao usado como "encriptacao"
- [ ] AES-GCM para encriptacao simetrica (nao ECB, nao CBC sem HMAC)

### Autenticacao
- [ ] 2FA disponivel (TOTP preferivel, nao apenas SMS)
- [ ] Senha minima de 12 caracteres, sem max restritivo
- [ ] Rate limiting em login (5 tentativas/minuto)
- [ ] Tokens de sessao com TTL e rotacao

### Aplicacao
- [ ] UUIDs para IDs publicos (nao sequenciais)
- [ ] CORS restritivo (dominios explicitos, nao `*`)
- [ ] Cookies com HttpOnly + Secure + SameSite
- [ ] CSP headers configurados
- [ ] Rate limiting em todos endpoints publicos
- [ ] Nenhuma regex com quantificadores nesteados

### Dados
- [ ] ORM/prepared statements (nao SQL raw com interpolacao)
- [ ] Inputs sanitizados em TODAS as camadas
- [ ] S3/storage privado + presigned URLs
- [ ] Database em rede privada (VPC)
- [ ] Menor privilegio para service accounts e DB users

### Webhooks e APIs
- [ ] HMAC signature validada com timingSafeEqual
- [ ] Requests sem assinatura rejeitados (401/403)
- [ ] Idempotencia em operacoes financeiras
- [ ] Logs de auditoria para operacoes sensiveis

### Infraestrutura
- [ ] FDE ativado em todos os dispositivos
- [ ] Backups offsite testados (regra 3-2-1)
- [ ] VPN obrigatoria para acesso remoto
- [ ] SSH com Ed25519 (nao RSA 2048/DSA)
- [ ] TLS com Forward Secrecy (ECDHE)
</checklist>

---

## Contexto da Consulta

$ARGUMENTS

# Metodos de Autenticacao — Referencia Detalhada

## Visao Geral: Decision Tree

```
Escolhendo metodo de autenticacao:

Ferramenta interna simples?
├─ SIM → API Key (com expiracao e rotacao)
├─ NAO
│   ├─ API publica/stateless?
│   │   ├─ SIM → Bearer Token (JWT)
│   │   │   └─ Precisa de refresh? → Access + Refresh Token
│   │   ├─ NAO
│   │   │   ├─ Web app tradicional?
│   │   │   │   ├─ SIM → Session-based (Redis)
│   │   │   │   ├─ NAO
│   │   │   │   │   ├─ Login social (Google/GitHub)?
│   │   │   │   │   │   ├─ SIM → OpenID Connect (autenticacao + identidade)
│   │   │   │   │   │   ├─ NAO → OAuth2 (apenas autorizacao delegada)
│   │   │   │   │   ├─ Multiplos servicos, login unico?
│   │   │   │   │   │   ├─ SIM → SSO (OpenID Connect ou SAML)
```

---

## Basic Authentication

**O que e:** Username e senha codificados em Base64 no header `Authorization`.

**Seguranca:** INSEGURO. Base64 e trivialmente reversivel. Credenciais enviadas a CADA request.

**Quando usar:** NUNCA em producao publica. Apenas ferramentas internas com HTTPS obrigatorio.

**Anti-patterns:**
- Basic Auth em APIs publicas
- Basic Auth sem HTTPS
- Assumir que Base64 e "encriptacao"

---

## Digest Authentication

**O que e:** Similar ao Basic, mas usa hash MD5 em vez de Base64.

**Seguranca:** OBSOLETO. MD5 e quebrado. Existem opcoes muito melhores.

**Quando usar:** NUNCA em sistemas novos.

---

## API Key Authentication

**O que e:** Chave unica gerada por cliente, enviada via header (`Authorization: ApiKey <key>` ou `X-API-Key`).

**Como funciona:**
1. Gerar chave aleatoria no dashboard
2. Armazenar hash da chave no banco (NUNCA plaintext)
3. Cliente envia chave em cada request
4. Servidor faz lookup do hash para validar

**Diferenca de JWT:** API keys sao strings aleatorias SEM informacao embutida. Requerem lookup no banco.

**Anti-patterns:**
- API key sem expiracao (se vazar, acesso indefinido)
- API key armazenada em plaintext no banco
- Sem rotacao periodica
- Sem scopes/permissoes por key
- API key em query string (`?api_key=xxx`) — aparece em logs e referrer headers

**Recomendacao:** Implementar expiracao, rotacao, scopes e monitoramento de uso anomalo.

---

## Session-based Authentication

**O que e:** Login cria sessao no server, session ID enviado como cookie.

**Fluxo:**
1. `POST /login` com credenciais
2. Servidor valida → cria sessao no Redis
3. `Set-Cookie: session_id=abc123`
4. Cliente envia cookie em cada request
5. Servidor busca sessao no Redis

**Session Storage (decision tree):**

| Storage | Velocidade | Persistencia | Recomendado? |
|---------|-----------|-------------|-------------|
| In-memory (variavel) | Rapido | Perde ao reiniciar | NAO |
| Redis | Rapido | TTL built-in | SIM ✓ |
| SQL database | Lento | Persistente | Backup |
| File system | Lento | Nao escala | NAO |

**Anti-patterns:**
- Session storage in-memory (perde ao reiniciar, nao escala horizontalmente)
- Session sem TTL (sessoes orfas acumulam)
- Session-based auth para APIs distribuidas (nao escala sem Redis centralizado)

---

## Bearer Token (JWT)

**O que e:** Token stateless enviado no header `Authorization: Bearer <token>`. JWT e o formato mais comum.

**Composicao do JWT:**
```
header.payload.signature
```

**Payload tipico:**
```json
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "role": "editor",
  "iat": 1700000000,
  "exp": 1700003600
}
```

**Vantagens:** Stateless (sem lookup no banco), escalavel, self-contained.

**Anti-patterns:**
- JWT sem `exp` (expiracao)
- JWT como UNICO metodo (sem refresh token = login frequente)
- Armazenar JWT em localStorage (vulneravel a XSS)
- JWT com dados sensiveis no payload (payload e Base64, NAO encriptado)
- Nao validar `iss`, `aud`, `alg`
- Aceitar `alg: none` (ataque conhecido)

**Recomendacao:** JWT como access token de curta duracao + refresh token em httpOnly cookie.

---

## Access Token + Refresh Token

**O que e:** Sistema de dois tokens para balancear seguranca e usabilidade.

| Token | Duracao | Armazenamento | Proposito |
|-------|---------|---------------|-----------|
| Access Token | 15min - 1h | Memoria (variavel JS) | Chamadas de API |
| Refresh Token | Dias - Semanas | httpOnly cookie | Renovar access token |

**Fluxo:**
1. Login → recebe access + refresh token
2. Access token usado em cada request de API
3. Access token expira → 401 Unauthorized
4. `POST /token/refresh` com refresh token → novo access token
5. Usuario permanece logado sem novo login

**Regras CRITICAS:**

- **NUNCA armazenar refresh token em localStorage** — vulneravel a XSS
- **httpOnly cookie OBRIGATORIO** para refresh token — nao acessivel via JavaScript
- **SameSite=Strict ou Lax** no cookie — previne CSRF
- **Secure=true** — apenas HTTPS
- **Rotacao de refresh token:** Emitir novo refresh token a cada uso. Invalidar o anterior
- **Familia de tokens:** Se refresh token ja usado for apresentado novamente, invalidar TODOS (possivel roubo)

**Anti-patterns:**
- Refresh token em localStorage (`localStorage.setItem('refreshToken', token)`)
- Access token de longa duracao (>1h)
- Sem rotacao de refresh token
- Sem deteccao de reuso de refresh token

---

## OAuth2

**O que e:** Framework de AUTORIZACAO (NAO autenticacao). Permite que uma app acesse recursos do usuario em outro servico SEM receber credenciais.

### Flows

| Flow | Uso | Seguranca |
|------|-----|-----------|
| Authorization Code + PKCE | Apps publicas (SPA, mobile) | ✓ Recomendado |
| Authorization Code | Apps com backend (server-side) | ✓ Seguro |
| Client Credentials | Machine-to-machine (sem usuario) | ✓ Seguro |
| Implicit | OBSOLETO — substituido por Auth Code + PKCE | ✗ Inseguro |
| Resource Owner Password | OBSOLETO — credenciais diretas | ✗ Inseguro |

### Authorization Code + PKCE (recomendado)

```
1. App gera code_verifier (string aleatoria) e code_challenge (SHA256 do verifier)
2. Redirect → provider /authorize?code_challenge=xxx&response_type=code
3. Usuario autentica e consente
4. Provider retorna authorization_code
5. App troca code + code_verifier por access_token
6. Provider valida SHA256(code_verifier) == code_challenge
7. Retorna access_token (+ refresh_token se solicitado)
```

**Por que PKCE:** Previne interceptacao do authorization code. OBRIGATORIO para SPAs e mobile apps.

**Anti-patterns:**
- Usar Implicit flow (token exposto no fragment da URL)
- OAuth2 sem PKCE para apps publicas
- Assumir que access token do OAuth2 identifica o usuario (identidade = OpenID Connect)

---

## OpenID Connect (OIDC)

**O que e:** Camada de AUTENTICACAO sobre OAuth2. Adiciona ID Token (JWT com identidade) ao access token.

**Diferenca de OAuth2:**
- OAuth2: access token = "este app pode acessar seus repos" (autorizacao)
- OIDC: ID token = "este usuario e joao@example.com" (autenticacao)

**Fluxo:**
1. Mesmo flow do OAuth2 (Authorization Code + PKCE)
2. Provider retorna access_token + **id_token**
3. ID token e um JWT contendo: email, user_id, name, picture
4. App valida assinatura do ID token
5. App cria sessao propria baseada na identidade

**Quando usar:** "Sign in with Google/GitHub/Microsoft". E o padrao moderno para login social.

---

## SSO (Single Sign-On)

**O que e:** Padrao de UX (NAO metodo de autenticacao) que permite login unico para acessar multiplos servicos.

**Como funciona:**
1. Login no Identity Provider (IdP)
2. IdP cria sessao global + cookie SSO
3. Ao acessar outro servico, cookie SSO e verificado
4. Se sessao valida, acesso concedido sem novo login

**Protocolos:**

| Protocolo | Formato | Uso |
|-----------|---------|-----|
| OpenID Connect | JSON/JWT | Moderno, recomendado |
| SAML | XML | Enterprise/legado (Salesforce, dashboards corporativos) |

---

## SAML

**O que e:** Security Assertion Markup Language. Protocolo de identidade XML para SSO em sistemas enterprise.

**Quando usar:** Integracao com sistemas legado (Salesforce, Active Directory, dashboards corporativos).

**OIDC vs SAML:** Prefira OIDC para novas aplicacoes. SAML apenas quando integrando com sistemas que so suportam SAML.

---

## Checklist de Autenticacao

### Token Storage
- [ ] Refresh tokens em httpOnly cookies (NUNCA localStorage)
- [ ] Access tokens de curta duracao (<=1h)
- [ ] Cookies com Secure + SameSite + httpOnly
- [ ] Rotacao de refresh token a cada uso

### OAuth2/OIDC
- [ ] PKCE obrigatorio para SPAs e mobile
- [ ] ID token para identidade (nao access token)
- [ ] Validar assinatura, iss, aud, exp do ID token
- [ ] Implicit flow desabilitado

### Geral
- [ ] Rate limiting em login (5 tentativas/minuto)
- [ ] Lockout progressivo apos tentativas falhas
- [ ] 2FA disponivel (TOTP preferivel a SMS)
- [ ] Sessoes invalidadas no logout
- [ ] Password reset com token unico + TTL curto

### Como verificar

```bash
# Buscar localStorage com tokens
grep -rn "localStorage.*token\|localStorage.*jwt\|localStorage.*refresh" --include="*.ts" --include="*.tsx" --include="*.js"
# DEVE retornar 0 resultados

# Buscar implicit flow
grep -rn "response_type=token" --include="*.ts" --include="*.js"
# DEVE retornar 0 resultados

# Buscar cookies sem flags de seguranca
grep -rn "Set-Cookie\|cookie" --include="*.ts" --include="*.js" | grep -v "httpOnly\|HttpOnly"
# Verificar se todos os cookies sensíveis tem httpOnly
```

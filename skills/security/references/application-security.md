# Seguranca de Aplicacoes — Referencia Detalhada

## Superficie de Ataque

Cada endpoint publico e um vetor de ataque. Minimizar o numero de endpoints expostos.

**Anti-patterns:**
- Endpoints de admin acessiveis publicamente
- APIs internas expostas na mesma porta/dominio que APIs publicas
- Debug endpoints em producao (`/debug`, `/metrics` sem auth)

**Como auditar:**

```bash
# Listar TODOS os endpoints
grep -rE "router\.|app\.(get|post|put|delete|patch)" --include="*.ts" --include="*.js"
```

Para cada endpoint, perguntar: "Este endpoint PRECISA ser publico?" Endpoints internos devem estar em rede privada ou atras de auth.

---

## IDs Sequenciais = Enumeracao

IDs sequenciais (`/users/1`, `/users/2`) permitem enumeracao. Atacantes iteram e descobrem todos os recursos.

**Anti-patterns:**
- `/api/orders/1`, `/api/orders/2` — atacante itera de 1 a N
- Auto-increment como ID publico na URL ou API response
- IDs previsiveis em qualquer recurso acessivel externamente

**Como verificar:**

```bash
# Buscar rotas com parametros numericos
grep -rE "/:id\b|params\.id" --include="*.ts" --include="*.js"

# Verificar schemas de banco
grep -rE "serial|autoIncrement|auto_increment" --include="*.ts" --include="*.sql"
```

**Correto:** UUID v4 ou ULID como ID publico. `serial`/auto-increment apenas como ID interno (primary key no banco, nunca exposto na API).

```typescript
// Correto — UUID como ID publico
const order = await db.order.create({
  data: {
    publicId: crypto.randomUUID(), // exposto na API
    // id: auto-increment          // interno, nunca na response
  }
});
```

---

## SQL Injection

NUNCA construir queries SQL com concatenacao de strings. Usar SEMPRE ORM ou prepared statements com parametros.

**Anti-patterns:**

```typescript
// VULNERAVEL — SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`;
const query = "SELECT * FROM users WHERE name = '" + name + "'";
db.raw(userInput);
```

**Como verificar:**

```bash
# Buscar interpolacao em queries
grep -rE "\`SELECT.*\\\$\{|'SELECT.*' \+|\.raw\(" --include="*.ts" --include="*.js"
```

**Correto:**

```typescript
// Prepared statements
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ORM (Prisma, Drizzle, Knex)
const user = await prisma.user.findUnique({ where: { id: userId } });

// Se raw() for necessario, SEMPRE usar parametros
const result = await db.raw('SELECT * FROM ?? WHERE ?? = ?', [table, column, value]);
```

---

## CORS (Cross-Origin Resource Sharing)

CORS deve ser restritivo por padrao. Listar dominios explicitamente.

**Anti-patterns:**

```typescript
// VULNERAVEL — qualquer origem pode acessar
app.use(cors({ origin: '*' }));

// VULNERAVEL — reflete qualquer origin
app.use(cors({ origin: req.headers.origin }));
```

**Correto:**

```typescript
app.use(cors({
  origin: ['https://app.dominio.com', 'https://admin.dominio.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400, // Cache preflight por 24h
}));
```

**Regras:**
- NUNCA usar `origin: '*'` com `credentials: true` (browsers bloqueiam, mas a intencao ja e errada)
- Listar dominios permitidos explicitamente
- Em desenvolvimento, usar `localhost` com porta especifica, NAO `*`

---

## Cookies

Sempre configurar cookies com TODAS as flags de seguranca:

```typescript
res.cookie('session', token, {
  httpOnly: true,    // Impede acesso via JavaScript (previne XSS)
  secure: true,      // Apenas HTTPS (nao envia em HTTP)
  sameSite: 'strict', // Previne CSRF (nao envia em requests cross-origin)
  maxAge: 3600000,   // TTL em ms
  path: '/',
});
```

| Flag | Protege contra | Obrigatoria? |
|------|---------------|-------------|
| httpOnly | XSS (acesso via document.cookie) | Sim |
| secure | Interceptacao em HTTP | Sim |
| sameSite | CSRF | Sim |
| maxAge/expires | Sessoes eternas | Sim |

**Anti-patterns:**
- Cookie sem `httpOnly` (acessivel via JavaScript — XSS rouba sessao)
- Cookie sem `secure` (enviado em HTTP — interceptavel)
- Cookie sem `sameSite` (enviado em requests cross-origin — CSRF)

---

## CSP (Content Security Policy)

CSP headers controlam quais recursos o browser pode carregar. Previne XSS e data injection.

**Configuracao minima:**

```typescript
// Headers CSP
{
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",          // Apenas scripts do proprio dominio
    "style-src 'self'",           // Apenas estilos do proprio dominio
    "img-src 'self' data: https:", // Imagens do dominio, data URIs, HTTPS
    "font-src 'self'",
    "connect-src 'self'",         // Fetch/XHR apenas para proprio dominio
    "frame-ancestors 'none'",     // Previne clickjacking
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
```

**Anti-patterns:**
- `script-src 'unsafe-inline' 'unsafe-eval'` — anula toda protecao CSP contra XSS
- Nao ter CSP headers (sem protecao adicional contra XSS)

---

## UUIDs vs IDs Sequenciais

| Aspecto | UUID v4 | Auto-increment |
|---------|---------|----------------|
| Enumeracao | Impossivel (128 bits aleatorios) | Trivial (1, 2, 3...) |
| Uso publico | Sim | NUNCA |
| Performance no banco | Fragmentacao de indice (UUIDv7 resolve) | Otimo |
| Tamanho | 36 chars | 4-8 bytes |

**Recomendacao:** UUIDv7 (time-ordered) para melhor performance em indices, mantendo nao-enumerabilidade. Se UUIDv7 nao disponivel, UUIDv4.

---

## ReDoS (Regular Expression Denial of Service)

Quantificadores nesteados causam backtracking exponencial.

### Padroes Perigosos

```
(a+)+       — quantificador nesteado
(a*)*       — quantificador nesteado
(\d+\.?\d*)+  — comum em validacao de numeros
(a|b)*c     — alternacao com quantificador
(\w+)+      — qualquer "palavra" repetida
(\S+)+      — nao-espaco repetido
```

### Como um ataque funciona

```
Regex: /^(a+)+$/
Input: "aaaaaaaaaaaaaaaaX"

O motor tenta todas as combinacoes de como dividir os "a"s
entre os dois "+". Para N caracteres, sao 2^N combinacoes.
Com 30 "a"s + "X", o processo trava por MINUTOS.
```

### Como verificar

```bash
# Buscar padroes perigosos
grep -rE "\(\w\+\)\+|\(\w\*\)\*|\(\.\+\)\+|\(\.\*\)\+" --include="*.ts" --include="*.js"

# Testar regex com ferramenta
npx redos-checker "sua-regex-aqui"
```

### Mitigacao

1. **Evitar quantificadores nesteados** — reescrever regex
2. **Usar lib `re2`** (Google RE2, sem backtracking) para regex de input do usuario
3. **Timeout wrapper** para execucao de regex
4. **NUNCA aceitar regex diretamente de input do usuario**

### Grupos Atomicos

Grupos atomicos impedem backtracking dentro do grupo. Em linguagens que suportam (Java, .NET, PCRE), usar `(?>...)`.

JavaScript NAO suporta grupos atomicos nativamente. Alternativas:
- Regex simples e especificas
- Lib `re2` (sem backtracking por design)
- Timeout wrapper

---

## Validacao de Email (4 Camadas)

### Camada 1: Regex Simples (Frontend)

Apenas para UX — feedback imediato ao usuario.

```typescript
// Simples e segura — sem risco de ReDoS
const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

NUNCA usar regex monstruosa tentando validar RFC 5322 completa (impossivel e causa ReDoS).

### Camada 2: Biblioteca de Validacao (Backend)

RFC compliance sem reinventar a roda.

```typescript
// Zod
const emailSchema = z.string().email();

// validator.js
import validator from 'validator';
validator.isEmail(email);
```

### Camada 3: MX Records (Complementar)

Verificar se o dominio pode receber email. Complementar, NAO substituto da confirmacao.

```typescript
import dns from 'dns/promises';

async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    // Fallback: verificar A record (RFC 5321)
    try {
      await dns.resolve4(domain);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Regras:**
- MX check como camada ADICIONAL, nao principal
- Timeout curto (2-3s) para nao bloquear fluxo de cadastro
- NAO rejeitar email apenas porque dominio nao tem MX record (falso negativo)

### Camada 4: Email de Confirmacao (Definitiva)

A UNICA validacao definitiva. Prova que o usuario possui acesso ao email.

- Gerar token unico (`crypto.randomBytes(32).toString('hex')`)
- Definir TTL (24h tipicamente)
- Link de confirmacao com token
- Invalidar token apos uso

---

## Punycode e Ataques de Homoglyph

Dominios internacionais (IDN) usam Punycode para representar caracteres nao-ASCII. `cafe.com` pode ser diferente de `cafe.com` (com acento). Ataques de homoglyph exploram caracteres visualmente identicos de diferentes scripts Unicode.

**Exemplos de homoglyph:**
- `a` (latin) vs `a` (cyrillic) — visualmente identicos, codigos diferentes
- `google.com` vs `gооgle.com` (com "o" cyrillic)

**Mitigacao:**

```typescript
import punycode from 'punycode/';

// Normalizar dominio para ASCII antes de armazenar
const asciiDomain = punycode.toASCII('cafe.com');

// Comparar dominios SEMPRE na forma Punycode
const isDomainMatch = punycode.toASCII(a) === punycode.toASCII(b);
```

**Regras:**
- Normalizar dominios com `punycode.toASCII()` antes de armazenar
- Comparar dominios SEMPRE na forma Punycode (ASCII)
- Exibir aviso visual quando dominio contiver caracteres nao-ASCII

---

## SMTP Callouts

SMTP VRFY/RCPT TO para verificar se email existe NAO e confiavel.

**Problemas:**
- Muitos servidores desativam VRFY
- Servidores retornam falso positivo no RCPT TO
- Rate limiting bloqueia verificacoes em massa
- Pode entrar em blacklist de spam

**Regras:**
- SMTP callout como camada OPCIONAL e informativa, nunca bloqueante
- A validacao definitiva e: enviar email de confirmacao e aguardar clique
- Se usar callout, cachear resultados e respeitar rate limits

---

## Secrets e Credenciais

### Armazenamento

Secrets (API keys, DB passwords, tokens) DEVEM estar em `.env` e `.env` DEVE estar no `.gitignore`.

**Anti-patterns:**
- `const API_KEY = "sk-1234..."` hardcoded no codigo
- `.env` fora do `.gitignore`
- Secrets em arquivos de configuracao commitados (config.json, settings.yaml)
- Secrets em Docker build args sem multi-stage

### Como verificar

```bash
# Verificar se .env ja vazou no historico
git log --all -p -- .env

# Buscar padroes de API keys no codigo
grep -rE "sk-|pk_|AKIA|ghp_|glpat-" --include="*.ts" --include="*.js" --include="*.json"

# Verificar .gitignore
grep -E "\.env" .gitignore
# Deve conter: .env, .env.local, .env.*.local
```

### Pre-commit hooks

Usar `git-secrets` ou `gitleaks` como pre-commit hook para prevenir commits acidentais de secrets.

```bash
# Instalar gitleaks
brew install gitleaks  # ou download do release

# Verificar repositorio
gitleaks detect --source .

# Como pre-commit hook
# .pre-commit-config.yaml
# - repo: https://github.com/gitleaks/gitleaks
#   hooks:
#     - id: gitleaks
```

---

## Principio do Menor Privilegio

Cada componente deve ter APENAS as permissoes minimas necessarias.

**Anti-patterns:**
- Database acessivel pela internet publica
- Service account com `admin` ou `*` permissions
- Uma unica API key com acesso total
- Usuarios de banco com `SUPERUSER` ou `ALL PRIVILEGES`

**Como verificar:**
- Security groups/firewall: DB deve aceitar conexoes APENAS da aplicacao
- IAM policies: buscar `"Action": "*"` ou `"Resource": "*"`
- Cada servico deve ter seu proprio usuario de banco com permissoes MINIMAS
- S3 buckets SEMPRE privados — acesso via presigned URLs com TTL curto

### S3 Buckets

```bash
# Verificar ACL
aws s3api get-bucket-acl --bucket NOME

# Buscar no codigo
grep -rE "public-read|publicRead|Principal.*\*" --include="*.ts" --include="*.json"
```

**Correto:** Presigned URLs com `expiresIn: 3600` (1 hora ou menos).

---

## Timing Attacks

Comparacoes de strings com `===` vazam informacao de timing. Atacante descobre o valor correto caractere por caractere medindo o tempo de resposta.

**Vulneravel:**

```typescript
if (token === expectedToken) { ... }        // VULNERAVEL
if (signature === expectedSignature) { ... } // VULNERAVEL
```

**Correto:**

```typescript
crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
// IMPORTANTE: buffers devem ter o MESMO tamanho
```

**Aplicar `timingSafeEqual` em TODA comparacao de:**
- Tokens de sessao
- API keys
- Signatures (HMAC, webhook)
- Codigos de verificacao

**Como verificar:**

```bash
grep -rE "===.*token|===.*secret|===.*signature|===.*apiKey" --include="*.ts" --include="*.js"
```

---

## Defaults Seguros

Seguranca deve ser o DEFAULT, nao opt-in.

| Recurso | Default Seguro |
|---------|---------------|
| 2FA | Ativado por padrao |
| CORS | Dominios explicitos (nao `*`) |
| Cookies | HttpOnly + Secure + SameSite |
| Rate limiting | Ativado em todos endpoints publicos |
| CSP headers | Restritivos |
| IDs publicos | UUIDs (nao sequenciais) |
| DB access | VPC privada |
| S3 buckets | Privados |

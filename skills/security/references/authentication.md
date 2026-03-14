# Autenticacao — Referencia Detalhada

## Password Hashing

### Regras Fundamentais

- Hashear senhas com algoritmo irreversivel (bcrypt/Argon2id)
- NUNCA encriptar senhas (encriptacao e reversivel)
- NUNCA usar MD5/SHA1/SHA256 puro para senhas (rapidos demais, sem salt integrado)
- Hash de senha deve levar >= 100ms em hardware de producao

### Parametros Minimos

| KDF | Parametro | Minimo |
|-----|-----------|--------|
| bcrypt | saltRounds | >= 12 |
| Argon2id | memoryCost | >= 65536 (64MB) |
| Argon2id | timeCost | >= 3 |
| PBKDF2 | iterations | >= 600000 (OWASP 2023) |

### Politica de Senhas

- Comprimento minimo: 12 caracteres (absoluto minimo)
- Sem maxLength restritivo — aceitar ate 128+ caracteres
- bcrypt trunca em 72 bytes — usar pre-hashing (`sha256(password)` antes de bcrypt) para senhas longas
- NAO exigir regras arbitrarias ("1 maiuscula, 1 numero, 1 especial") sem comprimento minimo adequado
- Comprimento e aleatoriedade importam mais que complexidade

### Leet Speak NAO Adiciona Seguranca

Substituir letras por numeros (`P@$$w0rd`) NAO aumenta seguranca. Atacantes ja incluem substituicoes leet em seus dicionarios. O que importa: comprimento aleatorio gerado por password manager.

**Anti-patterns:**
- Sugerir "substitua a por @" como dica de seguranca
- Politicas que incentivam leet speak em vez de comprimento

---

## Rainbow Tables e Salts

Rainbow tables sao tabelas pre-computadas de hashes. Salts aleatorios por usuario tornam rainbow tables INUTEIS.

**Anti-patterns:**
- Hash sem salt: `sha256(password)` — vulneravel a rainbow table
- Salt fixo global: `sha256(GLOBAL_SALT + password)` — ainda vulneravel (uma tabela para todos)

**Correto:**
- bcrypt e Argon2 geram salt automaticamente (embutido no hash)
- Se usando hash manual, gerar salt com `crypto.randomBytes(16)` por usuario
- No banco, duas senhas identicas DEVEM produzir hashes DIFERENTES

---

## 2FA / TOTP

### TOTP (Time-based One-Time Password) — RFC 6238

TOTP com apps como Google Authenticator/Authy e o minimo para 2FA. Gera codigos de 6 digitos que mudam a cada 30 segundos baseados em um seed (secret key) compartilhado.

**Como funciona:**

```
TOTP = HMAC-SHA1(secret_key, floor(timestamp / 30))
```

1. Servidor gera seed aleatorio (base32 encoded, tipicamente 160 bits)
2. Usuario escaneia QR code contendo o seed no app authenticator
3. App e servidor calculam o mesmo TOTP independentemente usando o timestamp atual
4. Servidor aceita codigo atual +/- 1 janela (para compensar dessincronizacao de relogio)

**Armazenamento do seed:**
- Seeds TOTP DEVEM estar encriptados at-rest no banco de dados
- Usar AES-256-GCM para encriptar o seed antes de armazenar
- A chave de encriptacao do seed DEVE estar em variavel de ambiente, NAO no codigo

**Libs recomendadas:**
- Node.js: `otpauth`, `speakeasy`
- Python: `pyotp`

### SMS como 2FA: Vulnerabilidades

SMS e vulneravel a:
- **SIM swap:** Atacante convence operadora a transferir numero
- **SS7 attacks:** Interceptacao de mensagens na rede de telefonia
- **Engenharia social:** Convencer suporte a redirecionar SMS

**Regra:** SMS aceitavel apenas como FALLBACK, nunca como metodo unico de 2FA.

---

## Sessoes e Tokens

### Tokens de Sessao

- Gerar com `crypto.randomBytes(32).toString('hex')` (256 bits de entropia)
- Definir TTL (Time-To-Live) — sessoes nao devem ser eternas
- Rotacionar token apos autenticacao elevada (mudanca de senha, acesso admin)
- Invalidar no logout (delete do storage, nao apenas remover cookie)
- Armazenar hash do token no banco (nao o token em texto plano)

### Cookies de Sessao

Sempre configurar com todas as flags de seguranca:

```typescript
res.cookie('session', token, {
  httpOnly: true,   // Impede acesso via JavaScript (XSS)
  secure: true,     // Apenas HTTPS
  sameSite: 'strict', // Previne CSRF
  maxAge: 3600000,  // TTL em ms (1 hora)
  path: '/',
});
```

---

## Rate Limiting

### Login

- Maximo 5 tentativas por minuto por IP/usuario
- Lockout progressivo: 1min, 5min, 15min, 1h
- Apos 10 falhas consecutivas, exigir CAPTCHA
- Logar todas as tentativas falhas (IP, timestamp, username tentado)

### Implementacao

```typescript
// Pseudocodigo — adaptar ao framework
const rateLimiter = {
  windowMs: 60 * 1000,  // 1 minuto
  max: 5,                // 5 tentativas
  keyGenerator: (req) => `${req.ip}:${req.body.email}`,
  handler: (req, res) => res.status(429).json({ error: 'Too many attempts' }),
};
```

### Endpoints que DEVEM ter rate limiting

- Login / signup
- Reset de senha
- Verificacao de email
- Envio de SMS/email (qualquer endpoint que dispare comunicacao)
- APIs publicas em geral

---

## Timing Attacks em Autenticacao

Comparacoes de strings com `===` vazam informacao de timing. Atacante descobre o valor correto caractere por caractere medindo tempo de resposta.

**Vulneravel:**

```typescript
// VULNERAVEL — timing attack
if (providedToken === storedToken) { ... }
```

**Correto:**

```typescript
// SEGURO — constant-time comparison
const isValid = crypto.timingSafeEqual(
  Buffer.from(providedToken),
  Buffer.from(storedToken)
);
```

**IMPORTANTE:** Os dois buffers DEVEM ter o MESMO tamanho. Se tamanhos diferentes, fazer pad ou hash ambos antes de comparar:

```typescript
// Garantir mesmo tamanho via hash
const a = crypto.createHash('sha256').update(providedToken).digest();
const b = crypto.createHash('sha256').update(storedToken).digest();
const isValid = crypto.timingSafeEqual(a, b);
```

Aplicar `timingSafeEqual` em TODA comparacao de:
- Tokens de sessao
- API keys
- Signatures (HMAC, webhook)
- Codigos de verificacao

---

## Infraestrutura de Seguranca

### FDE (Full Disk Encryption)

Obrigatorio em TODOS os dispositivos de desenvolvimento. Sem FDE, qualquer pessoa com acesso fisico le todos os dados.

**Verificar:**

```bash
# Windows (BitLocker)
manage-bde -status

# macOS (FileVault)
fdesetup status

# Linux (LUKS)
lsblk -o NAME,FSTYPE,MOUNTPOINT
```

### VPN em Redes Publicas

SEMPRE usar VPN em redes publicas (cafes, aeroportos, hoteis). DNS poisoning e ARP spoofing sao triviais em redes abertas.

**Hierarquia:** WireGuard > OpenVPN > IPSec

**Anti-patterns:**
- Acessar sistemas de producao em WiFi publico sem VPN
- Confiar em HTTPS como unica protecao (DNS poisoning pode redirecionar para site falso com certificado valido)
- VPNs gratuitas sem reputacao (podem interceptar trafego)

### TPM + Secure Boot

TPM (Trusted Platform Module) + Secure Boot protegem contra rootkits e bootkits que se instalam antes do sistema operacional.

**Verificar:**

```bash
# Windows
tpm.msc          # TPM
msinfo32          # Secure Boot State

# Linux
dmesg | grep -i tpm
mokutil --sb-state
```

### Backups (Regra 3-2-1)

- 3 copias dos dados
- 2 midias diferentes
- 1 copia offsite

**Snapshots NAO sao backups.** Ransomware pode encriptar snapshots locais. Backups devem ser offsite, testados regularmente e com retencao temporal.

Perguntar sempre: "Quando foi a ultima vez que testaram restaurar um backup?"

# Criptografia — Referencia Detalhada

## Encriptacao Simetrica vs Hashing

Encriptacao (AES-256) e REVERSIVEL — serve para dados que precisam ser lidos depois.
Hashing (bcrypt/Argon2) e IRREVERSIVEL — serve para senhas e verificacao de integridade.

**Anti-patterns:**
- Usar encriptacao para armazenar senhas (permite reversao e vazamento em massa)
- Usar hashing para dados que precisam ser recuperados (impossivel reverter)

**Como verificar:**
- Buscar no codigo por `encrypt`, `AES`, `cipher` aplicados a campos de senha
- Se encontrar senha sendo encriptada em vez de hasheada, e vulnerabilidade CRITICA

---

## NUNCA Encriptar Senhas

Senhas DEVEM ser hasheadas com algoritmo irreversivel. Se e possivel "desencriptar" uma senha, o sistema esta VULNERAVEL.

**Anti-patterns:**
- `encrypt(password)` ou `AES.encrypt(password)` em qualquer parte do codigo
- Armazenar senhas em texto plano ou com encoding reversivel (Base64, hex)

**Como verificar:**

```bash
# Grep por encrypt aplicado a password
grep -r "password" --include="*.ts" --include="*.js" | grep -i "encrypt\|cipher\|AES\|encode\|base64"
```

O correto: `bcrypt.hash(password, saltRounds)` ou `argon2.hash(password)`

---

## MD5/SHA1 Estao QUEBRADOS

MD5 e SHA1 possuem colisoes conhecidas e NAO devem ser usados para seguranca. Usar SHA-256 ou SHA-3.

**Anti-patterns:**
- `crypto.createHash('md5')` ou `crypto.createHash('sha1')` para qualquer fim de seguranca
- Usar MD5 para verificar integridade de arquivos criticos

**Como verificar:**

```bash
grep -rE "md5|sha1|createHash\(['\"](?:md5|sha1)" --include="*.ts" --include="*.js"
```

**Excecao:** MD5 e aceitavel APENAS para checksums nao-criticos (cache keys, ETags).

---

## HMAC vs MAC Simples

HMAC (Hash-based Message Authentication Code) previne length extension attacks. Um MAC simples (`hash(secret + message)`) e VULNERAVEL.

**Anti-patterns:**
- `hash(secret + message)` — vulneravel a length extension attack
- Concatenar secret e mensagem manualmente antes de hashear

**Correto:**

```typescript
// HMAC correto
const hmac = crypto.createHmac('sha256', secret).update(message).digest('hex');

// MAC simples VULNERAVEL — NUNCA fazer
const mac = crypto.createHash('sha256').update(secret + message).digest('hex');
```

**Como verificar:**
- Buscar por `createHmac` (correto) vs `createHash` seguido de concatenacao com secret

---

## Salt Aleatorio UNICO por Usuario

Cada senha DEVE ter um salt aleatorio unico. Salt fixo ou compartilhado permite ataques de rainbow table em massa.

**Anti-patterns:**
- Salt hardcoded: `const SALT = "meu-salt-fixo"`
- Salt compartilhado entre todos os usuarios
- Nenhum salt (hash puro da senha)

**Como verificar:**
- bcrypt: verificar que usa `genSalt()` ou saltRounds (gera salt automatico)
- Argon2: verificar que o salt nao esta sendo passado manualmente como fixo
- No banco, cada registro de usuario deve ter um hash DIFERENTE para a mesma senha

---

## KDFs: Hierarquia de Escolha

Para derivacao de chaves e hashing de senhas:

```
Argon2id (producao) > bcrypt > scrypt > PBKDF2 (ultimo recurso)
```

### Parametros minimos por KDF

| KDF | Parametro | Minimo |
|-----|-----------|--------|
| bcrypt | saltRounds | >= 12 |
| Argon2id | memoryCost | >= 65536 (64MB) |
| Argon2id | timeCost | >= 3 |
| scrypt | N (CPU/memory cost) | >= 2^15 |
| PBKDF2 | iterations | >= 600000 (OWASP 2023) |

**Anti-patterns:**
- PBKDF2 com poucas iteracoes (<100.000)
- scrypt sem configurar parametros de memoria
- bcrypt com saltRounds < 12

---

## Hash de Senha >= 100ms

O tempo de hashing de senha deve ser >= 100ms. Se instantaneo, os parametros estao FRACOS.

**Anti-patterns:**
- bcrypt com saltRounds = 4 (quase instantaneo)
- Argon2 com memoryCost = 1024 (1MB — trivial para atacante)
- Otimizar hashing de senha para ser "rapido" (o oposto do correto)

**Como verificar:**

```typescript
console.time('hash');
await bcrypt.hash(password, 12);
console.timeEnd('hash');
// Resultado deve ser >= 100ms em hardware de producao
// Se < 50ms, aumentar os parametros
```

---

## Modos de Block Cipher

### Hierarquia: GCM > CBC > ECB

| Modo | Encriptacao | Autenticacao | Seguro? |
|------|-------------|-------------|---------|
| GCM | Sim | Sim (integrada) | Sim |
| CBC | Sim | Nao (requer HMAC) | Com HMAC |
| ECB | Sim | Nao | NUNCA |

**GCM (Galois/Counter Mode):** Encriptacao + autenticacao integrada. Padrao recomendado.

**CBC (Cipher Block Chaining):** Requer padding e HMAC separado para autenticacao. Vulneravel a padding oracle sem HMAC.

**ECB (Electronic Codebook):** Padrao visivel no ciphertext (blocos identicos de plaintext geram blocos identicos de ciphertext). INSEGURO em qualquer contexto.

**Como verificar:**

```bash
# Buscar ECB — vulnerabilidade CRITICA
grep -rE "ECB|aes-128-ecb|aes-256-ecb" --include="*.ts" --include="*.js"
```

**Correto:**

```typescript
// AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
// ...
const authTag = cipher.getAuthTag(); // OBRIGATORIO — guardar junto com ciphertext

// Decriptacao
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag); // OBRIGATORIO — verificar autenticidade
```

---

## TLS e Forward Secrecy

### Diffie-Hellman Ephemeral (ECDHE)

Usar ECDHE (Elliptic Curve Diffie-Hellman Ephemeral) para garantir Forward Secrecy. Se uma chave privada vazar no futuro, comunicacoes passadas permanecem seguras.

**Anti-patterns:**
- TLS configurado sem cipher suites com Forward Secrecy
- Usar RSA key exchange estatico (sem ephemeral)
- Reusar chaves DH entre sessoes

**Como verificar:**

```bash
# Verificar cipher suites do servidor
openssl s_client -connect dominio:443
# Procurar por "Server Temp Key: ECDH" na saida
```

Cipher suites devem incluir `ECDHE` ou `DHE`.

### Composicao TLS moderna

```
TLS 1.3: ECDHE (key exchange) + AES-256-GCM (encriptacao) + SHA-384 (hash)
```

TLS 1.3 remove cipher suites inseguras automaticamente. Preferir TLS 1.3 quando possivel. Desativar TLS 1.0 e 1.1.

---

## Ed25519 vs RSA

Para chaves SSH e assinaturas, preferir SEMPRE Ed25519.

| Aspecto | Ed25519 | RSA 4096 |
|---------|---------|----------|
| Tamanho chave | 32 bytes | 512 bytes |
| Performance | Mais rapido | Mais lento |
| Seguranca | Equivalente a RSA ~3000 | 4096 bits |
| Vulneravel a | - | Implementacao ruim de padding |

**Gerar chave SSH:**

```bash
# Correto
ssh-keygen -t ed25519 -C "email@exemplo.com"

# Evitar
ssh-keygen -t rsa -b 2048  # fraco
ssh-keygen -t dsa           # obsoleto e inseguro
```

**Verificar chaves existentes:**

```bash
ls ~/.ssh/*.pub
# Se comecam com "ssh-rsa", considerar migracao para ed25519
```

---

## Base64 NAO e Encriptacao

Base64 e um ENCODING, nao encriptacao. Qualquer pessoa decodifica Base64 sem chave. NUNCA usar para proteger dados sensiveis.

**Anti-patterns:**
- `Buffer.from(password).toString('base64')` como "protecao"
- Armazenar tokens/secrets em Base64 achando que estao "encriptados"
- "Ofuscar" dados com Base64 em APIs publicas

**Como verificar:**

```bash
# Buscar Base64 no contexto de senhas/secrets
grep -rE "btoa|atob|base64" --include="*.ts" --include="*.js"
# Verificar se ha encriptacao REAL alem do encoding
```

**Uso legitimo de Base64:** Transportar dados binarios em contextos que exigem texto (JSON, headers HTTP, data URIs). NAO e protecao — e apenas formato de transporte.

---

## Evolucao da Encriptacao Simetrica

### DES → Triple DES → AES

| Algoritmo | Chave | Seguro? | Nota |
|-----------|-------|---------|------|
| DES | 56-bit | NAO | Quebrado em 26h com FPGA |
| Triple DES | 3x DES | Teoricamente | Lento (3x DES), pouco usado |
| AES (Rijndael) | 128/192/256-bit | SIM ✓ | Padrao atual, acelerado em hardware |

**AES (Advanced Encryption Standard):**
- 10-13 rodadas de transformacao com S-Boxes
- 3x mais rapido que DES
- Implementado em hardware (Intel AES-NI, AMD) — mitigando side-channel attacks
- Usado em: BitLocker, FileVault, LUKS, TLS/SSL

**Principios de Shannon:**
- **Confusao:** Eliminar correlacao entre plaintext e ciphertext (S-Boxes)
- **Difusao:** Mudar 1 bit no plaintext deve alterar >= 50% dos bits do ciphertext

**Initialization Vector (IV):** Valor aleatorio no primeiro bloco. Garante que mesmo plaintext + mesma chave = ciphertexts diferentes. Analogo ao salt em hashing.

---

## Encriptacao Assimetrica

### RSA

Gera par de chaves publica/privada a partir de dois primos gigantes (2048/4096-bit). Seguranca depende da dificuldade de fatorar o produto de primos grandes.

**Usos:** Autenticacao de identidade, assinatura digital, certificados X509.

**NAO usar para:** Encriptar dados em massa (muito lento). Usar AES para dados, RSA apenas para troca de chaves e autenticacao.

### Diffie-Hellman

Protocolo de troca de segredos SEM trafegar chaves pela rede. Baseado em aritmetica modular.

```
1. Alice e Bob acordam p (primo) e g (base) publicamente
2. Alice: segredo a → calcula A = g^a mod p → envia A
3. Bob: segredo b → calcula B = g^b mod p → envia B
4. Alice: s = B^a mod p
5. Bob: s = A^b mod p
6. Ambos tem o mesmo segredo s (sem ele ter trafegado)
```

**ATENCAO:** DH sozinho NAO autentica identidades. Vulneravel a Man in the Middle. DEVE ser combinado com RSA/ECDHE.

### ECDHE (Elliptic Curve Diffie-Hellman Ephemeral)

Combina curvas elipticas + Diffie-Hellman + chaves efemeras por sessao.

| Propriedade | RSA | ECDHE |
|-------------|-----|-------|
| Forward Secrecy | NAO (chaves fixas) | SIM (chaves efemeras) |
| Tamanho chave | 4096-bit | ~256-bit (equivalente) |
| Performance | Lento | Rapido |

### Certificate Authority (CA) e X509

Cadeia de confianca para autenticar identidades na internet:
1. Alice envia chave publica para CA (GlobalSign, DigiCert)
2. CA assina com sua chave privada → certificado X509
3. Bob confia na CA (chave pre-instalada no OS/browser)
4. Bob valida certificado → confia na Alice

E o que o cadeado do browser mostra. Let's Encrypt oferece certificados gratuitos.

### Cipher Suite (Composicao TLS)

```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384

TLS      → protocolo
ECDHE    → troca de chaves (forward secrecy)
RSA      → autenticacao de identidade
AES-256  → encriptacao simetrica dos dados
GCM      → modo de operacao (paralelizavel)
SHA-384  → HMAC para verificacao de integridade
```

---

## Key Derivation: Quando Usar Cada KDF

### Argon2id (recomendado para producao)

Resistente a ataques de GPU e side-channel. Combina Argon2i (resistente a side-channel) e Argon2d (resistente a GPU).

```typescript
import argon2 from 'argon2';

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64MB
  timeCost: 3,
  parallelism: 1,
});

const isValid = await argon2.verify(hash, password);
```

### bcrypt (amplamente suportado)

Maduro, bem testado, amplamente disponivel. Limitacao: trunca senha em 72 bytes.

```typescript
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(password, 12); // saltRounds = 12
const isValid = await bcrypt.compare(password, hash);

// Pre-hashing para senhas longas (>72 bytes)
const preHash = crypto.createHash('sha256').update(password).digest('base64');
const hash = await bcrypt.hash(preHash, 12);
```

### PBKDF2 (ultimo recurso)

Usar apenas quando Argon2 e bcrypt nao estao disponiveis. OWASP 2023: minimo 600.000 iteracoes com SHA-256.

```typescript
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha256');
```

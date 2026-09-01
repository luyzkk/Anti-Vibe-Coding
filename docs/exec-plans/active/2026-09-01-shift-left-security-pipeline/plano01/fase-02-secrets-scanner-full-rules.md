<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-01 (Luiz/dev): supressor de SRI — PRD §RF-02`
-->

# Fase 02: Secrets Scanner — Port completo das familias gitleaks

**Plano:** 01 — Conhecimento (base das auditorias)
**Sizing:** 1.5h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

O `secrets-scanner` cobre as familias default do gitleaks — AWS secret key, GCP, Azure, Slack,
chave privada (PEM) e connection strings de mysql/mongodb/redis/amqp — e ganha supressores de linha
que impedem a heuristica de entropia de disparar em blobs base64 publicos. Fecha RF-02.

---

## Pre-requisito: confirmar a licenca (PRD §Premissas #4)

Antes de escrever qualquer regra, **confirmar que o `LICENSE` do repositorio gitleaks e MIT** e
registrar a confirmacao no MEMORY do plano (data + o que foi lido). Se a licenca divergir do
esperado, **parar** e escalar ao humano — o port inteiro depende disso (PRD §Decisões D5).

Regras portadas sao **derivadas por conceito**, nao copiadas literalmente do `gitleaks.toml`: mesmo
shape de credencial, regex escrita neste estilo de arquivo (sem lookbehind, flag `g`, prefixo no match).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/secrets-scanner.test.ts` | Modify | ~10 testes RED (1 por familia) + 4 guardas de falso positivo |
| `skills/init/lib/secrets-scanner.ts` | Modify | 8 kinds novos, `ENTROPY_LINE_SUPPRESSORS`, reordenacao de `SECRET_PATTERNS` |
| `plugin-manifest.json` | Modify | Regenerado por `bun run generate:manifest` |

---

## Implementacao

### Passo 1 — Branch

```bash
git checkout -b feat/secrets-scanner-gitleaks-rules
```

Se a fase-01 ainda nao mergeou, ramificar a partir da branch dela (mesmo arquivo, sequencial).

### Passo 2 — RED: um teste por familia + guardas

Anexar ao `describe('scanSecrets', ...)`. Todas as fixtures **sinteticas** (G12 do README).

```typescript
  // 2026-09-01 (Luiz/dev): familias default do gitleaks (MIT) — PRD §RF-02 / §Decisões D5.

  test('detecta AWS secret access key ancorada por palavra-chave', () => {
    const matches = scanSecrets('aws_secret_access_key = wJalrXUtnFEMIK7MDENGbPxRfiCYzEXAMPLEKEY0')
    expect(matches.some((m) => m.kind === 'aws-secret-key')).toBe(true)
  })

  test('detecta GCP API key (AIza)', () => {
    const matches = scanSecrets('GOOGLE_KEY=AIzaSyD-0a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P')
    expect(matches[0]?.kind).toBe('gcp-api-key')
  })

  test('detecta marcador de service account do GCP', () => {
    const matches = scanSecrets('{ "type": "service_account", "project_id": "demo" }')
    expect(matches.some((m) => m.kind === 'gcp-service-account')).toBe(true)
  })

  test('detecta connection string de storage do Azure', () => {
    const line =
      'CONN=DefaultEndpointsProtocol=https;AccountName=demostorage;AccountKey=Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRg==;'
    const matches = scanSecrets(line)
    expect(matches.some((m) => m.kind === 'azure-storage-key')).toBe(true)
  })

  test('detecta token do Slack (xoxb-)', () => {
    const matches = scanSecrets('SLACK=xoxb-1234567890-0987654321-AbCdEfGhIjKlMnOpQrStUvWx')
    expect(matches[0]?.kind).toBe('slack-token')
  })

  test('detecta webhook do Slack', () => {
    const matches = scanSecrets('https://hooks.slack.com/services/T00000000/B11111111/AbCdEfGhIjKlMnOpQrStUvWx')
    expect(matches.some((m) => m.kind === 'slack-webhook')).toBe(true)
  })

  test('detecta cabecalho de chave privada PEM', () => {
    // NAO usar toHaveLength: o corpo base64 da chave tambem dispara high-entropy por linha.
    const pem = ['-----BEGIN RSA PRIVATE KEY-----', 'MIIEowIBAAKCAQEA0mZ1Kq', '-----END RSA PRIVATE KEY-----'].join('\n')
    const matches = scanSecrets(pem)
    expect(matches.some((m) => m.kind === 'private-key')).toBe(true)
  })

  test('detecta chave privada OPENSSH e PGP', () => {
    expect(scanSecrets('-----BEGIN OPENSSH PRIVATE KEY-----').some((m) => m.kind === 'private-key')).toBe(true)
    expect(scanSecrets('-----BEGIN PGP PRIVATE KEY BLOCK-----').some((m) => m.kind === 'private-key')).toBe(true)
  })

  test('detecta connection string de mongodb/mysql/redis com credenciais', () => {
    expect(scanSecrets('mongodb+srv://admin:s3cr3tpass@cluster0.example.net/db')[0]?.kind).toBe('db-connection-url')
    expect(scanSecrets('mysql://root:s3cr3tpass@db.internal:3306/app')[0]?.kind).toBe('db-connection-url')
    expect(scanSecrets('redis://default:s3cr3tpass@cache.internal:6379')[0]?.kind).toBe('db-connection-url')
  })

  // ---- Guardas de FALSO POSITIVO ----
  // Precedente do arquivo: 'NAO confunde sk_test_ com sk_live_'. Cada regra generica
  // precisa de uma guarda, senao o scanner vira ruido e para de ser usado.

  test('NAO reporta connection string sem credenciais', () => {
    expect(scanSecrets('mongodb://localhost:27017/app')).toHaveLength(0)
    expect(scanSecrets('redis://cache.internal:6379')).toHaveLength(0)
  })

  test('NAO reporta prefixo xoxb- curto demais', () => {
    expect(scanSecrets('exemplo de token: xoxb-123')).toHaveLength(0)
  })

  test('NAO reporta chave publica SSH como secret', () => {
    const line = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbQmXk9RtLpZa1cD2eF3gH4iJ5kL6m luiz@host'
    expect(scanSecrets(line)).toHaveLength(0)
  })

  test('NAO reporta hash de integridade (SRI / lockfile) como secret', () => {
    const line = '<script src="/app.js" integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8w"></script>'
    expect(scanSecrets(line)).toHaveLength(0)
  })
```

```bash
bun test skills/init/lib/secrets-scanner.test.ts
```

RED esperado: falhas por assertion (`expected true to be false`, `Expected length: 0, Received: 1`).
As guardas de falso positivo devem falhar **na direcao contraria** — hoje o `ssh-rsa` e o `sha384-`
disparam `high-entropy` (limitacao herdada da fase-01), entao esses dois testes falham com
`Expected length: 0, Received length: 1`. Esse RED e o mais valioso da fase.

### Passo 3 — GREEN: supressores de linha para a entropia

Precisao vale mais que recall na regra generica: um scanner que grita em toda linha de lockfile ou de
SRI deixa de ser lido. Supressor age **so** sobre `high-entropy` — as regras especificas continuam
valendo na mesma linha.

```typescript
// 2026-09-01 (Luiz/dev): linhas que carregam blob base64 legitimo e PUBLICO. Suprimem
// SOMENTE a heuristica de entropia — as regras especificas continuam valendo na linha.
// PRD §RF-02: falso positivo em massa mata a adocao do scanner.
const ENTROPY_LINE_SUPPRESSORS: ReadonlyArray<RegExp> = [
  /\bssh-(?:rsa|ed25519|dss)\b/,              // chave PUBLICA — nao e secret
  /\b(?:sha256|sha384|sha512)-[A-Za-z0-9+/=]/, // SRI e integrity de lockfile
  /\bdata:[a-z]+\/[a-z0-9.+-]+;base64,/i,     // data URI embutido
  /-----(?:BEGIN|END) [A-Z ]+-----/,          // corpo PEM: private-key ja marcou a linha do header
]

function suppressesEntropy(line: string): boolean {
  return ENTROPY_LINE_SUPPRESSORS.some((re) => re.test(line))
}
```

Aplicar no loop de `scanSecrets`, por linha, **antes** de rodar a regra generica:

```typescript
    // 2026-09-01 (Luiz/dev): checar uma vez por linha, nao por match. PRD §RF-02.
    const entropySuppressed = suppressesEntropy(line)

    for (const { kind, pattern, validate } of SECRET_PATTERNS) {
      if (kind === 'high-entropy' && entropySuppressed) continue
      // ... resto do loop inalterado (fase-01)
```

### Passo 4 — GREEN: as regras novas

```typescript
export type SecretKind =
  | 'aws-key'
  | 'aws-secret-key'
  | 'gcp-api-key'
  | 'gcp-service-account'
  | 'azure-storage-key'
  | 'stripe-live'
  | 'github-token'
  | 'slack-token'
  | 'slack-webhook'
  | 'private-key'
  | 'postgres-url'
  | 'db-connection-url'
  | 'email'
  | 'jwt'
  | 'high-entropy'
```

```typescript
// 2026-09-01 (Luiz/dev): familias default do gitleaks (MIT) derivadas por conceito —
// PRD §Decisões D5, licenca confirmada no MEMORY do plano.
// ORDEM = PRIORIDADE (usedRanges): especificas -> semi-genericas -> genericas -> entropia.
// NAO usar lookbehind (G5); flag 'g' obrigatoria em todas (G6).
const SECRET_PATTERNS: ReadonlyArray<SecretRule> = [
  // --- credenciais de cloud, shape unico ---
  { kind: 'aws-key',            pattern: /AKIA[0-9A-Z]{16}/g },
  // AWS secret key nao tem prefixo distintivo: 40 chars base64 e shape generico demais.
  // Ancorar pela palavra-chave a esquerda DENTRO do match (sem lookbehind).
  { kind: 'aws-secret-key',     pattern: /aws_secret_access_key["'\s:=]+[A-Za-z0-9/+=]{40}/gi },
  { kind: 'gcp-api-key',        pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { kind: 'gcp-service-account', pattern: /"type"\s*:\s*"service_account"/g },
  { kind: 'azure-storage-key',  pattern: /AccountKey=[A-Za-z0-9+/=]{20,}/g },

  // --- tokens de plataforma, prefixo distintivo ---
  { kind: 'stripe-live',        pattern: /sk_live_[A-Za-z0-9]{24,}/g },
  { kind: 'github-token',       pattern: /ghp_[0-9A-Za-z]{36}/g },
  { kind: 'slack-webhook',      pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/]{20,}/g },
  { kind: 'slack-token',        pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/g },

  // --- material de chave ---
  { kind: 'private-key',        pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g },

  // --- connection strings (postgres separado por retrocompatibilidade do kind) ---
  { kind: 'postgres-url',       pattern: /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@[^\s/]+/g },
  { kind: 'db-connection-url',  pattern: /(?:mysql|mongodb(?:\+srv)?|redis|rediss|amqps?):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/g },

  // --- genericas ---
  { kind: 'email',              pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'jwt',                pattern: /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/g },
  { kind: 'high-entropy',       pattern: ENTROPY_CANDIDATE, validate: isHighEntropySecret },
]
```

Notas de desenho, cada uma justificando um teste da lista acima:

- **`aws-secret-key` ancorada por palavra-chave.** 40 chars base64 sem prefixo casa com metade dos
  hashes do mundo. A palavra-chave entra no match (nao em lookbehind, G5) e o `i` cobre
  `AWS_SECRET_ACCESS_KEY`.
- **`slack-webhook` antes de `slack-token`.** A URL contem segmentos que casam com o shape do token;
  o webhook precisa reservar o range primeiro.
- **`db-connection-url` exige `user:pass@`.** `[^\s:@/]+:[^\s@/]+@` — sem credencial, sem match. E o
  que faz `mongodb://localhost:27017/app` retornar vazio.
- **`postgres-url` mantido separado.** Nao fundir no `db-connection-url`: o kind ja e consumido e
  aparece em teste existente. Fundir seria diminuir.
- **`azure-storage-key` casa so o `AccountKey=`**, nao a connection string inteira. Isso mantem o
  `redactedSample` util (`Acco***`) e evita depender da ordem dos campos da string.

### Passo 5 — Manifest

```bash
bun run generate:manifest
git diff --stat plugin-manifest.json
```

---

## Gotchas

- **G1 do plano:** `secrets-scanner.ts` e rastreado — `bun run generate:manifest` no mesmo commit.
- **G4 do plano:** a ordem do array e a especificacao. Reordenar por "ficou mais bonito" quebra
  silenciosamente a classificacao. `high-entropy` ultimo, `slack-webhook` antes de `slack-token`,
  `aws-key` antes de `aws-secret-key`.
- **G5 do plano:** `aws-secret-key` e a tentacao obvia de lookbehind. Resistir — palavra-chave dentro
  do match.
- **G6 do plano:** 8 padroes novos, 8 chances de esquecer a flag `g` → loop infinito. Se um teste
  travar em vez de falhar, e isso.
- **G12 do plano:** 13 fixtures novas com formato de credencial. Reler cada uma antes do commit.
- **Local — corpo PEM inunda a saida.** Uma chave privada real gera 1 `private-key` (header) + N
  `high-entropy` (corpo). O supressor `-----(?:BEGIN|END)...` cobre so as linhas de delimitador, nao
  o corpo. Aceito: o arquivo ja esta bloqueado pelo header; o excesso e ruido dentro de um arquivo
  que ja falhou. Por isso o teste de PEM usa `.some(...)` e **nao** `toHaveLength`.
- **Local — `gcp-service-account` casa um marcador, nao um secret.** `"type": "service_account"` e o
  campo do JSON de credencial. Detecta o *arquivo* certo. Falso positivo possivel: documentacao que
  cita o shape do JSON. Aceito — o custo de um falso positivo em doc e baixo perto de commitar uma
  service account.
- **Local — este arquivo agora tem 15 kinds.** Se passar disso, considerar extrair as regras para
  `secrets-rules.ts` e deixar `secrets-scanner.ts` so com o motor. Nao fazer nesta fase (escopo);
  registrar no MEMORY como sinal de higiene de arquivo.

---

## Verificacao

### TDD

- [ ] **RED:** os ~13 testes novos falham por assertion
  - Comando: `bun test skills/init/lib/secrets-scanner.test.ts`
  - Resultado esperado: falhas de deteccao (`expected false to be true`) **e** duas falhas de
    falso positivo (`Expected length: 0, Received length: 1`) nos testes de `ssh-rsa` e `sha384-`.
    Nenhuma falha por erro de compilacao.

- [ ] **GREEN:** todos passam
  - Comando: `bun test skills/init/lib/secrets-scanner.test.ts`
  - Resultado esperado: `28 pass, 0 fail` (15 apos fase-01 + 13 novos)

### Checklist

- [ ] Licenca gitleaks confirmada como MIT e registrada no MEMORY (PRD §Premissas #4)
- [ ] `grep -c "pattern:" skills/init/lib/secrets-scanner.ts` retorna `15`
- [ ] Toda regra tem flag `g`: `grep -nE "pattern: /.*/[a-z]*g[a-z]*," skills/init/lib/secrets-scanner.ts`
      retorna 15 linhas (G6)
- [ ] `grep -nE "\(\?<[=!]" skills/init/lib/secrets-scanner.ts` retorna vazio (G5)
- [ ] `'high-entropy'` continua sendo o **ultimo** item de `SECRET_PATTERNS` (G4)
- [ ] `grep -n "ENTROPY_LINE_SUPPRESSORS" skills/init/lib/secrets-scanner.ts` retorna >= 2 linhas
- [ ] Todos os testes pre-existentes continuam verdes — nenhum kind removido, nenhuma assinatura
      alterada (regra "nunca diminuir")
- [ ] `bun test skills/init/lib/steps/03-secrets-scan.test.ts` verde (consumidor nao regrediu)
- [ ] Suite completa: `bun run test` sem falhas novas
- [ ] TypeCheck: `bun run typecheck` — zero erros novos alem de GT-01
- [ ] Harness: `bun run harness:validate` verde
- [ ] Manifest: `bun run generate:manifest` + `git diff --stat plugin-manifest.json` nao-vazio (G1)
- [ ] Branch + PR, nunca `main` (G13)

---

## Criterio de Aceite

**Por maquina (RF-02 — cobertura das familias):**

```bash
bun -e "import { scanSecrets } from './skills/init/lib/secrets-scanner'; \
const kinds = new Set(); \
for (const line of [ \
  'AKIAIOSFODNN7EXAMPLE', \
  'aws_secret_access_key = wJalrXUtnFEMIK7MDENGbPxRfiCYzEXAMPLEKEY0', \
  'AIzaSyD-0a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P', \
  '{ \"type\": \"service_account\" }', \
  'AccountKey=Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRg==', \
  'ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz', \
  'xoxb-1234567890-0987654321-AbCdEfGhIjKlMnOpQrStUvWx', \
  '-----BEGIN RSA PRIVATE KEY-----', \
  'mongodb+srv://admin:s3cr3tpass@cluster0.example.net/db' \
]) for (const m of scanSecrets(line)) kinds.add(m.kind); \
console.log([...kinds].sort().join(','))"
```

Saida esperada (conjunto, ordenado):

```
aws-key,aws-secret-key,azure-storage-key,db-connection-url,gcp-api-key,gcp-service-account,github-token,private-key,slack-token
```

**Por maquina (RF-02 — ausencia de falso positivo):**

```bash
bun -e "import { scanSecrets } from './skills/init/lib/secrets-scanner'; \
const clean = [ \
  'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7vbQmXk9RtLpZa1cD2eF3gH4iJ5kL6m luiz@host', \
  'integrity=\"sha384-oqVuAfXRKap7fdgcCY5uykM6R9GqQ8KuxyrxHNQlGYl1kPzQho1wx4JwY8w\"', \
  'mongodb://localhost:27017/app', \
  'xoxb-123' \
]; \
console.log(clean.flatMap(l => scanSecrets(l).filter(m => m.kind !== 'email').map(m => m.kind)).join(',') || 'LIMPO')"
```

Saida esperada: `LIMPO`
(o filtro de `email` existe porque `luiz@host` casa deliberadamente com a regra de email pre-existente).

**Por maquina (gates):**
- `bun test skills/init/lib/secrets-scanner.test.ts` → `0 fail`
- `bun run test` → sem falhas novas
- `bun run harness:validate` → exit 0
- `git diff --stat plugin-manifest.json` → nao-vazio

**Por humano:**
- Licenca MIT do gitleaks conferida e anotada no MEMORY, com data.
- Cada fixture de credencial foi digitada a mao.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

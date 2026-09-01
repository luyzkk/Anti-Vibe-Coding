<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-01 (Luiz/dev): limiar 4.0 bits/char — PRD §Decisões D5`
-->

# Fase 01: Secrets Scanner — Tracer Bullet (GitHub token + entropia + escopo de codigo)

**Plano:** 01 — Conhecimento (base das auditorias)
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

O `secrets-scanner` passa a detectar token do GitHub (`ghp_`) e segredo generico de alta entropia,
e o step `03-secrets-scan` deixa de varrer so markdown — passa a ler arquivos de codigo — provando de
ponta a ponta o caminho mais arriscado do plano: **codigo rastreado alterado + manifest regenerado +
todos os gates verdes**.

---

## Por que esta e a fatia tracer

Todas as outras 5 fases sao aditivas (docs novos, secoes novas, agente novo). Esta e a unica que
mexe em **codigo de runtime do plugin, rastreado no `plugin-manifest.json`, com consumidor a jusante**
(o step 03, com teste proprio). Se este caminho fecha — TDD verde, typecheck sem delta, manifest
regenerado, `harness:validate` verde — o resto do plano e risco baixo.

Escopo deliberadamente fino: **1 regra de padrao + 1 heuristica + 1 mudanca de escopo**. O port
completo das familias gitleaks e da fase-02, sobre esta fundacao.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/secrets-scanner.test.ts` | Modify | Testes RED: `github-token`, `high-entropy`, guarda de falso positivo, guarda de prioridade |
| `skills/init/lib/secrets-scanner.ts` | Modify | 2 kinds novos, tipo `SecretRule` com `validate?`, helpers `shannonEntropy`/`hasMixedCharset` |
| `skills/init/lib/steps/03-secrets-scan.ts` | Modify | `hasMarkdownExtension` → `isScannableFile`; `BLACKLIST_TOKENS` ganha lockfiles; raiz `src/` recursiva |
| `skills/init/lib/steps/03-secrets-scan.test.ts` | Modify | Teste do escopo novo (arquivo `.ts` com secret e varrido; lockfile e ignorado) |
| `plugin-manifest.json` | Modify | Regenerado por `bun run generate:manifest` — **nao editar a mao** |

---

## Implementacao

### Passo 1 — Branch (G13 do README)

```bash
git checkout -b feat/secrets-scanner-tracer
```

Nunca commitar na `main`. PR por fase.

### Passo 2 — RED: escrever os testes primeiro

Anexar ao `describe('scanSecrets', ...)` existente em `skills/init/lib/secrets-scanner.test.ts`.
Estilo do arquivo: `bun:test`, `test('...', () => {})`, sem ponto-e-virgula, 2 espacos.

**Fixtures sao SINTETICAS (G12 do README):** formato valido, valor digitado a mao. Nenhum secret real,
nem revogado.

```typescript
  // 2026-09-01 (Luiz/dev): CA-02 do PRD — hoje nenhum dos dois tipos e coberto pelas 5 regexes.
  test('detecta token do GitHub (ghp_)', () => {
    const matches = scanSecrets('const gh = "ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz"')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('github-token')
    expect(matches[0]?.redactedSample).toBe('ghp_***')
  })

  test('detecta segredo generico de alta entropia', () => {
    const matches = scanSecrets('const token = "aZ9kQ2mX7pL4vB8nR1tY6wE3sD5gH0jF"')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('high-entropy')
  })

  // Guarda de PRIORIDADE (G4 do README): o token GitHub tambem casa com o shape de entropia.
  // A regra especifica precisa vencer, e usedRanges precisa suprimir a duplicata.
  test('token do GitHub NAO e reportado duas vezes (especifica vence generica)', () => {
    const matches = scanSecrets('gh = ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('github-token')
  })

  // Guarda de FALSO POSITIVO — espelha o precedente 'NAO confunde sk_test_ com sk_live_'.
  // Sem esta guarda a heuristica de entropia inunda qualquer arquivo .ts real.
  test('codigo TypeScript comum NAO dispara high-entropy', () => {
    const content = [
      'import { writeDiscoveryArtifact } from "../discovery-store"',
      'export async function listCandidateFilesRecursively(rootDirectory: string) {',
      '  const identifierWithoutDigitsIsNotASecret = true',
      '}',
    ].join('\n')
    expect(scanSecrets(content)).toHaveLength(0)
  })

  test('hash hexadecimal minusculo NAO dispara high-entropy', () => {
    // Checksums do plugin-manifest.json e SHAs de commit: sem uppercase, charset pobre.
    const matches = scanSecrets('checksum: 9f2c4a7b1e6d8035af41c9b27e50d3a6f8c1b4e792d05a63')
    expect(matches).toHaveLength(0)
  })
```

Rodar e **confirmar o RED por assertion**:

```bash
bun test skills/init/lib/secrets-scanner.test.ts
```

Esperado: falhas do tipo `Expected length: 1, Received length: 0` (assertion), **nunca**
`Cannot find name` ou erro de import. Se o erro for de compilacao, o RED e falso — corrigir o teste
antes de seguir.

### Passo 3 — GREEN: estender `secrets-scanner.ts`

Duas mudancas estruturais. A primeira: a entropia precisa de um **segundo filtro** alem do shape, entao
o array ganha um `validate?` opcional. Isso mantem o loop de `scanSecrets` com uma unica forma.

```typescript
export type SecretKind =
  | 'aws-key'
  | 'stripe-live'
  | 'github-token'
  | 'postgres-url'
  | 'email'
  | 'jwt'
  | 'high-entropy'

export type SecretMatch = {
  readonly kind: SecretKind
  readonly lineNumber: number
  readonly redactedSample: string
}

// 2026-09-01 (Luiz/dev): `validate` opcional — a regra de entropia precisa de um segundo
// filtro alem do shape (o shape sozinho casa com qualquer identificador longo).
// PRD §Decisões D5 (portar gitleaks + entropia).
type SecretRule = {
  readonly kind: SecretKind
  readonly pattern: RegExp
  readonly validate?: (rawMatch: string) => boolean
}
```

Os helpers de entropia:

```typescript
// 2026-09-01 (Luiz/dev): heuristica derivada da regra generica do gitleaks (MIT) —
// PRD §Decisões D5. Shannon em bits/char: string aleatoria com charset misto fica >= 4.5;
// identificador de codigo fica < 3.5. 4.0 e o corte conservador (precisao > recall).
const ENTROPY_MIN_BITS_PER_CHAR = 4.0

// 2026-09-01 (Luiz/dev): 20 chars e o piso do gitleaks para a regra generica. Abaixo disso
// o ruido de nomes de funcao e caminho supera o sinal.
const ENTROPY_CANDIDATE = /[A-Za-z0-9+/=_-]{20,}/g

function shannonEntropy(value: string): number {
  const frequency = new Map<string, number>()
  for (const char of value) {
    frequency.set(char, (frequency.get(char) ?? 0) + 1)
  }
  let bits = 0
  for (const count of frequency.values()) {
    const probability = count / value.length
    bits -= probability * Math.log2(probability)
  }
  return bits
}

// 2026-09-01 (Luiz/dev): exigir as tres classes mata o falso positivo dominante —
// identificador camelCase (sem digito) e hash hex minusculo (sem uppercase).
function hasMixedCharset(value: string): boolean {
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value)
}

// 2026-09-01 (Luiz/dev): CORRECAO DE SPEC (BUG-01, achado na execucao) — segundo eixo
// obrigatorio. Shannon mede DIVERSIDADE de caracteres, nao imprevisibilidade. Medido no
// repo: 'abc..xyz0123456789' (zero aleatoriedade) = 5.17 bits/char, ACIMA do secret real
// aleatorio (5.00). O falso positivo pontua MAIS ALTO que o verdadeiro positivo, entao
// nenhum ajuste de ENTROPY_MIN_BITS_PER_CHAR separa os dois. Guard e eixo independente.
// Margem medida: monotonica tem corrida 10-26; secret real tem 1-2.
const MAX_SEQUENTIAL_RUN = 6

function longestSequentialRun(value: string): number {
  let longest = 1
  let current = 1
  for (let i = 1; i < value.length; i++) {
    const delta = value.charCodeAt(i) - value.charCodeAt(i - 1)
    if (delta === 1 || delta === -1) {
      current += 1
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}

function isHighEntropySecret(rawMatch: string): boolean {
  if (!hasMixedCharset(rawMatch)) return false
  if (longestSequentialRun(rawMatch) >= MAX_SEQUENTIAL_RUN) return false
  return shannonEntropy(rawMatch) >= ENTROPY_MIN_BITS_PER_CHAR
}
```

> **Correcao de spec aplicada em 2026-09-01 (BUG-01).** A versao original desta fase tinha
> `isHighEntropySecret` com apenas `hasMixedCharset` + limiar de entropia. Isso derruba o teste
> PRE-EXISTENTE `NAO confunde sk_test_ com sk_live_`, porque o fixture monotonico
> `sk_test_1234567890ABCDEFGHIJKLMN` tem 4.81 bits/char. Ao testar um caso de charset misto
> (`abcdefghij0123456789ABCDEFGHIJ`, 4.91 bits/char) fica claro que so a corrida sequencial separa
> os casos. **Nao subir o limiar** — foi verificado que a sequencia monotonica pura pontua 5.17,
> acima do secret real (5.00).

O array — **`high-entropy` por ultimo, sempre** (G4 do README):

```typescript
// 2026-05-18 (Luiz/dev): regex literais do PRD SH-01 + D16. NAO usar lookbehind
// (compatibilidade com runtimes JS antigos). 'g' flag obrigatoria — scanSecrets
// itera matches.
// 2026-09-01 (Luiz/dev): +github-token e +high-entropy — PRD §RF-02 / CA-02.
// ORDEM E PRIORIDADE: usedRanges faz o primeiro match vencer. 'high-entropy' e a regra
// mais generica e fica SEMPRE por ultimo, senao engole aws-key/stripe-live/jwt/github-token.
const SECRET_PATTERNS: ReadonlyArray<SecretRule> = [
  { kind: 'aws-key',      pattern: /AKIA[0-9A-Z]{16}/g },
  { kind: 'stripe-live',  pattern: /sk_live_[A-Za-z0-9]{24,}/g },
  { kind: 'github-token', pattern: /ghp_[0-9A-Za-z]{36}/g },
  { kind: 'postgres-url', pattern: /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@[^\s/]+/g },
  { kind: 'email',        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'jwt',          pattern: /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/g },
  { kind: 'high-entropy', pattern: ENTROPY_CANDIDATE, validate: isHighEntropySecret },
]
```

E o unico ajuste dentro do loop de `scanSecrets` — descartar o match **antes** de reservar o range,
para nao bloquear regras posteriores:

```typescript
    for (const { kind, pattern, validate } of SECRET_PATTERNS) {
      // 2026-05-18 (Luiz/dev): clonar regex para nao compartilhar lastIndex entre linhas.
      const localPattern = new RegExp(pattern.source, pattern.flags)
      let m: RegExpExecArray | null
      while ((m = localPattern.exec(line)) !== null) {
        // 2026-09-01 (Luiz/dev): validate rejeita ANTES de usedRanges.push — um candidato
        // descartado nao pode reservar o intervalo e cegar as regras seguintes. PRD §RF-02.
        if (validate && !validate(m[0])) continue
        const start = m.index
        const end = start + m[0].length
        const overlaps = usedRanges.some(([s, e]) => start < e && end > s)
        if (overlaps) continue
        usedRanges.push([start, end])
        matches.push({
          kind,
          lineNumber: i + 1,
          redactedSample: redactSample(m[0]),
        })
      }
    }
```

`redactSample` fica intacto — 4 chars + `***` continua valendo para os kinds novos.

### Passo 4 — GREEN: estender o escopo do step 03

Em `skills/init/lib/steps/03-secrets-scan.ts`, trocar `hasMarkdownExtension` por `isScannableFile`
e blindar contra lockfiles.

```typescript
// 2026-09-01 (Luiz/dev): escopo estendido de markdown-only para arquivos de codigo —
// PRD §RF-02 / CA-02. Secret vive em .ts/.py/.env muito mais que em .md; varrer so
// markdown era falsa sensacao de cobertura (PRD §Problema, item 3).
const SCANNABLE_EXTENSIONS = [
  '.md', '.mdx',
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.java', '.php', '.cs',
  '.json', '.yml', '.yaml', '.toml',
  '.sh', '.ps1',
]

// 2026-09-01 (Luiz/dev): .env / .env.local / .env.production nao tem extensao util —
// casar pelo nome. E o arquivo com maior densidade de secret do projeto.
function isEnvFile(name: string): boolean {
  return name === '.env' || name.startsWith('.env.')
}

function isScannableFile(name: string): boolean {
  if (isEnvFile(name)) return true
  return SCANNABLE_EXTENSIONS.some((ext) => name.endsWith(ext))
}
```

```typescript
// 2026-09-01 (Luiz/dev): lockfiles entram na blacklist junto com o escopo .json —
// hashes de integridade base64 (sha512-...) disparam a heuristica de entropia em massa.
// Ruido puro, zero sinal: nenhum secret e escrito a mao num lockfile. PRD §RF-02.
const BLACKLIST_TOKENS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.anti-vibe/backup',
  'package-lock.json',
  'bun.lock',
  'bun.lockb',
  'yarn.lock',
  'pnpm-lock.yaml',
]
```

Trocar a chamada dentro de `walkDir`:

```typescript
    if (entry.isFile() && isScannableFile(entry.name)) {
      acc.push(full)
    }
```

E adicionar `src/` como quarta raiz recursiva — `walkDir` ja retorna em silencio se o diretorio nao
existe (`ENOENT`), entao projetos sem `src/` nao quebram:

```typescript
async function listCandidateFiles(cwd: string): Promise<readonly string[]> {
  const out: string[] = []
  await walkDir(cwd, false, out, cwd)
  await walkDir(path.join(cwd, 'docs'), true, out, cwd)
  await walkDir(path.join(cwd, '.claude'), true, out, cwd)
  // 2026-09-01 (Luiz/dev): src/ recursivo — convencao mais universal para codigo de app.
  // walkDir absorve ENOENT em silencio, entao projeto sem src/ segue igual. PRD §RF-02.
  await walkDir(path.join(cwd, 'src'), true, out, cwd)
  return out
}
```

**Nao** varrer a raiz recursivamente. Seria uma varredura do repo inteiro sem necessidade — o PRD
nao pede full-sweep nesta fase (isso e RF-12, Could Have), e o custo em I/O e falso positivo nao se
justifica. Se o projeto-alvo usar outra convencao (`app/`, `lib/`), isso e desvio para registrar no
MEMORY, nao para adivinhar aqui.

### Passo 5 — Teste do step

Em `skills/init/lib/steps/03-secrets-scan.test.ts`, seguir o estilo ja presente no arquivo (ler antes
de editar). Dois casos:

1. arquivo `src/config.ts` com um `ghp_` sintetico entra em `blockedFiles`;
2. `package-lock.json` com hashes `sha512-` **nao** entra em `blockedFiles` nem em `scannedCount`.

### Passo 6 — Regenerar o manifest (G1 do README)

```bash
bun run generate:manifest
git diff --stat plugin-manifest.json
```

O diff DEVE mostrar o checksum de `skills/init/lib/secrets-scanner.ts` alterado. Se o
`plugin-manifest.json` nao aparecer no diff, algo esta errado — investigar antes de commitar.

---

## Gotchas

- **G1 do plano:** esta fase altera `skills/init/lib/secrets-scanner.ts`, rastreado no manifest.
  `bun run generate:manifest` no mesmo commit e obrigatorio.
- **G4 do plano:** `high-entropy` por ultimo no array. Se ficar antes, os testes de `aws-key`,
  `stripe-live` e `jwt` quebram todos de uma vez — esse e o sinal.
- **G5 do plano:** nada de lookbehind. `ghp_[0-9A-Za-z]{36}` ja inclui o prefixo no match, sem
  precisar de `(?<=ghp_)`.
- **G6 do plano:** `ENTROPY_CANDIDATE` precisa da flag `g`. Sem ela, loop infinito no `while`.
- **G12 do plano:** fixtures sinteticas. Antes de commitar, reler cada literal novo e confirmar que
  o valor foi digitado a mao.
- **Local — `validate` antes de `usedRanges`:** se o `continue` do `validate` vier depois do
  `usedRanges.push`, um candidato descartado reserva o intervalo e cega as regras seguintes.
  Ordem importa e nao ha teste que pegue isso hoje na fase-01 (pega na fase-02, quando ha regras
  concorrentes sobre o mesmo trecho). Manter a ordem do snippet.
- **Local — chave publica SSH e falso positivo conhecido.** `ssh-rsa AAAAB3Nza...` tem charset misto
  e alta entropia, e sera reportado como `high-entropy` apos esta fase. **Nao e um secret** (e a chave
  publica). Mitigacao completa (supressores por linha) e da **fase-02** — a fase-01 mitiga so o caso
  de maior volume (lockfiles, via blacklist). Registrar no MEMORY como limitacao aceita do tracer.
- **Local — `bun run typecheck` ja tem erros.** GT-01 do README: `lazy-import.test.ts` e
  `subagent-contract.ts` falham desde antes desta feature. Comparar o **delta**, nao o total.

---

## Verificacao

### TDD

- [ ] **RED:** os 5 testes novos falham por assertion (nao por erro de compilacao)
  - Comando: `bun test skills/init/lib/secrets-scanner.test.ts`
  - Resultado esperado: falhas do tipo `Expected length: 1, Received length: 0`.
    Se aparecer `Cannot find name 'github-token'` ou erro de import, o RED e falso — corrigir.

- [ ] **GREEN:** implementado, todos passam
  - Comando: `bun test skills/init/lib/secrets-scanner.test.ts`
  - Resultado esperado: `15 pass, 0 fail` (10 pre-existentes + 5 novos)

- [ ] **GREEN (step):** escopo novo verificado
  - Comando: `bun test skills/init/lib/steps/03-secrets-scan.test.ts`
  - Resultado esperado: `0 fail`, incluindo os 2 casos novos

### Checklist

- [ ] `grep -n "high-entropy" skills/init/lib/secrets-scanner.ts` retorna >= 2 linhas (kind + regra)
- [ ] `grep -n "'high-entropy'" skills/init/lib/secrets-scanner.ts` mostra a regra como **ultimo**
      elemento de `SECRET_PATTERNS` (linha maior que a de `'jwt'`)
- [ ] `grep -c "hasMarkdownExtension" skills/init/lib/steps/03-secrets-scan.ts` retorna `0`
      (funcao substituida, sem sobra morta)
- [ ] `grep -n "package-lock.json" skills/init/lib/steps/03-secrets-scan.ts` retorna 1 linha
- [ ] `grep -nE "\(\?<[=!]" skills/init/lib/secrets-scanner.ts` retorna vazio (G5 — sem lookbehind)
- [ ] Nenhum padrao novo sem flag `g`: inspecionar visualmente cada `pattern:` adicionado (G6)
- [ ] Fixtures sinteticas confirmadas: reler os literais `ghp_...` e o token de entropia no
      `.test.ts` e confirmar que foram digitados a mao (G12)
- [ ] Suite completa: `bun run test` sem falhas novas
- [ ] TypeCheck: `bun run typecheck` — mesmos erros de GT-01, **zero** erros novos
- [ ] Harness: `bun run harness:validate` verde
- [ ] Manifest: `bun run generate:manifest` e `git diff --stat plugin-manifest.json` nao-vazio (G1)
- [ ] Branch + PR, nunca `main` (G13)

---

## Criterio de Aceite

**Por maquina (CA-02 do PRD, literal):**

```bash
bun -e "import { scanSecrets } from './skills/init/lib/secrets-scanner'; \
const code = 'const gh = \"ghp_A1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvWxYz\"\nconst tk = \"aZ9kQ2mX7pL4vB8nR1tY6wE3sD5gH0jF\"'; \
console.log(JSON.stringify(scanSecrets(code).map(m => m.kind)))"
```

Saida esperada, exatamente:

```
["github-token","high-entropy"]
```

Antes desta fase o mesmo comando falha (o kind nao existe) — e mesmo que existisse, retornaria `[]`.

**Por maquina (gates):**
- `bun test skills/init/lib/secrets-scanner.test.ts` → `0 fail`
- `bun test skills/init/lib/steps/03-secrets-scan.test.ts` → `0 fail`
- `bun run test` → sem falhas novas em relacao ao baseline da branch
- `bun run harness:validate` → exit 0
- `git diff --stat plugin-manifest.json` → nao-vazio

**Por humano:**
- Cada literal de secret nas fixtures foi digitado a mao e nao corresponde a nenhuma credencial real.

---

<!-- Gerado por /plan-feature em 2026-09-01 -->

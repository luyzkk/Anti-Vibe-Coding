<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD). Aplicar SOMENTE em codigo de runtime usuario-facing — helpers TS
internos do plugin nao precisam (ja tem JSDoc).
-->

# Fase 01: Secrets Scanner Lib (`lib/secrets-scanner.ts`)

**Plano:** 03 — Discovery Pipeline (secrets + docs + classifier)
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase do plano; independente de fase-03)
**Visual:** false

---

## O que esta fase entrega

Funcao pura `scanSecrets(content: string): readonly SecretMatch[]` que detecta 5 tipos de segredo (AWS access key, Stripe live key, Postgres URL com credenciais, email, JWT) numa string usando regex literals. Cada match retorna `kind`, `lineNumber` e `redactedSample` (4 chars + `***`). Base read-only do Step 06 (SH-01, D16, CA-04). Plano 04 fase-05 (move-docs-with-stub) le o resultado persistido por Step 06 antes de mover arquivos.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/secrets-scanner.ts` | Create | Funcao `scanSecrets` + tipos `SecretMatch`, `SecretKind`. Regex literals encapsulados em constante interna; saida readonly. |
| `skills/init/lib/secrets-scanner.test.ts` | Create | Testes pareados (1 match positivo + 1 negativo por kind) + fixture com multiplos matches + fixture limpa. |

---

## Implementacao

### Passo 1: Definir tipos publicos

```typescript
// skills/init/lib/secrets-scanner.ts

export type SecretKind =
  | 'aws-key'
  | 'stripe-live'
  | 'postgres-url'
  | 'email'
  | 'jwt'

export type SecretMatch = {
  readonly kind: SecretKind
  /** 1-based, alinhado com editores comuns. */
  readonly lineNumber: number
  /** Primeiros 4 chars do match + '***'. Nunca logar segredo bruto. */
  readonly redactedSample: string
}
```

### Passo 2: Regex literals canonicos

Cada regex eh literal (sem unicode flag, sem emoji) e tem global flag `g` para capturar multiplas ocorrencias por linha. Encapsular numa constante privada para facilitar refactor:

```typescript
// 2026-05-18 (Luiz/dev): regex literais do PRD SH-01 + D16. NAO usar lookbehind
// (compatibilidade com runtimes JS antigos). 'g' flag obrigatoria — scanSecrets
// itera matches.
const SECRET_PATTERNS: ReadonlyArray<{ kind: SecretKind; pattern: RegExp }> = [
  { kind: 'aws-key',      pattern: /AKIA[0-9A-Z]{16}/g },
  { kind: 'stripe-live',  pattern: /sk_live_[A-Za-z0-9]{24,}/g },
  { kind: 'postgres-url', pattern: /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@[^\s/]+/g },
  { kind: 'email',        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'jwt',          pattern: /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/g },
]
```

> **Atencao Stripe vs test keys:** `sk_test_*` NAO casa com `sk_live_*` — fixture negativa deve cobrir esse caso. False positive em test fixtures de outras libs nao eh problema do scanner; eh resolvido em camada acima (Plano 03 fase-02 bloqueia apenas o arquivo especifico, nao init inteiro — CA-04 do PRD).

### Passo 3: Implementar `scanSecrets`

```typescript
export function scanSecrets(content: string): readonly SecretMatch[] {
  const matches: SecretMatch[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const { kind, pattern } of SECRET_PATTERNS) {
      // 2026-05-18 (Luiz/dev): clonar regex para nao compartilhar lastIndex entre linhas.
      const localPattern = new RegExp(pattern.source, pattern.flags)
      let m: RegExpExecArray | null
      while ((m = localPattern.exec(line)) !== null) {
        matches.push({
          kind,
          lineNumber: i + 1,
          redactedSample: redactSample(m[0]),
        })
      }
    }
  }

  return matches
}

function redactSample(rawMatch: string): string {
  const prefix = rawMatch.slice(0, 4)
  return `${prefix}***`
}
```

> **Por que clonar regex:** o flag `g` mantem `lastIndex` entre `exec()` calls. Quando muda de linha, se nao clonar, o regex pula caracteres validos do inicio da linha nova. Bug classico — teste #2 cobre.

### Passo 4: Testes pareados

```typescript
// skills/init/lib/secrets-scanner.test.ts
import { expect, test, describe } from 'bun:test'
import { scanSecrets } from './secrets-scanner'

describe('scanSecrets', () => {
  test('detecta AWS access key', () => {
    const matches = scanSecrets('credential = AKIAIOSFODNN7EXAMPLE')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('aws-key')
    expect(matches[0]?.lineNumber).toBe(1)
    expect(matches[0]?.redactedSample).toBe('AKIA***')
  })

  test('NAO confunde sk_test_ com sk_live_', () => {
    const matches = scanSecrets('STRIPE_TEST=sk_test_1234567890ABCDEFGHIJKLMN')
    expect(matches).toHaveLength(0)
  })

  test('detecta Stripe live key', () => {
    const matches = scanSecrets('STRIPE_LIVE=sk_live_1234567890ABCDEFGHIJKLMN')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('stripe-live')
  })

  test('detecta postgres URL com credenciais', () => {
    const matches = scanSecrets('DB=postgres://user:pass@db.example.com:5432/app')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.kind).toBe('postgres-url')
  })

  test('detecta email', () => {
    const matches = scanSecrets('Contato: comunidadeartebox@gmail.com')
    expect(matches.some((m) => m.kind === 'email')).toBe(true)
  })

  test('detecta JWT token', () => {
    const matches = scanSecrets(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    )
    expect(matches.some((m) => m.kind === 'jwt')).toBe(true)
  })

  test('fixture limpa retorna array vazio', () => {
    const matches = scanSecrets('# Markdown puro sem segredos.\n\nApenas texto.')
    expect(matches).toHaveLength(0)
  })

  test('multiplos matches em linhas distintas preservam lineNumber correto', () => {
    const content = [
      'safe line',
      'aws=AKIAIOSFODNN7EXAMPLE',
      'safe line',
      'stripe=sk_live_1234567890ABCDEFGHIJKLMN',
    ].join('\n')
    const matches = scanSecrets(content)
    expect(matches).toHaveLength(2)
    expect(matches[0]?.lineNumber).toBe(2)
    expect(matches[1]?.lineNumber).toBe(4)
  })

  test('multiplos matches na mesma linha sao todos capturados', () => {
    const content = 'a@b.com e c@d.com no mesmo paragrafo'
    const matches = scanSecrets(content)
    expect(matches.filter((m) => m.kind === 'email')).toHaveLength(2)
  })

  test('redactedSample nunca expoe mais de 4 chars do segredo', () => {
    const matches = scanSecrets('STRIPE=sk_live_1234567890ABCDEFGHIJKLMN')
    expect(matches[0]?.redactedSample.length).toBeLessThanOrEqual(7) // 4 + '***'
    expect(matches[0]?.redactedSample.endsWith('***')).toBe(true)
  })
})
```

---

## Gotchas

- **G1 do plano (whitelist/blacklist):** Esta fase nao filtra arquivos — apenas escaneia uma string ja lida. O Step 06 (fase-02) eh quem aplica o filtro de paths antes de chamar `scanSecrets` para cada arquivo. Aqui a responsabilidade eh **pura**.
- **Local (regex global flag + lastIndex):** Bug classico — `RegExp` com flag `g` mantem `lastIndex` entre `exec` calls. Se reusar a mesma instancia para multiplas linhas, ele pula caracteres validos. Clonar `new RegExp(p.source, p.flags)` por linha. Teste #8 cobre.
- **Local (email false positive em URLs):** Regex de email casa em strings tipo `support@example.com` mesmo dentro de URLs `https://mailto:support@example.com`. Aceitavel para v6.4.0 — Step 06 documenta como "1 arquivo com possivel email" e dev decide override. WH-01 (gitleaks como upgrade) cobre o caso mais sofisticado.
- **Local (redacao nunca em log bruto):** `redactedSample` nunca contem o segredo completo, apenas 4 chars + `***`. Mesmo em testes, nao logar o conteudo retornado por `exec()` diretamente.

---

## Verificacao

### TDD

- [ ] **RED:** Cada teste do passo 4 escrito ANTES da implementacao. Comando: `bun test skills/init/lib/secrets-scanner.test.ts` — resultado esperado: `0 pass, 10 fail` (modulo nao existe ou retorna shape errado).
- [ ] **GREEN:** Implementacao do passo 3 + tipos do passo 1 + regex do passo 2. Comando: `bun test skills/init/lib/secrets-scanner.test.ts` — resultado esperado: `10 pass, 0 fail`.
- [ ] **REFACTOR:** Extrair `redactSample` para funcao interna se ja nao estiver, garantir `readonly` em tipos publicos. Re-rodar testes.

### Checklist

- [ ] `skills/init/lib/secrets-scanner.ts` exporta exatamente 3 simbolos publicos: `scanSecrets`, `SecretMatch`, `SecretKind`.
- [ ] Sem uso de `any` no codigo (CLAUDE.md global).
- [ ] Sem uso de `as` exceto type guards minimos.
- [ ] Regex literais conferem byte-a-byte com os 5 do PRD (passo 2).
- [ ] `redactedSample` para qualquer match tem comprimento <= 7 chars.
- [ ] `bun test skills/init/lib/secrets-scanner.test.ts` retorna `10 pass, 0 fail` (ou ajuste de count se REFACTOR adicionou testes).
- [ ] `bun run lint skills/init/lib/secrets-scanner.ts skills/init/lib/secrets-scanner.test.ts` limpo.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/secrets-scanner.test.ts` exit 0.
- `bun run lint skills/init/lib/secrets-scanner.ts` exit 0.
- `grep -c 'AKIA\[0-9A-Z\]' skills/init/lib/secrets-scanner.ts` retorna `1` (regex AWS canonico).
- `grep -c 'sk_live_' skills/init/lib/secrets-scanner.ts` retorna `1`.
- `grep -c 'postgres(?:ql)?' skills/init/lib/secrets-scanner.ts` retorna `1`.

**Por humano:**
- Reviewer le `secrets-scanner.ts` em ~3 minutos e consegue explicar: (1) por que `scanSecrets` clona o regex por linha, (2) por que `redactedSample` limita a 4 chars, (3) como adicionar um novo `SecretKind` no futuro (alterar `SECRET_PATTERNS` + union `SecretKind`).

---

## Decisoes Aplicadas

- **D16 do PRD** (scan secrets antes de move): esta fase entrega a primitiva pura usada pelo Step 06 (fase-02). Bloqueio por arquivo, nao por init inteiro (CA-04).
- **SH-01 do PRD** (regex AWS/Stripe-live/Postgres/email/JWT): os 5 regex sao literais e cobertos por testes pareados.
- **WH-01 do PRD** (gitleaks deferido v6.5+): esta fase NAO depende de binarios externos. Tudo em pure TS via regex builtin.
- **R-04 do PRD** (compat Windows): `String.split('\n')` aceita LF e CRLF (no LF, '\r' fica no final da linha — regex nao depende de fim de linha). Sem path operations aqui.
- **CLAUDE.md global** (nunca `any`): tipos exportados com union literal + `readonly` em propriedades e arrays.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

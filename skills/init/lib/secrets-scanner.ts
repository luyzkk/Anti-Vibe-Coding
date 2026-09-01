// 2026-09-01 (Luiz/dev): +8 kinds — port das familias default do gitleaks (MIT), derivadas
// por conceito (nao copiadas do TOML). PRD §RF-02 / §Decisões D5.
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

// 2026-09-01 (Luiz/dev): segundo eixo, obrigatorio — BUG-01 da fase-01. Shannon mede
// DIVERSIDADE de caracteres, nao imprevisibilidade: medido no repo, 'abc..xyz0123456789'
// (zero aleatoriedade) da 5.17 bits/char, ACIMA de um secret real aleatorio (5.00). Como o
// falso positivo pontua mais alto que o verdadeiro positivo, NENHUM limiar de entropia
// separa os dois — por isso o guard e um eixo independente, nao um ajuste de corte.
// Margem medida: sequencia monotonica tem corrida 10-26; secret real tem 1-2. PRD §RF-02.
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

// 2026-09-01 (Luiz/dev): linhas que carregam blob base64 legitimo e PUBLICO. Suprimem
// SOMENTE a heuristica de entropia — as regras especificas continuam valendo na linha.
// PRD §RF-02: falso positivo em massa mata a adocao do scanner. GT-2 da fase-01: o eixo
// entropia+sequencia nao resolve essa classe por design (chave publica tem entropia real).
const ENTROPY_LINE_SUPPRESSORS: ReadonlyArray<RegExp> = [
  /\bssh-(?:rsa|ed25519|dss)\b/, // chave PUBLICA — nao e secret
  /\b(?:sha256|sha384|sha512)-[A-Za-z0-9+/=]/, // SRI e integrity de lockfile
  /\bdata:[a-z]+\/[a-z0-9.+-]+;base64,/i, // data URI embutido
  /-----(?:BEGIN|END) [A-Z ]+-----/, // corpo PEM: private-key ja marcou a linha do header
]

function suppressesEntropy(line: string): boolean {
  return ENTROPY_LINE_SUPPRESSORS.some((re) => re.test(line))
}

// 2026-05-18 (Luiz/dev): regex literais do PRD SH-01 + D16. NAO usar lookbehind
// (compatibilidade com runtimes JS antigos). 'g' flag obrigatoria — scanSecrets
// itera matches.
// 2026-09-01 (Luiz/dev): +8 kinds — familias default do gitleaks (MIT) derivadas por
// conceito, licenca confirmada no MEMORY do plano — PRD §Decisões D5 / §RF-02.
// ORDEM = PRIORIDADE (usedRanges): especificas -> semi-genericas -> genericas -> entropia.
// 'high-entropy' e a regra mais generica e fica SEMPRE por ultimo, senao engole os demais.
const SECRET_PATTERNS: ReadonlyArray<SecretRule> = [
  // --- credenciais de cloud, shape unico ---
  { kind: 'aws-key',            pattern: /AKIA[0-9A-Z]{16}/g },
  // AWS secret key nao tem prefixo distintivo: 40 chars base64 e shape generico demais.
  // Ancorar pela palavra-chave a esquerda DENTRO do match (sem lookbehind, G5).
  { kind: 'aws-secret-key',     pattern: /aws_secret_access_key["'\s:=]+[A-Za-z0-9/+=]{40}/gi },
  { kind: 'gcp-api-key',        pattern: /AIza[0-9A-Za-z_-]{35}/g },
  { kind: 'gcp-service-account', pattern: /"type"\s*:\s*"service_account"/g },
  { kind: 'azure-storage-key',  pattern: /AccountKey=[A-Za-z0-9+/=]{20,}/g },

  // --- tokens de plataforma, prefixo distintivo ---
  { kind: 'stripe-live',        pattern: /sk_live_[A-Za-z0-9]{24,}/g },
  { kind: 'github-token',       pattern: /ghp_[0-9A-Za-z]{36}/g },
  // slack-webhook antes de slack-token: a URL contem segmentos que casam com o shape do
  // token, o webhook precisa reservar o range primeiro.
  { kind: 'slack-webhook',      pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/]{20,}/g },
  { kind: 'slack-token',        pattern: /xox[baprs]-[0-9A-Za-z-]{20,}/g },

  // --- material de chave ---
  { kind: 'private-key',        pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g },

  // --- connection strings (postgres separado por retrocompatibilidade do kind) ---
  { kind: 'postgres-url',       pattern: /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@[^\s/]+/g },
  // exige user:pass@ — sem credencial, sem match (mongodb://localhost:27017/app fica limpo).
  { kind: 'db-connection-url',  pattern: /(?:mysql|mongodb(?:\+srv)?|redis|rediss|amqps?):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/g },

  // --- genericas ---
  { kind: 'email',              pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'jwt',                pattern: /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/g },
  { kind: 'high-entropy',       pattern: ENTROPY_CANDIDATE, validate: isHighEntropySecret },
]

export function scanSecrets(content: string): readonly SecretMatch[] {
  const matches: SecretMatch[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    // 2026-05-18 (Luiz/dev): rastrear intervalos usados para nao duplicar matches sobrepostos
    // (ex: email dentro de postgres-url). Padroes de maior prioridade vem primeiro no array.
    const usedRanges: Array<[number, number]> = []
    // 2026-09-01 (Luiz/dev): checar uma vez por linha, nao por match. PRD §RF-02.
    const entropySuppressed = suppressesEntropy(line)

    for (const { kind, pattern, validate } of SECRET_PATTERNS) {
      if (kind === 'high-entropy' && entropySuppressed) continue
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
  }

  return matches
}

function redactSample(rawMatch: string): string {
  const prefix = rawMatch.slice(0, 4)
  return `${prefix}***`
}

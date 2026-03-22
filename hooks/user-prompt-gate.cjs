'use strict';

/**
 * user-prompt-gate.cjs - Anti-Vibe Coding v4.0 Skill Advisor
 *
 * UserPromptSubmit hook (type: command).
 * Detects technical domains in user prompts and injects skill recommendations
 * as plain text stdout (correct format for UserPromptSubmit hooks).
 *
 * Architecture: Layer 2 of Dual-Layer system.
 * - Layer 1 (SessionStart) gives Claude persistent skill awareness
 * - Layer 2 (this script) provides immediate domain-specific reinforcement
 *
 * Output: plain text to stdout on exit 0 = added as context for Claude.
 * No output + exit 0 = pass through silently.
 */

const BYPASS_KEYWORDS = [
  'prosseguir', 'sem skill', 'já consultei', 'ja consultei',
  'skip', 'pode implementar', 'implementar direto', 'sem fase zero',
  'continue without', 'skip skill', 'no skill',
];

const LEARN_PATTERNS = [
  /^(o que [eé]|what is|what are|qual [eé])/i,
  /(como funciona|how does|how do|how is)/i,
  /(me explic|explain|explique|ensina|teach me|quero entender|quero aprender|nao entendi|nao sei o que)/i,
  /(pra que serve|what.*for|what.*used for|para que serve)/i,
  /(como.*funciona|como.*trabalha|how.*work)/i,
];

const SILENT_PATTERNS = [
  // Questions / explanations (now handled by LEARN_PATTERNS detection below)
  /^(entenda|entender|where is|quem|who)/i,
  // Debugging / investigation
  /(find the bug|what is wrong|why is this failing|encontr[ae] o bug|por que est[aá] falhando|debug|investigate|investig[ue]|what happened|o que aconteceu)/i,
  // Trivial fixes
  /(typo|renomear|rename|formata[çc][aã]o|formatting|1[-\s]line|fix typo|corrigir typo|indent|ajustar espa[çc]o)/i,
  // Reading / exploration
  /(listar|listing|ler |reading|verificar status|check status|show me|mostr[ae]|look at|olh[ae]|read |abr[aei]r? |open )/i,
  // Git operations
  /^(commit|push|pull|merge|rebase|cherry-pick|stash|git )/i,
  // Direct skill/command invocations
  /^\//,
];

const DOMAINS = [
  {
    name: 'React patterns',
    skill: '/anti-vibe-coding:react-patterns',
    label: 'React/Next.js patterns detectado',
    pattern: new RegExp([
      'useEffect', 'useState', 'useRef', 'useMemo', 'useCallback', 'useContext',
      'useReducer', 'useLayoutEffect', 'custom hook', 'hook personalizado',
      're-render', 'rerender', 'renderiza[çc][aã]o', 'memoization', 'memoiza[çc]',
      'React\\.memo', 'memo\\(', 'Context API', 'context provider',
      'Zustand', 'TanStack Query', 'React Query', 'SWR',
      'stale closure', 'closure stale', 'derived state', 'estado derivado',
      'component optimization', 'otimiza[çc][aã]o de componente',
      'state lifting', 'lifting state', 'elevar estado',
      'prop drilling', 'server component', 'client component',
      'suspense', 'error boundary', 'lazy loading', 'code splitting',
      'virtualiza[çc]', 'virtualization', 'infinite scroll',
      'form[uú]l[aá]rio react', 'react form', 'react hook form',
      'componente react', 'react component', 'next\\.js component',
    ].join('|'), 'i'),
  },
  {
    name: 'Security',
    skill: '/anti-vibe-coding:security',
    label: 'Dominio de seguranca detectado',
    pattern: new RegExp([
      'autentica[çc][aã]o', 'autoriza[çc][aã]o', 'authentication', 'authorization',
      'login', 'logout', 'signup', 'sign[- ]?up', 'sign[- ]?in', 'register',
      '2FA', 'TOTP', 'MFA', 'passkey', 'webauthn', 'biometric',
      'senha', 'password', 'hash', 'bcrypt', 'argon2', 'scrypt',
      'criptografia', 'encrypt', 'decrypt', 'cipher',
      'JWT', 'json web token', 'access token', 'refresh token', 'token\\b',
      'RLS', 'row[- ]level security', 'row level',
      'CORS', 'CSP', 'content security policy', 'helmet',
      'rate limit', 'throttl', 'brute force',
      'SQL injection', 'XSS', 'cross[- ]site', 'CSRF', 'SSRF',
      'webhook HMAC', 'webhook secret', 'webhook validation',
      'secrets', 'secret key', 'api key', 'chave secreta',
      '\\.env', 'vari[aá]veis de ambiente', 'environment variable',
      'ID sequencial', 'sequential ID', 'UUID', 'ULID',
      'S3', 'presigned URL', 'signed URL',
      'permiss[oõ]es', 'permissions', '\\broles\\b', 'RBAC', 'ABAC',
      'oauth', 'openid', 'OIDC', 'SSO', 'SAML', 'PKCE',
      'session', 'sess[aã]o', 'cookie segur',
      'sanitiz', 'validat.*input', 'input validation',
      'WAF', 'DDoS', 'MITM', 'man in the middle',
      'localStorage.*token', 'httpOnly', 'SameSite',
    ].join('|'), 'i'),
  },
  {
    name: 'System Design',
    skill: '/anti-vibe-coding:system-design',
    label: 'System Design detectado',
    pattern: new RegExp([
      '\\bcache\\b', 'caching', 'Redis', 'Memcached',
      'invalida[çc][aã]o', 'invalidation', '\\bTTL\\b', 'cache stampede', 'cache bust',
      'escalabilidade', 'scalab', 'escalar', 'scaling',
      'horizontal', 'vertical', 'auto[- ]?scaling',
      'CAP theorem', 'consist[eê]ncia', 'consistency', 'disponibilidade', 'availability',
      'SQL vs NoSQL', 'escolha de banco', 'database selection', 'which database',
      'replica[çc][aã]o', 'replication', 'sharding', 'particionamento', 'partitioning',
      'fila de mensagens', 'message queue', 'RabbitMQ', 'SQS', 'Kafka', 'BullMQ',
      'event[- ]?driven', 'event sourcing',
      'job em background', 'background job', 'worker', 'cron job',
      'throughput', 'latency', 'lat[eê]ncia',
      'load balanc', 'balanceamento de carga',
      'CDN', 'edge computing', 'edge server', 'POP', 'anycast',
      'serverless', 'Lambda', 'cold start', 'microservice',
      'PM2', 'process manager',
      'load balanc.*algorithm', 'round robin', 'least connections', 'consistent hashing',
      'circuit breaker', 'retry', 'backoff', 'dead letter',
      'eventual consistency', 'strong consistency',
    ].join('|'), 'i'),
  },
  {
    name: 'API Design',
    skill: '/anti-vibe-coding:api-design',
    label: 'API Design detectado',
    pattern: new RegExp([
      '\\bendpoint\\b', '\\brota\\b', '\\broute\\b', 'API route',
      'N\\+1', 'n plus one', 'query N\\+1',
      'idempot[eê]n', 'idempoten',
      '\\bDTO\\b', 'data transfer', 'transfer object',
      'valida[çc][aã]o de input', 'input validation', 'whitelist de campos',
      'webhook vs WebSocket', '\\bSSE\\b', 'Server[- ]Sent Events', 'websocket',
      'opera[çc][aã]o ass[ií]ncrona', 'async operation', 'processamento em background',
      'versionamento de API', 'API version', 'v1.*v2',
      'pagina[çc][aã]o', 'pagination', 'cursor[- ]?based', 'offset[- ]?based', 'keyset',
      'REST pattern', 'RESTful', 'GraphQL', 'GraphQL schema', 'GraphQL depth',
      'gRPC', 'AMQP', 'RabbitMQ', 'Protocol Buffers', 'protobuf',
      'HATEOAS', 'API versioning',
      'rate limit.*API', 'API rate',
      'status code', 'HTTP status',
      'request.*response', 'middleware',
      'API design', 'API gateway',
      'bulk.*operation', 'batch.*endpoint',
      'upload.*endpoint', 'download.*endpoint',
      'streaming.*API', 'long polling',
    ].join('|'), 'i'),
  },
  {
    name: 'Architecture',
    skill: '/anti-vibe-coding:architecture',
    label: 'Decisao arquitetural detectada',
    pattern: new RegExp([
      '\\bSOLID\\b', '\\bSRP\\b', '\\bOCP\\b', '\\bLSP\\b', '\\bISP\\b', '\\bDIP\\b',
      'inje[çc][aã]o de depend[eê]ncia', 'dependency injection',
      'mon[oó]lito vs micro', 'monolith', 'microservi[çc]',
      'CQRS', 'Event Sourcing', 'event store',
      'REST vs GraphQL', 'qual usar.*REST',
      'separa[çc][aã]o de camadas', 'layered architecture', 'clean architecture', 'hexagonal',
      'fat controller', 'controller gordo',
      'Law of Demeter', 'Demeter',
      'Tell[- ]Don.t[- ]Ask',
      'acoplamento', 'coupling', 'coes[aã]o', 'cohesion',
      'composi[çc][aã]o vs heran[çc]a', 'composition vs inheritance', 'composition over',
      'design pattern', 'padr[aã]o de projeto',
      'factory', 'strategy', 'observer', 'singleton', 'repository pattern',
      'domain[- ]?driven', 'DDD', 'aggregate', 'bounded context',
      'service layer', 'camada de servi[çc]o',
      'invers[aã]o de controle', 'IoC', 'inversion of control',
      'constructor injection', 'DI container', 'IoC container',
    ].join('|'), 'i'),
  },
  {
    name: 'Infrastructure',
    skill: '/anti-vibe-coding:infrastructure',
    label: 'Infraestrutura detectada',
    pattern: new RegExp([
      '\\bDNS\\b', 'domain setup', 'dom[ií]nio.*configurar', 'configurar dom[ií]nio',
      '\\bSSL\\b', 'TLS certificate', 'certificado SSL', 'Let.s Encrypt', 'cert-manager',
      '\\bVPS\\b', '\\bEC2\\b', 'hosting', 'hospedagem',
      '\\bDeploy\\b', '\\bdeploy\\b', 'deployment', 'CI/CD', 'pipeline',
      '\\bPM2\\b', 'process manager', 'ecosystem\\.config',
      '\\bDocker\\b', 'docker-compose', 'Dockerfile', 'container',
      '\\bKubernetes\\b', '\\bK8s\\b', '\\bhelm\\b',
      '\\bNginx\\b', '\\bHAProxy\\b', 'reverse proxy',
      'health check', 'health endpoint', '/health',
      'Route 53', 'CloudFront', 'S3.*hosting', 'S3.*bucket',
      '\\bCDN\\b.*config', 'Cloudflare.*config',
      'zero[- ]?downtime', 'blue[- ]?green', 'canary deploy', 'rolling update',
    ].join('|'), 'i'),
  },
  {
    name: 'Code Quality',
    skill: '/anti-vibe-coding:design-patterns',
    label: 'Code quality / design patterns detectado',
    pattern: new RegExp([
      'code smell', 'cheiro de c[oó]digo',
      'refatorar', 'refatora[çc][aã]o', 'refactor',
      'fun[çc][aã]o longa', 'long function', 'long method',
      'God object', 'God class', 'classe deus',
      'feature envy', 'primitive obsession',
      'magic number', 'n[uú]mero m[aá]gico',
      '\\bDRY\\b', 'don.t repeat', 'duplica[çc][aã]o',
      'Result pattern', 'Either pattern', 'error handling pattern',
      'logging estruturado', 'structured logging', 'observability', 'observabilidade',
      'domain type', 'tipo de dom[ií]nio', 'value object', 'branded type',
      'race condition', 'condi[çc][aã]o de corrida', 'deadlock', 'mutex',
      'c[oó]digo legado', 'legacy code', 'technical debt', 'd[ií]vida t[eé]cnica',
      'extrair fun[çc][aã]o', 'extract function', 'extract method',
      'complexidade ciclom[aá]tica', 'cyclomatic complexity',
      'c[oó]digo duplicado', 'duplicated code',
      'early return', 'guard clause',
    ].join('|'), 'i'),
  },
  {
    name: 'Payments',
    skill: '/anti-vibe-coding:consultant',
    label: 'Dominio financeiro critico — envolve security + api-design + system-design',
    pattern: new RegExp([
      '\\bpagamento\\b', 'payment', '\\bcheckout\\b',
      '\\bPIX\\b', '\\bcart[aã]o\\b', 'credit card', 'debit card',
      '\\bcr[eé]dito\\b', '\\bd[eé]bito\\b',
      '\\bsplit\\b.*pay', 'split payment',
      '\\bcobran[çc]a\\b', 'charge', 'billing',
      '\\bassinatura\\b', 'subscription', 'recurring',
      '\\breembolso\\b', '\\bestorno\\b', 'refund', 'chargeback',
      'marketplace financeiro',
      'webhook de pagamento', 'payment webhook',
      '\\bgateway\\b', 'payment gateway',
      'Pagar\\.me', '\\bStripe\\b', 'AbacatePay', 'Mercado Pago',
      '\\bboleto\\b', 'bank slip',
      'antifraude', 'anti[- ]?fraud', 'fraud detection',
    ].join('|'), 'i'),
  },
  {
    name: 'Database',
    skill: '/anti-vibe-coding:api-design',
    label: 'Banco de dados / queries detectado — verifique N+1, indices e performance',
    pattern: new RegExp([
      'migration\\b', 'migra[çc][aã]o de banco', 'database migration', 'schema migration',
      '\\bindice\\b', '\\bindex\\b', '\\bindices\\b', '\\bindexes\\b', 'adicionar.*index', 'criar.*index',
      'query.*lent', 'slow query', 'otimizar.*query', 'optimize.*query', 'query.*performance',
      'eager load', 'lazy load.*banco', 'prisma.*include', 'prisma.*select', 'drizzle.*query',
      'criar.*tabela', 'nova.*tabela', 'create table', 'alter table', 'drop table',
      'foreign key', 'chave estrangeira', 'relacionamento.*banco',
      'transaction.*banco', 'banco.*transaction', 'rollback',
      'supabase.*query', 'query.*supabase',
    ].join('|'), 'i'),
  },
  {
    name: 'TDD',
    skill: '/anti-vibe-coding:tdd-workflow',
    label: 'TDD workflow detectado',
    pattern: new RegExp([
      'implementar com TDD', 'implement with TDD',
      'escrever testes primeiro', 'write tests first', 'test[- ]?first',
      'red green refactor', 'red[- ]green[- ]refactor',
      'test[- ]?driven', '\\bTDD\\b',
      'ciclo TDD', 'TDD cycle',
      'iniciar com teste', 'start with test',
      'criar teste antes', 'create test before',
      'test before code', 'teste antes do c[oó]digo',
      'adicionar testes', 'add tests', 'criar testes', 'create tests',
      'cobertura de teste', 'test coverage', 'escrever testes',
      'teste unit[aá]rio', 'unit test', 'teste de integra[çc][aã]o', 'integration test',
      'teste e2e', 'e2e test', 'end[- ]to[- ]end test',
    ].join('|'), 'i'),
  },
  {
    name: 'Complex Decision',
    skill: '/anti-vibe-coding:consultant',
    label: 'Decisao complexa detectada — use Fase Zero antes de implementar',
    pattern: new RegExp([
      'como devo implementar', 'how should I implement',
      'qual a melhor abordagem', 'what.s the best approach', 'best way to',
      'qual padr[aã]o usar', 'which pattern', 'which approach',
      'decis[aã]o irrevers[ií]vel', 'irreversible decision',
      'schema de banco', 'database schema', 'data model',
      'escolha de tecnologia', 'tech stack', 'technology choice', 'which library',
      'lib cr[ií]tica', 'critical library', 'critical dependency',
      'feature nova sem abordagem', 'new feature.*approach',
      'm[uú]ltiplos dom[ií]nios', 'multiple domains', 'cross[- ]?cutting',
      'trade[- ]?off', 'pros and cons', 'pr[oó]s e contras',
      'migra[çc][aã]o.*banco', 'database migration', 'schema migration',
      'quebra de contrato', 'breaking change',
    ].join('|'), 'i'),
  },
];

// Detects implementation requests that didn't match any specific domain
const IMPLEMENTATION_PATTERNS = [
  /\b(implementar|implement|criar|create|construir|build|adicionar|add|develop|desenvolver)\b/i,
  /\b(fazer|make|configurar|configure|setup|set up|integrar|integrate)\b/i,
  /\b(nova feature|new feature|novo m[oó]dulo|new module|novo componente|new component)\b/i,
  /\b(refatorar|refactor|rewrite|reescrever|migrar|migrate|converter|convert)\b/i,
  /\b(melhorar|improve|otimizar|optimize|atualizar|update|upgrade)\b/i,
];

function processPrompt(prompt) {
  const text = (prompt || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();

  // STEP 1: Bypass check
  if (BYPASS_KEYWORDS.some(kw => lower.includes(kw))) return null;

  // STEP 2: Anti-deadlock — user already invoking a skill or command
  if (/\/anti-vibe-coding:/i.test(text) || /^\/.+/.test(text.trim())) return null;

  // STEP 3: Silent patterns — skip if no implementation intent detected alongside
  const hasImplementation = IMPLEMENTATION_PATTERNS.some(re => re.test(text));
  if (!hasImplementation && SILENT_PATTERNS.some(re => re.test(text))) return null;

  // STEP 3.5: Learning intent — suggest /learn skill
  if (!hasImplementation && LEARN_PATTERNS.some(re => re.test(text))) {
    return '[SKILL_ADVISOR] Intencao de aprendizado detectada. Sugira ao usuario a skill /anti-vibe-coding:learn para uma explicacao adaptativa ao seu nivel. Pergunte se deseja invocar.';
  }

  // STEP 4: Domain classification — find ALL matching domains
  const matches = [];
  for (const domain of DOMAINS) {
    if (domain.pattern.test(text)) {
      matches.push(domain);
    }
  }

  // STEP 5: Build recommendation based on matches
  if (matches.length === 1) {
    const d = matches[0];
    return `[SKILL_ADVISOR] ${d.label}. Recomende ao usuario a skill ${d.skill} e pergunte se deseja invocar antes de implementar.`;
  }

  if (matches.length >= 2) {
    const names = matches.map(d => d.name).join(', ');
    const skills = matches.map(d => `  - ${d.skill} (${d.name})`).join('\n');
    return `[SKILL_ADVISOR] Multiplos dominios detectados: ${names}. Recomende /anti-vibe-coding:consultant (Fase Zero) para avaliar a abordagem antes de implementar. Dominios envolvidos:\n${skills}`;
  }

  // STEP 6: Implementation fallback — looks like implementation but no domain matched
  if (IMPLEMENTATION_PATTERNS.some(re => re.test(text))) {
    return '[SKILL_ADVISOR] Pedido de implementacao detectado. Avalie qual skill e mais relevante para esta tarefa e pergunte ao usuario se deseja consultar antes de prosseguir.';
  }

  // STEP 7: No match — let SessionStart instruction handle it
  return null;
}

// --- I/O handling ---

let rawInput = '';
let handled = false;

function output(text) {
  if (!text) {
    process.exit(0);
    return;
  }
  try {
    process.stdout.write(text + '\n');
  } catch (_) { /* ignore broken pipe */ }
  process.exit(0);
}

function processInput() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);
  try {
    const input = JSON.parse(rawInput || '{}');
    const prompt = input.prompt || input.message || input.content || '';
    const result = processPrompt(prompt);
    output(result);
  } catch {
    // fail-open: on error, pass through silently
    process.exit(0);
  }
}

const safetyTimer = setTimeout(() => {
  if (!handled) processInput();
}, 500);

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  rawInput += chunk;
  try {
    JSON.parse(rawInput);
    setImmediate(() => { if (!handled) processInput(); });
  } catch {
    // incomplete JSON — wait for more chunks
  }
});
process.stdin.on('end', processInput);
process.stdin.on('error', () => {
  process.exit(0);
});

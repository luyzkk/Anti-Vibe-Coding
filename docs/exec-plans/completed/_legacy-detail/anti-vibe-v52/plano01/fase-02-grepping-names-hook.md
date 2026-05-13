# Fase 02: grepping-names hook

**Plano:** 01 — Infraestrutura — Hooks Novos
**Sizing:** ~1h
**Depende de:** Fase 01 (apenas para sequenciar edição no hooks.json; lógica independente)
**Visual:** false (hook de infraestrutura, sem UI)

---

## O que esta fase entrega

Hook PreToolUse `grepping-names.cjs` que intercepta `git commit` e emite warning não-blocking quando o diff staged introduz nomes genéricos conhecidos (`data`, `handler`, `process`, `Manager`, `Service`, `Helper`, `Utils`, `info`, `temp`, `obj`, `result`) ou qualquer nome novo com mais de 10 ocorrências no codebase.

---

## Arquivos Afetados

| Arquivo | Operação | Caminho relativo ao repo anti-vibe-coding/ |
|---------|----------|---------------------------------------------|
| `grepping-names.cjs` | Criar | `hooks/grepping-names.cjs` |
| `hooks.json` | Modificar | `hooks/hooks.json` |

---

## Implementação

### Passo 1 — Criar `hooks/grepping-names.cjs`

Caminho absoluto: `f:/Projetos/Claude code/anti-vibe-coding/hooks/grepping-names.cjs`

```js
'use strict';

/**
 * grepping-names.cjs - Anti-Vibe Coding v5.2
 *
 * PreToolUse hook (matcher: Bash, filtra git commit): emite warning quando
 * o diff staged introduz nomes genéricos conhecidos ou nomes com >10 hits
 * no codebase.
 *
 * Advisory only — NUNCA bloqueia (exit 0 sempre).
 * Fail-open: qualquer erro → process.exit(0) silencioso.
 *
 * Nota Windows: usa `grep` via git bash/WSL. Em PowerShell puro sem git bash,
 * o grep pode não estar disponível — o hook falha silenciosamente via try/catch.
 */

const { execSync } = require('child_process');
const path = require('path');

// Nomes genéricos proibidos (word-boundary match)
const GENERIC_NAMES = new Set([
  'data', 'handler', 'process', 'Manager', 'Service',
  'Helper', 'Utils', 'info', 'temp', 'obj', 'result',
  'value', 'item', 'list', 'response', 'error', 'err',
  'res', 'req', 'cb', 'callback', 'fn', 'func', 'args',
]);

// Threshold de hits no codebase para considerar nome "genérico por uso"
const HIT_THRESHOLD = 10;

// Diretórios de busca para grep
const SEARCH_DIRS = ['src', 'lib', 'app', 'pages', 'components'];

/**
 * Extrai nomes de variáveis/funções introduzidos no diff staged.
 * Analisa linhas com `+` (adições) no diff unificado.
 * Retorna Set de nomes únicos encontrados.
 */
function extractNewNamesFromDiff() {
  let diff;
  try {
    diff = execSync('git diff --staged', { timeout: 15000, encoding: 'utf8', stdio: 'pipe' });
  } catch {
    return new Set();
  }

  const names = new Set();
  const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));

  // Padrões de declaração de nome:
  // const/let/var nome =
  // function nome(
  // nome: tipo  (parâmetro ou propriedade)
  // class nome
  const DECL_PATTERNS = [
    /(?:const|let|var)\s+(\w+)\s*[=:]/g,
    /function\s+(\w+)\s*\(/g,
    /(?:async\s+)?(\w+)\s*[:=]\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\S+\s*)?=>/g,
    /class\s+(\w+)/g,
    /(?:^|\s)(\w+)\s*\(/g,  // chamadas/declarações genéricas
  ];

  for (const line of addedLines) {
    // Remove prefixo `+`
    const cleaned = line.slice(1);
    for (const pattern of DECL_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        const name = match[1];
        // Filtra: apenas nomes com >=3 chars, sem números isolados, sem palavras-chave JS
        if (name && name.length >= 2 && !/^\d+$/.test(name)) {
          names.add(name);
        }
      }
    }
  }

  return names;
}

/**
 * Conta hits de um nome no codebase usando grep.
 * Retorna -1 se grep não disponível ou erro.
 */
function countHitsInCodebase(name, cwd) {
  // Determina quais diretórios existem
  const existingDirs = SEARCH_DIRS.filter(d => {
    try {
      const { statSync } = require('fs');
      statSync(path.join(cwd, d));
      return true;
    } catch {
      return false;
    }
  });

  // Se nenhum diretório padrão existe, busca no cwd
  const searchTarget = existingDirs.length > 0
    ? existingDirs.join(' ')
    : '.';

  const grepCmd = `grep -r "\\b${name}\\b" ${searchTarget} --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l 2>/dev/null | wc -l`;

  try {
    const result = execSync(grepCmd, {
      timeout: 10000,
      encoding: 'utf8',
      stdio: 'pipe',
      cwd,
      shell: true,
    });
    const count = parseInt(result.trim(), 10);
    return isNaN(count) ? -1 : count;
  } catch {
    return -1;
  }
}

/**
 * Gera sugestão de nome específico baseado no nome genérico.
 * Heurística simples: prefixar com contexto comum.
 */
function suggestSpecificName(name) {
  const suggestions = {
    'data':     'invoiceData / userProfileData / orderData',
    'handler':  'onSubmitHandler / onClickHandler / invoiceSubmitHandler',
    'process':  'processInvoice / processPayment / processUserSignup',
    'Manager':  'InvoiceManager / UserSessionManager',
    'Service':  'InvoiceService / PaymentService / AuthService',
    'Helper':   'DateFormatHelper / CurrencyHelper',
    'Utils':    'DateUtils / StringUtils / CurrencyUtils',
    'info':     'userInfo / invoiceInfo / sessionInfo',
    'temp':     'tempFilePath / tempOrderId',
    'obj':      'invoiceObj / userObj',
    'result':   'parseResult / fetchResult / validationResult',
    'value':    'inputValue / priceValue / selectedValue',
    'item':     'cartItem / listItem / menuItem',
    'list':     'invoiceList / userList / orderList',
    'response': 'apiResponse / fetchResponse / httpResponse',
    'error':    'validationError / networkError / parseError',
    'err':      'networkErr / parseErr',
    'res':      'apiRes / httpRes',
    'req':      'httpReq / apiReq',
    'cb':       'onSuccessCallback / onErrorCallback',
    'callback': 'onSuccessCallback / onErrorCallback',
    'fn':       'transformFn / filterFn / mapFn',
    'func':     'transformFunc / filterFunc',
    'args':     'cliArgs / constructorArgs / queryArgs',
  };
  return suggestions[name] || `nome específico para ${name}`;
}

// — Main logic ——————————————————————————————————————————————————————————————

let rawInput = '';
let handled  = false;

const safetyTimer = setTimeout(() => {
  if (!handled) { handled = true; process.exit(0); }
}, 8000);

function run() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);

  try {
    const input     = JSON.parse(rawInput || '{}');
    // PreToolUse: { tool_name, tool_input: { command: "git commit ..." } }
    const toolInput = input.tool_input || input;
    const command   = toolInput.command || process.env.CLAUDE_TOOL_INPUT || '';

    // Só ativa para git commit
    if (!command.includes('git commit')) return process.exit(0);

    const cwd = process.cwd();
    const newNames = extractNewNamesFromDiff();

    if (newNames.size === 0) return process.exit(0);

    const warnings = [];

    for (const name of newNames) {
      // Verificação 1: nome está na lista de genéricos conhecidos
      if (GENERIC_NAMES.has(name)) {
        const suggestion = suggestSpecificName(name);
        warnings.push(
          `[GREPPING] '${name}' é nome genérico conhecido. Prefira nome específico como '${suggestion}'.`
        );
        continue; // não fazer grep para nomes já sinalizados como genéricos
      }

      // Verificação 2: nome com >HIT_THRESHOLD hits no codebase
      const hits = countHitsInCodebase(name, cwd);
      if (hits > HIT_THRESHOLD) {
        const suggestion = suggestSpecificName(name) !== `nome específico para ${name}`
          ? suggestSpecificName(name)
          : `${name}ForInvoice / ${name}ForUser`;
        warnings.push(
          `[GREPPING] '${name}' retorna ${hits} hits — nome genérico. Prefira nome específico como '${suggestion}'.`
        );
      }
    }

    if (warnings.length > 0) {
      process.stdout.write(warnings.join('\n') + '\n');
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

process.stdin.setEncoding('utf8');
process.stdin.on('data',  chunk => { rawInput += chunk; });
process.stdin.on('end',   run);
process.stdin.on('error', () => { if (!handled) { handled = true; clearTimeout(safetyTimer); process.exit(0); } });
```

### Passo 2 — Adicionar entry no `hooks.json`

Localizar a seção `"PreToolUse"` no `hooks.json`. Existe atualmente um bloco com matcher `"Bash"` (para o pre-commit que roda `bun run test && bun run lint`). Adicionar **novo bloco** com matcher `"Bash"` para o `grepping-names`, **após** os blocos existentes (Write|Edit e Bash de testes):

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/grepping-names.cjs')}catch(e){process.exit(0)}\"",
      "timeout": 15
    }
  ]
}
```

**Posição exata no JSON:** inserir como **terceiro elemento** do array `"PreToolUse"`, após o bloco `Write|Edit` (tdd-gate), o bloco `Write|Edit` (prompt-guard) e o bloco `Bash` (bun test). O array PreToolUse após a mudança deve ficar:

```json
"PreToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/tdd-gate.cjs')}catch(e){process.exit(0)}\"",
        "timeout": 10
      }
    ]
  },
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/prompt-guard.cjs')}catch(e){process.exit(0)}\"",
        "timeout": 5
      }
    ]
  },
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"const input=process.env.CLAUDE_TOOL_INPUT||'';if(!input.includes('git commit')){process.exit(0)}const{execSync}=require('child_process');try{execSync('bun run test',{timeout:60000,stdio:'pipe'});execSync('bun run lint',{timeout:30000,stdio:'pipe'})}catch(e){process.stderr.write('[PRE-COMMIT] Testes ou lint falharam. Corrija antes de commitar: '+e.message.slice(0,200));process.exit(2)}\"",
        "timeout": 90
      }
    ]
  },
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/grepping-names.cjs')}catch(e){process.exit(0)}\"",
        "timeout": 15
      }
    ]
  }
]
```

**Importante:** o grepping-names roda **depois** do hook de testes (bun test). Isso garante que o commit só recebe o warning de nomes genéricos se passou nos testes — evita ruído quando o commit já está bloqueado por falha de teste.

---

## Gotchas

- **`grep` pode não estar disponível no Windows PowerShell** — o hook usa `shell: true` no `execSync` para roteamento via git bash quando disponível. Se git bash não estiver no PATH, o hook falha silenciosamente (try/catch + process.exit(0)).
- **`wc -l` retorna número de arquivos distintos (com `-l`)** — não número de ocorrências totais. Isso é intencional: mede quantos arquivos diferentes usam o nome, não quantas vezes aparece. Um nome em 11 arquivos distintos é genuinamente onipresente.
- **Diff pode incluir remoções que referenciam nomes genéricos** — o hook filtra apenas linhas com `+` (adições). Remoções (linhas com `-`) são ignoradas corretamente.
- **Nomes de 1-2 caracteres são filtrados** (`name.length >= 2`) — evita falso positivo em variáveis de loop (`i`, `j`, `k`) e operadores.
- **O hook não bloqueia o commit** — mesmo se todos os nomes forem genéricos, `process.exit(0)` é chamado. O dev recebe o aviso mas pode prosseguir.
- **`CLAUDE_TOOL_INPUT` como fallback** — o hook tenta ler o comando também de `process.env.CLAUDE_TOOL_INPUT` caso stdin não envie JSON. Redundância defensiva.
- **`extractNewNamesFromDiff` tem algum ruído** — pode capturar nomes de imports ou comentários. Aceitável para hook advisory. Se incomodar, adicionar filtro de comentários no futuro.

---

## Verificação

### Checklist

- [ ] Arquivo `hooks/grepping-names.cjs` criado com conteúdo correto
- [ ] Hook inicia com `'use strict';`
- [ ] `process.exit(2)` não aparece em nenhum lugar do arquivo
- [ ] Entry PreToolUse `Bash` adicionada ao `hooks.json` como último elemento do array PreToolUse
- [ ] JSON do hooks.json é válido após edição (`node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'))"` sem erro)
- [ ] Teste manual: `git add` de arquivo com variável `handler` → `git commit -m "test"` → warning `[GREPPING]` aparece no output antes da execução
- [ ] Teste manual: warning tem formato exato de CA-02

### Critério de Aceite (CA-02)

Ao tentar commitar um arquivo que introduz a variável `handler`, o modelo deve receber (antes de executar o commit):

```
[GREPPING] 'handler' é nome genérico conhecido. Prefira nome específico como 'onSubmitHandler / onClickHandler / invoiceSubmitHandler'.
```

Ou, para um nome com muitos hits no codebase (ex: `result` com 47 arquivos usando):

```
[GREPPING] 'result' retorna 47 hits — nome genérico. Prefira nome específico como 'parseResult / fetchResult / validationResult'.
```

O commit continua executando normalmente após o warning (não é bloqueado).

### Teste de Validação do JSON

Após editar o `hooks.json`, executar no diretório `anti-vibe-coding/`:

```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('JSON válido')"
```

Deve imprimir `JSON válido` sem exceção.

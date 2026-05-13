# Fase 01: file-size-guard hook

**Plano:** 01 — Infraestrutura — Hooks Novos
**Sizing:** ~1h
**Depende de:** Nenhum
**Visual:** false (hook de infraestrutura, sem UI)

---

## O que esta fase entrega

Hook PostToolUse `file-size-guard.cjs` que emite warning não-blocking quando um arquivo editado via Write/Edit tem mais de 500 linhas, ou quando uma função no arquivo tem mais de 40 linhas, registrado no `hooks.json`.

---

## Arquivos Afetados

| Arquivo | Operação | Caminho relativo ao repo anti-vibe-coding/ |
|---------|----------|---------------------------------------------|
| `file-size-guard.cjs` | Criar | `hooks/file-size-guard.cjs` |
| `hooks.json` | Modificar | `hooks/hooks.json` |

---

## Implementação

### Passo 1 — Criar `hooks/file-size-guard.cjs`

Caminho absoluto: `f:/Projetos/Claude code/anti-vibe-coding/hooks/file-size-guard.cjs`

```js
'use strict';

/**
 * file-size-guard.cjs - Anti-Vibe Coding v5.2
 *
 * PostToolUse hook (matcher: Write|Edit): emite warning quando:
 * - Arquivo editado tem >500 linhas totais
 * - Alguma função no arquivo tem >40 linhas
 *
 * Advisory only — NUNCA bloqueia (exit 0 sempre).
 * Fail-open: qualquer erro → process.exit(0) silencioso.
 */

const fs   = require('fs');
const path = require('path');

const FILE_LINE_LIMIT = 500;
const FN_LINE_LIMIT   = 40;

// Extensões elegíveis para análise de funções
const ELIGIBLE_EXTS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Extensões elegíveis para contagem de linhas de arquivo (mais amplo)
const COUNT_EXTS = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|java|cs|cpp|c|h|rs|swift|kt)$/;

/**
 * Conta linhas de um arquivo no disco.
 * Retorna -1 se o arquivo não existir ou não puder ser lido.
 */
function countFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return -1;
  }
}

/**
 * Detecta funções longas usando heurística de regex + contagem de linhas.
 *
 * Estratégia:
 * 1. Encontra declarações de função (function, arrow, método de classe)
 * 2. A partir da linha de declaração, conta linhas até fechar o bloco `{}`
 * 3. Emite warning se o bloco tem >FN_LINE_LIMIT linhas
 *
 * Retorna array de { name, startLine, lineCount }
 */
function detectLongFunctions(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split('\n');
  const results = [];

  // Padrão para detectar início de função:
  // - function nome(
  // - async function nome(
  // - nome = (...) => {  (arrow com corpo)
  // - nome(...) {        (método de classe/objeto)
  // - async nome(...) {  (método async)
  const FN_START = /(?:(?:async\s+)?function\s+(\w+)\s*\(|(\w+)\s*[:=]\s*(?:async\s*)?\([^)]*\)\s*(?::\s*\S+\s*)?\s*=>\s*\{|(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\S+\s*)?\s*\{)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(FN_START);
    if (!match) continue;

    const fnName = match[1] || match[2] || match[3] || '<anonymous>';

    // Conta linhas do bloco: percorre à frente balanceando {}
    let depth = 0;
    let foundOpen = false;
    let endLine = i;

    for (let j = i; j < lines.length; j++) {
      const line = lines[j];
      for (const ch of line) {
        if (ch === '{') { depth++; foundOpen = true; }
        else if (ch === '}') { depth--; }
      }
      if (foundOpen && depth === 0) {
        endLine = j;
        break;
      }
    }

    const lineCount = endLine - i + 1;
    if (lineCount > FN_LINE_LIMIT) {
      results.push({ name: fnName, startLine: i + 1, lineCount });
    }
  }

  return results;
}

// — Main logic ——————————————————————————————————————————————————————————————

let handled = false;

const safetyTimer = setTimeout(() => {
  if (!handled) { handled = true; process.exit(0); }
}, 5000);

function run() {
  if (handled) return;
  handled = true;
  clearTimeout(safetyTimer);

  try {
    const filePath = process.env.CLAUDE_FILE_PATH || '';

    if (!filePath) return process.exit(0);

    // Resolve para path absoluto se relativo
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    const warnings = [];

    // --- Verificação 1: tamanho do arquivo ---
    if (COUNT_EXTS.test(filePath)) {
      const lineCount = countFileLines(absPath);
      if (lineCount > FILE_LINE_LIMIT) {
        const filename = path.basename(filePath);
        warnings.push(
          `[FILE-SIZE] ${filename} (${lineCount} linhas) excede limite de ${FILE_LINE_LIMIT}. Considere dividir por responsabilidade.`
        );
      }
    }

    // --- Verificação 2: funções longas ---
    if (ELIGIBLE_EXTS.test(filePath)) {
      const longFns = detectLongFunctions(absPath);
      const filename = path.basename(filePath);
      for (const fn of longFns) {
        warnings.push(
          `[FILE-SIZE] função '${fn.name}' (${filename}:${fn.startLine}) tem ${fn.lineCount} linhas — excede limite de ${FN_LINE_LIMIT}.`
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

// PostToolUse: o runtime pode não enviar stdin. Usar CLAUDE_FILE_PATH diretamente.
// Aguarda um tick para garantir que env vars estão disponíveis, depois executa.
process.nextTick(run);
```

### Passo 2 — Adicionar entry no `hooks.json`

Localizar a seção `"PostToolUse"` no `hooks.json`. Existe atualmente um bloco com matcher `"Write|Edit"` (para biome) e um com matcher `"*"` (context-monitor). Adicionar **novo bloco** com matcher `"Write|Edit"` para o file-size-guard, **antes** do bloco do context-monitor (`"*"`):

```json
{
  "matcher": "Write|Edit",
  "hooks": [
    {
      "type": "command",
      "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/file-size-guard.cjs')}catch(e){process.exit(0)}\"",
      "timeout": 10
    }
  ]
}
```

**Posição exata no JSON:** inserir como segundo elemento do array `"PostToolUse"`, entre o bloco do biome (primeiro) e o bloco do context-monitor (último). O array PostToolUse após a mudança deve ficar:

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"const f=process.env.CLAUDE_FILE_PATH||'';const ext=['.ts','.tsx','.js','.jsx','.json','.css'];if(!ext.some(e=>f.endsWith(e))){process.exit(0)}const{execSync}=require('child_process');try{execSync('bunx biome check --write '+JSON.stringify(f),{timeout:10000,stdio:'pipe'})}catch(e){process.exit(0)}\"",
        "timeout": 15
      }
    ]
  },
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/file-size-guard.cjs')}catch(e){process.exit(0)}\"",
        "timeout": 10
      }
    ]
  },
  {
    "matcher": "*",
    "hooks": [
      {
        "type": "command",
        "command": "node -e \"try{require(process.env.CLAUDE_PLUGIN_ROOT+'/hooks/context-monitor.cjs')}catch(e){process.exit(0)}\"",
        "timeout": 5
      }
    ]
  }
]
```

---

## Gotchas

- **PostToolUse não envia stdin de forma confiável** — o hook lê `CLAUDE_FILE_PATH` diretamente via env var, não via stdin JSON. Isso diferencia do padrão PreToolUse (que usa stdin). Ver `process.nextTick(run)` no código.
- **`CLAUDE_FILE_PATH` é o path que Claude usou na chamada da ferramenta** — pode ser relativo ao cwd do processo. O hook normaliza com `path.resolve`.
- **Heurística de funções é aproximada** — a contagem de `{}` balanceados pode confundir strings literais com `{`. Para efeito de warning não-blocking, isso é aceitável. Falsos positivos são raros em código TS/JS bem formatado.
- **Arrow functions sem bloco** (`=> expr`) não geram warning (não têm `{}`). Correto — não têm corpo a medir.
- **Não instalar dependências extras** — o hook usa apenas `fs`, `path` (built-in do Node). Zero deps.
- **Testar com arquivo real antes de commitar** — criar um arquivo temporário com 510 linhas e editar 1 linha via Edit para disparar o PostToolUse.

---

## Verificação

### Checklist

- [ ] Arquivo `hooks/file-size-guard.cjs` criado com conteúdo correto
- [ ] Hook inicia com `'use strict';`
- [ ] `process.exit(2)` não aparece em nenhum lugar do arquivo
- [ ] Entry PostToolUse `Write|Edit` adicionada ao `hooks.json`
- [ ] JSON do hooks.json é válido após edição (`node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'))"` sem erro)
- [ ] Teste manual: editar arquivo com >500 linhas → warning `[FILE-SIZE]` aparece no output
- [ ] Teste manual: warning tem formato exato de CA-01

### Critério de Aceite (CA-01)

Ao editar via Write ou Edit um arquivo com 523 linhas, o modelo deve receber:

```
[FILE-SIZE] arquivo.ts (523 linhas) excede limite de 500. Considere dividir por responsabilidade.
```

Para função longa, o modelo deve receber:

```
[FILE-SIZE] função 'processPayment' (arquivo.ts:42) tem 47 linhas — excede limite de 40.
```

O modelo continua executando normalmente (não é bloqueado). O warning aparece no contexto como feedback informativo.

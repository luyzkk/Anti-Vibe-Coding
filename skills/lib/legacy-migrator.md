# Legacy Migrator — Operacao atomica

Consumido por: plan-feature (Step 0), execute-plan (Step 0).
Input: resultado de detectLegacy() + nome da pasta destino confirmado pelo dev.

Pre-requisito: .planning/ deve estar no mesmo filesystem do projeto (mv cross-filesystem pode falhar no Windows).

Contrato:
  migrateLegacy(detectorResult, targetFolderName) -> {
    status: "success" | "rolled_back" | "rolled_back_partial" | "aborted",
    moves:  [{from, to, timestamp}],
    error?: string,
    unreverted?: [{item, err}]  -- apenas em rolled_back_partial
  }

Pre-condicoes:
- targetFolderName segue padrao YYYY-MM-DD-{slug}/ (validar com regex)
- .planning/{targetFolderName}/ NAO pode existir (abortar se existir)
- Todos os paths em detectorResult.artifacts devem existir
- detectorResult.ambiguous NAO deve ser true ao chamar esta funcao

---

## Fase STAGE — Validacao pre-execucao

Executar ANTES de tocar qualquer arquivo. Se qualquer validacao falhar: abortar com `status: "aborted"`, zero side effects.

**1. Validar nome da pasta destino**

Regex obrigatorio: `^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$`

Exemplos validos: `2026-04-20-auth`, `2025-12-01-sistema-notificacoes`
Exemplos invalidos: `auth`, `2026-04-20`, `2026-04-20-Auth`, `2026-04-20-`

Se nao bater: retornar `{ status: "aborted", error: "invalid target name: {targetFolderName}" }`

**2. Verificar colisao**

Se `.planning/{targetFolderName}/` ja existe:
retornar `{ status: "aborted", error: "target already exists — outra sessao ja migrou? verifique manualmente. nada foi tocado." }`

**3. Computar mapa from → to**

Para cada artefato em `detectorResult.artifacts`:

| Tipo | from | to |
|------|------|----|
| PRD | `.planning/PRD-{slug}.md` | `.planning/{target}/PRD.md` |
| PLAN | `.planning/PLAN-{slug}.md` ou `.planning/PLAN.md` | `.planning/{target}/PLAN.md` |
| STATE | `.planning/STATE-{slug}.md` ou `.planning/STATE.md` | `.planning/{target}/STATE.md` |
| SUMMARY | `.planning/SUMMARY-{slug}.md` | `.planning/{target}/SUMMARY.md` |
| CONTEXT | `.planning/CONTEXT-{slug}.md` | `.planning/{target}/CONTEXT.md` |
| planoDir | `.planning/plano{NN}/` | `.planning/{target}/plano{NN}/` |

**4. Validar escape de path**

Para cada `to` computado: verificar que `normalize(to)` comeca com `.planning/{targetFolderName}/`.
Se qualquer `to` escapar: retornar `{ status: "aborted", error: "dest escape detected: {to}" }`

Apenas apos todas as validacoes passarem: prosseguir para MOVE.

---

## Fase MOVE — Execucao com logging incremental

**1. Criar estrutura inicial**

```
mkdir(".planning/" + targetFolderName)
```

**2. Inicializar log de migracao**

Criar `.planning/{targetFolderName}/.migration-log.json`:

```json
{
  "startedAt": "{ISO timestamp}",
  "sourceSignals": ["{A|B|C}"],
  "moves": []
}
```

**3. Ordenar e executar moves**

Ordem obrigatoria: ARQUIVOS antes de DIRETORIOS (erros acontecem cedo — mais facil reverter).

Para cada item no plano:
```
move(item.from, item.to)
log.moves.push({ from: item.from, to: item.to, timestamp: now() })
writeFile(".planning/" + targetFolderName + "/.migration-log.json", log)
```

Se qualquer `move` falhar: ir imediatamente para ROLLBACK com o erro.

Nunca continuar apos falha — rollback deve acontecer antes de tentar o proximo item.

---

## Fase CONFIRM — Registrar sucesso

Executada apenas se todos os moves completaram sem erro.

**1. Atualizar STATE.md**

Linha a adicionar na secao `## Log`:
```
- {timestamp}: migracao legacy — {N} artefatos movidos de .planning/ raiz (signals: {sinais}). Ver .migration-log.json para detalhes.
```

Logica de update:
- Se `.planning/{targetFolderName}/STATE.md` JA EXISTE (veio do legacy): append a linha na secao `## Log`. NAO regenerar o arquivo.
- Se NAO existe: criar STATE.md minimo:

```markdown
# State: {targetFolderName}

**Phase:** in-progress
**Last Updated:** {date}

## Log
- {timestamp}: migracao legacy — {N} artefatos movidos de .planning/ raiz (signals: {sinais}). Ver .migration-log.json para detalhes.
```

**2. Manter audit trail**

`.migration-log.json` permanece no diretorio destino. NAO remover.

**3. Retornar sucesso**

```
return { status: "success", moves: log.moves }
```

---

## Fase ROLLBACK — Reversao LIFO

Acionada automaticamente quando qualquer move falha durante a fase MOVE.

**1. Ler estado executado**

Usar o array `executed` que foi construido incrementalmente (nao reler o arquivo — pode estar incompleto se o crash foi durante o write do log).

**2. Reverter em ordem inversa**

```
for item in reverse(executed):
    try:
        move(item.to, item.from)
    catch err:
        failures.push({ item, err })
```

Continuar mesmo se um reverse-move falhar — registrar em `failures` e prosseguir.

**3. Limpar pasta destino se vazia**

```
if isEmpty(".planning/" + targetFolderName):
    rmdir(".planning/" + targetFolderName)
```

**4. Retornar resultado**

```
if failures.length > 0:
    return {
      status: "rolled_back_partial",
      error: originalError,
      unreverted: failures
    }

return {
  status: "rolled_back",
  error: originalError,
  moves: executed
}
```

Em `rolled_back_partial`: os itens em `unreverted` ficaram no destino e precisam de intervencao manual.

---

## Seguranca

- NUNCA tocar em arquivo fora de `.planning/`
- NUNCA deletar — apenas mover (`mv`, nunca `rm`)
- Validar todos os paths com `normalize()` antes de qualquer operacao
- Se `detectorResult.ambiguous == true`: esta funcao NAO deve ser chamada — retornar `{ status: "aborted", error: "ambiguous detector result — resolve ambiguity before migrating" }`
- Se `detectorResult.legacy == false`: retornar `{ status: "aborted", error: "no legacy artifacts detected" }`

---

## Pseudocodigo completo

```
function migrateLegacy(detectorResult, targetFolderName):
    # Guardrails iniciais
    if detectorResult.ambiguous == true:
        return { status: "aborted", error: "ambiguous detector result — resolve ambiguity before migrating" }

    if detectorResult.legacy == false:
        return { status: "aborted", error: "no legacy artifacts detected" }

    # STAGE
    if not matches(targetFolderName, /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$/):
        return { status: "aborted", error: "invalid target name: " + targetFolderName }

    if exists(".planning/" + targetFolderName):
        return { status: "aborted", error: "target already exists — outra sessao ja migrou? verifique manualmente. nada foi tocado." }

    plan = []
    for art in detectorResult.artifacts:
        dest = computeDest(art, targetFolderName)
        if not normalize(dest).startsWith(".planning/" + targetFolderName + "/"):
            return { status: "aborted", error: "dest escape detected: " + dest }
        plan.push({ from: art.path, to: dest })

    # MOVE
    mkdir(".planning/" + targetFolderName)
    log = { startedAt: now(), sourceSignals: detectorResult.signals, moves: [] }
    writeFile(".planning/" + targetFolderName + "/.migration-log.json", log)

    executed = []
    for item in sortFilesFirst(plan):   # arquivos antes de dirs
        try:
            move(item.from, item.to)
            log.moves.push({ from: item.from, to: item.to, timestamp: now() })
            executed.push(item)
            writeFile(".planning/" + targetFolderName + "/.migration-log.json", log)
        catch err:
            return rollback(executed, targetFolderName, err)

    # CONFIRM
    updateStateLog(".planning/" + targetFolderName + "/STATE.md", log, detectorResult.signals)
    return { status: "success", moves: log.moves }


function rollback(executed, targetFolderName, originalError):
    failures = []
    for item in reverse(executed):
        try:
            move(item.to, item.from)
        catch err:
            failures.push({ item, err })

    if isEmpty(".planning/" + targetFolderName):
        rmdir(".planning/" + targetFolderName)

    if failures.length > 0:
        return { status: "rolled_back_partial", error: originalError, unreverted: failures }
    return { status: "rolled_back", error: originalError, moves: executed }


function computeDest(artifact, targetFolderName):
    base = ".planning/" + targetFolderName + "/"
    match artifact.type:
        "PRD":      return base + "PRD.md"
        "PLAN":     return base + "PLAN.md"
        "STATE":    return base + "STATE.md"
        "SUMMARY":  return base + "SUMMARY.md"
        "CONTEXT":  return base + "CONTEXT.md"
        "planoDir": return base + basename(artifact.path) + "/"
        default:    return base + basename(artifact.path)


function sortFilesFirst(plan):
    files = plan.filter(item => not item.from.endsWith("/"))
    dirs  = plan.filter(item => item.from.endsWith("/"))
    return files + dirs


function updateStateLog(statePath, log, signals):
    line = "- " + now() + ": migracao legacy — " + log.moves.length +
           " artefatos movidos de .planning/ raiz (signals: " + join(signals, ",") +
           "). Ver .migration-log.json para detalhes."

    if exists(statePath):
        content = readFile(statePath)
        if content contains "## Log":
            appendAfterSection(content, "## Log", line)
        else:
            appendToEnd(content, "\n## Log\n" + line)
        writeFile(statePath, content)
    else:
        writeFile(statePath, "# State: " + dirname(statePath) + "\n\n" +
            "**Phase:** in-progress\n" +
            "**Last Updated:** " + today() + "\n\n" +
            "## Log\n" + line + "\n")
```

---

## Exemplo concreto end-to-end

### Estado inicial (.planning/ raiz)

```
.planning/
├── PRD-auth.md
├── PLAN-auth.md
├── STATE-auth.md
├── CONTEXT-auth.md
├── plano01/
│   ├── README.md
│   └── fase-01-setup.md
└── plano02/
    ├── README.md
    └── fase-01-api.md
```

### Resultado de detectLegacy()

```json
{
  "legacy": true,
  "signals": ["A", "B", "C"],
  "artifacts": [
    { "path": ".planning/PRD-auth.md",    "type": "PRD" },
    { "path": ".planning/PLAN-auth.md",   "type": "PLAN" },
    { "path": ".planning/STATE-auth.md",  "type": "STATE" },
    { "path": ".planning/CONTEXT-auth.md","type": "CONTEXT" },
    { "path": ".planning/plano01/",       "type": "planoDir" },
    { "path": ".planning/plano02/",       "type": "planoDir" }
  ],
  "suggestedSlug": "auth",
  "ambiguous": false
}
```

Dev confirma: `targetFolderName = "2026-04-20-auth"`

### Execucao passo a passo

**STAGE:**
- `"2026-04-20-auth"` bate regex → ok
- `.planning/2026-04-20-auth/` nao existe → ok
- Plano computado:
  - `.planning/PRD-auth.md` → `.planning/2026-04-20-auth/PRD.md`
  - `.planning/PLAN-auth.md` → `.planning/2026-04-20-auth/PLAN.md`
  - `.planning/STATE-auth.md` → `.planning/2026-04-20-auth/STATE.md`
  - `.planning/CONTEXT-auth.md` → `.planning/2026-04-20-auth/CONTEXT.md`
  - `.planning/plano01/` → `.planning/2026-04-20-auth/plano01/`
  - `.planning/plano02/` → `.planning/2026-04-20-auth/plano02/`
- Todos os destinos iniciam com `.planning/2026-04-20-auth/` → ok

**MOVE:**
```
mkdir .planning/2026-04-20-auth/
# cria .migration-log.json inicial
mv .planning/PRD-auth.md    .planning/2026-04-20-auth/PRD.md      # atualiza log
mv .planning/PLAN-auth.md   .planning/2026-04-20-auth/PLAN.md     # atualiza log
mv .planning/STATE-auth.md  .planning/2026-04-20-auth/STATE.md    # atualiza log
mv .planning/CONTEXT-auth.md .planning/2026-04-20-auth/CONTEXT.md # atualiza log
mv .planning/plano01/       .planning/2026-04-20-auth/plano01/    # atualiza log
mv .planning/plano02/       .planning/2026-04-20-auth/plano02/    # atualiza log
```

**CONFIRM:**
STATE.md ja existe (veio do legacy). Append na secao `## Log`:
```
- 2026-04-20T14:32:00Z: migracao legacy — 6 artefatos movidos de .planning/ raiz (signals: A,B,C). Ver .migration-log.json para detalhes.
```

**Retorno:** `{ status: "success", moves: [...6 items...] }`

### Estado final (.planning/)

```
.planning/
└── 2026-04-20-auth/
    ├── .migration-log.json
    ├── PRD.md
    ├── PLAN.md
    ├── STATE.md           ← tem linha de log appended
    ├── CONTEXT.md
    ├── plano01/
    │   ├── README.md
    │   └── fase-01-setup.md
    └── plano02/
        ├── README.md
        └── fase-01-api.md
```

---

## Deteccao de log orfao

Crash entre MOVE e CONFIRM deixa `.migration-log.json` com moves incompletos e STATE.md sem a linha de log. Backstop obrigatorio.

**Quando verificar:** ao iniciar `migrateLegacy()`, ANTES de qualquer operacao.

```
Ao iniciar (antes de qualquer operacao), verificar:

for each subfolder in glob(".planning/*/"):
    logPath = subfolder + ".migration-log.json"
    if exists(logPath):
        log = readFile(logPath)
        if log.moves.length > 0 and not contains(readFile(subfolder + "STATE.md"), "migracao legacy"):
            perguntar ao dev:
              "Encontrei migracao interrompida para {subfolder}.
               Moves executados: {log.moves.length}. O que deseja?
               - Confirmar manualmente (manter estado atual — STATE.md sera atualizado)
               - Reverter (rollback dos {log.moves.length} moves)"

            Se dev escolher confirmar:
                updateStateLog(subfolder + "STATE.md", log, log.sourceSignals)

            Se dev escolher reverter:
                rollback(log.moves, basename(subfolder), "interrupted migration")
```

Esta verificacao so alerta se o log tem moves mas STATE.md nao tem a linha de confirmacao. Se ambos ja existem, a migracao completou com sucesso — nao interferir.

---

## Regras de seguranca resumidas

| Regra | Motivo |
|-------|--------|
| NUNCA tocar fora de `.planning/` | Evita dano ao codebase do projeto |
| NUNCA deletar — apenas mover | Rollback sempre possivel |
| Validar paths com normalize() | Previne path traversal (`../`) |
| Arquivos antes de pastas no MOVE | Erros cedo, rollback mais simples |
| Log incremental no MOVE | Estado recuperavel apos crash |
| Abort se ambiguous=true | Detector nao resolveu — nao adivinhar |
| Verificar log orfao na inicializacao | Recuperacao de crash entre MOVE e CONFIRM |

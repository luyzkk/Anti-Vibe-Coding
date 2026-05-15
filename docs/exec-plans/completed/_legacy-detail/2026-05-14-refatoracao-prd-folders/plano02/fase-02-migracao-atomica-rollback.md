# Fase 02: Migracao atomica com rollback

**Plano:** 02 — Deteccao legacy e migracao on-detect
**Sizing:** 2h
**Depende de:** fase-01 (precisa da saida do detector: lista de artefatos + slug)
**Visual:** false

---

## O que esta fase entrega

Algoritmo compartilhado `migrateLegacy(detectorResult, targetFolderName)` que move todos os
artefatos legacy para a pasta datada com garantia de atomicidade (rollback em caso de falha),
registra a operacao no STATE.md da pasta destino, e retorna sucesso/falha com log detalhado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/legacy-migrator.md` | Create | Documento de referencia com o algoritmo stage/move/confirm/rollback. Consumido por plan-feature (fase-03) e execute-plan (fase-04) |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Adicionar referencia a `lib/legacy-migrator.md` na secao Referencias |
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Adicionar referencia a `lib/legacy-migrator.md` na secao Referencias |

---

## Implementacao

### Passo 1 — Estrutura do algoritmo em 4 fases

O `lib/legacy-migrator.md` descreve as 4 fases explicitamente. Cada fase tem criterios de
progressao e criterios de falha (que disparam rollback).

```markdown
# Legacy Migrator — Operacao atomica

Consumido por: plan-feature (Step 0), execute-plan (Step 0).
Input: resultado de `detectLegacy()` + nome da pasta destino confirmado pelo dev.

## Contrato

  migrateLegacy(detectorResult, targetFolderName) -> {
    status: "success" | "rolled_back" | "aborted",
    moves:  [{from, to, timestamp}],
    error?: string
  }

Pre-condicoes:
- `targetFolderName` segue padrao `YYYY-MM-DD-{slug}/` (validar com regex)
- `.planning/{targetFolderName}/` NAO pode existir (abortar se existir — G3 do plano)
- Todos os paths em `detectorResult.artifacts` devem existir (sanidade)

## Fase STAGE (plano a execucao)

1. Validar targetFolderName:
   - Regex: `^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$`
   - Se nao bater: abortar com mensagem clara
2. Verificar colisao:
   - Se `.planning/{targetFolderName}/` existir: abortar com mensagem
     "outra sessao ja migrou? verifique manualmente. nada foi tocado."
3. Computar destino para CADA artefato (mapa from → to):
   - PRD-{slug}.md → {target}/PRD.md
   - PLAN-{slug}.md → {target}/PLAN.md
   - STATE-{slug}.md → {target}/STATE.md
   - SUMMARY-{slug}.md → {target}/SUMMARY.md
   - CONTEXT-{slug}.md → {target}/CONTEXT.md
   - plano01/ → {target}/plano01/ (mover pasta inteira, preservar conteudo)
   - plano02/ → {target}/plano02/
   - ...
4. Validar que todos os `to` ficam DENTRO de `.planning/{targetFolderName}/`. Se algum escapar:
   abortar (seguranca R9 — nunca tocar fora de .planning).
5. Validar que nenhum `to` colide com outro dentro do mesmo batch (dois artefatos mapeando para
   o mesmo destino — nao deve acontecer com nomenclatura PRD/PLAN/STATE unica por slug).

## Fase MOVE (execucao + logging)

1. Criar pasta destino: `mkdir -p .planning/{targetFolderName}/`
2. Criar arquivo de log temporario: `.planning/{targetFolderName}/.migration-log.json` com:
   {
     "startedAt": ISO-timestamp,
     "sourceSignals": detectorResult.signals,
     "moves": []
   }
3. Para cada artefato em ordem (arquivos primeiro, pastas planoNN depois):
   a. Executar move: `mv {from} {to}`
   b. Append ao log: { from, to, timestamp }
   c. Se move falhar:
      - NAO continuar para proximo
      - Ir direto para Fase ROLLBACK
4. Se todos os moves completaram sem erro: prosseguir para CONFIRM.

## Fase CONFIRM (sucesso)

1. Gerar/atualizar `.planning/{targetFolderName}/STATE.md`:
   - Se ja existir (veio do legacy): append linha na secao Log
   - Se nao existir: criar minimo com phase = "in-progress" e secao Log
   - Linha do log:
     `- {ISO-timestamp}: migracao legacy — {N} artefatos movidos de .planning/ raiz
       (signals: {A,B,C}). Ver .migration-log.json para detalhes.`
2. REMOVER arquivo `.migration-log.json` (trabalho concluido — log fica embutido no STATE.md)
   - Nota alternativa: manter o .migration-log.json como audit trail para seguranca extra.
     Decidir durante execucao; preferencia = manter, marcado como arquivo oculto no .gitignore
     se o projeto tiver .gitignore em .planning/.
3. Retornar { status: "success", moves: [...] }.

## Fase ROLLBACK (falha)

1. Ler log temporario `.planning/{targetFolderName}/.migration-log.json`
2. Para cada entrada de move em ORDEM REVERSA (LIFO):
   - Executar move inverso: `mv {to} {from}`
   - Se move inverso falhar:
     - REGISTRAR no log que rollback deste item falhou (manter prosseguindo)
     - Ao final, retornar status = "rolled_back_partial" com lista dos itens que nao
       voltaram — dev precisa intervir manualmente
3. Se diretorio destino ficar vazio: `rmdir .planning/{targetFolderName}/`
   - Se nao estiver vazio (rollback parcial), PRESERVAR para inspecao manual
4. Retornar { status: "rolled_back", error: mensagem original, moves: [...] }

## Seguranca

- NUNCA tocar em arquivo fora de `.planning/`
- NUNCA deletar conteudo — apenas move. Rollback tambem so move.
- Validar paths com resolve/normalize antes de mover (evita path traversal tipo "../../etc")
- Se `detectorResult.ambiguous == true` e `suggestedSlug == null`, esta funcao NAO deve ser
  chamada. O chamador (fase-03/04) perguntou o slug ao dev antes.
```

### Passo 2 — Pseudocodigo explicito do fluxo completo

Incluir tambem no `lib/legacy-migrator.md` o seguinte pseudocodigo:

```
function migrateLegacy(detectorResult, targetFolderName):
    # STAGE
    if not matches(targetFolderName, /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$/):
        return { status: "aborted", error: "invalid target name" }

    if exists(".planning/" + targetFolderName):
        return { status: "aborted", error: "target already exists" }

    plan = []
    for art in detectorResult.artifacts:
        dest = computeDest(art, targetFolderName)
        if not dest.startsWith(".planning/" + targetFolderName + "/"):
            return { status: "aborted", error: "dest escape detected" }
        plan.push({ from: art.path, to: dest })

    # MOVE
    mkdir(".planning/" + targetFolderName)
    log = { startedAt: now(), sourceSignals: detectorResult.signals, moves: [] }
    writeFile(".planning/" + targetFolderName + "/.migration-log.json", log)

    executed = []
    for item in plan:
        try:
            move(item.from, item.to)
            log.moves.push({ from: item.from, to: item.to, timestamp: now() })
            executed.push(item)
            writeFile(".planning/" + targetFolderName + "/.migration-log.json", log)
        catch err:
            # ROLLBACK
            return rollback(executed, targetFolderName, err)

    # CONFIRM
    updateStateLog(".planning/" + targetFolderName + "/STATE.md", log)
    # Manter log como audit trail — nao remover
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
        return {
            status: "rolled_back_partial",
            error: originalError,
            unreverted: failures
        }
    return { status: "rolled_back", error: originalError, moves: executed }
```

### Passo 3 — Exemplo concreto (para referencia do executor)

Adicionar ao `lib/legacy-migrator.md` um exemplo narrado end-to-end:

```
Exemplo: projeto legacy com 1 PRD + 1 plano + 1 PLAN flat

Antes:
  .planning/
  ├── CONTEXT-auth.md
  ├── PRD-auth.md
  ├── PLAN-auth.md
  ├── STATE-auth.md
  ├── plano01/
  │   ├── README.md
  │   └── fase-01-login.md
  └── plano02/
      ├── README.md
      └── fase-01-signup.md

detectorResult:
  legacy: true
  signals: ["A", "B", "C"]
  artifacts: [
    { path: ".planning/PRD-auth.md", type: "PRD" },
    { path: ".planning/plano01/", type: "planoDir" },
    { path: ".planning/plano02/", type: "planoDir" },
    { path: ".planning/PLAN-auth.md", type: "PLAN" },
    { path: ".planning/STATE-auth.md", type: "STATE" },
    { path: ".planning/CONTEXT-auth.md", type: "CONTEXT" }
  ]
  suggestedSlug: "auth"

Dev confirma "2026-04-20-auth" como nome da pasta.

migrateLegacy() executa:
  mv .planning/PRD-auth.md      .planning/2026-04-20-auth/PRD.md
  mv .planning/PLAN-auth.md     .planning/2026-04-20-auth/PLAN.md
  mv .planning/STATE-auth.md    .planning/2026-04-20-auth/STATE.md
  mv .planning/CONTEXT-auth.md  .planning/2026-04-20-auth/CONTEXT.md
  mv .planning/plano01/         .planning/2026-04-20-auth/plano01/
  mv .planning/plano02/         .planning/2026-04-20-auth/plano02/

Depois:
  .planning/
  └── 2026-04-20-auth/
      ├── CONTEXT.md
      ├── PRD.md
      ├── PLAN.md
      ├── STATE.md     ← com nova linha no Log
      ├── plano01/...
      └── plano02/...

STATE.md ganha linha:
  - 2026-04-20T15:30:00Z: migracao legacy — 6 artefatos movidos (signals: A,B,C)
```

### Passo 4 — Registrar referencia nas skills

Em `plan-feature/SKILL.md` e `execute-plan/SKILL.md`, secao Referencias:

```
- `lib/legacy-migrator.md` — Algoritmo atomico de migracao legacy (stage/move/confirm/rollback)
```

NAO editar o corpo das skills nesta fase (isso eh fase-03 e fase-04).

---

## Gotchas

- **G2 do plano (R6 falha atomica):** O coracao desta fase eh o rollback. Testar ESPECIFICAMENTE
  cenarios de falha: arquivo sem permissao de escrita no destino, disco cheio (simular criando
  destino ja ocupado no meio), cancelamento de usuario (Ctrl+C — nao tratavel via skill, mas
  anotar que o .migration-log.json persiste e a proxima invocacao deve detectar e oferecer
  resumir/rollback).
- **G3 do plano (R7 concorrencia):** A validacao `exists(target)` no STAGE mitiga — se duas
  sessoes tentarem migrar o mesmo slug no mesmo dia, a segunda aborta com mensagem clara. Zero
  lock global.
- **G6 do plano (CA-12 nao interromper):** Mover STATE.md como arquivo intacto, SEM regenerar
  conteudo. O dev acorda na nova pasta com o mesmo `phase: in-progress`, mesmo `Current Plan`,
  mesmas fases checked. O unico acrescimo eh a linha nova no Log.
- **G9 do plano (escopo):** A validacao "dest.startsWith(.planning/ + targetFolderName/)" eh a
  seguranca que impede mover para fora. Nao remover nem relaxar.
- **Local (ordem de moves):** Mover ARQUIVOS primeiro, depois PASTAS. Isso evita o caso de um
  STATE-auth.md ser movido DEPOIS da planoNN/ e falhar — preferimos que falhas aconteceram cedo
  (arquivos sao baratos de reverter). Se planoNN/ for a ultima e falhar, o rollback reverte tudo.
- **Local (log persistente):** O `.migration-log.json` fica na pasta destino ate o fim. Se a
  skill crashear entre MOVE e CONFIRM, o log orfao fica la e a proxima invocacao da skill pode
  detectar e oferecer "reverter migracao interrompida? ou confirmar manualmente?". Isso eh
  backstop adicional para R6.
- **Local (mv cross-filesystem):** No Windows (ambiente do dev), `mv` em drives diferentes pode
  falhar. Se `.planning/` estiver sempre no mesmo drive do projeto, eh ok. Documentar como
  "pre-requisito: .planning/ mora no mesmo filesystem do projeto" no topo do migrator.md.

---

## Verificacao

### TDD (dogfooding manual)

- [ ] **RED:** criar fixture `.planning-test/` simulando o cenario Antes do Passo 3 (PRD +
  PLAN + STATE + CONTEXT + plano01/ + plano02/ todos soltos com slug "auth").
- [ ] **GREEN:** executar o pseudocodigo MANUALMENTE via Bash (sequencia de `mv` + criar
  `.migration-log.json` + editar STATE.md).
- [ ] **VERIFY:** estrutura final bate com o "Depois" do exemplo; STATE.md tem nova linha;
  `.migration-log.json` existe na pasta destino.
- [ ] **RED rollback:** criar segundo fixture identico; no meio dos moves (apos mover PRD.md
  mas antes de mover plano01/), simular falha (chmod a readonly, ou ocupar path destino);
  executar rollback e verificar que TUDO voltou ao estado Antes; `.planning-test/` deve estar
  identico ao inicial, sem pasta datada residual.
- [ ] **VERIFY rollback parcial:** simular segundo nivel de falha (um dos moves inversos
  tambem falha); confirmar que retorno eh "rolled_back_partial" com lista clara de unreverted.

### Checklist

- [ ] Arquivo `anti-vibe-coding/skills/lib/legacy-migrator.md` criado com secoes STAGE / MOVE /
  CONFIRM / ROLLBACK explicitas
- [ ] Pseudocodigo de `migrateLegacy()` e `rollback()` presentes
- [ ] Exemplo narrado end-to-end presente
- [ ] Validacao de regex do target folder name presente
- [ ] Validacao de colisao (pasta destino existe) presente
- [ ] Validacao de escape de path (dest fora de .planning/target/) presente
- [ ] Logica de update do STATE.md documentada (append linha no Log, nao regenerar)
- [ ] Referencia registrada em `plan-feature/SKILL.md` e `execute-plan/SKILL.md`
- [ ] Fixtures de teste removidas apos validacao

---

## Criterio de Aceite

**Por maquina:**
- `ls anti-vibe-coding/skills/lib/legacy-migrator.md` retorna o arquivo
- O arquivo contem as 4 palavras-chave: STAGE, MOVE, CONFIRM, ROLLBACK
- O arquivo contem pseudocodigo de `migrateLegacy` e `rollback`

**Por humano:**
- Executando a migracao manualmente contra fixture feliz: estado final = estrutura correta,
  STATE.md com nova linha no Log, zero arquivos perdidos
- Executando a migracao contra fixture com falha no meio: rollback completo, estado final =
  estado inicial byte-por-byte (comparar com `diff -r` contra backup)
- Executando em fixture ja migrada (pasta destino ja existe): aborta com mensagem clara, nada
  eh tocado

---

<!-- Gerado por /plan-feature em 2026-04-20 -->

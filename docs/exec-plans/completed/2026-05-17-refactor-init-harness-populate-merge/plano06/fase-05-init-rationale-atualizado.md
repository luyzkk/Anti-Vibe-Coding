<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: init-rationale.md — Bloco D1-D30 do PRD 2026-05-17

**Plano:** 06 — Comunicacao + Observabilidade
**Sizing:** 0.5h
**Depende de:** Nenhuma dentro do plano (paralelizavel com fases 02/03/04); coordenacao logica com Plano 04 fase-07 (SKILL.md rewrite) que tambem referencia este rationale.
**Visual:** false

---

## O que esta fase entrega

Conforme **Dependencias do PRD** (`docs/design-docs/init-rationale.md` listado como
"atualizar com novas decisoes D1-D30 deste PRD"): APPENDA bloco novo
`## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)` ao
`docs/design-docs/init-rationale.md`, listando as 30 decisoes do PRD com formato
canonico do arquivo (`### D{N} — {titulo}` + paragrafo + `**Consumido por:**`).
Mantem o arquivo como fonte unica de "porque" para devs/agents que estao editando
steps em `skills/init/lib/steps/` e precisam entender uma decisao por ID.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/design-docs/init-rationale.md` | Modify | APPEND ao final do arquivo: novo heading `## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)` + 30 entries `### D{N}` |

**Total:** 1 arquivo modificado. **Dentro do limite de 5/fase**.

---

## Implementacao

### Passo 1: Confirmar estado atual do arquivo

```bash
# Confirmar que arquivo existe (criado pelo refactor Rails-style anterior)
test -f docs/design-docs/init-rationale.md && echo OK

# Confirmar que nao tem ja a seccao deste PRD (idempotencia)
grep -c '^## PRD 2026-05-17 — Refactor /init Harness Populate Merge' docs/design-docs/init-rationale.md
# Esperado: 0 (se ja for 1, esta fase ja rodou — abortar)

# Conferir convencao de IDs existente
grep -E '^### [A-Z]+-?[0-9]+' docs/design-docs/init-rationale.md | head -5
# Esperado: formato `### DI-XX`, `### GT-XX`, etc — IDs prefix+numero, sem hifen ate o numero
```

### Passo 2: Appendar bloco D1-D30

Apos a ultima linha do arquivo atual, inserir:

```markdown
---

## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)

> **Origem:** este bloco indexa as 30 decisoes consolidadas em
> `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/CONTEXT.md`
> (sessao 1: D1-D20 em 2026-05-17, sessao 2: D21-D30 em 2026-05-18) e formalizadas
> no PRD irmao. Os IDs `D1`..`D30` deste bloco coexistem sem colisao com `DI-XX` /
> `GT-XX` / `CA-XX` do refactor Rails-style anterior (prefixos diferentes). Cada
> decisao lista `**Consumido por:**` apontando steps em `skills/init/lib/steps/`
> ou planos hierarquicos em `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/`.

### D1 — Aplicabilidade por modo do /init

Tres melhorias (populate plan, merge invertido, adapt docs) rodam nos 4 modos
detectados: greenfield, migration, legacy v5, already-initiated. Greenfield gera
plano de populacao puro (sem merge/move porque nao ha docs pre-existentes).
Already-initiated detecta drift e oferece re-populacao incremental.

**Consumido por:** `91-generate-populate-plan` (todos os modos), `12-detect-drift-incremental` (already-initiated)

### D2 — Estrategia de inversao do CLAUDE.md

Destrutivo com backup recuperavel + aprovacao explicita. Modo dual rejeitado por
violar D16 do v6.0.0 (single source of truth) indefinidamente. Backup em
`.anti-vibe/backup/{ts}/` + diff visual + aprovacao em batch cobrem o risco.

**Consumido por:** `10-apply-merge-destructive`, `09-propose-merge-batch`, `lib/backup-anti-vibe.ts`

### D3 — Disparo do plano de populacao

Sugestao ao final — `/init` escreve `docs/exec-plans/active/{date}-populate-harness/PLAN.md`
e mostra mensagem sugerindo `/execute-plan`. Inline rejeitado por violar
`feedback_suggest_dont_execute.md` (IA sugere, dev decide). Plano em disco fica
revisavel antes da execucao.

**Consumido por:** `91-generate-populate-plan`, `skills/init/SKILL.md` (mensagem final)

### D4 — Granularidade de confirmacao

Batch agregado com diff consolidado — uma aprovacao global ou cancela tudo.
File-by-file (15+ prompts) e tiered (logica condicional) rejeitados. Cancelar e
re-rodar com ajustes mais rapido que aprovar individualmente.

**Consumido por:** `09-propose-merge-batch`, contrato `needsUser` em `steps/types.ts`

### D5 — Escopo de adaptacao de docs

Recursivo — raiz + `/docs/` + `.claude/`, whitelist `.md/.mdx`, blacklist
`node_modules/dist/build/.git`. Maximiza captura de conhecimento institucional
mantendo custo controlado.

**Consumido por:** `07-discover-existing-docs`, `lib/discover-existing-docs.ts`

### D6 — README.md intocavel

READ-ONLY input — nunca movido, nunca reescrito. README eh contrato publico do
repo (GitHub home). Plugin extrai info de stack/setup para popular
ARCHITECTURE.md no plano de populacao, mas NAO toca o README.

**Consumido por:** `11-move-docs-with-stub` (skip explicito), `07-discover-existing-docs` (filtra README raiz)

### D7 — Idempotencia de re-rodar /init

Drift detection via checksums no manifest + re-populacao incremental. PLACEHOLDER
(vazio) entra no plano; POPULATED (editado) nao toca; DRIFT (modificado mas
placeholder) avisa.

**Consumido por:** `12-detect-drift-incremental`, `lib/drift-detector.ts`

### D8 — Classificacao de blocos em categorias harness

Hibrido — heuristica regex + LLM refina ambiguos + dev aprova batch. 100% heuristica
falha em blocos misturados; 100% LLM custa e nao-deterministico; manual exausta.

**Consumido por:** `08-classify-blocks-hybrid`, `lib/blocks-classifier.ts`

### D9 — Localizacao do backup

`.anti-vibe/backup/{YYYY-MM-DD-HHMMSS}/`. Inline `.backup` polui raiz; `.claude/archive/`
mistura com Passo 2.5. Pasta dedicada fora do dominio Claude Code, multiplos backups,
gitignore automatico.

**Consumido por:** `lib/backup-anti-vibe.ts`, `10-apply-merge-destructive`, `lib/rollback.ts`

### D10 — Rollback explicito

`/anti-vibe-coding:init --rollback` — comando explicito le ultimo backup em
`.anti-vibe/backup/{latest}/`, restaura, registra ADR. Reversibilidade clara sem
depender de dev lembrar comandos git.

**Consumido por:** `lib/rollback.ts`, `lib/run-init.ts` (early-return em `--rollback`)

### D11 — Docs orfaos sem categoria harness clara

`docs/references/{nome-original}.md`. AGENTS.md ganha linha condicional "Material
de referencia: ver docs/references/". Estrutura previsivel para qualquer projeto.

**Consumido por:** `lib/blocks-classifier.ts` (orphan fallback), `08-classify-blocks-hybrid`

### D12 — Links externos apos move

Stub redirect no path antigo + grep+rewrite de links internos do repo + warning de
URLs externas. Tres camadas de seguranca.

**Consumido por:** `lib/doc-mover-stub.ts`, `11-move-docs-with-stub`

### D13 — Execucao do plano de populacao

Subagents paralelos por arquivo de destino via `/execute-plan` wave-based. 5+
subagents populam AGENTS/ARCHITECTURE/SECURITY/DESIGN/RELIABILITY simultaneamente.
Isolamento de contexto evita decay.

**Consumido por:** `lib/populate-plan-generator.ts` (emite tasks paralelizaveis), `assets/snippets/populate-plan-template.md`

### D14 — Docs filosoficos do harness

`docs/COMPOUND_ENGINEERING.md` e `docs/PRODUCT_SENSE.md` ficam template canonico
do plugin (sem populacao). Postura identica em todo projeto.

**Consumido por:** `lib/populate-plan-generator.ts` (exclui explicitamente), `08-classify-blocks-hybrid` (enum `HarnessCategory` nao inclui)

### D15 — Validacao pos-populacao

Ultima task do PLAN.md de populacao roda `bun run scripts/harness-validate.ts &&
bun run scripts/compound-check.ts`. Falha trava em status `awaiting-fix`.

**Consumido por:** `assets/snippets/populate-plan-template.md` (apenda task final), `lib/populate-plan-generator.ts`

### D16 — Scan de secrets/PII antes de mover docs

Regex contra AKIA*, sk_live_, postgres://user:pass, emails, JWT. Match → bloqueia
move desse arquivo especifico ate aprovacao manual. gitleaks/trufflehog fica para
v6.5+.

**Consumido por:** `06-secrets-scan`, `lib/secrets-scanner.ts`

### D17 — Regras Akita extensas vs limite AGENTS.md <=40 linhas

Akita extraido para `docs/DESIGN.md` (skeleton novo agrega 5 snippets via includes).
AGENTS.md so referencia ("Code style: see docs/DESIGN.md"). Mantem D29 do v6.0.0
inviolavel.

**Consumido por:** `10-apply-merge-destructive` (extrai blocos), `assets/snippets/design-md-skeleton.md`

### D18 — Modo --dry-run

`/init --dry-run` mostra plano completo (scaffold + merges + moves + plano de
populacao) sem mutacao. Zero IO destrutivo. Equivalente ao `migrate.0` atual mas
para todo o init.

**Consumido por:** `09/10/11/12/91` (caminho `mutated: false`), Plano 05 fase-01 (wiring global) + fase-02 (renderer)

### D19 — Telemetria e audit log

Cada subfase nova emite entry em `discovery/agents-log.json` via `AuditLogWriter`
existente. Schema: `subagent_id` literal + `input_paths` + `output_struct` +
`duration_ms` + `retry_count`.

**Consumido por:** `lib/audit-log-writer-factory.ts` (Plano 06 fase-01), `lib/init-subagent-ids.ts`, todos os 8 novos steps + rollback

### D20 — Versionamento

v6.4.0 (minor). Mudancas aditivas ao registry; interface publica preservada.
Backup+rollback+dry-run+aprovacao garantem reversibilidade. Semver minor justificado.

**Consumido por:** `.claude-plugin/plugin.json` (bump 6.3.2 → 6.4.0), Plano 07 fase-06

### D21 — Dispatcher runInit imutavel

`runInit({args, cwd})` mantem assinatura atual. Comando `--rollback` detectado no
dispatcher antes do loop (early-return). Cada novo step implementa contrato
`Step { id, run }` + `StepReport`.

**Consumido por:** `lib/run-init.ts` (early-return em `--rollback`), `lib/steps/types.ts`

### D22 — Skeleton DESIGN.md agrega snippets Akita

`assets/snippets/design-md-skeleton.md` AGREGA os 5 snippets existentes
(`akita-code-style/comments/tests/dependencies/logging.md`) via marcadores
`{{include: ../akita-XXX.md}}`. Snippets atuais ficam INTOCADOS — continuam
servindo o caminho "sem CLAUDE.md existente".

**Consumido por:** `assets/snippets/design-md-skeleton.md` (Plano 04 fase-01), `10-apply-merge-destructive` (resolve includes em runtime)

### D23 — Ordem Step 10 antes Step 02

Reordenacao no `registry.ts`: `apply-merge-destructive` (id 10) ANTES de
`link-claude-agents` (id 02). Apply-merge reescreve CLAUDE.md primeiro; Step 02
ja encontra arquivo no formato espelho ≤40 linhas.

**Consumido por:** `skills/init/lib/registry.ts`, `02-link-claude-agents.test.ts` (atualizado para nova ordem)

### D24 — Rollback como flag, nao skill separada

`/anti-vibe-coding:init --rollback` (nao `/init-rollback`). Padrao git-like,
preserva dispatcher imutavel via early-return.

**Consumido por:** `lib/run-init.ts` (early-return), `lib/rollback.ts`

### D25 — Compatibilidade execute-plan

Fase 0 do `/plan-feature` audita `skills/execute-plan/SKILL.md` + `lib/` validando
suporte a wave-based paralelo com glossario compartilhado. Se sim, segue; se nao,
abre PRD paralelo de extensao.

**Consumido por:** Plano 01 fase-01 (`EXECUTE_PLAN_AUDIT.md`)

### D26 — Resolucao do conflito "merge aditivo" do SKILL.md

Regra atual ("merge ADITIVO — Anti-Vibe complementa, nao substitui") sera
SUBSTITUIDA. Nova regra: "NUNCA sobrescrever sem aprovacao explicita + backup
recuperavel". Default: destrutivo. Opt-in conservador: `--additive-merge`.

**Consumido por:** `skills/init/SKILL.md` (rewrite em Plano 04 fase-07), Plano 06 fase-03 (ADR), Plano 06 fase-04 (CHANGELOG)

### D27 — Cobertura adicional de criterios de aceite

Adicionados CA-12 (E2E greenfield → populate → validate), CA-13 (dry-run parity),
CA-14 (audit log entries), CA-15 (performance <120s em 500 .md). Total final: 15 CAs.

**Consumido por:** Plano 07 fases 03/04/05 (testes E2E pareados)

### D28 — Reformulacao da regra "NUNCA sobrescrever"

Reformular para "NUNCA sobrescrever sem aprovacao explicita + backup recuperavel".
Mantem espirito de seguranca (dev consente, backup recuperavel via `--rollback`),
permite destrutivo controlado.

**Consumido por:** `skills/init/SKILL.md` (Plano 04 fase-07), Plano 06 fase-03 (ADR Specific Decisions tabela)

### D29 — Estrutura do backup para suportar rollback

Manifest dedicado `.anti-vibe/backup/{ts}/manifest.json` com schema canonico
`{ timestamp, files[]: { originalPath, backupPath, sha256, action: 'overwrite' | 'move' | 'transform' }, gitSha: string | null }`.
Rollback valida integridade via checksum match antes de restaurar.

**Consumido por:** `lib/backup-anti-vibe.ts` (Plano 01 fase-02), `lib/rollback.ts` (validacao)

### D30 — Comunicacao da mudanca breaking-comportamental

Tres camadas: (1) ADR-NNNN-destructive-merge-default.md em `docs/design-docs/`;
(2) CHANGELOG v6.4.0 seccao "Breaking Changes (Behavior)"; (3) warning runtime
amarelo quando cross-upgrade v6.3.x→v6.4.x detectado E CLAUDE.md > 40 linhas. So
aparece quando relevante.

**Consumido por:** Plano 06 fase-02 (`lib/cross-upgrade-detector.ts`), Plano 06 fase-03 (ADR), Plano 06 fase-04 (CHANGELOG)

---
```

### Passo 3: Validar formato e contagem

```bash
# 30 entries D{N} presentes
grep -cE '^### D[0-9]+ — ' docs/design-docs/init-rationale.md
# Esperado: 30 (uma para cada decisao D1-D30)

# Toda entry tem `**Consumido por:**`
grep -cE '^\*\*Consumido por:\*\*' docs/design-docs/init-rationale.md
# Esperado: 30 + N (onde N eh quantas entries de outros blocos ja tinham consumidores)
# Para a nova seccao deste PRD especificamente: o numero deve ser 30 dentro do escopo.
# Validacao mais precisa:
awk '/^## PRD 2026-05-17 — Refactor \/init Harness Populate Merge/,/^---$/' docs/design-docs/init-rationale.md | grep -cE '^\*\*Consumido por:\*\*'
# Esperado: 30

# Heading do bloco novo presente uma unica vez (idempotencia)
grep -c '^## PRD 2026-05-17 — Refactor /init Harness Populate Merge' docs/design-docs/init-rationale.md
# Esperado: 1
```

---

## Gotchas

- **G1 herdado (G8 do README) — Convencao de IDs sem colisao:** Arquivo existente
  usa prefixos `DI-XX` / `GT-XX` / `CA-XX` / `R-XX` / `M-XX` do refactor Rails-style.
  As novas entries usam prefixo `D` (sem hifen, decisoes do PRD novo). Sem colisao
  porque prefixos diferentes. **NAO renumerar IDs existentes.**
- **G2 herdado (G8 do README) — Formato canonico:** `### D{N} — {titulo}` (espaco
  `—` em vez de hifen ASCII), paragrafo descritivo (sem bullet), linha vazia,
  `**Consumido por:** {entidade}, {entidade}` em uma unica linha. Replicar
  exatamente.
- **G3 — Append no final, NAO inserir no meio:** O arquivo atual termina em algum
  ponto do refactor Rails-style. Esta fase APPENDA `---` + heading + 30 entries
  ao final. NAO interleavar com IDs existentes.
- **G4 — Idempotencia:** Se rodar duas vezes (ex: refactor por subagent paralelo),
  detectar via grep e abortar. Test inicial garante isso.
- **Local — Cross-reference com Planos:** Cada `**Consumido por:**` cita: (a) arquivo
  fonte de implementacao (ex: `lib/blocks-classifier.ts`) e/ou (b) plano-fase
  hierarquica (ex: `Plano 04 fase-01`). Esta convencao **diverge** levemente da
  existente (que cita apenas step-id). Justificativa: durante v6.4.0, o leitor desse
  rationale frequentemente precisa de cross-link para o plano detalhado em
  `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/`.
- **Local — D-IDs duplicam ate prefixo do refactor Rails:** Refactor Rails ja tinha
  decisoes referenciadas em SKILL.md como "D14" (D14 sempre apos customize-architecture)
  — mas essas eram IDs do PRD daquele refactor, NAO espelhadas em
  `init-rationale.md` com prefixo `D`. Validar: `grep -cE '^### D[0-9]+ —' init-rationale.md`
  ANTES desta fase deve retornar `0` (sem colisao).

---

## Verificacao

### TDD

N/A — content authoring puro. Validacao por grep + revisao humana.

### Checklist

- [ ] Arquivo `docs/design-docs/init-rationale.md` ganhou heading
      `## PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)` ao
      final, **uma unica vez** (assertable por `grep -c`).
- [ ] 30 entries `### D{N} — {titulo}` presentes na nova seccao, contando D1 ate D30
      sem buracos (assertable por `grep -oE '^### D[0-9]+' | sort -u | wc -l` = 30).
- [ ] Toda entry da nova seccao tem `**Consumido por:**` em linha propria
      (30 ocorrencias).
- [ ] Cada `**Consumido por:**` cita pelo menos uma entidade real (arquivo path,
      step id, ou referencia a plano-fase).
- [ ] Convencao `D` (sem hifen) preservada — assertable por
      `grep -E '^### D-[0-9]+' init-rationale.md | wc -l` = 0.
- [ ] Pre-existence check (idempotencia): `grep -c '^## PRD 2026-05-17 — Refactor /init Harness Populate Merge'`
      retorna `1` (nao `2`).
- [ ] `bun run harness:validate` continua verde (rationale nao introduz violacao
      estrutural).

---

## Criterio de Aceite

**Por maquina:**
- `grep -c '^## PRD 2026-05-17 — Refactor /init Harness Populate Merge' docs/design-docs/init-rationale.md` retorna `1`.
- `awk '/^## PRD 2026-05-17 — Refactor \/init Harness Populate Merge/,/^---$/' docs/design-docs/init-rationale.md | grep -cE '^### D[0-9]+ —'` retorna `30`.
- `awk '/^## PRD 2026-05-17 — Refactor \/init Harness Populate Merge/,/^---$/' docs/design-docs/init-rationale.md | grep -cE '^\*\*Consumido por:\*\*'` retorna `30`.
- `bun run harness:validate` exit 0.

**Por humano:**
- Spot-check de 3 entries aleatorias (ex: D5, D17, D26) — `Consumido por:` aponta
  arquivo/step REAL existente ou planejado no plano hierarquico.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

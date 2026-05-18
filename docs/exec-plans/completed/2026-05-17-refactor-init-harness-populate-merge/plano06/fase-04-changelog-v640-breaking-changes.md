<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: CHANGELOG v6.4.0 — Bloco "Breaking Changes (Behavior)"

**Plano:** 06 — Comunicacao + Observabilidade
**Sizing:** 0.5h
**Depende de:** Nenhuma dentro do plano (paralelizavel com fases 02/03/05); coordenacao com fase-03 (ADR) para citar numero real do ADR — ver G2.
**Visual:** false

---

## O que esta fase entrega

Conforme **SH-11** e **D30** do PRD: ESTENDE o bloco `## [6.4.0]` existente do
`CHANGELOG.md` (criado pelo refactor Rails-style anterior) com:
- `### Breaking Changes (Behavior)` no topo do bloco — destaque maximo;
- `### Added` estendido com os 7+1 novos steps + 1 comando + 3 flags + 3 helpers + 3 snippets novos;
- `### Changed` estendido com a regra "merge aditivo" reescrita + registry reorder Step 10 antes Step 02;
- `### Fixed` se houver algum bug relevante descoberto durante os Planos 03-06.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `CHANGELOG.md` | Modify | ESTENDER bloco `## [6.4.0]` existente. **NUNCA criar novo bloco v6.4.0** — ver G1 |

**Total:** 1 arquivo modificado. **Dentro do limite de 5/fase**.

---

## Implementacao

### Passo 1: Confirmar formato e local do bloco a estender

```bash
# Confirmar que bloco ## [6.4.0] ja existe (criado pelo refactor Rails-style)
head -15 CHANGELOG.md
# Esperado: linhas 1-3 header + linha 5+ `## [6.4.0] - 2026-05-17`

# Confirmar que nao tem `### Breaking Changes (Behavior)` ainda
grep -n '^### Breaking Changes (Behavior)' CHANGELOG.md
# Esperado: nenhuma ocorrencia (esta fase introduz)
```

### Passo 2: Inserir secao `### Breaking Changes (Behavior)` no topo do bloco v6.4.0

A insercao vai LOGO DEPOIS do header bullet (`> **Minor release...**`) e ANTES de
`### Added`. Posicao = topo do bloco — destaque maximo per **D30**.

```markdown
### Breaking Changes (Behavior)

> **Atencao:** o comportamento default do `/anti-vibe-coding:init` mudou em projetos com
> `CLAUDE.md` pre-existente. Esta secao destaca o que mudou comportamentalmente sem
> quebrar a interface publica (mesmo comando, mesmas flags). Veja
> [docs/design-docs/ADR-NNNN-destructive-merge-default.md](docs/design-docs/ADR-NNNN-destructive-merge-default.md)
> para o rationale completo.

- **Default merge strategy: aditivo → destrutivo controlado** — em projetos com
  `CLAUDE.md` > 40 linhas, o `/init` agora propoe (via batch approval `needsUser`)
  transformacao destrutiva: extrai blocos para `docs/` harness, reduz `CLAUDE.md` a
  espelho `<= 40 linhas` espelhando `AGENTS.md`, cria backup completo em
  `.anti-vibe/backup/{timestamp}/` com manifest checksum-validado. Comportamento
  v6.3.x preservado via flag opt-in `--additive-merge`. Reversibilidade total via
  `/anti-vibe-coding:init --rollback`.
- **Regra "merge aditivo" do `skills/init/SKILL.md` substituida** — texto antigo
  "**NUNCA sobrescrever** — o merge deve ser **aditivo**" foi reescrito para
  "**NUNCA sobrescrever sem aprovacao explicita + backup recuperavel**", refletindo
  o sistema real (Step 09 `propose-merge-batch` + Step 10 `apply-merge-destructive` +
  backup `.anti-vibe/backup/`). Lista de excecoes operacionais (`README.md`,
  `.gitignore`) documentada em `docs/design-docs/init-rationale.md` seccao
  "PRD 2026-05-17 — D26/D28".
- **Registry reorder: Step 10 (`apply-merge-destructive`) antes de Step 02
  (`link-claude-agents`)** — sequencia mudou para que o symlink/hardlink/copy 3-tier
  do `link-claude-agents` ja encontre o `CLAUDE.md` no formato espelho final, sem
  recriacao. Devs que importavam `linkClaudeAgentsStep` diretamente em testes
  isolados (caso raro) precisam de fixture com `CLAUDE.md` ja `<= 40 linhas` ou rodar
  Step 10 antes — ver `skills/init/lib/steps/02-link-claude-agents.test.ts` atualizado
  no Plano 04 fase-06.
- **Warning runtime amarelo cross-upgrade v6.3.x → v6.4.x** — quando manifest local
  registra v6.3.x e `CLAUDE.md` ainda tem `> 40 linhas`, dispatcher emite warning PT-BR
  com sugestao de `--additive-merge`. Aparece UMA vez por run, antes do registry,
  apenas quando relevante (suprimido em greenfield, dry-run, opt-in explicito).
```

### Passo 3: Estender `### Added` com items novos da v6.4.0 (PRD refactor-init-harness-populate-merge)

Localizacao: dentro do bloco `### Added` existente, em sub-bloco separado com header
em italico para distinguir do refactor Rails-style.

```markdown
#### Refatoracao /init — Populate Plan + Invert CLAUDE.md Merge + Adapt Existing Docs (PRD 2026-05-17)

- **8 novos steps no registry de `/init`** ([skills/init/lib/steps/](skills/init/lib/steps/)) — `06-secrets-scan`, `07-discover-existing-docs`, `08-classify-blocks-hybrid`, `09-propose-merge-batch`, `10-apply-merge-destructive`, `11-move-docs-with-stub`, `12-detect-drift-incremental`, `91-generate-populate-plan`. Pipeline cobre 4 modos do init (greenfield, migration, legacy v5, already-initiated).
- **Comando `/anti-vibe-coding:init --rollback`** ([skills/init/lib/rollback.ts](skills/init/lib/rollback.ts)) — early-return no dispatcher; restaura ultimo backup em `.anti-vibe/backup/{latest}/` byte-a-byte validando checksums; registra ADR de rollback em `docs/design-docs/`.
- **Flag `/init --dry-run`** — cobre todos os novos steps com `mutated: false` e renderiza preview agregado sem chamar `needsUser`. Parity test em CI compara dry-run output vs run real.
- **Flag `/init --additive-merge`** — opt-in conservador que preserva comportamento v6.3.x (pula Steps 09/10 destrutivos, aplica merge aditivo legado).
- **Helpers novos em `skills/init/lib/`** — `backup-anti-vibe.ts` (Plano 01 fase-02), `secrets-scanner.ts`, `discover-existing-docs.ts`, `blocks-classifier.ts`, `discovery-store.ts` (Plano 03), `doc-mover-stub.ts` (Plano 04 fase-04), `drift-detector.ts`, `rollback.ts` (Plano 05), `populate-plan-generator.ts` (Plano 02 fase-02), `cross-upgrade-detector.ts`, `audit-log-writer-factory.ts`, `init-subagent-ids.ts` (Plano 06).
- **Snippets novos em `skills/init/assets/snippets/`** — `populate-plan-template.md` (Plano 02 fase-01), `design-md-skeleton.md` (Plano 04 fase-01 — agrega os 5 snippets Akita via includes para `docs/DESIGN.md`), `rollback-adr-template.md` (Plano 05 fase-06), `classifier-llm-prompt.md` (Plano 03 fase-05).
- **PLAN.md de populacao automatico** ([assets/snippets/populate-plan-template.md](skills/init/assets/snippets/populate-plan-template.md)) — apos `final-validation`, Step 91 (`generate-populate-plan`) emite `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com 1+ tasks por arquivo do harness, paralelizaveis via `/execute-plan` wave-based, ultima task gating em `bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts`.
- **Audit log canonico** — `discovery/agents-log.json` recebe entries com `subagent_id` literal centralizado em `INIT_SUBAGENT_IDS` (9 entradas), `input_paths`, `output_struct`, `duration_ms` e `retry_count` em todos os 8 novos steps + comando `--rollback`. CA-14 do PRD assertable via `bun test skills/init/lib/run-init-audit-integration.test.ts`.
- **Documentacao formal da breaking-comportamental** — [docs/design-docs/ADR-NNNN-destructive-merge-default.md](docs/design-docs/ADR-NNNN-destructive-merge-default.md) + esta secao `### Breaking Changes (Behavior)` + warning runtime amarelo PT-BR (suprimido em greenfield/dry-run/opt-in).
- **Fixtures E2E v6.4** — `tests/fixtures/greenfield-v6.4/` (greenfield minimo) e `tests/fixtures/inverted-merge-v6.4/` (CLAUDE.md de 287 linhas com Akita + 4 docs estruturais) — base para CA-12 (E2E), CA-13 (dry-run parity), CA-15 (performance < 120s em 500 .md).
- **Atualizacao do `docs/design-docs/init-rationale.md`** — seccao nova "PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)" com 30 entries indexadas. Mantem convencao do refactor Rails-style (cada decisao com `**Consumido por:**`).
```

### Passo 4: Estender `### Changed`

Adicionar bullets sob o `### Changed` existente:

```markdown
- **Registry reorder: Step 10 antes de Step 02** — `applyMergeDestructiveStep` reposicionado IMEDIATAMENTE antes de `linkClaudeAgentsStep` em `skills/init/lib/registry.ts`. Justificativa em D23 do PRD (`apply-merge` reescreve CLAUDE.md primeiro; `link` ja encontra formato espelho final). Testes existentes do Step 02 (`skills/init/lib/steps/02-link-claude-agents.test.ts`) atualizados em Plano 04 fase-06.
- **Regra "merge aditivo" do `skills/init/SKILL.md` reescrita** (ver `### Breaking Changes (Behavior)`).
- **Auto-deteccao de cross-upgrade no dispatcher** — `lib/run-init.ts` chama `detectCrossUpgrade` apos `parseFlags` e antes do loop do registry. Warning amarelo PT-BR quando relevante.
```

### Passo 5: Validar formato e cross-link com ADR

```bash
# Bloco v6.4.0 unico (nao duplicado)
grep -c '^## \[6\.4\.0\]' CHANGELOG.md
# Esperado: 1

# Secao Breaking Changes (Behavior) presente
grep -n '^### Breaking Changes (Behavior)' CHANGELOG.md
# Esperado: 1 ocorrencia, no bloco v6.4.0

# Cita o ADR (numero real substituido apos fase-03)
grep -E 'ADR-[0-9]{4}-destructive-merge-default' CHANGELOG.md
# Esperado: >= 2 ocorrencias (uma no destaque do `### Breaking Changes`, uma na lista do `### Added`)

# Cita as 3 flags novas e o comando rollback
grep -cE '\-\-(dry-run|additive-merge|rollback)' CHANGELOG.md
# Esperado: pelo menos 3
```

### Passo 6: Substituir placeholders `ADR-NNNN` pelo numero real

Conforme **G2 do README** e **G9 do README**: apos fase-03 fixar o numero do ADR
em `MEMORY.md > Notas para Planos Seguintes`, fazer `sed`/manual replace:

```bash
# Exemplo se fase-03 escolheu 0021
sed -i.bak 's/ADR-NNNN-destructive-merge-default/ADR-0021-destructive-merge-default/g' CHANGELOG.md
diff CHANGELOG.md CHANGELOG.md.bak # confirma mudanca
rm CHANGELOG.md.bak
```

---

## Gotchas

- **G1 herdado (G3 do README) — NUNCA criar segundo bloco `## [6.4.0]`:** O bloco
  ja existe (criado pelo refactor Rails-style anterior). Esta fase ESTENDE — usa
  `Edit` com `old_string` ancorado na linha apos `> **Minor release...**` para
  inserir `### Breaking Changes (Behavior)`. Se criar segundo `## [6.4.0]`, viola
  formato keepachangelog e duplica historico. **Validar com `grep -c '^## \[6\.4\.0\]'` → 1**.
- **G2 herdado (G9 do README) — Cross-link com ADR-NNNN:** Numero do ADR escolhido
  por fase-03 em runtime. Se fases 03 e 04 rodam em paralelo, fase-04 usa placeholder
  `ADR-NNNN` no commit inicial e faz pass posterior. Coordenacao via
  `MEMORY.md > Notas para Planos Seguintes`.
- **G3 herdado (G7 do README) — Editor preserva `Edit` exato:** Apos confirmar o
  formato do bloco existente, usar `Edit` com `old_string` que contenha pelo menos
  3 linhas de contexto (header v6.4.0 + descricao + linha vazia) para garantir
  unicidade.
- **Local — Cabecalho do `### Added` ja tem subdivisao:** O `### Added` atual lista
  itens do refactor Rails-style (dispatcher, registry, 17 steps, contrato, etc).
  Adicionar sub-header `#### Refatoracao /init — Populate Plan + Invert CLAUDE.md
  Merge + Adapt Existing Docs (PRD 2026-05-17)` antes dos novos bullets — separa
  visualmente as duas waves de mudancas dentro do mesmo bump v6.4.0. Aceito pelo
  formato keepachangelog (nao mandatorio que `### Added` tenha bullets diretamente).
- **Local — `### Fixed` so se houver:** Se Planos 03-06 nao descobriram bugs (best
  case), nao adicionar bullet vazio. Conferir os `MEMORY.md` dos planos 01-06 e
  agregar se houver BUGs registrados.

---

## Verificacao

### TDD

N/A — content authoring puro. Validacao por grep + revisao humana.

### Checklist

- [ ] Bloco `## [6.4.0]` continua **unico** no `CHANGELOG.md` (assertable por
      `grep -c '^## \[6\.4\.0\]' CHANGELOG.md` retornando `1`).
- [ ] Sub-seccao `### Breaking Changes (Behavior)` existe e esta posicionada no topo
      do bloco v6.4.0 (logo apos o `> **Minor release...**`).
- [ ] Sub-seccao contem 4 bullets: (1) default merge strategy; (2) regra "merge
      aditivo" substituida; (3) registry reorder; (4) warning runtime cross-upgrade.
- [ ] Cita o ADR pelo numero real (sem `NNNN` placeholder) — confirmar via
      `grep ADR- CHANGELOG.md | grep -v NNNN` retornar match.
- [ ] `### Added` estendido com sub-header `#### Refatoracao /init — Populate Plan +
      Invert CLAUDE.md Merge + Adapt Existing Docs (PRD 2026-05-17)` + 10 bullets.
- [ ] `### Changed` estendido com 3 bullets (registry reorder, regra "merge aditivo",
      auto-deteccao cross-upgrade).
- [ ] Citacoes a `--additive-merge`, `--rollback`, `--dry-run` presentes pelo menos 1
      vez cada.
- [ ] Citacoes a `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/PRD.md`
      (cross-link com PRD original) em pelo menos 1 bullet.
- [ ] `bun run harness:validate` continua verde (CHANGELOG nao introduz violacao).
- [ ] `bun run lint` ignora `.md` por default — N/A.

---

## Criterio de Aceite

**Por maquina:**
- `grep -c '^## \[6\.4\.0\]' CHANGELOG.md` retorna `1`.
- `grep -c '^### Breaking Changes (Behavior)' CHANGELOG.md` retorna `1`.
- `grep -cE 'ADR-[0-9]{4}-destructive-merge-default' CHANGELOG.md` retorna `>= 2`.
- `grep -cE '\-\-(dry-run|additive-merge|rollback)' CHANGELOG.md` retorna `>= 3`.
- `grep -c 'Refatoracao /init — Populate Plan' CHANGELOG.md` retorna `1` (sub-header
  do `### Added`).
- `bun run harness:validate` exit 0.

**Por humano:**
- Spot-check: a primeira coisa visivel num `head -40 CHANGELOG.md` apos a edicao deve
  ser o destaque amarelo das mudancas breaking-comportamentais — devs upgradando de
  v6.3.x nao podem perder.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->

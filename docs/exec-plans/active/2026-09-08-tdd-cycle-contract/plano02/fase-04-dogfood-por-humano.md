<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-09-08 (Luiz/dev): default Assistido — PRD tdd-cycle-contract D2`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Dogfood por humano — o prompt novo muda o comportamento real

**Plano:** 02 — O ciclo roda no execute-plan
**Sizing:** 1.5h
**Depende de:** fase-03 e do sync do cache do plugin (criterio por humano)
**Visual:** false

---

## O que esta fase entrega

Prova, num projeto-fixture fora do repo do plugin, que o 4c novo faz o orquestrador parar no gate Assistido
(tracer bullet e `[RISCO]`), provar a defesa por mutacao com diff vazio, exigir REFACTOR, spawnar o
`plan-verifier` com `red-check-evidence: pass`, bloquear a fase quando a defesa nomeada nao afeta o teste, e
pular o gate em `--tdd-level direto` — lendo o STATE log de verdade e medindo o custo por fase
(PRD Premissas 1, 2, 4 e 5; CA-04 a CA-08, CA-10 em runtime).

**DP aplicadas:** DP-14 (template + copia por rodada), DP-2/DP-3/DP-6/DP-8/DP-10/DP-12 (o que se observa).

> **Nao e fase de codigo do plugin.** Se o dogfood revelar que o 4c precisa mudar, isso e DEV-* no MEMORY e
> volta para a fase 01, 02 ou 03 com RED proprio no teste de paridade — nunca se edita o 4c "de passagem"
> aqui (plano01 G13). `git status --porcelain` no repo do plugin ao final so pode mostrar `docs/exec-plans/`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `F:\tmp\avc-tdd-dogfood-template\` (fora do repo) | Create | Fixture escrito a mao: `package.json`, `src/.gitkeep`, `docs/exec-plans/active/2026-09-08-dogfood/{PRD.md,PLAN.md,STATE.md,plano01/{README.md,MEMORY.md,fase-01-sum.md,fase-02-can-read-risco.md}}` |
| `F:\tmp\avc-tdd-dogfood-r1\`, `-r2\`, `-r3\` (fora do repo) | Create | Uma copia por rodada, cada uma com `git init` + commit `baseline` (DP-14) |
| `{PASTA_ATIVA}/plano02/MEMORY.md` | Modify | Quadro de custo, DIs, DEV-*, GTs do dogfood |
| `{PASTA_ATIVA}/STATE.md` | Modify | Log com o resultado das tres rodadas |
| Cache do plugin (`C:\Users\luizf\.claude\plugins\cache\...`) | Modify (via script) | `scripts/sync-to-global.sh` copia o checkout para la — e o unico jeito de o 4c novo rodar (plano01 G1) |

Nenhum arquivo rastreado do plugin muda nesta fase.

---

## Implementacao

### Passo 1: Sync do cache (Premissa 5)

O script real e `scripts/sync-to-global.sh` (cabecalho: "Idempotente: rodar 2x produz mesmo resultado";
`PLUGIN_DEV` default `/f/Projetos/Anti-Vibe-Coding`; o proprio script avisa que no PowerShell `bash`
resolve para o WSL, que nao enxerga `/f/`). Rodar pelo Git Bash, a partir da branch `feat/tdd-cycle-contract`
com as fases 01–03 commitadas:

```powershell
& "C:\Program Files\Git\bin\bash.exe" scripts/sync-to-global.sh
```

Anotar o caminho impresso no banner como "Global: ..." — e `<CACHE>` nos comandos abaixo. Nao inventar o
caminho: a memoria `project_plugin-cache-stale-hooks` so garante que termina em `\7.7.0`.

Gate textual desta fase (RED antes, GREEN depois — ver Verificacao):

```powershell
Select-String -Path "<CACHE>\skills\execute-plan\SKILL.md" -Pattern "red_check" | Measure-Object | Select-Object -ExpandProperty Count
```

Antes do sync: `0`. Depois: `>= 1`. Depois do sync, `git diff --no-index skills/execute-plan/SKILL.md "<CACHE>\skills\execute-plan\SKILL.md"`
deve ser vazio — checkout e cache identicos.

O sync copia o checkout como esta (le `PLUGIN_DEV`, nao a `main`), entao o dogfood roda da branch. Depois do
merge, rodar o sync de novo — e passo do fechamento da feature, nao desta fase.

### Passo 2: Fixture-template (escrito a mao, nunca executado)

`F:\tmp\avc-tdd-dogfood-template\`:

**`package.json`**
```json
{ "name": "avc-tdd-dogfood", "private": true, "type": "module", "scripts": { "test": "bun test" } }
```

**`src/.gitkeep`** (vazio — o RED cria `sum.test.ts` + stub `sum.ts`; nada de producao existe no baseline)

**`docs/exec-plans/active/2026-09-08-dogfood/PRD.md`** (minimo; o 4b recorta `## Ameacas & Dados` para a fase de risco)
```markdown
# PRD: dogfood do ciclo TDD

**Status:** Approved

## Problema
Provar em runtime o Step 4c do execute-plan: gate humano, RED-check por mutacao, REFACTOR, verifier.

## Ameacas & Dados
- Dado sensivel: documento com `ownerId`. Fronteira de confianca: `canRead(user, doc)` e a unica porta.
- AB-1 (abuso): usuario que nao e o dono le documento alheio → deve ser negado. Teste de abuso ANTES da defesa.

## Criterios de Aceite
- CA-01: `sum(2, 3)` retorna `5`.
- CA-02: `canRead({ id: 'u2' }, { ownerId: 'u1' })` retorna `false`; `canRead({ id: 'u1' }, { ownerId: 'u1' })` retorna `true`.
- CA-SEC-1: nenhum caminho de `canRead` devolve `true` sem comparar `user.id` com `doc.ownerId`.
```

**`docs/exec-plans/active/2026-09-08-dogfood/PLAN.md`**
```markdown
# Plan: dogfood do ciclo TDD

**PRD:** ./PRD.md
**Planos:** 1 plano, 2 fases total
**Created:** 2026-09-08

## Planos

| # | Nome | Fases | Sizing | Depende de |
|---|------|-------|--------|------------|
| 01 | sum e canRead | 2 | ~0.5h | — |

## Tracer Bullet

**Plano:** 01
**Fase:** fase-01-sum
```

**`docs/exec-plans/active/2026-09-08-dogfood/STATE.md`** — copiar o formato de `execute-plan/SKILL.md:246-271`
(`Phase: planned`, `Current Plan: 01/1`, tabela com `| 01 | sum e canRead | 2 | 0/2 | pending |`, `## Log` com uma linha).

**`plano01/README.md`** — cabecalho do `plan-readme-template.md` com 2 fases no Mapa (`fase-01-sum.md`, 0.5h, —;
`fase-02-can-read-risco.md`, 0.5h, fase-01) e `## TDD Strategy` apontando para
`skills/tdd-workflow/SKILL.md §Contrato do Ciclo por Fase`. **`plano01/MEMORY.md`** — `memory-template.md` com o header.

**`plano01/fase-01-sum.md`** — copiar o bloco `### TDD` do `fase-template.md` pos-Plano 01 e preencher:
```markdown
# Fase 01: sum(a, b)

**Plano:** 01 — sum e canRead
**Sizing:** 0.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

## O que esta fase entrega
`sum(a, b)` em `src/sum.ts`, testada em `src/sum.test.ts`.

## Arquivos Afetados
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/sum.test.ts` | Create | teste `sums two numbers`: `expect(sum(2, 3)).toBe(5)` |
| `src/sum.ts` | Create | stub `throw new Error('not implemented')` no RED; `a + b` no GREEN |

## Verificacao
### TDD
**Tipo de fase:** comportamento
- [ ] **RED:** `sums two numbers` FALHA por assertion (stub-first — nunca `Cannot find module`)
  - Comando: `bun test src/sum.test.ts`
- [ ] **GREEN:** `bun test src/sum.test.ts` → 1 pass
- [ ] **RED-check:**
  - Defesa a mutar: em `src/sum.ts`, trocar `a + b` por `a - b`
  - Teste que deve cair: `sums two numbers`
- [ ] **REFACTOR:** commit `refactor(...)` proprio ou `refactor: none (motivo)`

## Criterio de Aceite
**Por maquina:** `bun test src/sum.test.ts` → 1 pass
```

**`plano01/fase-02-can-read-risco.md`** — idem, com o bloco `### Seguranca (apenas fase de slice [RISCO])`:
```markdown
# Fase 02: canRead nega quem nao e o dono [RISCO: auth/authz]

**Plano:** 01 — sum e canRead
**Sizing:** 0.5h
**Depende de:** fase-01
**Visual:** false

## O que esta fase entrega
`canRead(user, doc)` em `src/can-read.ts`: `true` so quando `user.id === doc.ownerId`.

## Arquivos Afetados
| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/can-read.test.ts` | Create | abuso PRIMEIRO: `denies read when user is not the owner`; depois `allows read to the owner` |
| `src/can-read.ts` | Create | stub no RED; comparacao `user.id === doc.ownerId` no GREEN |

## Verificacao
### TDD
**Tipo de fase:** risco
- [ ] **RED:** o teste de abuso FALHA por assertion antes da defesa existir
  - Comando: `bun test src/can-read.test.ts`
- [ ] **GREEN:** `bun test src/can-read.test.ts` → 2 pass
- [ ] **RED-check:**
  - Defesa a mutar: em `src/can-read.ts`, remover a comparacao `user.id === doc.ownerId` (devolver `true`)
  - Teste que deve cair: `denies read when user is not the owner`
- [ ] **REFACTOR:** commit `refactor(...)` proprio ou `refactor: none (motivo)`

### Seguranca (apenas fase de slice [RISCO])
- [ ] **Teste de abuso no RED:** `denies read when user is not the owner` FALHOU antes da defesa (AB-1)
  - Comando: `bun test src/can-read.test.ts -t 'denies read'`
- [ ] **CA-SEC-1:** nenhum caminho devolve `true` sem comparar `user.id` com `doc.ownerId` — verificado pelo RED-check
- [ ] Nenhum gatilho de aprovacao humana foi auto-aplicado
- [ ] Nenhum secret literal entrou no codigo

## Criterio de Aceite
**Por maquina:** `bun test src/can-read.test.ts` → 2 pass
```

### Passo 3: Uma copia por rodada (DP-14 — sem comando destrutivo)

```powershell
Copy-Item -Recurse "F:\tmp\avc-tdd-dogfood-template" "F:\tmp\avc-tdd-dogfood-r1"
```
Dentro de `F:\tmp\avc-tdd-dogfood-r1`: `git init`, `git add -A`, `git commit -m "chore: baseline do dogfood"`.
Repetir para `-r2` (depois de editar o template conforme o Passo 6) e `-r3`. Nunca reutilizar uma copia:
"resetar" e abrir a proxima — o guard bloqueia `git reset --hard`, `git clean -f`, `git checkout .` e
`git restore .` (G14), e nao ha por que precisar deles.

### Passo 4: Rodada r1 — Assistido, caso positivo (Premissas 1 e 2)

Abrir uma sessao do Claude Code com cwd em `F:\tmp\avc-tdd-dogfood-r1` (G23) e rodar:

```
/anti-vibe-coding:execute-plan docs/exec-plans/active/2026-09-08-dogfood/PLAN.md
```

Sem `--tdd-level` e sem `tdd_level:` no `user_profile` → Assistido (DP-2). O que o humano observa:

- fase-01 (tracer bullet): o orquestrador roda `bun test src/sum.test.ts` depois do RED e mostra a saida;
  PARA com `AskUserQuestion` mostrando `src/sum.test.ts` ("este e o contrato desta fase; confirma?") —
  responder "Confirmar". Antes da pergunta, o STATE.md do fixture ja tem a linha parcial com
  `red_confirmed: assertion` (Premissa 2 / G22 — conferir abrindo o arquivo ANTES de responder).
- fase-02 (`[RISCO]`): mesmo gate; conferir que o teste de abuso vem primeiro no arquivo mostrado.
- Depois de cada GREEN: o orquestrador muta `src/sum.ts` / `src/can-read.ts`, roda so o teste nomeado,
  restaura, mostra `git diff --stat` vazio.
- `plan-verifier` e spawnado por fase e devolve `red-check-evidence: pass`.
- Step 5 mostra `Ciclo TDD: ...` com os 4 campos e `Custo da fase: ...`.

Ao final, no fixture:
- `Get-Content docs\exec-plans\active\2026-09-08-dogfood\STATE.md` → duas linhas no formato DP-12, com
  `tdd_level: assistido`, `red_confirmed: assertion`, `human_gate: stopped`, `red_check: pass (defesa: ..., teste: ...)`,
  `refactor: commit ...|none (...)`, `custo: ...`.
- `git log --oneline` → por fase: commit de RED (`test(...)`), `feat(...)`, e `refactor(...)` se houve.
- `git diff --stat` → vazio.
- `Get-Content src\sum.ts` → `a + b` (a mutacao nao ficou).

### Passo 5: Medir o custo (Premissa 4)

Do STATE log e do diagnostico do Step 5, preencher o quadro "Custo por fase no dogfood" no MEMORY deste
plano: rodadas de teste, spawns (RED / GREEN / verifier / re-spawns), tempo aproximado. Se o verifier custou
>30% da fase, registrar DI propondo RF-05 condicionado ao nivel — decisao do dev, nao desta fase.

### Passo 6: Rodada r2 — caso negativo obrigatorio (CA-07)

No **template**, editar `plano01/fase-01-sum.md`:

```markdown
  - Defesa a mutar: em `src/sum.ts`, inserir a linha `// mutacao-inofensiva` no topo do arquivo
  - Teste que deve cair: `sums two numbers`
```

Copiar para `-r2`, `git init` + baseline, rodar o execute-plan (Assistido, "Confirmar" no gate). Esperado:

- RED-check: o orquestrador insere o comentario, roda `sums two numbers`, o teste PASSA → `red_check: fail
  (defesa: inserir // mutacao-inofensiva, teste: sums two numbers)`; arquivo restaurado, `git diff --stat` vazio.
- STATE do fixture: fase-01 `blocked`; `plano01/MEMORY.md` do fixture tem DI "teste nao prova a defesa".
- fase-02 NAO inicia (depende da fase-01).
- Step 5 mostra "FASE BLOQUEADA — teste nao prova a defesa".
- `plan-verifier` (se rodou) devolve `red-check-evidence: fail` e verdict `block`.

Restaurar a linha original no template antes do Passo 7 (e um arquivo escrito a mao — editar de volta).

### Passo 7: Rodada r3 — `--tdd-level direto` (RF-08, DP-2)

Copiar para `-r3`, baseline, e rodar:

```
/anti-vibe-coding:execute-plan docs/exec-plans/active/2026-09-08-dogfood/PLAN.md --tdd-level direto
```

Esperado: nenhuma parada em fase alguma; STATE log com `tdd_level: direto` e `human_gate: skipped(direto)`
nas duas fases; RED-check e verifier continuam rodando (`red_check: pass`, `red-check-evidence: pass`).

### Passo 8: Registro

- MEMORY deste plano: quadro de custo; DIs; GT-* (o que o orquestrador fez diferente do 4c escrito);
  DEV-* se algum passo do 4c precisou de ajuste (→ volta a fase 01/02/03 com RED proprio);
  "Notas para Planos Seguintes" (para o SUMMARY): o que as tres rodadas provaram, premissa por premissa.
- STATE.md da feature: uma linha por rodada.
- Sem commit de fixture no repo do plugin. Commit unico aqui: `docs(plan): fecha o Plano 02 fase-04 — dogfood (r1/r2/r3) e custo medido`.

---

## Gotchas

- **plano01 G1 / Premissa 5:** sem o Passo 1, a sessao roda o 4c velho e o dogfood "prova" o oposto. O
  gate textual (Select-String no `<CACHE>`) existe para pegar isso antes de abrir a sessao.
- **G14:** a unica operacao de git no fixture que o orquestrador faz e `git restore <arquivo>` +
  `git diff --stat` + commits. Se o log mostrar tentativa de `git restore .` ou `git checkout .`, e GT-*: o
  4c foi lido errado — anotar o trecho literal.
- **G23:** cwd no fixture; PASTA_ATIVA = `docs/exec-plans/active/2026-09-08-dogfood/`. O plugin e global
  (cache do usuario), entao o comando existe em qualquer cwd — o que muda e onde ele procura o plano.
- **DP-3 — dois sinais de gate na mesma rodada:** fase-01 para por ser `plano01/fase-01-*` (tracer bullet);
  fase-02 para por `Tipo de fase: risco` E pelo bloco `### Seguranca`. Se so uma parar, anotar qual sinal
  falhou — e GT sobre o passo 3 do 4c.
- **Local — `user_profile`:** se a memoria do projeto-fixture nao existe, o passo 0 cai no default; e o
  esperado. Nao criar `user_profile` para o dogfood — RF-09 esta fora.
- **Local — orquestrador e prompt, nao codigo (PRD §Riscos):** o que se registra e o comportamento
  OBSERVADO. Uma rodada em que o orquestrador pula o RED-check e resultado valido e negativo — vira DEV/GT
  e volta para a fase-02 com texto mais duro no 4c; nunca se "ajuda" o orquestrador na sessao para o log sair bonito.
- **Local — o plugin nao esta instalado no fixture:** nao rodar `/anti-vibe-coding:init` no fixture. O
  execute-plan so precisa da pasta `docs/exec-plans/active/` e de um git com HEAD.

---

## Verificacao

### TDD

**Tipo de fase:** sem-comportamento (validacao de runtime; o "teste" e o STATE log lido por humano)

- [ ] **RED (gate textual visto falhando):** antes do sync, `Select-String -Path "<CACHE>\skills\execute-plan\SKILL.md" -Pattern "red_check"` → `0`
- [ ] **GREEN:** apos `scripts/sync-to-global.sh`, o mesmo comando → `>= 1`; `git diff --no-index skills/execute-plan/SKILL.md "<CACHE>\skills\execute-plan\SKILL.md"` → vazio
- [ ] **RED-check:**
  - Defesa a mutar: no `<CACHE>\skills\execute-plan\SKILL.md`, apagar o passo 5 (RED-CHECK) do 4c com Edit
  - Teste que deve cair: o `Select-String ... -Pattern "red_check"` volta a `0`
  - Restaurar: rodar `scripts/sync-to-global.sh` de novo (idempotente) → `>= 1`; `git diff --no-index` vazio
- [ ] **REFACTOR:** n/a (sem-comportamento)

### Checklist (por humano)

- [ ] r1 fase-01: STATE log com `tdd_level: assistido | red_confirmed: assertion | human_gate: stopped | red_check: pass (defesa: a + b → a - b, teste: sums two numbers) | refactor: ... | custo: ...` (CA-04, CA-05 tracer, CA-06, CA-08)
- [ ] r1 fase-02: idem com `red_check: pass (defesa: comparacao removida, teste: denies read when user is not the owner)`; teste de abuso primeiro no arquivo (CA-05 risco)
- [ ] r1: STATE do fixture tinha `red_confirmed` ANTES de o gate perguntar (Premissa 2 / G22)
- [ ] r1: `plan-verifier` devolveu `red-check-evidence: pass` nas duas fases (CA-10); o 4d consolidou sem erro de parse
- [ ] r1: `git diff --stat` vazio e `src/sum.ts` com `a + b` ao final; `git log --oneline` com RED → feat → (refactor)
- [ ] r1: quadro de custo preenchido no MEMORY (Premissa 4)
- [ ] r2: fase-01 `blocked`, DI "teste nao prova a defesa" no MEMORY do fixture, fase-02 nao iniciou, Step 5 destacou o bloqueio (CA-07)
- [ ] r3: `human_gate: skipped(direto)` nas duas fases; `red_check: pass` nas duas (RF-08)
- [ ] Template restaurado (Defesa a mutar original) apos r2
- [ ] Repo do plugin: `git status --porcelain` → so `docs/exec-plans/`; nenhum arquivo do fixture
- [ ] `bun run harness:validate` verde (docs/ da feature tocado)
- [ ] MEMORY.md e STATE.md da feature atualizados; "Notas para Planos Seguintes" com o veredito premissa a premissa
- [ ] **Verificacoes rodadas SEPARADAS, nunca `a && b | tail`** (plano01 G3)

---

## Criterio de Aceite

**Por maquina:**
- `git diff --no-index skills/execute-plan/SKILL.md "<CACHE>\skills\execute-plan\SKILL.md"` → vazio (cache = checkout)
- No repo do plugin, `git status --porcelain` → apenas `docs/exec-plans/`

**Por humano:**
- As tres rodadas produziram os STATE logs descritos no checklist, lidos no arquivo — nao no chat
- Premissa 1 (o 4c como prompt muda o comportamento), Premissa 2 (gate nao perde o STATE), Premissa 4
  (custo medido e registrado) e Premissa 5 (so no cache sincronizado) marcadas como validadas ou refutadas
  no MEMORY, com o trecho literal do log como evidencia. Refutada nao e falha desta fase — e DEV-* que
  reabre a fase 01/02/03 com RED proprio

---

<!-- Gerado por /plan-feature em 2026-09-08 -->

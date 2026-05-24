<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-23 (Luiz/dev): goldens regenerados — D16 + Plano 02 fase-03`
-->

# Fase 03: Regenerar goldens E2E `init-greenfield` + validar full suite

**Plano:** 02 — Reestruturação Física + Goldens
**Sizing:** 1.5h
**Depende de:** fase-01 (`git mv` templates + manifest atualizado) + fase-02 (`git mv` libs + imports cross-skill verdes)
**Visual:** false

---

## O que esta fase entrega

Goldens `tests/e2e/__golden__/init-greenfield.tree.json` e `init-greenfield.stdout.txt` regenerados via `UPDATE_GOLDENS=1` (mecanismo padrão estabelecido em `tests/e2e/__golden__/README.md`), refletindo a nova origem física dos 10 templates compound (agora em `skills/compound-engineering/assets/`). Full suite `bun test && bun run lint` verde. Diff dos goldens visível e revisável no PR (D16, RNF-05) — gate "nunca diminuir" mantido.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/__golden__/init-greenfield.tree.json` | Modify (regen) | Regerado via `UPDATE_GOLDENS=1`. Diff esperado: pode incluir mudanças sutis em logs/audit refletindo nova origem dos templates. Se nenhum diff, suspeitar (G2). |
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Modify (regen) | Idem. Stdout do step de scaffold pode mudar referência de path de origem. |
| (cleanup) `.bak` snapshots dos goldens | Create temp + Delete | Snapshot pré-update para diff manual; deletar após confirmação. |

---

## Implementacao

### Passo 1: Snapshot pré-regen (artefato auditável)

```bash
# 2026-05-23 (Luiz/dev): backup antes do update — gate "nunca diminuir"
cp tests/e2e/__golden__/init-greenfield.tree.json \
   tests/e2e/__golden__/init-greenfield.tree.json.bak
cp tests/e2e/__golden__/init-greenfield.stdout.txt \
   tests/e2e/__golden__/init-greenfield.stdout.txt.bak
```

Os `.bak` ficam no working tree durante esta fase. Após validação final (passo 5), deletar.

### Passo 2: Capturar baseline de falhas ANTES do update

Roda full suite sem update para confirmar que SÓ os goldens E2E init quebram (e nenhum outro test colateral):

```bash
# 2026-05-23 (Luiz/dev): baseline antes do regen — confirma escopo da quebra
bun test 2>&1 | tee /tmp/baseline-fase03.log
```

**Critério:** falhas esperadas APENAS em `tests/e2e/init-cutover-greenfield.test.ts` (testes que comparam contra os 2 goldens). Falhas em qualquer outro lugar = bug introduzido em fase-01/fase-02; investigar antes de prosseguir.

Conferir contagem específica:
```bash
grep -E "fail|FAIL" /tmp/baseline-fase03.log | grep -v init-cutover-greenfield | head -20
# Resultado esperado: vazio (zero falhas fora do init-cutover)
```

### Passo 3: Regenerar goldens via `UPDATE_GOLDENS=1`

Padrão de regen documentado em `tests/e2e/__golden__/README.md`:

**Bash (WSL ou git-bash):**
```bash
# 2026-05-23 (Luiz/dev): regen — D16 + RNF-05 + Plano 02 fase-03
UPDATE_GOLDENS=1 bun test tests/e2e/init-cutover-greenfield.test.ts
```

**PowerShell:**
```powershell
$env:UPDATE_GOLDENS = "1"
bun test tests/e2e/init-cutover-greenfield.test.ts
Remove-Item env:UPDATE_GOLDENS
```

**Critério:** comando deve sair com exit 0 OU sair com falha em testes que JÁ ESTÃO skipados (per MEMORY global: "5 testes ativos pós-PRD populate-plan-andre-port" — só esses precisam passar). Se o mecanismo `UPDATE_GOLDENS=1` não estiver implementado no test helper (mesmo aviso do plano 05 fase-06 do PRD populate-plan-andre-port — "Cenario B"), fallback é: rodar o test sem update + comparar stdout/tree capturados com o golden + sobrescrever manualmente os 2 arquivos golden via `Out-File -Encoding utf8` ou `tee`.

### Passo 4: Diff manual dos goldens

```bash
# 2026-05-23 (Luiz/dev): revisão visual obrigatória — gate "nunca diminuir"
diff tests/e2e/__golden__/init-greenfield.tree.json.bak \
     tests/e2e/__golden__/init-greenfield.tree.json | head -60

diff tests/e2e/__golden__/init-greenfield.stdout.txt.bak \
     tests/e2e/__golden__/init-greenfield.stdout.txt | head -60
```

**Critério humano:**
- Mudanças PERMITIDAS: ajuste de paths que aparecem em logs de audit/scaffold (de `skills/init/assets/templates/` para `skills/compound-engineering/assets/`), counts inalterados, ordem inalterada.
- Mudanças SUSPEITAS (investigar antes de aceitar): nova entrada de arquivo no tree, header de seção removido do stdout, contagem de fases alterada, novos warnings.
- Se diff mostrar regressão real (gate "nunca diminuir" violado), reverter regen e investigar fase-01/fase-02 antes de continuar.

### Passo 5: Validar full suite verde com goldens novos

```bash
# 2026-05-23 (Luiz/dev): suite completa pós-regen
bun test 2>&1 | tee /tmp/post-regen-fase03.log
bun run lint
```

**Critério:**
- `bun test`: exit 0 (todos os testes ativos verdes).
- `bun run lint`: exit 0 (sem novos warnings/errors).
- Se algum teste do `init-cutover-greenfield.test.ts` continuar falhando, investigar — pode indicar que `UPDATE_GOLDENS=1` não foi capturado pelo helper (Cenário B do plano 05 fase-06 anterior — escrita manual necessária).

### Passo 6: Cleanup dos `.bak`

```bash
# 2026-05-23 (Luiz/dev): cleanup após validação verde
rm tests/e2e/__golden__/init-greenfield.tree.json.bak
rm tests/e2e/__golden__/init-greenfield.stdout.txt.bak
```

NÃO commitar os `.bak`. `git status` deve mostrar apenas os 2 goldens modificados (e o cleanup dos `.bak` se já estiver staged).

---

## Gotchas

- **G2 do plano (R2):** Esta fase fecha o ciclo aberto pela fase-01 + fase-02. Regenerar goldens ANTES dessas fases é fraude (golden refletiria estado antigo); regenerar DEPOIS é a única ordem correta — conforme D16.
- **G6 do plano (D16, RNF-05):** Comando exato: `UPDATE_GOLDENS=1 bun test tests/e2e/init-cutover-greenfield.test.ts`. Mecanismo documentado em `tests/e2e/__golden__/README.md`. Se helper não suportar a env var, fallback manual no passo 3 ("Cenário B" — escrita direta).
- **Local — diff visual obrigatório:** Não basta `bun test verde`. Gate "nunca diminuir" exige revisão humana do diff dos `.bak` vs novos. Mudança aceitável = nova origem dos paths. Mudança suspeita = regressão silenciosa.
- **Local — testes skipados:** Conforme MEMORY global (raiz), `init-cutover-greenfield.test.ts` tem testes skipados pré-existentes (`test.skip` aplicado em 2 testes durante PRD knowledge-path-cutover, e re-removidos em populate-plan-andre-port plano 05 fase-06). Estado atual: 5 testes ativos. Esta fase não muda número de testes skipados — só atualiza conteúdo dos goldens consumidos pelos testes ativos.

---

## Verificacao

### TDD

- [ ] **RED (baseline pré-regen):** `bun test` falha EXCLUSIVAMENTE em `init-cutover-greenfield.test.ts`
  - Comando: passo 2
  - Resultado esperado: failures restritas àquele arquivo; outras suites todas verdes

- [ ] **GREEN (pós-regen):** `bun test && bun run lint` verde
  - Comando: passo 5
  - Resultado esperado: 0 failures, 0 lint warnings

### Checklist

- [ ] `.bak` dos 2 goldens criados antes do update (passo 1)
- [ ] Baseline `tee /tmp/baseline-fase03.log` capturado — falhas RESTRITAS a `init-cutover-greenfield.test.ts`
- [ ] `UPDATE_GOLDENS=1 bun test tests/e2e/init-cutover-greenfield.test.ts` rodado (ou fallback manual se Cenário B)
- [ ] `diff` dos goldens revisado humanamente — mudanças explicáveis (nova origem dos templates)
- [ ] `bun test` (suite completa) verde pós-regen
- [ ] `bun run lint` verde
- [ ] `.bak` deletados antes do commit
- [ ] `git status` mostra apenas `tests/e2e/__golden__/init-greenfield.tree.json` + `.stdout.txt` modificados (e nada mais relacionado a esta fase)

---

## Criterio de Aceite

**Por maquina:**
- `bun test` exit 0
- `bun run lint` exit 0
- `git diff --stat tests/e2e/__golden__/` mostra apenas 2 arquivos modificados (`init-greenfield.tree.json` + `init-greenfield.stdout.txt`)
- `ls tests/e2e/__golden__/*.bak 2>/dev/null | wc -l` retorna 0 (cleanup feito)

**Por humano:**
- Diff dos goldens revisado no PR — mudanças explicáveis pela nova origem física dos templates (D16, gate "nunca diminuir")
- Nenhuma regressão silenciosa: arquivos não somem do tree, contagem de fases não muda inesperadamente, headers de stdout não desaparecem

---

<!-- Gerado por /plan-feature em 2026-05-23 -->

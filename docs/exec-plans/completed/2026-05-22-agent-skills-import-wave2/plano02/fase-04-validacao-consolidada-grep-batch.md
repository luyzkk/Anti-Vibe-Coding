# Fase 04: Validacao Consolidada — Grep Batch dos 13 Agentes + CA-11 + CA-12

**Plano:** 02 — Refinar 12 Agentes Restantes
**Sizing:** 1h
**Depende de:** Plano 02 fase-01, fase-02, fase-03 (Waves A/B/C concluidas — 13 agentes refinados)
**Visual:** false

---

## O que esta fase entrega

Relatorio consolidado de validacao dos 13 agentes refinados (1 do Plano 01 + 12 do Plano 02), confirmando integralidade dos 5 patterns, contagem >=52 de regras anti-degen, contract_version uniforme 2.0.0, CA-11 (verify-work nao tocado), e descricao do cenario CA-12 (clean state retorna positive_observations + verdict "approve").

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano02/relatorio-validacao.md` | Create | Relatorio de saida do grep batch + verificacao CA-11/CA-12 (artefato auditavel pelo dev e pelo Plano 04) |
| `docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano02/MEMORY.md` | Modify | Atualizar "Notas para Planos Seguintes" com resumo do relatorio |

Nenhum arquivo `agents/*.md` eh modificado nesta fase. Nenhum arquivo `skills/*` eh tocado. NAO modificar `skills/verify-work/SKILL.md` — CA-11 explicitamente verifica isso.

---

## Implementacao

### Passo 1: Script de grep batch sobre os 13 agentes

Criar inline (no terminal ou como artefato salvo) um script bash que itera pelos 13 agentes e roda os 7 greps por agente, agregando resultado.

```bash
#!/usr/bin/env bash
# 2026-05-22 (Luiz/dev): grep batch validation — Wave 2 Plano 02 fase-04
# Roda na raiz do repo. Output em formato tabular.

AGENTS=(
  "security-auditor"
  "react-auditor"
  "api-auditor"
  "database-analyzer"
  "tdd-verifier"
  "code-smell-detector"
  "solid-auditor"
  "infrastructure-auditor"
  "design-explorer"
  "documentation-writer"
  "lesson-evaluator"
  "plan-executor"
  "plan-verifier"
)

FAIL=0
TOTAL_ANTI_DEGEN=0

printf "%-30s | %-3s | %-3s | %-3s | %-3s | %-3s | %-3s | %-3s\n" \
  "agent" "OC" "PO" "VD" "AD" "CO" "v2" "v1"

for a in "${AGENTS[@]}"; do
  F="agents/${a}.md"
  oc=$(grep -c "## Output Contract (additions)" "$F" || echo 0)
  po=$(grep -c "positive_observations" "$F" || echo 0)
  vd=$(grep -c "verdict" "$F" || echo 0)
  ad=$(grep -c "## Anti-Degeneration Rules" "$F" || echo 0)
  co=$(grep -c "## Composition" "$F" || echo 0)
  v2=$(grep -c '"contract_version": "2.0.0"' "$F" || echo 0)
  v1=$(grep -c '"contract_version": "1.0"' "$F" || echo 0)

  printf "%-30s | %-3s | %-3s | %-3s | %-3s | %-3s | %-3s | %-3s\n" \
    "$a" "$oc" "$po" "$vd" "$ad" "$co" "$v2" "$v1"

  # Conta linhas bullet "- NUNCA" ou "- Never" dentro da secao Anti-Degeneration
  # como proxy de quantidade de regras anti-degen no agente
  rules=$(awk '/## Anti-Degeneration Rules/{flag=1;next} /^## /{flag=0} flag' "$F" \
    | grep -c -E "^- (NUNCA|Never)" || echo 0)
  TOTAL_ANTI_DEGEN=$((TOTAL_ANTI_DEGEN + rules))

  if [ "$oc" -lt 1 ] || [ "$po" -lt 1 ] || [ "$vd" -lt 1 ] \
     || [ "$ad" -lt 1 ] || [ "$co" -lt 1 ] || [ "$v2" -lt 1 ] || [ "$v1" -ne 0 ]; then
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Total agentes com falha: $FAIL / 13"
echo "Total regras anti-degen catalogadas: $TOTAL_ANTI_DEGEN (esperado >=52)"

if [ "$FAIL" -ne 0 ] || [ "$TOTAL_ANTI_DEGEN" -lt 52 ]; then
  echo "VALIDATION FAILED"
  exit 1
fi

echo "VALIDATION PASSED"
```

Salvar output desse script em `docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano02/relatorio-validacao.md` (capturar saida do terminal via redirect `> relatorio-validacao.md`).

### Passo 2: Verificar CA-11 — `skills/verify-work/SKILL.md` nao tocado

CA-11 exige backward compatibility por adicao: callers como `/verify-work` continuam funcionando sem mudanca.

```bash
# Comparar com a base do branch da Wave 2 (ajustar ref conforme git history)
# Substituir HEAD~N pelo commit anterior ao inicio do Plano 02
git diff --stat <BASE_REF> -- skills/verify-work/SKILL.md
```

Saida esperada: vazia (zero linhas modificadas).

Se houver diff, abortar e investigar — algum subagente saiu de escopo.

### Passo 3: Descrever cenario CA-12 — clean state retorna positive + verdict "approve"

CA-12 exige: agente que detecta 0 issues retorna `verdict: "approve"`, `issues: []`, `positive_observations.length >= 1` — nunca silencio.

Esta fase NAO implementa fixture executavel (nao ha runtime de agente nesta fase — eh validacao de docs). Apenas DOCUMENTA o cenario como capitulo do relatorio:

```markdown
## Cenario CA-12 — Validacao conceitual

Para cada um dos 13 agentes refinados, em estado clean (nenhuma issue encontrada),
o contrato do agente DEVE produzir:

{
  "contract_version": "2.0.0",
  "agent": "{nome}",
  "kind": "audit",
  "status": "complete",
  "payload": {
    "verdict": "approve",
    "issues": [],
    "positive_observations": [
      "{string concreta citando arquivo/padrao especifico — NAO tautologia}"
    ]
  }
}

Verificacao manual (amostra): abrir `agents/security-auditor.md` e confirmar que a secao
`## Output Contract (additions)` inclui `positive_observations: string[] (>=1 obrigatorio,
mesmo em estado "clean")`. Repetir para os outros 12 agentes via grep:

grep -c "mesmo em estado" agents/*.md   # >=13 esperado (1 ocorrencia por agente)

Implementacao de fixture runtime para testar agente em sandbox fica para Plano 03/04 ou
escopo separado (Wave 3 podera adicionar harness de cenarios).
```

### Passo 4: Atualizar MEMORY.md com resumo

Adicionar em "Notas para Planos Seguintes":

```
- 13/13 agentes refinados com 5 patterns. contract_version: 2.0.0 uniforme.
- Total anti-degen catalogado: N (ver relatorio-validacao.md no mesmo diretorio).
- CA-11 verificado: `skills/verify-work/SKILL.md` nao foi modificado nesta wave.
- CA-12 documentado: cenario clean state especificado no contrato de cada agente. Fixture
  runtime adiada para escopo separado.
- Plano 04 deve regenerar checksums SHA-256 dos 13 agentes em plugin-manifest.json e
  .claude-plugin/plugin.json.
```

---

## Gotchas

- **G1 do plano:** se algum agente falha algum dos 7 greps, NAO tentar consertar nesta fase — abrir mini-incident, voltar a Wave correspondente (A/B/C) e refazer o subagente. Esta fase eh VALIDACAO, nao correcao.
- **G7 do plano:** `git diff --stat` precisa do `<BASE_REF>` correto (commit anterior ao inicio do Plano 02). Se a branch tem rebases, usar `git log --oneline -- skills/verify-work/SKILL.md` para confirmar que o ultimo commit que tocou esse arquivo eh anterior a Wave 2.
- **Local:** o script de grep batch usa heuristica para contar regras anti-degen (linhas iniciando com "- NUNCA" ou "- Never" dentro da secao). Se algum subagente usar bullet styling diferente (ex: "- N/A", "- nao", "- NEVER" em uppercase), a contagem pode subestimar. Falsy negative aceitavel — basta agente ter visualmente >=4 regras; revisar diff humanamente se contagem total ficar muito proxima do limiar 52.
- **Local:** se o repo nao tiver `bun` instalado/configurado, `bun run harness:validate` falha. Usar `node` ou `npm` como fallback conforme `CLAUDE.md` do projeto.

---

## Verificacao

### Checklist de execucao da fase

- [ ] Script de grep batch executado e output salvo em `relatorio-validacao.md`
- [ ] Script retorna `VALIDATION PASSED` (FAIL=0, total anti-degen >=52)
- [ ] Tabela do relatorio mostra: cada uma das 13 linhas tem OC>=1, PO>=1, VD>=1, AD>=1, CO>=1, v2>=1, v1==0
- [ ] `git diff --stat <BASE_REF> -- skills/verify-work/SKILL.md` retorna vazio (CA-11)
- [ ] Capitulo CA-12 escrito no `relatorio-validacao.md` com cenario conceitual + grep de amostra
- [ ] MEMORY.md atualizado com "Notas para Planos Seguintes"
- [ ] `bun run harness:validate` verde
- [ ] `bun run test` verde
- [ ] `bun run lint` verde

---

## Criterio de Aceite

**Por maquina:**
- `bash <script-de-grep-batch> > relatorio-validacao.md && echo $?` retorna `0`
- `grep -c "VALIDATION PASSED" docs/exec-plans/active/2026-05-22-agent-skills-import-wave2/plano02/relatorio-validacao.md` retorna `>= 1`
- `git diff --stat <BASE_REF> -- skills/verify-work/SKILL.md | wc -l` retorna `0`
- `bun run harness:validate && bun run test && bun run lint` verde

**Por humano:**
- Review do `relatorio-validacao.md`:
  - Tabela com 13 linhas, todas verdes.
  - Total anti-degen >=52 (preferencialmente bem acima — 60-80 indica regras genuinas, nao mininho).
  - Capitulo CA-12 plausivel, com grep de amostra reproduzivel.
- Confirmacao que MEMORY.md tem secao "Notas para Planos Seguintes" preenchida com proximos passos do Plano 04.

---

<!-- Gerado por /plan-feature em 2026-05-22 -->

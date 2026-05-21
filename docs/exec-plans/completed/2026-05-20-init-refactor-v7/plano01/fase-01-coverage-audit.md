<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 01: Coverage Audit dos Steps a Deletar

**Plano:** 01 — Foundation + Tracer + Cleanup
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

`AUDIT.md` preenchido com tabela `step | test file | behaviors validos | onde recriar` para cada
um dos ~15 steps a deletar em fase-05. Sem esta auditoria, o delete e cego — mitiga R4 (DR-4).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/exec-plans/active/2026-05-20-init-refactor-v7/plano01/AUDIT.md` | Modify | Preencher tabela placeholder com dados reais dos `.test.ts` |
| `docs/exec-plans/active/2026-05-20-init-refactor-v7/plano01/MEMORY.md` | Modify | Registrar contagem final de behaviors `valido` vs `obsoleto` e qualquer step sem destino claro |

---

## Implementacao

### Passo 1: Confirmar lista exata de steps a deletar

Rode Glob em `skills/init/lib/steps/*.ts` e cruze com a tabela "Arquivos deletados" do PRD.
Resultado esperado: ~15 steps + os testes correspondentes. Anotar qualquer divergencia
(ex: `secrets-scan` aparece no codigo mas nao na tabela do PRD — decidir se entra ou nao).

```bash
# 2026-05-20 (Luiz/dev): cross-check entre disco e PRD antes de auditar
ls skills/init/lib/steps/*.ts | sort
```

### Passo 2: Para cada step, abrir o teste e listar assertions

Use `Grep "test\\(|it\\(|expect\\(" -n` no `.test.ts` para listar cada bloco. Para cada
assertion, decidir:

- **valido:** descreve comportamento que ainda eh esperado no init v7 (ex: "detecta legacy
  e popula state corretamente", "manifest contem campo X").
- **obsoleto:** descreve comportamento ja removido por decisao explicita (D3 backup/guards,
  D4 dry-run, D5 capabilities).

### Passo 3: Mapear cada behavior `valido` para Plano + fase de destino

Lookup table de destinos provaveis (do PLAN.md "Decisoes do PRD Aplicadas"):

| Behavior tipo | Destino esperado |
|---------------|------------------|
| Move `.claude/planning/` | Plano 02 (Step 2) |
| Escrita do manifest | Plano 02 fase do writer |
| progress.txt → compound source | Plano 02 (entry no manifest) |
| Detectar stack via package.json/Gemfile | Plano 01 fase-02 (Step 1) |
| Copy knowledge stack-aware | Plano 05 (Step 7) |
| Scaffold placeholders skip-if-exists | Plano 03 (Step 3) |
| link CLAUDE.md → AGENTS.md | Plano 03 (Step 3) |
| Install gh files | Plano 03 (Step 4) |
| Delivery loop interativo | Plano 05 (Step 6) |
| Final validation warning-mode | Plano 05 (Step 8) |
| ARCHITECTURE.md customization | Plano 04 (Step 5 emite plano populate, D11) |
| Cache/backup/dry-run/capabilities | obsoleto — D3/D4/D5 |

### Passo 4: Preencher AUDIT.md

Cada celula `Behaviors validos`: lista de `assertion → status` (1 linha por).
Cada celula `Onde recriar`: referencia precisa `Plano NN fase-MM` OU `obsoleto — D{N}` OU
`delegado ao execute-plan via manifest`.

Exemplo de preenchimento (linha do `11-migrate-2-planning`):

```
| 10 | 11-migrate-2-planning | 11-migrate-2-planning.test.ts |
  - "moves .claude/planning to docs/specs" → valido
  - "preserves nested dirs" → valido
  - "no-op when source missing" → valido
  - "respects --dry-run" → obsoleto (D4)
  | Plano 02 (Step 2 faz o move + entry no manifest) |
```

### Passo 5: Sinalizar gaps

Se algum behavior `valido` ficar sem destino claro em nenhum dos Planos 02-05, PARAR.
Reportar ao dev humano. Opcoes:

1. Adicionar fase nova ao Plano correspondente
2. Reclassificar como `obsoleto` (so com justificativa explicita)
3. Criar TODO para issue de follow-up

NAO seguir para fase-02 com gaps abertos.

---

## Gotchas

- **G1 (R4 do PLAN.md):** Esta fase eh o unico ponto de detecao para perda de cobertura.
  Se for executada superficialmente, behaviors validos vao silenciosamente sumir em fase-05.
- **Local (PRD vs disco):** A tabela do PRD lista 16 steps deletados, mas o `registry.ts` atual
  importa 21 steps. A diferenca eh que alguns sao mantidos (scaffold, link, install-gh,
  delivery-loop, final-validation, generate-populate-plan). Confirmar com Glob, nao com PRD.
- **Local (secrets-scan):** Step nao listado no PRD como deletado, mas tambem nao aparece nos 8
  steps novos (D12). Decisao: provavelmente absorvido pelo Step 2 do Plano 02 (escaneia ao mover
  planning). Confirmar na fase-01 e anotar em AUDIT.md.
- **Local (testes orfaos via tipo):** Alguns testes podem importar tipos/helpers do step deletado.
  Listar esses imports no audit para fase-05 saber o que mais limpar.

---

## Verificacao

### TDD

N/A para esta fase — eh auditoria de documentacao, nao codigo.

### Checklist

- [ ] `ls skills/init/lib/steps/*.test.ts` listado e cruzado com PRD
- [ ] AUDIT.md tem 0 ocorrencias de `_(preencher)_` (grep limpo)
- [ ] Cada step deletado tem `Onde recriar` resolvido (`Plano NN fase-MM` ou `obsoleto — D{N}`)
- [ ] Zero behaviors `valido` sem destino atribuido
- [ ] MEMORY.md atualizado com contagem final (X validos, Y obsoletos) e quaisquer steps com gap

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "_(preencher)_" docs/exec-plans/active/2026-05-20-init-refactor-v7/plano01/AUDIT.md` retorna `0`

**Por humano:**
- Dev humano (ou code review) confirma que cada `Onde recriar` aponta para um plano/fase consistente com o PLAN overview
- Nenhum step com behaviors `valido` ficou sem destino atribuido (escalonamento explicito em MEMORY.md se sim)

---

<!-- Gerado por /plan-feature em 2026-05-20 -->

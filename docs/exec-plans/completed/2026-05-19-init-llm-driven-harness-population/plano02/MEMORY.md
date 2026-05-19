# Memoria: Plano 02 — Scaffold expandido + Backup pre-mutacao

**Feature:** init-llm-driven-harness-population
**Iniciado:** 2026-05-19
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### Decisoes pre-execucao (ponto-revisao do Plano 02 com dev, 2026-05-19)

- **DI-PR-1 (ponto 1):** Entry CODE_STYLE.md no TEMPLATE_MANIFEST sera inserida no FIM da
  Camada 1 (apos COMPOUND_ENGINEERING.md), com comentario de proveniencia inline.
  - Por que: alinha com o padrao do MERGE_GATES (linha 35 do template-manifest.ts atual) —
    posicao por data + comentario, ao inves de ordem alfabetica estrita.
  - Impacto: diff mais legivel; futuras adicoes seguem o mesmo padrao.
  - Aplicado em: fase-01.

- **DI-PR-2 (ponto 2):** AGENTS.md.tpl recebe APENAS o bullet de CODE_STYLE.md nesta fase
  (escopo estrito). DESIGN.md continua ausente da secao "Read Before Major Changes" —
  registrado em "Notas para Planos Seguintes" como debt-tracker.
  - Por que: PRD CA-08 nao exige DESIGN.md no AGENTS; misturar gap separado polui auditoria
    do plano.
  - Impacto: PR menor, foco claro; gap de DESIGN.md fica visivel para fase futura.
  - Aplicado em: fase-02.

- **DI-PR-3 (ponto 3):** fase-03 ASSUME estado pos-Plano 01 fase-04 (arquivo renomeado +
  export renomeado + registry atualizado). Sem branch defensivo.
  - Por que: dependencia entre planos eh contrato; defensividade misturada com cleanup
    poluiria o diff e mascararia regressao de fase-04.
  - Impacto: se fase-04 nao rodou, fase-03 ABORTA — investigacao volta para Plano 01.
  - Aplicado em: fase-03 Passo 3.

- **DI-PR-4 (ponto 4):** `design-md-skeleton.md` sera deletado em fase-03 (junto com a
  extracao Akita). Adicionalmente, fase-03 Passo 0 investiga o arquivo paralelo
  `10-migrate-1-backup.ts` antes de prosseguir.
  - Por que: cleanup atomico (uma fase remove logica + assets associados); investigacao
    do migrate-1-backup evita duplicacao silenciosa.
  - Impacto: Passo 0 adicionado a fase-03; resultado da investigacao deve aparecer aqui
    como DI-N antes de prosseguir para Passo 1.
  - Aplicado em: fase-03 Passos 0 e 5.

- **DI-1 (Passo 0 fase-03, 2026-05-19):** `10-migrate-1-backup.ts` — Caso A (ortogonal).
  Arquivo tem callers ativos: importado no `registry.ts` (linha 10, posicao 5 no array) e
  testado em `10-migrate-1-backup.test.ts` (5 testes). Escopo completamente distinto:
  cuida de backup da pasta `.planning` (v5→v6 migration) apenas em `migrate` mode —
  nao toca `CLAUDE.md` nem `docs/_legacy/`. Zero overlap com `backupPreMutationStep`.
  Mantidos em coexistencia; nenhuma acao necessaria nesta fase.

<!-- Exemplo de DI durante execucao:
- **DI-1:** Usar `upsert` em vez de `insert` para notifications
  - Por que: tabela pode receber duplicatas via webhook retry
  - Impacto: simplifica error handling no service
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Migration falha com "relation already exists"
  - Causa: migration anterior criava tabela sem IF NOT EXISTS
  - Fix: adicionado IF NOT EXISTS na migration 009
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** RLS policy com SECURITY DEFINER ignora RLS em triggers
  - Descoberto em: fase-02
  - Impacto: queries de service precisam usar service_role, nao anon
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-1:** fase-03 planejava 2 endpoints, implementou 3
  - Motivo: endpoint de bulk delete necessario para UX de selecao multipla
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Debt-trackers (registrados na revisao 2026-05-19)

- **DEBT-1:** `DESIGN.md` esta AUSENTE da secao "Read Before Major Changes" do
  `skills/init/assets/templates/AGENTS.md.tpl` (verificado durante revisao do Plano 02).
  Plano 02 fase-02 NAO adiciona (decisao DI-PR-2: escopo estrito). Acao sugerida:
  abrir TODO no `TODO.md` raiz ou nova fase em plano futuro para incluir DESIGN.md
  ao lado de CODE_STYLE.md, ARCHITECTURE.md, etc.

### A preencher durante execucao

<!-- Exemplos:
- Path do template novo (`skills/init/assets/templates/docs/CODE_STYLE.md.tpl`) — Plano 03
  fase-03 instrui LLM a popular ESSE arquivo no PLAN populate.
- Categoria escolhida para CODE_STYLE.md no TEMPLATE_MANIFEST (`anti-vibe-extension`) —
  Plano 04 fase-03 deriva allowlist do validator dessa fonte.
- Resultado da investigacao do `10-migrate-1-backup.ts` (Passo 0 da fase-03): ortogonal,
  duplicacao parcial, ou orfao morto.
- Contrato exato do `backupPreMutationStep` (assinatura, summary strings) — Plano 04
  fase-02 pode reusar primitivo `fs.copyFile` ou padronizar via helper compartilhado.
-->

---

<!-- Atualizado automaticamente durante execucao -->

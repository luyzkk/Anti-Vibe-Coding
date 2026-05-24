# Memory — Plano 03

## Decisões de Implementação

- **DI-P03-01:** Seções inseridas após última seção de conteúdo existente: em `tdd-workflow/SKILL.md` após bloco `</constraints>` (linha 322); em `security/SKILL.md` após seção de checklist (linha 470).

## Fase 01 — tdd-workflow + security (commit 8cba51f)

- `tdd-workflow/SKILL.md`: 4 racionalizações + 7 red flags adicionados
- `security/SKILL.md`: 4 racionalizações + 8 red flags adicionados
- `harness:validate`: exit 1 somente com falhas pré-existentes GT-01 (Infos/knowledge/Rails/) — sem novas falhas

## Fase 02 — plan-feature + execute-plan (commit d513c71)

- `plan-feature/SKILL.md`: 4 racionalizações + 6 red flags adicionados (linha 837/846)
- `execute-plan/SKILL.md`: 4 racionalizações + 6 red flags adicionados (linha 886/895)
- Inserção: após `## Referencias` e antes do bloco de telemetria de fim — padrão consistente com estrutura dos arquivos
- `harness:validate`: exit 1 apenas com falhas GT-01 pré-existentes (Rails + Nodejs) — sem regressões

## Fase 03 — grill-me + Passo 1.5 (commit 4c9fbde)

- `grill-me/SKILL.md`: 4 racionalizações + 6 red flags adicionados (linha 344/353)
- Passo 1.5 inserido na linha 58 (entre Passo 1 linha 47 e Passo 2 deslocado para linha 82)
- Arquivo cresceu de 347 para 390 linhas (+44 inserções)
- **DI-P03-02:** Passo 1.5 inserido em linha 58. Registrar para referência futura caso outro plano edite grill-me.
- `harness:validate`: exit 1 apenas com falhas GT-01 pré-existentes — sem regressões

## Notas para Planos Seguintes

- DI-P03-03: `execute-plan/SKILL.md` e `plan-feature/SKILL.md` usam bloco de telemetria TypeScript no final — inserções devem ir ANTES desse bloco, após `## Referencias`.
- DI-P03-04: `grill-me/SKILL.md` tem Passo 1.5 na linha 58 (pós-edição 2026-05-22). Qualquer edição futura deve reler o arquivo completo antes.

## Estado

| Fase | Status |
|------|--------|
| 01 — tdd-workflow + security | ✅ completed (8cba51f) |
| 02 — plan-feature + execute-plan | ✅ completed (d513c71) |
| 03 — grill-me + Passo 1.5 | ✅ completed (4c9fbde) |

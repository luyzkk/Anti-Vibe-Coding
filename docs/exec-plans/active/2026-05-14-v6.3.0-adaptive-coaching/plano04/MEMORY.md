# Memoria: Plano 04 — profile-aware-preface ×4-6 skills

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** 2026-05-15
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Bloco preface em SKILL.md passa `process.cwd()` como argumento de `readPrefaceContext(projectRoot)` nas 4 skills.
  - Por que: `readPrefaceContext` exige `projectRoot` posicional; spec da fase não especifica o valor mas pattern de `/architecture` usa `process.cwd()` implicitamente via `readArchitectureProfile()` sem argumento.
  - Impacto: harness check é string-presence apenas (G4 do plano), então a chamada literal nunca executa neste contexto — escolha é cosmética/documental. Se v6.5 tornar SKILL.md executável, revisar.
- **DI-2 (fase-02):** Passo 0 (G6 do plano) — operador escolheu INCLUIR `/lessons-learned` em vez de SKIPAR.
  - Por que: mesmo sendo meta-skill orquestradora, profile pode informar **categorização** das lições (sugerir tag `[Next-Specific]` quando nextjs-app-router, `[MVC-Specific]` quando mvc-flat) sem mexer no filtro de qualidade senior (universal).
  - Impacto: total final = 6 skills com preface (4 Must Have + 2 Should Have). RF-SH-05 satisfeito 100%. Sem candidato a compound lesson de "SKIP é resultado válido" — Plano 04 fase-04 ficará livre desse caso.
- **DI-3 (fase-02):** Lookup tables novas reusam estritamente o pattern de `/security` (referência canônica) — provenance comments, ordem de exports, comentário CA-02 no DEFAULT, import path `'../../lib/manifest-types'` para `ArchitectureProfileName`.
  - Por que: replicação mecânica é exatamente o objetivo do tracer bullet da fase-01 — fase-02 confirma que o pattern é copia-cole-adapte sem invenção.
  - Impacto: zero divergência estrutural entre as 6 lookup tables; harness check da fase-03 ficará trivial.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Harness check regex casa com `<!-- profile-aware-preface:start -->` em comentário JSDoc
  - Causa: regra de string presence não distingue entre marker real e exemplo em doc
  - Fix: limitar check a arquivos `skills/*/SKILL.md` (não a .ts ou .md de docs)
  - Fase afetada: fase-03
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** /lessons-learned skipou preface — meta-skill não consulta código do projeto
  - Descoberto em: fase-02
  - Impacto: total final = 5 skills com preface (4 Must + 1 Should: /decision-registry)
  - Lesson registrada em fase-04 compound note
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-01):** Implementação GREEN de `/api-design` lookup table foi corrigida após primeira tentativa de RED→GREEN. Teste do RED esperava `"route handler"` (lowercase, singular) na preface de `nextjs-app-router`, mas implementação inicial usou `"Route handlers"` (capitalizado, plural). Decisão: ajustar implementação para casar com o teste (G4 do plano — teste é anchor imutável após RED).
  - Motivo: TDD — teste é a spec, implementação serve o teste.
  - Impacto: nenhum (anchor preservado, RED→GREEN completou conforme contrato).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 2 |
| Fases com desvio | 1 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Skills com preface (acumulado) | 6 (4 Must + 2 Should) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Não há próximo plano após este — Plano 04 fecha o release v6.3.0.
     Notas aqui servem para v6.3.1 (patch) ou v6.4/v6.5 (próxima minor).
-->

### Para fase-03 (harness-validate-preface) e fase-04 (CHANGELOG + compound)

- **6 skills com bloco `<!-- profile-aware-preface:start --> ... :end -->`:** `security`, `api-design`, `system-design`, `design-patterns` (Must Have, fase-01), `decision-registry`, `lessons-learned` (Should Have, fase-02). Todas seguem o mesmo template literal — harness check (fase-03) pode usar `string.includes()` simples (G4 + G7 do plano).
- **Total final do RF-SH-05:** 100% — não houve SKIP. Fase-04 compound note NÃO precisa documentar "SKIP é resultado válido"; pode focar em "replicação mecânica funcionou" como lesson principal.
- **Pattern estável para v6.5:** quando `PrefaceContext` ganhar `language` e `framework` (slots reservados), as 6 lookup tables existentes continuam válidas — só ampliam mapas. CA-09 satisfeito.

---

<!-- Atualizado automaticamente durante execucao -->

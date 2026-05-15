# Memory: Plano 05 - Polish & DX

**Feature:** Adaptive Coaching v6.3.0
**Iniciado:** _(preencher na execução)_
**Status:** pendente

---

## Decisões Durante Execução

_(preencher durante execução do plano)_

<!-- Exemplo:
- **DEC-1:** fase-01 deferida para v6.3.1 — Plano 02 fase-03 ainda em review
  - Por que: dependência externa não pronta no time-box
  - Impacto: fase-02 e fase-03 shipparam em v6.3.0; fase-01 patch posterior
-->

---

## Bugs Encontrados

_(preencher durante execução do plano)_

<!-- Exemplo:
- **BUG-1:** preface:simulate quebra em Windows quando skill name tem barra invertida
  - Causa: path.join no Windows produz \ mas glob pattern espera /
  - Fix: normalize path com .replace(/\\/g, '/') antes de match
  - Fase afetada: fase-03
-->

---

## Learnings

_(preencher durante execução do plano)_

<!-- Exemplo:
- **L-1:** Threshold default 70 cobre casos reais — fixtures de profile com confidence 65-75
  validam o limiar sem ruído. Subir para 80 derrubaria 20% dos casos legítimos.
  Source: fase-02 testes edge cases.
-->

---

## Patterns Emergentes

_(preencher durante execução do plano)_

<!-- Exemplo:
- **P-1:** Config files novos em config/ devem vir com schema + fixture válida + 2 inválidas
  desde o primeiro commit. Validador em CI evita drift silencioso.
  Source: fase-02 — schema adaptive-coaching-v1.
-->

---

<!-- Atualizado automaticamente durante execucao -->

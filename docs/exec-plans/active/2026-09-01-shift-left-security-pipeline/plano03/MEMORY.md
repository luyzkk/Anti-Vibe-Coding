# Memoria: Plano 03 — Teste dinamico white-box

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Manter o timeout do curl em 5s em vez de 3s
  - Por que: dev server com HMR frio demorou >3s no primeiro request e gerou falso "sem dev server"
  - Impacto: liveness probe mais lento, deteccao confiavel
-->

**Decisoes ja fechadas no planejamento** (nao repetir, so registrar desvio se mudarem):

- **DP-1** (README): a fase-01 cria `tests/dynamic-testing-guardrail.test.ts` — o guardrail e o unico
  item cuja remocao nao produz sintoma.
- **DP-2** (README): o passe entra como `## Step 2.5` do `verify-work`, nao como `### 2g` nem dentro
  do Step 4.
- **DP-3** (README): `config.auditors.dynamic` default `false` (opt-in) + oferta ativa via
  `AskUserQuestion` quando ha dev server e ha suspeita a confirmar.
- **DP-4** (README): ordem de resolucao do alvo = argumento → CLAUDE.md → `.claude/launch.json` →
  perguntar; validacao de host **sempre** depois.
- **DP-5** (README): o passe **nao** vira agente novo.
- **DP-6** (README): o ponteiro na `/security` e a secao `## 10`.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** `bun test tests/dynamic-testing-guardrail.test.ts` falhou no carregamento
  - Causa: readFileSync direto num arquivo ainda inexistente (ENOENT no import) — G13
  - Fix: leitura defensiva com existsSync antes
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-1:** `grep -c '^## '` conta headings dentro de bloco ``` de exemplo
  - Descoberto em: fase-01
  - Impacto: o criterio de aceite por contagem de secoes precisa de ancora mais estreita
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Registrar aqui, obrigatoriamente:
- qualquer linha REMOVIDA de arquivo existente (o DIFF-GUARD exige 0 removidas — remocao so passa
  com justificativa linha a linha aqui)
- qualquer afrouxamento do guardrail de autorizacao (CA-06 e dealbreaker: afrouxar exige aprovacao
  humana explicita registrada, nao decisao de execucao)
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 2 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Registro de validacao de premissas

O Plano 03 carrega duas premissas do PRD. Anotar o resultado real aqui — a fase-02 e trabalho futuro
dependem disso.

| Premissa do PRD | Onde se valida | Resultado |
|---|---|---|
| #3 — o ambiente de dev do projeto-alvo sobe um dev server acessivel ao agente | fase-02 (deteccao) | _pendente_ |
| #5 — conteudo derivado de docs OWASP/ZAP (CC BY-SA) e compativel mantendo atribuicao | fase-01 (§Fontes) | _pendente_ |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Este e o ultimo plano da feature — nao ha "proximo plano" dentro do PRD.
     Preencher aqui o que a limpeza final (ZAP/Trivy, fora deste escopo) e o /wizard precisam saber:
     - onde ficou o procedimento (skills/security/references/dynamic-testing.md)
     - qual e o contrato do guardrail que o ZAP tambem tem que respeitar
     - se `config.auditors.dynamic` foi documentado em algum lugar alem do proprio JSON
-->

---

<!-- Atualizado automaticamente durante execucao -->

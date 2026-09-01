# Memoria: Plano 01 — Conhecimento (base das auditorias)

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** `isHighEntropySecret` ganhou um **segundo eixo** (`longestSequentialRun`), alem
  do `hasMixedCharset` + limiar que a spec previa. Limiar `MAX_SEQUENTIAL_RUN = 6`.
  - Por que: sem ele a regra de entropia derruba um teste pre-existente (ver BUG-1). Escolhido pelo
    dev entre 3 opcoes; as outras duas (atualizar o teste antigo / supressor por allowlist) foram
    rejeitadas por afrouxar a suite e por tratar sintoma em vez de causa.
  - Impacto: **fase-02 herda os dois eixos.** Toda regra generica nova deve passar pelos dois.
    A margem medida e larga (monotonica 10-26 vs. secret real 1-2), entao 6 nao e valor critico.

- **DI-2 (fase-01):** ordem de escrita dos Passos 4 e 5 invertida — teste do step escrito ANTES da
  implementacao do step.
  - Por que: a spec apresentava GREEN-entao-teste para o step 03, o que quebra TDD estrito.
  - Impacto: nenhum no conteudo final; so a ordem de execucao. Spec das fases seguintes deve
    apresentar RED antes de GREEN tambem para os steps.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-1 (fase-01):** a regra `high-entropy`, implementada **literalmente conforme a spec**, derruba
  o teste pre-existente `NAO confunde sk_test_ com sk_live_`.
  - Sintoma: `scanSecrets('STRIPE_TEST=sk_test_1234567890ABCDEFGHIJKLMN')` passou a retornar 1 match.
    Suite: 603 pass / 1 fail (baseline era 597/0).
  - Causa raiz: **entropia de Shannon mede DIVERSIDADE de caracteres, nao imprevisibilidade.**
    Sequencias monotonicas (`1234567890`, `ABCDEFGHIJKLMN`) maximizam diversidade sem serem
    aleatorias. Medicao no repo: `abc..xyz0123456789` (zero aleatoriedade) = **5.17 bits/char**,
    ACIMA do secret real aleatorio = **5.00**. Ou seja, o falso positivo pontua mais alto que o
    verdadeiro positivo — **nenhum ajuste de limiar separa os dois**.
  - Fix: guard de corrida sequencial como eixo independente (DI-1) + teste de regressao com um
    caso de charset misto (`abcdefghij0123456789ABCDEFGHIJ`, 4.91 bits/char) que so o guard barra.
  - Fase afetada: fase-01 (spec corrigida no proprio arquivo da fase).

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** teste de guarda pode passar pelo motivo errado. A primeira versao do teste de
  regressao do BUG-1 usava `abcdefghijklmnopqrstuvwxyz0123456789`, que passou de imediato — mas por
  falhar em `hasMixedCharset` (nao tem uppercase), nao pela corrida sequencial. Era um RED falso.
  - Impacto: ao testar um guard que e o **segundo** de varios filtros, a fixture precisa passar por
    todos os filtros anteriores, senao o teste e vacuo. Vale para todo supressor da fase-02.

- **GT-2 (fase-01):** `ssh-rsa AAAAB3Nza...` continua sinalizado como `high-entropy` mesmo com o
  guard — corretamente, do ponto de vista da metrica: e base64 de chave real, entropia genuina. Nao
  e falso positivo de *metrica*, e de *semantica* (chave PUBLICA nao e secret).
  - Impacto: confirma que a fase-02 precisa dos supressores por linha — o eixo entropia+sequencia
    nao resolve essa classe, por design.

- **GT-3 (fase-01):** a premissa GT-01 do README esta **desatualizada**. `bun run typecheck` retorna
  **exit 0, zero erros** — os erros pre-existentes em `lazy-import.test.ts` e `subagent-contract.ts`
  nao se manifestam mais. Fases seguintes podem exigir typecheck limpo em absoluto, nao so delta.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-01):** spec da fase corrigida durante a execucao (adicao do `longestSequentialRun`).
  - Motivo: BUG-1. Seguiu a regra do `execute-plan` — plano errado se corrige NO PLANO, nao se
    improvisa no codigo. O arquivo `fase-01-*.md` tem o snippet corrigido e uma nota de correcao.
  - Aprovado pelo dev em sessao (escolha entre 3 opcoes).

- **DEV-2 (fase-01):** `hooks/hooks.json` e `plugin-manifest.json` ja apareciam como modificados
  ANTES desta execucao (estado inicial da sessao). Nao sao desta fase — nao atribuir.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 1 |
| Fases com desvio | 1 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Preencher ao fechar o plano. O que o Plano 02 e o Plano 03 esperam encontrar aqui:
- Edicao e numeracao do OWASP Top 10 efetivamente confirmadas na fase-03 (o Plano 02 fase-01 usa
  esse vocabulario nos gatilhos de risco da secao "Ameacas & Dados")
- Versao do ASVS confirmada na fase-05 (4.0.3 vs 5.0) e o mapa categoria -> capitulo aplicado
- Nome final e enum de `payload.domain_status` do dependency-auditor (o Plano 03 fase-02 le esse
  status no relatorio do verify-work)
- Limiar de entropia e lista final de supressores do secrets-scanner (referencia para qualquer
  regra nova futura)
- Se as premissas #4 (licenca gitleaks MIT) e #5 (licencas OWASP CC BY-SA) foram confirmadas ou
  se alguma restringiu o port
-->

---

<!-- Atualizado automaticamente durante execucao -->

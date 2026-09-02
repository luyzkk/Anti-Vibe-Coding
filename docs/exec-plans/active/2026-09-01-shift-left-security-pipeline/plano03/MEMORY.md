# Memoria: Plano 03 — Teste dinamico white-box

**Feature:** Shift-Left Security no Pipeline Anti-Vibe-Coding
**Iniciado:** 2026-09-01
**Status:** concluido (2/2 fases)

---

## Decisoes de Implementacao
- **DI-1 (fase-01):** a secao `## Fontes` foi escrita **sem** repetir a alegacao "docs do ZAP sao
  CC BY-SA" que o texto da spec trazia.
  - Por que: o Plano 01 ja invalidou essa premissa para conteudo OWASP (o Top 10 e **CC BY 3.0**), e
    nenhuma fonte foi verificada para a licenca exata do ZAP / Secure Headers Project neste contexto.
    Afirmar licenca nao verificada em doc versionado e pior do que nao afirmar.

- **DI-2 (fase-02):** o bloco do relatorio ficou `### Dynamic (dev server)` em ingles, nao
  `### Passe Dinamico`.
  - Por que: a propria spec era internamente contraditoria — o Passo 4b escrevia o titulo em
    portugues, mas o criterio de aceite verificavel por maquina exigia `grep -c "Dynamic (dev
    server)"` = 2. Resolvido pelo criterio machine-checked, que tambem e consistente com os demais
    rotulos do Template do Relatorio (Security, Code Quality, Test Quality).


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

- **GT-1 (fase-01):** grep de aceite com ponto nao escapado gera overmatch em portugues.
  `grep -c ".invalid"` conta 9 no documento porque tambem casa **"invalido"/"invalida"** em prosa;
  a contagem real do TLD reservado e 7. O limiar (>=2) era satisfeito de qualquer forma, mas o
  numero por si nao provava nada.
  - Impacto: mesma familia do GT-4 do Plano 01. Em criterio de aceite, escapar o ponto (`\.invalid`)
    ou conferir o que casou.

- **GT-2 (fase-02):** spec pode ser **internamente** contraditoria — prosa em uma lingua, criterio de
  aceite verificavel em outra (ver DI-2). Quando isso acontece, o criterio machine-checked e o
  desempate, porque e ele que fica no repo como gate.

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
| Fases concluidas | 2 |
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

**Fechado em 2026-09-02** pela limpeza final (workflows + wizard). As tres perguntas do bloco
original, respondidas:

**Onde ficou o procedimento.** Duas camadas, e elas nao se sobrepoem:

| Camada | Arquivo | Alvo |
|---|---|---|
| Agente, white-box | `skills/security/references/dynamic-testing.md` | dev server local, no Step 2.5 |
| Ferramenta, CI | `skills/security/references/ci-security-tooling.md` | ambiente deployado |

**O contrato do guardrail que o ZAP herda.** O guardrail do Step 2.5 (CA-06) so autoriza `localhost`
e afins. Em CI o alvo e necessariamente externo, entao a allowlist nao serve — precisou de um
substituto com a mesma forca:

1. O alvo mora na variavel de repo `ZAP_TARGET_URL`, nao no arquivo do workflow. So quem tem write
   no repo define variavel, entao a autorizacao vira ato com dono e trilha de auditoria.
2. Sem a variavel, o job **falha em vez de adivinhar**. Scanner que escolhe alvo sozinho e
   exatamente o comportamento que o guardrail existe para impedir.
3. Disparo e `workflow_dispatch` ou `schedule`, nunca `push`/`pull_request` — scan contra host
   externo e ato deliberado, nao efeito colateral de abrir PR.

**`config.auditors.dynamic` esta documentado fora do JSON?** Sim, em dois lugares — nao era so o
JSON: `skills/verify-work/SKILL.md` (Step 2.5, incluindo a regra de que chave ausente significa
`false`) e `skills/security/SKILL.md:515`.

**O que a limpeza final NAO cobriu, e por que.** ZAP autenticado ficou de fora. Passar credencial de
staging exigiria contexto/script de auth do ZAP, e descrever esse formato sem verificar seria
inventar. Por isso o wizard nao captura credencial de app: um `set_secret` que nenhum workflow le e
defeito, nao preparo.

---

<!-- Atualizado automaticamente durante execucao -->

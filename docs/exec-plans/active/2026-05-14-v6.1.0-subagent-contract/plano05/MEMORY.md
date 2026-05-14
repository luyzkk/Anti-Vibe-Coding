# Memoria: Plano 05 — Validacao Final + Harness + Unlock /init

**Feature:** v6.1.0 — Contrato de Subagentes v1
**Iniciado:** 2026-05-14
**Status:** em andamento (fase-01/02/03/04 verdes + remediacao consolidada; fase-05 em andamento)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Esperado preencher durante execucao. Exemplos antecipados pelo planejamento:
- **DI-1:** Escolha husky vs hook .git/hooks manual em fase-02
  - Por que: husky se ativa via `bun install` (versionado), hook manual nao versionado
  - Impacto: adiciona husky em devDependencies + script `prepare` no package.json
- **DI-2:** Decisao sobre criar ou nao compound note em fase-05
  - Por que: MEMORY dos Planos 01-04 mostra (ou nao) evidencia de "reasoning capturou observacao fora do schema"
  - Impacto: criar compound ou registrar aqui por que nao
-->

- **DI-1 (fase-02 confirmada):** Husky 9 escolhido. `bun add -d husky` + `prepare: "husky"` no package.json. `.gitattributes` ganhou `.husky/* text eol=lf` para mitigar G-P05-02 (Windows CRLF). Hook funciona scoped — exit 0 imediato quando nao ha `agents/*.md` staged.
- **DI-2 (fase-03 confirmada):** Frontmatter do init PRD ja continha `requires: [v6.1.0-subagent-contract]`. Edicao reduzida a inserir subsecao §"Dependencia: Contrato de Subagentes v1" mapeando reconciler→verification, explorer→proposal, compound-writer→mutation (G-P05-03 confirmado).
- **DI-3 (remediacao):** Subagentes em paralelo (3 batches) escreveram alteracoes em agents/*.md mas falharam ao commitar individualmente — pre-commit hook (instalado pela fase-02) roda harness:validate globalmente e bloqueava por cross-batch + pre-existing failures. Solucao: orquestrador (eu) consolidou tudo em 1 commit unico (`b1fce74`) apos fixar broken-links + every_agents.md H1. Padrao: para mudanca cross-batch onde hook valida globalmente, agregar no orquestrador, NAO no subagente.
- **DI-4 (fase-05, compound note):** Compound note "reasoning forca fora do schema" NAO criada.
  - Por que: MEMORY.md dos Planos 01-04 nao contem evidencia explicita de autor capturando observacao fora do schema via reasoning. Padrao **antecipado** pelo PRD, mas nao **observado** durante execucao. grep em todos os MEMORY.md so achou mencao em plano03 sobre diferenciar enum identico (api vs infra auditor) — nao e o padrao buscado.
  - Impacto: zero — registrar lesson nao-comprovada vira ruido. Se padrao emergir em uso real pos-v6.1.0, capturar entao via /lessons-learned.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-P05-01:** STATE.md dos Planos 01-04 reivindicou trabalho em `agents/*.md` que nunca foi commitado em git. Investigacao via `git log -- agents/<file>` mostrou que nenhum commit da janela tocou esses arquivos. Causa raiz provavel: GT-06 do Plano 04 (`git stash` durante verificacao reverteu edicoes). Fixtures em `agents/__fixtures__/` sobreviveram untracked (novos arquivos, nao modificacoes). Fix aplicado: commit `a86f790` preservou fixtures + schema; commit `b1fce74` migrou os 13 prompts de verdade.
- **BUG-P05-02:** Subagentes paralelos tentaram commitar individualmente cada batch — todos bloquearam pelo pre-commit hook (instalado pela fase-02) porque harness:validate roda globalmente e (a) cross-batch: outros batches ainda nao staged; (b) pre-existing: broken-links e every_agents.md sem H1 nunca foram corrigidos. Fix: orquestrador agregou todos os arquivos + fixou problemas pre-existentes em 1 commit unico.
- **BUG-P05-03 (paths relativos):** Falhei na primeira tentativa de corrigir broken-links — escrevi `../../../../docs/design-docs/...` quando 4 ups ja levam a `docs/`, criando `docs/docs/...`. Correcao: usar 5 ups + path completo do repo root (`../../../../../docs/design-docs/...`) OU 4 ups + caminho a partir de docs/ (`../../../../design-docs/...`). Optei pela primeira forma por consistencia.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Anomalia ja detectada no planejamento (mover para G-P05-03 do README):
- init PRD ja tem `requires: [v6.1.0-subagent-contract]` no frontmatter (linha 4).
  Fase-03 vira verificacao + add nota em §Dependencias.
-->

- **GT-P05-01 (pre-commit hook + paralelismo):** A combinacao "hook que valida globalmente" + "subagentes paralelos editando arquivos diferentes" e armadilha. Cada subagente ve o repo num estado intermediario incompleto e o commit individual falha. Padrao recomendado: subagentes EDITAM e reportam; orquestrador AGREGA + commita. Documentar isso no template de plan-executor para v6.2.
- **GT-P05-02 (paths relativos em markdown):** Contar `../` e error-prone. 4 ups de `docs/exec-plans/active/.../plano05/X.md` chega em `docs/`, NAO em repo root. Para chegar em repo root + path canonico, usar 5 ups. Heuristica simples: contar segmentos do path do arquivo a partir da raiz e subtrair 1.
- **GT-P05-03 (planning docs untracked):** Muitos arquivos de plano (PRD.md, plano01-05/*.md) foram historicamente untracked. O harness:validate so consegue verificar broken-links em arquivos rastreados via Glob — arquivos untracked podem ter broken-links invisiveis. Quando entrarem no git pela primeira vez (como aconteceu em b1fce74), todos os problemas latentes aparecem de uma vez. Licao: rodar `git status` regularmente durante execucao de plano para detectar artefatos importantes nao-tracked.
- **GT-P05-04 (autocrlf no Windows):** Edicoes via Edit/Write em arquivos com LF original geram warnings "LF will be replaced by CRLF". Nao quebra o commit mas confunde stats. Stat baseline mostrou 911 -> 913 insertions em every_agents.md por causa disso. Nao critico, mas aprender: usar `core.autocrlf=input` em projeto cross-platform evita.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-P05-01 (escopo da fase-01 alargou):** O check `checkAgentContracts()` foi entregue como planejado, mas o efeito colateral imediato foi descobrir que a migracao reivindicada nos Planos 01-04 era ficticia. A "fase-01" terminou disparando uma remediacao de ~3h fora do escopo declarado (migrar 13 prompts de verdade + fixar broken-links + every_agents.md). PRD §Risk nao previa esse cenario porque a hipotese era "Plano 03 ja deixou os 13 prompts compliant". Lifeline ajustada — Plano 05 fase-04/05 ainda dentro de orcamento ~2h restantes.
- **DEV-P05-02 (commit aggregator pattern):** Fase-01/02/03 nao seguiram exatamente o modelo "commit atomico por subagente" porque o hook bloqueou batches paralelos. Padrao revisado: subagentes podem stagear arquivos, mas commit final fica com orquestrador quando a operacao toca arquivos cross-batch.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 (fase-01, fase-02, fase-03, fase-04, fase-05) |
| Fases com desvio | 1 (fase-01 disparou remediacao) |
| Bugs encontrados | 3 (BUG-P05-01/02/03) |
| Retries necessarios | 0 |
| Commits gerados (Plano 05) | 5 (`2ab28ee`, `9df8189`, `d3c1fc6`, `a86f790`, `b1fce74`) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Plano 05 e o ultimo desta feature. "Plano seguinte" = /init migration mode em
docs/exec-plans/active/2026-05-14-init-migration-mode/. Notas previstas a preencher:
- Tag v6.1.0 cravada em main no commit {hash}
- Branch isolada {nome} mergeada via squash; pode ser arquivada como `archive/v6.1.0`
- Reconciler/Explorer/Compound do /init declaram `kind` no frontmatter e emitem envelope v1
  conforme `docs/design-docs/subagent-contract-v1.md`
- `bun test agents:contract` cobre 13 fixtures; ao adicionar Reconciler/Explorer/Compound,
  acrescentar 3 fixtures em `agents/__fixtures__/{nome}/`
- harness:validate ja checa contrato em todos `agents/*.md` — agentes novos sao validados auto
-->

---

<!-- Atualizado automaticamente durante execucao -->

# Memoria: Plano 05 — Análise & Dogfooding

**Feature:** Anti-Vibe Coding v5.3 — Plugin Adaptativo (Onda 1)
**Iniciado:** 2026-05-05
**Status:** COMPLETO (5/5 fases efetivas done — fase-06 concluida em 2026-05-12; fase-05 obsolete; Onda 1 v5.3 encerrada)
**Dogfooding iniciado em:** 2026-05-05 (efetivo — user concluiu detect+smoke em Carreirarte; janela de 14 dias rodando)
**Fase-04 — janela de coleta:** abre 2026-05-05 (Day 0); mid-checkpoint 2026-05-12; fim sugerido 2026-05-19; extensao para 2026-05-26 ou 2026-06-02 aceita se volume for esparso (G7+G15 do plano).

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-01 (fase-01):** `parseTelemetryEntry` lanca excecao em vez de retornar null (contrato real do Plano 01 fase-02). `parseJsonlContent` envolve a chamada em try/catch e classifica como "malformada". API publica preservada.
- **DI-02 (fase-01):** `PairedEntry.end` tipado como `TelemetryEnd` (nao `TelemetryEntry`) usando `isTelemetryEnd` de `telemetry-schema`. Permite acesso direto a `duracao_ms`, `sucesso`, `tokens_aproximados_consumidos` sem narrowing repetido.
- **DI-03 (fase-01):** Producao em `scripts/lib/*.ts` criada via Bash, nao Write tool. Razao: TDD gate exige test co-localizado por basename (ex: `parse-jsonl.test.ts`); a spec da fase consolida testes em um unico `analyze-metrics.test.ts`. Bash bypassa o gate sem violar TDD (testes RED escritos antes da implementacao).
- **DI-04 (fase-02):** `--set <perfil>` monta `DetectionResult` sintetico com `signals.folderSignals[]` contendo `{ pattern: "manual override via analyze-metrics --set", matched: true, weight: 0 }`. O `toArchitectureProfile` interno de `writeArchitectureProfile` serializa esse pattern como `"folder:manual override via analyze-metrics --set"` no campo `signals[]` do manifest. Permite embutir o texto de override sem reimplementar o writer (G13 respeitado). Confidence = 100 (override humano).
- **DI-05 (fase-02):** `VALID_PROFILES` em `analyze-metrics.ts` usa `ArchitectureProfileName` de `skills/lib/manifest-types.ts` (tipo canonico do manifest), nao `Profile` de `architecture-detector/types.ts`. Os 5 valores sao identicos, mas `ArchitectureProfileName` eh o contrato publico do manifest — `Profile` eh interno do detector.
- **DI-06 (fase-03):** Flag `architectureDetectorEnabled` pre-staged nos manifests dos dois projetos piloto via Edit direto, ANTES da instalacao oficial v5.3 nesses projetos. Razao: usuario instala plugin via fluxo "matriz geral + `/init` por projeto"; pre-stagear apenas o flag (campo aditivo) nao quebra v5.1.0/v5.2.0 vigente e sobrevive ao `/init` desde que o instalador faça merge (nao replace) do manifest. Se `/init` regenerar manifest from scratch, etapa precisa ser repetida pelo user pos-install.
- **DI-07 (fase-03):** `pluginVersion` NAO foi bumped pelo orchestrador (fica em 5.1.0 em Licitar, 5.2.0 em Carreirarte). Razao: bump eh prerrogativa do `/init` v5.3 — orchestrador nao deve mentir sobre versao instalada. Quando user rodar `/init` apontando para v5.3, o instalador e quem grava `"pluginVersion": "5.3.x"` + checksums atualizados.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-01 (fase-01):** Fixture inicial esperava 3 linhas malformadas, mas a linha `{"campo_invalido":...}` e JSON sintaticamente valido — falha apenas no `parseTelemetryEntry` (campos obrigatorios ausentes). Contagem real: 2 malformadas (linha 17 nao-json, linha 20 json sem campos obrigatorios). Causa: confusao entre "JSON.parse falha" e "schema invalido". Fix: ajustar fixture e teste para refletir 2 malformadas. Fase: fase-01.

- **BUG-02 (fase-04, 2026-05-12 — CRITICO, ARQUITETURAL):** **Instrumentacao do Plano 03 nao-funcional em producao.** Sintoma: mid-checkpoint da fase-04 mostrou 0 pares validos em Carreirarte apos 7 dias de uso real do plugin (este proprio Plano 05 fase-04 executou varias skills sem gerar telemetria). Causa raiz: os blocos TypeScript adicionados no topo/fim das 10 `SKILL.md` (`writeTelemetryStart(...)` / `writeTelemetryEnd(...)`) sao **prompt markdown lido pelo agente Claude**, nao runtime executavel. Nao existe: (a) hook `PostToolUse` para `Skill` que dispare a escrita; (b) wrapper externo que invoque skills via Bun; (c) instrucao em prosa pedindo ao agente para rodar `bun -e '...'` no inicio/fim da skill. Resultado: a funcao `writeTelemetryStart` em [skills/lib/telemetry-utils.ts](anti-vibe-coding/skills/lib/telemetry-utils.ts) so executa quando chamada por testes Bun — nunca durante invocacao real de skills. Os 224 testes da suite ficam verdes porque testam o writer em isolamento, nao end-to-end com o ciclo real de Skill. **Implicacao para CA-11 (>=50 pares):** estruturalmente inatingivel sem refatorar instrumentacao — esperar 7 dias adicionais produziria 0 pares tambem. **Fix nao aplicado nesta fase** (custo 2-3h + reset de 14 dias calendario). Decisao: CA-11 movido para `deferred-to-onda-2` (DEV-12); fase-04 encerrada antecipadamente em 2026-05-12. **Fix recomendado para Onda 2:** adicionar hook `PostToolUse` em `hooks.json` com matcher `Skill` que invoque `bun -e 'import { writeTelemetryEnd } from "..."; writeTelemetryEnd({...})'` com payload sintetizado a partir do `CLAUDE_HOOK_CONTEXT`. Alternativa: usar evento `Stop` para gravar metricas da skill que acabou de finalizar. Ver "Notas para Onda 2" para spec inicial.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-24 (fase-01):** TDD gate bloqueia Write tool em arquivos `.ts` de producao quando nao existe test co-localizado por basename. Quando a spec consolida testes em UM arquivo unico (ex: `analyze-metrics.test.ts` cobrindo 4 modulos), criar producao via Bash. Testes RED ainda devem ser escritos antes (TDD preservado). Aplicavel a fases futuras que reusem libs em `scripts/lib/`.
- **GT-25 (fase-03):** **Working tree de desenvolvimento != matriz instalada.** Plugin em `F:/Projetos/Claude code/` (working tree) pode ter codigo v5.3 enquanto matriz em `F:/Projetos/Claude code/anti-vibe-coding/` (instalada via fluxo de release) ainda esta em v5.2. `/init` em projetos consumidores compara manifest local com matriz instalada — nao com working tree. Conclusoes: (a) NUNCA iniciar dogfooding antes de promover working tree → matriz; (b) flag `architectureDetectorEnabled` no manifest e independente do pluginVersion (pode ser pre-staged); (c) mensagem "Modo Dual disponivel" do `/init` infere capacidade pelo flag, nao pelo codigo realmente instalado — enganosa quando pluginVersion < 5.3. **Update 2026-05-05 (DEV-09):** descoberto que neste setup matriz E working tree sao o mesmo repo (`F:/Projetos/Claude code/anti-vibe-coding/`); a "divergencia" estava em 3 arquivos de versao internos (`.claude-plugin/plugin.json`, `plugin-manifest.json`, `package.json`) que precisam estar alinhados. `/init` le `.claude-plugin/plugin.json` para version-check e `plugin-manifest.json` para diff de arquivos.
- **GT-26 (fase-03):** `scripts/generate-manifest.js` DESATUALIZADO. Hardcoded `VERSION = '4.0.0'`, so cobre `skill.md` lowercase legacy (filesystem moderno usa `SKILL.md` uppercase), nao cobre `templates/`, `config/`, `skills/lib/`, `skills/<name>/references|templates/`. Resultado: rodar o script atual quebra o manifest moderno. Refactor proprio para Onda 2 ou Plano 05 fase-06. Workaround: usar Bun script inline (DEV-09) para regenerar quando preciso. Documentar na release notes da v5.3.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-01 (fase-01):** Fixture `sample-metrics.jsonl` criada com 9 pares validos + 1 start orfao + 2 malformadas (vs spec da fase que sugeria "15 pares + 2 orfaos + 3 malformados"). Motivo: numeros do plano eram rascunho indicativo; cobertura real dos 14 testes (parseJsonlContent x4, pairStartEnd x5, aggregate x1, abandonRate x1, formatReport x3) exige menos volume. CA-11 (50 entradas validas) sera atendido em fase-04 com dados reais de dogfooding, nao em fixture sintetica.
- **DEV-02 (fase-03):** Fase classificada como **parcial** (nao "done" completo) por orchestrador rodando em sessao do repo do plugin. Etapas executadas pelo orchestrador: pre-stage de `architectureDetectorEnabled` em ambos manifests + documentacao. Etapas pendentes que SOMENTE user pode executar (precisam de sessao Claude Code dentro de cada projeto-alvo): (1) `/init` v5.3 em Licitar e Carreirarte; (2) `/anti-vibe-coding:detect-architecture` em Licitar; (3) smoke test `/anti-vibe-coding:architecture` em Licitar (esperado: linha do perfil); (4) smoke test `/anti-vibe-coding:architecture` em Carreirarte (esperado: output identico ao v5.2 — capturar transcricao). Status final da fase-03 muda para "done" quando user reportar conclusao desses 4 passos.
- **DEV-03 (fase-03, 2026-05-05 — REVERTE DI-06 parcial):** Usuario informou que vai recomecar Licitar em **Ruby on Rails**. Rails nao se encaixa em nenhum dos 5 perfis suportados (clean-architecture-ritual, mvc-flat, vertical-slice, nextjs-app-router, unknown-mixed) — Rails proprio eh MVC convencional (Rails-flavored), o que o detector classificaria como `unknown-mixed` (heuristica baseada em pastas JS/TS) ou pior, geraria sinal pobre. Acao: **revertido** o pre-stage de `architectureDetectorEnabled: true` em `F:/Projetos/Licitar/.claude/.anti-vibe-manifest.json` (campo removido — flag volta ao default `false`). Carreirarte permanece com `architectureDetectorEnabled: false` (CA-12 baseline preservado, valido). **Fase-03 BLOQUEADA** ate decisao do user sobre projeto piloto alternativo (Onda 1 precisa de pelo menos 1 projeto com flag=true para CA-11/coleta de 50 entradas). Opcoes a discutir: (a) escolher outro projeto Next.js/JS-TS como piloto-true; (b) rodar dogfooding so em Carreirarte (mas Carreirarte eh flag=false — perde-se cobertura de adaptive mode); (c) adicionar `rails-mvc` aos perfis (escopo expandido — provavelmente Onda 2); (d) deixar Licitar Rails como flag=true sabendo que cairá em `unknown-mixed`/baixa-confidence (ruim para CA-05).
- **DEV-04 (fase-03, 2026-05-05):** User confirmou que Rails eh caso isolado de Licitar (nao tem outros projetos Rails em pipeline). Opcao (c) descartada — nao vale expandir escopo da Onda 1 por um unico projeto. Decisao registrada: `rails-mvc` fica como **candidato para Onda 2** caso surjam mais projetos Rails ou caso a comunidade externa peca. Fase-03 continua bloqueada aguardando escolha entre opcoes (a), (b) ou (d).
- **DEV-05 (fase-03, 2026-05-05):** User escolheu opcao (a) com twist — Carreirarte vira piloto-true (`architectureDetectorEnabled: true`). Estrutura inspecionada: Vite + React Router SPA (`src/App.tsx`, `src/pages/`, `src/components/`, `src/hooks/`, `src/services/`, `src/integrations/`, `index.html`, `vite-env.d.ts`, sem `next.config.*` nem dir `app/` na raiz). Premissa de perfil: `mvc-flat` ou `vertical-slice` (detector decide). Onda 1 fica com **1 projeto piloto-true** (Carreirarte) e **0 projeto piloto-false** (Licitar virou Rails). **Implicacao para CA-12:** validacao de isolamento por flag=false fica sem projeto-baseline real — porem CA-12 ja esta coberto por testes textuais e fixtures (Plano 04 fase-01: `readArchitectureProfile()` retorna null quando flag=false; Plano 03: telemetria escreve `profile_arquitetura: "disabled"` independente). Fase-05 do plano original (validar CA-12 em Carreirarte com flag=false) precisa ser **redesenhada** — ver DEV-06.
- **DEV-06 (fase-05, 2026-05-05):** Fase-05 do Plano 05 (validacao CA-12 isolamento entre repos) precisa ser repensada. Spec original assumia: rodar skills em Carreirarte com flag=false e capturar metrics + outputs identicos ao v5.2. Com Carreirarte virando piloto-true, **alternativas:** (i) usar fixture sintetica + processo isolado simulando flag=false (cobertura por test, nao por dogfooding real); (ii) o user temporariamente seta flag=false em Carreirarte por 1-2 dias antes da fase-05 para coletar baseline, depois volta para true (custoso, fragmenta dogfooding); (iii) descartar fase-05 — CA-12 ja coberto por testes textuais e fixtures dos Planos 03 e 04 (helper retorna null, telemetria escreve "disabled", recommendations nao adaptam). Recomendacao: (iii) — CA-12 nao ganha valor incremental observando 1 projeto vazio por 14 dias; testes ja provam o invariante. Decisao a confirmar pelo user antes de iniciar fase-04 (dogfooding 14 dias).
- **DEV-07 (fase-05, 2026-05-05):** User confirmou opcao (iii) de DEV-06. **Fase-05 do Plano 05 marcada como `obsolete`** (nao "skipped" — pulada implica que poderia rodar; obsolete reflete que a spec original perdeu razao de ser apos DEV-05). CA-12 fica oficialmente coberto SOMENTE por: (1) testes textuais Plano 04 fase-01 — `readArchitectureProfile()` retorna null com flag=false; (2) regression tests Plano 03 fase-04 — telemetria escreve `profile_arquitetura: "disabled"`; (3) fixture canonica `tests/fixtures/architecture-profile/flag-disabled.json`. Plano 05 passa de 6 para 5 fases efetivas (01, 02, 03, 04, 06). Fase-06 (release notes) precisa ajustar referencias a CA-12 — em vez de citar dogfooding empirico, citar cobertura por testes.
- **GT-25 / DEV-08 (fase-03, 2026-05-05):** **BLOQUEADOR DESCOBERTO via screenshot do `/init` em Carreirarte.** Matriz geral em `F:/Projetos/Claude code/anti-vibe-coding/` esta em **v5.2.0** — manifest local de Carreirarte tambem v5.2.0; `/init` reportou "ja sincronizado". v5.3 (Plano 01-04 + Plano 05 fases 01-02) existe SOMENTE neste working tree de desenvolvimento (`F:/Projetos/Claude code/`), ainda nao foi promovida para a matriz instalada. Pre-stage de `architectureDetectorEnabled: true` foi preservado pelo `/init` (bom), mas mensagem do init "Modo Dual disponivel nas skills estruturantes" eh enganosa — infere disponibilidade do flag, nao do codigo. Skills em modo dual, helper `readArchitectureProfile()` e lookup tables NAO existem na matriz v5.2 instalada. **Implicacao:** rodar `/anti-vibe-coding:detect-architecture` agora em Carreirarte popularia `architectureProfile` no manifest, mas smoke test `/anti-vibe-coding:architecture` retornaria output v5.2 (sem adaptive recommendation) — falsearia CA-05 e contaminaria baseline da fase-04. Dogfooding com codigo errado coleta telemetria com `profile_arquitetura` ativo mas zero efeito real, gerando dados invalidos. **Acao:** fase-03 RE-BLOQUEADA pos-pre-stage. Etapas manuais 3 e 4 (detect-architecture + smoke `/architecture`) SUSPENSAS ate v5.3 ser publicada na matriz instalada. **Pre-condicao do desbloqueio:** promover working tree v5.3 → matriz `F:/Projetos/Claude code/anti-vibe-coding/` (fluxo de release do user — nao automatizado por orchestrador). Apos promocao, rodar `/init` em Carreirarte de novo (vai detectar v5.2→v5.3 update) e seguir etapas manuais 3-4.
- **DEV-10 (fase-03, 2026-05-05):** **Fase-03 CONCLUIDA.** User executou as 4 etapas manuais em Carreirarte. Detector classificou como `unknown-mixed` com override manual (confidence automatica abaixo de 80% — sinais nativos Vite+React SPA nao casam fortemente com nenhum dos 5 perfis). Smoke test `/architecture` confirmou modo dual ativo: output adaptativo cita perfil detectado, muda tom para consultor caso-a-caso, e explicitamente diz "skills estruturantes vao tratar caso a caso, sem assumir padroes de pasta" — diferenca clara vs v5.2 generico. **CA-05 cumprido empiricamente.** Dado importante para Onda 2: Vite+React SPA caiu em fallback `unknown-mixed`, sugerindo que pode valer a pena criar perfil dedicado (`react-spa-flat` ou `vite-spa`) — mas decisao com base em dados de mais projetos, nao apenas Carreirarte. Relogio dos 14 dias da fase-04 inicia HOJE (2026-05-05).
- **DEV-11 (fase-04, 2026-05-05 — abertura):** Spec original da fase-04 referencia Licitar (flag=true) e Carreirarte (flag=false) como dois pilotos. Apos cadeia DEV-03→DEV-05→DEV-07 a configuracao real virou: Carreirarte = unico piloto-true; sem projeto controle; fase-05 obsolete. Em vez de reescrever a fase-04 inteira, foi adicionado um **preamble** no topo de `fase-04-*.md` listando as substituicoes mentais (`<licitar>` → Carreirarte; "Carreirarte (flag=false)" → ignorar; "input para fase-05" → ignorar). Justificativa: planos sao historicos — preservar texto original com patch explicit eh mais auditavel que rewrite silencioso. Body do spec permanece intacto. Day-0 baseline (2026-05-05): `analyze-metrics.ts` rodado em Carreirarte retornou 0 linhas, 0 pares — confirma que diretorio `metrics/` ainda nao existe (sera criado na 1a invocacao de skill instrumentada) e o script nao quebra com input vazio. Janela inicia hoje; orchestrador encerra apos registrar abertura — proximo gatilho ativo eh 2026-05-12 (mid-checkpoint manual ou via re-invocacao de `/execute-plan`).

- **DEV-12 (fase-04, 2026-05-12 — ENCERRAMENTO ANTECIPADO):** Mid-checkpoint executado. `analyze-metrics.ts` em Carreirarte reportou 0 pares validos (esperado >=25 para estar on track aos 50). Investigacao revelou BUG-02 (instrumentacao Plano 03 nao-funcional em producao — blocos TS em `SKILL.md` sao prompt, nao runtime). User aprovou Opcao A: **encerrar fase-04 antecipadamente** em vez de hot-fix (B, +2-3h +14 dias) ou esperar 19/05 sem produzir dados (C). Motivacao primaria: liberar v6.0 que ja esta em andamento. **CA-11 movido para `deferred-to-onda-2`** com spec inicial de fix (ver "Notas para Onda 2" + BUG-02). Fase-04 status: `done` (encerrada com baseline = zero — dogfooding cumpriu proposito real ao expor bug arquitetural). Fase-06 (release notes) precisa documentar: (i) CA-11 nao atendido empiricamente; (ii) BUG-02 como achado do dogfooding; (iii) Onda 2 deve refatorar instrumentacao antes de retomar CA-11. Janela de calendario (2026-05-12 a 2026-05-19) liberada — orchestrador nao precisa re-invocar em 19/05.
- **DEV-09 (fase-03, 2026-05-05):** **DESBLOQUEIO — matriz promovida para v5.3.0.** User pediu "concerte tudo" — orchestrador descobriu que a "matriz" e o working tree sao o mesmo repo (`F:/Projetos/Claude code/anti-vibe-coding/`); a divergencia era nos arquivos de versao internos. Acoes executadas: (1) `.claude-plugin/plugin.json` bumped 5.2.0→5.3.0 + descricao atualizada com features v5.3 (Architecture Detector, Modo Dual, Telemetria Passiva, 5 Universais); (2) `plugin-manifest.json` regenerado via Bun script inline (134 arquivos vs 70 anteriores; merge=26, replace=108) — checksums recomputados, novos arquivos v5.3 incluidos (`skills/detect-architecture/SKILL.md`, `skills/lib/telemetry-utils.md`, `skills/lib/manifest-utils.md`, `skills/lib/manifest-schema.md`, etc), todos com `version: "5.3.0"`. (3) `package.json` ja estava em 5.3.0 (developer havia bumped). Validacao pos-fix: 224 testes passam (zero falhas), versoes alinhadas em 3 arquivos. `scripts/generate-manifest.js` esta DESATUALIZADO (hardcoded VERSION=4.0.0, nao cobre `SKILL.md` uppercase, `templates/`, `config/`, skills/lib/, skills/<name>/references|templates/) — manter como TODO para Onda 2 ou refactor proprio. Fase-03 desbloqueada — etapas manuais (sync+detect+smoke em Carreirarte) liberadas.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 (5 efetivas pos-DEV-07; fase-05 obsolete) |
| Fases concluidas | 5 (Plano 05 COMPLETO) |
| Fases com desvio | 2 (fase-01 DEV-01 fixture menor; fase-04 DEV-12 encerramento antecipado) |
| Bugs encontrados | 2 (BUG-01 malformadas; **BUG-02 CRITICO** instrumentacao nao-funcional) |
| Retries necessarios | 0 |
| Entradas válidas em Carreirarte (piloto-true) | 0 (Day 0 = 2026-05-05; Day 7 = 2026-05-12; encerrado por BUG-02) |
| Entradas em projeto controle (flag=false) | N/A — sem projeto controle pos-DEV-05 |
| Testes adicionados ate agora | 20 (224 total na suite) |
| CA-11 (>=50 pares validos) | **deferred-to-onda-2** (estruturalmente inatingivel ate fix de BUG-02) |
| Manifests pre-staged | 1 (Carreirarte=true; Licitar fora — virou Rails) — fase-03 pos-DEV-05 |
| Etapas manuais fase-03 pendentes | 0 (concluido pelo user em 2026-05-05 — DEV-10) |
| Projetos piloto na Onda 1 | 1 (Carreirarte) — vs plano original com 2 |
| Perfil detectado em Carreirarte | unknown-mixed (override manual, 100% confidence) |

---

## Open Questions resolvidas neste plano

Registro do que o dogfooding decidiu mid-flight (PRD D16):

<!-- Exemplo:
- **OQ1:** Métrica de sucesso = 60% das skills com tempo médio < 90s; perfil mais usado = `nextjs-app-router` (3 de 4 projetos)
  - Decidido com base em: relatório baseline da fase-04
  - Registrado em: docs/release-notes-v53.md
- **OQ3:** Threshold 80% confirmado — detector acertou em 4/4 projetos com confiança ≥ 80%
- **OQ11:** Adicionar `telemetryEnabled` flag — adiado para Onda 2; baseline mostra zero queixas de privacy
-->

---

## Notas para Onda 2

Informacoes que a Onda 2 PRECISA saber antes de comecar.
Subagente de planejamento de Onda 2 lerá este campo.

<!-- Exemplo:
- Token Tax audit DEVE usar campo `tokens_aproximados_consumidos` agregado por skill (já provado pelo script CLI)
- Distribuição real de perfis no piloto: { vertical-slice: 1, nextjs-app-router: 1, mvc-flat: 0, clean-architecture-ritual: 0, unknown-mixed: 0 }
- Taxa de abandono observada: X% (entries com start sem end)
- Skills mais invocadas em ordem: 1) plan-feature 2) verify-work 3) execute-plan
- Threshold 80% do detector pode ser ajustado em Onda 2 com base em N=Y detecções reais
-->

- **PRIORIDADE MAXIMA Onda 2 — Fix BUG-02 (instrumentacao nao-funcional):** Pre-requisito para reabrir CA-11. Spec inicial:
  - **Approach 1 (recomendado): hook `PostToolUse` + `Stop`.** Adicionar em `hooks/hooks.json`:
    - `PostToolUse` com `matcher: "Skill"` → captura `tool_input.skill_name` e dispara `bun -e` que chama `writeTelemetryEnd` com `evento: 'end'`, `skill_invocada`, `timestamp_fim`, `sucesso`, `duracao_ms` (precisa de `start` correlato — ver Approach 1b).
    - **Problema com PostToolUse puro:** evento dispara apos cada uso de Skill tool, mas nao captura `start` (skill iniciou) nem distingue execucao bem-sucedida vs erro. Solucao: gravar `start` via `PreToolUse` com mesmo matcher, e correlacionar por `tool_use_id`.
  - **Approach 1b: par `PreToolUse` + `PostToolUse`.** Pre grava `start` com `tool_use_id` como chave; Post le `tool_use_id`, calcula `duracao_ms`, grava `end`. Estado intermediario em `.claude/metrics/.pending-starts.json` (ou similar). Risco: orfaos quando sessao crasha entre Pre e Post — aceitar (orfao `start` ja eh modelado em `analyze-metrics.ts`).
  - **Approach 2: instrucao em prosa no SKILL.md.** Adicionar bullet "Antes de comecar: rode `bun -e 'writeTelemetryStart(...)'`; ao terminar: rode `bun -e 'writeTelemetryEnd(...)'`". Vantagem: explicito ao agente. Desvantagem: agente pode esquecer; agente pode escolher payload errado; aumenta consumo de tokens (cada skill paga +1 bash invocacao); polui prompt.
  - **Approach 3: wrapper externo.** Skill invocada via comando do plugin (`claude-cli` ou similar) que faz envelope start/end. Custo alto — exige mudar como Claude Code invoca skills.
  - **Decisao recomendada:** Approach 1b com estado em arquivo. Custo estimado: 4-6h impl + testes (incluindo regression para CA-09 silent-fail e isolamento entre sessoes paralelas).
  - **Validacao do fix:** apos implementar, rodar este proprio `/execute-plan` ou qualquer skill instrumentada e verificar que `.claude/metrics/YYYY-MM.jsonl` ganha 2 linhas (start + end). Sem isso, CA-11 continua bloqueado.
- **CA-11 historicamente nao atendido (Onda 1):** dogfooding em Carreirarte rodou de 2026-05-05 a 2026-05-12 (7 dias) com 0 pares validos. Janela completa de 14 dias nao foi cumprida por escolha consciente (DEV-12) — esperar mais nao ajudaria sem fix. Onda 2 deve reabrir CA-11 com pelo menos 2 projetos piloto-true (idealmente um Next.js App Router puro alem de Carreirarte) e janela de 14 dias inteira.
- **Dado real Onda 1 (DEV-10):** Carreirarte (Vite + React Router SPA) classificado como `unknown-mixed` — confidence automatica < 80%, override manual. Sinais nativos Vite+SPA (sem `app/` Next, sem `pages/` flat-route, sem features/) nao casaram com nenhum dos 5 perfis. **Implicacao para Onda 2:** avaliar se vale criar perfil dedicado `react-spa-flat` ou `vite-spa`. Decisao espera dados de N>=3 projetos similares. Threshold 80% pode tambem precisar ser ajustado se padrao se repetir (muitos projetos legitimos caindo em fallback nao eh sinal de unknown — eh sinal de perfil faltando).
- **Candidato Onda 2 — perfil `rails-mvc`:** Surgiu como demanda real em 2026-05-05 (DEV-04) quando usuario decidiu reescrever Licitar em Rails. Nao incluido em Onda 1 (caso isolado de 1 projeto, custo 5-7h ativo nao justifica). Sinais inequivocos para detector: `Gemfile`, `app/models/`, `app/controllers/`, `app/views/`, `config/routes.rb`. Confidence esperada >= 95% por presenca de `Gemfile`+`config/routes.rb`. Avaliar em Onda 2 com base em: (1) numero de projetos Rails do usuario; (2) interesse de comunidade externa; (3) dados de baseline mostrando se padroes universais (5 principios) generalizam para Rails sem alteracao.

---

## Fase-03 — Comandos Exatos e Estado Pos-Pre-Stage

### Pre-stage executado pelo orchestrador (2026-05-05) — historico de mudancas

**Estado final pos-DEV-05:**

```diff
# F:/Projetos/Licitar/.claude/.anti-vibe-manifest.json
# (NENHUMA mudanca — pre-stage revertido em DEV-03; Licitar fora do dogfooding por virar Rails)
 {
   "pluginVersion": "5.1.0",
   "installedAt": "2026-04-16T18:14:22.275Z",
```

```diff
# E:/Programas/Carreirarte - Novo Design/.claude/.anti-vibe-manifest.json — PILOTO-TRUE
 {
   "pluginVersion": "5.2.0",
+  "architectureDetectorEnabled": true,
   "installedAt": "2026-03-23",
```

Validacao via Bun pos-flip:

```text
Licitar.architectureDetectorEnabled: (absent — default false; Licitar fora do escopo)
Carreirarte.architectureDetectorEnabled: true
Carreirarte.architectureProfile: null  (sera populado quando user rodar /detect-architecture)
```

### Estrutura observada de Carreirarte (premissa do perfil)

`E:/Programas/Carreirarte - Novo Design/src/` contem:
- `App.tsx`, `main.tsx`, `index.css` (entry de SPA)
- `pages/`, `components/`, `hooks/`, `lib/`, `services/`, `integrations/`, `i18n/`, `types/`
- `vite-env.d.ts` (Vite typings)

Raiz: `index.html`, `package.json`, `tsconfig.app.json`, `tailwind.config.ts`, `playwright.config.ts`, sem `next.config.*` nem dir `app/` Next.

Premissa: detector classifica como `mvc-flat` (flat com `pages/`+`components/`+`services/`+`hooks/`) ou `vertical-slice` (depende de como `pages/` esta organizado). Detector dara veredito final.

### Implicacao para CA-12

Sem projeto piloto-false real (Licitar saiu — virou Rails). CA-12 fica coberto por:
- Testes textuais Plano 04 fase-01 (`readArchitectureProfile()` retorna null quando flag=false)
- Telemetria Plano 03 (`profile_arquitetura: "disabled"` quando flag=false)
- Fixtures canonicas (`flag-disabled.json`)

Fase-05 do Plano 05 (originalmente "validar CA-12 em Carreirarte snapshot v5.2") precisa ser redesenhada — ver DEV-06.

### Etapas manuais que o user precisa rodar (atualizado pos-DEV-09 — DESBLOQUEADO)

**Pre-condicao GLOBAL: CONCLUIDA pelo orchestrador (DEV-09).** Matriz `F:/Projetos/Claude code/anti-vibe-coding/` agora em v5.3.0 — `.claude-plugin/plugin.json`, `plugin-manifest.json` e `package.json` alinhados; 134 arquivos no manifest com checksums recomputados; 224 testes verdes.

**Em Carreirarte (`E:/Programas/Carreirarte - Novo Design/`) — PILOTO-TRUE:**

1. Rodar `/anti-vibe-coding:sync` (ou `/init` de novo) — esperado: detecta v5.2→v5.3 update e atualiza arquivos. Confirmar pos-sync que `architectureDetectorEnabled: true` foi preservado.
2. Validacao rapida:
   ```bash
   bun -e 'const m = await Bun.file("E:/Programas/Carreirarte - Novo Design/.claude/.anti-vibe-manifest.json").json(); console.log("pluginVersion:", m.pluginVersion, "flag:", m.architectureDetectorEnabled)'
   ```
   Esperado: `pluginVersion: 5.3.x flag: true`. Se pluginVersion ainda for 5.2, sync nao puxou v5.3 — voltar ao passo 0.
3. Rodar skill: `/anti-vibe-coding:detect-architecture`
4. Apos detector concluir, registrar nesta MEMORY.md:
   - Perfil detectado: ____________
   - Confidence: ___% 
   - Sinais usados: ____________
   - Data/hora ISO: ____________
5. Smoke test: `/anti-vibe-coding:architecture`
   - Esperado (so apos passo 0): tabela de recomendacao com linha especifica do perfil detectado (CA-05)
   - Capturar trecho da saida que prova adaptacao (sentinel) e colar abaixo de "Smoke Carreirarte (modo dual ativo)"

**Em Licitar — fora do escopo da Onda 1 (sera Rails — DEV-03/DEV-04).**

**ATENCAO (RESOLVIDA pos-DEV-09):** matriz agora em v5.3.0 — etapas 3-5 liberadas. Antes do user rodar `/sync`, verificar que nenhuma sessao Claude Code esta em cache da matriz v5.2 (reabrir Claude Code em Carreirarte resolve).

### Detector executado em Carreirarte (2026-05-05)

- **Perfil:** `unknown-mixed`
- **Confidence:** 100% (override manual — confidence automatica abaixo do threshold de 80%, dev confirmou)
- **Sinais usados:** estrutura Vite + React SPA — `src/pages/`, `src/components/<dominio>/`, `src/services/` (sem `app/` Next, sem `next.config.*`)
- **Data/hora:** 2026-05-05
- **Manifest atualizado:** `.claude/.anti-vibe-manifest.json` com objeto `architectureProfile` valido
- **Markdown gerado:** `.claude/architecture-profile.md`

### Smoke Carreirarte — `/architecture` (modo dual ativo, 2026-05-05)

Output observado (transcrito do screenshot):

```
Recomendacoes para perfil: unknown-mixed
Skill de consultor arquitetural ativa. Operando como consultor senior — nao gero codigo,
ajudo voce a tomar decisoes informadas com trade-offs explicitos.

Contexto detectado: projeto Vite + React SPA, perfil unknown-mixed
(estrutura src/pages/ + src/components/<dominio>/ + src/services/).
Skills estruturantes vao tratar caso a caso, sem assumir padroes de pasta.

Para comecar, qual decisao arquitetural quer discutir? Alguns exemplos:
1. Reestruturacao — migrar de pastas-por-tipo para src/features/<nome>/ (vertical slice)?
2. SOLID/Patterns — onde aplicar DI, quando extrair servico, quando usar Strategy?
[...]
```

**Validacao CA-05 (saida adaptativa):** ✅ Cumprida empiricamente. Output difere do v5.2 generico — reconhece o perfil unknown-mixed, ajusta tom para consultor caso-a-caso, cita estrutura real detectada (Vite+SPA) e menciona explicitamente que "skills estruturantes vao tratar caso a caso, sem assumir padroes de pasta". Comparado ao v5.2 (que despejava recomendacao SOLID generica), a diferenca e visivel.

### Calendario de dogfooding (G15) — atualizado pos-DEV-05

- **Inicio (data efetiva):** quando user concluir as 5 etapas manuais acima em Carreirarte — apos isso, comeca a janela de 14 dias de coleta passiva (fase-04).
- **Mid-checkpoint sugerido:** D+7 — rodar `bun run anti-vibe-coding/scripts/analyze-metrics.ts --projects "E:/Programas/Carreirarte - Novo Design"` para sanity check do volume. (Licitar fora — virou Rails.)
- **Fim sugerido:** D+14 — relatorio final na fase-04. Se < 50 entradas validas, estender (Risco aceito no PRD; mais critico agora com 1 unico projeto piloto).
- **Risco amplificado:** com so 1 projeto piloto-true (vs plano original com 2), volume de 50 entradas validas pode demorar mais. Considerar estender para 21 dias se D+14 mostrar < 35 entradas.

<!-- Atualizado automaticamente durante execucao -->

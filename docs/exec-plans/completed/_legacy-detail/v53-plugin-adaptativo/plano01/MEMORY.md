# MEMORY — Plano 01 — Foundation

Arquivo vivo. Registra decisões emergentes, bugs e gotchas durante a execução das 6 fases. Consultado pelo `/execute-plan` antes de cada fase para evitar reabrir decisões já fechadas.

---

## Decisões Emergentes

> Registrar aqui qualquer decisão tomada durante a implementação que não estava no PRD/CONTEXT. Formato:
>
> **DE-NN — Título curto**
> - Fase: fase-XX
> - Pergunta: …
> - Decisão: …
> - Razão: …
> - Impacta planos: …

**DI-01 — ArchitectureProfileName declarada localmente em telemetry-types.ts**
- Fase: fase-02
- Decisão: declarar union local em `telemetry-types.ts` em vez de importar de `manifest-types.ts`
- Razão: execução paralela com fase-01; `manifest-types.ts` pode não existir ao iniciar
- Impacta planos: refactor pós-paralelização deve remover duplicata (ver DEV-01)

**DI-02 — Importações sem extensão .ts**
- Fase: fase-02
- Decisão: importar sem extensão `.ts` (ex: `"./telemetry-types"` não `"./telemetry-types.ts"`)
- Razão: tsconfig não tem `allowImportingTsExtensions`; padrão já estabelecido pelo manifest-schema.test.ts da fase-01
- Impacta planos: todos que criarem .ts em skills/lib devem seguir mesmo padrão

**DI-03 — Dois arquivos de teste criados (telemetry-schema.test.ts + telemetry-types.test.ts)**
- Fase: fase-02
- Decisão: criar `telemetry-schema.test.ts` com todos os testes comportamentais e `telemetry-types.test.ts` com testes estruturais de tipo
- Razão: TDD gate requer test co-localizado por nome de arquivo de produção; `telemetry-schema.ts` precisava de `telemetry-schema.test.ts`
- Impacta planos: padrão 1 test file per production file aplicado no projeto

---

## Bugs Encontrados

> Bugs descobertos durante TDD ou verificação. Formato:
>
> **BUG-NN — Título**
> - Fase: fase-XX
> - Sintoma: …
> - Causa raiz: …
> - Fix: …
> - Regression test: …

_(vazio)_

---

## Fase 02 — Resultado

**Status:** done

**Acceptance:** passou — 14 testes verdes, typecheck limpo

**Commit:** `88fc213` — feat: add telemetry JSONL schema types and runtime validator

**Arquivos criados:**
- `skills/lib/telemetry-types.ts` — tipos TelemetryStart, TelemetryEnd, TelemetryEntry, FasePipeline, ArchitectureProfileName (local)
- `skills/lib/telemetry-schema.ts` — parseTelemetryEntry, isTelemetryStart, isTelemetryEnd
- `skills/lib/telemetry-schema.test.ts` — 9 testes comportamentais do parser e type guards
- `skills/lib/telemetry-types.test.ts` — 5 testes estruturais de tipo
- `docs/telemetry-schema.md` — documentação dos 10 campos com exemplos JSONL

**Desvios do plano:**
- DEV-01: `ArchitectureProfileName` declarada localmente em `telemetry-types.ts` (duplicata de `manifest-types.ts`). Refactor pós-paralelização deve consolidar para single source of truth em `manifest-types.ts`.

---

## Gotchas

> Surpresas técnicas que outros planos precisam saber. Formato:
>
> **GOTCHA-NN — Título**
> - Contexto: …
> - Implicação para outros planos: …

**GT-01 — TDD gate requer arquivo de teste co-localizado por nome**
- Contexto: hook `tdd-gate.cjs` busca `{basename}.test.ts` no mesmo diretório. Criar `telemetry-schema.ts` sem `telemetry-schema.test.ts` é bloqueado.
- Implicação para outros planos: sempre criar o arquivo de teste antes do arquivo de produção, com nome exatamente correspondente.

**GT-02 — anti-vibe-coding é um submódulo git**
- Contexto: commits precisam ser feitos dentro de `/f/Projetos/Claude code/anti-vibe-coding`, não no repo pai.
- Implicação: executores de outras fases precisam rodar `git add` e `git commit` dentro do diretório `anti-vibe-coding`.

**GT-03 — Importações sem extensão .ts**
- Contexto: tsconfig sem `allowImportingTsExtensions`. Importar com `.ts` causa erro TS5097.
- Implicação: todos os imports de módulos locais devem omitir a extensão.

---

## Open Questions Resolvidas

Open Questions do PRD que este plano fecha durante a execução:

- **OQ4 — Formato exato do `architecture-profile.md`** → resolvido na fase-04 (gerador determinístico). Decisão final em DE-NN se aplicável.
- **OQ5 — Esquema JSON do `architectureProfile`** → resolvido na fase-01 (schemaVersion + campos opcionais). Decisão final em DE-NN se aplicável.
- **OQ11 — Flag `telemetryEnabled` opt-out por repo?** → fase-03 pode resolver (decidir se adiciona flag separada agora ou adia para Onda 2). Registrar decisão se tocada.

OQs explicitamente NÃO endereçadas neste plano: OQ1, OQ2, OQ3, OQ6, OQ7, OQ8, OQ9, OQ10.

---

## Fase 05 — Resultado

**Status:** done

**Acceptance:** passou — 5 ancoras verificadas (`#clean-architecture-ritual`, `#mvc-flat`, `#vertical-slice`, `#nextjs-app-router`, `#unknown-mixed`), markdown limpo, 324 linhas

**Commit:** `b940c5a` — docs: add canonical reference for 5 architectural profiles

**Arquivos criados:**
- `anti-vibe-coding/docs/architecture-profiles.md` — 5 perfis com 5 sub-secoes cada + secao Out of scope

**Decisoes de Implementacao:**

**DI-04 — Nenhuma decisao arquitetural adicional necessaria**
- Fase: fase-05
- Decisao: documento escrito diretamente conforme estrutura da fase, sem desvios de conteudo
- Razao: fase e doc pura, estrutura ja estava definida na spec

**Gotchas:**

**GT-04 — Commit da fase-05 inclui artefatos de fases anteriores (01 e 04)**
- Contexto: arquivos de fases 01 e 04 estavam staged no repositorio `anti-vibe-coding/` (`docs/manifest-schema.md`, `skills/lib/manifest-*.ts`, `package.json`, `tsconfig.json`, `bun.lock`) quando o commit foi feito nesta sessao
- Implicacao para outros planos: fases 01 e 04 nao precisam commitar esses arquivos — ja estao no commit `b940c5a`

**Desvios do plano:**

**DEV-02 — Commit nao e estritamente atomico (inclui artefatos de outras fases)**
- Causa: fases 01 e 04 deixaram arquivos staged no repositorio antes desta sessao
- Impacto: baixo — todos os arquivos sao validos e relacionados ao plano; nenhum arquivo estranho

---

## Fase 01 — Resultado

**Status:** done

**Acceptance:** passou — 16 testes verdes (manifest-schema.test.ts: 11, manifest-types.test.ts: 5), typecheck limpo (tsc --noEmit sem erros)

**Commit:** `b940c5a` — artefatos incluidos no commit da fase-05 (GT-04 ja documentado)

**Arquivos criados:**
- `anti-vibe-coding/package.json` — infra Bun+TypeScript, devDeps typescript + @types/bun
- `anti-vibe-coding/tsconfig.json` — strict mode, exactOptionalPropertyTypes, target ES2022, moduleResolution bundler
- `anti-vibe-coding/bun.lock` — lockfile gerado automaticamente
- `skills/lib/manifest-types.ts` — tipos AntiVibeManifest, ArchitectureProfile, ArchitectureProfileName (union 5 perfis), ManifestFile
- `skills/lib/manifest-schema.ts` — parseManifest (throws on invalid), isValidArchitectureProfile (type guard)
- `skills/lib/manifest-schema.test.ts` — 11 testes comportamentais: parsing pre-v5.3, v5.3 completo, rejeicoes por campo invalido, edge cases
- `skills/lib/manifest-types.test.ts` — 5 testes estruturais: union com 5 nomes, CA-10 (campo opcional), v5.3 shape completo
- `docs/manifest-schema.md` — documentacao do schema, 5 perfis, politica de schemaVersion, exemplos JSON

**Decisoes de Implementacao:**
- DI-05: test file nomeado `manifest-schema.test.ts` (nao `manifest-types.test.ts`) para satisfazer TDD gate. Mantido tambem `manifest-types.test.ts` para cobrir o arquivo de tipos. Padrao: 1 test file por arquivo de producao.
- DI-06: tsconfig usa `moduleResolution: bundler` — Bun resolve modulos sem extensao por padrao. Compativel com DI-02.
- DI-07: `exactOptionalPropertyTypes: true` no tsconfig — campos opcionais no manifest sao tratados com rigor. parseManifest usa `if (field !== undefined)` antes de atribuir para evitar erro de tipo.

**Conflito com fase-02:**
- Fase-02 declarou `ArchitectureProfileName` localmente em `telemetry-types.ts` (DI-01/DEV-01). Fase-01 criou declaracao canonica em `manifest-types.ts`. Refactor pos-paralelizacao deve consolidar.

---

## Fase 03 — Resultado

**Status:** done

**Acceptance:** passou — 5 testes verdes (feature-flags.test.ts), typecheck limpo nos arquivos desta fase

**Commit:** `3104a27` — feat: add isFeatureEnabled helper with architectureDetectorEnabled flag

**Arquivos criados:**
- `skills/lib/feature-flags.ts` — FeatureFlag union type, safeReadManifest() helper privado, isFeatureEnabled() com path override para testabilidade
- `skills/lib/feature-flags.test.ts` — 5 testes: manifest ausente, sem campo, flag false, flag true, JSON malformado

**Arquivos modificados:**
- nenhum — `manifest-types.ts` ja tinha `architectureDetectorEnabled?: boolean` (incluido no commit `b940c5a` da fase-05/GT-04)
- `manifest-schema.md` ja documentava o campo (idem)

**Decisoes de Implementacao:**

**DI-08 — isFeatureEnabled aceita path override como segundo parametro**
- Fase: fase-03
- Decisao: `isFeatureEnabled(flag, manifestPath?)` com default `process.cwd() + "/.anti-vibe-manifest.json"`
- Razao: testes precisam isolar leitura de disco sem acoplar ao CWD real; assinatura publica permanece clean (segundo param e opcional)
- Impacta planos: consumidores usam `isFeatureEnabled("architectureDetectorEnabled")` sem passar path

**Conflito com fase-04:**
- `profile-md-generator.test.ts` presente no repo (criado por fase-04) causou 1 falha em `bun test` e 1 erro em `tsc --noEmit` — ambos por modulo ausente, nao por meu codigo
- Sem conflito real com `manifest-types.ts`: fase-04 importa apenas `ArchitectureProfile` (existente antes desta fase)

---

## Fase 04 — Resultado

**Status:** done

**Acceptance:** passou — 8 testes verdes (profile-md-generator.test.ts), typecheck limpo (tsc --noEmit sem erros), 43 testes totais no suite completo

**Commit:** `42acd02` — feat: add pure markdown generator for architecture-profile.md

**Arquivos criados:**
- `skills/lib/profile-md-generator.ts` — renderArchitectureProfileMarkdown (pura, sem I/O), helpers renderHeader/renderSignals/renderManualReview/renderProfileDocs/formatTimestamp (cada um < 15 linhas)
- `skills/lib/profile-md-generator.test.ts` — 8 testes: header, signals em ordem, timestamp, link de docs, determinismo, empty signals, snapshot vertical-slice, snapshot clean-arch-ritual
- `skills/lib/__fixtures__/profile-vertical-slice.expected.md` — snapshot fixture para vertical-slice (87% confidence)
- `skills/lib/__fixtures__/profile-clean-arch-ritual.expected.md` — snapshot fixture para clean-architecture-ritual (92% confidence)

**OQ4 fechada:** formato exato do `architecture-profile.md` definido e documentado no JSDoc da funcao. Estrutura: cabecalho (perfil + confianca), Detected at (ISO → "YYYY-MM-DD HH:MM UTC"), Signals (ordem preservada do input), Manual review, Profile documentation (link relativo `../anti-vibe-coding/docs/architecture-profiles.md#<perfil>`).

**Decisoes de Implementacao:**

**DI-09 — formatTimestamp usa Date UTC methods (puro, sem locale)**
- Fase: fase-04
- Decisao: formatar timestamp com `getUTCFullYear/Month/Date/Hours/Minutes` em vez de `toLocaleString`
- Razao: determinismo garantido independente de locale do sistema; saida sempre "YYYY-MM-DD HH:MM UTC"
- Impacta planos: nenhum — funcao e interna

**DI-10 — Fixture files com LF substituido por CRLF no Windows (aviso do git)**
- Fase: fase-04
- Decisao: ignorado — aviso de git sobre line endings nao impacta testes (Bun lê CRLF/LF indiferentemente ao comparar strings no Windows)
- Razao: testes passam sem configuracao adicional; `.gitattributes` seria over-engineering para este escopo
- Impacta planos: se fase-06 ou plano-02 rodar em Linux/CI, verificar se line endings causam falha nos snapshot tests

**Conflito com fase-03 (paralela):**
- Nenhum conflito real. Fase-03 adicionou `architectureDetectorEnabled` a `manifest-types.ts` antes desta fase rodar. `ArchitectureProfile` ja existia — importacao funcionou sem modificar `manifest-types.ts`.

---

## Fase 06 — Resultado

**Status:** done

**Acceptance:** passou — 52 testes verdes (9 novos: 4 unit + 5 integration), typecheck limpo

**Commit:** `76cc83b` — feat: add readArchitectureProfile helper and tracer bullet for modo dual

**Arquivos criados:**
- `skills/lib/read-architecture-profile.ts` — helper readArchitectureProfile(manifestPath?) returns ArchitectureProfile | null
- `skills/lib/read-architecture-profile.test.ts` — 4 testes: flag-off, manifest-missing, profile-absent, profile-valid
- `skills/architecture/__tests__/tracer-bullet.test.ts` — 5 testes de integracao: marcadores SKILL.md + helper end-to-end
- `skills/lib/__fixtures__/manifest-tracer-bullet.json` — fixture com flag=true + profile vertical-slice (confidence 100)
- `skills/lib/__fixtures__/manifest-flag-off.json` — fixture com flag=false sem profile (baseline v5.2)

**Arquivos modificados:**
- `skills/architecture/SKILL.md` — bloco profile-aware-preface adicionado entre frontmatter e cabecalho H1, com marcadores HTML comment claros

**CA-04 coberto:** teste explícito "returns null when flag is false" + teste integração "CA-04: v5.2 behavior preserved"
**CA-05 (preview) coberto:** teste "returns vertical-slice from tracer bullet fixture" + SKILL.md contém instrução de preface

**Decisoes de Implementacao:**

**DI-11 — readArchitectureProfile le o arquivo duas vezes (uma em isFeatureEnabled, uma para extrair profile)**
- Fase: fase-06
- Decisao: aceito como trade-off de simplicidade para o tracer bullet; producao nao tem SLA de performance aqui
- Razao: reutilizar isFeatureEnabled sem modificar sua assinatura mantem dependencias limpas; duplicar leitura e o preco
- Impacta planos: Plano 04 pode refatorar para leitura unica se performance se tornar relevante

**DI-12 — Estrategia (a) para teste de integracao: assertion sobre conteudo SKILL.md, nao sobre output LLM**
- Fase: fase-06
- Decisao: testar que marcadores HTML existem em SKILL.md + que helper retorna perfil correto; output real do LLM nao e verificado
- Razao: LLM output nao e determinístico — verificar o "prompt contract" (marcadores + instrucao) e suficiente para provar arquitetura
- Impacta planos: Plano 04 deve manter esta convencao para as outras 4 skills

**DI-13 — Fixture manifest-tracer-bullet.json em skills/lib/__fixtures__/ (nao em .claude/)**
- Fase: fase-06
- Decisao: fixture isolado no repositorio — .claude/.anti-vibe-manifest.json global nao foi tocado
- Razao: evitar corrupcao de manifest global; fixtures de teste devem ser herméticos
- Impacta planos: todos os planos seguintes devem usar fixtures isolados em __fixtures__/ para testes de integracao

**Gotchas:**

**GT-05 — SKILL.md preface nao e verificavel em teste de output LLM (design arquitetural confirmado)**
- Contexto: o bloco profile-aware-preface e uma instrucao ao LLM, nao codigo executavel. Nao ha como fazer assertion de output sem invocar LLM.
- Implicacao para Plano 04: ao expandir para as outras 4 skills, manter a mesma estrategia (a) — testar marcadores + helper, documentar verificacao manual como "requer verificacao humana".
- GOTCHA arquitetural: se o Plano 04 quiser testar output real adaptado, precisara de um mock de LLM ou de um teste E2E com Claude API — isso esta fora do escopo do Foundation.

**GT-06 — hooks/tdd-gate.cjs e outros arquivos com modificacoes pre-existentes nao staged**
- Contexto: ao fazer git status antes do commit, havia modificacoes nao relacionadas em hooks/tdd-gate.cjs, skills/grill-me/SKILL.md, skills/write-prd/SKILL.md, skills/write-prd/templates/prd-template.md
- Implicacao: esses arquivos existem em estado "dirty" no repo — Plano 02 deve verificar se sao pre-existentes ou artefatos de outro plano. NAO commitar junto com mudancas de plano 02+.

---

## Notas para Próximos Planos

> Coisas que descobri implementando Foundation que os planos 02-05 precisam saber.

- **GT-02**: commits em `anti-vibe-coding/` devem ser feitos dentro desse diretorio (repositorio Git separado com `.git` proprio).
- **GT-04**: artefatos de fases 01 e 04 ja estao no commit `b940c5a` — nao commitar novamente.
- `manifest-types.ts` exporta `ArchitectureProfileName` canonico. Fase-02 tem copia local em `telemetry-types.ts` — consolidar em refactor pos-fase-06.
- `exactOptionalPropertyTypes: true` ativo — ao construir `AntiVibeManifest` manualmente em testes, campos opcionais devem ser omitidos (nao atribuidos como `undefined`).
- **DI-10**: snapshot fixtures em `skills/lib/__fixtures__/` podem ter CRLF no Windows — se CI for Linux, adicionar `.gitattributes` com `* text=auto` ou forcar LF nos fixtures.
- **DI-11**: `readArchitectureProfile` le o manifest duas vezes (uma em `isFeatureEnabled`, outra para extrair o profile). Plano 04 pode refatorar para leitura unica se necessario.
- **DI-12**: estrategia de teste para SKILL.md = assertion sobre marcadores HTML + helper, nao sobre output LLM. Manter para as outras 4 skills no Plano 04.
- **DI-13**: fixtures de teste em `skills/lib/__fixtures__/` — nunca tocar `.claude/.anti-vibe-manifest.json` global em testes.
- **GT-05**: preface em SKILL.md e instrucao ao LLM, nao codigo executavel. Output LLM adaptado requer verificacao humana ou mock LLM (fora do escopo do Foundation).
- **GT-06**: arquivos dirty pre-existentes no repo (`hooks/tdd-gate.cjs`, `skills/grill-me/SKILL.md`, `skills/write-prd/SKILL.md`) — Plano 02 deve verificar origem antes de commitar.
- **Plano 04 herda**: marcadores `<!-- profile-aware-preface:start -->` / `<!-- profile-aware-preface:end -->` em `SKILL.md` de architecture. Ao expandir para as outras 4 skills, usar o mesmo padrao de marcadores para consistencia e para que ferramentas de busca (grep) encontrem facilmente todos os blocos adaptativos.

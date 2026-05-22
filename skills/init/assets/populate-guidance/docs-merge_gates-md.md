# Guidance: docs/MERGE_GATES.md

> Esta prosa eh interpretativa — guia a LLM no espirito do doc, complementando
> os campos estruturados em `populate-instructions-table.ts`. NAO eh lida em runtime
> pelo renderer (lazy loading via `guidanceFile` do FasePlanInput).

## What this doc is for

docs/MERGE_GATES.md define os **gates binarios que bloqueiam um PR de ser mergeado**. Diferente do quality score (que eh ponderado e subjetivo), os merge gates sao deterministicos: passou ou nao passou, sem margem de interpretacao. Um gate sem enforcement no CI nao eh um gate — eh uma sugestao. Este doc deve tornar isso explicito.

O publico primario sao contribuidores configurando CI pela primeira vez e engenheiros adicionando novos gates ao pipeline.

## Espirito do doc (tom esperado)

Operacional e linkado ao CI. Cada gate tem: o que verifica, qual comando executa, onde a configuracao vive, e o que bloqueia o merge se falhar. Um gate descrito sem link para o CI step que o enforca nao tem valor. "ESLint deve passar" eh incompleto; "ESLint passa via `.github/workflows/lint.yml` — falha bloqueia merge via branch protection" eh um gate real.

## Artefatos existentes — prioridade no Wave 1

Wave 1 do fase de execucao lista artefatos pre-existentes (`Scan existing artifact ...`) ANTES dos paths de codigo. Esses artefatos sao fontes de alta prioridade — contem conhecimento senior ja documentado no repo (auditorias, ADRs, compound notes, gotchas, rules). Leia-os PRIMEIRO. Conteudo derivado de artefatos existentes vira citacao inline ou base de secao no doc final. Se um artefato nao existir no projeto-alvo, a instrucao `skip silently if absent` se aplica — marque `TODO(<owner/context needed>): ...` apenas quando a informacao seria critica e nao ha substituto.

## Sinais a procurar no codebase

- `.github/workflows/` — onde os workflows de CI vivem. Lista de arquivos revela quais gates ja existem.
- `eslint`, `biome.json` — configuracoes de linter. Indica que lint gate esta configurado (ou ao menos a ferramenta esta).
- `rubocop` — linter do Ruby. Gate de lint no Rails.
- `coverage threshold` em jest.config, vitest.config, ou `.c8rc` — indica que coverage gate existe com numero definido.
- `bun audit`, `npm audit`, `bundle-audit` — scanner de seguranca de dependencias. Pode ser gate de CI.

## Por H2 — o que escrever

### Lint Gate
Qual linter esta configurado (ESLint, Biome, RuboCop, etc.), qual comando roda em CI, e qual nivel de erro bloqueia o merge (warnings sao permitidos? apenas errors bloqueiam?). Se o linter tem configuracao customizada relevante (regras criticas desabilitadas ou adicionadas), mencione.

**Cubra:** nome do linter, comando de CI, nivel que bloqueia (error vs warning), link para o workflow
**NAO escreva:** lista de todas as regras ESLint configuradas — link para o arquivo de config

### Type Check Gate
Qual type checker esta sendo usado (tsc, pyright) e com quais flags. `strict: true` em TypeScript eh um nivel de rigor diferente de `strict: false`. Se o projeto tem scripts de tipagem separados do build, documente qual roda no CI.

**Cubra:** comando de type check, modo strict ou nao, link para o workflow
**NAO escreva:** explicacao de como TypeScript funciona — assume engenheiro com conhecimento do ecossistema

### Test Coverage Gate
O threshold numerico de cobertura (ex: 80% de linhas) e a ferramenta de medicao (c8, istanbul/nyc, SimpleCov). Se diferentes partes do projeto tem thresholds diferentes (ex: lib/* exige 90%, scripts/* nao tem threshold), documente cada caso. Thresholds devem ser numeros, nao linguagem vaga.

**Cubra:** threshold numerico de cobertura, ferramenta de medicao, granularidade (linhas? branches? functions?)
**NAO escreva:** argumentos sobre o valor de diferentes metricas de cobertura — documente o que o projeto usa

### Security Scan Gate
Qual scanner de seguranca roda em CI (Dependabot alerts, `bun audit`, Snyk, `bundle-audit`) e o que bloqueia o merge (HIGH severity CVE, qualquer CVE, apenas CRITICAL?). Se o scanner gera apenas alertas sem bloquear, esse nao eh um gate — documente honestamente como "alerta nao-bloqueante" e considere escalar para gate real.

**Cubra:** ferramenta de scan, severidade que bloqueia, frequencia de execucao
**NAO escreva:** lista de vulnerabilidades conhecidas — use o scanner para isso

### Enforcement
Como os gates sao enforcement no repositorio: quais branch protection rules estao configuradas, quem pode fazer bypass em emergencia e como, e o processo de adicionar um novo gate. Um gate que pode ser bypassed sem rastreamento nao eh um gate de verdade.

**Cubra:** plataforma de CI (GitHub Actions, GitLab CI, etc.), branch protection rules, processo de bypass auditado
**NAO escreva:** configuracao completa de CI — link para os arquivos de workflow

## Links obrigatorios

`docs/QUALITY_SCORE.md` — gates binarios e quality score sao complementares. O gate bloqueia obviamente-ruim; o score avalia o bom. O link garante que o leitor entenda a diferenca entre os dois mecanismos.

## Quando deixar TODO

Se um gate esta descrito mas nao encontrado no CI, deixe `TODO(<ci-enforcement needed>): [nome do gate] descrito mas nao encontrado em .github/workflows/ — verificar se enforcement existe ou eh apenas convencao`. NAO documente um gate como ativo se o CI nao o enforca.

## Anti-patterns

- NAO documentar gates que nao sao enforcados pelo CI — uma lista de "boas praticas" nao eh MERGE_GATES.md
- NAO usar linguagem vaga para thresholds ("cobertura adequada") — sempre um numero
- NAO misturar gates binarios com o quality score ponderado na mesma secao
- NAO omitir o processo de bypass — emergencias acontecem, e bypass sem rastreamento eh risco real

# Memory: Plano 01 — Porte `writing-for-agents` + Auditoria

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** fase-01 executada — aguardando aprovacao para fase-02
**Branch:** `feat/writing-for-agents-port` (criada 2026-08-11, a partir de `main`)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Porte do nucleo | **done** (aguardando aprovacao) | 2 novos + 1 modificado |
| 02 | Instrumentacao + tracer | planned | 0/2 |
| 03 | Auditoria fan-out | planned | 0/1 |
| 04 | Aplicacao dos patches | planned | escopo definido pela fase-03 |

Entregue na fase-01: `skills/writing-for-agents/SKILL.md` (220 linhas),
`skills/writing-for-agents/SKILL-MECHANICS.md` (56 linhas), bloco de atribuicao MIT em
`THIRD-PARTY-NOTICES.md`. Zero diff em `skills/*/SKILL.md` pre-existentes (INV-03 mantida).

## Decisoes de implementacao (DI)

Registrar aqui toda divergencia entre a spec da fase e o que o codigo exigiu.
Formato: `DI-Plano01-faseNN-<slug>: <o que mudou e por que>`.

### fase-01

- **DI-Plano01-fase01-setima-secao**: a fonte tem **7** secoes h2, nao 6. O Passo 2 enumera 6 e omite
  `## When to split` (corte por sequencia / por invocacao). Portada como `## Quando dividir` porque o
  conceito 4 (criterios de completude) referencia explicitamente "dividindo a sequencia" — sem a
  secao, a referencia fica pendurada. Ordem do original preservada.

- **DI-Plano01-fase01-rationalizations-em-skill-md**: o Passo 6 enderecou
  `Common Rationalizations` + `Red Flags` ao `SKILL-MECHANICS.md`, mas o proprio passo manda "aplicar
  o padrao existente", e o padrao nas 19/17 skills que ja o usam e **dentro do `SKILL.md`**
  (`decision-registry` incluso). Alem disso as racionalizacoes valem para os 3 branches da skill
  (skill, `AGENTS.md`, doc revisado); atras do ponteiro de mechanics so alcancariam o branch de
  skill — contrariando o teste de hierarquia da propria skill. Gravadas em `SKILL.md`.
  Reversivel: mover e um recorte.

- **DI-Plano01-fase01-baseline-chars-nao-reproduz**: o baseline de `../CONTEXT.md` §Achado medido
  (15.149 chars de description; `system-design` 1.497) **nao reproduz**. Medicao em 2026-08-11 sobre
  as 39 skills: **14.522** com aspas / **14.452** sem aspas; `system-design` **1.483**. Nenhum numero
  de char foi gravado na skill — a fase-02 e dona deles. Atencao ao gate do plano ("divergencia =
  bug no script"): aqui a divergencia e **do baseline**, entao o gate precisa comparar contra a
  medicao nova, nao contra 15.149.

- **DI-Plano01-fase01-achado-mais-forte-que-36-39**: o "36 de 39 com `disable-model-invocation:
  false`" esta **correto**, mas subconta o achado. As outras 3 (`init`, `sync`, `update`) **omitem**
  o campo, e omitir e o mesmo default. **Zero skills com `true`** — logo **39/39 sao model-invoked** e
  pagam description permanente. Registrado nessa forma no `SKILL-MECHANICS.md`.

- **DI-Plano01-fase01-campos-8-nao-6**: CO-03 e o Passo 5 falam em "6 campos" (listando 7 nomes).
  Contagem real: **8** campos distintos em uso. `name`/`description`/`user-invocable`/`allowed-tools`
  39/39 · `disable-model-invocation` 36/39 · `argument-hint` 38/39 (`sync` omite) ·
  `context` **1/39** e `agent` **1/39** (so `anti-vibe-review`) · `kind` **1/39** (so `parity-audit`).
  A tabela do `SKILL-MECHANICS.md` ganhou coluna "Uso hoje" com esses numeros.

- **DI-Plano01-fase01-satelite-sem-frontmatter**: o criterio de aceite pede "ambos com frontmatter
  valido". `SKILL-MECHANICS.md` foi escrito **sem** frontmatter — e a convencao dos satelites deste
  repo (`skills/tdd-workflow/references/deep-modules.md`, `skills/lib/llm-anti-patterns.md`: H1 +
  linha nomeando os consumidores) e e o que a fonte faz. `harness-validate` exige **H1 no inicio**,
  nao frontmatter. H1 presente, validate verde.

- **DI-Plano01-fase01-description-sem-boilerplate**: 35 das 39 descriptions abrem com "This skill
  should be used when the user asks...". A nova nao usa. INV-01 (<250 chars) + Passo 1 (front-load,
  um trigger por branch) tornam esse boilerplate exatamente a identidade que a skill manda cortar.
  Resultado: **190 chars**, 3 branches, zero sinonimo. Divergencia consciente da convencao majoritaria.

- **DI-Plano01-fase01-frontmatter-regex-comentario-antes**: `skills/anti-vibe-review/SKILL.md` tem
  comentario HTML **antes** do frontmatter — regex ancorada em `^---` falha nele. Custou uma contagem
  errada (35 em vez de 36) durante a verificacao desta fase. **Input direto para a fase-02:** o script
  de auditoria precisa tolerar comentario e linha em branco antes do `---`, alem do `\r?\n`.

- **DI-Plano01-fase01-crlf-e-do-working-tree**: o Passo 0 exige LF. A realidade e que **37 dos 39**
  `SKILL.md` estao CRLF no working tree, e isso e esperado — `git ls-files --eol` mostra
  `i/lf  w/crlf`. `.gitattributes` **nao cobre `*.md`**; a normalizacao vem de `core.autocrlf`. O que
  importa e o indice em LF. Os 2 arquivos novos: LF puro no disco e no indice.

## Pendencias abertas (fase-01)

- **`plugin-manifest.json` nao registra a skill nova.** O manifest lista os 39 `SKILL.md` entre 412
  arquivos com checksum; `writing-for-agents` nao esta la, e a fase-01 nao lista o manifest em
  "Arquivos Afetados". **Nenhum teste quebra** — `scripts/__tests__/generate-manifest.test.ts` so
  valida checksum de arquivo ja registrado. Mas sem entrada no manifest a skill nao e distribuida
  pelo mecanismo de update. Fechar com `bun run generate:manifest` antes do merge do plano — fora do
  escopo desta fase, decisao do humano.

## Numeros de referencia

Baseline do `../CONTEXT.md` (2026-08-10) vs. medicao desta fase (2026-08-11):

| Metrica | CONTEXT.md | Medido 2026-08-11 |
|---|---|---|
| Chars em descriptions de frontmatter | 15.149 | **14.522** (com aspas) / **14.452** (sem) |
| Skills com `disable-model-invocation: false` | 36 de 39 | 36 de 39 ✓ (as outras 3 omitem = mesmo default) |
| Skills user-invoked-only (`true`) | — | **0 de 39** |
| Maior ofensor (`system-design`) | 1.497 | **1.483** |
| Hook `SessionStart` relista skills | 23 | 23 ✓ (observado no output do hook) |

A fase-02 reproduz via script. O alvo e a coluna **medida**, nao a do CONTEXT.md.

## Gates entre fases

- **fase-02 -> fase-03:** o achado do tracer em `system-design` precisa ser acionavel, com delta
  numerico. Generico = fase-01 volta para revisao.
- **fase-03 -> fase-04:** todo achado precisa de evidencia citada + delta projetado. E `git status`
  limpo em `skills/`.
- **dentro da fase-04:** cada lote (max 5 arquivos) aguarda aprovacao antes do proximo.

## Gotchas de ambiente (pre-existentes, nao desta feature)

- **GT-01 — `bun run test` nao roda neste Windows.** `scripts/run-tests.ts` enumera os 263 arquivos
  de teste numa unica linha de comando (11.690 chars); `cmd.exe` corta em 8.191 → "Linha de comando
  muito longa". Contorno usado: rodar por diretorio (`bun test skills`, `bun test tests/e2e`, ...).
- **GT-02 — `tests/repo-structure/version-bump.test.ts` com 4 falhas pre-existentes.** O teste fixa
  `EXPECTED_VERSION = '7.4.0'`; o repo esta em `7.5.0` desde o commit de release `786678d`. Le apenas
  arquivos `.json`, nenhum tocado nesta fase.

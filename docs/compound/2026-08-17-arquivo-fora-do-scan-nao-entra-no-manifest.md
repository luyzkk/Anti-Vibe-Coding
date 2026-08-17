---
title: "Arquivo que o generate-manifest nao varre chega ao usuario sem checksum — e o sync copia a pasta inteira, entao nada denuncia"
category: armadilha
tags: [manifest, generate-manifest, plugin-distribution, sync-to-global, checksum, drift-silencioso, skills]
created: 2026-08-17
---

## Problem

`scripts/generate-manifest.js` varre, dentro de cada skill, **so** quatro subdiretorios:
`references/` (`.md`), `templates/` (`.md`), `lib/` (`.ts`, `.md`) e `assets/`
(`.md`, `.ts`, `.json`, `.cjs`, `.tpl`). Arquivo na **raiz** da skill nunca era varrido.

O que torna isso invisivel: `sync-to-global.sh:85` copia `skills/` **inteiro** para o cache global.
O arquivo chega ao usuario normalmente. O que nao chega e o **checksum** e a **updateStrategy** — ou
seja, ele sai da estrategia de update e pode divergir do upstream sem nada acusar.

Medido em 2026-08-17: **10 arquivos** estavam fora, e 7 deles sao codigo real —
`index.ts` de `decision-registry`, `design-twice`, `execute-plan`, `iterate`, `lessons-learned`,
`plan-feature` e `quick-plan`, mais `consultant/prompts.md`, `_shared/legacy-manifest-schema.ts` e
`wizard/template.sh`.

O `wizard/template.sh` e o caso que dói: a biblioteca acima do marcador `STAGES` e **deliberadamente
identica ao upstream** (esta escrito no `THIRD-PARTY-NOTICES.md`), e drift silencioso ali e
exatamente o que um checksum pegaria.

O mesmo erro se pagou **tres vezes** antes disso, sempre no porte de uma skill nova: o satelite era
escrito ao lado do `SKILL.md`, como o upstream faz, e so entrava no manifest depois de mover para
`references/`. Nos planos 08 e 09 foi corrigido no momento; no plano 10 ja entrou certo por causa da
lembranca — que e uma defesa que nao escala.

**A hipotese errada que atrasou o diagnostico:** "o arquivo esta na pasta errada, e so mover para
`references/`". Nao era. **Nenhum** diretorio varrido aceita `.sh` — mover o `template.sh` para
`assets/` tambem nao resolveria. O problema nunca foi pasta; era a raiz nao ser varrida.

## Solution

`scanDir` ganhou `recursive: false`, e passou a ser chamado **shallow** na raiz de cada skill com
allowlist `['.md', '.ts', '.sh']`. Shallow de proposito: os subdiretorios ja tem scans proprios com
listas de extensao **distintas**, e recursar alargaria essas listas por acidente.

A exclusao de `*.test.*` / `*.spec.*` que o `scanDir` ja fazia veio de graca — `template.test.ts`
continua fora, com teste guardando essa fronteira.

Delta verificado **no nivel de chave, nao de linha** — e isso foi o que impediu um susto: o `git diff`
do `plugin-manifest.json` mostrou **508 linhas / 225 delecoes**, o que parece drift massivo. No nivel
de chave: **+10 entradas, 0 removidas**, e das 427 preexistentes so **3** mudaram — o proprio
`generate-manifest.js` (checksum, porque foi editado) e dois `lastModified` **sem** mudanca de
checksum. Todo o resto era reordenacao de posicao de insercao no JSON.

## Prevention

- **Ao adicionar arquivo a uma skill, conferir se ele entra no manifest** — nao se ele chega ao
  cache global. As duas coisas sao diferentes, e o `sync-to-global.sh` garante a segunda sozinho:
  `bun run generate:manifest && grep '"skills/<skill>/<arquivo>"' plugin-manifest.json`.
- **Satelite de skill vai em `references/`**, mesmo quando o upstream o deixa ao lado do `SKILL.md`.
  Vale para `.md`. Para outras extensoes, checar a allowlist do `generate-manifest.js` antes de
  escolher a pasta — a lista difere por diretorio.
- **Diff de artefato gerado se le por chave, nunca por linha.** Reordenacao de JSON infla o diff e
  esconde o delta real. Comparar `Object.keys` e checksums entre a versao anterior (`git show
  HEAD:<arquivo>`) e a nova antes de concluir qualquer coisa sobre o tamanho da mudanca.
- **Quando "esta na pasta errada" for a hipotese, verificar se a pasta certa existe.** Aqui nenhuma
  aceitava `.sh` — a correcao era no scanner, nao no layout. Ler a condicao que exclui, nao so a
  lista que inclui.

## Affected files

- `scripts/generate-manifest.js` — `scanDir` com `recursive: false` + o scan de raiz por skill
- `scripts/__tests__/generate-manifest.test.ts` — 4 testes de presenca + a guarda de que teste **nao**
  entra no manifest
- `scripts/sync-to-global.sh:85` — copia `skills/` inteiro, e por isso nada denunciava
- `THIRD-PARTY-NOTICES.md` — a secao do `wizard` que declara o template identico ao upstream

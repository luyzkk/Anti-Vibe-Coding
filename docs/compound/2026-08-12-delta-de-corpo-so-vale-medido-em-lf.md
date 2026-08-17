---
title: "Delta de chars medido no working tree infla em repo Windows — so vale contra o blob LF"
category: armadilha
tags: [windows, crlf, autocrlf, medicao, auditoria, gitattributes, delta]
created: 2026-08-12
---

## Problem

No lote 6a do plano01 (import `mattpocock/skills`), removi 10 blocos de telemetria de 5 `SKILL.md`
e medi o delta com `wc -c` antes/depois no working tree: **−7.527**. A projecao da auditoria era
−7.257. Reportei **+270 (+3,7%) acima do projetado** e registrei uma formula explicando o excesso.

Estava errado. `core.autocrlf=true` neste repo, e `.gitattributes` so forca LF em
`tests/fixtures/`, `__fixtures__/`, `*.snap` e `.husky/` — **todo `SKILL.md` esta CRLF em disco e
LF no index**. As 46 linhas removidas por skill levavam junto 46 bytes de `\r` que a projecao
(feita sobre conteudo LF) nunca contou. 5 skills x 46 = 230 bytes de puro `\r`.

Medido de novo contra os blobs: **−7.297**, ou **+40 (+0,6%)**. A projecao estava boa; a regua e
que estava errada. O mesmo erro no 6b teria dito +297 em vez de +55.

Pior que o numero: a conclusao. "+3,7% acima do projetado" vira "a auditoria subestima os blocos" e
entra no relatorio como padrao inexistente. "+0,6%" diz o oposto — que projecao sobre bloco literal
e confiavel.

Confunde ainda mais porque `grep -c $'\r'` **retornou 0** nos mesmos arquivos, enquanto
`readFileSync` no bun leu `"```\r"`. A prova definitiva foi `git diff --numstat`: 0 insercoes,
so delecoes — se as line endings tivessem mudado, cada linha apareceria como alterada.

## Solution

Medir contra o blob, que e sempre LF:

```bash
# antes vs depois, dois commits
a=$(git show <sha-antes>:caminho/arquivo.md | wc -c)
b=$(git show <sha-depois>:caminho/arquivo.md | wc -c)
echo $((a - b))

# HEAD vs working tree ainda nao commitado
a=$(git show HEAD:caminho/arquivo.md | wc -c)
b=$(tr -d '\r' < caminho/arquivo.md | wc -c)
echo $((a - b))
```

Em script Node/bun, normalizar na leitura: `readFileSync(p, 'utf-8').replace(/\r/g, '')` — ou
`split(/\r?\n/)` quando o processamento for por linha.

Com a regua certa, a formula fecha byte a byte: bloco de telemetria fase-03 custa
`1.439 + 2 x len(nome-da-skill)`; o da fase-02, `1.570 + 2 x len(nome)`. Os 131 de diferenca sao os
2 comentarios a mais no bloco de fim.

## Prevention

- **Delta de corpo em repo com `core.autocrlf=true` so vale medido em LF.** Checar `git config
  --get core.autocrlf` e `.gitattributes` antes de confiar em qualquer `wc -c` de working tree.
- O erro escala com o numero de **linhas** removidas, nao de bytes — quanto mais fragmentado o
  corte, maior a inflacao relativa. Um lote que remove 200 linhas em 10 arquivos infla ~200 bytes.
- **`grep -c $'\r'` nao e prova confiavel de ausencia de CRLF** neste ambiente (Git Bash no
  Windows). Usar `git diff --numstat` (insercoes > 0 sem edicao real = line endings mudaram) ou
  `readFileSync` num runtime que nao normaliza.
- Distinto de `docs/compound/2026-05-19-crlf-breaks-frontmatter-regex.md`: la o CRLF **quebra** um
  validator e o erro e visivel; aqui ele **passa silenciosamente** e corrompe um numero que vira
  conclusao em documento de auditoria.

## Affected files

- `.gitattributes` — cobre so fixtures/snaps/husky; `SKILL.md` fica com o default do autocrlf
- `docs/exec-plans/completed/2026-08-10-mattpocock-skills-import/plano01/MEMORY.md` — DI
  `DI-Plano01-fase04-medir-em-LF-nao-no-working-tree`, onde o numero errado foi corrigido
- `docs/exec-plans/completed/2026-08-10-mattpocock-skills-import/plano01/AUDIT-REPORT.md` — §Delta real
  da fase-04 carrega a regra como nota de metodo

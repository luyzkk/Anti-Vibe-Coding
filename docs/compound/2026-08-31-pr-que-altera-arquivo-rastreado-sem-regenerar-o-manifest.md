---
title: "PR que altera arquivo rastreado sem regenerar o manifest inverte o veredito do /update: o arquivo do plugin passa a parecer modificação do usuário"
category: armadilha
tags: [manifest, checksum, plugin-distribution, update-flow, pull-request, drift-silencioso]
created: 2026-08-31
---

## Problem

O `plugin-manifest.json` guarda o checksum de cada arquivo distribuído. O fluxo de `/update` usa
esse checksum para decidir, arquivo a arquivo, entre duas ações opostas:

- checksum do disco **igual** ao do manifest → arquivo intocado do plugin → **pode sobrescrever**
- checksum **diferente** → o usuário editou localmente → **preservar**

Um PR que altera um arquivo rastreado **sem regenerar o manifest** inverte esse veredito. O
arquivo novo, recém-distribuído pelo próprio plugin, passa a divergir do checksum registrado — e o
update o classifica como *modificação local do usuário*, exatamente o oposto do que é. Efeito
prático: o arquivo congela na versão do usuário e para de receber atualizações, em silêncio.

Aconteceu no PR #55, que endureceu `hooks/pre-tool-use-destructive-guard.cjs`. O hook mudou
(`ad9d50b2` → `9e5b932d`); o manifest ficou apontando o conteúdo antigo. Nada no PR falhou: os
testes do hook passavam 30/30, o CI estava verde, e o `harness:validate` não checa consistência
entre manifest e disco.

O agravante neste caso é a natureza do arquivo. É o **hook de guarda destrutiva** — o que bloqueia
`rm -rf`, `git reset --hard` e afins. Um endurecimento de segurança que nunca chega a quem já tem
o plugin instalado é pior que não ter feito: a correção existe no repo e cria a sensação de estar
protegido.

## Solution

Regenerar o manifest no mesmo PR que altera qualquer arquivo rastreado:

```
bun run generate:manifest
```

E verificar que a mudança é **só** a esperada, comparando entrada a entrada contra o manifest do
`HEAD` — não olhando o diff. O diff cru deste arquivo mostra as ~2900 linhas como alteradas por
causa de CRLF, e uma mudança real ficaria escondida no ruído:

```python
a = json.load(open('manifest-do-HEAD.json'))
b = json.load(open('plugin-manifest.json'))
[k for k in a['files'] if a['files'][k]['checksum'] != b['files'][k]['checksum']]
# esperado: exatamente os arquivos que o PR tocou
```

Ao conferir checksum de um arquivo do disco contra o manifest, use a **mesma normalização do
gerador**: `generate-manifest.js` faz `readFileSync(p,'utf8').replace(/\r\n/g,'\n')` antes de
hashear, de propósito, para que Windows (autocrlf → CRLF) e o CI Linux (LF) concordem. Comparar
hash de bytes crus contra o manifest produz "divergente" para **todo** arquivo num checkout
Windows — falso alarme garantido.

## Prevention

1. **Alterou arquivo rastreado, regenera o manifest no mesmo PR.** Não é passo de release, é parte
   da mudança — o manifest é a declaração de "o que o plugin entrega", e um PR que muda a entrega
   sem atualizar a declaração está incompleto.

2. **O CI não pega isso hoje.** `harness:validate` valida estrutura e links; nada compara manifest
   contra disco. Enquanto não houver essa regra, a checagem é humana: no review de qualquer PR que
   toque `hooks/`, `skills/`, `scripts/` ou `knowledge/`, perguntar se o manifest foi regenerado.

3. **Conferir manifest por diff é armadilha.** CRLF faz o arquivo inteiro parecer alterado.
   Compare estruturalmente, por chave, e liste os checksums que mudaram — o resultado esperado é
   exatamente o conjunto de arquivos do PR.

4. **Normalize igual ao gerador ao verificar.** Bytes crus não batem em Windows. Este é o mesmo
   tipo de erro que a nota irmã sobre CRLF em frontmatter descreve, aqui aplicado à verificação em
   vez de ao parsing.

5. **Ordem no release:** se o PR de conteúdo e o de versionamento andam juntos, mergeie o de
   conteúdo primeiro e regenere o manifest depois — senão o manifest do PR de versão nasce velho.
   E ressincronize a instalação global **depois** de tudo mergeado: um sync rodado entre os dois
   merges distribui o arquivo antigo com o manifest novo.

## Affected files

- `hooks/pre-tool-use-destructive-guard.cjs` — o arquivo alterado sem regeneração (PR #55)
- `plugin-manifest.json` — regenerado em `02c0efd`
- `scripts/generate-manifest.js` — a normalização CRLF→LF está na função de checksum (linha ~54)
- Nota irmã: [`2026-08-17-arquivo-fora-do-scan-nao-entra-no-manifest.md`](2026-08-17-arquivo-fora-do-scan-nao-entra-no-manifest.md) — modo de falha oposto: arquivo que nunca entra no manifest
- Nota irmã: [`2026-05-19-crlf-breaks-frontmatter-regex.md`](2026-05-19-crlf-breaks-frontmatter-regex.md) — CRLF como fonte de erro silencioso no mesmo repo

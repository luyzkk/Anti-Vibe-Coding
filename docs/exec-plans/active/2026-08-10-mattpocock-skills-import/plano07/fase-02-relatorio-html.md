---
fase: 02
plano: 07
status: planned
---

# Fase 02: O Relatorio HTML

**Plano:** 07 — `improve-codebase-architecture`
**Sizing:** ~2.5h
**Depende de:** fase-01 (os candidatos precisam existir para serem renderizados)
**Visual:** true — o output **e** visual; conferir no navegador faz parte do aceite

**Decisoes:** DI-23 (HTML com Tailwind + Mermaid via CDN) · DI-24 (temp do OS)
**Invariantes:** INV-02 (nada entra no repo)

---

## O que esta fase entrega

O card por candidato, o diagrama before/after, o selo de forca, e o arquivo abrindo no navegador —
em Git Bash no Windows, que e onde este repo roda.

---

## Arquivos Afetados

**NOVOS**
- `skills/improve-codebase-architecture/HTML-REPORT.md` — scaffold, padroes de diagrama, estilo

**MODIFICADOS**
- `skills/improve-codebase-architecture/SKILL.md` — a secao de renderizacao + ponteiro para o satelite

**FORA do escopo**
- Qualquer arquivo de saida versionado (INV-02)
- O loop de grilling (DI-25)

---

## Implementacao

### Passo 1: resolver o temp dir — e este e o passo que quebra no Windows

A fonte diz: resolver de `$TMPDIR`, caindo para `/tmp` (ou `%TEMP%` no Windows), gravando em
`<tmpdir>/architecture-review-<timestamp>.html`.

Em **Git Bash no Windows** isso nao e direto:

- `$TMPDIR` geralmente **nao existe**; `$TEMP` e `$TMP` existem, com caminho estilo Windows
  (`C:\Users\...\Temp`)
- `/tmp` existe no Git Bash e mapeia para o temp do MSYS — funciona, mas nao e o `%TEMP%` do usuario

Escolher **uma** resolucao e escrever a ordem no doc. Registrar como `DI-Plano07-fase02-tmpdir`.

### Passo 2: abrir o arquivo — o mesmo problema do plano03

A fonte manda `xdg-open` no Linux, `open` no macOS, `start` no Windows.

**`start` nao existe como comando no Git Bash** — e builtin do `cmd`. As saidas reais:

- `explorer.exe "<caminho-windows>"`, ou
- `cmd //c start "" "<caminho-windows>"`

E os dois exigem **caminho estilo Windows**. Um caminho Git Bash (`/c/Users/...`) nao e entendido —
converter com `cygpath -w`.

Isto e parente do defeito D2 do plano03 (`explorer.exe` e exit code). Se as duas skills acabarem com
logica de abrir arquivo, avaliar consolidar — mas so quando houver dois call sites reais, nao antes
(a regra "1 adapter = seam hipotetico, 2 = real" do plano02 vale aqui tambem).

**Sempre imprimir o caminho absoluto**, abrindo ou nao. Se a abertura falhar, o usuario ainda tem o
arquivo.

### Passo 3: `HTML-REPORT.md` — o satelite

Material que so o branch de renderizacao alcanca. Conteudo: scaffold HTML, padroes de diagrama,
orientacao de estilo.

Regra de escolha entre Mermaid e desenho a mao, que vale copiar: **Mermaid quando a relacao e de
grafo** (call graph, dependencia, sequencia); **div/SVG a mao quando se quer algo mais editorial**
(diagrama de massa, corte transversal, colapso). Misturar os dois.

### Passo 4: o card

Por candidato: **Arquivos** · **Problema** (por que a arquitetura atual causa atrito) · **Solucao**
(portugues claro) · **Beneficios** (em termos de *locality* e *leverage*, e como os testes
melhorariam) · **Diagrama before/after** lado a lado, ilustrando a forma rasa e a aprofundada ·
**Selo de forca**: `Strong` / `Worth exploring` / `Speculative`.

Fecha com **Recomendacao principal**: qual atacar primeiro e por que.

O selo nao e enfeite — e o que impede o relatorio de tratar 12 candidatos como equivalentes.

### Passo 5: o vocabulario no card (INV-01 do plano)

Vocabulario de **dominio** vem do `docs/GLOSSARY.md` quando existir; vocabulario de **arquitetura**
vem do plano02.

Se o glossario define "Pedido", o card fala do "modulo de entrada de Pedido" — nao do
"FooBarHandler", e nao do "servico de Pedido".

Nota: `docs/GLOSSARY.md` so existe depois do plano05. Ate la, o card usa o vocabulario de arquitetura
e os nomes que o codigo ja usa. **Degradar, nao quebrar.**

### Passo 6: card de conflito com ADR

Quando o candidato contradiz um ADR (fase-01 Passo 6), o card carrega callout de aviso visualmente
distinto — nao uma linha perdida no meio do texto. O leitor precisa ver que ha uma decisao registrada
sendo questionada.

### Passo 7: conferir no navegador

O output e visual; leitura de codigo nao verifica isso. Abrir de verdade e olhar:

- os diagramas renderizaram (Mermaid via CDN exige rede — se falhar, o card fica quebrado?)
- o before/after comunica sem precisar ler o texto do card
- os selos sao distinguiveis de relance
- a pagina nao rola horizontalmente

### Passo 8: degradacao sem rede

Mermaid vem de CDN (DI-23). Sem internet, os blocos nao renderizam.

Decidir o comportamento: fallback textual visivel, ou apenas aceitar? Registrar como
`DI-Plano07-fase02-offline`. O que **nao** pode acontecer e o card parecer completo com um buraco no
lugar do diagrama.

---

## Gotchas

- **G1** — `start` no Git Bash. Passo 2.
- **G2** — Caminho `/c/...` passado para `explorer.exe`. Precisa de `cygpath -w`.
- **G3** — `$TMPDIR` ausente no Git Bash. Passo 1.
- **G4** — Gravar o relatorio no repo por engano. INV-02 — e a razao de DI-24.
- **G5** — Blocos de codigo aninhados: o satelite carrega scaffold HTML **dentro** de markdown.
  Quadruple backticks (compound `2026-04-21`).
- **G6** — Diagrama que so repete o texto do card. O before/after tem que mostrar a **forma**, senao
  e enfeite caro.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Resolucao de tmpdir escrita e testada em Git Bash (`DI-Plano07-fase02-tmpdir` registrado)
- [ ] Abertura funciona em Git Bash, com `cygpath -w`
- [ ] Caminho absoluto impresso mesmo quando a abertura falha
- [ ] Satelite criado; scaffold **nao** esta inline na SKILL.md
- [ ] Card com os 6 campos + selo
- [ ] Secao de recomendacao principal
- [ ] Callout visual para conflito com ADR
- [ ] Degradacao sem glossario documentada (Passo 5)
- [ ] Comportamento offline decidido e registrado (Passo 8)
- [ ] `git status` limpo apos gerar um relatorio (INV-02)

### Conferencia visual (Passo 7)

- [ ] Relatorio real gerado neste repo e aberto no navegador
- [ ] Diagramas renderizam; before/after comunica sem o texto
- [ ] Selos distinguiveis de relance; sem rolagem horizontal

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- Gerar relatorio deixa `git status` limpo
- O arquivo existe no caminho impresso

**Por humano:**
- O relatorio abriu no navegador, nesta maquina, sem passo manual
- Olhar o before/after de um candidato e entender a mudanca antes de ler o card
- Saber qual candidato atacar primeiro sem reler tudo

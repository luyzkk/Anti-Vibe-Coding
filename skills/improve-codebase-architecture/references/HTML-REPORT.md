# Formato do Relatorio HTML

Alcancado pelo Passo 5 da [SKILL.md](../SKILL.md), quando os candidatos ja existem e falta renderizar.

Um arquivo HTML **auto-contido**, gravado no temp do sistema operacional e aberto no navegador. Nada
entra no repo: o relatorio envelhece em dias, e o que sobrevive e o candidato que o humano escolheu.

## Onde gravar

```bash
out="${TMPDIR:-/tmp}/architecture-review-$(date +%Y%m%d-%H%M%S).html"
```

Uma expressao cobre as tres plataformas. `$TMPDIR` existe no macOS e em boa parte dos Linux; onde
nao existe, `/tmp` responde. **Em Git Bash no Windows `/tmp` resolve para o proprio `%TEMP%` do
usuario** — medido nesta maquina: `C:\Users\<user>\AppData\Local\Temp`, o mesmo caminho que `$TEMP`
e `$TMP` apontam. Nao ha branch de Windows a escrever aqui.

O timestamp no nome da a cada run um arquivo proprio, entao duas varreduras no mesmo dia nao se
sobrescrevem.

## Como abrir

```bash
if   command -v wslview     >/dev/null 2>&1; then wslview "$out"
elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$(cygpath -w "$out")" || true
elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$out"
elif command -v open        >/dev/null 2>&1; then open "$out"
fi
printf 'Relatorio: %s\n' "$out"
```

Duas coisas nao obvias, ambas custaram bug antes:

- **`start` nao existe em Git Bash** — e builtin do `cmd`, nao um executavel no PATH. E `explorer.exe`
  nao entende caminho POSIX: `/c/Users/...` precisa virar `C:\Users\...` por `cygpath -w`.
- **`explorer.exe` sai com codigo 1 mesmo tendo aberto o navegador** — medido em Windows 11 / Git
  Bash e corrigido antes em [`wizard/template.sh`](../../wizard/template.sh) (a fonte da medicao). Sem o
  `|| true`, todo open bem-sucedido reporta falha.

**Imprima o caminho absoluto sempre**, abrindo ou nao. Quando a abertura falha, o arquivo continua
la — e a linha impressa e a unica forma de alcanca-lo.

## Scaffold

Tailwind e Mermaid vem de CDN. As duas unicas coisas que executam na pagina sao elas; o relatorio e
estatico fora a renderizacao dos diagramas.

**Sobre `integrity`/SRI:** nao se aplica limpo aqui — o Play CDN do Tailwind serve script que gera CSS
em runtime, e `import()` dinamico de modulo nao aceita o atributo. O que resta e a versao pinada
(`mermaid@11`), e a consciencia de que a pagina carrega paths e a leitura da arquitetura do repo:
num codebase onde isso e sensivel, gere o relatorio **sem os dois CDNs** — o piso de CSS inline
abaixo mantem a pagina legivel, e os diagramas viram o proprio fonte, que e o mesmo modo degradado
descrito adiante.

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revisao de arquitetura — {{repo}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      // Sem rede o import estoura. Marcar o documento faz a pagina admitir o modo degradado
      // em vez de mostrar um buraco onde deveria haver diagrama.
      try {
        const { default: mermaid } = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
        mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
      } catch {
        document.documentElement.dataset.offline = "true";
      }
    </script>
    <style>
      /* Piso de legibilidade: se o CDN do Tailwind tambem falhar, a pagina ainda le. */
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.6; }
      main { max-width: 64rem; margin: 0 auto; padding: 3rem 1.5rem; }
      pre  { overflow-x: auto; }
      /* Diagramas fora de grafo: seam tracejado, vazamento vermelho, modulo deep escuro. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
      /* Modo offline: a faixa aparece e o fonte do diagrama vira bloco de codigo legivel. */
      .offline-note { display: none; }
      [data-offline] .offline-note { display: block; }
      [data-offline] pre.mermaid {
        display: block; white-space: pre; font-family: ui-monospace, monospace;
        font-size: 0.75rem; background: #f1f5f9; padding: 0.75rem; border-radius: 0.5rem;
      }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900">
    <main class="space-y-12">
      <p class="offline-note rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900">
        Sem rede: os diagramas aparecem como codigo-fonte, nao como desenho.
      </p>
      <header>...</header>
      <section id="candidatos" class="space-y-10">...</section>
      <section id="recomendacao">...</section>
    </main>
  </body>
</html>
```

O `<pre class="mermaid">` degrada sozinho: sem o script, o navegador mostra o texto do diagrama, que
e um flowchart legivel. A faixa existe para o leitor saber **por que** esta vendo texto — card com
buraco silencioso parece card quebrado.

## Header

Nome do repo, data, e uma legenda compacta: caixa solida = modulo, linha tracejada = seam, seta
vermelha = vazamento, caixa grossa escura = modulo deep. Sem paragrafo de introducao — direto nos
candidatos.

## O card

Um `<article>` por candidato, com os campos que o Passo 5 da [SKILL.md](../SKILL.md) define. Os
diagramas carregam o peso; a prosa e curta e usa os termos sem cerimonia. Aqui fica so a forma:

| Campo | Forma |
|---|---|
| Titulo | Nomeia o aprofundamento, nao o arquivo — *"Colapsar a entrada de Pedido"* |
| Forca | Selo colorido: `Strong` esmeralda · `Worth exploring` ambar · `Speculative` ardosia |
| Categoria de dependencia | Segundo selo, neutro: `in-process`, `local-substituivel`, `port & adapter`, `mock` |
| Arquivos | `font-mono text-sm`, um por linha |
| Before / After | O centro do card: duas colunas, lado a lado |
| Problema · Solucao | Uma frase cada |
| Deletion test | Uma linha, o veredito |
| Beneficios | Bullets de ate 6 palavras |
| Conflito com ADR | Caixa ambar, quando aplicavel |

Sem paragrafo de explicacao. Diagrama que precisa de um paragrafo para ser entendido pede outro
diagrama, nao mais texto.

O **callout de ADR** e caixa, nao linha no meio do corpo: o leitor precisa ver de relance que ha uma
decisao registrada sendo questionada. Uma linha, com numero e a razao de reabrir.

## Padroes de diagrama

Escolha o que serve ao candidato, e misture — todos os cards com o mesmo desenho viram papel de
parede.

**Mermaid quando a relacao e de grafo.** Call graph, dependencia, sequencia. `flowchart` para "X
chama Y chama Z, e olha a bagunca"; `sequenceDiagram` para "antes: 6 idas e voltas; depois: 1".
Envolva num card Tailwind para nao parecer paraquedado, e use `classDef` para pintar a aresta de
vazamento de vermelho e o modulo deep de escuro.

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[Entrada de Pedido] --> B[Validador]
      B --> C[Repositorio]
      C -.vaza.-> D[Cliente de Preco]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

**Div e SVG a mao quando se quer algo editorial.** Modulos como `<div>` com borda e rotulo; setas
como `<line>`/`<path>` SVG posicionados sobre um container relativo. E o caminho quando o "depois"
precisa parecer **um** modulo deep de borda grossa com as tripas apagadas dentro — Mermaid nao
desenha isso com o peso certo. Tres formatos que funcionam:

- **Corte transversal** — bandas horizontais (`h-12 border-l-4`) mostrando as camadas que uma chamada
  atravessa. Antes: 6 bandas finas sem fazer nada. Depois: 1 banda grossa com a responsabilidade.
- **Diagrama de massa** — dois retangulos por modulo, um para a superficie da interface, outro para a
  implementacao. Antes: interface quase tao alta quanto a implementacao (shallow). Depois: interface
  baixa, implementacao alta (deep).
- **Colapso de call graph** — antes, arvore de chamadas em caixas aninhadas; depois, a mesma arvore
  colapsada numa caixa, com as chamadas agora internas esmaecidas dentro dela.

## Estilo

- Editorial, nao dashboard corporativo. Espaco em branco generoso. `font-serif` nos titulos combina
  com stone/slate.
- Uma cor de acento (esmeralda ou indigo), mais vermelho para vazamento e ambar para aviso. So.
- Diagramas com ~320px de altura, para o before/after caber lado a lado sem rolagem.
- Rotulo de modulo dentro do diagrama em `text-xs uppercase tracking-wider` — deve ler como
  esquematico, nao como UI.
- A pagina rola na vertical. O que for largo demais (diagrama, tabela) rola **dentro** do proprio
  container.

## Recomendacao principal

Um card maior, no fim: o nome do candidato, uma frase de por que ele primeiro, e ancora para o card
dele. So isso.

## Vocabulario do card

Arquitetura vem de [deep-modules.md](../../tdd-workflow/references/deep-modules.md). Dominio vem do
`docs/GLOSSARY.md` do projeto, quando existir — se o glossario define "Pedido", o card fala do
**modulo de entrada de Pedido**. Onde nao houver glossario, valem os nomes que o codigo ja usa:
**degradar, nao quebrar.**

| Quando o card quer dizer | Escreva |
|---|---|
| A peca de codigo | **modulo** |
| Tudo que o caller precisa saber para usar | **interface** |
| Onde a interface mora, e onde se troca o comportamento | **seam** |
| A coisa concreta que preenche o slot no seam | **adapter** |
| Interface quase tao complexa quanto a implementacao | **shallow** |
| Interface simples escondendo implementacao rica | **deep** |
| O que o caller ganha por unidade de interface aprendida | **leverage** |
| O que o mantenedor ganha: mudanca e bug num lugar so | **locality** |

Frases que caem bem no formato: *"A entrada de Pedido e shallow — a interface quase repete a
implementacao."* · *"Preco vaza pelo seam."* · *"Aprofundar: uma interface, um lugar para testar."* ·
*"Dois adapters justificam o seam: HTTP em producao, em memoria no teste."*

Os bullets de **Ganhos** nomeiam o ganho nesses termos — *"locality: bugs concentram num modulo"*,
*"leverage: uma interface, N call sites"*, *"a interface encolhe; a implementacao absorve os
wrappers"*. *"Mais facil de manter"* e *"codigo mais limpo"* nao dizem qual dos dois retornos
apareceu, e e essa distincao que faz o card valer.

Se uma frase cabe num bullet, faca bullet. Se um bullet cabe fora, corte.

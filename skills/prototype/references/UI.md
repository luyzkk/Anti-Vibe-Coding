# Prototipo UI

Alcancado pelo roteador de ramo da [SKILL.md](../SKILL.md) quando a pergunta e **como isso deveria
parecer**.

O que sai daqui: **varias variantes radicalmente diferentes numa mesma rota**, trocaveis por uma
barra flutuante no rodape. A pessoa alterna no navegador, escolhe uma — ou rouba pedacos de cada — e
joga o resto fora.

Quando a pergunta e sobre logica ou estado, o ramo e outro: [LOGIC.md](./LOGIC.md).

## Quando esta e a forma certa

- *"como essa tela deveria ser?"*
- *"quero ver algumas opcoes desse dashboard antes de me comprometer."*
- *"tenta um layout diferente para a tela de configuracoes."*
- Sempre que a alternativa for passar um dia escolhendo entre tres mockups vagos na propria cabeca.

## As duas sub-formas

Prototipo de UI e **muito mais facil de julgar encostado no resto do app** — header real, sidebar
real, dados reais, densidade real. Rota isolada e vacuo, e **toda variante parece boa no vacuo**.
Por isso a sub-forma A e o default sempre que existir uma pagina plausivel para hospedar as
variantes.

### Sub-forma A — ajuste numa pagina existente (preferida)

A rota ja existe. As variantes renderizam **na mesma rota**, decididas por um search param
`?variant=`. Data fetching, params e auth continuam de pe — so a renderizacao troca.

Vale tambem para o que ainda nao tem pagina mas **viveria naturalmente dentro de uma**: secao nova do
dashboard, card novo na tela de configuracoes, passo novo num fluxo existente. Montar as variantes
dentro da pagina hospedeira.

### Sub-forma B — pagina nova (ultimo recurso)

So quando a coisa prototipada genuinamente nao tem onde morar — superficie inteiramente nova, ou
fluxo que nao encaixa em lugar nenhum.

Rota descartavel seguindo a **convencao de roteamento que o projeto ja usa**, com nome que denuncia
que e prototipo (a palavra `prototipo` no path ou no arquivo). Mesmo padrao de `?variant=`.

Antes de fechar em B, a checagem que economiza a fase inteira: *nao ha mesmo pagina onde isso
poderia ser embutido?* Rota vazia esconde problema de design que uma populada exporia.

A barra flutuante e identica nas duas.

## 1. Enunciar a pergunta e escolher N

**3 variantes** por padrao. Acima de **5** elas param de ser radicalmente diferentes e viram ruido —
o teto e ali.

O plano vai escrito em uma linha, no local do prototipo ou em comentario de topo:

> *"Tres variantes da tela de configuracoes, trocaveis por `?variant=`, na rota `/settings`
> existente."*

Serve tanto com o usuario presente para discordar quanto sem.

## 2. Gerar variantes estruturalmente diferentes

Cada variante responde a tres coisas: o **proposito da pagina** e os dados a que ela tem acesso; o
**sistema de componentes do projeto** (Tailwind, shadcn, MUI, CSS puro — o que for); e um **nome de
componente exportado claro** (`VariantA`, `VariantB`, `VariantC`).

E a regra que faz este ramo valer alguma coisa: variantes **discordam sobre estrutura** — layout
diferente, hierarquia de informacao diferente, affordance primaria diferente. *Tres grades de card
levemente ajustadas nao sao tres variantes; sao uma, repintada.*

Se dois rascunhos sairem parecidos, refazer um com instrucao explicita — *"nao use grade de cards"*.

## 3. Ligar as variantes

Um switcher unico na rota:

```tsx
// pseudo-codigo — adaptar ao framework do projeto
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A', 'B', 'C']} current={variant} />
  </>
);
```

Na **sub-forma A**, todo o data fetching existente fica **acima** do switcher; so a subarvore
renderizada muda por variante. Na **sub-forma B**, a rota descartavel monta o mesmo switcher.

## 4. A barra flutuante

Barra fixa no rodape, ao centro, com tres pecas: **seta esquerda** (cicla para tras, com wrap) ·
**rotulo** da variante atual, com o nome quando houver (`B — layout com sidebar`) · **seta direita**.

| Comportamento | Detalhe que evita bug |
|---|---|
| Clicar atualiza o search param | Pelo **router do framework** (`router.replace` no Next, `navigate` no React Router), para a variante ser compartilhavel por URL e sobreviver ao reload |
| `←` e `→` tambem ciclam | Ignorar as setas quando `<input>`, `<textarea>` ou `[contenteditable]` estiver focado — senao a barra rouba a digitacao de qualquer formulario da pagina |
| Visualmente distinta da pagina | Pilula de alto contraste, sombra sutil: precisa ficar obvio que ela **nao** faz parte do design em avaliacao |
| Invisivel em producao | Gate em `process.env.NODE_ENV !== 'production'`, ou o equivalente do framework. Merge acidental nao pode mandar a barra ao usuario |

Componente unico e compartilhado, onde o projeto guarda UI compartilhada, para as duas sub-formas
reusarem.

## 5. Entregar

Passar a URL e as chaves de `?variant=`. A pessoa alterna quando puder.

O retorno mais valioso costuma ser *"quero o header da B com a sidebar da C"* — **esse** e o design
que ela quer, e ele so aparece porque as tres discordavam sobre estrutura.

## 6. Capturar

Vencida uma variante, capturar a resposta — qual e por que — e entao seguir as regras da
[SKILL.md](../SKILL.md):

- **Sub-forma A** — dobrar a vencedora na pagina existente; tirar as perdedoras e a barra da `main`.
- **Sub-forma B** — promover a vencedora a rota real; tirar a rota descartavel e a barra da `main`.

O **conjunto completo** de variantes e fonte primaria: vai para a branch descartavel, nao para o
lixo. Variante e switcher esquecidos na `main` apodrecem rapido e confundem o proximo leitor.

## Anti-padroes

- **Variantes que diferem so em cor ou copy.** Isso e ajuste. Variante de verdade discorda sobre
  estrutura.
- **Codigo compartilhado demais.** Um `<Header>` compartilhado tudo bem; um `<Layout>` compartilhado
  anula o exercicio — cada variante precisa poder jogar o layout fora.
- **Variante ligada a mutation real.** Somente leitura; o que precisar mutar aponta para stub. A
  pergunta e *como deveria parecer*, nao *o backend funciona*.
- **Prototipo promovido direto.** O codigo foi escrito sob restricao de prototipo — sem teste,
  tratamento de erro minimo. Ao dobrar para dentro, **reescrever direito**.

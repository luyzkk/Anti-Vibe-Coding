# Os 9 Code Smells

Referencia detalhada para identificacao e correcao de code smells.

---

## 1. Funcoes Longas (> 100 linhas)

**Conceito:** Uma funcao com mais de 100 linhas esta fazendo coisas demais. Cada funcao deve ter UMA responsabilidade clara.

**Anti-pattern:**
```
funcao processarPedido(pedido):
    // 40 linhas validando dados
    // 30 linhas calculando preco
    // 20 linhas aplicando desconto
    // 30 linhas salvando no banco
    // 20 linhas enviando email
```

**Como verificar:**
- Contar as linhas de cada funcao. Passou de 100? Refatorar.
- Se existem comentarios separando "secoes" dentro da funcao, cada secao deveria ser uma funcao propria.
- Usar `Grep` para encontrar funcoes longas no codebase.

**Direcao:** Extrair cada bloco logico em funcoes menores com nomes descritivos. O nome da funcao substitui o comentario.

---

## 2. God Objects

**Conceito:** Uma classe que faz tudo -- valida, calcula, salva, envia email, gera relatorio. Ela conhece o sistema inteiro.

**Anti-pattern:**
```
classe GerenciadorDePedidos:
    validarCliente()
    calcularFrete()
    processarPagamento()
    enviarEmail()
    gerarRelatorio()
    atualizarEstoque()
    notificarFornecedor()
```

**Como verificar:**
- A classe tem mais de 10 metodos publicos?
- Ela importa/depende de mais de 5 modulos diferentes?
- Mudancas em qualquer parte do sistema exigem mexer nessa classe?

**Direcao:** Composicao + servicos separados. Cada responsabilidade vira um servico injetado. O "gerenciador" orquestra, nao executa.

---

## 3. Violacao DRY (Regra de 3)

**Conceito:** Codigo duplicado em 3 ou mais lugares DEVE ser abstraido. Em 2 lugares, pode ser aceitavel -- abstrair cedo demais cria acoplamento desnecessario.

**Anti-pattern:**
```
// arquivo1.js
usuario.nome = entrada.nome.trim().toLowerCase()
usuario.email = entrada.email.trim().toLowerCase()

// arquivo2.js  (mesma logica)
cliente.nome = dados.nome.trim().toLowerCase()

// arquivo3.js  (mesma logica de novo)
fornecedor.nome = input.nome.trim().toLowerCase()
```

**Como verificar:**
- Usar `Grep` para buscar padroes de codigo repetidos.
- Se copia e cola esta acontecendo, esta criando divida tecnica.
- CUIDADO: nao abstrair na segunda ocorrencia. Esperar a terceira.

**Direcao:** Criar funcao utilitaria so quando o padrao aparecer pela terceira vez. Abstrair cedo demais e pior que duplicar.

---

## 4. Condicionais Gigantes

**Conceito:** Cadeias de if-elif-else com 5+ ramos sao dificeis de ler, testar e manter. Cada novo caso exige mexer na mesma funcao.

**Anti-pattern:**
```
se tipo == "A":
    fazer_coisa_a()
senao se tipo == "B":
    fazer_coisa_b()
senao se tipo == "C":
    fazer_coisa_c()
// ... 15 ramos depois
```

**Como verificar:**
- Mais de 3 ramos em um if-elif-else? Considerar refatorar.
- A funcao cresce toda vez que um novo tipo aparece? Problema.

**Direcao:** Usar HashMaps/dicionarios para mapear tipo -> acao. Ou polimorfismo -- cada tipo sabe executar sua propria logica.

```
acoes = {
    "A": fazer_coisa_a,
    "B": fazer_coisa_b,
    "C": fazer_coisa_c,
}
acoes[tipo]()
```

---

## 5. Numeros Magicos

**Conceito:** Valores literais no meio do codigo sem explicacao. Ninguem sabe por que esta ali. Muda em um lugar, esquece no outro.

**Anti-pattern:**
```
se idade < 18:
    rejeitar()

se tentativas > 3:
    bloquear()

preco * 0.85
```

**Como verificar:**
- Tem um numero literal dentro de uma condicao ou calculo?
- Alguem novo no time saberia o que "18", "3" ou "0.85" significam?

**Direcao:** Extrair para constantes nomeadas do dominio:

```
IDADE_MINIMA_CONSUMO_ALCOOL_BR = 18
MAX_TENTATIVAS_LOGIN = 3
DESCONTO_BLACK_FRIDAY = 0.85
```

---

## 6. Feature Envy

**Conceito:** Um metodo que usa mais dados de OUTRA classe do que da sua propria. Ele esta "invejando" a outra classe.

**Anti-pattern:**
```
classe Relatorio:
    calcularBonus(funcionario):
        retornar funcionario.salario * funcionario.performance * funcionario.senioridade
```

**Como verificar:**
- O metodo acessa 3+ atributos de outro objeto?
- Se a estrutura do outro objeto mudar, esse metodo quebra?

**Direcao:** Mover a logica para a classe dona dos dados. `funcionario.calcularBonus()` -- quem tem os dados faz o calculo.

---

## 7. Grupos de Dados (Data Clumps)

**Conceito:** Variaveis que SEMPRE aparecem juntas -- latitude/longitude, nome/email/telefone, inicio/fim. Se uma vai, as outras vao junto.

**Anti-pattern:**
```
funcao criarEvento(nome, dataInicio, dataFim, horaInicio, horaFim):
funcao validarEvento(nome, dataInicio, dataFim, horaInicio, horaFim):
funcao salvarEvento(nome, dataInicio, dataFim, horaInicio, horaFim):
```

**Como verificar:**
- Mesmos 3+ parametros aparecem juntos em multiplas funcoes?
- Esses valores sao sempre passados como grupo?

**Direcao:** Criar data class / struct / named tuple:

```
classe PeriodoEvento:
    dataInicio, dataFim, horaInicio, horaFim

funcao criarEvento(nome, periodo: PeriodoEvento):
```

---

## 8. Comentarios Inuteis

**Conceito:** Comentarios que repetem o que o codigo ja diz. Codigo bom e autoexplicativo. Comentarios devem explicar o PORQUE, nunca o COMO.

**Anti-pattern:**
```
// Incrementa o contador
contador = contador + 1

// Verifica se usuario e admin
se usuario.role == "admin":

// Retorna o resultado
retornar resultado
```

**Como verificar:**
- Deletar o comentario. O codigo continua claro? Entao o comentario era inutil.
- O comentario explica uma decisao de negocio ou restricao nao-obvia? Entao e util.

**Direcao:** Comentarios bons explicam decisoes e restricoes:

```
// Limite de 30 dias exigido pela LGPD para retencao de logs
DIAS_RETENCAO = 30

// Fallback para API legada que nao suporta pagination
se !resposta.nextPage:
    buscarTudo()
```

---

## 9. Obsessao por Tipos Primitivos

**Conceito:** Usar string para email, string para CPF, number para dinheiro. Sem validacao, sem garantia, bugs em toda parte.

**Anti-pattern:**
```
funcao enviarEmail(para: string, assunto: string):
    // "para" pode ser "banana" -- nenhuma validacao
    // Bug descoberto em producao
```

**Como verificar:**
- Parametros genericos demais (string, number) para conceitos de dominio?
- Validacao do mesmo campo espalhada em 5 lugares?

**Direcao:** Criar tipos de dominio com validacao embutida na construcao. Ver `references/domain-types.md` para detalhes completos.

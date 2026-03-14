# Result Pattern vs Try/Catch

Referencia detalhada para tratamento de erros com Result Pattern.

---

## Conceito

Try/catch funciona como um Go To -- interrompe o fluxo normal e pula para outro lugar do codigo. O Result Pattern forca o chamador a lidar com o erro EXPLICITAMENTE.

---

## Anti-pattern: Try/Catch que engole erros

```
tentar:
    resultado = processarPagamento()
    // 50 linhas de logica
capturar erro:
    console.log("deu ruim")  // Engoliu o erro. Ninguem sabe o que aconteceu.
```

Problemas:
- Erro silenciado -- nao aparece em monitoring
- Chamador nao sabe que falhou
- Debugging impossivel em producao
- Fluxo continua como se nada tivesse acontecido

---

## Principios do Result Pattern

### 1. Funcoes retornam `(error, value)`

```
funcao buscarUsuario(id):
    se naoExiste:
        retornar (ErroNaoEncontrado, nulo)
    retornar (nulo, usuario)
```

O retorno SEMPRE tem dois campos. O chamador DEVE verificar qual veio preenchido.

### 2. Chamador OBRIGADO a verificar

```
(erro, usuario) = buscarUsuario(123)
se erro:
    lidarComErro(erro)
    retornar
// continuar com usuario -- garantidamente existe aqui
```

Diferente de try/catch, nao ha como "esquecer" de tratar o erro. O compilador/linter pode enforcar.

### 3. Try/catch: confinar a funcao que PODE falhar

Quando e necessario usar try/catch (I/O, rede, filesystem), confinar o bloco ao minimo possivel e converter para Result:

```
funcao lerArquivoSeguro(caminho):
    tentar:
        retornar (nulo, lerArquivo(caminho))
    capturar erro:
        retornar (ErroLeitura(caminho, erro), nulo)
```

O try/catch fica DENTRO da funcao utilitaria. O resto do sistema usa Result Pattern.

### 4. NUNCA engolir erros desconhecidos

```
capturar erro:
    se erro instanceof ErroPagamento:
        lidarComErroPagamento(erro)
    senao:
        relancar erro  // Erro desconhecido -- propagar!
```

Regra: so capturar erros que SABE tratar. Erros desconhecidos DEVEM subir para o handler global.

### 5. Custom Errors para problemas diferentes

```
classe ErroValidacao extends Erro
    campo: string
    valorRecebido: any
    regra: string

classe ErroPagamentoRecusado extends Erro
    codigoBandeira: string
    motivo: string

classe ErroLimiteExcedido extends Erro
    limiteAtual: number
    valorTentado: number
```

Cada erro carrega dados relevantes para debug e monitoring. NUNCA usar `new Error("algo deu errado")` generico.

---

## Verificacao no codebase

Usar `Grep` para identificar problemas:

- **Catch que engole:** Buscar blocos catch que so fazem `console.log` ou `console.error`
- **Catch vazio:** Buscar `catch` seguido de bloco vazio `{}`
- **Erros genericos:** Buscar `new Error(` com mensagens vagas
- **Erros nao relancados:** Verificar se erros desconhecidos estao sendo relancados

### Padroes de busca sugeridos:
```
Grep: catch.*console\.(log|error)
Grep: catch.*\{\s*\}
Grep: new Error\(
```

# Tipos de Dominio

Referencia detalhada para criacao de tipos de dominio com validacao embutida.

---

## Conceito

Valores importantes do dominio (email, CPF, dinheiro, telefone) NAO devem ser strings/numbers soltos. Criar tipos com validacao embutida na construcao. Se o objeto existe, ele e VALIDO.

---

## Anti-pattern: Primitivos soltos

```
funcao criarUsuario(email: string, cpf: string, telefone: string):
    // email pode ser "abc" -- sem validacao
    // cpf pode ser "123" -- sem validacao
    // telefone pode ser "banana" -- sem validacao
    salvar({ email, cpf, telefone })
    // Bug: dados invalidos no banco
```

Problemas:
- Nenhuma garantia de validade
- Validacao espalhada em N lugares (controller, service, model)
- Bugs descobertos em producao
- Funcoes aceitam qualquer string -- type system nao ajuda

---

## Padrao correto: Tipo com validacao na construcao

### Email
```
classe Email:
    construtor(valor):
        se nao validarFormatoEmail(valor):
            lancar ErroEmailInvalido(valor)
        este.valor = valor.toLowerCase().trim()
```

### CPF
```
classe CPF:
    construtor(valor):
        limpo = removerMascara(valor)
        se nao validarDigitosCPF(limpo):
            lancar ErroCPFInvalido(valor)
        este.valor = limpo
```

### Dinheiro
```
classe Dinheiro:
    construtor(centavos: inteiro, moeda: string):
        se centavos < 0:
            lancar ErroValorNegativo(centavos)
        este.centavos = centavos
        este.moeda = moeda

    somar(outro: Dinheiro):
        se este.moeda != outro.moeda:
            lancar ErroMoedasDiferentes(este.moeda, outro.moeda)
        retornar novo Dinheiro(este.centavos + outro.centavos, este.moeda)
```

---

## Regras de ouro

### 1. Validacao na ENTRADA
Transformar o primitivo em tipo no momento que ele entra no sistema (controller, API boundary):

```
// ENTRADA: string -> tipo
email = novo Email(request.body.email)  // Valida aqui
cpf = novo CPF(request.body.cpf)        // Valida aqui
```

### 2. Tipo dentro do sistema
Todo o codigo interno trabalha com o tipo. Impossivel passar valor invalido:

```
// DENTRO DO SISTEMA: tipo
usuario = criarUsuario(email, cpf)  // Impossivel ser invalido
enviarBoasVindas(email)             // Garantido ser email valido
```

### 3. Converter na SAIDA
Ao enviar para API externa ou banco, extrair o valor primitivo:

```
// SAIDA: tipo -> string
apiExterna.enviar({ email: usuario.email.valor })
banco.salvar({ cpf: usuario.cpf.valor })
```

---

## Tipos criticos que DEVEM ter classes proprias

| Tipo | Regra | Por que |
|------|-------|---------|
| **Dinheiro** | NUNCA float. Usar inteiros (centavos) ou lib de precisao | `0.1 + 0.2 !== 0.3` em floating point |
| **Email** | Validacao de formato + lowercase + trim | Duplicatas por case, espacos |
| **CPF/CNPJ** | Validacao de digitos verificadores | CPFs invalidos passam por regex simples |
| **Telefone** | Formato + DDD + codigo pais | Formatos variam por pais |
| **CEP** | Formato + validacao de existencia | CEPs inexistentes causam erro em frete |
| **UUID/ID** | Formato + unicidade | Prevenir colisoes e IDs invalidos |

---

## Verificacao no codebase

- **Primitivos no dominio:** Buscar `email: string` em interfaces e tipos
- **Validacao espalhada:** Verificar se validacao de email/CPF aparece em multiplos arquivos
- **Dinheiro como float:** Buscar `parseFloat` ou operacoes aritmeticas com valores monetarios
- **Strings genericas:** Buscar parametros `string` que representam conceitos de dominio

### Padroes de busca sugeridos:
```
Grep: email:\s*string
Grep: cpf:\s*string
Grep: parseFloat.*preco|valor|total
Grep: price:\s*number|amount:\s*number
```

---
name: incident-response
description: Fluxo disciplinado de resposta a incidentes pós-deploy. Raw logs → hipótese → regression test (ANTES do fix) → fix → commit. Cada fix vem com regression test — hardening é hábito, não fase.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
argument-hint: "[log ou descrição do incidente]"
---

# Skill: /anti-vibe-coding:incident-response

Resposta disciplinada a incidentes pós-deploy.

## Princípio

> "Cada fix vem com regression test. Hardening não é uma fase — é um hábito que começa no primeiro bug."

O fluxo obrigatório é: **logs brutos → hipótese → regression test → fix → commit**.  
O teste vem antes do fix para que a correção prove que o bug foi realmente eliminado — não apenas escondido.

## Fluxo

### Etapa 1 — Ingestão de Logs Brutos

```
Se o usuário não colou logs:
  Perguntar: "Cole o output do console, stack trace ou log de erro completo."
  NÃO prosseguir sem dados brutos — suposições não resolvem incidentes.

Se colou logs:
  Ler os logs literalmente.
  Identificar: tipo de erro, linha de origem, contexto de request (se disponível).
  NÃO perseguir teorias antes de rastrear o erro real.
```

### Etapa 2 — Formular Hipótese

```
Apresentar hipótese com:
  1. Causa raiz provável (baseada nos logs, não em intuição)
  2. Arquivo(s) suspeitos
  3. Condição que disparou o bug (ex: payload vazio, concorrência, timeout)

Perguntar ao dev: "Esta hipótese faz sentido com o que você viu em produção?"
Aguardar confirmação antes de escrever qualquer código.
```

### Etapa 3 — Regression Test (ANTES do fix)

```
Escrever teste que:
  - Reproduz a condição exata do incidente
  - FALHA com o código atual (RED obrigatório)
  - Tem nome descritivo: "returns 500 when payload is empty" (sem "should")

Executar: bun run test [arquivo de teste]
Confirmar que o teste está vermelho ANTES de prosseguir.

Se o teste passar sem fix → hipótese errada. Voltar à Etapa 2.
```

### Etapa 4 — Fix Cirúrgico

```
Implementar correção mínima:
  - Só o necessário para o regression test ficar verde
  - Sem refatorações oportunistas neste momento
  - Sem "melhorias" adjacentes — foco total no incidente

Executar: bun run test
Confirmar: regression test verde + suite completa verde.
```

### Etapa 5 — Hardening (hábito, não fase)

```
Após o teste verde, avaliar:
  - Existe outra entrada que causaria o mesmo bug? Adicionar caso ao teste.
  - Existe validação de entrada ausente? Adicionar guard.
  - Existe tratamento de erro ausente? Adicionar com observabilidade.

Regra: se a correção levou < 10 min, provavelmente o hardening vai levar mais.
Isso é esperado e correto.
```

### Etapa 6 — Commit

```
Formato de commit:
  fix(escopo): descrição concisa do que foi corrigido

  - Causa raiz: [uma linha]
  - Regression test: [nome do arquivo de teste]

Exemplo:
  fix(auth): previne panic em JWT com payload vazio

  - Causa raiz: jwt.Parse não validava claims antes de acessar sub
  - Regression test: auth.test.ts > returns 401 when JWT payload is empty
```

## Sinais de Alerta

| Sinal | O que fazer |
|-------|-------------|
| Fix sem teste | Voltar à Etapa 3 |
| Teste que passou sem fix | Hipótese errada — reler logs |
| Múltiplos arquivos modificados | Verificar se não é refatoração disfarçada |
| Commit sem mensagem de causa raiz | Reescrever o commit |
| "Vou adicionar o teste depois" | Não. O teste vem antes. |

## Autópsia Pós-Fix

Após o commit, responder:

1. **Por que aconteceu?** (causa técnica em uma frase)
2. **Por que passou pela revisão/testes existentes?** (gap de cobertura)
3. **O que previne esta categoria de bug no futuro?** (regra ou cobertura nova)

Se a autópsia revelar um padrão recorrente, registrar via `/anti-vibe-coding:lessons-learned add`.

## Ação Solicitada

$ARGUMENTS

---
name: todo-pick
description: Lista micro-débito do TODO.md e puxa 1 item por vez para correção. Sub-comandos: --skip {n} marca como skipped, --remove {n} deleta linha com confirmação.
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Edit, Write, Bash
argument-hint: "[--skip {n}|--remove {n}]"
---

# /todo-pick

Puxa 1 item de micro-débito do TODO.md na raiz do projeto, propõe fix, marca como concluído.

## Quando usar

- Início de sessão curta para limpar pequenas dívidas técnicas
- Após `/execute-plan` adicionar items out-of-scope (CA-33)
- Pausa entre features substanciais (~10-15min)

## Fluxo principal (sem sub-comando)

```typescript
// 1. Localizar TODO.md na raiz do projeto
import * as path from 'path'
import { parse } from '../lib/todo-utils'
const todoMdPath = path.join(projectRoot, 'TODO.md')
// Se não existe: "TODO.md não encontrado. Rode /init para criar."

// 2. Parsear e filtrar pending (state === 'open')
const all = parse(todoMdPath)
const pending = all.filter(item => item.state === 'open')

// 3. Se vazio: emitir mensagem + completion signal e sair
if (pending.length === 0) {
  console.log('Nenhum item pending. TODO.md está limpo.')
  // + completion signal (ver seção abaixo)
  return
}

// 4. Imprimir lista numerada (1-based)
// ## TODO items pendentes (N)
// 1. {date} {classifier} {description}
// 2. ...

// 5. Perguntar: "Qual puxar agora? [1-N / 'r' para aleatório / 'q' para sair]"
// 'r' = Math.floor(Math.random() * pending.length) — sem expor estratégia no helper

// 6. Após escolha, propor fix (ver regras por classifier)

// 7. Após fix validado: marcar como done
import { markDone } from '../lib/todo-utils'
markDone(todoMdPath, chosen.lineIndex)  // lineIndex do arquivo, não índice da lista

// 8. Emitir completion signal
import { renderCompletionSignal } from '../lib/completion-signal'
console.log(renderCompletionSignal({
  skill: 'todo-pick',
  status: 'complete',
  outputs: ['./TODO.md'],
  next_suggested: null,
  blocks_for_user: [],
}))
```

## Regras por classifier após escolha

```typescript
if (classifier?.kind === 'file') {
  // ler path:line, mostrar trecho, propor edição
} else if (classifier?.kind === 'feature') {
  // pedir descrição detalhada antes de codar
} else {
  // classifier null (livre): pedir confirmação do contexto
}
```

## Sub-comando `--skip {n}` (CA-44)

```typescript
// n é 1-based (input do usuário)
// Validar: n >= 1 && n <= pending.length
// lineIndex = pending[n-1].lineIndex  (tradução 1-based → 0-based do arquivo)
import { skip } from '../lib/todo-utils'
skip(todoMdPath, lineIndex)
// Sem confirmação (reversível — usuário edita [-] de volta se quiser)
// Emitir completion signal
import { renderCompletionSignal } from '../lib/completion-signal'
console.log(renderCompletionSignal({
  skill: 'todo-pick',
  status: 'complete',
  outputs: ['./TODO.md'],
  next_suggested: null,
  blocks_for_user: [],
}))
```

## Sub-comando `--remove {n}` (CA-44, G8 — irreversível = confirmar)

```typescript
// 1. Validar n e resolver lineIndex
// 2. Mostrar linha que será removida
// 3. Confirmar: "Tem certeza? [s/N]" (default N)
// 4. Se 's': remove(todoMdPath, lineIndex)
// 5. Se 'n': "Remoção cancelada"
// 6. Emitir completion signal em ambos os casos
import { remove } from '../lib/todo-utils'
import { renderCompletionSignal } from '../lib/completion-signal'
// status 'complete' independente de confirmar ou cancelar — ação foi processada
console.log(renderCompletionSignal({
  skill: 'todo-pick',
  status: 'complete',
  outputs: ['./TODO.md'],
  next_suggested: null,
  blocks_for_user: [],
}))
```

## Erros

```
- TODO.md ausente: "TODO.md não encontrado. Rode /init para criar."
- n fora de range: "Item N não existe. Há apenas X items pending."
- Sem sub-comando --add (07-A7) — fora de escopo v6.0.0
```

## Ação solicitada

$ARGUMENTS

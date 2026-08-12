---
fase: 02
plano: 10
status: planned
---

# Fase 02: O Script de Fronteira

**Plano:** 10 — `wayfinder`
**Sizing:** ~2.5h
**Depende de:** fase-01 (o formato do ticket e o input do script)
**Visual:** false

**Decisoes:** DI-33 (script computa a fronteira)
**Invariantes:** INV-01 (os tickets sao a fonte; o mapa e indice)

---

## O que esta fase entrega

`scripts/wayfinder-frontier.ts` — o que recupera o que a UI do tracker dava de graca.

Na fonte, o bloqueio usa a relacao nativa do tracker, e isso **renderiza a fronteira visualmente**:
o humano ve o que da para pegar sem abrir o mapa. Em markdown local isso se perde. O script devolve
— e, diferente da query do tracker, **e testavel**.

Mesmo padrao de `scripts/parity-audit.ts`, `compound-check.ts` e `harness-validate.ts`.

---

## Arquivos Afetados

**NOVOS**
- `scripts/wayfinder-frontier.ts`
- `scripts/wayfinder-frontier.test.ts`

**MODIFICADOS**
- `package.json` — entry `wayfinder:frontier`

**FORA do escopo**
- Escrever nos tickets. O script **le e imprime**; quem muta e o agente pelo modo work (fase-03)

---

## Implementacao

### Passo 1: RED — o teste antes

Fixtures em tmpdir, nunca contra o repo real (o repo muda; o teste nao pode).

Casos:

- ticket sem `blocked-by` e aberto → **na fronteira**
- ticket bloqueado por um ticket aberto → **fora**
- ticket bloqueado por um ticket **fechado** → na fronteira
- ticket bloqueado por dois, um fechado e um aberto → fora
- ticket aberto mas `claimed` → fora da fronteira (mas listado como reivindicado)
- ticket fechado → nunca na fronteira
- ticket marcado `out-of-scope` → nunca na fronteira, mesmo aberto
- `blocked-by` apontando para id inexistente → **erro claro**, nao ignorado em silencio
- ciclo de bloqueio (A bloqueia B, B bloqueia A) → **detectado e reportado**, nao loop infinito
- diretorio `tickets/` vazio ou ausente → saida vazia, sem estourar
- frontmatter com CRLF → parseado (compound `2026-05-19`)

Os dois ultimos casos de erro sao os que importam mais: id fantasma e ciclo sao exatamente o que
acontece quando o agente cria e liga em passadas separadas e erra no meio.

Nomes sem "should".

### Passo 2: GREEN — o script

Le `docs/exec-plans/{active,completed}/{esforco}/tickets/*.md`, parseia o frontmatter, resolve o
grafo.

Saida em tres blocos:

| Bloco | O que |
|---|---|
| **Fronteira** | aberto + desbloqueado + nao reivindicado. **O que da para pegar agora** |
| **Bloqueado** | aberto, com quais tickets faltam fechar |
| **Reivindicado** | aberto e em andamento em outra sessao |

Referir por **nome** (INV-04): titulo do ticket, com o caminho do arquivo entre parenteses. Nunca
uma parede de ids.

Aceita o caminho do esforco como argumento. Sem argumento, se houver exatamente um esforco ativo com
`MAP.md`, usa ele; se houver varios, lista e pede escolha.

### Passo 3: `package.json`

`"wayfinder:frontier": "bun run scripts/wayfinder-frontier.ts"`, junto de `parity:audit` e
`compound:check`.

O repo tem `tests/package-json-scripts.test.ts` — conferir se ele assevera a lista de scripts e
atualizar se sim.

### Passo 4: detectar divergencia entre mapa e tickets

Alem da fronteira, uma checagem barata que so existe porque os artefatos sao locais:

- ticket **fechado** que nao aparece em *Decisions so far* do mapa → aviso
- linha em *Decisions so far* apontando para ticket que nao existe → aviso

Isso guarda INV-01 de forma mecanica. Na fonte, tracker e mapa nao podiam divergir assim porque o
tracker era a fonte unica; aqui podem, entao a checagem se paga.

Aviso, nao erro — o mapa pode estar legitimamente a uma edicao de distancia.

### Passo 5: saida legivel de terminal

Sem cor obrigatoria, sem tabela que quebra em 80 colunas. Este script e lido no meio de uma sessao
de trabalho, nao num relatorio.

Se a fronteira estiver vazia e nao houver ticket aberto: dizer **"o caminho esta claro"** — e a
condicao de fim do mapa, e o script deve nomea-la em vez de imprimir nada.

---

## Gotchas

- **G1** — Testar contra o repo real. Fixtures em tmpdir.
- **G2** — Ignorar `blocked-by` fantasma em silencio. Erro claro.
- **G3** — Ciclo de bloqueio virando loop infinito.
- **G4** — CRLF no frontmatter (compound `2026-05-19`).
- **G5** — Script escrevendo nos tickets. Le e imprime; quem muta e o agente.
- **G6** — Esquecer `tests/package-json-scripts.test.ts` se ele asseverar a lista.
- **G7** — Fronteira vazia imprimindo nada. E o fim do mapa; tem que ser dito.

---

## Verificacao

### TDD

RED (passo 1, incluindo os casos de erro) → GREEN (passo 2). Cada teste falha pelo motivo certo antes
de passar.

### Checklist

- [ ] `bun test scripts/wayfinder-frontier.test.ts` verde
- [ ] `bun run typecheck` verde
- [ ] `bun run test` completo verde
- [ ] Os 11 casos do passo 1 cobertos
- [ ] Saida em 3 blocos, referindo por nome
- [ ] Entry no `package.json`; teste de scripts atualizado se necessario
- [ ] Checagem de divergencia mapa-tickets como **aviso**
- [ ] Fronteira vazia diz "o caminho esta claro"
- [ ] O script nao escreve em lugar nenhum

---

## Criterio de Aceite

**Por maquina:**
- `bun run test && bun run typecheck` exit 0
- `bun run wayfinder:frontier` num esforco fixture imprime a fronteira correta
- `blocked-by` fantasma sai com erro; ciclo e reportado, nao trava

**Por humano:**
- Rodar e saber, em uma olhada, o que da para pegar agora
- A saida usa nomes, nao ids
- Fronteira vazia comunica que o mapa acabou

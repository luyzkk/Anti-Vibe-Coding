# Fase 02: Deteccao de ciclos em requires

**Plano:** 04 — Extras (Could Have — cortavel)
**Sizing:** 1h
**Depende de:** fase-01 (precisa do campo `requires:` existir e ser parseavel)
**Visual:** false

---

## O que esta fase entrega

`plan-feature` executa DFS (Depth-First Search) sobre o grafo de dependencias `requires:` entre todos
os PRDs nao arquivados. Quando detecta ciclo (incluindo auto-referencia `A requires A` e indiretos
`A → B → C → A`), mostra o caminho do ciclo ao dev e AVISA — nao bloqueia, pois dev pode ter contexto
que justifica. Satisfaz **RF11** e **R3**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Novo sub-step apos Step 1 (antes do Step 2): `detect-requires-cycles` enumera PRDs em `.planning/YYYY-MM-DD-*`, monta grafo `requires:`, roda DFS, avisa se ciclo |

---

## Implementacao

### Passo 1: Enumerar PRDs e montar grafo

Adicionar **Step 1.5 — Detectar Ciclos em Requires** em `plan-feature/SKILL.md`, logo apos Step 1
(Ler PRD) e antes de Step 2 (Explorar Codebase).

```
Step 1.5 — Detectar Ciclos em Requires (novo)

1. Glob `.planning/YYYY-MM-DD-*/` (apenas pastas ativas, NAO `.planning/_archive/`)
   - Se resultado vazio ou apenas o PRD atual: pular este step
2. Para cada pasta encontrada:
   a. Ler `PRD.md` dentro dela
   b. Parsear frontmatter (mesmo parser da fase-01)
   c. Extrair `requires:` normalizado (lista)
   d. Resolver cada item para pasta (mesma resolucao da fase-01 Passo 3.4a)
   e. Registrar no grafo: `{pasta_atual: [pasta_dep1, pasta_dep2, ...]}`

   Exemplo:
   {
     "2026-04-20-auth": [],
     "2026-04-21-dashboard": ["2026-04-20-auth"],
     "2026-04-22-relatorio": ["2026-04-20-auth", "2026-04-21-dashboard"]
   }

3. Incluir o PRD atual no grafo (ele pode ainda nao estar em pasta — usar slug temporario `__current__`)
```

### Passo 2: Algoritmo DFS com 3 cores

Escopo pequeno (G8: raramente > 10 PRDs), DFS simples basta. Pseudo-codigo inline na skill.

```
Algoritmo:

cores = {pasta: "branco" for pasta in grafo}
ciclos_encontrados = []

para cada pasta em grafo:
  se cores[pasta] == "branco":
    caminho = []
    dfs(pasta, caminho)

def dfs(no, caminho):
  cores[no] = "cinza"
  caminho.append(no)
  para cada dep em grafo[no]:
    se cores[dep] == "cinza":
      # encontrou ciclo — extrair sub-caminho do dep ate o final
      idx = caminho.index(dep)
      ciclo = caminho[idx:] + [dep]  # ex: [A, B, C, A]
      ciclos_encontrados.append(ciclo)
    senao se cores[dep] == "branco":
      dfs(dep, caminho)
  caminho.pop()
  cores[no] = "preto"
```

**Caso especial — auto-referencia (G5):** Se `A requires A`, o grafo tem `{A: [A]}`. Quando DFS
entra em A (cinza) e tenta visitar A (ja cinza), detecta ciclo `[A, A]`. Tratar igual aos outros.

### Passo 3: Apresentar aviso ao dev

Apos DFS terminar:

```
Se ciclos_encontrados esta vazio:
  - Prosseguir para Step 2 (Explorar Codebase) silenciosamente
Senao:
  - Para cada ciclo:
    caminho_visual = " -> ".join(ciclo)  # ex: "2026-04-20-a -> 2026-04-21-b -> 2026-04-20-a"
    mostrar:

    "AVISO: Ciclo em `requires:` detectado:
       {caminho_visual}

     Isto pode causar comportamento circular na verificacao de dependencias.
     Voce pode ter contexto que justifica (ex: milestone composto).
     Nao vou bloquear — apenas sinalizo."

  - NAO pedir confirmacao aqui (diferente da fase-01). Eh so aviso informativo.
  - Prosseguir para Step 2 normalmente.
```

Observacao (G6): conforme README gotcha G6, ciclo NUNCA bloqueia. Eh apenas aviso informativo.
Diferente da fase-01 (requires incompletos) que eh `AskUserQuestion`, aqui eh so log visivel.

### Passo 4: Evitar falso positivo com PRD em criacao

O PRD que esta sendo planejado AGORA pode nao ter pasta ainda (se `plan-feature` foi chamado com
path direto antes do `write-prd` criar pasta — caso raro mas possivel). Tratar como:

```
Se o PRD atual nao esta dentro de uma pasta `YYYY-MM-DD-*`:
  - Incluir no grafo com chave `__current__`
  - Resolver seus `requires:` normalmente
  - Qualquer ciclo encontrado que passe por `__current__` eh valido

Se o PRD atual JA esta em pasta:
  - Usar o nome da pasta diretamente no grafo
  - `__current__` nao eh usado
```

### Passo 5: Dogfooding manual

Preparar fixture com 3 cenarios:

**Cenario A — ciclo direto:**
```
.planning-test/
├── 2026-04-20-a/PRD.md     (requires: [b])
└── 2026-04-20-b/PRD.md     (requires: [a])
```
Esperado: aviso `2026-04-20-a -> 2026-04-20-b -> 2026-04-20-a`

**Cenario B — ciclo indireto:**
```
.planning-test/
├── 2026-04-20-a/PRD.md     (requires: [b])
├── 2026-04-20-b/PRD.md     (requires: [c])
└── 2026-04-20-c/PRD.md     (requires: [a])
```
Esperado: aviso `2026-04-20-a -> 2026-04-20-b -> 2026-04-20-c -> 2026-04-20-a`

**Cenario C — auto-referencia:**
```
.planning-test/
└── 2026-04-20-a/PRD.md     (requires: [a])
```
Esperado: aviso `2026-04-20-a -> 2026-04-20-a`

**Cenario D — sem ciclo (controle):**
```
.planning-test/
├── 2026-04-20-a/PRD.md     (requires: [])
├── 2026-04-20-b/PRD.md     (requires: [a])
└── 2026-04-20-c/PRD.md     (requires: [b])
```
Esperado: nenhum aviso, skill prossegue silenciosamente.

---

## Gotchas

- **G1 do plano (G5 README — auto-referencia):** Ciclo de tamanho 1 (`A -> A`) eh tratado igual.
  Nao filtrar.
- **G2 do plano (G6 README — ciclo nao bloqueia):** Diferente da fase-01, ciclo eh aviso simples,
  SEM AskUserQuestion. Log visivel + prossegue.
- **G3 do plano (G7 README — ciclos indiretos):** DFS cobre qualquer profundidade. Ver algoritmo
  de 3 cores no Passo 2.
- **G4 do plano (G8 README — escopo pequeno):** Nao super-engenheirar. DFS simples O(V+E) basta.
  Sem memoizacao fancy, sem topological sort — s so deteccao de ciclo.
- **G5 do plano (G9 README — dangling):** Se `requires: [foo]` aponta para pasta inexistente,
  foo NAO entra no grafo (nao tem como explorar). Nao conta como ciclo — apenas aviso separado
  ja tratado em fase-01. Nesta fase, ignorar dangling silenciosamente (fase-01 ja reporta).
- **Local (arquivos PRDs legacy):** Se alguma pasta `YYYY-MM-DD-*` tem PRD.md mas SEM frontmatter
  (legacy G11), parser retorna `requires = []` — grafo tem entrada com lista vazia. Sem ciclo.
- **Local (performance):** Enumerar pastas e ler PRD.md de cada eh IO-bound. Com <10 PRDs, eh
  instantaneo. Nao otimizar.
- **Local (ignorar `_archive/`):** Pastas arquivadas nao entram no grafo — ja foram concluidas,
  nao fazem sentido em analise de `requires:`.

---

## Verificacao

### TDD

Dogfooding manual (sem test framework).

- [ ] **RED manual:** Preparar Cenario A (ciclo direto) em fixture, rodar `/plan-feature` mental —
  skill nao avisa (estado atual)
- [ ] **GREEN:** Com a alteracao, skill mostra aviso com caminho do ciclo

### Checklist

- [ ] `plan-feature/SKILL.md` tem novo Step 1.5 entre Step 1 e Step 2
- [ ] Step 1.5 enumera apenas `.planning/YYYY-MM-DD-*/` (exclui `_archive/`)
- [ ] Step 1.5 usa mesmo parser de frontmatter da fase-01 (reuso)
- [ ] DFS com 3 cores (branco/cinza/preto) implementado em pseudo-codigo claro
- [ ] Cenario A (ciclo direto) detectado
- [ ] Cenario B (ciclo indireto de 3) detectado
- [ ] Cenario C (auto-referencia) detectado
- [ ] Cenario D (sem ciclo) NAO dispara aviso
- [ ] Aviso mostra caminho no formato `A -> B -> ... -> A`
- [ ] Aviso eh log visivel (nao AskUserQuestion) — skill prossegue automaticamente
- [ ] PRDs legacy sem frontmatter entram no grafo com `requires: []` (nao quebram DFS)
- [ ] `_archive/` eh ignorado

---

## Criterio de Aceite

**Por humano (dogfooding):**
- Dado 2 PRDs com `PRD-A requires: PRD-B` e `PRD-B requires: PRD-A` (ciclo direto), quando rodar
  `/plan-feature`, entao a skill mostra aviso com o caminho do ciclo mas NAO bloqueia a execucao.
- Dado 1 PRD com `requires: [ele-mesmo]` (auto-referencia), quando rodar `/plan-feature`, entao
  aviso `X -> X` aparece.
- Dado 3 PRDs sem ciclo (`A -> B -> C`, nenhum aponta de volta), quando rodar `/plan-feature`,
  entao NENHUM aviso de ciclo aparece.

**Por maquina:**
- Grep em `plan-feature/SKILL.md` encontra string "Step 1.5" ou "Detectar Ciclos"
- Grep em `plan-feature/SKILL.md` encontra strings "branco" / "cinza" / "preto" (3 cores)

---

<!-- Gerado por /plan-feature em 2026-04-20 -->

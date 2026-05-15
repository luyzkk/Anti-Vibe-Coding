# Fase 03: Hook no plan-feature que oferece migrar legacy

**Plano:** 02 — Deteccao legacy e migracao on-detect
**Sizing:** 1.5h
**Depende de:** fase-01 (detector), fase-02 (migrator)
**Visual:** false

---

## O que esta fase entrega

Novo **Step 0 — Deteccao de Legacy** no `plan-feature/SKILL.md`, rodando antes do Step 1 atual.
Se detector indicar legacy, apresenta a lista de artefatos ao dev, sugere nome de pasta
(`YYYY-MM-DD-{slug}/`), e pergunta "migrar agora? [sim/nao/cancelar]". Migracao via `migrateLegacy`
(fase-02). Se dev recusar, skill prossegue com fluxo normal (greenfield). Se cancelar, skill
encerra sem tocar em nada.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Inserir Step 0 novo antes do Step 1 atual; ajustar numeracao sem renomear (usar "Step 0") e atualizar Pipeline Integration |

---

## Implementacao

### Passo 1 — Inserir Step 0 no plan-feature/SKILL.md

Localizar a secao `## Step 1 — Ler PRD` (linha ~42 do arquivo atual). IMEDIATAMENTE antes dela,
inserir um novo bloco `## Step 0 — Deteccao de Legacy`.

Conteudo do Step 0:

```markdown
## Step 0 — Deteccao de Legacy

Roda ANTES de qualquer outra coisa. Se projeto tem estrutura pre-refatoracao
(`PRD-*.md` ou `planoNN/` soltos em `.planning/`), esta skill nao consegue operar sem antes
migrar — ou sem explicitamente ignorar.

Algoritmo referenciado: `lib/legacy-detector.md`.
Migracao referenciada: `lib/legacy-migrator.md`.

### Fluxo

1. Se `.planning/` nao existe: skip Step 0, ir direto para Step 1 (projeto greenfield).
2. Executar `detectLegacy(".planning/")` conforme `lib/legacy-detector.md`.
3. Se `legacy == false`: skip — ir para Step 1.
4. Se `legacy == true`:
   a. Apresentar ao dev:
      "Detectei estrutura legacy em .planning/:
         Sinais: {signals.join(', ')}
         Artefatos:
           - {cada artifact.path}
         Slug inferido: {suggestedSlug ou 'nenhum — preciso que voce forneca'}
         "
   b. Se `suggestedSlug` for null (ambiguous):
      - Perguntar ao dev (AskUserQuestion): "Qual slug usar para a pasta destino?
        Formato: kebab-case, ex: auth, sistema-notificacoes"
      - Validar resposta contra regex `^[a-z0-9][a-z0-9-]*$`
      - Se invalido: re-perguntar 1x; se continuar invalido: oferecer cancelar
   c. Computar nome da pasta: `targetFolderName = "{YYYY-MM-DD}-{slug}"`
      - Data: data atual (UTC, via variavel de sistema)
   d. Se `.planning/{targetFolderName}/` ja existir: avisar colisao e oferecer
      `-v2` (similar a RF9/D9) ou cancelar
   e. AskUserQuestion: "Migrar estes {N} artefatos para .planning/{targetFolderName}/?"
      Opcoes:
        - "Sim, migrar agora"
        - "Nao — prosseguir com plan-feature em modo greenfield (legacy fica intocado)"
        - "Cancelar plan-feature"
   f. Se "Sim":
      - Chamar `migrateLegacy(detectorResult, targetFolderName)` conforme `lib/legacy-migrator.md`
      - Se retorno status == "success":
        - Confirmar: "Migrado com sucesso. {N} artefatos em .planning/{targetFolderName}/"
        - Continuar Step 1 com a pasta migrada como contexto ativo
      - Se retorno status == "rolled_back" ou "aborted":
        - Reportar erro claramente
        - Perguntar: "prosseguir em modo greenfield ou cancelar?"
   g. Se "Nao":
      - Confirmar: "Prosseguindo em modo greenfield. Legacy em .planning/ nao foi tocado."
      - Ir para Step 1 (que vai criar nova pasta datada para a nova feature)
   h. Se "Cancelar":
      - Encerrar skill sem tocar em nada

### Regras

- Step 0 roda apenas 1 vez por invocacao — se dev disser "nao, prosseguir greenfield", nao
  re-perguntar na mesma sessao (mesmo que dev invoque outra skill)
- Se migracao falhou (rolled_back), NAO insistir automaticamente — deixar dev corrigir
- Slug fornecido pelo dev nunca eh persistido em cache — eh so da sessao atual
```

### Passo 2 — Ajustar Pipeline Integration

No final do arquivo, na secao `## Pipeline Integration`, atualizar o subsection `### 0. Importar
PRD (se disponivel)` para mencionar que o Step 0 novo roda ANTES desta logica. Exemplo:

```markdown
### 0. Deteccao de Legacy (NOVO — ver Step 0 acima)
Se detectar PRD/plano soltos na raiz de .planning/, oferece migrar antes de qualquer outro
fluxo. Ver `lib/legacy-detector.md` e `lib/legacy-migrator.md`.

### 1. Importar PRD (se disponivel)
Apos Step 0, verificar se a pasta ativa (recem-migrada OU greenfield nova a ser criada) tem
`PRD.md`...
```

Nota: como o Step 1 atual faz glob em `.planning/PRD-*.md` (formato flat legacy) — apos Plano
01 ter mudado a skill para operar dentro de pasta datada, o Step 1 ja foi adaptado. Este Step 0
roda antes e garante que, se havia legacy, o Step 1 encontra a nova pasta. Se dev recusou
migrar, o Step 1 deve IGNORAR arquivos na raiz de `.planning/` (pelo Plano 01 isso ja ficou
restrito a pastas datadas).

### Passo 3 — Atualizar a secao Referencias

No final da skill (ou criar se nao existir):

```markdown
## Referencias

- `lib/legacy-detector.md` — Algoritmo de deteccao de estrutura legacy (Step 0)
- `lib/legacy-migrator.md` — Algoritmo atomico de migracao legacy (Step 0 quando dev confirma)
```

### Passo 4 — Verificar G3 (concorrencia) via mensagem explicita

No Passo 1.d (colisao com `-v2`), a mensagem deve mencionar explicitamente:

```
"A pasta {targetFolderName} ja existe. Possiveis causas:
- Outra sessao ja migrou esta feature
- Voce rodou plan-feature 2x hoje para a mesma feature
- Ha um PRD v2 ja criado

Opcoes:
  - Criar como {targetFolderName}-v2
  - Cancelar (inspecionar manualmente antes)"
```

Isso mitiga R7 sem precisar de lock global.

---

## Gotchas

- **G1 do plano (falso positivo):** O detector ja filtra — aqui confia. NAO adicionar filtros
  redundantes nesta fase (duplicacao de logica = foco de bug).
- **G3 do plano (concorrencia R7):** A checagem de colisao no Passo 1.d eh parte da mitigacao.
  Sem lock, so primeira sessao que chegar migra; segunda pega colisao e aborta ou vira v2.
- **G5 do plano (backward compat v1 com PLAN.md flat):** plan-feature NAO trata PLAN.md flat —
  isso eh responsabilidade do execute-plan (fase-04). Se o legacy detectado incluir PLAN.md
  solto, ele sera movido junto na migracao, mas plan-feature nao interpreta o conteudo v1. Apos
  migrado, plan-feature vai encontrar PLAN.md e PRD.md dentro da pasta e oferecer
  refazer/ajustar conforme a logica existente.
- **G7 do plano (slug ambiguo):** Passo 1.b garante que slug ambiguo sempre pergunta ao dev,
  nunca assume. Se dev nao conseguir dar slug valido, oferecer cancelar — NUNCA migrar com
  slug chutado.
- **G8 do plano (nao-destrutivo):** As 3 opcoes (sim/nao/cancelar) sao explicitas. Dev sempre
  tem escape. Nunca migrar sem resposta afirmativa.
- **Local (ordem dos Steps):** O plan-feature atual tem Step 1, 2, 3... ate Step 11. Adicionar
  "Step 0" no topo eh a mudanca minima que preserva numeracao (nao renumerar 11 steps). Verificar
  que todas as referencias internas a "Step N" continuam corretas.
- **Local (G-PLAN-1 herdado):** Verificar que a limpeza de code morto em write-prd (Plano 01)
  deixou o plan-feature/SKILL.md livre de menções obsoletas a PRD-*.md flat. Se houver, limpar
  nesta fase junto (consistencia com nova estrutura).

---

## Verificacao

### TDD (dogfooding manual)

- [ ] **RED — fixture legacy feliz:** criar `.planning-test/PRD-auth.md` + `.planning-test/plano01/fase-01.md`.
  Simular plan-feature lendo o Step 0 novo: deve apresentar lista de artefatos + sugestao
  `2026-04-20-auth`, pedir confirmacao.
- [ ] **GREEN — migracao confirmada:** responder "sim, migrar agora" e executar migrateLegacy
  manualmente. Confirmar que plan-feature prossegue para Step 1 lendo o PRD.md dentro da nova
  pasta.
- [ ] **RED — fixture legacy + dev recusa:** responder "nao, greenfield". Confirmar que
  `.planning-test/PRD-auth.md` e `.planning-test/plano01/` continuam no lugar, e o plan-feature
  segue criando NOVA pasta datada para a feature atual sem tocar no legacy.
- [ ] **RED — fixture ambiguous:** criar so `.planning-test/plano01/fase-01.md` (sem PRD).
  Simular plan-feature: deve perguntar slug; validar que slug invalido (ex: "Foo Bar") pede
  nova entrada; validar que slug valido prossegue para confirmacao de migracao.
- [ ] **RED — colisao com pasta existente:** criar `.planning-test/PRD-auth.md` + pasta
  `.planning-test/2026-04-20-auth/` ja existente. Simular: deve oferecer `-v2` ou cancelar.
- [ ] **RED — cancelar:** verificar que escolher "cancelar" encerra o plan-feature sem tocar em
  nada.

### Checklist

- [ ] Step 0 inserido em `plan-feature/SKILL.md` ANTES do Step 1 atual
- [ ] Numeracao Step 1..Step 11 preservada (so adicionou Step 0)
- [ ] Fluxo cobre: feliz / recusa / cancelar / ambiguous / colisao / migracao falhou
- [ ] Referencias a `lib/legacy-detector.md` e `lib/legacy-migrator.md` adicionadas
- [ ] Pipeline Integration atualizada para mencionar Step 0 novo
- [ ] Se houver residuo de PRD-*.md flat no corpo da skill (herdado G-PLAN-1), limpar
- [ ] Fixtures de teste removidas apos validacao

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "Step 0 — Deteccao de Legacy" anti-vibe-coding/skills/plan-feature/SKILL.md` retorna 1
- `grep -c "lib/legacy-detector.md" anti-vibe-coding/skills/plan-feature/SKILL.md` retorna >= 1
- `grep -c "lib/legacy-migrator.md" anti-vibe-coding/skills/plan-feature/SKILL.md` retorna >= 1

**Por humano:**
- Rodando os 6 cenarios de dogfooding manualmente, o comportamento bate com o descrito no
  Passo 1 (fluxo) em todos os casos
- Com resposta "nao, greenfield": skill prossegue normalmente para Step 1 sem erro e sem tocar
  no legacy
- Com resposta "cancelar": skill encerra limpa, sem arquivos criados ou movidos

---

<!-- Gerado por /plan-feature em 2026-04-20 -->

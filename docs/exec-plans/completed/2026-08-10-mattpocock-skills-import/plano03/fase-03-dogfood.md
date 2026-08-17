---
fase: 03
plano: 03
status: planned
---

# Fase 03: Dogfood — Gerar um Wizard Real para Este Repo

**Plano:** 03 — `wizard`
**Sizing:** ~1.5h
**Depende de:** fase-01
**Visual:** false

**Decisoes:** DI-11 (dogfood)
**Invariantes:** INV-03 (a skill nunca roda o wizard end-to-end; o **humano** roda, e isso e o teste)

---

## O que esta fase entrega

Um wizard de verdade, gerado pela skill, rodado por um humano numa maquina real.

A fase existe por causa de um erro ja cometido neste repo. O compound
`2026-05-12-skill-md-code-blocks-do-not-execute` registra: 224 testes verdes, 10 skills "instrumentadas",
7 dias de uso real e **zero** telemetria gravada — porque o writer nunca foi testado end-to-end.
Dependencia presente nao e fluxo funcionando. Ler o template nao prova que ele roda.

---

## Arquivos Afetados

**NOVOS**
- O wizard gerado — caminho decidido no passo 2 (efemero em scratch, ou `scripts/` se virar caminho
  repetivel)

**FORA do escopo**
- Alterar a biblioteca do template por causa do que o dogfood revelar. Achado vira item no MEMORY e,
  se for defeito real, fase nova — nao patch oportunista no meio do teste

---

## Implementacao

### Passo 1: selecionar o alvo pelos criterios

Um alvo so vale se passar nos quatro:

1. **Genuinamente manual** — tem passo que o agente nao executa. E a fronteira que a propria skill
   impoe
2. **Repetido** — acontece de novo, ou outra pessoa vai fazer
3. **Multi-estagio** — 3+ estagios, senao o template nao esta sendo exercitado
4. **Real** — existe evidencia, nao hipotese

**Candidato principal: o processo de release.** Evidencia no log:

```
9af127c chore(release): add MIT license and sync README to v7.5.0
786678d chore(release): bump 7.4.0 -> 7.5.0 (System Design Coverage Gaps)
cbe59b3 chore(release): align everything to 7.4.0 (marketplace nested + CHANGELOG + manifest)
```

Dois commits de "consertar o que esqueci", em releases diferentes. E a assinatura de procedimento
multi-passo sem checklist. Estagios: `bump-version.js` → CHANGELOG → README → branch → PR → merge →
`sync-to-global.sh` → conferir marketplace.

**Ressalva honesta:** boa parte disso o agente faz sozinho, e o criterio 1 morde. O que sobra de
humano-only e aprovar/mergear o PR e conferir o resultado no marketplace — o que pode ser fino
demais para justificar um wizard.

**Candidato alternativo: setup do plugin em maquina nova / para outra pessoa.**
`scripts/sync-to-global.sh` tem `PLUGIN_DEV="${PLUGIN_DEV:-/f/Projetos/Anti-Vibe-Coding}"` — default
especifico da sua maquina. Outra pessoa ou outra maquina precisa saber que existe esse override.
Passa mais limpo no criterio 1.

**Este repo nao tem secret de CI** — conferido: os 2 workflows em `.github/workflows/` nao
referenciam `secrets.*` nem `vars.*`. Entao `set_secret` nao sera exercitado, e isso precisa ser
dito no relatorio: o dogfood cobre o template **parcialmente**.

Se nenhum candidato passar nos 4 criterios, **trocar o alvo, nao afrouxar o criterio** — inclusive
para um procedimento manual fora deste repo, se for real.

### Passo 2: gerar pela skill

Rodar a skill de verdade, seguindo os 4 passos dela. Sem atalho, sem escrever o wizard a mao: o que
esta sendo testado e a skill, nao a sua capacidade de escrever bash.

Registrar onde a skill hesitou, pediu confirmacao desnecessaria, ou inventou passo de UI. Passo 2 da
skill diz para nao inventar — se inventou, e achado de primeira ordem.

### Passo 3: verificacao estatica

`bash -n` · `shellcheck` · todo valor do escopo capturado e gravado onde o escopo disse ·
`TOTAL_STAGES` bate com o numero de `stage()`.

### Passo 4: o humano roda

**Este e o teste.** O agente nao roda (INV-03).

Observar e registrar:

- [ ] A tela limpa entre estagios e so o passo atual aparece
- [ ] O contador de progresso bate com a realidade
- [ ] `open_url` abre o navegador — **e se emite aviso espurio** (verificacao de D2 no ambiente real)
- [ ] `ask_secret` esconde a entrada
- [ ] `write_env` faz upsert idempotente: rodar duas vezes nao duplica linha
- [ ] Rodar de novo oferece o valor existente como default, e Enter mantem
- [ ] O sumario do `finish` lista o que foi configurado e o que foi pulado
- [ ] Sem `\r` em valor nenhum gravado (verificacao de D1 no ambiente real)

### Passo 5: relatorio

No MEMORY do plano03: alvo escolhido e por que · o que a skill fez bem · onde hesitou ou inventou ·
resultado de cada item do passo 4 · **o que ficou sem cobertura** (`set_secret`, e o que mais nao
foi exercitado).

Silenciar o que nao foi testado le como cobertura completa.

---

## Gotchas

- **G1** — Escrever o wizard a mao "para ir mais rapido" invalida a fase inteira.
- **G2** — Escolher alvo facil que nao passa no criterio 1 prova o template e nao prova a skill —
  e a skill e a parte que pode estar errada.
- **G3** — Consertar o template no meio do teste. Anota e segue; patch oportunista some no diff.
- **G4** — `set_secret` nao sera exercitado (sem secret de CI aqui). Declarar, nao omitir.
- **G5** — O passo 4 pode gravar valores reais em `.env`. Usar valores de teste descartaveis, e
  nunca credencial de verdade num wizard que existe para ser jogado fora.

---

## Verificacao

### Checklist

- [ ] Alvo passa nos 4 criterios, e a justificativa esta escrita
- [ ] Wizard gerado **pela skill**, nao a mao
- [ ] `bash -n` e `shellcheck` limpos
- [ ] Os 8 itens do passo 4 observados por um humano numa maquina real
- [ ] D1 e D2 verificados em execucao real, nao so por leitura
- [ ] Relatorio no MEMORY, com a secao de cobertura ausente

---

## Criterio de Aceite

**Por maquina:**
- `bash -n` exit 0
- `TOTAL_STAGES` == numero de `stage()`
- Rodar `write_env` duas vezes com a mesma chave produz uma linha, nao duas

**Por humano:**
- Voce rodou o wizard do inicio ao fim e ele nao te confundiu em nenhum estagio
- Um estranho conseguiria seguir sem perguntar nada
- O relatorio diz o que **nao** foi coberto

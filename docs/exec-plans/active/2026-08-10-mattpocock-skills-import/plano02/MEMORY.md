# Memory: Plano 02 — Vocabulario de Seam

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a `writing-for-agents` e a lente contra a qual este material e escrito)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Expandir a referencia | planned | 0/1 |
| 02 | Ponteiros de descoberta | planned | 0/3 |
| 03 | 5o dominio no design-twice | planned | 0/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano02-faseNN-<slug>: <o que mudou e por que>`.

(vazio — nada executado ainda)

## Estado do alvo antes da mudanca

`skills/tdd-workflow/references/deep-modules.md` — 118 linhas.

Ponteiros que resolvem hoje (nao mover o arquivo, INV-02):
- `skills/tdd-workflow/SKILL.md:119`
- `skills/anti-vibe-review/SKILL.md:95`
- `skills/verify-work/SKILL.md:170`

Ocorrencias de `seam` no plugin inteiro: **0**. As 2 de `costura` em
`skills/system-design/references/messaging-reliability.md` sao a palavra em portugues com sentido
comum, nao o conceito de Feathers.

## CF-01 — registro obrigatorio

A fase-01 remove o sinal *"Interface tem mais linhas que a implementacao"*, que premia inchar a
implementacao. A referencia alimenta o pre-check de deep modules do `verify-work` e do
`anti-vibe-review`.

**A executar e registrar aqui:**

| | Modulo escolhido | Veredito |
|---|---|---|
| Antes | | |
| Depois | | |

Se o veredito mudou, escrever por que a nova leitura e a correta. Se nao mudou, registrar tambem —
diz que a metrica antiga nao estava sendo decisiva na pratica.

## Gates entre fases

- **fase-01 -> fase-02 e fase-03:** o vocabulario precisa existir antes de ser apontado ou consumido.
  Fases 02 e 03 sao independentes entre si.
- **fase-02 -> fase-03:** ambas tocam `design-twice`. A fase-03 rele o arquivo antes de editar.

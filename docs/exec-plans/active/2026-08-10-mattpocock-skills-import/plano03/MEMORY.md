# Memory: Plano 03 — `wizard`

Estado rolante do plano. Atualizado ao fim de cada fase pelo executor.

**Status:** planned — nenhuma fase executada
**Depende de:** plano01 fase-01 (a lente de escrita)

## Progresso

| Fase | Nome | Status | Arquivos |
|---|---|---|---|
| 01 | Porte da skill + template | planned | 0/3 |
| 02 | Ponteiros: infrastructure + init | planned | 0/2 |
| 03 | Dogfood: wizard real | planned | 0/1 |

## Decisoes de implementacao (DI)

Formato: `DI-Plano03-faseNN-<slug>: <o que mudou e por que>`.

Uma ja e obrigatoria:
- `DI-Plano03-fase01-crlf`: normalizar `\r` **na leitura** (`_existing`) ou **na escrita**
  (`write_env`)? Escolher uma e registrar o motivo. Aplicar as duas por precaucao e o anti-padrao
  que o README do plano avisa.

## Ambiente verificado (2026-08-10)

Git Bash 5.2.37 no Windows 11:

| Dependencia | Estado |
|---|---|
| `explorer.exe` | presente — e o ramo que `open_url` vai usar aqui |
| `tput` | presente |
| `mktemp` | presente |
| `gh` | presente |
| `wslview` / `xdg-open` / `open` | ausentes (esperado em Git Bash nativo) |

**Dependencia presente nao e fluxo funcionando** — e por isso que a fase-03 existe.

## Os 2 defeitos

| ID | Defeito | Estado |
|---|---|---|
| D1 | CRLF no `.env` faz `_existing` devolver valor com `\r`, que propaga para `write_env` e `set_secret` | **deterministico por leitura de codigo.** Corrigir na fase-01, verificar em execucao real na fase-03 |
| D2 | `explorer.exe` pode retornar exit ≠ 0 mesmo abrindo o navegador, disparando `warn` espurio | **nao confirmado.** Verificar antes de mexer. Se nao reproduzir, registrar como nao-defeito |

## Dogfood — selecao do alvo (fase-03)

Candidatos levantados, com a ressalva de cada um:

| Candidato | Evidencia | Ressalva |
|---|---|---|
| Processo de release | 2 commits de fixup no log (`9af127c`, `cbe59b3`) | Boa parte e agente-executavel; morde o criterio 1 |
| Setup do plugin em maquina nova | `sync-to-global.sh` tem `PLUGIN_DEV` com default especifico da maquina | Passa mais limpo no criterio 1 |

**Fato apurado:** este repo **nao tem secret de CI** — os 2 workflows em `.github/workflows/` nao
referenciam `secrets.*` nem `vars.*`. Logo `set_secret` nao sera exercitado pelo dogfood, e isso
entra no relatorio como cobertura ausente.

## Gates entre fases

- **fase-01 -> fase-02 e fase-03:** a skill e o template precisam existir. Fases 02 e 03 sao
  independentes entre si.
- **dentro da fase-03:** se nenhum candidato passar nos 4 criterios de selecao, trocar o alvo —
  inclusive para fora deste repo. Nao afrouxar o criterio.

---
name: iterate
description: "Ciclo pos-deploy: incident response com regression test, hardening defensivo e centralizacao de config. A quarta pata do pipeline: Ensinar → Planejar → Verificar → Iterar. Use quando um bug foi relatado em producao ou quando uma feature estavel esta pronta para hardening."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Bash, AskUserQuestion
argument-hint: "incident|harden [descricao]"
---

```typescript
// === Telemetria passiva (Plano 03 fase-03) — nao remover sem registrar em MEMORY.md ===
// G5: telemetria SEMPRE ativa, ignora architectureDetectorEnabled
// G7: skill name canonico fixo

import { writeTelemetryStart, writeTelemetryEnd } from '../../lib/telemetry-utils'
import type { TelemetryStart, TelemetryEnd } from '../../lib/telemetry-types'

const __telemetry_skillName = 'iterate'
const __telemetry_fasePipeline = 'iterate'
const __telemetry_startTimestamp = new Date().toISOString()
const __telemetry_startMs = Date.now()

const __telemetry_startEntry: TelemetryStart = {
  evento: 'start',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
}

writeTelemetryStart(__telemetry_startEntry)
// === Fim do bloco de inicio ===
```

# Iterate — Ciclo Pós-Deploy

Skill standalone para o ciclo de melhoria contínua em produção.

Pipeline completo: `grill-me → write-prd → plan-feature → execute-plan → verify-work → **iterate**`

---

## Detecção de Contexto (CA-08)

```
1. Verificar se há contexto de deploy:
   - Existe git tag de release? (git tag --list | tail -1)
   - Existe SUMMARY.md com Wave concluída? (Glob ".planning/*/SUMMARY.md")
   - Existe arquivo de log ou stack trace no argumento?

2. SE nenhum contexto de deploy detectado E argumento vazio:
   Apresentar:
   "Esta skill é mais útil após o primeiro deploy, quando há
    bugs ou incidentes reais para tratar.

    Opções:
    - [1] Continuar mesmo assim (modo treino/preventivo)
    - [2] Ir para /tdd-workflow (implementação ainda em curso)
    - [3] Ir para /verify-work (verificar antes do deploy)"

   Aguardar escolha. Se [2] ou [3]: encerrar e indicar a skill.
   Se [1]: prosseguir com aviso "Modo preventivo — sem incidente ativo."

3. SE contexto de deploy detectado OU argumento fornecido:
   Prosseguir para Detecção de Modo.
```

---

## Detecção de Modo

```
SE argumento contém stack trace, log de erro, "bug", "erro", "falha", "incident":
  → Modo A: Incident Response

SE argumento contém "harden", "hardening", "defensive", "endurecer":
  → Modo B: Hardening

SE argumento vazio mas contexto de deploy existe:
  AskUserQuestion:
  "O que você quer fazer?
   - [1] Tratar um bug/incidente relatado em produção
   - [2] Endurecer uma feature estável (rate limit, fallbacks, config)"
  
  [1] → Modo A
  [2] → Modo B
```

---

## Modo A — Incident Response

```
Princípio: cada fix vem com regression test. Sem exceção.

Step 1 — Capturar dados brutos:
  SE argumento contém logs:
    - Usar logs fornecidos como ponto de partida
  SENÃO:
    AskUserQuestion: "Cole o stack trace ou output de erro — dados brutos
    encontram o problema real mais rápido do que descrições."

Step 2 — Hipótese:
  Analisar os logs. Apresentar:
  "Hipótese: [causa raiz em 1-2 linhas]
   Arquivo provável: [arquivo:linha]
   Para confirmar: [o que verificar]"
  
  AskUserQuestion: "Esta hipótese faz sentido? [sim/não/ajustar]"
  
  Se não: pedir mais contexto, reformular hipótese.
  Se ajustar: incorporar correção do dev e continuar.

Step 3 — Regression Test ANTES do fix:
  "Antes de corrigir, vou escrever um teste que reproduz o bug.
   Esse teste deve FALHAR agora e PASSAR após o fix."
  
  Escrever teste no arquivo de teste correspondente:
  - Nome: verbo descritivo (nunca "should")
  - Exemplo: "returns 404 when token expired after deploy"
  - Rodar: bun run test [arquivo]
  - Confirmar que FALHA (RED). Se passar: o teste não reproduz o bug.

Step 4 — Fix:
  Implementar correção mínima. Apresentar diff antes de aplicar:
  "Fix proposto:
   Arquivo: [arquivo:linha]
   Mudança: [descrição em 1 linha]
   Aplicar?"
  
  Aguardar aprovação. Aplicar.

Step 5 — Confirmar GREEN:
  Rodar: bun run test [arquivo]
  SE passou: "Regression test verde. Bug corrigido."
  SE falhou: analisar, ajustar fix (máx 2 tentativas adicionais).
  SE 3 tentativas falharam: "Pare. Assuma controle — 3 tentativas falharam."

Step 6 — Commit:
  "Commit sugerido:
   fix: [descrição do bug] + regression test
   
   Confirmar?"
  
  SE sim: git add [arquivos] && git commit -m "fix: [desc] + regression test"

Step 7 — Oferecer Hardening:
  "Fix aplicado. Quer verificar se há padrões defensivos faltando
   nesta área? → /anti-vibe-coding:defensive-patterns"
```

---

## Modo B — Hardening Pós-Feature

```
Princípio: hardening não é fase, é hábito. Roda após qualquer feature estável.

Step 1 — Escopo:
  SE argumento especifica área:
    - Usar como escopo
  SENÃO:
    AskUserQuestion: "Qual feature ou módulo quer endurecer?
    (ex: autenticação, checkout, API de pagamentos)"

Step 2 — Checklist Defensivo:
  Apresentar menu de categorias. Dev escolhe 1 ou mais:
  
  "[1] Rate Limiting — limitar chamadas por usuário/IP
   [2] Circuit Breaker — falhar rápido em dependências instáveis
   [3] Timeout — garantir que chamadas externas têm timeout
   [4] Fallback — comportamento degradado quando serviço falha
   [5] Centralizar Config — remover magic numbers e env vars espalhadas
   [6] Modo aprofundado: /anti-vibe-coding:defensive-patterns"

Step 3 — Análise por Categoria Escolhida:

  RATE LIMITING:
    - Grep por endpoints sem rate limit: buscar rotas sem middleware de throttle
    - Sugerir implementação com arquivo:linha específico

  CIRCUIT BREAKER:
    - Grep por chamadas a serviços externos (fetch, axios, http.request)
    - Identificar ausência de wrapper com estado (closed/open/half-open)
    - Sugerir implementação mínima

  TIMEOUT:
    - Grep por chamadas sem timeout explícito
    - Padrão: toda chamada externa deve ter timeout ≤ 30s
    - Listar ocorrências com arquivo:linha

  FALLBACK:
    - Identificar operações críticas sem try/catch ou fallback value
    - Sugerir: "Se [serviço] falhar, retornar [comportamento degradado]"

  CENTRALIZAR CONFIG:
    - Delegar para: /anti-vibe-coding:centralize-config
    - "Esta categoria tem skill dedicada. Invocar agora?"

Step 4 — Aplicar Fixes:
  Para cada categoria escolhida:
    Apresentar diff antes de aplicar.
    Aguardar aprovação por categoria.
    Aplicar e confirmar.

Step 5 — Commit:
  "Commit sugerido:
   refactor: defensive hardening — [categorias aplicadas]
   
   Confirmar?"
```

---

## Modo Aprofundado (Delegação)

```
Para incident response complexo (multi-serviço, produção crítica):
  "Quer investigação aprofundada?
   → /anti-vibe-coding:incident-response (modo completo)"

Para hardening aprofundado por categoria:
  → /anti-vibe-coding:defensive-patterns

Para config espalhada em múltiplos arquivos:
  → /anti-vibe-coding:centralize-config
```

---

## Regras

```
1. NUNCA aplique fix sem mostrar diff e aguardar aprovação
2. Regression test SEMPRE antes do fix (Step 3 do Modo A)
3. Commit SEMPRE inclui "regression test" na mensagem quando há fix de bug
4. Máximo 3 tentativas de fix — após isso, passar controle ao dev
5. Hardening é por categoria — não tente fazer tudo de uma vez
6. Esta skill não modifica arquivos de teste do projeto sem aprovação explícita
```

```typescript
// === Telemetria passiva (Plano 03 fase-03) — registra fim ===

const __telemetry_endEntry: TelemetryEnd = {
  evento: 'end',
  skill_invocada: __telemetry_skillName,
  timestamp_inicio: __telemetry_startTimestamp,
  timestamp_fim: new Date().toISOString(),
  duracao_ms: Date.now() - __telemetry_startMs,
  profile_arquitetura: 'disabled',
  fase_pipeline: __telemetry_fasePipeline,
  tokens_aproximados_consumidos: 0,
  arquivos_lidos: 0,
  arquivos_modificados: 0,
  sucesso: true,
}

writeTelemetryEnd(__telemetry_endEntry)
// === Fim do bloco de fim ===
```

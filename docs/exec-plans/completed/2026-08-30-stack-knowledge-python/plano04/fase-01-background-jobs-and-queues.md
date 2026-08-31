<!--
Princípio universal #5 — Comment Provenance.
Fase de conteúdo (markdown destilado) — sem código de runtime; provenance vive no
frontmatter `sources:` do átomo (RF13) e nos comentários deste doc.
-->

# Fase 01: Átomo `background-jobs-and-queues.md` (T3)

**Plano:** 04 — Atoms T3 + INDEX Final + Audit Humano + E2E Full
**Sizing:** S ~1.5h
**Depende de:** Plano 03 completo (Wave 1 — independente das fases 02-03)
**Visual:** false

---

## O que esta fase entrega

Átomo T3 `knowledge/python/atoms/background-jobs-and-queues.md` — o ECOSSISTEMA de filas e
jobs em Python/FastAPI (BackgroundTasks não é fila; comparativo de task queues com estado de
manutenção; brokers async-native; idempotência; scheduling; DLQ), destilado de 3 fontes com
fronteiras de dedup explícitas contra o piloto async e o átomo de errors.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `knowledge/python/atoms/background-jobs-and-queues.md` | Create | Átomo T3 destilado (único arquivo desta fase — G11: NÃO tocar INDEX.md) |
| `TODO.md` (raiz) | Modify (condicional) | Excedente do cap 200, se houver (G5) |

---

## Implementacao

### Passo 1: Ler as fontes, as fronteiras e os átomos vizinhos

Fontes desta fase (ground truth — congeladas, gitignored G1):

1. `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md`
   — **PRIMÁRIA**, seções **§4 (Background jobs), §5 (Filas de mensagem), §14 (Idempotência
   em jobs assíncronos), §15 (Scheduling)** APENAS. Regras com IDs estáveis (4.1, 4.2, 5.1,
   14.1, 15.1).
2. `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md`
   — seção **§14 (Dead letter queues)** APENAS (Regras 14.1: Celery acks_late +
   task_reject_on_worker_lost + retry backoff; 14.2: DLQ no broker / DLX / x-death / poison
   messages).
3. `F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\deep-research-report2.md`
   — pilar "BackgroundTasks, email, storage e pagamentos" (~L852-935: in-process, ordem de
   execução, exceção interrompe as posteriores, "use somente para trabalho pequeno", "não
   encadeie ações críticas") + Misconception "BackgroundTasks é a fila de jobs do FastAPI —
   Errado" (~L1123) + Conflito aberto "BackgroundTasks vs fila distribuída" (~L1148) +
   Lacuna declarada sobre fila dominante (~L1206).

**Átomos vizinhos a LER antes de extrair (fronteiras G17):**

- `knowledge/python/atoms/async-and-concurrency.md` (piloto) — dono do MECANISMO: TaskGroup,
  event loop, threadpool, cancellation, backpressure (§1-3 e §6-11 da mesma fonte primária).
  Este átomo NÃO re-ensina nada disso; referencia o piloto quando o assunto tangenciar.
- `knowledge/python/atoms/errors-logging-observability.md` — também destilou compass 9b12d328
  (fonte inteira, Plano 02 fase-03). Fronteira do §14 compartilhado: LÁ vive o ângulo de error
  handling (semântica de retry como tratamento de falha); AQUI vive a configuração operacional
  de fila (acks_late, DLX/x-death, poison messages, o que fazer com a mensagem morta).
  Se o átomo de errors já cobriu uma regra do §14 em profundidade, aqui referencia + destila
  só o ângulo de fila.

### Passo 2: Spawnar o subagente extrator com o prompt-esqueleto abaixo

A REGRA DE FIDELIDADE está copiada VERBATIM de
`docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` — copiar
literalmente, NUNCA parafrasear (G2, R8).

```text
Você é subagente extrator de knowledge atom (contexto limpo). Escreva o arquivo
knowledge/python/atoms/background-jobs-and-queues.md destilando EXCLUSIVAMENTE as fontes:

1. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md
   — SOMENTE §4, §5, §14 e §15 (Background jobs, Filas de mensagem, Idempotência, Scheduling)
2. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md
   — SOMENTE §14 (Dead letter queues)
3. F:\Projetos\Anti-Vibe-Coding\Infos\knowledge\Python\deep-research-report2.md
   — SOMENTE o pilar "BackgroundTasks, email, storage e pagamentos" + a Misconception sobre
   BackgroundTasks + o Conflito aberto "BackgroundTasks vs fila distribuída" + a Lacuna
   declarada sobre fila dominante

REGRA DE FIDELIDADE: se uma afirmação técnica não está literalmente ou parafraseavelmente na
fonte declarada em `sources:`, NÃO escreva, mesmo que você saiba que é verdade. O verifier
gate downstream marca como falha qualquer claim não-rastreável ao source — e você gastará
tempo no retrabalho. Quando em dúvida sobre se um detalhe está no source: omita o detalhe ou
re-leia o source para confirmar.

Liberdade explícita: você NÃO precisa cobrir tudo do template se a fonte não fornece material.
Se a fonte não quantifica algo (throughput, latência de broker), descreva qualitativamente
como a fonte faz — não estime números próprios.

DEDUP OBRIGATÓRIO (defeito de wave se violado):
- knowledge/python/atoms/async-and-concurrency.md é o DONO de TaskGroup/event loop/threadpool/
  cancellation/backpressure. Este átomo cobre o ECOSSISTEMA de filas/jobs. Quando o assunto
  tangenciar mecanismo de concorrência, escreva "ver átomo async-and-concurrency" — não
  re-ensine.
- knowledge/python/atoms/errors-logging-observability.md já cobre o ângulo de error handling
  do §14 de DLQ (fonte compartilhada). Aqui entra a CONFIGURAÇÃO DE FILA (acks_late,
  task_reject_on_worker_lost, DLX/x-death, poison messages). Leia o átomo antes; referencie,
  não duplique.

RASTREIO DE IDs DE REGRA: as fontes compass usam IDs estáveis (4.1, 4.2, 5.1, 14.1, 15.1).
Ao destilar uma regra, PRESERVE o ID entre parênteses na claim (ex: "BackgroundTasks só para
trabalho leve, in-process, não-crítico (regra 4.1)"). Não invente IDs; conteúdo do report2
(sem IDs) rastreia por passagem.

LIMITES DE CONTEÚDO:
- ESTADO DE MANUTENÇÃO das libs (regra 4.2): reproduza o que a fonte afirma sobre Celery 5.x,
  arq (maintenance-only), TaskIQ e Dramatiq — o estado de manutenção É conteúdo, não omitir.
- LACUNA DECLARADA (report2): a fonte registra que "qual fila é dominante/superior" NÃO é
  demonstrável. NÃO afirme superioridade de nenhuma fila; a única regra forte é
  "BackgroundTasks não substitui fila durável". O critério documentado (Conflito aberto do
  report2: tarefa pequena + objetos do mesmo app → BackgroundTasks; pesado/multi-process →
  ferramenta como Celery) vira linha de Critérios de decisão.
- Claims "contestado" na fonte NUNCA viram regra dura — nota em Critérios de decisão ou omitir (G3)
- Divergência de versões → normalizar para a mais recente citada (G4)

IDIOMA: PT-BR (D1). Fontes já em PT-BR — destilação direta.

ESTRUTURA: frontmatter EXATO abaixo; corpo ≤200 linhas (hard cap); seções ## Quando consultar
/ ## Padrões sênior (Problema → Padrão → Quando usar → Quando NÃO usar) / ## Anti-padrões
(Sintoma → Correção) / ## Critérios de decisão (tabela) / ## Referências externas;
zero [A DEFINIR].

Tudo que ficar de fora por causa do cap: liste ao final da sua resposta como
"EXCEDENTE PARA TODO.md" com os IDs de regra correspondentes.

FRONTMATTER EXATO (updated = data real de execução, G7):
---
topic: background-jobs-and-queues
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-63884763-1cc1-5739-9753-a968138a53ba_text_markdown.md
  - Infos/knowledge/Python/compass_artifact_wf-9b12d328-b17f-53df-b453-6d3ba54d9f3a_text_markdown.md
  - Infos/knowledge/Python/deep-research-report2.md
tier: 3
triggers: [background jobs, BackgroundTasks, fila, task queue, Celery, arq, TaskIQ, Dramatiq, aio-pika, aiokafka, RabbitMQ, Kafka, broker, idempotência, retry, backoff, acks_late, DLQ, dead letter, DLX, x-death, poison message, scheduling, cron, APScheduler, Celery beat]
related_skills: [/system-design, /infrastructure, /api-design]
updated: {YYYY-MM-DD}
python_versions: ['>=3.11']
---
```

### Passo 3: Check estrutural local (por máquina, nesta fase)

```powershell
# Cap 200 no corpo (frontmatter fora da conta: subtrair as linhas do bloco ---)
(Get-Content knowledge/python/atoms/background-jobs-and-queues.md | Measure-Object -Line).Lines

# 4 seções obrigatórias + zero placeholders
Select-String -Path knowledge/python/atoms/background-jobs-and-queues.md -Pattern '^## (Quando consultar|Padrões sênior|Anti-padrões|Critérios de decisão)'
Select-String -Path knowledge/python/atoms/background-jobs-and-queues.md -Pattern 'A DEFINIR'   # esperado: 0

# Dedup G17: TaskGroup só pode aparecer como referência ao piloto, nunca como ensino
Select-String -Path knowledge/python/atoms/background-jobs-and-queues.md -Pattern 'TaskGroup'
```

Validador de frontmatter:

```
bun -e "const {validateAtomFrontmatter}=require('./skills/init/lib/atoms-frontmatter-validator.ts');console.log(validateAtomFrontmatter('knowledge/python/atoms/background-jobs-and-queues.md'))"
```

### Passo 4: NÃO commitar isoladamente

Wave 1 = 1 commit (fases 01-03 + NOTICES da fase-02). Rodar `bun run harness:validate` antes
do commit da wave (G10).

---

## Gotchas

- **G17 do plano (crítico):** duas fronteiras de dedup nesta fase — piloto async (mecanismo)
  e errors (ângulo error-handling do §14 compartilhado). Claim de mecanismo de event loop ou
  re-ensino de retry-como-error-handling aqui é defeito de wave; corrigir antes do commit.
- **G24 do plano:** a Lacuna declarada do report2 é conteúdo NEGATIVO importante — o átomo
  deve evitar "Celery é o padrão da indústria" e afirmações do gênero. O verifier da fase-05
  checa isso como claim não-rastreável.
- **G3 do plano:** o Conflito aberto "BackgroundTasks vs fila distribuída" tem critério
  documentado na fonte — entra como Critérios de decisão citando o critério, não como regra
  dura inventada ("acima de X segundos use fila" NÃO existe na fonte).
- **G5 do plano:** 4 seções-fonte + DLQ + report2 podem estourar o cap — priorizar: (P1)
  BackgroundTasks-não-é-fila + comparativo 4.2 com estado de manutenção + idempotência 14.1;
  (P2) DLQ + lifespan de brokers 5.1; (P3) scheduling 15.1. Excedente → TODO.md.
- **Local:** compass 63884763 é a MESMA fonte do piloto — o extrator recebe as seções exatas
  (§4-5, §14-15) para não vazar para §1-3/§6-13 (território do piloto).
- **G1 do plano:** nada de `Infos/` no commit.

---

## Verificacao

### TDD (adaptado — conteúdo)

- [ ] **CHECK ESTRUTURAL:** cap ≤200, 4 seções, zero `[A DEFINIR]`, frontmatter válido pelo
      validador
- [ ] **GATE DE FIDELIDADE:** adiado para fase-05 (verifier batch T3)

### Checklist

- [ ] Átomo existe, PT-BR, frontmatter com os 3 `sources:` exatos e `tier: 3`
- [ ] IDs de regra preservados nas claims derivadas das fontes compass (4.1, 4.2, 5.1, 14.1,
      14.2, 15.1)
- [ ] "BackgroundTasks NÃO é fila" presente (Misconception do report2 destilada)
- [ ] Estado de manutenção das 4 task queues presente (Celery 5.x / arq maintenance-only /
      TaskIQ / Dramatiq) sem afirmação de dominância (G24)
- [ ] Grep TaskGroup: só como referência ao piloto (G17)
- [ ] Nenhuma linha tocada em `INDEX.md` (G11)
- [ ] Excedentes (se houver) listados para o TODO.md
- [ ] `bun run harness:validate` verde (antes do commit da wave)

---

## Criterio de Aceite

**Por maquina:**
- `validateAtomFrontmatter` retorna `{valid: true, errors: []}` para o átomo
- Corpo ≤200 linhas; grep `A DEFINIR` = 0; 4 headers de seção presentes

**Por humano (review da wave):**
- Leitura diagonal confirma: ecossistema de filas, sem mecanismo de concorrência re-ensinado,
  sem claim de "fila dominante"

---

<!-- Gerado por /plan-feature em 2026-08-30 -->

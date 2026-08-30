---
topic: deployment-and-production
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-69fdecd5-13b3-516b-86e7-7859d1c0c400_text_markdown.md
tier: 2
triggers: [deploy, produção, uvicorn, gunicorn, granian, workers, docker, multi-stage, non-root, pydantic-settings, graceful shutdown, SIGTERM, preStop, blue-green, canary, rollback, health check, liveness, readiness, structlog, 12-factor, Cloud Run, Lambda, Mangum, Modal, Trusted Publishing]
related_skills: [/infrastructure, /system-design]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Deploy e Produção

## Quando consultar

- Ao escolher servidor/processo de produção (Uvicorn nativo vs Gunicorn vs Granian) e o número de workers
- Ao escrever ou revisar o Dockerfile de um serviço FastAPI (multi-stage, non-root, tamanho de imagem)
- Ao configurar `pydantic-settings` e decidir quais campos são segredo
- Ao desenhar o pipeline de CI (lockfile, cache, gate de migration) ou o fluxo de publish de uma lib
- Ao planejar rollout sem downtime — SIGTERM/preStop, estratégia de deploy (rolling/blue-green/canary) — ou rollback pós-incidente
- Ao desenhar `/live` e `/ready`, o logging de boot, ou escolher plataforma (container long-running vs serverless)

## Padrões sênior

### Pattern: Nunca use `--reload` em produção

- **Problema:** o reloader observa o filesystem e reinicia processos, gerando overhead e instabilidade; combinado com `--workers`, quebra o graceful shutdown — o SIGTERM trava indefinidamente (bug documentado em discussão do Uvicorn).
- **Padrão:** rode `fastapi run app/main.py --workers 4` ou `uvicorn app.main:app --host 0.0.0.0 --port 8000` em staging/produção; `--reload`/`fastapi dev` ficam restritos ao ambiente local.
- **Quando usar `--reload`:** só em desenvolvimento local, nunca em container de staging/produção.
- **Quando NÃO usar:** em produção mesmo sem `--workers` — o reloader sozinho já adiciona overhead e instabilidade desnecessários.

### Pattern: Uvicorn gerencia workers nativamente — Gunicorn deixou de ser obrigatório

- **Problema:** a recomendação histórica assumia Gunicorn como process manager supervisionando `UvicornWorker`s; a imagem oficial `tiangolo/uvicorn-gunicorn-fastapi` está formalmente deprecada.
- **Padrão:** desde a versão 0.30.0 (28/05/2024) o Uvicorn reinicia workers mortos sozinho — use `--workers` nativo (ou `fastapi run --workers N`); comece pela heurística do Gunicorn, `(2 × cores) + 1`, e ajuste por perfil de carga (I/O-bound puro costuma bastar `workers ≈ cores`).
- **Quando usar Gunicorn + `UvicornWorker`:** ainda é escolha válida e conservadora por maturidade de supervisão — ponto contestado: docs históricas e Render preferem Gunicorn, o mantenedor do Uvicorn recomenda usá-lo direto desde mai/2024, com tendência clara para Uvicorn nativo.
- **Quando NÃO usar:** a imagem `tiangolo/uvicorn-gunicorn-fastapi` (deprecada); nem 1 worker num host multi-core; nem múltiplos workers por processo quando o orquestrador (K8s/ECS) já replica 1 processo por container.

### Pattern: Granian só migra com profiling próprio

- **Problema:** buscar throughput trocando o servidor ASGI sem medir o ganho real no seu workload.
- **Padrão:** mantenha Uvicorn (uvloop + httptools) como default; considere Granian (Rust) só se o profiling apontar o servidor ASGI como gargalo — benchmarks sintéticos citam Granian 20–50% mais rápido em CPU-bound e até 4× em connection-heavy.
- **Quando usar:** cenários connection-heavy com pouca lógica de aplicação, validados por benchmark próprio antes de migrar.
- **Quando NÃO usar:** CRUD típico com query no banco — relato de produção aponta o gap contra Uvicorn em torno de ~10%, raramente compensando a migração; ponto contestado entre benchmark sintético e relato de produção.

### Pattern: `pydantic-settings` fail-fast + `SecretStr` para segredos

- **Problema:** ler env vars soltas (`os.getenv`) adia a descoberta de config faltante para o primeiro request (500 em produção); tipar senha/token como `str` deixa o valor vazar em `repr`, logs e tracebacks.
- **Padrão:** defina uma `BaseSettings` (pydantic-settings v2) tipada e instancie no boot — o processo nem sobe se faltar variável, então o deploy falha no lugar certo; tipe segredos como `SecretStr`, que mascara o valor em `repr` e só expõe via `.get_secret_value()`.

```python
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    secret_key: SecretStr
    debug: bool = False

settings = Settings()  # falha no boot se faltar variável
```

- **Quando usar:** toda variável de config/segredo do serviço, validada uma única vez no import.
- **Quando NÃO usar `str` para segredo:** nunca — mas cuidado ao serializar modelos com `SecretStr` dinâmico, que pode gerar erro de serialização do Pydantic.

### Pattern: Docker multi-stage com uv, non-root e imagem slim

- **Problema:** Dockerfile single-stage carrega o binário do uv e ferramentas de build na imagem final; a imagem `python:3.13` completa pesa ~0,9–1,0 GB (uncompressed); rodar como `root` amplia a superfície de ataque; `COPY . .` antes de instalar deps invalida o cache a cada mudança de código.
- **Padrão:** builder stage instala deps com uv; stage final `python:3.13-slim` copia só o necessário e roda como usuário non-root; copie `pyproject.toml` e `uv.lock` e rode `uv sync --frozen --no-dev` (sem deps de desenvolvimento) ANTES de copiar o código, com `UV_COMPILE_BYTECODE=1` e `--mount=type=cache`; adicione `PYTHONUNBUFFERED=1`, `PYTHONDONTWRITEBYTECODE=1` e um `.dockerignore` excluindo `.venv`, `.git` e `__pycache__`.

```dockerfile
FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

FROM python:3.13-slim
RUN useradd -m app
COPY --from=builder --chown=app /app /app
USER app
ENV PATH="/app/.venv/bin:$PATH"
CMD ["fastapi", "run", "app/main.py", "--port", "8000"]
```

- **Quando usar `python:3.13-slim`:** default — fica em ~40 MB comprimida / ~130–150 MB em disco, bem abaixo da imagem completa.
- **Quando NÃO usar sem avaliar o trade-off:** Alpine é menor (~16 MB comprimida / ~50 MB em disco) mas usa musl — risco de wheels incompatíveis ou compilação lenta; distroless (`gcr.io/distroless/python3-debian12`, em torno de ~50 MB) e Chainguard reduzem CVEs mas dificultam debug por não terem shell.

### Pattern: CI com uv — `--locked` e cache por hash do lockfile

- **Problema:** `pip install` no CI é lento; sem lockfile, dois devs (ou o próprio CI) podem instalar árvores de dependências diferentes sem nenhuma mudança de código.
- **Padrão:** instale uv via `astral-sh/setup-uv` com `enable-cache: true`, rode `uv sync --locked` — que falha o build se o `uv.lock` estiver desatualizado — e use o hash do lockfile como chave de cache (`hashFiles('uv.lock')`). O contrato do `uv.lock` em si — o que ele trava e por que commitá-lo — é do átomo `dependencies-and-packaging-uv`; aqui cobre-se só o uso em CI.

```yaml
- uses: astral-sh/setup-uv@v10
  with:
    enable-cache: true
- run: uv sync --locked --all-extras --dev
```

- **Quando usar:** todo pipeline Python com uv, para reprodutibilidade e cache reaproveitado entre runs.
- **Quando NÃO usar tag móvel:** `setup-uv` v10 não publica mais tags móveis e desabilita cache por padrão em eventos de risco (anti cache-poisoning) — pin de patch explícito.

### Pattern: Graceful shutdown — drenar no SIGTERM, alinhar o preStop

- **Problema:** sem drenagem, requests em voo são cortados (5xx) durante o rollout; se o orquestrador mata o processo antes de ele terminar de drenar, a drenagem configurada não serve de nada.
- **Padrão:** configure `--timeout-graceful-shutdown` no Uvicorn para que o processo pare de aceitar conexões novas e espere as em andamento até o prazo; o `terminationGracePeriodSeconds`/timeout do orquestrador deve ficar ligeiramente MAIOR que esse valor; em K8s, mantenha aceitando tráfego por um curto período no `preStop` (`sleep`) para evitar "connection refused" enquanto o SIGTERM ainda não propagou para todos os componentes. O mecanismo de cleanup em si (`lifespan`, fechamento de pool) é do átomo `async-and-concurrency` — aqui o ângulo é só operacional: sinal, orquestrador, drenagem.
- **Quando usar:** todo serviço com rolling deploy ou múltiplas réplicas.
- **Quando NÃO usar `--reload` junto:** `--reload` combinado com `--workers` quebra esse graceful shutdown — o SIGTERM trava indefinidamente.

### Pattern: Migration como stage gated antes do rollout, e rollback compatível

- **Problema:** rodar a migration acoplada ao mesmo entrypoint do app corre contra um DB ainda não-pronto e replica a migration por worker; código faz rollback fácil (reverter a imagem é instantâneo), schema não — se o código antigo não roda contra o schema novo, o rollback falha.
- **Padrão:** rode `alembic upgrade head` como stage dedicado que precisa passar ANTES de subir os novos containers, nunca no mesmo entrypoint do app; garanta que toda migration recente seja backward-compatible para que a versão N-1 do código continue rodando contra o schema atual. A mecânica de expand/contract, `CREATE INDEX CONCURRENTLY` e backfill fica no átomo `migrations-and-schema-evolution` — aqui cobre-se só a ordem no pipeline e a implicação pro rollback.
- **Quando usar:** todo deploy com migration de schema — job de migration (ou init container único) antes do rollout do app.
- **Quando NÃO usar:** cada worker rodando `alembic upgrade head` no próprio startup; ou um release que dropa coluna e muda contrato de API ao mesmo tempo, sem caminho de volta.

### Pattern: Secrets em runtime, nunca em build/imagem — e Trusted Publishing para libs

- **Problema:** build args e camadas do Dockerfile ficam gravados na imagem e em `docker inspect`/histórico — um secret em `ARG`/`ENV` é vazamento permanente; para libs publicadas, um `PYPI_TOKEN` de longa duração em secret é um alvo estático vazável.
- **Padrão:** injete secrets via env var em runtime (secret manager/orquestrador), nunca em `ARG`/`ENV` do Dockerfile; escolha o manager pelo contexto — AWS Secrets Manager em stack só-AWS, Vault quando precisa de dynamic secrets (credencial que expira em 1h) ou é self-host, Doppler pela DX, SOPS para GitOps com secret cifrado versionado — sempre namespaced por ambiente, nunca compartilhado entre eles; para publicar uma lib no PyPI, use Trusted Publishing (OIDC, `permissions: id-token: write` via `pypa/gh-action-pypi-publish`) em vez de token estático.
- **Quando usar Vault/SOPS self-host:** setor regulado sem permissão de enviar segredo a SaaS — Doppler é SaaS-only.
- **Quando NÃO usar:** secret hardcoded ou `.env` commitado; `ARG DB_PASSWORD=...` no Dockerfile; a mesma chave de secret compartilhada entre staging e produção.

### Pattern: Health check — liveness trivial, readiness com dependências

- **Problema:** checar o banco no liveness transforma um soluço do banco em crash loop — o orquestrador reinicia todos os pods, agravando a falha em vez de tirar a instância de tráfego.
- **Padrão:** `/live` retorna 200 sem tocar em nada externo; `/ready` checa DB/cache/dependências críticas e responde 503 se algo falhar; cada check do readiness precisa de timeout curto, e a resposta não deve vazar host/credenciais.

```python
@app.get("/live")
async def live():
    return {"status": "alive"}

@app.get("/ready")
async def ready():
    try:
        await db.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        return JSONResponse({"status": "not ready"}, status_code=503)
```

- **Quando usar startup probe:** apps de boot lento — segura liveness/readiness até o init completar.
- **Quando NÃO usar:** um único `/health` que faz `SELECT 1` reaproveitado como liveness — falha de dependência deve derrubar o pod do load balancer (readiness), não reiniciá-lo (liveness).

### Pattern: Logging JSON estruturado no boot, roteando os loggers do Uvicorn

- **Problema:** sistemas de ingestão (Datadog/CloudWatch/ELK) precisam de JSON; sem rotear os loggers do Uvicorn pelo mesmo pipeline, o app loga em JSON e o Uvicorn loga em texto — dois formatos inconsistentes.
- **Padrão:** configure logging via `dictConfig` no boot — em produção, JSON com structlog (`JSONRenderer`); em dev, console; roteie os loggers do Uvicorn pelo mesmo pipeline, e se usar `uvicorn.run()`, passe `log_config=None` para não sobrescrever o setup próprio.
- **Quando usar:** `structlog` + `ProcessorFormatter` da stdlib, mais `asgi-correlation-id` para correlacionar requests via `bind_contextvars`.
- **Quando NÃO confiar sem checar:** logs de startup do Uvicorn podem sair antes do JSON estar configurado — algumas equipes silenciam o access log padrão e reimplementam via structlog.

## Anti-padrões

### `--reload` combinado com `--workers` em produção

- **Sintoma:** o SIGTERM trava indefinidamente e o processo não desliga — bug documentado em discussão do Uvicorn.
- **Correção:** nunca combinar `--reload` com `--workers`; `--reload` fica restrito ao ambiente de desenvolvimento local.

### Liveness que consulta o banco

- **Sintoma:** um `/health` único faz `SELECT 1` e é usado como liveness — um soluço do banco vira crash loop de todos os pods.
- **Correção:** `/live` trivial sem tocar dependência externa; só o `/ready` checa o banco, com timeout curto e resposta 503.

### Secret em `ARG`/`ENV` do Dockerfile

- **Sintoma:** `ARG DB_PASSWORD=...` (ou equivalente) gravado na imagem — vazamento permanente em `docker inspect`/histórico de camadas.
- **Correção:** injetar o secret via env var em runtime (secret manager/orquestrador), nunca em build args nem no código.

### Migration acoplada ao deploy do app, ou release sem caminho de rollback

- **Sintoma:** cada worker roda `alembic upgrade head` no próprio startup — corre contra um DB possivelmente ainda não-pronto e replica a migration; ou um release dropa coluna e muda contrato de API no mesmo deploy, sem caminho de volta se precisar reverter.
- **Correção:** mover a migration para um stage/job dedicado no pipeline, gated antes do rollout do novo código; manter a versão N-1 compatível com o schema atual — expandir antes, contrair só depois do código novo estar 100% no ar.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Ambiente de produção/staging | `--workers` nativo do Uvicorn, sem `--reload` |
| Host multi-core sem orquestrador / container único em K8s-ECS | `--workers` ≈ `(2 × cores) + 1` como ponto de partida — ou 1 worker por container se o orquestrador já replica |
| Servidor ASGI é gargalo confirmado por profiling | Avaliar Granian sob benchmark próprio antes de migrar |
| Config e segredo do serviço | `pydantic-settings` com fail-fast no boot + `SecretStr` |
| Imagem base para produção | `python:3.13-slim` multi-stage com uv e non-root |
| Escolha de estratégia de rollout | Rolling com readiness gate (default) — Blue-green (switch instantâneo) — Canary (mudança arriscada, fração do tráfego) |
| Migration em pipeline | Stage dedicado, gated antes do rollout — nunca no entrypoint do app |
| Rollback pós-incidente | Imagem: instantâneo; schema: só se a migration foi backward-compatible |
| Probe de liveness | Trivial, sem tocar dependência externa |
| Probe de readiness | Checa dependências críticas, timeout curto, 503 se não pronto |
| Escolha de secret manager pelo contexto | AWS Secrets Manager (só-AWS) — Vault (dynamic secrets/self-host) — SOPS (GitOps, secret cifrado versionado) |
| Setor regulado sem envio de segredo a SaaS | Vault/SOPS self-host — não Doppler |
| Publicar lib no PyPI | Trusted Publishing (OIDC), não token de longa duração |
| Logs em produção | JSON estruturado roteando os loggers do Uvicorn |
| Escolha de plataforma pelo tráfego | Container long-running (Cloud Run/Fly.io/Railway/Render) — Lambda via Mangum ou Web Adapter (intermitente, scale-to-zero) — Modal (GPU/batch) |
| Config e estado do serviço (12-factor) | Config via env, logs como stream, processos stateless |

## Referências externas

- Skill: `/infrastructure` — CI/CD, containers e escolha de plataforma de deploy como parte do pipeline de build
- Skill: `/system-design` — dimensionamento de workers, pools e estratégia de rollout em arquitetura de sistemas distribuídos
- Átomo `async-and-concurrency` — mecanismo de graceful shutdown via `lifespan`/asyncio; aqui cobre-se só o ângulo operacional (SIGTERM, preStop, drenagem no orquestrador)
- Átomo `migrations-and-schema-evolution` — mecânica de expand/contract, `CREATE INDEX CONCURRENTLY` e backfill; aqui cobre-se só o gate de pipeline (stage-gated, ordem migração × rollout)
- Átomo `dependencies-and-packaging-uv` — contrato do `uv.lock` e por que commitá-lo; aqui cobre-se só o uso em CI (`--locked`, cache por hash)
- Source path (audit trail): `Infos/knowledge/Python/compass_artifact_wf-69fdecd5-13b3-516b-86e7-7859d1c0c400_text_markdown.md`

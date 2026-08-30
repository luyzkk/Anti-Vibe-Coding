---
topic: dependencies-and-packaging-uv
stack: python
layer: backend
sources:
  - Infos/knowledge/Python/compass_artifact_wf-b10c35a1-e3cd-582e-abdd-3dd4dc1cd670_text_markdown.md
  - Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md
tier: 2
triggers: [uv, pyproject, PEP 621, PEP 751, PEP 735, uv.lock, lockfile, dependabot, renovate, pip-audit, dependency confusion, extra-index-url, typosquatting, slopsquatting, SBOM, CycloneDX, pinning, vendoring, workspaces, fastapi standard]
related_skills: [/security, /infrastructure]
updated: 2026-08-30
python_versions: ['>=3.11']
---

# Dependências e Empacotamento com uv

## Quando consultar

- Ao iniciar um projeto novo Python 3.13 + FastAPI e escolher gerenciador de pacotes e formato de lockfile
- Ao configurar bot de atualização de dependências (Renovate/Dependabot) ou revisar um PR de upgrade
- Ao decidir se sobe uma minor do FastAPI, ou se adiciona/substitui uma dependência
- Ao publicar um pacote (interno ou no PyPI) e avaliar risco de dependency confusion ou supply chain
- Ao encontrar dependência abandonada, CVE sem fix disponível, ou licença incompatível
- Ao revisar o nome de uma dependência sugerida por um agente de IA antes de instalar

## Padrões sênior

### Pattern: `uv` como gerenciador de pacotes padrão + PEP 621

- **Problema:** ferramentas fragmentadas (pip, pip-tools, virtualenv, pyenv, pipx) geram instalações lentas e não-reprodutíveis; metadados em formatos proprietários (`setup.py`, `[tool.poetry]` pré-2.0) causam lock-in e problemas de interoperabilidade.
- **Padrão:** use `uv` (0.12.x) como gerenciador padrão em projetos novos — unifica as cinco ferramentas num binário Rust com resolver PubGrub e lockfile cross-platform; declare metadados em `pyproject.toml` seguindo PEP 621 (padrão também no Poetry desde a versão 2.0). Um guia de terceiros cita 23 pacotes instalados a partir de cache quente em 0,12s no uv contra 6,6s no pip (~55x), e ~8s contra ~90s num projeto maior com Django+Celery+Pandas+scikit-learn.
- **Quando usar:** `uv init`, `uv add "fastapi[standard]"`, `uv sync --frozen`, `uv run` — projetos novos ou CI lento por reinstalação repetida.
- **Quando NÃO usar:** times já investidos em Poetry 2.x, que continua sólido e correto; ambientes restritos que não permitem instalar ferramenta nova usam pip-tools. uv ainda é jovem (1.0 desde fins de 2024), com compatibilidade parcial de alguns plugins de pip e casos-limite em extensões C exóticas.

### Pattern: Lockfile commitado com hashes (`uv.lock`, PEP 751)

- **Problema:** sem lockfile, dois devs no mesmo dia podem obter árvores de dependências diferentes se uma transitiva lançou entre os installs — falha difícil de diagnosticar porque quebra sem nenhuma mudança de código; `requirements.txt` gerado por `pip freeze` não trava transitivas nem verifica integridade do artefato.
- **Padrão:** commite `uv.lock` — é cross-platform, um único arquivo grava quais pacotes se aplicam a cada Python/OS/arquitetura; rode `uv sync --frozen`/`--locked` em CI para falhar ruidosamente em drift. Se precisar gerar `requirements.txt`, gere com hashes (`uv export --format requirements-txt` ou `pip-compile --generate-hashes`) — hashes previnem instalação de artefato adulterado. PEP 751 (`pylock.toml`, aceito mar/2025) padroniza um formato tool-agnostic com hashes por padrão, mas grava um marcador fixo por pacote em vez do grafo completo, então ainda não substitui o `uv.lock`; suporte experimental em pip 25.1/26.1, uv já exporta via `uv export --format pylock.toml`, Poetry ainda não suportava em abr/2026.
- **Quando usar:** toda aplicação/serviço — garante que laptop, CI e produção instalem a árvore idêntica (o gate de CI com `uv sync --locked` em si fica detalhado no átomo `deployment-and-production`).
- **Quando NÃO usar sem ressalva:** bibliotecas publicadas — o lockfile não afeta consumidores, que resolvem a partir dos ranges do `pyproject.toml`; ainda assim a Astral recomenda commitar para ter CI reprodutível, ponto que outros autores consideram ruído/manutenção extra.

### Pattern: Automação de upgrades — Renovate ou Dependabot

- **Problema:** dependências desatualizadas se acumulam sem bot; a maior parte das vulnerabilidades conhecidas mora fora do código direto — a Sonatype (2024) atribui 88% das vulnerabilidades a dependências transitivas, e a pesquisa da Endor Labs com a Station 9 chega a 95%.
- **Padrão:** automatize com Renovate, que suporta `uv.lock` nativamente (atualiza `pyproject.toml` e o lock, com `lockFileMaintenance` para refrescar transitivas), ou Dependabot, que ganhou suporte a uv mais recentemente — historicamente só atualizava o manifesto via PEP 621 sem refazer o lock, deixando-o dessincronizado. Prefira PRs pequenos e frequentes a upgrades em lote: são diagnosticáveis, enquanto um batch grande esconde qual update quebrou.
- **Quando usar:** `renovate.json` com `lockFileMaintenance` habilitado quando o time quer mais poder de configuração (Renovate é AGPL-3.0, livre para self-host); Dependabot quando quer zero-config nativo do GitHub.
- **Quando NÃO usar sem plano de lockfile:** Dependabot num repo uv sem estratégia para o lockfile — abre PR que muda só o manifesto e deixa `uv.lock` para trás.

### Pattern: FastAPI 0.x — trate minor como potencialmente breaking

- **Problema:** confundir "ainda está em 0.x" com "seguro subir minor sem checar" — a doc oficial do FastAPI (0.141.1 é a versão mais recente citada) diz que breaking changes e novas features são adicionadas em versões MINOR; só o PATCH é bug fix não-breaking. Fixes de segurança já saíram como minor/patch (0.65.1, 0.65.2, 0.109.1) sem garantia de backport.
- **Padrão:** pin em range de minor, por exemplo `fastapi>=0.141.0,<0.142.0`, e rode a suíte de testes antes de subir minor; depois de validar, re-pina. Não pine `starlette` separadamente — cada versão do FastAPI é construída contra uma versão específica de Starlette (que atingiu 1.0.0 em mar/2026, mas a regra permanece: deixe o FastAPI gerenciar essa dependência).
- **Quando usar:** todo projeto FastAPI em produção — 0.x aqui é sinal deliberado de que minors podem quebrar, não sinal de imaturidade; a própria doc do projeto afirma uso em produção nesse estado.
- **Quando NÃO usar sem testes:** subir minor só "porque é minor, não major" sem rodar a suíte antes.

### Pattern: `pip-audit` em CI como gate, com limite claro

- **Problema:** deploy sem scan de CVE deixa vulnerabilidade conhecida em dependência transitiva não-declarada diretamente passar despercebida.
- **Padrão:** rode `pip-audit` (mantido pela Trail of Bits com apoio do Google) em CI — consulta a PyPA Advisory Database via PyPI JSON API e o OSV, roda em segundos. Separe dois scans: um gate contra prod, outro informativo contra dev-deps (um CVE em `pytest` não chega a produção). Para transitiva vulnerável que você não declara diretamente, force a versão corrigida via override/constraint; sem versão corrigida disponível, considere remover a dependência.
- **Quando usar:** todo pipeline antes de deploy; complemente com Safety ou OSV-Scanner (Google, agrega PyPI/GitHub/NVD) no primeiro mês para calibrar — bases diferentes pegam CVEs diferentes.
- **Quando NÃO usar como única defesa:** contra pacote malicioso não-disclosed — `pip-audit` analisa a árvore de dependências, não o código; a própria documentação alerta que `pip-audit -r INPUT` é funcionalmente equivalente a instalar o INPUT.

### Pattern: Critérios para adicionar uma dependência nova

- **Problema:** adicionar dependência costuma ser tratado como solução, mas é uma transferência — move o problema do backlog de construção para o de manutenção de código que você não escreveu, não controla e pelo qual passa a ser responsável indefinidamente.
- **Padrão:** antes de `uv add`, aplique um formulário curto de 5 minutos: por que precisa, alternativas consideradas, licença, status de manutenção, contagem de transitivas, impacto de tamanho. Bus factor de 1 (mantenedor único) só se justifica quando as alternativas são piores e existe plano de contingência explícito para o caso de abandono.
- **Quando usar:** qualquer adição de dependência nova ao projeto.
- **Quando NÃO adicionar:** quando a stdlib do Python 3.13 já resolve o problema.

### Pattern: `uv` workspaces para monorepo

- **Problema:** múltiplos `pyproject.toml` dessincronizando entre pacotes/libs internas que evoluem juntos.
- **Padrão:** use um uv workspace — um único `uv.lock` e `.venv`, com imports editáveis cross-package, num modelo inspirado no Cargo do Rust. Raiz com `[tool.uv.workspace]` e `members = ["packages/*"]`; cada membro com `[tool.uv.sources]` apontando `{workspace = true}`; prefira layout `src/` (`uv init --lib` já usa) para evitar "import fantasma" do diretório de trabalho. O Apache Airflow, com mais de 120 distribuições, migrou seu monorepo para uv workspaces e eliminou milhares de linhas de packaging customizado.
- **Quando usar:** pacotes que evoluem e fazem release juntos — um bump resolve uma vez e todo mundo enxerga o mesmo grafo.
- **Quando NÃO usar:** esperando isolamento de dependências entre membros — Python não isola em runtime, um membro pode importar dependência declarada só por outro (use path deps com venvs separados se isolamento é crítico); para pacotes com ciclos de release independentes, polyrepo evita acoplamento forçado — não há consenso forte sobre qual modelo é superior.

### Pattern: Dependency confusion — índice privado exclusivo

- **Problema:** o comportamento padrão do pip (version-priority) combina índices público e privado e escolhe a versão mais alta — o vetor exato de dependency confusion; `--extra-index-url` NÃO tem prioridade sobre o PyPI público. Alex Birsan demonstrou o ataque em fev/2021 publicando pacotes de versão alta com nomes internos, obtendo execução de código em 35 organizações.
- **Padrão:** para pacotes internos, use o índice privado como `--index-url` exclusivo, nunca como `--extra-index-url`; alternativamente, configure o uv com estratégia de índice restrita ("first-match" em vez de "unsafe-best-match").
- **Quando usar:** qualquer pacote interno cujo nome poderia também ser reivindicado no PyPI público.
- **Quando NÃO usar:** `--extra-index-url` apontando para o índice privado com nomes internos não reivindicados no PyPI — é o anti-padrão central deste vetor. PEP 708 (provisoriamente aceita) e PEP 766 discutem mitigação do lado do índice e do cliente; devpi/Artifactory oferecem mirror com controle de prioridade para ambientes air-gapped.

### Pattern: Licenças incompatíveis detectadas em CI

- **Problema:** licença incompatível — por exemplo GPL/AGPL num produto proprietário — é risco jurídico que escala silenciosamente conforme a árvore de transitivas cresce.
- **Padrão:** combine três ferramentas com ângulos diferentes: `pip-licenses` lista as licenças dos pacotes instalados (lê Trove Classifiers/Metadata, suporta `--fail-on`/`--allow-only`); `licensecheck` avalia a compatibilidade de cada dependência com a licença do projeto lida do `pyproject.toml` (requer Python 3.12+); `reuse lint`, da FSFE, valida headers SPDX no próprio código do repositório, não em dependências de terceiros.
- **Quando usar:** como gate de CI — `pip-licenses --fail-on` para licenças proibidas, `licensecheck --fail-licenses` para compatibilidade das deps, `reuse lint` para conformidade do próprio repositório.
- **Quando NÃO usar:** revisão manual de licenças só no momento do lançamento — não escala conforme a árvore de transitivas cresce.

### Pattern: Dependência abandonada — ordem de resolução

- **Problema:** dependência sem release há 2 ou mais anos, CVE sem correção disponível, ou licença que mudou para termos incompatíveis.
- **Padrão:** siga a ordem que minimiza custo de manutenção: primeiro um fork já mantido pela comunidade; depois uma alternativa ativa que resolva o mesmo problema; em seguida vendor do código, se a lib é pequena e a licença permite; e só em último caso um fork próprio aplicando apenas os patches de segurança necessários.
- **Quando usar:** ao detectar o abandono — a pior opção é não fazer nada e torcer para o scanner de CVE não achar, porque ele acha, e a migração fica mais urgente e mais cara depois.
- **Quando NÃO tratar fork como solução definitiva:** forkar não é "possuir" — você herda a manutenção inteira; às vezes patrocinar o mantenedor original sai mais barato que reescrever.

### Pattern: Pinning — aplicação pina, biblioteca declara ranges

- **Problema:** biblioteca publicada com `==` exato torna o grafo insolúvel para quem a consome; aplicação sem lockfile confunde pin no manifesto com reprodutibilidade real.
- **Padrão:** a reprodutibilidade de uma aplicação vem do lockfile, não dos pins do manifesto — `==` numa app serve só para gerar PRs de upgrade legíveis no Renovate/Dependabot, já que o diff aparece no manifesto em vez de escondido no lock; uma biblioteca deve declarar ranges com lower bound (`>=`).
- **Quando usar cap de upper bound:** só quando existe incompatibilidade real conhecida (`poetry-relax` remove caps automáticos de bibliotecas). Ponto CONTESTADO na fonte: Henry Schreiner e packagers de distro como Michał Górny (Gentoo) argumentam que caps automáticos não escalam — quando muitas libs capam, o grafo fica insolúvel, e libs que capam acabam exigindo updates mais frequentes; o time do Poetry defende o caret (`^1.2.3` equivale a `>=1.2.3,<2.0.0`) como conveniente e afirmou que esse comportamento nunca vai mudar.
- **Quando NÃO usar:** cap de `requires-python` para cima — esse campo serve só para dropar versões antigas do Python, nunca para limitar o topo.

### Pattern: SBOM CycloneDX e PEP 740 attestations

- **Problema:** requisito de compliance ou de resposta a incidente sem inventário de dependências nem proveniência verificável do artefato publicado.
- **Padrão:** gere um SBOM CycloneDX a partir do ambiente instalado com `cyclonedx-py environment` — é a forma mais precisa, inclui grafo, licenças e metadados, e suporta a spec CycloneDX até 1.6 (`pip-audit` também emite SBOM CycloneDX). Ao publicar no PyPI, use Trusted Publishing via OIDC em vez de token de API de vida longa, o que habilita as PEP 740 attestations (GA em nov/2024) — elas ligam criptograficamente cada distribuição à sua proveniência via Sigstore/in-toto, e a action oficial `gh-action-pypi-publish` já as gera por padrão.
- **Quando usar:** todo pacote publicado no PyPI — mais de 50.000 projetos já usam Trusted Publishing, e mais de 20% dos uploads do último ano vieram de trusted publishers, segundo o blog oficial da PyPI (o passo a passo do workflow de publish em si fica no átomo `deployment-and-production`).
- **Quando NÃO usar como defesa isolada:** hash pinning e attestation não protegem contra um upstream genuinamente comprometido (ver Anti-padrões) — combine com revisão do próprio pipeline de build/publish.

### Pattern: PEP 735 `dependency-groups` para dev/test/docs

- **Problema:** dependências de desenvolvimento coladas em `optional-dependencies` (extras) ou espalhadas em tabelas proprietárias por ferramenta, como `[tool.poetry.group...]` ou `[tool.pdm.dev-dependencies]`.
- **Padrão:** use a tabela `[dependency-groups]`, padronizada pela PEP 735 (resolvida out/2024). A diferença-chave: extras são features publicadas, instaláveis pelos consumidores do pacote; dependency-groups NÃO são publicados, ficam fora de qualquer distribuição. Suportado pelo uv desde a versão 0.4.27, além de pip e Dependabot.
  ```toml
  [dependency-groups]
  test = ["pytest", "coverage"]
  docs = ["sphinx>=8"]
  ```
  Instale com `uv sync --group test`.
- **Quando usar:** qualquer dependência que só serve ao desenvolvimento, teste ou documentação do próprio projeto.
- **Quando NÃO usar:** expor `pytest` como extra publicado no PyPI — polui a interface pública do pacote.

### Pattern: `fastapi` puro vs extra `standard` vs extra `all`

- **Problema:** `pip install fastapi` sozinho não sobe servidor nenhum; no sentido oposto, um container de produção pode arrastar dependências que nunca são usadas.
- **Padrão:** `fastapi` sozinho traz só o core — Starlette e Pydantic. O extra `standard` soma o grupo padrão: `uvicorn` com extras próprios de uvloop e httptools para performance, `fastapi-cli` com extras próprios que já incluem o cloud CLI, além de `python-multipart`, `email-validator` e `jinja2`. Para produção enxuta, instale `fastapi` mais só o que o projeto de fato usa — inclua o extra de e-mail do Pydantic apenas se o projeto realmente validar e-mail.
- **Quando usar o extra `standard`:** ambiente de desenvolvimento — `uv add "fastapi[standard]"`.
- **Quando NÃO usar o extra `all` em produção:** ele arrasta pacotes como pyyaml e ujson raramente usados; para produção mínima prefira instalar `fastapi` e `uvicorn` com o extra `standard` separadamente, e adicionar o restante manualmente caso não queira a CLI/cloud CLI. O antigo pacote `fastapi-slim` foi descontinuado como caminho recomendado.

### Pattern: Typosquatting e slopsquatting em nomes de pacotes

- **Problema:** nome de pacote parecido com uma lib popular (typosquatting) ou nome de pacote que nem existe mas foi sugerido por um LLM (slopsquatting) — instalar qualquer um dos dois executa código do atacante.
- **Padrão:** revise o nome exato antes de instalar e use ferramentas como Socket/OSV para detecção comportamental. O estudo Spracklen et al. (USENIX Security 2025) analisou 576.000 amostras de código de 16 LLMs e encontrou 19,7% de pacotes recomendados alucinados — inexistentes —, totalizando 205.474 nomes únicos, com taxa de 5,2% em modelos comerciais contra 21,7% em modelos open-source; ao repetir o mesmo prompt 10 vezes, 43% dos nomes alucinados reapareceram em todas as execuções e 58% em mais de uma — previsibilidade que permite ao atacante registrar o nome falso e esperar a vítima instalá-lo. O termo foi cunhado por Seth Larson, da PSF, em abr/2025. Separadamente, uma onda clássica de typosquatting somou 566 publicações maliciosas a partir de 26/mar/2024 mirando TensorFlow, requests e BeautifulSoup, levando o PyPI a suspender criação de contas por cerca de 10 horas.
- **Quando usar verificação extra:** toda dependência nova sugerida por um agente de IA — confirme existência real, popularidade/downloads, repositório e maintainers antes de instalar.
- **Quando NÃO confiar apenas no nome parecer familiar:** variantes geradas por LLM são mais difíceis de detectar porque o código clonado funciona; combine com contas de organização verificadas no PyPI e scanners comportamentais.

## Anti-padrões

### Tratar `requirements.txt` como lockfile

- **Sintoma:** `pip freeze > requirements.txt` sem hashes, usado como se travasse a árvore de dependências.
- **Correção:** gerar com `uv export --format requirements-txt` (ou `pip-compile --generate-hashes`) para incluir hashes, ou preferir `uv.lock` como lockfile real.

### `uv.lock` no `.gitignore`

- **Sintoma:** tratar `uv.lock` como artefato local (igual `.venv`) e ignorá-lo no controle de versão.
- **Correção:** commitar `uv.lock` sempre — é análogo a `poetry.lock`/`package-lock.json`; ignorá-lo causa divergência silenciosa entre laptop, CI e produção.

### Pinar `starlette` separadamente do `fastapi`

- **Sintoma:** `starlette==X.Y.Z` fixado a mão no manifesto, junto com `fastapi`.
- **Correção:** deixar o FastAPI gerenciar a versão de Starlette — cada release do FastAPI é construída e testada contra uma versão específica dela.

### Confiar em hash pinning contra upstream comprometido

- **Sintoma:** achar que hash e assinatura bastam quando o artefato malicioso é exatamente o que o projeto genuinamente publicou. A fonte cita três casos reais: script injection em CI roubando token de publish (`ultralytics`, dez/2024), account takeover via domínio de e-mail expirado do mantenedor (`ctx`, mai/2022), e dependency confusion de pacote nightly sombreando o índice oficial (`torchtriton`, dez/2022).
- **Correção:** tratar o pipeline de build/publish como parte da superfície de ataque — pin de GitHub Actions por SHA (não por tag), revisão de workflows `pull_request_target`, Trusted Publishing com attestations, índice privado com prioridade correta.

### Tratar fork de dependência abandonada como solução permanente

- **Sintoma:** forkar uma lib abandonada e considerar o problema resolvido, sem orçar a manutenção contínua que isso exige.
- **Correção:** aplicar só os patches de segurança necessários e reavaliar periodicamente se um fork mantido pela comunidade ou uma alternativa ativa já apareceu; considerar patrocinar o mantenedor original quando for mais barato que reescrever.

## Critérios de decisão

| Cenário | Escolha |
|---|---|
| Projeto novo Python 3.13 + FastAPI | `uv` + PEP 621 (`pyproject.toml`) |
| Time já investido em Poetry 2.x | Manter Poetry — `uv` não é obrigatório |
| Gerar `requirements.txt` a partir do lockfile | `uv export --format requirements-txt` (com hashes) |
| Nome de pacote interno também existe no PyPI público | Índice privado como `--index-url` exclusivo — nunca `--extra-index-url` |
| Bot de update num repo com `uv.lock` | Renovate — suporte nativo ao lockfile + `lockFileMaintenance` |
| Subir uma minor do FastAPI | Rodar a suíte de testes antes — minor pode ser breaking |
| CVE em transitiva sem fix disponível | Forçar override/constraint, ou remover a dependência |
| Múltiplos pacotes internos que evoluem juntos | `uv` workspace com lockfile único |
| Dependência sem release há 2+ anos | Fork mantido > alternativa ativa > vendor > fork próprio |
| Biblioteca publicada (não aplicação) | Ranges com lower bound (`>=`), nunca `==` exato |
| Dependências só de dev/test/docs | PEP 735 `[dependency-groups]`, não extras publicados |
| Container de produção FastAPI enxuto | `fastapi` + extra `standard` do uvicorn, evitar extra `all` |
| Nome de dependência sugerido por um agente de IA | Verificar existência real, downloads, repositório e maintainers |

## Referências externas

- Skill: `/security` — supply chain, dependency confusion e SBOM como parte da superfície de ataque
- Skill: `/infrastructure` — CI/CD, gate de lockfile e Trusted Publishing como parte do pipeline de build
- Source paths (audit trail):
  - Infos/knowledge/Python/compass_artifact_wf-b10c35a1-e3cd-582e-abdd-3dd4dc1cd670_text_markdown.md
  - Infos/knowledge/Python/compass_artifact_wf-0e7023f8-7d89-5d84-87c6-ee9d799620d3_text_markdown.md (apenas §18)

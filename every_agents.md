# Arquiteturas Anativas de agentes

Um guia técnico para aplicações de construção onde agentes são cidadãos de primeira classe

Dan Shipper
Dan Shipper
Claude
Claude
Este documento é coautorado por Dan Shipper e Claude. Ele sintetiza princípios de aplicativos que construímos (Leitor, Anedota) e ideias que surgiram por meio de conversas.

Alguns padrões aqui Dan defendem — são testados ou profundamente considerados. Outras são as contribuições de Claude durante o processo de construção que precisam de mais validação. Marcamos esses com avisos.

Leia com Claude
Leia com o ChatGPT

Cópia para o agente
Uso em engenharia de compostos
Por que agora
Agentes de software funcionam de forma confiável agora. Claude Code demonstrou que um grande modelo de linguagem (LLM) com acesso a ferramentas bash e de arquivos, operando em um ciclo até que um objetivo seja alcançado, pode realizar tarefas complexas em múltiplas etapas de forma autônoma.

A descoberta surpreendente: um agente de codificação realmente bom é, na verdade, um agente de uso geral muito bom. A mesma arquitetura que permite ao Claude Code refatorar uma base de código pode permitir que um agente organize seus arquivos, gerencie sua lista de leitura ou automatize seus fluxos de trabalho.

O kit de desenvolvimento de software (SDK) Claude Code torna isso acessível. Você pode construir aplicações onde funcionalidades não são código que você escreve — são resultados que você descreve, alcançados por um agente com ferramentas, operando em um ciclo até que o resultado seja alcançado.

Isso abre um novo campo: software que funciona do jeito que o Claude Code funciona, aplicado a categorias muito além da programação.

Princípios fundamentais
1
Paridade
Tudo o que o usuário pode fazer pela interface, o agente deve conseguir fazer isso por meio de ferramentas.

Esse é o princípio fundamental. Sem ele, nada mais importa. Garanta que o agente tenha ferramentas que possam realizar tudo o que a interface pode fazer.

O teste: Escolha qualquer ação da interface. O agente consegue realizar isso?

2
Granularidade
Ferramentas deveriam ser primitivas atômicas. Características são resultados alcançados por um agente operando em um ciclo.

Uma ferramenta é uma capacidade primitiva. Uma característica é um resultado descrito em um prompt, alcançado por um agente com ferramentas, operando em um ciclo até que o resultado seja alcançado.

O teste: Para mudar o comportamento, você edita prompts ou refatora código?

3
Componibilidade
Com as ferramentas atômicas e a paridade, você pode criar novos recursos apenas escrevendo novos prompts.

Quer um recurso de "revisão semanal"? Isso é só um prompt:

"Review files modified this week. Summarize key changes.
Based on incomplete items and approaching deadlines,
suggest three priorities for next week."
O agente usa , , e seu julgamento. Você descreveu um resultado; O agente repete até que isso seja alcançado. list_filesread_file

4
Capacidade emergente
O agente pode realizar coisas para as quais você não foi explicitamente projetado.

O volante de inércia:

1. Construir com ferramentas atômicas e paridade

2. Usuários pedem coisas que você não esperava

3. O agente compõe ferramentas para realizá-las (ou falha, revelando uma lacuna)

4. Você observa padrões no que está sendo solicitado

5. Adicionar ferramentas ou prompts de domínio para tornar padrões comuns eficientes

6. Repita

O teste: Ele consegue lidar com requisições abertas no seu domínio?

5
Melhorias ao longo do tempo
Aplicações agent-nativas melhoram com o contexto acumulado e o refinamento rápido.

Diferente do software tradicional, aplicativos agent-nativos podem melhorar sem necessidade de enviar código.

Contexto acumulado: O estado persiste entre as sessões por meio de arquivos de contexto

Refinamento em nível de desenvolvedor: Prompts atualizados para todos os usuários

Personalização em nível de usuário: Os usuários modificam prompts para seu fluxo de trabalho

Princípios na prática
Os detalhes que tornam os cinco princípios operacionais.

Paridade
Imagine um aplicativo de anotações com uma interface bonita para criar, organizar e marcar anotações. Um usuário pergunta: "Crie uma nota resumindo minha reunião e marque-a como urgente." Se a interface consegue fazer isso mas o agente não, o agente fica travado.

A solução: Garanta que o agente tenha ferramentas (ou combinações de ferramentas) que possam realizar tudo o que a interface pode fazer. Não se trata de um mapeamento um a um dos botões da interface para as ferramentas — trata-se de alcançar os mesmos resultados.

A disciplina: Ao adicionar qualquer funcionalidade de interface, pergunte: O agente consegue alcançar esse resultado? Se não, adicione as ferramentas ou primitivos necessários.

Um mapa de capacidades ajuda:

Ação do Usuário	Como o Agente Consegue
Crie uma nota	write_file para o diretório de notas ou ferramentacreate_note
Marque uma nota como urgente	update_file Metadados, ou ferramentatag_note
Notas de busca	search_files ou ferramentasearch_notes
Apague uma nota	delete_file ou ferramentadelete_note
O teste: Escolha qualquer ação que um usuário possa realizar na sua interface. Descreva isso para o agente. Será que pode alcançar o resultado?

Granularidade
A mudança principal: o agente está buscando um resultado com julgamento, não executando uma sequência coreografada. Pode encontrar casos inesperados, ajustar sua abordagem ou fazer perguntas esclarecedoras — o ciclo continua até que o resultado seja alcançado.

Quanto mais atômicas suas ferramentas, mais flexível o agente pode usá-las. Se você agrupar a lógica de decisão nas ferramentas, você transferiu o julgamento de volta para o código.

Componibilidade
Isso funciona para desenvolvedores e usuários. Você pode lançar novos recursos adicionando prompts. Os usuários podem personalizar o comportamento modificando prompts ou criando seus próprios.

A restrição: isso só funciona se as ferramentas forem atômicas o suficiente para serem compostas de maneiras que você não esperava, e se o agente tiver paridade com os usuários. Se as ferramentas codificam muita lógica, a composição se desfaz.

Capacidade Emergente
Exemplo: "Cruze minhas anotações de reunião com minha lista de tarefas e me diga o que me comprometi, mas não agendei." Você não criou um rastreador de compromisso, mas se o agente conseguir ler notas e tarefas, ele pode realizar isso.

Isso revela demanda latente. Em vez de adivinhar quais recursos os usuários querem, você observa o que eles estão pedindo ao agente para fazer. Quando os padrões surgem, você pode otimizá-los com ferramentas específicas de domínio ou prompts dedicados. Mas você não precisava antecipá-los—você os descobriu.

Isso muda a forma como você constrói produtos. Você não está tentando imaginar todos os recursos logo de cara. Você está criando uma base capaz e aprendendo com o que surge.

Melhorias ao longo do tempo
Contexto acumulado: O agente mantém o estado entre as sessões — o que existe, o que o usuário fez e o que funcionou.

Refinamento de prompts em múltiplos níveis: atualizações em nível de desenvolvedor, personalização em nível de usuário e ajustes (avançados) em nível de agente baseados no feedback.

Automodificação (avançada): Agentes que editam seus próprios prompts ou códigos precisam de trilhos de segurança — portões de aprovação, pontos de controle, rotas de retrocesso e verificações de saúde.

Os mecanismos ainda estão sendo descobertos. Contexto e refinamento rápido são comprovados; A automodificação está surgindo.

Ferramentas deveriam ser primitivas atômicas. Características são resultados alcançados por um agente operando em um ciclo. O agente toma as decisões; Os prompts descrevem o resultado.

Menos granular
Tool: classify_and_organize_files(files)
→ You wrote the decision logic
→ Agent executes your code
→ To change behavior, you refactor
Inclui o julgamento na ferramenta. Limita a flexibilidade.

Mais granular
Tools: read_file, write_file, move_file, bash
Prompt: "Organize the downloads folder..."
→ Agent makes the decisions
→ To change behavior, edit the prompt
O agente busca resultados com julgamento. Fortalece a flexibilidade.

De primitivas a ferramentas de domínio
Comece com primitivas puras: bash, operações de arquivo, armazenamento básico. Isso prova que a arquitetura funciona e revela o que o agente realmente precisa.

À medida que os padrões surgem, adicione ferramentas específicas de cada domínio de forma deliberada. Use-os para ancorar vocabulário, adicionar proteções ou melhorar a eficiência.

Vocabulário
Uma ferramenta ensina ao agente o que "nota" significa no seu sistema.create_note

Guarda-corpos
Algumas operações precisam de validação que não deve ser deixada ao julgamento do agente.

Eficiência
Operações comuns podem ser agrupadas por rapidez e custo.

analyze_and_publish(input)
Agrupa o julgamento na ferramenta

publish(content)
Uma ação; O agente decidiu o que publicar

A regra para ferramentas de domínio: Eles devem representar uma ação conceitual do ponto de vista do usuário. Elas podem incluir validação mecânica, mas o julgamento sobre o que fazer ou se deve fazer pertence ao enunciado.

Mantenha primitivos disponíveis. Ferramentas de domínio são atalhos, não portas. A menos que haja um motivo específico para restringir o acesso (segurança, integridade de dados), o agente ainda deve poder usar primitivas subjacentes para casos limites. Isso preserva a compostibilidade e a capacidade emergente. O padrão é aberto; Faça do bloqueio uma decisão consciente.

Passando para programação
Algumas operações precisarão migrar de código orquestrado por agentes para código otimizado para desempenho ou confiabilidade.

1
O agente usa primitivas em um loop

Flexível, prova o conceito

2
Adicionar ferramentas de domínio para operações comuns

Mais rápido, ainda orquestrado por agentes

3
Para caminhos quentes, implemente em código otimizado

Rápido, determinístico

A ressalva: Mesmo quando uma operação evolui para o código, o agente deve ser capaz de acionar a operação otimizada por conta própria e recorrer a primitivas para casos limites, que o caminho otimizado não gerencia. Formatura é sobre eficiência. A paridade ainda se mantém.

•
O agente pode acionar a operação otimizada diretamente
•
O agente pode recorrer a primitivas para casos extremos
Arquivos como interface universal
Agentes são naturalmente bons com arquivos. Claude Code funciona porque bash + filesystem é a interface de agente mais testada em batalha.

Já Conhecido
Os agentes já sabem , , , . Operações de arquivo são as primitivas com as quais eles são mais fluentes.catgrepmvmkdir

Inspecionável
Os usuários podem ver o que o agente criou, editar, mover, excluir. Sem caixa preta.

Portátil
Exportar é trivial. Backup é trivial. Os usuários são donos de seus dados.

Sincronizações entre dispositivos
No celular com iCloud, todos os dispositivos compartilham o mesmo sistema de arquivos. O trabalho do agente aparece em todo lugar — sem construir um servidor.

Autodocumentação
/projects/acme/notes/ é autodocumentada de uma forma que não é.SELECT * FROM notes WHERE project_id = 123

Um princípio geral do design agente-nativo: Projete para o que os agentes podem argumentar. O melhor indicador para isso é o que faria sentido para um humano. Se um humano consegue olhar a estrutura do seu arquivo e entender o que está acontecendo, provavelmente um agente também pode.

Precisa de validação

A contribuição de Claude na construção; Dan ainda está formando sua opinião. Essas convenções são uma abordagem que funcionou até agora, não uma prescrição. Soluções melhores devem ser consideradas.

Diretórios com escopo de entidade
{entity_type}/{entity_id}/
├── primary content
├── metadata
└── related materials
Exemplo: contém texto completo, notas, fontes e registros de agentes.Research/books/{bookId}/

Nomeação de diretórios
•
Escopo de entidade: {entityType}/{entityId}/
•
Coleções: (por exemplo, {type}/AgentCheckpoints/)
•
Convenção: minúsculas com sublinhaduras, não camelCase
Markdown para conteúdo legível por humanos; JSON para dados estruturados.

Uma abordagem para nomear:
Arquivo	Padrão de Nomenclatura	Exemplo
Dados da entidade	{entity}.json	library.json, status.json
Conteúdo legível por humanos	{content_type}.md	introduction.md, profile.md
Raciocínio do agente	agent_log.md	Histórico do agente por entidade
Conteúdo principal	full_text.txt	Texto baixado/extraído
Multi-volume	volume{N}.txt	volume1.txt, volume2.txt
Fontes externas	{source_name}.md	wikipedia.md, sparknotes.md
Pontos de controle	{sessionId}.checkpoint	Baseado em UUID
Configuração	config.json	Configurações de recursos
Estrutura de diretórios
Documents/
├── AgentCheckpoints/     # Ephemeral
│   └── {sessionId}.checkpoint
├── AgentLogs/            # Debugging
│   └── {type}/{sessionId}.md
└── Research/             # User's work
    └── books/{bookId}/
        ├── full_text.txt
        ├── notes.md
        └── agent_log.md
O padrão context.md
# Context

## Who I Am
Reading assistant for the Every app.

## What I Know About This User
- Interested in military history and Russian literature
- Prefers concise analysis
- Currently reading *War and Peace*

## What Exists
- 12 notes in /notes
- three active projects
- User preferences at /preferences.md

## Recent Activity
- User created "Project kickoff" (two hours ago)
- Analyzed passage about Austerlitz (yesterday)

## My Guidelines
- Don't spoil books they're reading
- Use their interests to personalize insights

## Current State
- No pending tasks
- Last sync: 10 minutes ago
The agent reads this file at the start of each session and updates it as state changes—portable working memory without code changes.

Files vs. database
Needs validation

This framing is one way to think about it, and it's specifically informed by mobile development. For web apps, the tradeoffs are different—Dan doesn't have a strong opinion there yet.

Use files for...
•
Content users should read/edit
•
Configuration that benefits from version control
•
Agent-generated content
•
Anything that benefits from transparency
•
Large text content
Use database for...
•
High-volume structured data
•
Data that needs complex queries
•
Ephemeral state (sessions, caches)
•
Data with relationships
•
Data that needs indexing
The principle: Files for legibility, databases for structure. When in doubt, files—they're more transparent and users can always inspect them.

The file-first approach works when:

• Scale is small (one user's library, not millions of records)
• Transparency is valued over query speed
• Cloud sync (iCloud, Dropbox) works well with files
Hybrid approach

Even if you need a database for performance, consider maintaining a file-based "source of truth" that the agent works with, synced to the database for the UI.

Conflict model
If agents and users write to the same files, you need a conflict model.

Atomic writes (current reality)
// Swift - last-write-wins via atomic writes
try data.write(to: url, options: [.atomic])
Simple but can lose changes.

iCloud conflict monitoring
// Watch for sync conflicts
NotificationCenter.default.addObserver(
    forName: .NSMetadataQueryDidUpdate,
    ...
)
// Creates: {filename} (conflict).md
Monitor and resolve conflicts explicitly.

Last write wins

Simple, changes can be lost

Check before writing

Skip if modified since read

Separate spaces

Agent → drafts/, user promotes

Append-only logs

Additive, never overwrites

File locking

Prevent edits while open

Practical guidance: Logs and status files rarely conflict. For user-edited content, consider explicit handling or keep agent output separate. iCloud adds complexity by creating conflict copies.

Agent execution patterns
Completion signals
Agents need an explicit way to say "I'm done." Don't detect completion through heuristics.

struct ToolResult {
  let success: Bool
  let output: String
  let shouldContinue: Bool
}

.success("Result")  // continue
.error("Message")   // continue (retry)
.complete("Done")   // stop loop
Completion is separate from success/failure: A tool can succeed and stop the loop, or fail and signal continue for recovery.

What's not yet standard: Richer control flow signals like:

•
pause—agent needs user input before continuing

•
escalate—agent needs a human decision outside its scope

•
retry—transient failure, orchestrator should retry

Currently, if the agent needs input, it asks in its text response. There's no formal "blocked waiting for input" state. This is an area still being figured out.

Model tier selection
Not all agent operations need the same intelligence level.

Task Type	Tier	Reasoning
Research agent	Balanced	Tool loops, good reasoning
Chat	Balanced	Fast enough for conversation
Complex synthesis	Powerful	Multi-source analysis
Quick classification	Fast	High volume, simple task
The discipline: When adding a new agent, explicitly choose its tier based on task complexity. Don't always default to "most powerful."

Partial completion
struct AgentTask {
    var status: TaskStatus  // pending, in_progress, completed, failed, skipped
    var notes: String?      // Why it failed, what was done
}

var isComplete: Bool {
    tasks.allSatisfy { $0.status == .completed || $0.status == .skipped }
}
For multi-step tasks, track progress at the task level. What the UI shows:

Progress: 3/5 tasks complete (60%)
✓
[1] Find source materials
✓
[2] Download full text
✓
[3] Extract key passages
✗
[4] Generate summary - Error: context limit
○
[5] Create outline
Partial completion scenarios:
Agent hits max iterations

Some tasks completed, some pending. Checkpoint saved. Resume continues from where it left off.

Agent fails on one task

Task marked failed with error in notes. Other tasks may continue (agent decides).

Network error mid-task

Current iteration throws. Session marked failed. Checkpoint preserves messages up to that point.

Context limits
Agent sessions can extend indefinitely, but context windows don't. Design for bounded context:

Tools should support iterative refinement (summary → detail → full) rather than all-or-nothing

Give agents a way to consolidate learnings mid-session ("summarize what I've learned and continue")

Assume context will eventually fill up—design for it from the start

Implementation patterns
Shared workspace
Agents and users should work in the same data space, not separate sandboxes.

UserData/
├── notes/           ← Both agent and user read/write here
├── projects/        ← Agent can organize, user can override
└── preferences.md   ← Agent reads, user can edit
Benefits:
•
Users can inspect and modify agent work

•
Agents can build on what users create

•
No synchronization layer needed

•
Complete transparency

This should be the default. Sandbox only when there's a specific need (security, preventing corruption of critical data).

Context injection
The agent needs to know what it's working with. System prompts should include:

Available resources
## Available Data
- 12 notes in /notes
- Most recent: "Project kickoff"
- three projects in /projects
- Preferences at /preferences.md
Capabilities
## What You Can Do
- Create, edit, tag, delete notes
- Organize files into projects
- Search across all content
- Set reminders (write_file)
Recent activity
## Recent Context
- User created "Project kickoff"
  note (two hours ago)
- User asked about Q3 deadlines
  yesterday
For long sessions, provide a way to refresh context so the agent stays current.

Agent-to-UI communication
When agents act, the UI should reflect it immediately. Event types for chat integration:

enum AgentEvent {
    case thinking(String)        // → Show as thinking indicator
    case toolCall(String, String) // → Show tool being used
    case toolResult(String)       // → Show result (optional)
    case textResponse(String)     // → Stream to chat
    case statusChange(Status)     // → Update status bar
}
The key: no silent actions. Agent changes should be visible immediately.

Real-time progress:
•
Show thinking progress (what the agent is considering)

•
Show current tool being executed

•
Stream text incrementally as it's generated

•
Update task list progress in real-time

Communication patterns:
•
Shared data store (recommended)

•
File system observation

•
Event system (more decoupled, more complexity)

Some tools are noisy; consider an flag to hide internal checks while still showing meaningful actions.ephemeralToolCalls

Silent agents feel broken. Visible progress builds trust.

Implicações para o produto
A arquitetura agent-native tem consequências sobre como os produtos se sentem, não apenas sobre como são construídos.

Divulgação progressiva
Simples para começar, mas infinitamente poderosos. Solicitações básicas funcionam imediatamente. Usuários avançados podem ir em direções inesperadas.

Excel é o exemplo canônico: lista de compras ou modelo financeiro, mesma ferramenta. Claude Code também tem essa qualidade. A interface permanece simples; A capacidade escala com o pedido.

•
Entrada simples: requisições básicas funcionam sem curva de aprendizado
•
Profundidade descobrível: os usuários descobrem novo poder enquanto exploram
•
Sem teto: usuários avançados vão além do que você esperava
O agente encontra os usuários onde eles estão.

Descoberta da demanda latente
Construa uma base competente. Observe o que os usuários pedem ao agente para fazer. Formalize os padrões que surgem. Você está descobrindo, não adivinhando.

Desenvolvimento tradicional de produto: Imagine o que os usuários querem, construa, veja se você está certo.

Desenvolvimento de produto nativo de agentes: construa uma base capaz, observe o que os usuários pedem ao agente para fazer, formalize os padrões que surgem.

Quando os usuários pedem algo ao agente e ele dá certo, isso é sinal. Quando eles pedem e falham, isso também é sinal — revela uma lacuna nas suas ferramentas ou paridade.

Com o tempo, você pode:

•
Adicione ferramentas de domínio para padrões comuns (tornando-os mais rápidos e confiáveis)
•
Crie prompts dedicados para solicitações frequentes (tornando-as mais acessíveis)
•
Remova ferramentas que não estão sendo usadas (simplifica o sistema)
O agente se torna um instrumento de pesquisa para entender o que seus usuários realmente precisam.

Aprovação e agência de usuários
Precisa de validação

Esse framework é uma contribuição do Claude que surgiu do processo de construção de alguns dos aplicativos do Every. Mas ainda não foi testado em batalha e Dan ainda está formando sua opinião aqui.

Quando os agentes tomam ações não solicitadas — fazendo as coisas por conta própria em vez de responder a pedidos explícitos — você precisa decidir quanta autonomia conceder. Considere riscos e reversibilidade:

Apostas	Reversibilidade	Padrão	Exemplo
Baixo	Fácil	Aplicação automática	Organização de arquivos
Baixo	Difícil	Confirmação rápida	Publicação para alimentar
Alto	Fácil	Sugira + candidate-se	Mudanças no código
Alto	Difícil	Aprovação explícita	Enviando e-mails
Nota: Isso se aplica a ações de agentes não solicitados. Se o usuário pedir explicitamente ao agente para fazer algo ("enviar esse e-mail"), isso já é aprovação — o agente simplesmente faz.

A automodificação deve ser legível

Quando os agentes podem modificar seu próprio comportamento — mudando prompts, atualizando preferências, ajustando fluxos de trabalho — os objetivos são:

• Visibilidade sobre o que mudou
• Compreender os efeitos
• Capacidade de retroceder
Fluxos de aprovação são uma forma de alcançar isso. Logs de auditoria com rollback fácil podem ser outra. O princípio é: Faça com que seja legível.

Móvel
O mobile é uma plataforma de primeira classe para aplicativos nativos de agentes. Ele possui restrições e oportunidades únicas.

Um Sistema de Arquivos
Agentes podem trabalhar naturalmente com arquivos, usando as mesmas primitivas que funcionam em todos os outros lugares.

Contexto Rico
Um jardim murado ao qual você tem acesso. Dados de saúde, localização, fotos, calendários — contexto que não existe no desktop ou na web.

Aplicativos Locais
Cada um tem sua própria cópia do app. Apps que se modificam, se forkam, evoluem por usuário.

Sincronizações de Estado do App
Com o iCloud, todos os dispositivos compartilham o mesmo sistema de arquivos. O trabalho do agente aparece em todos os dispositivos — sem um servidor.

O desafio
Agentes são de longa data. Aplicativos móveis não são.

Um agente pode precisar de 30 segundos, cinco minutos ou uma hora para concluir uma tarefa. Mas o iOS vai deixar seu app em segundo plano após segundos de inatividade, e pode desligá-lo completamente para recuperar a memória. O usuário pode trocar de aplicativo, atender uma ligação ou bloquear o celular no meio da tarefa.

Isso significa que os aplicativos de agentes móveis precisam de uma abordagem bem pensada para:

Checkpointing

Salvando o estado para que o trabalho não seja perdido

Retomando

Retomando de onde parou após a interrupção

Execução em segundo plano

Usar o tempo limitado que o iOS oferece com sabedoria

On-device vs. cloud

Decidir o que roda localmente versus o que precisa de um servidor

Arquitetura de armazenamento do iOS
Precisa de validação

Essa é uma abordagem que estamos explorando e que achamos empolgante, mas é uma forma de fazer. Claude construiu isso; Soluções melhores podem existir.

O que isso te dá:

• Sincronização automática entre dispositivos sem construir infraestrutura
• Backup sem ação do usuário
• Degradação gradual quando o iCloud não está disponível
• Os usuários podem acessar seus dados fora do aplicativo, se necessário
Uma abordagem — iCloud first com recurso local:

1. iCloud Container (preferred)
   iCloud.com.{bundleId}/Documents/
   ├── Library/
   ├── Research/books/
   ├── Chats/
   └── Profile/

2. Local Documents (fallback)
   ~/Documents/

3. Migration layer
   Auto-migrate local → iCloud
// iCloud-first with local fallback
if let url = fileManager
  .url(forUbiquityContainerIdentifier: nil) {
  return url.appendingPathComponent("Documents")
}
return fileManager.urls(
  for: .documentDirectory,
  in: .userDomainMask)[0]
Checkpoint e currículo
Precisa de validação

A contribuição de Claude na construção; Dan ainda está formando sua opinião. Essa abordagem parece funcionar, mas soluções melhores podem existir.

Os aplicativos móveis são interrompidos. Os agentes precisam sobreviver a isso.

O que fazer no checkpoint:

Tipo de agente, mensagens, contagem de iterações, lista de tarefas, estado personalizado, carimbo de data

Quando fazer checkpoint:

No aplicativo em segundo plano, após cada resultado de ferramenta, periodicamente durante operações longas

Fluxo do currículo:

Carregar sessões interrompidas → Filtrar por validade (padrão de uma hora) → Mostrar o prompt de retomar → Restaurar mensagens e continuar

Passos do currículo:

1. loadInterruptedSessions() escaneia o diretório checkpoint

2. filtre por isValid(maxAge:)

3. Mostrar Prompt de Retomar

4. Restaurar mensagens e continuar o ciclo do agente

5. Ao dispensar, excluir o checkpoint

struct AgentCheckpoint: Codable {
  let agentType: String
  let messages: [[String: Any]]
  let iterationCount: Int
  let taskListJSON: String?
  let customState: [String: String]
  let timestamp: Date
}

func isValid(maxAge: TimeInterval = 3600)
  -> Bool {
  Date().timeIntervalSince(timestamp)
    < maxAge
}
Decisão de arquitetura: armazenar a configuração completa do agente ou armazenar apenas e recriar a partir de um registro. A segunda opção é mais simples, mas significa que configurações podem quebrar checkpoints antigos.agentType

A lacuna: Se o sistema desligar o app, a recuperação depende da frequência dos checkpoints. Checkpoint após cada resultado de ferramenta para máxima robustez.

Estados do arquivo na nuvem
Os arquivos podem existir no iCloud, mas não serem baixados localmente. Certifique-se de disponibilidade antes de ler.

await StorageService.shared
    .ensureDownloaded(folder: .research,
                      filename: "full_text.txt")
Abstração de armazenamento
Use uma camada de abstração de armazenamento. Não use o Gerenciador de Arquivos bruto. Abstrair sobre iCloud em vez de local para que o resto do seu código não se importe.

let url = StorageService.shared
    .url(for: .researchBook(bookId: id))
Execução em segundo plano
Precisa de validação

A contribuição de Claude na construção; Dan ainda está formando sua opinião.

O iOS oferece tempo limitado em segundo plano:

func prepareForBackground() {
    backgroundTaskId = UIApplication.shared
        .beginBackgroundTask(withName: "AgentProcessing") {
            handleBackgroundTimeExpired()
        }
}

func handleBackgroundTimeExpired() {
    for session in sessions where session.status == .running {
        session.status = .backgrounded
        Task { await saveSession(session) }
    }
}

func handleForeground() {
    for session in sessions where session.status == .backgrounded {
        Task { await resumeSession(session) }
    }
}
Você tem cerca de 30 segundos. Use-o para:

• Completar a chamada atual da ferramenta se possível
• Checkpoint no estado da sessão
• Transição graciosa para o estado de fundo
Para agentes realmente de longa data: Considere um orquestrador do lado do servidor que pode rodar por horas, com o aplicativo móvel como visualizador e mecanismo de entrada.

On-device vs. cloud
Componente	On-device	Cloud
Orquestração	✓	
Execução de ferramentas (arquivos, fotos, HealthKit)	✓	
Chamadas LLM		✓ (API Anthropic)
Pontos de controle	✓ (arquivos locais)	Opcional via iCloud
Agentes de longa duração	Limitado pelo iOS	Possível com servidor
O app precisa de rede para raciocínio, mas pode acessar dados offline. Projete ferramentas para se degradarem de forma elegante quando a rede não estiver disponível.

Padrões avançados
Descoberta dinâmica de capacidades
Precisa de validação

A contribuição de Claude na construção; Dan ainda está formando sua opinião. Essa é uma abordagem que nos anima, mas outras podem ser melhores dependendo do seu caso de uso.

Uma alternativa a construir uma ferramenta para cada endpoint em uma API externa: Crie ferramentas que permitam ao agente descobrir o que está disponível em tempo de execução.

O problema com o mapeamento estático:

// You built 50 tools for 50 data types
read_steps()
read_heart_rate()
read_sleep()
// When a new metric is added... code change required
// Agent can only access what you anticipated
Descoberta dinâmica de capacidades:

// Two tools handle everything
list_available_types() → returns ["steps", "heart_rate", "sleep", ...]
read_data(type) → reads any discovered type

// When a new metric is added... agent discovers it automatically
// Agent can access things you didn't anticipate
Essa é a granularidade levada à sua conclusão lógica. Suas ferramentas ficam tão atômicas que funcionam com tipos que você nem sabia que existiam quando as construiu.

Quando usar isso:
•
APIs externas onde você quer que o agente tenha acesso total em nível de usuário (endpoints HealthKit, HomeKit, GraphQL)
•
Sistemas que adicionam novas capacidades ao longo do tempo
•
Quando você quer que o agente possa fazer qualquer coisa que a API suporte
Quando o mapeamento estático está bom:
•
Agentes intencionalmente limitados com escopo limitado
•
Quando você precisa de controle rigoroso sobre exatamente o que o agente pode acessar
•
APIs simples com endpoints estáveis e conhecidos
O padrão: uma ferramenta para descobrir o que está disponível, uma ferramenta para interagir com qualquer capacidade descoberta. Deixe a API validar as entradas em vez de duplicar a validação nas suas definições de enum.

Completude CRUD
Para cada entidade no seu sistema, verifique se o agente possui capacidade completa de criar, ler, atualizar, excluir (CRUD):

Criar
O agente pode criar novas instâncias?

Leia
O agente consegue ver o que existe?

Atualização
O agente pode modificar instâncias?

Excluir
O agente pode remover instâncias?

A auditoria: Liste todas as entidades do seu sistema e verifique se todas as quatro operações estão disponíveis para o agente.

Falha comum: Você constrói e mas esquece e . O usuário pede ao agente para "corrigir esse erro de digitação nas minhas anotações de reunião" e o agente não pode ajudar. create_noteread_notesupdate_notedelete_note

Anti-padrões
Abordagens comuns que não são totalmente agent-nativas
Essas não são necessariamente erradas — podem ser apropriadas para o seu caso. Mas eles valem a pena reconhecê-los como diferentes da arquitetura que este documento descreve.

Agente como roteador
O agente descobre o que o usuário quer e então chama a função correta. A inteligência do agente é usada para rotar, não para agir. Isso pode funcionar, mas você está usando uma fração do que os agentes podem fazer.

Construa o app e depois adicione o agente
Você constrói recursos da forma tradicional (como código) e depois os expõe a um agente. O corretor só pode fazer o que suas funcionalidades já fazem. Você não terá capacidade de emergência.

Pensamento de pedido/resposta
O agente recebe entrada, faz uma coisa, retorna a saída. Isso perde o ciclo: o agente consegue um resultado a alcançar, opera até que seja feito, lida com situações inesperadas ao longo do caminho.

Design de ferramentas defensivas
Você limita demais os inputs das ferramentas porque está acostumado com programação defensiva. Enums rigorosos, validação em todas as camadas. Isso é seguro, mas impede que o agente faça coisas que você não esperava.

Caminho feliz no código, o agente simplesmente executa
O software tradicional lida com casos limites-limite no código — você escreve a lógica do que acontece quando X dá errado. Agent-native permite que o agente trate de casos limite com julgamento. Se seu código lida com todos os casos limites, o agente é apenas um chamador.

Anti-padrões específicos
O agente executa seu fluxo de trabalho em vez de buscar resultados
Você escreveu a lógica, o agente só chama isso. Decisões vivem em código, não no julgamento do agente.

# Wrong - you wrote the workflow
def process_request(input):
    category = categorize(input)      # your code decides
    priority = score_priority(input)   # your code decides
    store(input, category, priority)
    if priority > 3: notify()          # your code decides

# Right - agent pursues outcome in a loop
tools: store_item, send_notification
prompt: "Evaluate urgency 1-5, store with your assessment, notify if >= 4"
Ferramentas com formato de fluxo de trabalho
analyze_and_organize Agrupa o julgamento na ferramenta. Divida em primitivos e deixe o agente compô-los.

Ações da interface órfã
O usuário pode fazer algo pela interface que o agente não consegue alcançar. Correção: Mantenha a paridade.

Privação de contexto
O agente não sabe o que existe. O usuário diz "organize minhas anotações" e o agente não sabe que existem anotações.

Correção: Injetar os recursos e capacidades disponíveis no prompt do sistema.

Portões sem motivo
A ferramenta de domínio é a única forma de fazer algo, e você não pretendia restringir o acesso.

Correção: Padrão para abrir. Mantenha primitivos disponíveis a menos que haja um motivo específico para gatear.

Limites de capacidade artificial
Restringindo o que o agente pode fazer por preocupações vagas de segurança, e não por riscos específicos.

O agente geralmente deve ser capaz de fazer o que os usuários podem fazer. Use fluxos de aprovação para ações destrutivas em vez de remover capacidades completamente.

Mapeamento estático quando dinâmico seria melhor
Construir 50 ferramentas para 50 endpoints de API quando um padrão discover + access daria mais flexibilidade e garantiria o sistema para o futuro.

Detecção de completamento heurístico
Detectar a completude do agente por meio de heurísticas (iterações consecutivas sem chamadas de ferramenta, verificação dos arquivos de saída esperados) é frágil.

Correção: Exigir que os agentes sinalizem explicitamente a conclusão por meio de uma ferramenta de completão.

Critérios de sucesso
Arquitetura
O agente pode alcançar tudo o que os usuários podem alcançar por meio da interface (paridade)
Ferramentas são primitivas atômicas; Ferramentas de domínio são atalhos, não portas (granularidade)
Novos recursos podem ser adicionados escrevendo novos prompts (composabilidade)
O agente pode realizar tarefas para as quais você não foi explicitamente projetado (capacidade emergente)
Mudar o comportamento significa editar prompts, não refatorar código
Implementação
O prompt do sistema inclui recursos e capacidades disponíveis
Agente e usuário trabalham no mesmo espaço de dados
As ações do agente se refletem imediatamente na interface
Toda entidade possui capacidade total de CRUD
APIs externas usam descoberta dinâmica de capacidades quando apropriado
Agentes sinalizam explicitamente a conclusão (sem detecção heurística)
Produto
Requisições simples funcionam imediatamente, sem curva de aprendizado
Usuários avançados podem levar o sistema em direções inesperadas
Você está aprendendo o que os usuários querem ao observar o que eles pedem ao agente para fazer
Os requisitos de aprovação correspondem aos riscos e à reversibilidade
Móvel
Checkpoint/resume lida com interrupção do aplicativo
Armazenamento iCloud first com reserva local
A execução em segundo plano utiliza o tempo disponível de forma inteligente
O teste final
Descreva um resultado para o agente que está dentro do domínio da sua aplicação, mas para o qual você não construiu uma funcionalidade específica.

Será que ele consegue descobrir como realizar isso, operando em um ciclo até ter sucesso?

Se sim—você construiu algo nativo de agentes.
Se não—sua arquitetura é muito limitada.
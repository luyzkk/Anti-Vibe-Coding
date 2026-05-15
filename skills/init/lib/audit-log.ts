import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Uma entrada no audit log — registra o que um subagente recebeu e produziu.
 * DT-07: sem PII. `input_paths` são paths (não conteúdo). `output_struct` é struct semântica
 * retornada pelo subagente (não o arquivo lido). Responsabilidade do caller não incluir conteúdo cru.
 */
export type AgentLogEntry = {
  /** ISO 8601 — momento do append. */
  timestamp: string
  /** Identificador do subagente (ex: "explorer-01", "reconciler", "compound-writer"). */
  subagent_id: string
  /** Paths dos arquivos passados como input para este subagente (relativos ao targetDir). */
  input_paths: string[]
  /**
   * Output estruturado retornado pelo subagente.
   * Deve ser apenas metadata/struct semântica — nunca conteúdo de arquivo (DT-07).
   */
  output_struct: unknown
  /** Duração da chamada ao subagente em ms. */
  duration_ms: number
  /** Número de retries realizados (0 = sem retry). DT-03: max 1 retry. */
  retry_count: number
  /** Mensagem de erro se o subagente falhou (após todos os retries). */
  error?: string
}

export type AgentsLog = {
  /** UUID — mesmo run_id do InventoryResult (correlação inventory ↔ agents-log). */
  run_id: string
  /** ISO 8601 — quando o AuditLogWriter foi instanciado. */
  started_at: string
  entries: AgentLogEntry[]
}

export type AppendInput = Omit<AgentLogEntry, 'timestamp'>

/**
 * Writer sequencial de agents-log.json.
 *
 * Criado pelo orchestrator com o run_id do discovery para correlação.
 * append() é serializado internamente via promise chain para evitar
 * escritas interleaved em chamadas "paralelas" do caller (Plano 03).
 *
 * @example
 * const writer = new AuditLogWriter(targetDir, inventoryResult.run_id)
 * await writer.append({ subagent_id: 'explorer-01', ... })
 */
export class AuditLogWriter {
  private readonly logPath: string
  private log: AgentsLog
  private writeChain: Promise<void> = Promise.resolve()

  constructor(targetDir: string, run_id: string) {
    this.logPath = path.join(targetDir, 'discovery', 'agents-log.json')
    this.log = {
      run_id,
      started_at: new Date().toISOString(),
      entries: [],
    }
  }

  /**
   * Adiciona uma entrada ao log e persiste em disco.
   * Chamadas concorrentes são serializadas — a última chamada completa garante
   * que todas as entradas anteriores estão no arquivo.
   */
  async append(input: AppendInput): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      const entry: AgentLogEntry = {
        timestamp: new Date().toISOString(),
        ...input,
      }
      this.log.entries.push(entry)
      await fs.writeFile(this.logPath, JSON.stringify(this.log, null, 2), 'utf-8')
    })
    await this.writeChain
  }
}

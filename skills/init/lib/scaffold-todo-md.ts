// 2026-05-12 (Luiz/dev): CA-31 prereq — scaffold idempotente de TODO.md.
// G2: se arquivo existe, skip silencioso. Nao sobrescreve historico do usuario.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const SKELETON_PATH = path.join(
  import.meta.dir,
  '..',
  '..',
  'todo-pick',
  'templates',
  'todo-md-skeleton.md',
)

/**
 * Cria TODO.md na raiz do projeto a partir do skeleton de todo-pick.
 * Idempotente: se o arquivo ja existe, retorna 'skipped' sem modificar.
 *
 * @param projectRoot - Diretorio raiz do projeto-alvo
 * @returns 'created' se o arquivo foi criado, 'skipped' se ja existia
 */
export function scaffoldTodoMd(projectRoot: string): 'created' | 'skipped' {
  const todoMdPath = path.join(projectRoot, 'TODO.md')

  if (existsSync(todoMdPath)) {
    return 'skipped'
  }

  const skeleton = readFileSync(SKELETON_PATH, 'utf-8')
  writeFileSync(todoMdPath, skeleton, { encoding: 'utf-8' })
  return 'created'
}

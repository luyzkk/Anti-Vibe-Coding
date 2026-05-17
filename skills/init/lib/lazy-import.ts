// skills/init/lib/lazy-import.ts

/**
 * Carrega um modulo via import dinamico, preservando tipos do callback.
 * Existe para centralizar o workaround GT-04 / DI-06:
 *   `bun -e "import('/abs/path/file.ts')"` quebra no Windows quando o path absoluto
 *   tem drive-letter e backslashes. Fora de blocos `bun -e`, `await import('./relative.ts')`
 *   funciona em todas as plataformas — desde que feito com path RELATIVO e em arquivo .ts.
 *
 * Regra: o boundary do dispatcher usa `lazyImport(() => import('./modulo'))`.
 * Steps individuais importam estaticamente — nao precisam deste helper.
 *
 * @example
 * const { registry } = await lazyImport(() => import('./registry'))
 */
export function lazyImport<T>(loader: () => Promise<T>): Promise<T> {
  return loader()
}

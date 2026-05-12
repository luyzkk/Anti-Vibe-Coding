// 2026-05-11 (Luiz/dev): wrapper fs.cp recursivo + fallback defensivo.
// fs.cp existe em Node 16.7+. Bun cobre tambem. Wrapper isola caso teste.
// Paraleliza entries com Promise.all para atender G11 (M8 <=120s).

import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function copyRecursive(src: string, dst: string): Promise<void> {
  const stat = await fs.stat(src)
  if (stat.isDirectory()) {
    await fs.mkdir(dst, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })
    await Promise.all(entries.map(async (entry) => {
      const childSrc = path.join(src, entry.name)
      const childDst = path.join(dst, entry.name)
      await copyRecursive(childSrc, childDst)
    }))
  } else {
    await fs.mkdir(path.dirname(dst), { recursive: true })
    await fs.copyFile(src, dst)
  }
}

// 2026-05-24 (Luiz/dev): tipos do installer — PRD MH-05/CA-04/05/06

export type InstallOpts = {
  force: boolean
  // 2026-05-24 (Luiz/dev): dryRun reservado para CH-02 (Could Have v1.x) — ignorar nesta fase
  dryRun?: boolean
}

export type InstallResult = {
  created: string[]      // paths copiados (target relative)
  skipped: string[]      // paths skipped por skip-by-default (D17-A)
  overwritten: string[]  // paths sobrescritos por --force
  notes: string[]        // mensagens UX (ex: "No package.json detected — ...")
}

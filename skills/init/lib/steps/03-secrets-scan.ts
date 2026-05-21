// skills/init/lib/steps/03-secrets-scan.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-04 — STUB. Logica real em Plano 02 (DV-1).
// DV-1: secrets-scan mantido como step proprio (era candidato a inline no Step 2 detect).
// Razao: scan tem custo de I/O proprio e SRP — gate/detect/scan sao concerns distintos.
import type { Step } from './types'

export const secretsScanStep: Step = {
  id: 'secrets-scan',
  async run(_ctx) {
    return { mutated: false, summary: 'step 3 stub (Plano 02 implementa secrets-scan real)' }
  },
}

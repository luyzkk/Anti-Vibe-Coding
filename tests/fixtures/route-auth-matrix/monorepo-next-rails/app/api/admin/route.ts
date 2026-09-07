// 2026-09-06 (Luiz/dev): fixture CA-11 — rota Next sem middleware, no MESMO app/ dos controllers Rails (G9). Sem import de next/*.
export function GET() {
  return Response.json({ admin: true })
}

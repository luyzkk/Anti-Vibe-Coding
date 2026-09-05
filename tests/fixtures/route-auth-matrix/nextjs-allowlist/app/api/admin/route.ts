// 2026-09-05 (Luiz/dev): fixture CA-04b — a entrada dela na allowlist nao tem reason; volta ao motor.
export function GET() {
  return Response.json({ admin: true })
}

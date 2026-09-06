// Middlewares de fixture: checam so a presenca do header. Nenhum token literal.
export function requireAuth(req, res, next) {
  if (!req.headers.authorization) return res.status(401).end()
  next()
}
export function requireAdmin(req, res, next) {
  if (req.headers['x-role'] !== 'admin') return res.status(403).end()
  next()
}

// 2026-09-06 (Luiz/dev): fixture CA-08/CA-05 Express — a ORDEM do use decide; path nao literal vira unresolved.
import express from 'express'
import adminRouter from './routes/admin.mjs'
import { requireAuth } from './auth.mjs'

const app = express()

app.get('/health', (req, res) => res.json({ ok: true }))

app.use(requireAuth)

app.get('/api/preferences', (req, res) => res.json({}))
app.post('/api/preferences', (req, res) => res.status(204).end())

const base = '/api/v2'
app.get(`${base}/reports`, (req, res) => res.json([]))

app.use('/admin', adminRouter)

export default app

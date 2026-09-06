import { Router } from 'express'
import { requireAdmin } from '../auth.mjs'

const router = Router()

router.get('/users', (req, res) => res.json([]))
router.delete('/users/:id', requireAdmin, (req, res) => res.status(204).end())

export default router

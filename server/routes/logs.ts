import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { level, limit = '100', offset = '0' } = req.query

  let query = 'SELECT * FROM logs WHERE 1=1'
  const params: unknown[] = []

  if (level && level !== 'all') {
    query += ' AND level = ?'
    params.push(level)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), Number(offset))

  const rows = db.prepare(query).all(...params)
  const total = (db.prepare(
    level && level !== 'all' ? 'SELECT COUNT(*) as n FROM logs WHERE level = ?' : 'SELECT COUNT(*) as n FROM logs'
  ).get(...(level && level !== 'all' ? [level] : [])) as { n: number }).n

  res.json({ logs: rows, total })
})

router.delete('/clear', (_req, res) => {
  const db = getDb()
  const deleted = (db.prepare('SELECT COUNT(*) as n FROM logs').get() as { n: number }).n
  db.prepare('DELETE FROM logs').run()
  db.prepare('INSERT INTO logs (id, level, message) VALUES (?, ?, ?)').run(
    uuidv4(), 'info', `ログをクリアしました (${deleted}件削除)`
  )
  res.json({ success: true, deleted })
})

export default router

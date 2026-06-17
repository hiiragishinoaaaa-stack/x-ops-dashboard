import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (_req, res) => {
  const db = getDb()
  const accounts = db
    .prepare('SELECT id, username, display_name, status, created_at FROM accounts ORDER BY created_at DESC')
    .all()
  res.json(accounts)
})

router.get('/:id', (req, res) => {
  const db = getDb()
  const account = db
    .prepare('SELECT id, username, display_name, status, created_at FROM accounts WHERE id = ?')
    .get(req.params.id)
  if (!account) return res.status(404).json({ error: 'Not found' })
  res.json(account)
})

router.post('/', (req, res) => {
  const { username, display_name, api_key, api_secret, access_token, access_secret } = req.body

  if (!username?.trim() || !display_name?.trim()) {
    return res.status(400).json({ error: 'username と display_name は必須です' })
  }

  const db = getDb()
  const id = uuidv4()

  try {
    db.prepare(`
      INSERT INTO accounts (id, username, display_name, api_key, api_secret, access_token, access_secret)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, username.trim(), display_name.trim(), api_key || null, api_secret || null, access_token || null, access_secret || null)

    db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'info', `アカウント登録: @${username}`, JSON.stringify({ account_id: id })
    )

    const account = db.prepare('SELECT id, username, display_name, status, created_at FROM accounts WHERE id = ?').get(id)
    res.status(201).json(account)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE')) {
      return res.status(409).json({ error: 'このユーザー名は既に登録されています' })
    }
    throw err
  }
})

router.put('/:id', (req, res) => {
  const { display_name, api_key, api_secret, access_token, access_secret, status } = req.body
  const db = getDb()

  const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  db.prepare(`
    UPDATE accounts
    SET display_name    = COALESCE(?, display_name),
        api_key         = COALESCE(?, api_key),
        api_secret      = COALESCE(?, api_secret),
        access_token    = COALESCE(?, access_token),
        access_secret   = COALESCE(?, access_secret),
        status          = COALESCE(?, status),
        updated_at      = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(display_name ?? null, api_key ?? null, api_secret ?? null, access_token ?? null, access_secret ?? null, status ?? null, req.params.id)

  const account = db.prepare('SELECT id, username, display_name, status, created_at FROM accounts WHERE id = ?').get(req.params.id)
  res.json(account)
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })

  db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
    uuidv4(), 'info', `アカウント削除`, JSON.stringify({ account_id: req.params.id })
  )
  res.json({ success: true })
})

export default router

import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'
import { createXService } from '../services/xService.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { account_id, status } = req.query

  let query = `
    SELECT p.id, p.account_id, p.content, p.status,
           p.scheduled_at, p.posted_at, p.tweet_id, p.error_message, p.created_at,
           a.username, a.display_name
    FROM posts p
    JOIN accounts a ON p.account_id = a.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (account_id) { query += ' AND p.account_id = ?'; params.push(account_id) }
  if (status) { query += ' AND p.status = ?'; params.push(status) }

  query += ' ORDER BY p.created_at DESC LIMIT 200'

  res.json(db.prepare(query).all(...params))
})

router.post('/', (req, res) => {
  const { account_id, content, scheduled_at } = req.body

  if (!account_id || !content?.trim()) {
    return res.status(400).json({ error: 'account_id と content は必須です' })
  }
  if (content.length > 280) {
    return res.status(400).json({ error: '本文は280文字以内にしてください' })
  }

  const db = getDb()

  const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(account_id)
  if (!account) return res.status(404).json({ error: 'アカウントが見つかりません' })

  const id = uuidv4()
  const status = scheduled_at ? 'scheduled' : 'draft'

  db.prepare(`
    INSERT INTO posts (id, account_id, content, status, scheduled_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, account_id, content.trim(), status, scheduled_at || null)

  db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
    uuidv4(), 'info',
    `投稿${status === 'scheduled' ? '予約' : '下書き'}作成: "${content.slice(0, 40)}"`,
    JSON.stringify({ post_id: id, account_id })
  )

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id)
  res.status(201).json(post)
})

router.post('/:id/send', async (req, res) => {
  const db = getDb()
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined

  if (!post) return res.status(404).json({ error: '投稿が見つかりません' })
  if (post.status === 'posted') return res.status(400).json({ error: '既に投稿済みです' })

  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(post.account_id as string) as Record<string, unknown> | undefined
  if (!account) return res.status(404).json({ error: 'アカウントが見つかりません' })

  const xService = createXService(account as Parameters<typeof createXService>[0])
  const result = await xService.postTweet(post.content as string)

  if (result.success) {
    db.prepare(`UPDATE posts SET status='posted', posted_at=CURRENT_TIMESTAMP, tweet_id=? WHERE id=?`)
      .run(result.tweetId, post.id)
    db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'info', `投稿成功 [${result.tweetId}]`, JSON.stringify({ post_id: post.id })
    )
    res.json({ success: true, tweetId: result.tweetId })
  } else {
    db.prepare(`UPDATE posts SET status='failed', error_message=? WHERE id=?`)
      .run(result.error, post.id)
    db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'error', `投稿失敗: ${result.error}`, JSON.stringify({ post_id: post.id })
    )
    res.status(500).json({ success: false, error: result.error })
  }
})

router.delete('/:id', (req, res) => {
  const db = getDb()
  const result = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ success: true })
})

// AI投稿文生成
router.post('/generate', async (_req, res) => {
  const { topic, tone, length } = _req.body

  if (!topic?.trim()) {
    return res.status(400).json({ error: 'topic は必須です' })
  }

  // MOCK: Replace with real AI API (OpenAI, Claude, etc.)
  await new Promise(r => setTimeout(r, 800))

  const toneLabels: Record<string, string> = {
    professional: 'プロフェッショナルな',
    casual: 'カジュアルな',
    humorous: 'ユーモアのある',
    informative: '情報豊富な',
  }

  const toneLabel = toneLabels[tone] || 'ナチュラルな'
  const templates = [
    `【${topic}】${toneLabel}視点でお届けします。\n\n日々の中でこのテーマと向き合ってみると、意外な発見がありますよ。皆さんはどう感じますか？\n\n#${topic.replace(/\s+/g, '')} #日本`,
    `${topic}について考えてみました。\n\n${toneLabel}アプローチから見ると、これは私たちの日常に大きな影響を与えています。続きはリプライで！\n\n#${topic}`,
    `✅ ${topic} のポイント整理\n\n① 基礎を押さえる\n② 実践で活かす\n③ 継続が鍵\n\n${toneLabel}内容でシェアします。RT歓迎です！\n\n#${topic}`,
  ]

  let content = templates[Math.floor(Math.random() * templates.length)]

  if (length === 'short') content = content.split('\n')[0]
  if (length === 'long') content += '\n\n詳細はプロフィールのリンクから。フォローよろしくお願いします！'

  res.json({ content, topic, tone, length })
})

export default router

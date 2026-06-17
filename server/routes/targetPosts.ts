import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'
import { createXService } from '../services/xService.js'

const router = Router()

function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/@?\w+\/status\/(\d+)/)
  return m ? m[1] : null
}

function extractAuthor(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/@?(\w+)\/status\//)
  return m ? m[1] : null
}

// 対象ポスト一覧（エンゲージメント集計付き）
router.get('/', (_req, res) => {
  const db = getDb()
  const posts = db.prepare(`
    SELECT
      tp.*,
      (SELECT COUNT(*) FROM post_actions pa
        WHERE pa.target_post_id = tp.id AND pa.action_type = 'like'   AND pa.status = 'done') AS like_done,
      (SELECT COUNT(*) FROM post_actions pa
        WHERE pa.target_post_id = tp.id AND pa.action_type = 'repost' AND pa.status = 'done') AS repost_done,
      (SELECT COUNT(*) FROM post_actions pa
        WHERE pa.target_post_id = tp.id AND pa.action_type = 'reply'  AND pa.status = 'done') AS reply_done,
      (SELECT COUNT(*) FROM post_actions pa
        WHERE pa.target_post_id = tp.id AND pa.status = 'failed') AS failed_count
    FROM target_posts tp
    ORDER BY tp.created_at DESC
  `).all()
  res.json(posts)
})

// 対象ポスト登録
router.post('/', (req, res) => {
  const { url, description } = req.body

  if (!url?.trim()) return res.status(400).json({ error: 'URL は必須です' })

  const tweetId = extractTweetId(url.trim())
  if (!tweetId) {
    return res.status(400).json({
      error: '有効な X / Twitter の投稿URLを入力してください\n例: https://x.com/user/status/1234567890'
    })
  }

  const author = extractAuthor(url.trim())
  const db = getDb()
  const id = uuidv4()

  try {
    db.prepare(`
      INSERT INTO target_posts (id, url, tweet_id, author, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, url.trim(), tweetId, author, description?.trim() || null)

    db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
      uuidv4(), 'info',
      `対象ポスト登録: ${url.trim()}`,
      JSON.stringify({ target_post_id: id, tweet_id: tweetId, author })
    )

    res.status(201).json(db.prepare('SELECT * FROM target_posts WHERE id = ?').get(id))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('UNIQUE')) return res.status(409).json({ error: 'このURLは既に登録されています' })
    throw err
  }
})

// 対象ポスト削除
router.delete('/:id', (req, res) => {
  const db = getDb()
  const r = db.prepare('DELETE FROM target_posts WHERE id = ?').run(req.params.id)
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ success: true })
})

// アクション履歴（対象ポスト単位）
router.get('/:id/actions', (req, res) => {
  const db = getDb()
  const actions = db.prepare(`
    SELECT pa.*, a.username, a.display_name
    FROM post_actions pa
    JOIN accounts a ON pa.account_id = a.id
    WHERE pa.target_post_id = ?
    ORDER BY pa.created_at DESC
  `).all(req.params.id)
  res.json(actions)
})

// アカウント別ステータス一覧（対象ポスト × 全アカウント）
router.get('/:id/status', (req, res) => {
  const db = getDb()

  const target = db.prepare('SELECT * FROM target_posts WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'Not found' })

  const accounts = db.prepare(
    "SELECT id, username, display_name FROM accounts WHERE status = 'active'"
  ).all() as { id: string; username: string; display_name: string }[]

  const result = accounts.map(acc => {
    const actions = db.prepare(`
      SELECT action_type, status, executed_at, error_message
      FROM post_actions
      WHERE target_post_id = ? AND account_id = ?
    `).all(req.params.id, acc.id) as { action_type: string; status: string; executed_at: string | null; error_message: string | null }[]

    const byType: Record<string, { status: string; executed_at: string | null; error_message: string | null }> = {}
    actions.forEach(a => { byType[a.action_type] = { status: a.status, executed_at: a.executed_at, error_message: a.error_message } })

    return { ...acc, actions: byType }
  })

  res.json({ target, accounts: result })
})

// バルクエンゲージメント実行
router.post('/:id/execute', async (req, res) => {
  const { action_type, account_ids, reply_content } = req.body

  if (!action_type)          return res.status(400).json({ error: 'action_type は必須です' })
  if (!Array.isArray(account_ids) || account_ids.length === 0) {
    return res.status(400).json({ error: '実行するアカウントを1つ以上選択してください' })
  }
  if (action_type === 'reply' && !reply_content?.trim()) {
    return res.status(400).json({ error: '返信内容を入力してください' })
  }

  const db = getDb()
  const target = db.prepare('SELECT * FROM target_posts WHERE id = ?').get(req.params.id) as
    { id: string; url: string; tweet_id: string; author: string | null } | undefined

  if (!target) return res.status(404).json({ error: '対象ポストが見つかりません' })

  const results: {
    account_id: string; username: string; display_name: string
    success: boolean; skipped?: boolean; error?: string
  }[] = []

  for (const account_id of account_ids as string[]) {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account_id) as
      Record<string, unknown> | undefined
    if (!account) continue

    const existing = db.prepare(
      'SELECT id FROM post_actions WHERE target_post_id = ? AND account_id = ? AND action_type = ?'
    ).get(target.id, account_id, action_type)

    if (existing) {
      results.push({
        account_id,
        username: account.username as string,
        display_name: account.display_name as string,
        success: false,
        skipped: true,
        error: '既に実行済みです',
      })
      continue
    }

    const xService = createXService(account as Parameters<typeof createXService>[0])
    let result: { success: boolean; error?: string }

    try {
      if (action_type === 'like')   result = await xService.likeTweet(target.tweet_id)
      else if (action_type === 'repost') result = await xService.retweet(target.tweet_id)
      else if (action_type === 'reply')  result = await xService.replyToTweet(target.tweet_id, reply_content)
      else result = { success: false, error: '不明なアクション' }
    } catch (err: unknown) {
      result = { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }

    const actionId = uuidv4()
    db.prepare(`
      INSERT INTO post_actions
        (id, target_post_id, account_id, action_type, status, reply_content, executed_at, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actionId, target.id, account_id, action_type,
      result.success ? 'done' : 'failed',
      reply_content?.trim() || null,
      result.success ? new Date().toISOString() : null,
      result.success ? null : (result.error || null)
    )

    db.prepare('INSERT INTO logs (id, level, message, context) VALUES (?, ?, ?, ?)').run(
      uuidv4(),
      result.success ? 'info' : 'error',
      `${action_type} ${result.success ? '成功' : '失敗'} @${account.username} → tweet:${target.tweet_id}`,
      JSON.stringify({ action_id: actionId, account_id, target_post_id: target.id })
    )

    results.push({
      account_id,
      username: account.username as string,
      display_name: account.display_name as string,
      ...result,
    })
  }

  const successCount = results.filter(r => r.success).length
  const failCount    = results.filter(r => !r.success && !r.skipped).length
  const skipCount    = results.filter(r => r.skipped).length

  res.json({ results, summary: { total: results.length, success: successCount, failed: failCount, skipped: skipCount } })
})

export default router

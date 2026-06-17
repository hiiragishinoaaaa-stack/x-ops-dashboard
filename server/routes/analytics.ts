import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// サマリー
router.get('/summary', (_req, res) => {
  const db = getDb()

  const totalAccounts  = row(db, 'SELECT COUNT(*) as n FROM accounts')
  const totalPosts     = row(db, 'SELECT COUNT(*) as n FROM posts')
  const postedPosts    = row(db, "SELECT COUNT(*) as n FROM posts WHERE status='posted'")
  const scheduledPosts = row(db, "SELECT COUNT(*) as n FROM posts WHERE status='scheduled'")
  const draftPosts     = row(db, "SELECT COUNT(*) as n FROM posts WHERE status='draft'")
  const failedPosts    = row(db, "SELECT COUNT(*) as n FROM posts WHERE status='failed'")

  const totalTargets   = row(db, 'SELECT COUNT(*) as n FROM target_posts')
  const totalLikes     = row(db, "SELECT COUNT(*) as n FROM post_actions WHERE action_type='like' AND status='done'")
  const totalReposts   = row(db, "SELECT COUNT(*) as n FROM post_actions WHERE action_type='repost' AND status='done'")
  const totalReplies   = row(db, "SELECT COUNT(*) as n FROM post_actions WHERE action_type='reply' AND status='done'")
  const failedActions  = row(db, "SELECT COUNT(*) as n FROM post_actions WHERE status='failed'")

  res.json({
    accounts: totalAccounts,
    posts: {
      total: totalPosts, posted: postedPosts, scheduled: scheduledPosts,
      draft: draftPosts, failed: failedPosts,
    },
    engagement: {
      targetPosts: totalTargets,
      likes: totalLikes, reposts: totalReposts, replies: totalReplies,
      failed: failedActions,
    },
    // mock impressions (replace with real X API)
    mockMetrics: {
      totalImpressions: postedPosts * 1500 + Math.floor(Math.random() * 3000),
      totalLikes:       postedPosts * 45   + totalLikes,
      totalRetweets:    postedPosts * 12   + totalReposts,
    },
  })
})

// 過去30日の投稿数（日別）
router.get('/posts-by-day', (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT DATE(created_at) AS date, COUNT(*) AS count, status
    FROM posts
    WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at), status
    ORDER BY date ASC
  `).all()
  res.json(rows)
})

// アクション実行履歴（日別）
router.get('/actions-by-day', (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT DATE(created_at) AS date, action_type, COUNT(*) AS count, status
    FROM post_actions
    WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at), action_type, status
    ORDER BY date ASC
  `).all()
  res.json(rows)
})

// アカウント別詳細
router.get('/account/:id', (req, res) => {
  const db = getDb()
  const { id } = req.params

  const account = db.prepare('SELECT id, username, display_name FROM accounts WHERE id = ?').get(id)
  if (!account) return res.status(404).json({ error: 'Not found' })

  const postStats = db.prepare(
    'SELECT status, COUNT(*) as count FROM posts WHERE account_id = ? GROUP BY status'
  ).all(id)

  const actionStats = db.prepare(
    "SELECT action_type, COUNT(*) as count FROM post_actions WHERE account_id = ? AND status='done' GROUP BY action_type"
  ).all(id)

  const recentPosts = db.prepare(
    'SELECT id, content, status, posted_at, created_at FROM posts WHERE account_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(id)

  const recentActions = db.prepare(`
    SELECT pa.action_type, pa.status, pa.executed_at, tp.url, tp.tweet_id
    FROM post_actions pa
    JOIN target_posts tp ON pa.target_post_id = tp.id
    WHERE pa.account_id = ?
    ORDER BY pa.created_at DESC LIMIT 10
  `).all(id)

  const metrics = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      date: d.toISOString().split('T')[0],
      impressions: Math.floor(Math.random() * 4000),
      likes: Math.floor(Math.random() * 180),
      retweets: Math.floor(Math.random() * 50),
    }
  })

  res.json({ account, postStats, actionStats, recentPosts, recentActions, metrics })
})

// 対象ポスト別エンゲージメントサマリー
router.get('/target-posts', (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT
      tp.id, tp.url, tp.tweet_id, tp.author, tp.description, tp.created_at,
      SUM(CASE WHEN pa.action_type='like'   AND pa.status='done' THEN 1 ELSE 0 END) AS like_done,
      SUM(CASE WHEN pa.action_type='repost' AND pa.status='done' THEN 1 ELSE 0 END) AS repost_done,
      SUM(CASE WHEN pa.action_type='reply'  AND pa.status='done' THEN 1 ELSE 0 END) AS reply_done,
      SUM(CASE WHEN pa.status='failed' THEN 1 ELSE 0 END) AS failed_count
    FROM target_posts tp
    LEFT JOIN post_actions pa ON pa.target_post_id = tp.id
    GROUP BY tp.id
    ORDER BY tp.created_at DESC
    LIMIT 50
  `).all()
  res.json(rows)
})

function row(db: ReturnType<typeof import('../db.js').getDb>, sql: string): number {
  return (db.prepare(sql).get() as { n: number }).n
}

export default router

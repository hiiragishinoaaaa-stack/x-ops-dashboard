import { useEffect, useState } from 'react'

interface Summary {
  accounts: number
  posts: { total: number; posted: number; scheduled: number; draft: number; failed: number }
  engagement: { targetPosts: number; likes: number; reposts: number; replies: number; failed: number }
  mockMetrics: { totalImpressions: number; totalLikes: number; totalRetweets: number }
}
interface DailyPost  { date: string; count: number; status: string }
interface Account    { id: string; username: string; display_name: string }
interface AccountStats {
  account: Account
  postStats: { status: string; count: number }[]
  actionStats: { action_type: string; count: number }[]
  recentPosts: { id: string; content: string; status: string; posted_at: string | null; created_at: string }[]
  recentActions: { action_type: string; status: string; executed_at: string | null; url: string; tweet_id: string }[]
  metrics: { date: string; impressions: number; likes: number; retweets: number }[]
}
interface TargetStat {
  id: string; url: string; tweet_id: string; author: string | null; description: string | null
  like_done: number; repost_done: number; reply_done: number; failed_count: number
  created_at: string
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [summary, setSummary]         = useState<Summary | null>(null)
  const [dailyPosts, setDailyPosts]   = useState<DailyPost[]>([])
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [selAccount, setSelAccount]   = useState('')
  const [accStats, setAccStats]       = useState<AccountStats | null>(null)
  const [targetStats, setTargetStats] = useState<TargetStat[]>([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState<'overview' | 'accounts' | 'targets'>('overview')

  const loadAll = async () => {
    setLoading(true)
    const [sRes, dRes, aRes, tRes] = await Promise.all([
      fetch('/api/analytics/summary'),
      fetch('/api/analytics/posts-by-day'),
      fetch('/api/accounts'),
      fetch('/api/analytics/target-posts'),
    ])
    setSummary(await sRes.json())
    setDailyPosts(await dRes.json())
    setAccounts(await aRes.json())
    setTargetStats(await tRes.json())
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!selAccount) { setAccStats(null); return }
    fetch(`/api/analytics/account/${selAccount}`)
      .then(r => r.json())
      .then(setAccStats)
  }, [selAccount])

  const maxDaily = Math.max(...dailyPosts.map(d => d.count), 1)
  const dailyMap: Record<string, number> = {}
  dailyPosts.forEach(d => { dailyMap[d.date] = (dailyMap[d.date] || 0) + d.count })
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  if (loading) return (
    <div className="p-6 flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">分析</h2>
        <p className="text-gray-500 text-sm mt-0.5">投稿パフォーマンスとエンゲージメント実績</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['overview', 'accounts', 'targets'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {{ overview: '概要', accounts: 'アカウント別', targets: '対象ポスト別' }[t]}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {tab === 'overview' && summary && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="アカウント"   value={summary.accounts}             color="text-indigo-600" />
            <StatCard label="総投稿数"     value={summary.posts.total}          sub={`投稿済: ${summary.posts.posted}`} color="text-blue-600" />
            <StatCard label="対象ポスト"   value={summary.engagement.targetPosts} color="text-purple-600" />
            <StatCard label="エンゲージ失敗" value={summary.engagement.failed}   color="text-red-500" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">エンゲージメント実績（実際のDB値）</h3>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="いいね 実行済" value={summary.engagement.likes}   color="text-pink-600" />
              <StatCard label="リポスト 実行済" value={summary.engagement.reposts} color="text-green-600" />
              <StatCard label="返信 実行済"   value={summary.engagement.replies} color="text-blue-600" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">投稿状況</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: '予約中',  v: summary.posts.scheduled, c: 'text-amber-600' },
                { l: '下書き',  v: summary.posts.draft,     c: 'text-gray-600'  },
                { l: '投稿済み', v: summary.posts.posted,   c: 'text-green-600' },
                { l: '失敗',    v: summary.posts.failed,    c: 'text-red-600'   },
              ].map(({ l, v, c }) => (
                <div key={l} className="card p-3 text-center">
                  <p className={`text-2xl font-bold ${c}`}>{v}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 投稿数グラフ */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">過去30日の投稿数</h3>
            <div className="flex items-end gap-0.5 h-28">
              {last30.map(date => (
                <div
                  key={date}
                  title={`${date}: ${dailyMap[date] || 0}件`}
                  className="flex flex-col items-center flex-1 min-w-0 h-full justify-end"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${Math.max(2, ((dailyMap[date] || 0) / maxDaily) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>30日前</span><span>今日</span>
            </div>
          </div>
        </div>
      )}

      {/* アカウント別タブ */}
      {tab === 'accounts' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <select className="input w-auto" value={selAccount} onChange={e => setSelAccount(e.target.value)}>
              <option value="">アカウントを選択</option>
              {accounts.map(a => <option key={a.id} value={a.id}>@{a.username} ({a.display_name})</option>)}
            </select>
            <button onClick={loadAll} className="btn-secondary text-xs">🔄 更新</button>
          </div>

          {!accStats ? (
            <p className="text-gray-400 text-center py-10">アカウントを選択してください</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 投稿統計 */}
                <div className="card p-4">
                  <h4 className="font-semibold text-gray-600 text-sm mb-3">投稿統計</h4>
                  <div className="space-y-2">
                    {accStats.postStats.map(s => (
                      <div key={s.status} className="flex justify-between text-sm">
                        <span className="text-gray-500">{s.status}</span>
                        <span className="font-bold text-gray-800">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* エンゲージメント統計 */}
                <div className="card p-4">
                  <h4 className="font-semibold text-gray-600 text-sm mb-3">エンゲージメント実行数</h4>
                  {accStats.actionStats.length === 0 ? (
                    <p className="text-gray-400 text-sm">実行履歴なし</p>
                  ) : (
                    <div className="space-y-2">
                      {accStats.actionStats.map(s => (
                        <div key={s.action_type} className="flex justify-between text-sm">
                          <span className="text-gray-500">{s.action_type}</span>
                          <span className="font-bold text-gray-800">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 直近のエンゲージメント */}
              <div className="card p-4">
                <h4 className="font-semibold text-gray-600 text-sm mb-3">直近のエンゲージメント</h4>
                {accStats.recentActions.length === 0 ? (
                  <p className="text-gray-400 text-sm">実行履歴なし</p>
                ) : (
                  <div className="space-y-2">
                    {accStats.recentActions.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-700 border-b border-gray-100 pb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          a.action_type === 'like'   ? 'bg-pink-100 text-pink-700' :
                          a.action_type === 'repost' ? 'bg-green-100 text-green-700' :
                                                       'bg-blue-100 text-blue-700'
                        }`}>{a.action_type}</span>
                        <a href={a.url} target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:underline text-xs truncate flex-1">{a.url}</a>
                        <span className={`text-xs ${a.status === 'done' ? 'text-green-500' : 'text-red-500'}`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* mock metrics */}
              <div className="card p-4">
                <h4 className="font-semibold text-gray-600 text-sm mb-3">過去7日メトリクス (mock)</h4>
                <table className="text-xs w-full">
                  <thead><tr className="text-gray-400 border-b">
                    <th className="text-left pb-1 pr-4">日付</th>
                    <th className="text-right pb-1 pr-3">IMP</th>
                    <th className="text-right pb-1 pr-3">いいね</th>
                    <th className="text-right pb-1">RT</th>
                  </tr></thead>
                  <tbody>
                    {accStats.metrics.map(m => (
                      <tr key={m.date} className="border-b border-gray-100">
                        <td className="py-1 pr-4 text-gray-600">{m.date}</td>
                        <td className="py-1 pr-3 text-right font-mono">{m.impressions.toLocaleString()}</td>
                        <td className="py-1 pr-3 text-right font-mono text-pink-600">{m.likes}</td>
                        <td className="py-1 text-right font-mono text-green-600">{m.retweets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 対象ポスト別タブ */}
      {tab === 'targets' && (
        <div className="space-y-3">
          {targetStats.length === 0 ? (
            <p className="text-gray-400 text-center py-10">対象ポストがありません</p>
          ) : (
            <div className="overflow-x-auto card">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">投稿</th>
                    <th className="text-center px-4 py-3 text-pink-500 font-medium">❤️ いいね</th>
                    <th className="text-center px-4 py-3 text-green-500 font-medium">🔁 RT</th>
                    <th className="text-center px-4 py-3 text-blue-500 font-medium">💬 返信</th>
                    <th className="text-center px-4 py-3 text-red-400 font-medium">✗ 失敗</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">登録日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {targetStats.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-xs">
                        {t.author && <span className="font-medium text-gray-700 text-xs">@{t.author} </span>}
                        <a href={t.url} target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:underline text-xs font-mono">{t.tweet_id}</a>
                        {t.description && <p className="text-gray-400 text-xs mt-0.5">{t.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-pink-600 text-lg">{t.like_done}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-green-600 text-lg">{t.repost_done}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-blue-600 text-lg">{t.reply_done}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-lg ${t.failed_count > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                          {t.failed_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {new Date(t.created_at).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

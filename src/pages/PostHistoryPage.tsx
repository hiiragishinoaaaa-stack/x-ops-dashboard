import { useEffect, useState } from 'react'

interface Account { id: string; username: string; display_name: string }
interface Post {
  id: string; content: string; status: string
  scheduled_at: string | null; posted_at: string | null
  tweet_id: string | null; error_message: string | null
  username: string; display_name: string; created_at: string
  account_id: string
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  posted:    { label: '投稿済み',  cls: 'badge-posted'    },
  scheduled: { label: '予約済み',  cls: 'badge-scheduled' },
  draft:     { label: '下書き',   cls: 'badge-draft'     },
  failed:    { label: '失敗',     cls: 'badge-failed'    },
}

export default function PostHistoryPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterAccount !== 'all') params.set('account_id', filterAccount)
    if (filterStatus !== 'all') params.set('status', filterStatus)

    const [postsRes, accRes] = await Promise.all([
      fetch(`/api/posts?${params}`),
      fetch('/api/accounts'),
    ])
    setPosts(await postsRes.json())
    setAccounts(await accRes.json())
    setLoading(false)
  }

  useEffect(() => { loadData() }, [filterAccount, filterStatus])

  const handleSend = async (id: string) => {
    setSending(id)
    const res = await fetch(`/api/posts/${id}/send`, { method: 'POST' })
    const d = await res.json()
    setMessage(d.success ? '✅ 投稿しました！' : `❌ ${d.error}`)
    loadData()
    setSending(null)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この投稿を削除しますか？')) return
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    loadData()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">投稿履歴</h2>
        <p className="text-gray-500 text-sm mt-0.5">全投稿の状態確認と操作</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{message}</div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="input w-auto" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
          <option value="all">全アカウント</option>
          {accounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}
        </select>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">全ステータス</option>
          <option value="posted">投稿済み</option>
          <option value="scheduled">予約済み</option>
          <option value="draft">下書き</option>
          <option value="failed">失敗</option>
        </select>
        <span className="text-gray-400 text-sm self-center">{posts.length}件</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-10 text-center border-dashed">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-gray-400">投稿履歴はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const statusInfo = STATUS_LABELS[post.status] || { label: post.status, cls: 'badge-draft' }
            return (
              <div key={post.id} className="card p-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                    {post.display_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-800 text-sm">{post.display_name}</span>
                      <span className="text-gray-400 text-xs">@{post.username}</span>
                      <span className={statusInfo.cls}>{statusInfo.label}</span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-4">{post.content}</p>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <span>作成: {new Date(post.created_at).toLocaleString('ja-JP')}</span>
                      {post.scheduled_at && <span>📅 {new Date(post.scheduled_at).toLocaleString('ja-JP')}</span>}
                      {post.posted_at && <span>✅ {new Date(post.posted_at).toLocaleString('ja-JP')}</span>}
                      {post.tweet_id && <span className="font-mono">ID: {post.tweet_id.slice(0, 20)}...</span>}
                    </div>
                    {post.error_message && (
                      <p className="text-red-500 text-xs mt-1">❌ {post.error_message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    {(post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed') && (
                      <button
                        onClick={() => handleSend(post.id)}
                        disabled={sending === post.id}
                        className="btn-primary py-1 px-3 text-xs"
                      >
                        {sending === post.id ? '送信中...' : '今すぐ送信'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(post.id)} className="btn-danger py-1 text-xs">削除</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

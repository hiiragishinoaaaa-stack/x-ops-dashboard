import { useEffect, useState } from 'react'
import { Page } from '../App'

interface Account { id: string; username: string; display_name: string }
interface Post { id: string; content: string; status: string; scheduled_at: string | null; username: string; display_name: string; created_at: string }

export default function PostSchedulePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [scheduled, setScheduled] = useState<Post[]>([])
  const [form, setForm] = useState({ account_id: '', content: '', scheduled_at: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    const [accRes, postRes] = await Promise.all([
      fetch('/api/accounts'),
      fetch('/api/posts?status=scheduled'),
    ])
    const accs = await accRes.json()
    const posts = await postRes.json()
    setAccounts(accs)
    setScheduled(posts)
    if (accs.length > 0 && !form.account_id) {
      setForm(f => ({ ...f, account_id: accs[0].id }))
    }
  }

  useEffect(() => { loadData() }, [])

  const charCount = form.content.length
  const overLimit = charCount > 280

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (overLimit) return
    setLoading(true)
    setMessage('')
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setMessage('✅ 予約しました')
      setForm(f => ({ ...f, content: '', scheduled_at: '' }))
      loadData()
    } else {
      const d = await res.json()
      setMessage(`❌ ${d.error}`)
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    loadData()
  }

  const handleSendNow = async (id: string) => {
    const res = await fetch(`/api/posts/${id}/send`, { method: 'POST' })
    const d = await res.json()
    setMessage(d.success ? `✅ 投稿しました！` : `❌ ${d.error}`)
    loadData()
    setTimeout(() => setMessage(''), 4000)
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">投稿予約</h2>
        <div className="card p-10 text-center border-dashed">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-500 mb-3">投稿予約にはアカウントが必要です</p>
          <button onClick={() => onNavigate('register')} className="btn-primary">アカウントを登録する</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">投稿予約</h2>
        <p className="text-gray-500 text-sm mt-0.5">投稿内容と日時を設定してスケジュールします</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{message}</div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-700">新規予約</h3>

        <div>
          <label className="label">投稿アカウント</label>
          <select
            className="input"
            value={form.account_id}
            onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
            required
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>@{a.username} ({a.display_name})</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="label mb-0">投稿内容</label>
            <span className={`text-xs font-medium ${overLimit ? 'text-red-600' : charCount > 240 ? 'text-amber-600' : 'text-gray-400'}`}>
              {charCount}/280
            </span>
          </div>
          <textarea
            className={`input h-28 resize-none ${overLimit ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="投稿内容を入力してください..."
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label">予約日時</label>
          <input
            className="input"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
            min={new Date().toISOString().slice(0, 16)}
          />
          <p className="text-xs text-gray-400 mt-1">空欄の場合は「下書き」として保存されます</p>
        </div>

        <button type="submit" disabled={loading || overLimit} className="btn-primary">
          {loading ? '処理中...' : form.scheduled_at ? '📅 予約する' : '💾 下書き保存'}
        </button>
      </form>

      {/* Scheduled list */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">予約済み投稿 ({scheduled.length}件)</h3>
        {scheduled.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">予約済みの投稿はありません</p>
        ) : (
          <div className="space-y-3">
            {scheduled.map(post => (
              <div key={post.id} className="card p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-scheduled">予約済み</span>
                      <span className="text-gray-500 text-xs">@{post.username}</span>
                    </div>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap line-clamp-3">{post.content}</p>
                    {post.scheduled_at && (
                      <p className="text-xs text-blue-600 mt-1">
                        📅 {new Date(post.scheduled_at).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleSendNow(post.id)} className="btn-primary py-1 px-3">今すぐ送信</button>
                    <button onClick={() => handleDelete(post.id)} className="btn-danger">削除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

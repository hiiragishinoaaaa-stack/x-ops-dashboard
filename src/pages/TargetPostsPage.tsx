import { useEffect, useState } from 'react'
import { Page } from '../App'

interface TargetPost {
  id: string; url: string; tweet_id: string; author: string | null
  description: string | null; status: string; created_at: string
  like_done: number; repost_done: number; reply_done: number; failed_count: number
}

interface AccountStatus {
  id: string; username: string; display_name: string
  actions: Record<string, { status: string; executed_at: string | null; error_message: string | null }>
}

export default function TargetPostsPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [posts, setPosts] = useState<TargetPost[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [accountStatuses, setAccountStatuses] = useState<AccountStatus[]>([])
  const [statusLoading, setStatusLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/target-posts')
    setPosts(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')
    const res = await fetch('/api/target-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), description: description.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setAdding(false); return }
    setUrl(''); setDescription('')
    await load()
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/target-posts/${id}`, { method: 'DELETE' })
    if (selectedPost === id) setSelectedPost(null)
    load()
  }

  const handleSelectPost = async (id: string) => {
    if (selectedPost === id) { setSelectedPost(null); return }
    setSelectedPost(id)
    setStatusLoading(true)
    const res = await fetch(`/api/target-posts/${id}/status`)
    const data = await res.json()
    setAccountStatuses(data.accounts || [])
    setStatusLoading(false)
  }

  const ACTION_TYPES = ['like', 'repost', 'reply'] as const

  const statusBadge = (status?: string) => {
    if (!status) return <span className="text-gray-300 text-xs">—</span>
    const map: Record<string, string> = {
      done:   'text-green-600 bg-green-50',
      failed: 'text-red-600 bg-red-50',
      pending:'text-amber-600 bg-amber-50',
    }
    const label: Record<string, string> = { done: '✓ 完了', failed: '✗ 失敗', pending: '⏳ 待機' }
    return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${map[status] || 'text-gray-400'}`}>{label[status] || status}</span>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">対象ポスト管理</h2>
          <p className="text-gray-500 text-sm mt-0.5">いいね・リポスト・返信の対象となるポストURLを管理します</p>
        </div>
        <button
          onClick={() => onNavigate('engagement')}
          className="btn-primary"
        >
          ⚡ エンゲージメント実行へ
        </button>
      </div>

      {/* 登録フォーム */}
      <form onSubmit={handleAdd} className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-700">ポストURL登録</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              className="input"
              type="url"
              placeholder="https://x.com/username/status/1234567890"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="w-64">
            <input
              className="input"
              type="text"
              placeholder="メモ（任意）"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" disabled={adding} className="btn-primary whitespace-nowrap">
            {adding ? '登録中...' : '＋ 登録'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-line">{error}</p>}
      </form>

      {/* ポスト一覧 */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-10 text-center border-dashed">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-gray-400">対象ポストが登録されていません</p>
          <p className="text-gray-400 text-sm mt-1">上のフォームにX投稿のURLを貼り付けて登録してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleSelectPost(post.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {post.author && (
                        <span className="font-medium text-gray-700 text-sm">@{post.author}</span>
                      )}
                      <span className="text-xs font-mono text-gray-400">{post.tweet_id}</span>
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 text-sm hover:underline truncate block"
                      onClick={e => e.stopPropagation()}
                    >
                      {post.url}
                    </a>
                    {post.description && (
                      <p className="text-gray-500 text-xs mt-1">{post.description}</p>
                    )}
                  </div>

                  {/* エンゲージメント数 */}
                  <div className="flex gap-3 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-pink-600">{post.like_done}</p>
                      <p className="text-xs text-gray-400">いいね</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{post.repost_done}</p>
                      <p className="text-xs text-gray-400">RT</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{post.reply_done}</p>
                      <p className="text-xs text-gray-400">返信</p>
                    </div>
                    {post.failed_count > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-500">{post.failed_count}</p>
                        <p className="text-xs text-gray-400">失敗</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-400 text-xs">
                      {new Date(post.created_at).toLocaleDateString('ja-JP')}
                    </span>
                    <span className="text-gray-300">{selectedPost === post.id ? '▲' : '▼'}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(post.id) }}
                      className="btn-danger"
                    >削除</button>
                  </div>
                </div>
              </div>

              {/* アカウント別ステータス */}
              {selectedPost === post.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <h4 className="font-semibold text-gray-600 text-sm mb-3">アカウント別対応状況</h4>
                  {statusLoading ? (
                    <div className="text-gray-400 text-sm py-2">読み込み中...</div>
                  ) : accountStatuses.length === 0 ? (
                    <p className="text-gray-400 text-sm">アクティブなアカウントがありません</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="text-sm w-full">
                        <thead>
                          <tr className="text-gray-500 text-xs border-b border-gray-200">
                            <th className="text-left pb-2 pr-4">アカウント</th>
                            {ACTION_TYPES.map(t => (
                              <th key={t} className="text-center pb-2 px-3">{t}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {accountStatuses.map(acc => (
                            <tr key={acc.id} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 pr-4">
                                <span className="font-medium text-gray-700">{acc.display_name}</span>
                                <span className="text-gray-400 text-xs ml-1">@{acc.username}</span>
                              </td>
                              {ACTION_TYPES.map(t => (
                                <td key={t} className="py-2 px-3 text-center">
                                  {statusBadge(acc.actions[t]?.status)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3">
                    <button
                      onClick={() => onNavigate('engagement')}
                      className="btn-primary text-xs py-1.5"
                    >
                      ⚡ このポストでエンゲージメントを実行
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

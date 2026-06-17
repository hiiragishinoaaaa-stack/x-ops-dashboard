import { useEffect, useState } from 'react'
import { Page } from '../App'

interface Account {
  id: string
  username: string
  display_name: string
  status: string
  created_at: string
}

export default function AccountListPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/accounts')
      setAccounts(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAccounts() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`@${name} を削除しますか？`)) return
    setDeleting(id)
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    await fetchAccounts()
    setDeleting(null)
  }

  const handleToggleStatus = async (id: string, current: string) => {
    await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: current === 'active' ? 'inactive' : 'active' }),
    })
    fetchAccounts()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">アカウント一覧</h2>
          <p className="text-gray-500 text-sm mt-0.5">登録済みXアカウント ({accounts.length}件)</p>
        </div>
        <button onClick={() => onNavigate('register')} className="btn-primary">
          ＋ アカウント追加
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-gray-500 font-medium mb-2">アカウントが登録されていません</p>
          <p className="text-gray-400 text-sm mb-4">最初のXアカウントを登録して運用を始めましょう</p>
          <button onClick={() => onNavigate('register')} className="btn-primary">
            アカウントを登録する
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                {acc.display_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{acc.display_name}</p>
                <p className="text-gray-500 text-sm">@{acc.username}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  登録: {new Date(acc.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleStatus(acc.id, acc.status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    acc.status === 'active'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {acc.status === 'active' ? '✓ 有効' : '✗ 無効'}
                </button>
                <button
                  onClick={() => handleDelete(acc.id, acc.username)}
                  disabled={deleting === acc.id}
                  className="btn-danger"
                >
                  {deleting === acc.id ? '...' : '削除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

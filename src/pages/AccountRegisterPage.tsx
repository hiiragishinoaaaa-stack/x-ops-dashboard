import { useState } from 'react'
import { Page } from '../App'

interface FormState {
  username: string
  display_name: string
  api_key: string
  api_secret: string
  access_token: string
  access_secret: string
}

export default function AccountRegisterPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [form, setForm] = useState<FormState>({
    username: '', display_name: '',
    api_key: '', api_secret: '', access_token: '', access_secret: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'エラーが発生しました'); return }
      setDone(true)
      setTimeout(() => onNavigate('accounts'), 1500)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: 300 }}>
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-semibold text-gray-700">アカウントを登録しました</p>
          <p className="text-gray-400 text-sm mt-1">一覧画面に移動します...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">アカウント登録</h2>
        <p className="text-gray-500 text-sm mt-0.5">新しいXアカウントを管理対象に追加します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">基本情報</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ユーザー名 <span className="text-red-500">*</span></label>
              <input className="input" type="text" placeholder="myaccount" required value={form.username} onChange={set('username')} />
              <p className="text-xs text-gray-400 mt-1">@ マーク不要</p>
            </div>
            <div>
              <label className="label">表示名 <span className="text-red-500">*</span></label>
              <input className="input" type="text" placeholder="My Account" required value={form.display_name} onChange={set('display_name')} />
            </div>
          </div>
        </div>

        {/* API credentials */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">X API認証情報</h3>
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">後から設定可・空欄でmock動作</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {([
              ['api_key', 'API Key (Consumer Key)'],
              ['api_secret', 'API Secret (Consumer Secret)'],
              ['access_token', 'Access Token'],
              ['access_secret', 'Access Token Secret'],
            ] as [keyof FormState, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" type="password" placeholder="入力してください" value={form[key]} onChange={set(key)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            ※ X Developer Portal (developer.twitter.com) で取得したキーを入力してください
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '登録中...' : '登録する'}
          </button>
          <button type="button" onClick={() => onNavigate('accounts')} className="btn-secondary">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}

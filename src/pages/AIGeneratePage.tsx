import { useEffect, useState } from 'react'
import { Page } from '../App'

interface Account { id: string; username: string; display_name: string }

const TONES = [
  { value: 'professional', label: 'プロフェッショナル', emoji: '💼' },
  { value: 'casual',       label: 'カジュアル',          emoji: '😊' },
  { value: 'humorous',     label: 'ユーモア',            emoji: '😄' },
  { value: 'informative',  label: '情報・解説',          emoji: '📚' },
]
const LENGTHS = [
  { value: 'short',  label: '短め (~80文字)' },
  { value: 'medium', label: '普通 (~160文字)' },
  { value: 'long',   label: '長め (~280文字)' },
]

export default function AIGeneratePage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('casual')
  const [length, setLength] = useState('medium')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then((data: Account[]) => {
      setAccounts(data)
      if (data.length > 0) setSelectedAccount(data[0].id)
    })
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setGenerated('')
    setMessage('')
    const res = await fetch('/api/posts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, tone, length }),
    })
    const data = await res.json()
    setGenerated(data.content)
    setHistory(prev => [data.content, ...prev].slice(0, 5))
    setLoading(false)
  }

  const handleSaveAsDraft = async () => {
    if (!generated || !selectedAccount) return
    setSaving(true)
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: selectedAccount, content: generated }),
    })
    if (res.ok) {
      setMessage('✅ 下書きとして保存しました')
    } else {
      const d = await res.json()
      setMessage(`❌ ${d.error}`)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generated)
    setMessage('📋 クリップボードにコピーしました')
    setTimeout(() => setMessage(''), 2000)
  }

  const charCount = generated.length
  const overLimit = charCount > 280

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">AI投稿文生成</h2>
        <p className="text-gray-500 text-sm mt-0.5">トピックを入力するとAIが投稿文を自動生成します (現在: mock)</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.startsWith('✅') || message.startsWith('📋')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>{message}</div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Input panel */}
        <div className="col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">生成設定</h3>

            <div>
              <label className="label">トピック・テーマ <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="例: ChatGPT、マーケティング、筋トレ..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            <div>
              <label className="label">トーン</label>
              <div className="grid grid-cols-2 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      tone === t.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">文字数</label>
              <div className="space-y-2">
                {LENGTHS.map(l => (
                  <label key={l.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="length"
                      value={l.value}
                      checked={length === l.value}
                      onChange={() => setLength(l.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{l.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="btn-primary w-full justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  生成中...
                </span>
              ) : '🤖 投稿文を生成する'}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card p-4">
              <h4 className="font-semibold text-gray-600 text-sm mb-3">生成履歴</h4>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setGenerated(h)}
                    className="w-full text-left text-xs text-gray-500 hover:text-gray-700 truncate py-1 border-b border-gray-100 last:border-0"
                  >
                    {h.slice(0, 60)}...
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Output panel */}
        <div className="col-span-3">
          <div className="card p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">生成結果</h3>
              {generated && (
                <span className={`text-xs font-medium ${overLimit ? 'text-red-600' : 'text-gray-400'}`}>
                  {charCount}/280文字
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">AIが生成中です...</p>
                </div>
              </div>
            ) : generated ? (
              <>
                <textarea
                  className={`flex-1 resize-none border rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-40 ${
                    overLimit ? 'border-red-400' : 'border-gray-200'
                  }`}
                  value={generated}
                  onChange={e => setGenerated(e.target.value)}
                />
                {overLimit && (
                  <p className="text-red-500 text-xs mt-1">280文字を超えています。内容を短くしてください。</p>
                )}
                <div className="flex gap-3 mt-4">
                  <button onClick={handleCopy} className="btn-secondary">📋 コピー</button>
                  <button onClick={handleGenerate} disabled={loading} className="btn-secondary">🔄 再生成</button>
                  {accounts.length > 0 && (
                    <div className="flex gap-2 ml-auto">
                      <select
                        className="input w-auto text-xs"
                        value={selectedAccount}
                        onChange={e => setSelectedAccount(e.target.value)}
                      >
                        {accounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}
                      </select>
                      <button
                        onClick={handleSaveAsDraft}
                        disabled={saving || overLimit}
                        className="btn-primary"
                      >
                        {saving ? '保存中...' : '💾 下書き保存'}
                      </button>
                      <button
                        onClick={() => {
                          sessionStorage.setItem('draft_content', generated)
                          sessionStorage.setItem('draft_account', selectedAccount)
                          onNavigate('schedule')
                        }}
                        disabled={overLimit}
                        className="btn-primary"
                      >
                        📅 予約する
                      </button>
                    </div>
                  )}
                  {accounts.length === 0 && (
                    <button onClick={() => onNavigate('register')} className="btn-secondary ml-auto text-xs">
                      アカウントを登録する →
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-4xl mb-3">✨</p>
                  <p className="text-sm">トピックを入力して「生成する」を押してください</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

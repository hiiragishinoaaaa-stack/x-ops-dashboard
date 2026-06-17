import { useEffect, useState } from 'react'
import { Page } from '../App'

interface TargetPost {
  id: string; url: string; tweet_id: string; author: string | null; description: string | null
  like_done: number; repost_done: number; reply_done: number
}
interface Account {
  id: string; username: string; display_name: string; status: string
}
interface ActionResult {
  account_id: string; username: string; display_name: string
  success: boolean; skipped?: boolean; error?: string
}
interface ExecuteResult {
  results: ActionResult[]
  summary: { total: number; success: number; failed: number; skipped: number }
}

const ACTION_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  like:   { label: 'いいね',   color: 'bg-pink-100 text-pink-700 border-pink-300',    emoji: '❤️' },
  repost: { label: 'リポスト', color: 'bg-green-100 text-green-700 border-green-300', emoji: '🔁' },
  reply:  { label: '返信',     color: 'bg-blue-100 text-blue-700 border-blue-300',    emoji: '💬' },
}

export default function EngagementPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [targets, setTargets]         = useState<TargetPost[]>([])
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [actionType, setActionType]   = useState<string>('like')
  const [replyContent, setReplyContent] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [countInput, setCountInput]   = useState<string>('')
  const [executing, setExecuting]     = useState(false)
  const [result, setResult]           = useState<ExecuteResult | null>(null)
  const [loadingTargets, setLoadingTargets] = useState(true)

  const load = async () => {
    setLoadingTargets(true)
    const [tRes, aRes] = await Promise.all([
      fetch('/api/target-posts'),
      fetch('/api/accounts'),
    ])
    const tData: TargetPost[] = await tRes.json()
    const aData: Account[]    = await aRes.json()
    setTargets(tData)
    setAccounts(aData.filter(a => a.status === 'active'))
    if (tData.length > 0 && !selectedTarget) setSelectedTarget(tData[0].id)
    setLoadingTargets(false)
  }

  useEffect(() => { load() }, [])

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectN = (n: number) => {
    const n2 = Math.min(n, accounts.length)
    setSelectedAccounts(new Set(accounts.slice(0, n2).map(a => a.id)))
  }

  const selectAll = () => setSelectedAccounts(new Set(accounts.map(a => a.id)))
  const clearAll  = () => setSelectedAccounts(new Set())

  const handleCountApply = () => {
    const n = parseInt(countInput, 10)
    if (!isNaN(n) && n > 0) selectN(n)
  }

  const handleExecute = async () => {
    if (!selectedTarget)             return alert('対象ポストを選択してください')
    if (selectedAccounts.size === 0) return alert('アカウントを1つ以上選択してください')
    if (actionType === 'reply' && !replyContent.trim()) return alert('返信内容を入力してください')

    setExecuting(true)
    setResult(null)

    const res = await fetch(`/api/target-posts/${selectedTarget}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        account_ids: [...selectedAccounts],
        reply_content: replyContent.trim() || undefined,
      }),
    })

    const data = await res.json()
    setResult(data)
    setExecuting(false)
    load()
  }

  const currentTarget = targets.find(t => t.id === selectedTarget)
  const actionInfo    = ACTION_LABELS[actionType]

  if (loadingTargets) {
    return (
      <div className="p-6 flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (targets.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">エンゲージメント実行</h2>
        <div className="card p-12 text-center border-dashed">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-gray-500 mb-3">対象ポストが登録されていません</p>
          <button onClick={() => onNavigate('target-posts')} className="btn-primary">
            対象ポストを登録する →
          </button>
        </div>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">エンゲージメント実行</h2>
        <div className="card p-12 text-center border-dashed">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 mb-3">アクティブなアカウントがありません</p>
          <button onClick={() => onNavigate('register')} className="btn-primary">
            アカウントを登録する →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">エンゲージメント実行</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          対象ポストへのいいね・リポスト・返信を複数アカウントでまとめて実行します
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* 左: 設定パネル */}
        <div className="col-span-3 space-y-4">

          {/* 対象ポスト選択 */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">① 対象ポストを選択</h3>
            <select
              className="input"
              value={selectedTarget}
              onChange={e => setSelectedTarget(e.target.value)}
            >
              {targets.map(t => (
                <option key={t.id} value={t.id}>
                  {t.author ? `@${t.author} · ` : ''}{t.tweet_id}
                  {t.description ? ` · ${t.description}` : ''}
                </option>
              ))}
            </select>
            {currentTarget && (
              <a
                href={currentTarget.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 text-xs hover:underline truncate block"
              >
                {currentTarget.url}
              </a>
            )}
            {currentTarget && (
              <div className="flex gap-4 text-xs text-gray-500">
                <span>❤️ いいね済: <strong className="text-pink-600">{currentTarget.like_done}</strong></span>
                <span>🔁 RT済: <strong className="text-green-600">{currentTarget.repost_done}</strong></span>
                <span>💬 返信済: <strong className="text-blue-600">{currentTarget.reply_done}</strong></span>
              </div>
            )}
          </div>

          {/* アクション選択 */}
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">② アクションを選択</h3>
            <div className="flex gap-3">
              {Object.entries(ACTION_LABELS).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setActionType(type)}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    actionType === type
                      ? `${info.color} border-current scale-105 shadow-sm`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl block mb-1">{info.emoji}</span>
                  {info.label}
                </button>
              ))}
            </div>
            {actionType === 'reply' && (
              <div>
                <label className="label">返信内容</label>
                <textarea
                  className={`input h-24 resize-none ${replyContent.length > 280 ? 'border-red-400' : ''}`}
                  placeholder="返信テキストを入力（280文字以内）"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                />
                <p className={`text-xs mt-1 ${replyContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                  {replyContent.length}/280
                </p>
              </div>
            )}
          </div>

          {/* アカウント選択 */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">③ 実行するアカウントを選択</h3>
              <span className="text-blue-600 text-sm font-medium">{selectedAccounts.size}/{accounts.length}件選択</span>
            </div>

            {/* クイック数値選択 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">上から</span>
              {[1, 3, 5, 10].filter(n => n <= accounts.length).map(n => (
                <button
                  key={n}
                  onClick={() => selectN(n)}
                  className="px-2.5 py-1 rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {n}件
                </button>
              ))}
              <span className="text-xs text-gray-500">を選択 または</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="N"
                  min={1}
                  max={accounts.length}
                  value={countInput}
                  onChange={e => setCountInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCountApply()}
                />
                <button onClick={handleCountApply} className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200">適用</button>
              </div>
              <span className="text-gray-300 text-xs">|</span>
              <button onClick={selectAll} className="text-xs text-blue-500 hover:underline">全選択</button>
              <button onClick={clearAll}  className="text-xs text-gray-400 hover:underline">解除</button>
            </div>

            {/* アカウントチェックリスト */}
            <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {accounts.map((acc, i) => (
                <label
                  key={acc.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    selectedAccounts.has(acc.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  } ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccounts.has(acc.id)}
                    onChange={() => toggleAccount(acc.id)}
                    className="rounded text-blue-600"
                  />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {acc.display_name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{acc.display_name}</p>
                    <p className="text-xs text-gray-400">@{acc.username}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">#{i + 1}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 実行ボタン */}
          <button
            onClick={handleExecute}
            disabled={executing || selectedAccounts.size === 0 || !selectedTarget}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" />
                実行中... ({selectedAccounts.size}アカウント)
              </span>
            ) : (
              `${actionInfo.emoji} ${actionInfo.label}を実行 — ${selectedAccounts.size}アカウント`
            )}
          </button>
        </div>

        {/* 右: 結果パネル */}
        <div className="col-span-2">
          <div className="card p-5 h-full">
            <h3 className="font-semibold text-gray-700 mb-4">実行結果</h3>

            {executing && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                <p className="text-gray-500 text-sm">処理中です...</p>
                <p className="text-gray-400 text-xs mt-1">{selectedAccounts.size}アカウント</p>
              </div>
            )}

            {!executing && !result && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-gray-400 text-sm">左側で設定して実行ボタンを押すと<br />結果がここに表示されます</p>
              </div>
            )}

            {!executing && result && (
              <div className="space-y-4">
                {/* サマリー */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center bg-green-50 rounded-lg py-2">
                    <p className="text-2xl font-bold text-green-600">{result.summary.success}</p>
                    <p className="text-xs text-green-500">成功</p>
                  </div>
                  <div className="text-center bg-red-50 rounded-lg py-2">
                    <p className="text-2xl font-bold text-red-600">{result.summary.failed}</p>
                    <p className="text-xs text-red-500">失敗</p>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg py-2">
                    <p className="text-2xl font-bold text-gray-500">{result.summary.skipped}</p>
                    <p className="text-xs text-gray-400">スキップ</p>
                  </div>
                </div>

                {/* 個別結果 */}
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {result.results.map(r => (
                    <div
                      key={r.account_id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        r.success          ? 'bg-green-50 text-green-800' :
                        r.skipped          ? 'bg-gray-50 text-gray-500'   :
                                             'bg-red-50 text-red-700'
                      }`}
                    >
                      <span>{r.success ? '✓' : r.skipped ? '—' : '✗'}</span>
                      <span className="font-medium">@{r.username}</span>
                      {r.error && !r.skipped && (
                        <span className="text-xs ml-auto truncate max-w-24" title={r.error}>{r.error}</span>
                      )}
                      {r.skipped && (
                        <span className="text-xs ml-auto text-gray-400">実行済み</span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setResult(null)}
                  className="btn-secondary w-full"
                >
                  クリア
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

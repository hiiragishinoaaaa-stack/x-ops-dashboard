import { useEffect, useState, useRef } from 'react'

interface Log {
  id: string
  level: string
  message: string
  context: string | null
  created_at: string
}

const LEVEL_STYLES: Record<string, string> = {
  info:  'text-blue-600 bg-blue-50',
  error: 'text-red-600 bg-red-50',
  warn:  'text-amber-600 bg-amber-50',
  debug: 'text-gray-500 bg-gray-100',
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [level, setLevel] = useState('all')
  const [limit, setLimit] = useState(100)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadLogs = async () => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (level !== 'all') params.set('level', level)
    const res = await fetch(`/api/logs?${params}`)
    const data = await res.json()
    setLogs(data.logs)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    loadLogs()
  }, [level, limit])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadLogs, 3000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, level, limit])

  const handleClear = async () => {
    if (!confirm('全ログを削除しますか？')) return
    await fetch('/api/logs/clear', { method: 'DELETE' })
    loadLogs()
  }

  const levelCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.level] = (acc[l.level] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ログ</h2>
          <p className="text-gray-500 text-sm mt-0.5">システムイベントと操作ログ (全 {total} 件)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
              autoRefresh ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {autoRefresh ? '⏸ 自動更新中' : '▶ 自動更新'}
          </button>
          <button onClick={loadLogs} className="btn-secondary">🔄 更新</button>
          <button onClick={handleClear} className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
            🗑 全削除
          </button>
        </div>
      </div>

      {/* Level filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'info', 'error', 'warn', 'debug'].map(l => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              level === l ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {l === 'all' ? `全て (${total})` : `${l.toUpperCase()} (${levelCounts[l] || 0})`}
          </button>
        ))}
        <select
          className="input w-auto ml-auto text-sm"
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        >
          <option value={50}>50件</option>
          <option value={100}>100件</option>
          <option value={200}>200件</option>
          <option value={500}>500件</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-10 text-center border-dashed">
          <p className="text-3xl mb-3">📝</p>
          <p className="text-gray-400">ログはありません</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map(log => (
              <div key={log.id} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${LEVEL_STYLES[log.level] || 'text-gray-500 bg-gray-100'}`}>
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{log.message}</p>
                    {log.context && (
                      <button
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
                      >
                        {expanded === log.id ? '▲ コンテキストを閉じる' : '▼ コンテキストを見る'}
                      </button>
                    )}
                    {expanded === log.id && log.context && (
                      <pre className="mt-1.5 text-xs bg-gray-900 text-green-400 rounded p-2 overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.context), null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 font-mono">
                    {new Date(log.created_at).toLocaleTimeString('ja-JP')}
                    <span className="hidden sm:inline"> · {new Date(log.created_at).toLocaleDateString('ja-JP')}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

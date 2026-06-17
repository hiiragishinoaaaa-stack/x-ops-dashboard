import { Page } from '../App'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

type NavItem = { page: Page; label: string; icon: string } | 'divider'

const navItems: NavItem[] = [
  { page: 'accounts',     label: 'アカウント一覧',    icon: '👥' },
  { page: 'register',     label: 'アカウント登録',    icon: '➕' },
  'divider',
  { page: 'schedule',     label: '投稿予約',          icon: '📅' },
  { page: 'history',      label: '投稿履歴',          icon: '📋' },
  { page: 'ai-generate',  label: 'AI投稿文生成',      icon: '🤖' },
  'divider',
  { page: 'target-posts', label: '対象ポスト管理',    icon: '🎯' },
  { page: 'engagement',   label: 'エンゲージメント実行', icon: '⚡' },
  'divider',
  { page: 'analytics',    label: '分析',              icon: '📊' },
  { page: 'logs',         label: 'ログ',              icon: '📝' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-60 bg-gray-900 min-h-screen flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <span className="text-white text-2xl font-black">𝕏</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">運用管理</p>
            <p className="text-gray-500 text-xs">Ops Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item === 'divider') {
            return <div key={i} className="my-2 border-t border-gray-800" />
          }
          const active = currentPage === item.page
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-5 py-3 border-t border-gray-800">
        <span className="text-gray-600 text-xs">v1.0 · mock mode</span>
      </div>
    </aside>
  )
}

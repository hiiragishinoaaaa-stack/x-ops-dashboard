import { useState } from 'react'
import Layout from './components/Layout'
import AccountListPage     from './pages/AccountListPage'
import AccountRegisterPage from './pages/AccountRegisterPage'
import PostSchedulePage    from './pages/PostSchedulePage'
import PostHistoryPage     from './pages/PostHistoryPage'
import AIGeneratePage      from './pages/AIGeneratePage'
import TargetPostsPage     from './pages/TargetPostsPage'
import EngagementPage      from './pages/EngagementPage'
import AnalyticsPage       from './pages/AnalyticsPage'
import LogsPage            from './pages/LogsPage'

export type Page =
  | 'accounts'
  | 'register'
  | 'schedule'
  | 'history'
  | 'ai-generate'
  | 'target-posts'
  | 'engagement'
  | 'analytics'
  | 'logs'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('accounts')

  const renderPage = () => {
    switch (currentPage) {
      case 'accounts':     return <AccountListPage     onNavigate={setCurrentPage} />
      case 'register':     return <AccountRegisterPage onNavigate={setCurrentPage} />
      case 'schedule':     return <PostSchedulePage    onNavigate={setCurrentPage} />
      case 'history':      return <PostHistoryPage />
      case 'ai-generate':  return <AIGeneratePage      onNavigate={setCurrentPage} />
      case 'target-posts': return <TargetPostsPage     onNavigate={setCurrentPage} />
      case 'engagement':   return <EngagementPage      onNavigate={setCurrentPage} />
      case 'analytics':    return <AnalyticsPage />
      case 'logs':         return <LogsPage />
      default:             return <AccountListPage     onNavigate={setCurrentPage} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

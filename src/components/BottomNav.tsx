'use client'

export type DashboardTab = 'home' | 'input' | 'scan' | 'planner' | 'insight'

interface BottomNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}

const NAV_ITEMS: Array<{
  id: DashboardTab
  label: string
  icon: string
}> = [
  { id: 'home', label: 'Beranda', icon: 'H' },
  { id: 'input', label: 'Catat', icon: '+' },
  { id: 'scan', label: 'Scan', icon: 'O' },
  { id: 'planner', label: 'Rencana', icon: 'AI' },
  { id: 'insight', label: 'Insight', icon: '%' },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          type="button"
          className={`bottom-nav__item ${activeTab === item.id ? 'is-active' : ''}`}
          onClick={() => onTabChange(item.id)}
          aria-current={activeTab === item.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

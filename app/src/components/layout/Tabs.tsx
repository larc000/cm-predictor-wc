import type { Tab } from '@/lib/types';

type TabsProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'quiniela', label: 'Mi Quiniela' },
  { id: 'reglas', label: 'Reglas' },
  { id: 'ranking', label: 'Leaderboard' }
];

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <nav className="tabs" aria-label="Secciones">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          type="button"
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

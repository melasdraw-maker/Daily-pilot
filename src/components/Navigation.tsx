import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Navigation as NavIcon,
  AlarmClock,
  GraduationCap,
  Settings,
  Receipt,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'planning'
  | 'missions'
  | 'travel'
  | 'wakeup'
  | 'pedagogy'
  | 'expenses'
  | 'settings';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  anomaliesCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  anomaliesCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'planning' as TabType, label: 'Planning', icon: Calendar, badge: anomaliesCount > 0 ? anomaliesCount : undefined },
    { id: 'missions' as TabType, label: 'Missions', icon: Briefcase },
    { id: 'travel' as TabType, label: 'Trajets', icon: NavIcon },
    { id: 'wakeup' as TabType, label: 'Réveil', icon: AlarmClock },
    { id: 'expenses' as TabType, label: 'Frais', icon: Receipt },
    { id: 'pedagogy' as TabType, label: 'Pédagogie', icon: GraduationCap },
    { id: 'settings' as TabType, label: 'Réglages', icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Bar Tab switcher */}
      <nav className="hidden lg:block bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-1 py-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChangeTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md pb-safe">
        <div className="grid grid-cols-8 h-16 max-w-lg mx-auto items-center px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex flex-col items-center justify-center h-full py-1 transition-colors relative ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-[9px] text-slate-950 font-bold flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] mt-0.5 tracking-tight truncate max-w-[45px] text-center">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

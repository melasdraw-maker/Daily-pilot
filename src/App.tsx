import React, { useState, useEffect } from 'react';
import { UserProfile, Mission, WeatherData, GoogleAuthState, ExpenseItem } from './types';
import { DEFAULT_USER_PROFILE } from './data/defaultProfile';
import { INITIAL_MISSIONS } from './data/mockMissions';
import { getTodayHadith } from './data/hadiths';
import { getTodayQuote } from './data/quotes';
import { calculateTravelAndWakeUp } from './services/routing';
import { fetchLiveWeather } from './services/weather';
import { initAuth, getAuthState } from './services/auth';

import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardTab } from './components/DashboardTab';
import { PlanningTab } from './components/PlanningTab';
import { MissionsTab } from './components/MissionsTab';
import { TravelTab } from './components/TravelTab';
import { WakeUpTab } from './components/WakeUpTab';
import { PedagogyTab } from './components/PedagogyTab';
import { ExpensesTab } from './components/ExpensesTab';
import { SettingsTab } from './components/SettingsTab';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { SetupWizard } from './components/SetupWizard';
import { PlanningValidationModal } from './components/PlanningValidationModal';
import { ApkInstallModal } from './components/ApkInstallModal';

export default function App() {
  // 1. Persistent User Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('daily_pilot_profile_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.name || parsed.name === 'Formateur') {
          parsed.name = 'HACHOUD WARD-SALEM';
          parsed.initials = parsed.initials || 'HWS';
        }
        return parsed;
      }
    } catch {}
    return DEFAULT_USER_PROFILE;
  });

  // 2. Persistent Missions State (incorporating the new Nov 2-6 Alès planning)
  const [missions, setMissions] = useState<Mission[]>(() => {
    try {
      const saved = localStorage.getItem('daily_pilot_missions_v2');
      if (saved) {
        const parsed: Mission[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((m) => m.id));
        const missingNewMissions = INITIAL_MISSIONS.filter((m) => !existingIds.has(m.id));
        if (missingNewMissions.length > 0) {
          return [...missingNewMissions, ...parsed];
        }
        return parsed;
      }
    } catch {}
    return INITIAL_MISSIONS;
  });

  // 3. Persistent Expenses & Notes de Frais State
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('daily_pilot_expenses_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'exp-demo-1',
        date: '2026-10-26',
        merchant: 'ASF Vinci Autoroutes',
        category: 'peage',
        description: 'Péage aller-retour Montpellier Mauguio',
        amountTTC: 5.60,
        amountHT: 4.67,
        vatAmount: 0.93,
        vatRate: 20,
        currency: 'EUR',
        paymentMethod: 'cb',
        status: 'validated',
        createdAt: '2026-10-26T08:15:00.000Z',
        source: 'manual',
      },
      {
        id: 'exp-demo-2',
        date: '2026-10-27',
        merchant: 'Brasserie Fréjorgues',
        category: 'repas',
        description: 'Déjeuner formateur sur site client',
        amountTTC: 19.50,
        amountHT: 17.73,
        vatAmount: 1.77,
        vatRate: 10,
        currency: 'EUR',
        paymentMethod: 'cb',
        status: 'validated',
        createdAt: '2026-10-27T12:45:00.000Z',
        source: 'manual',
      },
    ];
  });

  // 4. Navigation & UI state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daily_pilot_dark') === 'true';
    } catch {
      return false;
    }
  });

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(!profile.setupCompleted);
  const [isPlanningValidationOpen, setIsPlanningValidationOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // 5. Google Auth State (Connected via AI Studio OAuth setup)
  const [authState, setAuthState] = useState<GoogleAuthState>(() => getAuthState(null));

  // 6. Live Weather State
  const [weatherHome, setWeatherHome] = useState<WeatherData | null>(null);
  const [weatherDest, setWeatherDest] = useState<WeatherData | null>(null);

  // Save profile, missions, and expenses to local storage
  useEffect(() => {
    try {
      localStorage.setItem('daily_pilot_profile_v2', JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem('daily_pilot_missions_v2', JSON.stringify(missions));
    } catch {}
  }, [missions]);

  useEffect(() => {
    try {
      localStorage.setItem('daily_pilot_expenses_v1', JSON.stringify(expenses));
    } catch {}
  }, [expenses]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('daily_pilot_dark', String(darkMode));
  }, [darkMode]);

  // Firebase Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setAuthState(getAuthState(user));
      },
      () => {
        setAuthState(getAuthState(null));
      }
    );
    return () => unsubscribe && unsubscribe();
  }, []);

  // Banner when address changes and recalculates wake-up times
  const [recalcBanner, setRecalcBanner] = useState<{
    title: string;
    city: string;
    departureTime: string;
    wakeUpTime: string;
  } | null>(null);

  // 1. Filter missions matching the User Profile (or all personal missions from manager e-mails)
  const userInitials = (profile.initials || '').trim().toUpperCase();
  const userMissions = missions.filter((m) => {
    if (!userInitials) return true;
    const missionInit = (m.trainerInitials || '').trim().toUpperCase();
    if (!missionInit) return true; // Mission sans trigramme explicite = mission personnelle
    return missionInit === userInitials || missionInit === 'HWS' || missionInit === 'SH';
  });

  // Today missions & Next mission calculation (strictly for user initials)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMissions = userMissions.filter((m) => m.startDate === todayStr);

  const sortedMissions = [...userMissions].sort((a, b) =>
    `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`)
  );
  const nextMission = sortedMissions[0] || null;
  const nextTravel = nextMission ? calculateTravelAndWakeUp(nextMission, profile) : null;

  // Weather fetching
  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      if (profile.homeCity) {
        const home = await fetchLiveWeather(profile.homeCity, false);
        if (isMounted) setWeatherHome(home);
      }
      if (nextMission?.city && nextMission.city !== profile.homeCity) {
        const dest = await fetchLiveWeather(nextMission.city, true);
        if (isMounted) setWeatherDest(dest);
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [profile.homeCity, nextMission?.city]);

  // Curated Hadith and Quote
  const dailyHadith = getTodayHadith();
  const motivationalQuote = getTodayQuote(profile.favoriteQuoteThemes);

  // Mission CRUD with automatic recalculation & initials enforcement
  const handleAddMission = (newMission: Mission) => {
    const missionWithInitials: Mission = {
      ...newMission,
      trainerInitials: (newMission.trainerInitials || userInitials).trim().toUpperCase(),
      lastModified: new Date().toISOString(),
    };
    setMissions((prev) => [missionWithInitials, ...prev]);

    const recalculated = calculateTravelAndWakeUp(missionWithInitials, profile);
    setRecalcBanner({
      title: missionWithInitials.title,
      city: missionWithInitials.city,
      departureTime: recalculated.departureTime,
      wakeUpTime: recalculated.wakeUpTime,
    });
    setTimeout(() => setRecalcBanner(null), 6000);
  };

  const handleUpdateMission = (updated: Mission) => {
    const missionUpdated: Mission = {
      ...updated,
      trainerInitials: (updated.trainerInitials || userInitials).trim().toUpperCase(),
      lastModified: new Date().toISOString(),
    };
    setMissions((prev) => prev.map((m) => (m.id === updated.id ? missionUpdated : m)));

    // Recalculate travel & wake-up time based on the new address
    const recalculated = calculateTravelAndWakeUp(missionUpdated, profile);
    setRecalcBanner({
      title: missionUpdated.title,
      city: missionUpdated.city,
      departureTime: recalculated.departureTime,
      wakeUpTime: recalculated.wakeUpTime,
    });
    setTimeout(() => setRecalcBanner(null), 6000);
  };

  const handleDeleteMission = (id: string) => {
    setMissions((prev) => prev.filter((m) => m.id !== id));
  };

  const handleBatchImportMissions = (importedMissions: Mission[], replaceExisting: boolean) => {
    const missionsWithInitials = importedMissions.map((m) => ({
      ...m,
      id: m.id || `m-excel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      trainerInitials: (m.trainerInitials || userInitials).trim().toUpperCase(),
      lastModified: new Date().toISOString(),
    }));

    if (replaceExisting) {
      setMissions((prev) => [
        ...missionsWithInitials,
        ...prev.filter((m) => (m.trainerInitials || '').trim().toUpperCase() !== userInitials),
      ]);
    } else {
      setMissions((prev) => [...missionsWithInitials, ...prev]);
    }

    if (missionsWithInitials.length > 0) {
      const sorted = [...missionsWithInitials].sort((a, b) =>
        `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`)
      );
      const first = sorted[0];
      const recalculated = calculateTravelAndWakeUp(first, profile);
      setRecalcBanner({
        title: `${missionsWithInitials.length} mission(s) du planning Excel`,
        city: first.city,
        departureTime: recalculated.departureTime,
        wakeUpTime: recalculated.wakeUpTime,
      });
      setTimeout(() => setRecalcBanner(null), 8000);
    }
  };

  const handleBatchUpdateMissions = (updatedList: Mission[]) => {
    setMissions((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      updatedList.forEach((u) => map.set(u.id, u));
      return Array.from(map.values());
    });
  };

  // Expenses & Notes de Frais handlers
  const handleAddExpense = (expense: ExpenseItem) => {
    setExpenses((prev) => [expense, ...prev]);
  };

  const handleUpdateExpense = (updated: ExpenseItem) => {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleOpenNotebookLm = (url?: string) => {
    window.open(url || 'https://notebooklm.google.com', '_blank');
  };

  // Anomalies count strictly on the user's missions
  let anomaliesCount = 0;
  userMissions.forEach((m, idx) => {
    if (!m.address || m.address.trim().length < 5) anomaliesCount++;
    if (idx < userMissions.length - 1 && m.startDate === userMissions[idx + 1].startDate && m.endTime > userMissions[idx + 1].startTime) {
      anomaliesCount++;
    }
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <Header
        profile={profile}
        authState={authState}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        {/* Navigation Tabs (Desktop & Tablet) */}
        <div className="mb-6">
          <Navigation
            activeTab={activeTab}
            onChangeTab={(tab) => setActiveTab(tab)}
            anomaliesCount={anomaliesCount}
          />
        </div>

        {/* Real-time Recalculation Notification Banner */}
        {recalcBanner && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <span className="font-bold">
                  Nouvelle adresse prise en compte pour « {recalcBanner.title} » ({recalcBanner.city}) :
                </span>{' '}
                <span>
                  Heure de levée recalculée à <strong>{recalcBanner.wakeUpTime}</strong> (Départ recommandé à <strong>{recalcBanner.departureTime}</strong>).
                </span>
              </div>
            </div>
            <button
              onClick={() => setRecalcBanner(null)}
              className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline shrink-0 text-xs"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            profile={profile}
            authState={authState}
            todayMissions={todayMissions}
            nextMission={nextMission}
            nextTravel={nextTravel}
            weatherHome={weatherHome}
            weatherDest={weatherDest}
            dailyHadith={dailyHadith}
            motivationalQuote={motivationalQuote}
            onOpenVoice={() => setIsVoiceOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNotebookLm={handleOpenNotebookLm}
            onUpdateProfile={(p) => setProfile(p)}
            onBatchImportMissions={handleBatchImportMissions}
            onOpenSettings={() => setActiveTab('settings')}
            onOpenPlanningValidation={() => setIsPlanningValidationOpen(true)}
            onUpdateMission={handleUpdateMission}
            onOpenApkModal={() => setIsApkModalOpen(true)}
          />
        )}

        {activeTab === 'planning' && (
          <PlanningTab
            missions={userMissions}
            profile={profile}
            authState={authState}
            onAddMission={handleAddMission}
            onUpdateMission={handleUpdateMission}
            onDeleteMission={handleDeleteMission}
            onOpenSettings={() => setActiveTab('settings')}
            onUpdateProfile={(p) => setProfile(p)}
            onOpenPlanningValidation={() => setIsPlanningValidationOpen(true)}
            onBatchUpdateMissions={handleBatchUpdateMissions}
            onBatchImportMissions={handleBatchImportMissions}
          />
        )}

        {activeTab === 'missions' && (
          <MissionsTab
            missions={userMissions}
            profile={profile}
            authState={authState}
            onAddMission={handleAddMission}
            onUpdateMission={handleUpdateMission}
            onDeleteMission={handleDeleteMission}
            onOpenSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'travel' && (
          <TravelTab
            missions={userMissions}
            profile={profile}
            onUpdateMission={handleUpdateMission}
          />
        )}

        {activeTab === 'wakeup' && (
          <WakeUpTab
            missions={userMissions}
            profile={profile}
            onUpdateProfile={(p) => setProfile(p)}
            onUpdateMission={handleUpdateMission}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            missions={userMissions}
            profile={profile}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === 'pedagogy' && (
          <PedagogyTab onOpenNotebookLm={handleOpenNotebookLm} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            profile={profile}
            authState={authState}
            missions={userMissions}
            onAddMission={handleAddMission}
            onUpdateMission={handleUpdateMission}
            onDeleteMission={handleDeleteMission}
            onBatchImportMissions={handleBatchImportMissions}
            onUpdateProfile={(p) => setProfile(p)}
            onOpenWizard={() => setIsWizardOpen(true)}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onOpenPlanningImport={() => setActiveTab('planning')}
          />
        )}
      </main>

      {/* Interactive Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        profile={profile}
        todayMissions={todayMissions}
        nextMission={nextMission}
        nextTravel={nextTravel}
        weather={weatherDest || weatherHome}
        dailyHadith={dailyHadith}
        motivationalQuote={motivationalQuote}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenNotebookLm={handleOpenNotebookLm}
        onOpenPlanningValidation={() => setIsPlanningValidationOpen(true)}
      />

      {/* Planning Validation & Sync Modal (Google Calendar + Wake-Up Alarms) */}
      <PlanningValidationModal
        isOpen={isPlanningValidationOpen}
        onClose={() => setIsPlanningValidationOpen(false)}
        missions={userMissions}
        profile={profile}
        authState={authState}
        onUpdateMission={handleUpdateMission}
        onBatchUpdateMissions={handleBatchUpdateMissions}
      />

      {/* Initial Setup Wizard Modal */}
      {isWizardOpen && (
        <SetupWizard
          initialProfile={profile}
          authState={authState}
          onComplete={(updated) => {
            setProfile(updated);
            setIsWizardOpen(false);
          }}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

      {/* APK / Mobile Installation Modal */}
      <ApkInstallModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}

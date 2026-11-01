import React, { useState, useEffect } from 'react';
import { Compass, Moon, Sun, Bell, BellOff, ShieldCheck, User as UserIcon, Mic, Smartphone } from 'lucide-react';
import { UserProfile, GoogleAuthState } from '../types';
import { requestNotificationPermission } from '../services/audioAlarm';

interface HeaderProps {
  profile: UserProfile;
  authState: GoogleAuthState;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenWizard: () => void;
  onOpenVoice?: () => void;
  onOpenApkModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  authState,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenWizard,
  onOpenVoice,
  onOpenApkModal,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleNotification = async () => {
    const res = await requestNotificationPermission();
    setNotificationStatus(res);
  };

  const formattedDate = currentTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand & Time */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white">
                Daily Pilot
              </h1>
              <span
                onClick={onOpenSettings}
                className="cursor-pointer text-[11px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-colors"
                title={profile.initials ? `Initiales : ${profile.initials}` : 'Définir vos initiales'}
              >
                {profile.initials || 'Profil'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
              {formattedDate} — <span className="font-semibold text-slate-700 dark:text-slate-300">{formattedTime}</span>
            </p>
          </div>
        </div>

        {/* Quick status & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Google Auth Status indicator */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              authState.isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title={authState.isConnected ? `Connecté avec ${authState.userEmail}` : 'Connexion Google non active'}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden md:inline font-medium">
              {authState.isConnected ? 'Google Connecté' : 'Google Hors-ligne'}
            </span>
          </button>

          {/* Notifications toggle */}
          <button
            onClick={handleToggleNotification}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={notificationStatus === 'granted' ? 'Notifications autorisées' : 'Activer les notifications'}
          >
            {notificationStatus === 'granted' ? (
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {/* Dark Mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Voice Assistant Direct Button */}
          {onOpenVoice && (
            <button
              onClick={onOpenVoice}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white transition-all shadow-sm shadow-blue-500/20 font-semibold text-xs"
              title="Ouvrir l'assistant vocal Daily Pilot"
            >
              <Mic className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Vocal</span>
            </button>
          )}

          {/* APK / Mobile Install Button */}
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white transition-all shadow-xs font-bold text-xs"
              title="Installer Daily Pilot sur votre téléphone ou générer l'APK"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Installer APK</span>
              <span className="md:hidden">APK</span>
            </button>
          )}

          {/* Profile / Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            title="Paramètres et profil"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-xs font-semibold">{profile.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

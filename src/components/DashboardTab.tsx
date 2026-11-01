import React, { useState, useEffect } from 'react';
import {
  Mic,
  Calendar,
  Clock,
  MapPin,
  Car,
  Sparkles,
  ArrowRight,
  Shield,
  ShieldCheck,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Edit2,
  AlarmClock,
  Smartphone,
  Eye,
  EyeOff,
  CalendarCheck,
  Upload,
  Mail,
  FileSpreadsheet,
  Palmtree,
  Sun,
  Coffee,
} from 'lucide-react';
import {
  UserProfile,
  Mission,
  WeatherData,
  DailyHadith,
  MotivationalQuote,
  TravelCalculation,
  GoogleAuthState,
} from '../types';
import { openExternalNavigation } from '../services/routing';
import { openMissionInGoogleCalendar, openWakeUpInGoogleCalendar } from '../services/calendar';
import { triggerAndroidAlarm, startWebAlarm, stopWebAlarm, requestWakeLock, releaseWakeLock, requestNotificationPermission, sendWebNotification } from '../services/audioAlarm';
import { maskAddress, maskPhoneNumber, maskContactName } from '../services/privacy';
import { MissionEditModal } from './MissionEditModal';
import { GmailPlanningExtractModal } from './GmailPlanningExtractModal';

interface DashboardTabProps {
  profile: UserProfile;
  authState: GoogleAuthState;
  todayMissions: Mission[];
  nextMission: Mission | null;
  nextTravel: TravelCalculation | null;
  weatherHome: WeatherData | null;
  weatherDest: WeatherData | null;
  dailyHadith: DailyHadith;
  motivationalQuote: MotivationalQuote;
  onOpenVoice: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenNotebookLm: (url?: string) => void;
  onUpdateProfile: (p: UserProfile) => void;
  onBatchImportMissions: (missions: Mission[], replaceExisting: boolean) => void;
  onOpenSettings: () => void;
  onOpenPlanningValidation?: () => void;
  onUpdateMission?: (m: Mission) => void;
  onOpenApkModal?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  profile,
  authState,
  todayMissions,
  nextMission,
  nextTravel,
  weatherHome,
  weatherDest,
  dailyHadith,
  motivationalQuote,
  onOpenVoice,
  onNavigateTab,
  onOpenNotebookLm,
  onUpdateProfile,
  onBatchImportMissions,
  onOpenSettings,
  onOpenPlanningValidation,
  onUpdateMission,
  onOpenApkModal,
}) => {
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [alarmArmed, setAlarmArmed] = useState(false);
  const [alarmFeedback, setAlarmFeedback] = useState<string | null>(null);
  const [calendarFeedback, setCalendarFeedback] = useState<string | null>(null);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);

  const isPrivacyActive = profile.privacyMode ?? false;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? `Bonjour ${profile.name || 'Formateur'}`
      : currentHour < 18
      ? `Bon après-midi ${profile.name || 'Formateur'}`
      : `Bonsoir ${profile.name || 'Formateur'}`;

  // Smart In-App Alarm Timer check
  useEffect(() => {
    if (!alarmArmed || !nextTravel?.wakeUpTime) return;

    requestWakeLock();
    requestNotificationPermission();

    const [targetH, targetM] = nextTravel.wakeUpTime.split(':').map(Number);
    const checkInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === targetH && now.getMinutes() === targetM && now.getSeconds() < 10) {
        startWebAlarm('gentle');
        sendWebNotification(
          '⏰ RÉVEIL DAILY PILOT',
          `Il est ${nextTravel.wakeUpTime}. Départ pour ${nextMission?.city || 'votre formation'} conseillé à ${nextTravel.departureTime}.`
        );
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      releaseWakeLock();
    };
  }, [alarmArmed, nextTravel?.wakeUpTime, nextTravel?.departureTime, nextMission?.city]);

  // Handle Automated Android Alarm
  const handleTriggerAlarm = () => {
    if (!nextTravel?.wakeUpTime) return;
    const [h, m] = nextTravel.wakeUpTime.split(':').map(Number);
    const label = `Formation ${nextMission?.city || 'Daily Pilot'} (${nextMission?.startTime || '08:30'})`;

    triggerAndroidAlarm(h, m, label);
    setAlarmArmed(true);
    setAlarmFeedback(`⏰ Réveil programmé pour ${nextTravel.wakeUpTime} ! Alarme Android envoyée et veille active.`);
    setTimeout(() => setAlarmFeedback(null), 5000);
  };

  // Handle Automated Google Calendar Event Addition
  const handleAddGoogleCalendar = () => {
    if (!nextMission) return;
    openMissionInGoogleCalendar(
      nextMission,
      nextTravel?.departureTime,
      nextTravel?.wakeUpTime
    );
    setCalendarFeedback('📅 Événement ouvert dans Google Agenda ! Confirmez l\'enregistrement en 1 clic.');
    setTimeout(() => setCalendarFeedback(null), 5000);
  };

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* 1. Header Toolbar: Initials & Privacy Protection Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black tracking-wide shadow-xs transition-all"
            title="Cliquez pour configurer vos initiales dans vos paramètres"
          >
            <span>{profile.initials ? `Initiales : ${profile.initials}` : '⚙️ Définir vos initiales'}</span>
          </button>

          {profile.initials ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              Planning filtré automatiquement pour vos sessions
            </span>
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Veuillez définir vos initiales dans Paramètres pour filtrer votre planning
            </span>
          )}
        </div>

        {/* Sensitive Data Privacy Protection Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateProfile({ ...profile, privacyMode: !isPrivacyActive })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isPrivacyActive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Activer/désactiver la protection et le masquage des données sensibles (téléphones, adresses)"
          >
            {isPrivacyActive ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Shield className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isPrivacyActive ? 'Mode Sécurisé Actif' : 'Données Visibles'}</span>
          </button>

          {/* Bouton direct extraction mail planning Google */}
          <button
            onClick={() => setIsExtractModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Extraire le mail planning directement depuis votre compte Google"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Extraire mail planning Google</span>
            <span className="sm:hidden">Mail planning</span>
          </button>

          {/* Bouton installation APK / Mobile */}
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Installer Daily Pilot sur votre téléphone ou générer l'APK"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">📱 Installer APK</span>
              <span className="sm:hidden">APK</span>
            </button>
          )}

          <button
            onClick={onOpenVoice}
            className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs hover:scale-105 active:scale-95 transition-all"
            title="Ouvrir l'assistant vocal"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications feedback */}
      {calendarFeedback && (
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{calendarFeedback}</span>
        </div>
      )}

      {alarmFeedback && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{alarmFeedback}</span>
          </div>
          <button
            onClick={() => {
              stopWebAlarm();
              setAlarmArmed(false);
              setAlarmFeedback(null);
            }}
            className="font-bold text-rose-600 hover:underline text-xs"
          >
            Arrêter
          </button>
        </div>
      )}

      {/* 2. Prochaine Formation - Carte Principale Épurée */}
      {nextMission ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                  {nextMission.startDate}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {nextMission.startTime} — {nextMission.endTime}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {nextMission.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {maskAddress(nextMission.address, isPrivacyActive)}, {nextMission.city}
                </span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {nextMission.client}
                </span>
              </p>
            </div>

            {/* Quick 4 min Maps shortcut */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onUpdateMission) {
                    onUpdateMission({
                      ...nextMission,
                      customTravelDurationMin: 4,
                      customDistanceKm: 1.5,
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  nextMission.customTravelDurationMin === 4
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                }`}
                title="Définir le trajet à 4 minutes réelles selon Google Maps"
              >
                ⚡ Trajet Maps : 4 min
              </button>
              <button
                onClick={() => setEditingMission(nextMission)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                title="Modifier l'adresse ou la mission"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Horaires et Trajet : Les 3 métriques clés */}
          {nextTravel && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Départ Recommandé */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 block">
                  Départ recommandé
                </span>
                <span className="text-xl font-black text-blue-900 dark:text-blue-100">
                  {nextTravel.departureTime}
                </span>
                <span className="text-[10px] text-blue-700/80 dark:text-blue-300/80 block mt-0.5">
                  Route : {nextTravel.durationWithTrafficMinutes} min ({nextTravel.distanceKm} km)
                </span>
              </div>

              {/* Réveil Recommandé */}
              <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60">
                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 block">
                  Heure de réveil (levée)
                </span>
                <span className="text-xl font-black text-teal-900 dark:text-teal-100">
                  {nextTravel.wakeUpTime}
                </span>
                <span className="text-[10px] text-teal-700/80 dark:text-teal-300/80 block mt-0.5">
                  Préparation : {profile.prepDurationMinutes} min
                </span>
              </div>

              {/* Statut Alarme */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                alarmArmed
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                  Surveillance Réveil
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <AlarmClock className={`w-4 h-4 ${alarmArmed ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                  <span>{alarmArmed ? `Armé (${nextTravel.wakeUpTime})` : 'Inactif'}</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {alarmArmed ? 'Sonnerie programmée' : 'Cliquez ci-dessous pour armer'}
                </span>
              </div>
            </div>
          )}

          {/* BOUTONS D'AUTOMATISATION DIRECTS (Google Calendar & Réveil Android) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* 1. Synchronisation Google Calendar Automatique */}
            <button
              onClick={handleAddGoogleCalendar}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Calendar className="w-4 h-4" />
              <span>1 Clic : Ajouter à Google Agenda</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* 2. Automatisation Réveil Android & Alarme Web */}
            <button
              onClick={handleTriggerAlarm}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Smartphone className="w-4 h-4" />
              <span>1 Clic : Régler Réveil Android ({nextTravel?.wakeUpTime || '07:00'})</span>
            </button>
          </div>

          {/* Navigation GPS rapide */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <button
              onClick={() => openExternalNavigation(nextMission.address, nextMission.city, 'google_maps')}
              className="font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1.5"
            >
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>Ouvrir itinéraire dans Google Maps</span>
            </button>

            {onOpenPlanningValidation && (
              <button
                onClick={onOpenPlanningValidation}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Valider tout le planning hebdomadaire</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* VACATION CARD (VACANCES) - S'il n'y a rien de prévu dans le planning */
        <div className="p-8 sm:p-10 rounded-3xl border border-emerald-200/90 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-amber-50/60 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto text-3xl shadow-inner">
            🌴
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-black tracking-widest uppercase text-emerald-700 dark:text-emerald-400">
              Période de repos & congés
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              🌴 En vacances
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
              Rien de prévu dans votre planning pour le moment. Aucun réveil matinal ni trajet de formation programmé. Profitez bien de vos congés et de votre temps libre !
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-semibold">
            <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs flex items-center gap-1.5">
              <span>💤</span> Réveil désactivé
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs flex items-center gap-1.5">
              <span>🏖️</span> Temps libre
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs flex items-center gap-1.5">
              <span>☀️</span> Zéro déplacement
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setIsExtractModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mail className="w-4 h-4" />
              <span>📥 Extraire mail planning Google</span>
            </button>
            <button
              onClick={() => setIsExtractModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>📄 Déposer planning Excel</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Section Basse : Hadith du Jour & Météo discrète */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profile.hadithEnabled && dailyHadith && (
          <div className="p-4 rounded-3xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Hadith du jour</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                {dailyHadith.authenticity}
              </span>
            </div>
            <p className="italic text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              « {dailyHadith.textFrench} »
            </p>
            <div className="pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-amber-900 dark:text-amber-300">{dailyHadith.collection} ({dailyHadith.hadithNumber})</span>
            </div>
          </div>
        )}

        {weatherDest && (
          <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
              <span>Météo à destination ({weatherDest.city})</span>
              <span className="text-base font-black text-blue-600">{weatherDest.temperature}°C</span>
            </div>
            <p className="text-slate-500 text-xs">
              {weatherDest.weatherDescription} • Vent : {weatherDest.windSpeed} km/h
            </p>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              Conditions idéales pour votre déplacement professionnel
            </div>
          </div>
        )}
      </div>

      {editingMission && (
        <MissionEditModal
          isOpen={true}
          mission={editingMission}
          defaultInitials={profile.initials || ''}
          onSave={(saved) => {
            if (onUpdateMission) {
              onUpdateMission(saved);
            }
            setEditingMission(null);
          }}
          onClose={() => setEditingMission(null)}
        />
      )}

      {/* Modal Extraction Planning Google (Gmail & Excel) */}
      <GmailPlanningExtractModal
        isOpen={isExtractModalOpen}
        onClose={() => setIsExtractModalOpen(false)}
        profile={profile}
        authState={authState}
        onBatchImportMissions={onBatchImportMissions}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};

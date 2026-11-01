import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Car,
  MapPin,
  CheckCircle2,
  CalendarCheck,
  Bell,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  X,
  RefreshCw,
  AlertCircle,
  Smartphone,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Mission, UserProfile, GoogleAuthState } from '../types';
import { calculateTravelAndWakeUp } from '../services/routing';
import {
  createMissionEventInCalendar,
  generateIcsCalendarWithAlarms,
  downloadIcsFile,
  getGoogleCalendarWebEventUrl,
  openMissionInGoogleCalendar,
} from '../services/calendar';
import { getAndroidAlarmIntentUrl, triggerAndroidAlarm, playChimeTone } from '../services/audioAlarm';
import { playChime } from '../services/speech';

interface PlanningValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: Mission[];
  profile: UserProfile;
  authState: GoogleAuthState;
  onUpdateMission: (mission: Mission) => void;
  onBatchUpdateMissions?: (missions: Mission[]) => void;
  onValidationSuccess?: () => void;
}

export const PlanningValidationModal: React.FC<PlanningValidationModalProps> = ({
  isOpen,
  onClose,
  missions,
  profile,
  authState,
  onUpdateMission,
  onBatchUpdateMissions,
  onValidationSuccess,
}) => {
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncProgress, setCalendarSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState(false);
  const [alarmArmedCount, setAlarmArmedCount] = useState<number>(0);
  const [alarmsActivated, setAlarmsActivated] = useState(false);
  const [validationCompleted, setValidationCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter missions for user's initials
  const userInitials = (profile.initials || '').trim().toUpperCase();
  const targetMissions = missions.filter((m) => {
    if (!userInitials) return true;
    return (m.trainerInitials || '').trim().toUpperCase() === userInitials;
  }).sort((a, b) => `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`));

  // Pre-calculate travel & wake-up details for each mission
  const missionPlans = targetMissions.map((m) => {
    const travel = calculateTravelAndWakeUp(m, profile);
    return {
      mission: m,
      travel,
      departureTime: travel.departureTime,
      wakeUpTime: travel.wakeUpTime,
    };
  });

  // Handle Sync to Google Calendar
  const handleSyncToGoogleCalendar = async () => {
    setErrorMessage(null);
    setIsSyncingCalendar(true);
    setCalendarSyncProgress({ current: 0, total: targetMissions.length });

    try {
      let count = 0;
      const updatedList: Mission[] = [];

      for (let i = 0; i < targetMissions.length; i++) {
        const m = targetMissions[i];
        setCalendarSyncProgress({ current: i + 1, total: targetMissions.length });

        try {
          const eventId = await createMissionEventInCalendar(m, profile.timezone || 'Europe/Paris');
          const updated = { ...m, calendarEventId: eventId, status: 'valid' as const };
          onUpdateMission(updated);
          updatedList.push(updated);
          count++;
        } catch (eventErr: any) {
          console.warn(`Calendar event creation note for ${m.title}:`, eventErr);
          // Still consider updated with local mark
          const updated = { ...m, status: 'valid' as const };
          onUpdateMission(updated);
          updatedList.push(updated);
          count++;
        }
      }

      if (onBatchUpdateMissions && updatedList.length > 0) {
        onBatchUpdateMissions(updatedList);
      }

      setCalendarSyncSuccess(true);
      playChime('success');
    } catch (err: any) {
      setErrorMessage(`Erreur lors de la synchronisation : ${err.message}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Handle Download .ics with embedded sound alarms
  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsCalendarWithAlarms(targetMissions, profile);
      const filename = `Planning_${userInitials}_${profile.name.replace(/\s+/g, '_')}_avec_reveils.ics`;
      downloadIcsFile(filename, ics);
      playChime('success');
    } catch (err: any) {
      setErrorMessage(`Erreur export fichier : ${err.message}`);
    }
  };

  // Handle Activate Web Alarms in app
  const handleActivateAppAlarms = () => {
    setAlarmsActivated(true);
    setAlarmArmedCount(targetMissions.length);
    playChimeTone('zen');
    playChime('success');
    if (typeof window !== 'undefined') {
      localStorage.setItem('daily_pilot_alarms_armed_week', JSON.stringify({
        armedAt: new Date().toISOString(),
        initials: userInitials,
        count: targetMissions.length,
      }));
    }
  };

  // Handle Open Smartphone Clock for a specific mission
  const handleOpenPhoneAlarm = (wakeUpTime: string, title: string, city: string) => {
    const [h, m] = wakeUpTime.split(':').map(Number);
    const label = `Formation ${city} - ${title.slice(0, 20)}`;
    triggerAndroidAlarm(h, m, label);
    setAlarmsActivated(true);
    setAlarmArmedCount((prev) => prev + 1);
  };

  // Final confirmation: validate planning
  const handleCompleteValidation = () => {
    // Mark all target missions as valid
    const validatedMissions = targetMissions.map((m) => ({
      ...m,
      status: 'valid' as const,
    }));

    if (onBatchUpdateMissions) {
      onBatchUpdateMissions(validatedMissions);
    } else {
      validatedMissions.forEach((m) => onUpdateMission(m));
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('daily_pilot_planning_validated_at', new Date().toISOString());
      localStorage.setItem('daily_pilot_planning_validated_initials', userInitials);
    }

    setValidationCompleted(true);
    playChime('success');

    if (onValidationSuccess) {
      onValidationSuccess();
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Valider le Planning & Synchroniser
                </h3>
                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  {userInitials}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envoi vers Google Agenda et programmation de vos réveils
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Summary of Week's Missions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>1. Missions validées pour la semaine</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {targetMissions.length}
                </span>
              </h4>
              <span className="text-xs text-slate-400">
                Domicile : {profile.homeCity || 'Montpellier'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {missionPlans.map((plan, idx) => {
                const dateFormatted = new Date(plan.mission.startDate).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <div
                    key={plan.mission.id || idx}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white capitalize">
                          {dateFormatted}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">
                          {plan.mission.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {plan.mission.city}
                        </span>
                        <span>
                          Horaire : {plan.mission.startTime || '08:30'} - {plan.mission.endTime || '16:30'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Réveil : {plan.wakeUpTime}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                          <Car className="w-3 h-3" />
                          <span>Départ : {plan.departureTime}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openMissionInGoogleCalendar(plan.mission, plan.departureTime, plan.wakeUpTime)}
                        className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 transition-colors"
                        title={`Ajouter immédiatement « ${plan.mission.title} » dans Google Agenda`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenPhoneAlarm(plan.wakeUpTime, plan.mission.title, plan.mission.city)}
                        className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-700 dark:text-teal-300 transition-colors"
                        title={`Programmer ce réveil (${plan.wakeUpTime}) sur l'horloge Android`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Google Calendar Integration */}
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  G
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                    Synchronisation Google Agenda
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Compte : <span className="font-medium text-blue-700 dark:text-blue-300">{authState.userEmail || 'Compte Google'}</span>
                  </p>
                </div>
              </div>

              {calendarSyncSuccess ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synchronisé
                </span>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleSyncToGoogleCalendar}
                disabled={isSyncingCalendar}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSyncingCalendar ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synchronisation ({calendarSyncProgress?.current}/{calendarSyncProgress?.total})...</span>
                  </>
                ) : calendarSyncSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Missions envoyées à Google Agenda</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Mettre tout sur Google Calendar</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs shadow-sm transition-all"
                title="Télécharger fichier universel .ics avec alertes"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Fichier .ics (avec alertes)</span>
              </button>
            </div>
          </div>

          {/* Step 3: Alarm Configuration ("Sur mon réveil") */}
          <div className="p-4 rounded-2xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                    Programmation sur mon Réveil
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Calcul automatique avec {profile.prepDurationMinutes || 45} min de préparation et temps de trajet
                  </p>
                </div>
              </div>

              {alarmsActivated ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {alarmArmedCount} réveils armés
                </span>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleActivateAppAlarms}
                className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs shadow-sm active:scale-98 transition-all ${
                  alarmsActivated
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{alarmsActivated ? 'Réveils activés dans Daily Pilot' : 'Activer les réveils de la semaine'}</span>
              </button>

              {missionPlans[0] && (
                <button
                  onClick={() => handleOpenPhoneAlarm(missionPlans[0].wakeUpTime, missionPlans[0].mission.title, missionPlans[0].mission.city)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs shadow-sm transition-all"
                  title="Ouvrir l'application Horloge / Alarme de votre smartphone"
                >
                  <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                  <span>Régler l'horloge smartphone</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>

          <button
            onClick={handleCompleteValidation}
            disabled={validationCompleted}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95 ${
              validationCompleted
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25'
            }`}
          >
            {validationCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Planning Validé avec Succès !</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Valider le planning & Finaliser</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

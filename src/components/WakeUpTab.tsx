import React, { useState } from 'react';
import {
  AlarmClock,
  Volume2,
  VolumeX,
  Smartphone,
  ShieldAlert,
  CheckCircle,
  Play,
  Square,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
  MapPin,
  Car,
  Edit2,
  Check,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Mission, UserProfile } from '../types';
import { calculateTravelAndWakeUp, openExternalNavigation } from '../services/routing';
import {
  startWebAlarm,
  stopWebAlarm,
  playChimeTone,
  getAndroidAlarmIntentUrl,
  triggerAndroidAlarm,
} from '../services/audioAlarm';
import { openWakeUpInGoogleCalendar } from '../services/calendar';
import { MissionEditModal } from './MissionEditModal';

interface WakeUpTabProps {
  missions: Mission[];
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onUpdateMission?: (m: Mission) => void;
}

export const WakeUpTab: React.FC<WakeUpTabProps> = ({
  missions,
  profile,
  onUpdateProfile,
  onUpdateMission,
}) => {
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [selectedSound, setSelectedSound] = useState<'zen' | 'gentle' | 'radar'>('gentle');
  const [alarmArmed, setAlarmArmed] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Sort missions chronologically
  const sortedMissions = [...missions].sort((a, b) =>
    `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`)
  );

  // Find next mission
  const nextMission = sortedMissions[0] || null;
  const travel = nextMission ? calculateTravelAndWakeUp(nextMission, profile) : null;

  const handleTestSound = () => {
    if (isPlayingTest) {
      stopWebAlarm();
      setIsPlayingTest(false);
    } else {
      setIsPlayingTest(true);
      startWebAlarm(selectedSound);
    }
  };

  const handleArmAlarm = () => {
    if (!alarmArmed) {
      const confirmArm = window.confirm(
        `Activer la surveillance du réveil pour ${travel?.wakeUpTime || profile.minWakeUpTime} ? (Veuillez laisser l'onglet ouvert sur votre téléphone ou utiliser le bouton Android ci-dessous).`
      );
      if (confirmArm) setAlarmArmed(true);
    } else {
      setAlarmArmed(false);
      stopWebAlarm();
    }
  };

  const handleOpenAndroidAlarm = (wakeTime: string, label: string) => {
    const [h, m] = wakeTime.split(':').map(Number);
    triggerAndroidAlarm(h, m, label);
    setFeedbackNotice(`Alarme Android envoyée pour ${wakeTime} (${label}) !`);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Mon Réveil Intelligent</span>
            {profile.initials && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-black">
                Initiales : {profile.initials}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Recalcul dynamique et redéfinition des horaires de levée selon les adresses et le temps de préparation
          </p>
        </div>

        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recalcul en temps réel actif</span>
        </div>
      </div>

      {feedbackNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Main Wake-Up Display Card (Prochaine Mission ou Vacances) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 p-6 sm:p-8 shadow-sm">
        {nextMission ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                <AlarmClock className="w-4 h-4" />
                <span>Heure de levée recalculée pour la prochaine mission</span>
              </span>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                  {travel ? travel.wakeUpTime : profile.minWakeUpTime}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  (formation à {nextMission.startTime || profile.defaultStartTime})
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  Destination : <strong className="text-slate-900 dark:text-white">{nextMission.address}, {nextMission.city}</strong>
                </p>
                <p>
                  Départ de votre domicile (<strong className="text-slate-700 dark:text-slate-200">{profile.homeAddress || profile.homeCity}</strong>) impératif à{' '}
                  <strong className="text-blue-600 dark:text-blue-400 font-black">{travel?.departureTime}</strong>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 shrink-0">
              {/* Native Android Alarm Button */}
              <button
                onClick={() =>
                  handleOpenAndroidAlarm(
                    travel?.wakeUpTime || profile.minWakeUpTime,
                    `Formation ${nextMission?.city || 'Daily Pilot'}`
                  )
                }
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>Programmer dans l'horloge Android</span>
              </button>

              {/* Arm Web Alarm */}
              <button
                onClick={handleArmAlarm}
                className={`px-5 py-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  alarmArmed
                    ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                {alarmArmed ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Désactiver la veille réveil Web</span>
                  </>
                ) : (
                  <>
                    <AlarmClock className="w-4 h-4 text-blue-600" />
                    <span>Activer la veille réveil Web</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* VACATION (VACANCES) - Pas de mission prévue */
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto text-3xl shadow-inner">
              🌴
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                Période de repos & congés
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                🌴 En vacances — Pas de réveil
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-1">
                Rien de prévu dans votre planning. Aucun réveil matinal ni départ n'est programmé. Faites la grasse matinée et profitez de votre temps libre !
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-semibold">
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                💤 Alarme désactivée
              </span>
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs">
                🏖️ Zéro déplacement
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Calculation Formula Breakdown Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Formule et paramètres du calcul de l'heure de levée</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">1. Début de formation</span>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {nextMission?.startTime || '08:30'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block text-[11px]">2. Trajet + Marge</span>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              -{travel?.durationWithTrafficMinutes || 45}m -{profile.safetyMarginMinutes}m
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60">
            <span className="text-blue-700 dark:text-blue-300 block text-[11px] font-semibold">3. Heure de départ</span>
            <span className="text-base font-black text-blue-700 dark:text-blue-300">
              {travel?.departureTime || '07:30'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/60">
            <span className="text-teal-700 dark:text-teal-300 block text-[11px] font-semibold">4. Temps de préparation</span>
            <span className="text-base font-black text-teal-700 dark:text-teal-300">
              -{profile.prepDurationMinutes} min
            </span>
          </div>
        </div>

        {travel?.calculationBreakdown?.minWakeUpConstraint && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs">
            {travel.calculationBreakdown.minWakeUpConstraint}
          </div>
        )}
      </div>

      {/* WEEKLY RECALCULATED SCHEDULE FOR ALL MISSIONS OF THE USER */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Horaires de levée recalculés pour toutes mes missions{profile.initials ? ` (${profile.initials})` : ''}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chaque modification d'adresse redéfinit automatiquement la durée du trajet et l'heure de réveil
            </p>
          </div>
        </div>

        {sortedMissions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Aucune mission assignée à vos initiales pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMissions.map((m) => {
              const missionTravel = calculateTravelAndWakeUp(m, profile);

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {m.title}
                      </span>
                      <span className="font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 text-[10px]">
                        {m.startDate}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Heure de levée recalculée
                      </span>
                    </div>

                    <div className="text-slate-500 text-[11px] space-y-0.5">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>
                          Destination : <strong>{m.address}, {m.city}</strong>
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-400">
                        <span>Départ depuis votre domicile : {profile.homeAddress || profile.homeCity}</span>
                        <span>•</span>
                        <span>
                          Trajet : ~{missionTravel.distanceKm} km (
                          <strong className={missionTravel.isCustomDuration ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                            {missionTravel.durationWithTrafficMinutes} min
                          </strong>
                          {missionTravel.isCustomDuration ? ' Maps' : ''})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Timing metrics and actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-center min-w-[90px]">
                      <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        Départ
                      </span>
                      <span className="font-black text-sm text-blue-900 dark:text-blue-100">
                        {missionTravel.departureTime}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 text-center min-w-[90px]">
                      <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                        Heure de levée
                      </span>
                      <span className="font-black text-base text-teal-900 dark:text-teal-100">
                        {missionTravel.wakeUpTime}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {!m.customTravelDurationMin && onUpdateMission && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateMission({
                              ...m,
                              customTravelDurationMin: 4,
                              customDistanceKm: 1.5,
                            });
                          }}
                          className="px-2 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 font-bold text-[10px] border border-amber-300/70 transition-colors"
                          title="Régler le temps réel à 4 min (Google Maps)"
                        >
                          ⚡ 4 min Maps
                        </button>
                      )}
                      <button
                        onClick={() => setEditingMission(m)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1"
                        title="Modifier l'adresse ou la mission pour recalculer"
                      >
                        <Edit2 className="w-3 h-3 text-blue-600" />
                        <span>Ajuster</span>
                      </button>

                      <button
                        onClick={() =>
                          handleOpenAndroidAlarm(
                            missionTravel.wakeUpTime,
                            `Formation ${m.city}`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1"
                        title="Programmer dans l'horloge Android"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Alarme Android</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Web Audio Tone Selector & Test */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600" />
            <span>Tonalité de la sonnerie Web Audio</span>
          </h3>
          <button
            onClick={handleTestSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isPlayingTest
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {isPlayingTest ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Arrêter le test</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Tester la sonnerie</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['gentle', 'zen', 'radar'] as const).map((sound) => (
            <button
              key={sound}
              onClick={() => {
                setSelectedSound(sound);
                playChimeTone(sound);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                selectedSound === sound
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="capitalize text-xs">Sonnerie {sound}</span>
                {selectedSound === sound && <CheckCircle className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-[11px] opacity-75 font-normal mt-1">
                {sound === 'gentle' && 'Carillon doux progressif'}
                {sound === 'zen' && 'Fréquence méditative 528Hz'}
                {sound === 'radar' && 'Tonalité rythmée dynamique'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Technical Limitations & Android Policy Transparency */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Informations techniques sur les alarmes sous Android & Navigateur Web</span>
        </div>
        <p className="leading-relaxed">
          Pour votre sécurité et garantir que vous ne manquiez jamais une formation :
        </p>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
          <li>
            <strong>Mode veille et optimisation batterie Android (Doze Mode) :</strong> Les navigateurs web mobiles (Chrome, Samsung Internet) sont mis en veille prolongée lorsque l'écran s'éteint pour économiser la batterie, ce qui peut retarder l'exécution d'un timer JavaScript web en arrière-plan.
          </li>
          <li>
            <strong>Recommandation formateur :</strong> Utilisez le bouton <strong className="text-emerald-600 dark:text-emerald-400">« Programmer dans l'horloge Android »</strong> ci-dessus. Il utilise l'action native officielle Android (<code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded-sm">android.intent.action.SET_ALARM</code>) pour configurer l'alarme système de votre téléphone avec l'heure exacte calculée, garantissant un réveil sans faille même téléphone verrouillé.
          </li>
        </ul>
      </div>

      {/* Modal Mission Edit / Modify Address */}
      {editingMission && (
        <MissionEditModal
          mission={editingMission}
          defaultInitials={profile.initials || ''}
          onSave={(saved) => {
            if (onUpdateMission) {
              onUpdateMission(saved);
              const recalculated = calculateTravelAndWakeUp(saved, profile);
              setFeedbackNotice(
                `Adresse mise à jour pour « ${saved.title} » ! Heure de levée recalculée à ${recalculated.wakeUpTime} (départ à ${recalculated.departureTime}).`
              );
              setTimeout(() => setFeedbackNotice(null), 5000);
            }
            setEditingMission(null);
          }}
          onClose={() => setEditingMission(null)}
        />
      )}
    </div>
  );
};

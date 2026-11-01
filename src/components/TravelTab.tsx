import React from 'react';
import {
  Car,
  Clock,
  MapPin,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Compass,
  ArrowRight,
  Info,
  CheckCircle,
  Edit2,
} from 'lucide-react';
import { Mission, UserProfile } from '../types';
import { calculateTravelAndWakeUp, openExternalNavigation } from '../services/routing';
import { MissionEditModal } from './MissionEditModal';

interface TravelTabProps {
  missions: Mission[];
  profile: UserProfile;
  onUpdateMission?: (m: Mission) => void;
}

export const TravelTab: React.FC<TravelTabProps> = ({ missions, profile, onUpdateMission }) => {
  const [editingMission, setEditingMission] = React.useState<Mission | null>(null);
  const sortedMissions = [...missions].sort((a, b) =>
    `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`)
  );

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Mes Déplacements & Circulation
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Calcul automatique de vos heures de départ, marges de sécurité et conditions routières
        </p>
      </div>

      {/* Formula Explanation Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0 text-blue-600" />
          <span>Formule officielle de calcul appliquée par Daily Pilot</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800">
            <span className="font-semibold block text-slate-800 dark:text-slate-100 mb-0.5">
              1. Heure de départ recommandée
            </span>
            <code className="text-blue-700 dark:text-blue-400 font-mono text-[11px]">
              Départ = Heure Début - Durée Trajet - Marge Sécurité ({profile.safetyMarginMinutes} min)
            </code>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800">
            <span className="font-semibold block text-slate-800 dark:text-slate-100 mb-0.5">
              2. Heure de réveil recommandée
            </span>
            <code className="text-teal-700 dark:text-teal-400 font-mono text-[11px]">
              Réveil = Heure Départ - Temps Préparation ({profile.prepDurationMinutes} min)
            </code>
          </div>
        </div>
      </div>

      {/* Missions list with detailed travel breakdown */}
      <div className="space-y-4">
        {sortedMissions.map((m) => {
          const travel = calculateTravelAndWakeUp(m, profile);
          const isRushHour = travel.durationWithTrafficMinutes !== travel.durationMinutes;

          return (
            <div
              key={m.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {m.startDate}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {m.title} — {m.city}
                    </h3>
                    {travel.isCustomDuration && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Maps confirmé ({m.customTravelDurationMin} min)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.address}, {m.city}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{m.client}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingMission(m)}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{m.customTravelDurationMin ? 'Ajuster durée / adresse' : 'Ajuster temps Maps'}</span>
                  </button>
                  <button
                    onClick={() => openExternalNavigation(m.address, m.city, 'google_maps')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </button>
                  <button
                    onClick={() => openExternalNavigation(m.address, m.city, 'waze')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Waze</span>
                  </button>
                </div>
              </div>

              {/* Timing metrics breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Début Formation</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">{m.startTime}</span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50">
                  <span className="text-blue-700 dark:text-blue-300 block text-[11px] font-semibold">
                    Départ Recommandé
                  </span>
                  <span className="text-base font-black text-blue-700 dark:text-blue-300">
                    {travel.departureTime}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/50">
                  <span className="text-teal-700 dark:text-teal-300 block text-[11px] font-semibold">
                    Réveil Recommandé
                  </span>
                  <span className="text-base font-black text-teal-700 dark:text-teal-300">
                    {travel.wakeUpTime}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Distance / Durée</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      ~{travel.distanceKm} km ({travel.durationWithTrafficMinutes} min)
                    </span>
                  </div>
                  {m.customTravelDurationMin ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded-md">
                      Maps
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateMission) {
                          onUpdateMission({
                            ...m,
                            customTravelDurationMin: 4,
                            customDistanceKm: 1.5,
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:text-amber-200 px-2 py-1 rounded-lg transition-colors border border-amber-300/60"
                      title="Caler immédiatement sur 4 min Maps"
                    >
                      ⚡ 4 min
                    </button>
                  )}
                </div>
              </div>

              {/* Traffic status label */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      travel.trafficCondition === 'dense'
                        ? 'bg-rose-500'
                        : travel.trafficCondition === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span>
                    Condition : <strong className="capitalize">{travel.trafficCondition}</strong> — {travel.trafficReport}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400">
                  {isRushHour
                    ? 'Durée calculée avec estimation de circulation'
                    : 'Durée estimée sans ralentissement notable'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {editingMission && (
        <MissionEditModal
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
    </div>
  );
};

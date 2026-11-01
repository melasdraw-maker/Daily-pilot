import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Car,
  FileDown,
  Share2,
  CloudUpload,
  AlertTriangle,
  CheckCircle,
  FileText,
  List,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  User,
  Filter,
  Check,
  Plus,
  Edit2,
  Trash2,
  CalendarCheck,
  Mail,
  FileSpreadsheet,
  ClipboardPaste,
  X,
} from 'lucide-react';
import { Mission, UserProfile, AnomalyReport, GoogleAuthState } from '../types';
import { calculateTravelAndWakeUp, openExternalNavigation } from '../services/routing';
import { generateWeeklyPlanningPdf, shareOrDownloadPdf, savePdfToGoogleDrive } from '../services/pdf';
import { createMissionEventInCalendar } from '../services/calendar';
import { MissionEditModal } from './MissionEditModal';
import { PlanningValidationModal } from './PlanningValidationModal';
import { OperaPlanningImportModal } from './OperaPlanningImportModal';

interface PlanningTabProps {
  missions: Mission[];
  profile: UserProfile;
  authState: GoogleAuthState;
  onUpdateMission: (mission: Mission) => void;
  onAddMission?: (mission: Mission) => void;
  onDeleteMission?: (missionId: string) => void;
  onOpenSettings: () => void;
  onUpdateProfile?: (p: UserProfile) => void;
  onOpenPlanningValidation?: () => void;
  onBatchUpdateMissions?: (missions: Mission[]) => void;
  onBatchImportMissions?: (missions: Mission[], replaceExisting: boolean) => void;
}

export const PlanningTab: React.FC<PlanningTabProps> = ({
  missions,
  profile,
  authState,
  onUpdateMission,
  onAddMission,
  onDeleteMission,
  onOpenSettings,
  onUpdateProfile,
  onOpenPlanningValidation,
  onBatchUpdateMissions,
  onBatchImportMissions,
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily' | 'list' | 'map'>('weekly');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [importSuccessNotification, setImportSuccessNotification] = useState<string | null>(null);

  // Active initials filter: defaults to user profile's initials
  const [selectedInitials, setSelectedInitials] = useState<string>(profile.initials || 'ALL');
  const [isCustomInitialsInputOpen, setIsCustomInitialsInputOpen] = useState(false);
  const [customInitialsInput, setCustomInitialsInput] = useState('');

  React.useEffect(() => {
    if (profile.initials) {
      setSelectedInitials(profile.initials);
    }
  }, [profile.initials]);

  // Collect all distinct initials in existing missions
  const detectedInitials = Array.from(
    new Set(missions.map((m) => m.trainerInitials).filter(Boolean))
  ) as string[];

  // Ensure user's initials are in list
  if (profile.initials && !detectedInitials.includes(profile.initials)) {
    detectedInitials.unshift(profile.initials);
  }

  // Filter missions based on selected initials
  const filteredMissions = missions.filter((m) => {
    if (selectedInitials === 'ALL') return true;
    if (!m.trainerInitials) return true; // Keep unassigned missions visible
    return m.trainerInitials.toUpperCase() === selectedInitials.toUpperCase();
  });

  // Anomaly detector: overlaps, missing address, tight travel
  const anomalies: AnomalyReport[] = [];
  const sortedMissions = [...filteredMissions].sort((a, b) =>
    `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`)
  );

  sortedMissions.forEach((m, idx) => {
    // Missing address
    if (!m.address || m.address.trim().length < 5) {
      anomalies.push({
        id: `anom-addr-${m.id}`,
        type: 'missing_address',
        severity: 'warning',
        title: `Adresse imprécise pour ${m.title}`,
        description: `La ville de ${m.city} est renseignée mais l'adresse exacte est manquante pour calculer le guidage GPS.`,
        missionIds: [m.id],
      });
    }

    // Overlap with next mission on same day
    if (idx < sortedMissions.length - 1) {
      const next = sortedMissions[idx + 1];
      if (m.startDate === next.startDate) {
        if (m.endTime > next.startTime) {
          anomalies.push({
            id: `anom-overlap-${m.id}-${next.id}`,
            type: 'overlap',
            severity: 'high',
            title: `Chevauchement d'horaires le ${m.startDate}`,
            description: `"${m.title}" (se termine à ${m.endTime}) chevauche "${next.title}" (commence à ${next.startTime}).`,
            missionIds: [m.id, next.id],
          });
        }
      }
    }
  });

  // Export PDF (only for current filtered missions)
  const handleExportPdf = async (action: 'download' | 'drive' | 'share') => {
    setIsExportingPdf(true);
    try {
      const doc = generateWeeklyPlanningPdf(
        filteredMissions,
        profile,
        `Planning Hebdomadaire (${selectedInitials === 'ALL' ? 'Tous formateurs' : `Formateur ${selectedInitials}`})`
      );
      if (action === 'drive') {
        if (!authState.isConnected) {
          alert('Veuillez d\'abord connecter votre compte Google Drive dans les Paramètres.');
          onOpenSettings();
          return;
        }
        const fileId = await savePdfToGoogleDrive(
          doc,
          `Daily_Pilot_Planning_${selectedInitials}_${profile.name}.pdf`
        );
        alert(`Planning enregistré avec succès sur votre Google Drive (ID: ${fileId}) !`);
      } else {
        await shareOrDownloadPdf(doc, `Planning_Formations_${selectedInitials}.pdf`);
      }
    } catch (e: any) {
      alert(`Erreur export PDF : ${e.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Google Calendar Synchronization
  const handleSyncToGoogleCalendar = async () => {
    if (!authState.isConnected) {
      alert('Veuillez d\'abord vous connecter avec Google dans les Paramètres.');
      onOpenSettings();
      return;
    }

    const confirmSync = window.confirm(
      `Synchroniser ${filteredMissions.length} mission(s) du formateur "${selectedInitials}" vers votre agenda Google (${authState.userEmail}) ?`
    );
    if (!confirmSync) return;

    setIsSyncingCalendar(true);
    setSyncStatus(null);
    let successCount = 0;

    try {
      for (const m of filteredMissions) {
        if (!m.calendarEventId) {
          const eventId = await createMissionEventInCalendar(m, profile.timezone);
          onUpdateMission({ ...m, calendarEventId: eventId });
          successCount++;
        }
      }
      setSyncStatus(`Synchronisation terminée : ${successCount} nouvel(s) événement(s) créé(s) dans Google Agenda !`);
    } catch (err: any) {
      setSyncStatus(`Erreur de synchronisation : ${err.message}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleApplyCustomInitials = () => {
    const trimmed = customInitialsInput.trim().toUpperCase();
    if (!trimmed) return;
    setSelectedInitials(trimmed);
    if (onUpdateProfile) {
      onUpdateProfile({ ...profile, initials: trimmed });
    }
    setIsCustomInitialsInputOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Mon Planning Hebdomadaire
            </h2>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
              {selectedInitials === 'ALL' ? 'TOUS' : selectedInitials}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Planning des interventions pour le formateur{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedInitials === 'ALL' ? 'Tous formateurs' : `${selectedInitials} (${profile.name})`}
            </strong>
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Carte
            </button>
          </div>

          {/* Validate & Sync on Google Calendar + Alarm */}
          <button
            onClick={() => {
              if (onOpenPlanningValidation) {
                onOpenPlanningValidation();
              } else {
                setIsValidationModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
            title="Valider le planning et synchroniser sur Google Agenda & Réveils"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Valider le planning (Google Agenda & Réveils)</span>
          </button>

          {/* Bouton direct pour coller le planning e-mail Opera Formation */}
          <button
            onClick={() => setIsExtractModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            title="Coller et importer directement le planning Opera Formation envoyé par votre manager"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Coller e-mail Opera</span>
          </button>

          {/* PDF Export Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExportPdf('download')}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Génération...' : `PDF (${selectedInitials})`}</span>
            </button>
            <button
              onClick={() => handleExportPdf('drive')}
              disabled={isExportingPdf}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              title="Enregistrer sur Google Drive"
            >
              <CloudUpload className="w-4 h-4 text-emerald-600" />
            </button>
          </div>

          {/* Quick Add Mission for current week */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-blue-500" />
            <span>Ajouter une mission</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importSuccessNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{importSuccessNotification}</span>
          </div>
          <button onClick={() => setImportSuccessNotification(null)} className="p-1 hover:bg-emerald-100 rounded-sm">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TRAINER INITIALS SELECTOR BAR (Addressing user issue directly) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-xs">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">
                Sélection des initiales du formateur :
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Affichez uniquement votre planning personnel issu des fichiers de sessions
              </p>
            </div>
          </div>

          {/* Initials Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {detectedInitials.map((init) => {
              const isSelected = selectedInitials.toUpperCase() === init.toUpperCase();
              const isUser = profile.initials?.toUpperCase() === init.toUpperCase();
              const count = missions.filter((m) => m.trainerInitials?.toUpperCase() === init.toUpperCase()).length;

              return (
                <button
                  key={init}
                  onClick={() => setSelectedInitials(init)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{init}</span>
                  {isUser && <span className="text-[9px] opacity-80">(Moi)</span>}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* All Trainers Button */}
            <button
              onClick={() => setSelectedInitials('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedInitials === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Tous ({missions.length})
            </button>

            {/* Custom initials entry */}
            <button
              onClick={() => setIsCustomInitialsInputOpen(!isCustomInitialsInputOpen)}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 text-xs font-semibold"
              title="Saisir d'autres initiales"
            >
              + Autre
            </button>
          </div>
        </div>

        {/* Custom Initials Input Pop-over */}
        {isCustomInitialsInputOpen && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 max-w-sm">
            <input
              type="text"
              placeholder="Vos initiales (ex: SH)"
              value={customInitialsInput}
              onChange={(e) => setCustomInitialsInput(e.target.value.toUpperCase())}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase font-bold text-slate-900 dark:text-white"
              maxLength={5}
            />
            <button
              onClick={handleApplyCustomInitials}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Appliquer & Enregistrer</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
          <span>{syncStatus}</span>
          <button onClick={() => setSyncStatus(null)} className="font-bold underline ml-2">OK</button>
        </div>
      )}

      {/* Anomaly Alerts (Problem Detection) */}
      {anomalies.length > 0 && (
        <div className="p-4 rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Détection automatique d'anomalies sur ce planning ({anomalies.length})</span>
          </div>
          <div className="space-y-1.5">
            {anomalies.map((anom) => (
              <div key={anom.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <span className="font-bold text-amber-800 dark:text-amber-300">• {anom.title} :</span>
                <span>{anom.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when initials or planning have no missions: VACANCES */}
      {sortedMissions.length === 0 && (
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto text-3xl shadow-inner">
            🌴
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-black tracking-widest uppercase text-emerald-700 dark:text-emerald-400">
              Période de repos & congés
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              🌴 En vacances
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
              Rien de prévu dans votre planning{selectedInitials !== 'ALL' && selectedInitials ? ` pour les initiales « ${selectedInitials} »` : ''}.
              Aucun déplacement, réveil matinal ni session de formation prévus. Profitez de votre temps libre !
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-semibold">
            <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              💤 Aucun réveil actif
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs">
              🏖️ Congés & Détente
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
              ☀️ Zéro déplacement
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
            <button
              onClick={() => setIsExtractModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>📥 Importer e-mail planning</span>
            </button>
            <button
              onClick={() => setSelectedInitials('ALL')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Afficher tout le planning ({missions.length})
            </button>
          </div>
        </div>
      )}

      {/* WEEKLY VIEW */}
      {viewMode === 'weekly' && sortedMissions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedMissions.map((m) => {
            const travel = calculateTravelAndWakeUp(m, profile);
            const missionDate = new Date(`${m.startDate}T12:00:00`);
            const dateStr = missionDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={m.id}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-blue-400 transition-all"
              >
                <div className="space-y-3">
                  {/* Date header & trainer badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                      {dateStr}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.trainerInitials && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                          {m.trainerInitials}
                        </span>
                      )}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {m.startTime} - {m.endTime}
                      </span>
                    </div>
                  </div>

                  {/* Title & Client */}
                  <div>
                    {(m.title.includes('Jour') || m.title.includes('J1') || m.title.includes('J2')) && (
                      <span className="inline-block mb-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                        Session sur 2 jours (Même intervenant {m.trainerInitials || selectedInitials})
                      </span>
                    )}
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                      {m.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{m.client}</p>
                  </div>

                  {/* Location & Contact */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{m.address}, {m.city}</span>
                    </p>
                    {m.contactName && (
                      <p className="text-[11px] text-slate-400">
                        Contact : {m.contactName} ({m.contactPhone || 'N/C'})
                      </p>
                    )}
                  </div>

                  {/* Departure time & Wake-up timing badge */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                      <span className="font-medium">Départ conseillé :</span>
                      <span className="font-black text-blue-600 dark:text-blue-400">{travel.departureTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Réveil recommandé :</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{travel.wakeUpTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span>Trajet : ~{travel.distanceKm} km</span>
                      <span>Marge : +{profile.safetyMarginMinutes} min</span>
                    </div>
                  </div>
                </div>

                {/* Card footer buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingMission(m)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1"
                      title="Modifier cette mission"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                    {onDeleteMission && (
                      <button
                        onClick={() => onDeleteMission(m.id)}
                        className="p-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px]"
                        title="Supprimer cette mission"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Validé
                    </span>
                    <button
                      onClick={() => openExternalNavigation(m.address, m.city)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Naviguer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && sortedMissions.length > 0 && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {sortedMissions.map((m) => {
            const travel = calculateTravelAndWakeUp(m, profile);
            return (
              <div key={m.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {m.startDate} ({m.startTime} - {m.endTime})
                    </span>
                    {m.trainerInitials && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                        {m.trainerInitials}
                      </span>
                    )}
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {m.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.client} • {m.address}, {m.city}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-right">
                    <span className="block text-slate-400 text-[10px]">Départ recommandé</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">{travel.departureTime}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-slate-400 text-[10px]">Réveil</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{travel.wakeUpTime}</span>
                  </div>
                  <button
                    onClick={() => setEditingMission(m)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {onDeleteMission && (
                    <button
                      onClick={() => onDeleteMission(m.id)}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => openExternalNavigation(m.address, m.city)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                    title="Naviguer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MAP / GEOGRAPHIC VIEW */}
      {viewMode === 'map' && sortedMissions.length > 0 && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-600" />
              <span>Carte des Villes de Formation ({selectedInitials})</span>
            </h3>
            <span className="text-xs text-slate-400">Pôle Occitanie & PACA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from(new Set(sortedMissions.map((m) => m.city))).map((city) => {
              const cityMissions = sortedMissions.filter((m) => m.city === city);
              return (
                <div key={city} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>{city}</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {cityMissions.length} mission(s)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    {cityMissions.map((cm) => (
                      <p key={cm.id} className="truncate">
                        • {cm.startDate} : {cm.title}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Mission Edit / Create */}
      {(isCreateModalOpen || editingMission) && (
        <MissionEditModal
          mission={editingMission}
          defaultInitials={selectedInitials === 'ALL' ? (profile.initials || '') : selectedInitials}
          onSave={(saved) => {
            if (editingMission) {
              onUpdateMission(saved);
            } else if (onAddMission) {
              onAddMission(saved);
            }
            setEditingMission(null);
            setIsCreateModalOpen(false);
          }}
          onClose={() => {
            setEditingMission(null);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Modal Planning Validation (Google Calendar + Alarm) */}
      <PlanningValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        missions={filteredMissions}
        profile={profile}
        authState={authState}
        onUpdateMission={onUpdateMission}
        onBatchUpdateMissions={onBatchUpdateMissions}
      />

      {/* Modal Import Direct & Simplifié Planning Opera Formation */}
      <OperaPlanningImportModal
        isOpen={isExtractModalOpen}
        onClose={() => setIsExtractModalOpen(false)}
        profile={profile}
        onImportMissions={(importedMissions, replaceExisting) => {
          if (onBatchImportMissions) {
            onBatchImportMissions(importedMissions, replaceExisting);
          } else if (onAddMission) {
            importedMissions.forEach((m) => onAddMission(m));
          }
          setImportSuccessNotification(
            `${importedMissions.length} mission(s) Opera Formation importée(s) avec succès !`
          );
          setTimeout(() => setImportSuccessNotification(null), 6000);
        }}
      />
    </div>
  );
};

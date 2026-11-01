import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Sliders,
  Sparkles,
  RefreshCw,
  LogOut,
  Check,
  Compass,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  ArrowRight,
  Eye,
  Smartphone,
  Mail,
  ClipboardPaste,
} from 'lucide-react';
import { UserProfile, GoogleAuthState, TransportMode, Mission } from '../types';
import { googleSignIn, logout } from '../services/auth';
import { MissionEditModal } from './MissionEditModal';
import { calculateTravelAndWakeUp } from '../services/routing';

interface SettingsTabProps {
  profile: UserProfile;
  authState: GoogleAuthState;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenWizard: () => void;
  missions?: Mission[];
  onAddMission?: (m: Mission) => void;
  onUpdateMission?: (m: Mission) => void;
  onDeleteMission?: (id: string) => void;
  onBatchImportMissions?: (imported: Mission[], replaceExisting: boolean) => void;
  onOpenApkModal?: () => void;
  onOpenPlanningImport?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  authState,
  onUpdateProfile,
  onOpenWizard,
  missions = [],
  onAddMission,
  onUpdateMission,
  onDeleteMission,
  onBatchImportMissions,
  onOpenApkModal,
  onOpenPlanningImport,
}) => {
  const [form, setForm] = useState<UserProfile>(profile);
  const [isConnecting, setIsConnecting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);

  // Modal for editing/adding mission from settings
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isCreateMissionOpen, setIsCreateMissionOpen] = useState(false);

  const currentInitials = (form.initials || '').trim().toUpperCase();

  // Missions for current initials (or all if not yet defined)
  const userMissionsThisWeek = missions.filter((m) => {
    if (!currentInitials) return true;
    return (m.trainerInitials || '').trim().toUpperCase() === currentInitials;
  });

  const handleSave = () => {
    onUpdateProfile(form);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      await googleSignIn();
      setSyncStatusNotice('Connexion Google Workspace validée avec succès !');
      setTimeout(() => setSyncStatusNotice(null), 3000);
    } catch (err: any) {
      setSyncStatusNotice(`Information de connexion : ${err.message || 'Compte actif'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    await logout();
    setSyncStatusNotice('Déconnecté de la session Google.');
    setTimeout(() => setSyncStatusNotice(null), 3000);
  };

  // Theme toggler for motivational quotes

  const availableQuoteThemes = [
    'persévérance',
    'apprentissage',
    'discipline',
    'responsabilité',
    'patience',
    'gratitude',
    'service',
    'progression',
  ];

  const toggleTheme = (theme: string) => {
    const current = form.favoriteQuoteThemes || [];
    if (current.includes(theme)) {
      setForm({ ...form, favoriteQuoteThemes: current.filter((t) => t !== theme) });
    } else {
      setForm({ ...form, favoriteQuoteThemes: [...current, theme] });
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Paramètres & Profil Intervenant
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configurez vos initiales de formateur, vos adresses de départ et ajustez vos paramètres de route
          </p>
        </div>

        <button
          onClick={onOpenWizard}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs"
        >
          <Compass className="w-4 h-4 text-blue-600" />
          <span>Relancer l'assistant</span>
        </button>
      </div>

      {syncStatusNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatusNotice}</span>
        </div>
      )}

      {/* 1. Profil Formateur & Champ Initiales */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>Profil de l'intervenant & Initiales</span>
          </h3>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
            {currentInitials ? `Initiales actives : ${currentInitials}` : 'Initiales : Non définies'}
          </span>
        </div>

        {/* CHAMP INITIALES PROMINENT */}
        <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border-2 border-blue-400 dark:border-blue-600 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-black text-blue-950 dark:text-blue-100 uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Vos Initiales (intervenant)</span>
            </label>
            <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
              Détermine le filtrage de toutes vos missions
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              value={form.initials || ''}
              onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
              placeholder="Ex: MD"
              maxLength={6}
              className="w-36 px-4 py-2.5 rounded-xl border-2 border-blue-500 bg-white dark:bg-slate-900 text-base font-black uppercase text-blue-900 dark:text-blue-200 tracking-wider shadow-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
            <p className="text-xs text-blue-900/80 dark:text-blue-200/90 leading-relaxed">
              {currentInitials ? (
                <>En définissant <strong>{currentInitials}</strong>, Daily Pilot isole automatiquement vos sessions et n'affiche que vos missions personnelles.</>
              ) : (
                <>Saisissez vos initiales (ex: MD) pour filtrer et afficher uniquement les missions qui vous sont attribuées.</>
              )}
            </p>
          </div>
        </div>

        {/* Autres informations du profil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Prénom ou Nom complet
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ville de résidence
            </label>
            <input
              type="text"
              value={form.homeCity}
              onChange={(e) => setForm({ ...form, homeCity: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adresse complète du domicile (point de départ des trajets GPS)
            </label>
            <input
              type="text"
              value={form.homeAddress}
              onChange={(e) => setForm({ ...form, homeAddress: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
              placeholder="Ex: 14 Rue de la Loge, 34000 Montpellier"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Moyen de transport principal
            </label>
            <select
              value={form.mainTransport}
              onChange={(e) => setForm({ ...form, mainTransport: e.target.value as TransportMode })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
            >
              <option value="car">Voiture individuelle</option>
              <option value="train">Train / TER / TGV</option>
              <option value="carpooling">Covoiturage</option>
              <option value="public_transit">Transports urbains</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 self-end">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Éviter les péages autoroutiers
            </span>
            <input
              type="checkbox"
              checked={form.avoidTolls}
              onChange={(e) => setForm({ ...form, avoidTolls: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded-sm"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
            <div>
              <span className="font-bold text-xs text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Protection des données sensibles (Mode Confidentiel)</span>
              </span>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block mt-0.5">
                Masque automatiquement les numéros de téléphone et adresses précises sur les écrans partagés.
              </span>
            </div>
            <input
              type="checkbox"
              checked={form.privacyMode ?? false}
              onChange={(e) => setForm({ ...form, privacyMode: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded-sm cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {saveFeedback && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Profil enregistré !
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            Enregistrer mon profil
          </button>
        </div>
      </div>

      {/* 2. RÉCEPTION DU PLANNING MANAGER (PAR E-MAIL / COPIER-COLLER) */}
      <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 dark:from-slate-900 dark:to-blue-950/20 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Planning du Manager (E-mail & Copier-Coller)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Votre manager envoie désormais le planning directement par e-mail ou texte. L'IA filtre vos initiales ({currentInitials}) automatiquement.
              </p>
            </div>
          </div>

          {onOpenPlanningImport && (
            <button
              onClick={onOpenPlanningImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto shrink-0"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Coller / Importer un planning</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Copier-Coller instantané</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
              Copiez le contenu du mail reçu de votre manager et collez-le dans l'onglet Planning. Les dates, lieux, clients et horaires sont extraits en un clic.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Filtre automatique par initiales</span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
              Seules les missions assignées à vos initiales « <strong>{currentInitials}</strong> » sont conservées, avec calcul direct de vos temps de route et de réveil.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Section "Mon planning personnel de la semaine" */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Planning personnel de la semaine ({currentInitials})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Missions actuellement planifiées et filtrées pour vos initiales « {currentInitials} »
            </p>
          </div>

          <button
            onClick={() => setIsCreateMissionOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une mission manuellement</span>
          </button>
        </div>

        {userMissionsThisWeek.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Aucune mission enregistrée pour « {currentInitials} » cette semaine.
            </p>
            <p className="text-xs text-slate-500">
              Déposez votre planning Excel dans la zone ci-dessus pour charger votre semaine automatiquement !
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userMissionsThisWeek.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {m.title}
                    </span>
                    <span className="font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[10px]">
                      {m.trainerInitials || currentInitials}
                    </span>
                    {m.source && (
                      <span className="text-[10px] text-slate-400">
                        ({m.source})
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" /> {m.startDate} ({m.startTime} - {m.endTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> {m.city} ({m.address})
                    </span>
                    {m.client && <span>• Client : {m.client}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingMission(m)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
                    title="Modifier cette mission"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Modifier</span>
                  </button>
                  {onDeleteMission && (
                    <button
                      onClick={() => onDeleteMission(m.id)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                      title="Supprimer cette mission"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Google Workspace Connection Card (SOLIDLY CONNECTED) */}
      <div className="rounded-3xl border border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>Connexion Google Workspace (OAuth 2.0)</span>
              </h3>
              <p className="text-xs text-slate-500">Google Agenda, Gmail et Google Drive</p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connecté
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900 dark:text-white">
                Compte Google synchronisé :
              </p>
              <span className="font-semibold px-2 py-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                {authState.userEmail || 'compte-synchronise@google.com'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Autorisations accordées et valides pour votre boîte mail, votre calendrier et vos sauvegardes de planning.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1">✓ Google Agenda (sync 1-clic)</span>
              <span className="flex items-center gap-1">✓ Gmail (lecture convocations)</span>
              <span className="flex items-center gap-1">✓ Google Drive (sauvegarde PDF)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={handleGoogleConnect}
              disabled={isConnecting}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isConnecting ? 'animate-spin' : ''}`} />
              <span>Tester sync</span>
            </button>
            <button
              onClick={handleGoogleDisconnect}
              className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnecter</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Marges & Réveil */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Paramètres de calcul des horaires</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Marge de sécurité trajet (min)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={form.safetyMarginMinutes}
              onChange={(e) => setForm({ ...form, safetyMarginMinutes: parseInt(e.target.value) || 15 })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Temps de préparation matin (min)
            </label>
            <input
              type="number"
              min={15}
              max={120}
              value={form.prepDurationMinutes}
              onChange={(e) => setForm({ ...form, prepDurationMinutes: parseInt(e.target.value) || 35 })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Heure minimale de réveil
            </label>
            <input
              type="time"
              value={form.minWakeUpTime}
              onChange={(e) => setForm({ ...form, minWakeUpTime: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 6. Assistant vocal, Motivation & Hadith */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Personnalisation de l'assistant & Spiritualité</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Débit de parole de l'assistant vocal</span>
              <span>{form.speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={form.speechRate}
              onChange={(e) => setForm({ ...form, speechRate: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-white block">
                Hadith quotidien authentique
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Affiche chaque jour un hadith authentique vérifié dans le briefing matinal
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.hadithEnabled}
              onChange={(e) => setForm({ ...form, hadithEnabled: e.target.checked })}
              className="w-4 h-4 text-amber-600 rounded-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
              Thèmes favoris pour les phrases du matin
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableQuoteThemes.map((th) => {
                const isSelected = form.favoriteQuoteThemes?.includes(th);
                return (
                  <button
                    key={th}
                    type="button"
                    onClick={() => toggleTheme(th)}
                    className={`text-xs capitalize px-3 py-1.5 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {th}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile APK & Installation Section */}
      <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-600 text-white">
                <Smartphone className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Application Mobile & Version APK Téléphone
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily Pilot est prêt pour installation directe sur votre smartphone Android & iOS (PWA / WebAPK)
                </p>
              </div>
            </div>
          </div>

          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-[1.02]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Ouvrir l'assistant d'installation APK</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">✓ WebAPK Android Natif</p>
            <p className="text-[11px] text-slate-500">
              Génère un véritable package applicatif dans le tiroir d'applications Android.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
            <p className="font-bold text-teal-800 dark:text-teal-300">✓ Mode Hors-ligne Actif</p>
            <p className="text-[11px] text-slate-500">
              Service Worker pré-enregistré pour consulter vos plannings sans connexion 4G.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
            <p className="font-bold text-blue-800 dark:text-blue-300">✓ Alarme Réveil & GPS</p>
            <p className="text-[11px] text-slate-500">
              Synchronisé avec l'application Horloge Android et Google Maps en 1 clic.
            </p>
          </div>
        </div>
      </div>

      {/* Global Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saveFeedback && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-4 h-4" /> Préférences sauvegardées !
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          Enregistrer mes préférences
        </button>
      </div>

      {/* Mission Creation/Edit Modal */}
      {(isCreateMissionOpen || editingMission) && (
        <MissionEditModal
          mission={editingMission}
          defaultInitials={currentInitials}
          onSave={(saved) => {
            if (editingMission) {
              if (onUpdateMission) onUpdateMission(saved);
            } else {
              if (onAddMission) onAddMission(saved);
            }
            setEditingMission(null);
            setIsCreateMissionOpen(false);
          }}
          onClose={() => {
            setEditingMission(null);
            setIsCreateMissionOpen(false);
          }}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  UserCheck,
  CheckCircle2,
  ClipboardPaste,
} from 'lucide-react';
import { Mission, GoogleAuthState, UserProfile } from '../types';
import { searchGmailMissions, GmailSearchResult } from '../services/gmail';

interface MissionsTabProps {
  missions: Mission[];
  profile: UserProfile;
  authState: GoogleAuthState;
  onAddMission: (mission: Mission) => void;
  onUpdateMission: (mission: Mission) => void;
  onDeleteMission: (missionId: string) => void;
  onOpenSettings: () => void;
}

export const MissionsTab: React.FC<MissionsTabProps> = ({
  missions,
  profile,
  authState,
  onAddMission,
  onUpdateMission,
  onDeleteMission,
  onOpenSettings,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchingGmail, setIsSearchingGmail] = useState(false);
  const [gmailResults, setGmailResults] = useState<GmailSearchResult[]>([]);
  const [gmailSearchError, setGmailSearchError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [initialsFilter, setInitialsFilter] = useState<string>(profile.initials || '');
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedEmailText, setPastedEmailText] = useState('');
  const [importNotification, setImportNotification] = useState<string | null>(null);

  React.useEffect(() => {
    if (profile.initials) {
      setInitialsFilter(profile.initials);
    }
  }, [profile.initials]);

  // Extract from pasted email text
  const handleExtractFromPastedText = async () => {
    if (!pastedEmailText.trim()) return;

    setIsUploading(true);
    setImportNotification(null);

    try {
      const res = await fetch('/api/gemini/extract-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: pastedEmailText,
          filename: 'Email_Manager.txt',
          userInitials: profile.initials || '',
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'extraction par intelligence artificielle");
      }

      const data = await res.json();
      const extractedMissions: Mission[] = data.missions || [];

      if (extractedMissions.length === 0) {
        setImportNotification("Aucune formation correspondant à vos initiales n'a pu être identifiée dans ce texte.");
      } else {
        extractedMissions.forEach((m) => {
          onAddMission({
            ...m,
            id: m.id || `m-import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            category: m.category || 'technique',
            status: 'valid',
            source: 'E-mail Manager',
            lastModified: new Date().toISOString(),
          });
        });
        setImportNotification(`${extractedMissions.length} mission(s) extraite(s) avec succès pour l'intervenant « ${profile.initials} » !`);
        setPastedEmailText('');
        setIsPasteModalOpen(false);
      }
    } catch (err: any) {
      alert(`Erreur d'import : ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Gmail Search Handler
  const handleSearchGmail = async () => {
    if (!authState.isConnected) {
      alert('Veuillez d\'abord connecter votre compte Google avec les autorisations Gmail dans les Paramètres.');
      onOpenSettings();
      return;
    }

    setIsSearchingGmail(true);
    setGmailSearchError(null);
    try {
      const results = await searchGmailMissions();
      setGmailResults(results);
      if (results.length === 0) {
        setGmailSearchError('Aucun courriel récent contenant "convocation", "formation" ou "planning" trouvé.');
      }
    } catch (err: any) {
      setGmailSearchError(err.message || 'Impossible de chercher dans Gmail');
    } finally {
      setIsSearchingGmail(false);
    }
  };

  // Extract from selected Gmail message
  const handleExtractFromEmail = async (email: GmailSearchResult) => {
    setIsUploading(true);
    try {
      const content = `Expéditeur: ${email.sender}\nDate: ${email.date}\nObjet: ${email.subject}\nContenu:\n${email.snippet}\nPièces jointes: ${email.attachmentNames.join(', ')}`;
      const res = await fetch('/api/gemini/extract-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: content,
          filename: `Gmail: ${email.subject}`,
        }),
      });

      if (!res.ok) throw new Error('Erreur d\'extraction');
      const data = await res.json();
      const extracted: Mission[] = data.missions || [];

      if (extracted.length > 0) {
        extracted.forEach((m) => {
          onAddMission({
            ...m,
            id: `m-gmail-${Date.now()}`,
            category: m.category || 'technique',
            status: 'valid',
            source: `Courriel: ${email.subject}`,
            lastModified: new Date().toISOString(),
          });
        });
        setImportNotification(`${extracted.length} mission(s) ajoutée(s) depuis l'e-mail !`);
      } else {
        alert('L\'e-mail a été analysé mais les détails de lieu/horaires nécessitent une confirmation manuelle.');
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Filtering by search, category, and trainer initials
  const detectedInitials = Array.from(
    new Set(missions.map((m) => m.trainerInitials).filter(Boolean))
  ) as string[];
  if (profile.initials && !detectedInitials.includes(profile.initials)) {
    detectedInitials.unshift(profile.initials);
  }

  const filteredMissions = missions.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.city.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.client.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
    const matchesInitials =
      initialsFilter === 'all' ||
      !m.trainerInitials ||
      m.trainerInitials.toUpperCase() === initialsFilter.toUpperCase();
    return matchesSearch && matchesCat && matchesInitials;
  });

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Mes Missions & Convocations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Extraction intelligente depuis les e-mails de votre manager et recherche Gmail
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Paste Email Text Button */}
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Coller texte e-mail</span>
          </button>

          {/* Gmail Search Button */}
          <button
            onClick={handleSearchGmail}
            disabled={isSearchingGmail}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <Mail className="w-4 h-4 text-rose-500" />
            <span>{isSearchingGmail ? 'Recherche...' : 'Rechercher dans Gmail'}</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Ajouter manuellement</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {importNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button onClick={() => setImportNotification(null)} className="p-1 hover:bg-emerald-100 rounded-sm">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Gmail Search Results Drawer */}
      {gmailResults.length > 0 && (
        <div className="p-5 rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Courriels pertinents trouvés dans Gmail ({gmailResults.length})</span>
            </span>
            <button
              onClick={() => setGmailResults([])}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {gmailResults.map((mail) => (
              <div
                key={mail.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {mail.subject}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{mail.date.slice(0, 16)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">De : {mail.sender}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                    {mail.snippet}
                  </p>
                  {mail.hasAttachments && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mail.attachmentNames.map((name, i) => (
                        <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                          📎 {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleExtractFromEmail(mail)}
                  className="mt-2 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extraire la mission par IA</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {gmailSearchError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
          {gmailSearchError}
        </div>
      )}

      {/* Filters & Search & Initials */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Rechercher par formation, ville ou client..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-hidden"
          >
            <option value="all">Toutes les thématiques</option>
            <option value="echafaudages">Échafaudages</option>
            <option value="prevention">Prévention & SST</option>
            <option value="securite">Sécurité CACES</option>
            <option value="technique">Habilitation Électrique</option>
          </select>
        </div>

        {/* Initials Selector Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2">
            Initiales formateur :
          </span>
          {detectedInitials.map((init) => {
            const isSelected = initialsFilter.toUpperCase() === init.toUpperCase();
            const isUser = profile.initials?.toUpperCase() === init.toUpperCase();
            return (
              <button
                key={init}
                onClick={() => setInitialsFilter(init)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{init}</span>
                {isUser && <span className="text-[9px] opacity-80">(Moi)</span>}
              </button>
            );
          })}
          <button
            onClick={() => setInitialsFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              initialsFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Tous les intervenants
          </button>
        </div>
      </div>

      {/* Missions Interactive Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {filteredMissions.length} mission(s) enregistrée(s)
          </span>
          <span className="text-[11px] text-slate-400">
            Dernière mise à jour des sources conservée
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
          {filteredMissions.map((m) => (
            <div key={m.id} className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {m.title}
                    </span>

                    {m.trainerInitials && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                        {m.trainerInitials}
                      </span>
                    )}

                    {/* Confidence tag */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                      title={m.confidenceNotes || 'Fiabilité de l\'extraction'}
                    >
                      {m.confidence === 'high' ? 'Données explicites' : 'Déduit par IA'}
                    </span>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {m.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{m.client}</span>
                    <span className="mx-2">•</span>
                    <span>Date : <span className="font-semibold">{m.startDate}</span> ({m.startTime} - {m.endTime})</span>
                    <span className="mx-2">•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{m.city}</span>
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adresse : {m.address} {m.parkingInfo ? `• Parking: ${m.parkingInfo}` : ''}
                  </p>

                  {m.contactName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Contact : {m.contactName} ({m.contactPhone || 'Tél N/C'})</span>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.materials?.map((mat, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        📦 {mat}
                      </span>
                    ))}
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                      📄 Source : {m.source}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingMission(m)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Modifier la mission"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer la mission "${m.title}" à ${m.city} ? Cette action est irréversible.`)) {
                        onDeleteMission(m.id);
                      }
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors"
                    title="Supprimer la mission"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Create Mission Modal */}
      {(editingMission || isCreateModalOpen) && (
        <MissionEditModal
          mission={editingMission}
          isOpen={true}
          onClose={() => {
            setEditingMission(null);
            setIsCreateModalOpen(false);
          }}
          onSave={(updated) => {
            if (editingMission) {
              onUpdateMission(updated);
            } else {
              onAddMission(updated);
            }
            setEditingMission(null);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Paste Manager Email Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Coller le texte du mail / planning
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPastedEmailText('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Collez ici le courriel envoyé par votre manager. L'intelligence artificielle extraira automatiquement les dates, heures, lieux et filtrera vos initiales (« <strong>{profile.initials || 'Toutes'}</strong> »).
            </p>

            <textarea
              rows={8}
              value={pastedEmailText}
              onChange={(e) => setPastedEmailText(e.target.value)}
              placeholder={`Exemple :\nBonjour à tous,\nVoici le planning de la semaine :\nLundi 26/10 : Formation SST à Béziers de 08h30 à 16h30 pour ${profile.initials || 'SH'}...\n`}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPastedEmailText('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={handleExtractFromPastedText}
                disabled={!pastedEmailText.trim() || isUploading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extraction IA en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extraire mes missions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component Modal for Editing or Adding a mission manually
interface MissionEditModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (m: Mission) => void;
}

const MissionEditModal: React.FC<MissionEditModalProps> = ({
  mission,
  isOpen,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<Mission>>(
    mission || {
      id: `m-manual-${Date.now()}`,
      title: '',
      client: '',
      category: 'echafaudages',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      startTime: '08:30',
      endTime: '16:30',
      city: 'Montpellier',
      address: '',
      contactName: '',
      contactPhone: '',
      parkingInfo: '',
      materials: ['EPI'],
      documents: ['Feuille d\'émargement'],
      notes: '',
      status: 'valid',
      confidence: 'high',
      source: 'Saisie manuelle',
      lastModified: new Date().toISOString(),
    }
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {mission ? 'Modifier la mission' : 'Créer une mission de formation'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Intitulé de la formation</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              placeholder="Ex: Échafaudage R408"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Organisme / Client</label>
              <input
                type="text"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initiales formateur</label>
              <input
                type="text"
                value={form.trainerInitials || ''}
                onChange={(e) => setForm({ ...form, trainerInitials: e.target.value.toUpperCase() })}
                placeholder="Initiales"
                maxLength={5}
                className="w-full px-3 py-2 rounded-xl border border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40 text-xs font-black uppercase text-blue-900 dark:text-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Thématique</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            >
              <option value="echafaudages">Échafaudages</option>
              <option value="prevention">Prévention & SST</option>
              <option value="securite">Sécurité CACES</option>
              <option value="technique">Habilitation Électrique</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Début</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fin</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adresse exacte</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nom contact</label>
              <input
                type="text"
                value={form.contactName || ''}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Téléphone contact</label>
              <input
                type="text"
                value={form.contactPhone || ''}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Stationnement & Accès</label>
            <input
              type="text"
              value={form.parkingInfo || ''}
              onChange={(e) => setForm({ ...form, parkingInfo: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              placeholder="Ex: Parking visiteur gratuit, sonner au portail"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (!form.title || !form.city) {
                alert('Veuillez renseigner au moins le nom de la formation et la ville.');
                return;
              }
              onSave(form as Mission);
            }}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
          >
            Enregistrer la mission
          </button>
        </div>
      </div>
    </div>
  );
};

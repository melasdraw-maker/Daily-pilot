import React, { useState } from 'react';
import {
  X,
  Mail,
  FileText,
  RefreshCw,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
  ClipboardPaste,
} from 'lucide-react';
import { UserProfile, GoogleAuthState, Mission } from '../types';
import { searchGmailMissions, GmailSearchResult } from '../services/gmail';

interface GmailPlanningExtractModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  authState: GoogleAuthState;
  onBatchImportMissions: (missions: Mission[], replaceExisting: boolean) => void;
  onOpenSettings?: () => void;
}

export const GmailPlanningExtractModal: React.FC<GmailPlanningExtractModalProps> = ({
  isOpen,
  onClose,
  profile,
  authState,
  onBatchImportMissions,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'paste'>('gmail');
  const [searchQuery, setSearchQuery] = useState('planning OR convocation OR formation');
  const [isSearching, setIsSearching] = useState(false);
  const [gmailResults, setGmailResults] = useState<GmailSearchResult[]>([]);
  const [selectedMail, setSelectedMail] = useState<GmailSearchResult | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewMissions, setPreviewMissions] = useState<Mission[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const userInitials = (profile.initials || '').trim().toUpperCase();

  if (!isOpen) return null;

  // Search Gmail
  const handleSearchGmail = async () => {
    setIsSearching(true);
    setErrorMessage(null);
    setGmailResults([]);
    try {
      const results = await searchGmailMissions(searchQuery, 10);
      setGmailResults(results);
      if (results.length === 0) {
        setErrorMessage('Aucun e-mail récent trouvé avec ces critères de recherche.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Impossible d\'accéder aux e-mails Gmail. Vérifiez vos autorisations Google.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Extract from selected Gmail message
  const handleExtractFromEmail = async (mail: GmailSearchResult) => {
    setSelectedMail(mail);
    setIsExtracting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const content = `Expéditeur: ${mail.sender}\nDate: ${mail.date}\nObjet: ${mail.subject}\nContenu:\n${mail.snippet}\nPièces jointes: ${mail.attachmentNames.join(', ')}`;
      const res = await fetch('/api/gemini/extract-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: content,
          filename: `Gmail: ${mail.subject}`,
          userInitials: userInitials,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de l\'analyse du mail par l\'assistant');
      }

      const data = await res.json();
      if (data.missions && Array.isArray(data.missions) && data.missions.length > 0) {
        setPreviewMissions(data.missions);
        setStatusMessage(`${data.missions.length} mission(s) détectée(s) pour le trigramme ${userInitials || 'votre profil'}.`);
      } else {
        setErrorMessage(`Aucune mission trouvée pour le formateur (${userInitials || 'initiales non définies'}) dans ce message.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l\'extraction du planning');
    } finally {
      setIsExtracting(false);
    }
  };

  // Extract from pasted email text
  const handleExtractFromPastedText = async () => {
    if (!pastedText.trim()) {
      setErrorMessage('Veuillez coller le texte de l\'e-mail envoyé par votre manager.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/gemini/extract-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: pastedText,
          filename: 'E-mail texte du manager',
          userInitials: userInitials,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de l\'analyse du texte');
      }

      const data = await res.json();
      if (data.missions && Array.isArray(data.missions) && data.missions.length > 0) {
        setPreviewMissions(data.missions);
        setStatusMessage(`${data.missions.length} mission(s) détectée(s) avec succès !`);
      } else {
        setErrorMessage(`Aucune mission trouvée pour le trigramme "${userInitials || 'non spécifié'}". Vérifiez vos initiales dans les Paramètres.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l\'analyse par IA');
    } finally {
      setIsExtracting(false);
    }
  };

  // Validate and Import Missions
  const handleConfirmImport = (replaceExisting: boolean) => {
    if (!previewMissions || previewMissions.length === 0) return;
    onBatchImportMissions(previewMissions, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Importer le planning manager</span>
                {userInitials && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold">
                    Filtre : {userInitials}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Par e-mail Gmail direct ou copier-coller du texte de votre manager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('gmail');
              setPreviewMissions(null);
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'gmail'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Boîte Gmail directe</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('paste');
              setPreviewMissions(null);
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Copier-Coller le texte du mail</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Status / Error alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB 1: GMAIL EXTRACTION */}
          {activeTab === 'gmail' && !previewMissions && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mots-clés (ex: planning, convocation, formation)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>
                <button
                  onClick={handleSearchGmail}
                  disabled={isSearching}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                  <span>{isSearching ? 'Recherche...' : 'Rechercher mes e-mails'}</span>
                </button>
              </div>

              {/* Connected Google Account Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Compte connecté : {authState.userEmail || 'Google Workspace'}
                  </span>
                </div>
                {!userInitials && onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="text-blue-600 dark:text-blue-400 font-bold underline text-[11px]"
                  >
                    Définir mes initiales
                  </button>
                )}
              </div>

              {/* Email search results */}
              {gmailResults.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    Sélectionnez l'e-mail du manager à analyser :
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {gmailResults.map((mail) => (
                      <div
                        key={mail.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 bg-white dark:bg-slate-800/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {mail.subject || 'Sans objet'}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">{mail.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {mail.snippet}
                          </p>
                        </div>

                        <button
                          onClick={() => handleExtractFromEmail(mail)}
                          disabled={isExtracting}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Extraire</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COPIER-COLLER TEXTE DU MAIL */}
          {activeTab === 'paste' && !previewMissions && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-1">
                <p className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <ClipboardPaste className="w-4 h-4 text-blue-600" />
                  <span>Collez l'e-mail de planning de votre manager</span>
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  L'intelligence artificielle détecte automatiquement vos dates, lieux, horaires et sessions multi-jours pour vos initiales ({userInitials || 'Non définies'}).
                </p>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Exemple :
Bonjour à tous, voici le planning des formations de la semaine prochaine :
Lundi 26/10 et Mardi 27/10 : Échafaudage R408 à Nîmes (Formateur : SH, 08h30-17h00)
Mercredi 28/10 : SST Recyclage à Montpellier..."
                rows={8}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleExtractFromPastedText}
                  disabled={isExtracting || !pastedText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyser et extraire mes formations</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW MISSIONS DETECTED */}
          {previewMissions && previewMissions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{previewMissions.length} mission(s) prête(s) à être importée(s)</span>
                </h3>
                <button
                  onClick={() => setPreviewMissions(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold underline"
                >
                  Revenir en arrière
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {previewMissions.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {m.title}
                      </span>
                      {m.trainerInitials && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {m.trainerInitials}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>{m.startDate}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{m.startTime || '08:30'} - {m.endTime || '17:00'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{m.city} ({m.address})</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleConfirmImport(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Ajouter au planning existant
                </button>
                <button
                  onClick={() => handleConfirmImport(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <span>Remplacer mon planning avec ces {previewMissions.length} missions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Extraction automatique des jours 1/2 et 2/2</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 font-bold text-slate-800 dark:text-slate-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  RefreshCw,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Mission, UserProfile } from '../types';
import { parseOperaFormationEmail } from '../services/operaEmailParser';

interface OperaPlanningImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onImportMissions: (missions: Mission[], replaceExisting: boolean) => void;
}

export const OperaPlanningImportModal: React.FC<OperaPlanningImportModalProps> = ({
  isOpen,
  onClose,
  profile,
  onImportMissions,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time local parsing check
  const locallyDetected = parseOperaFormationEmail(
    pastedText,
    profile.initials || 'HWS'
  );

  const sampleOperaText = `OPERA FORMATION, le vendredi 30 octobre 2026

Bonjour,

Veuillez trouver ci-joint votre planning d'intervention dans notre centre pour la période du 02/11/2026 au 06/11/2026

Nov- 2026 :

Le 02/11/2026 de 08:30 à 16:30 -> A260FDA: INTRA: Syndicat mixte Pays des Cevennes - PLIE Cévenol - ALES - CCTH GO : Certificat de Compétences au Travail en Hauteur pour les intérimaires délégués dans des entreprises réalisant des travaux de Gros Oeuvre - 10 Stagiaires (Lieu: Chez le client >> Coordonnées Client INTRA : Syndicat mixte Pays des Cevennes - PLIE Cévenol - 6 place des Martyrs de la Résistance | 30100 ALES)

Le 03/11/2026 de 08:30 à 16:30 -> A260FDA: INTRA: Syndicat mixte Pays des Cevennes - PLIE Cévenol - ALES - CCTH GO : Certificat de Compétences au Travail en Hauteur pour les intérimaires délégués dans des entreprises réalisant des travaux de Gros Oeuvre - 10 Stagiaires (Lieu: Chez le client >> Coordonnées Client INTRA : Syndicat mixte Pays des Cevennes - PLIE Cévenol - 6 place des Martyrs de la Résistance | 30100 ALES)

Le 04/11/2026 de 08:30 à 16:30 -> A260FDA: INTRA: Syndicat mixte Pays des Cevennes - PLIE Cévenol - ALES - CCTH GO : Certificat de Compétences au Travail en Hauteur pour les intérimaires délégués dans des entreprises réalisant des travaux de Gros Oeuvre - 10 Stagiaires (Lieu: Chez le client >> Coordonnées Client INTRA : Syndicat mixte Pays des Cevennes - PLIE Cévenol - 6 place des Martyrs de la Résistance | 30100 ALES)

Le 05/11/2026 de 08:30 à 16:30 -> A260FRB: INTRA: Syndicat mixte Pays des Cevennes - PLIE Cévenol - ALES - CCTH GO : Certificat de Compétences au Travail en Hauteur pour les intérimaires délégués dans des entreprises réalisant des travaux de Gros Oeuvre - 10 Stagiaires (Lieu: Chez le client >> Coordonnées Client INTRA : Syndicat mixte Pays des Cevennes - PLIE Cévenol - 6 place des Martyrs de la Résistance | 30100 ALES)

Le 06/11/2026 de 08:30 à 16:30 -> A260FEA: INTRA: Syndicat mixte Pays des Cevennes - PLIE Cévenol - ALES - Autorisation d'intervention à proximité des réseaux - 11 Stagiaires (Lieu: Chez le client >> Coordonnées Client INTRA : Syndicat mixte Pays des Cevennes - PLIE Cévenol - 6 place des Martyrs de la Résistance | 30100 ALES)`;

  const handlePasteSample = () => {
    setPastedText(sampleOperaText);
    setErrorMessage(null);
  };

  const handleImport = async (replaceExisting: boolean) => {
    if (!pastedText.trim()) {
      setErrorMessage("Veuillez coller le texte de l'e-mail du planning.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. First attempt: Direct Opera Formation instant local parsing (fastest & robust)
      let missions = parseOperaFormationEmail(pastedText, profile.initials || 'HWS');

      // 2. If no missions detected via regex, fallback to Gemini API
      if (missions.length === 0) {
        const res = await fetch('/api/gemini/extract-missions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawContent: pastedText,
            filename: 'Email_Opera_Formation.txt',
            userInitials: profile.initials || 'HWS',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.missions) && data.missions.length > 0) {
            missions = data.missions;
          }
        }
      }

      if (missions.length === 0) {
        throw new Error(
          "Aucune session de formation n'a été détectée dans ce texte. Vérifiez qu'il contient bien les lignes de planning (ex: 'Le JJ/MM/AAAA de 08:30 à 16:30 -> ...')."
        );
      }

      onImportMissions(missions, replaceExisting);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'importation du planning.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Importer planning Opera Formation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collez simplement l'e-mail reçu pour créer vos missions automatiquement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notice */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Paste Sample Button */}
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Texte de l'e-mail du manager :
          </label>
          <button
            type="button"
            onClick={handlePasteSample}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Coller l'exemple Alès (Nov 2026)</span>
          </button>
        </div>

        {/* Large Text Area */}
        <textarea
          rows={7}
          value={pastedText}
          onChange={(e) => {
            setPastedText(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder={`Collez ici le courriel Opera Formation, par exemple :\n\nOPERA FORMATION, le vendredi 30 octobre 2026\nNov- 2026 :\nLe 02/11/2026 de 08:30 à 16:30 -> A260FDA: INTRA: Syndicat mixte Pays des Cevennes - ALES - CCTH GO...`}
          className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
        />

        {/* Live Detected Missions Summary */}
        {locallyDetected.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{locallyDetected.length} mission(s) Opera Formation détectée(s) :</span>
              </span>
              <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md">
                Format Opera reconnu
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {locallyDetected.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate">
                      {m.title}
                    </p>
                    <p className="text-slate-500 text-[10px] flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      <span>{m.startDate} ({m.startTime}-{m.endTime})</span>
                      <span>•</span>
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span className="truncate">{m.city}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                    {m.customDistanceKm} km
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={() => handleImport(false)}
            disabled={!pastedText.trim() || isProcessing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs disabled:opacity-50 transition-colors"
          >
            Ajouter au planning
          </button>

          <button
            type="button"
            onClick={() => handleImport(true)}
            disabled={!pastedText.trim() || isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importation...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Remplacer mon planning</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

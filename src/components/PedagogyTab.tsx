import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileText,
  Copy,
  ExternalLink,
  Check,
  CheckCircle2,
  FolderOpen,
  Layers,
  Sparkles,
  Link2,
} from 'lucide-react';
import { PedagogicalSheet, MissionCategory } from '../types';
import { PEDAGOGICAL_SHEETS } from '../data/pedagogicalSheets';

interface PedagogyTabProps {
  onOpenNotebookLm: (url?: string) => void;
}

export const PedagogyTab: React.FC<PedagogyTabProps> = ({ onOpenNotebookLm }) => {
  const [sheets, setSheets] = useState<PedagogicalSheet[]>(PEDAGOGICAL_SHEETS);
  const [selectedSheetId, setSelectedSheetId] = useState<string>(sheets[0]?.id || '');
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);

  const selectedSheet = sheets.find((s) => s.id === selectedSheetId) || sheets[0];

  const handleCopyPrompt = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptIdx(idx);
    setTimeout(() => setCopiedPromptIdx(null), 2500);
  };

  const handleSaveNotebookUrl = (newUrl: string) => {
    setSheets(
      sheets.map((s) => (s.id === selectedSheet.id ? { ...s, notebookLmUrl: newUrl } : s))
    );
    setEditingUrl(null);
  };

  const categories: { key: MissionCategory; label: string }[] = [
    { key: 'echafaudages', label: 'Échafaudages' },
    { key: 'prevention', label: 'Prévention & SST' },
    { key: 'securite', label: 'Sécurité CACES' },
    { key: 'technique', label: 'Habilitation Électrique' },
  ];

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Mon Assistant Pédagogique & NotebookLM
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Organisation thématique de vos cours, gestion des documents et passerelle vers vos carnets NotebookLM
        </p>
      </div>

      {/* Theme selection buttons */}
      <div className="flex flex-wrap gap-2">
        {sheets.map((sheet) => {
          const isSelected = sheet.id === selectedSheet?.id;
          return (
            <button
              key={sheet.id}
              onClick={() => setSelectedSheetId(sheet.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>{sheet.title.split('(')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {selectedSheet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Pedagogical Sheet */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sheet Overview */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
                  Fiche Référentiel {selectedSheet.category}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {selectedSheet.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedSheet.subtitle}</p>
              </div>

              {/* Program Summary */}
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Résumé du programme :
                </span>
                <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {selectedSheet.programSummary}
                </p>
              </div>

              {/* Objectives */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Objectifs pédagogiques opérationnels :
                </span>
                <ul className="space-y-1.5 pl-1">
                  {selectedSheet.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Required Materials */}
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Matériel et EPI à vérifier avant départ :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSheet.requiredMaterials.map((mat, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      🛡️ {mat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Supports stagiaires & Feuilles d'émargement</span>
                </h4>
                <span className="text-xs text-slate-400">
                  {selectedSheet.documents.length} document(s)
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedSheet.documents.map((doc) => (
                  <div key={doc.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-slate-400">{doc.note}</p>
                    </div>

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                      Prêt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NotebookLM Integration Sidebar Card */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/50 via-white to-blue-50/40 dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Intégration NotebookLM
                  </h4>
                  <p className="text-[11px] text-slate-500">Carnet pédagogique interactif</p>
                </div>
              </div>

              {/* Notebook Title & Direct Button */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-teal-100 dark:border-teal-900/40 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Carnet associé :</span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    {selectedSheet.notebookLmTitle}
                  </p>
                </div>

                <button
                  onClick={() => onOpenNotebookLm(selectedSheet.notebookLmUrl)}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Accéder à NotebookLM</span>
                </button>
              </div>

              {/* Notebook URL configuration */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Lien personnalisé du carnet NotebookLM :
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    defaultValue={selectedSheet.notebookLmUrl}
                    onBlur={(e) => handleSaveNotebookUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 outline-hidden"
                    placeholder="https://notebooklm.google.com/notebook/..."
                  />
                </div>
              </div>

              {/* Quick Prompts to Copy */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Prompts prêts à copier pour votre cours :</span>
                </span>

                <div className="space-y-2">
                  {selectedSheet.quickPrompts.map((prompt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        « {prompt} »
                      </p>
                      <button
                        onClick={() => handleCopyPrompt(prompt, idx)}
                        className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                      >
                        {copiedPromptIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copié dans le presse-papier !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier le prompt pour NotebookLM</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

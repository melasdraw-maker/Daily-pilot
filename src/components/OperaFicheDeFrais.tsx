import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Mail,
  Printer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
  Save,
  Calendar,
  User,
  Check,
  X,
  Plus,
  MapPin,
} from 'lucide-react';
import { Mission, UserProfile, ExpenseItem, GoogleAuthState } from '../types';
import { generateOperaFicheDeFraisPdf, FicheFraisDayRow, FicheFraisMonthData } from '../services/pdfGenerator';

interface OperaFicheDeFraisProps {
  missions: Mission[];
  expenses: ExpenseItem[];
  profile: UserProfile;
  authState?: GoogleAuthState;
}

// Standard round-trip distances from Montpellier (matching Opéra Formation reference sheet)
const STANDARD_DISTANCES: Record<string, number> = {
  'st aunès': 10,
  'staunès': 10,
  'nîmes': 110,
  'nimes': 110,
  'alès': 130,
  'ales': 130,
  'béziers': 150,
  'beziers': 150,
  'perpignan': 300,
  'toulouse': 480,
  'mauguio': 20,
};

export const OperaFicheDeFrais: React.FC<OperaFicheDeFraisProps> = ({
  missions,
  expenses,
  profile,
  authState,
}) => {
  // Selected Month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11'); // November 2026 default for current planning
  const [kmDebutMois, setKmDebutMois] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('opera_km_debut_mois');
      return saved ? parseInt(saved, 10) : 25100;
    } catch {
      return 25100;
    }
  });

  const [tauxIk, setTauxIk] = useState<number>(0.40); // 0.40 €/km matching the official template

  // Email submission modal state
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string>(() => {
    try {
      return localStorage.getItem('daily_pilot_expense_recipients') || 'comptabilite@opera-formation.fr';
    } catch {
      return 'comptabilite@opera-formation.fr';
    }
  });
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Parse Year and Month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1..12

  // Month labels in French
  const monthNamesFr = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const monthName = `${monthNamesFr[month - 1]} ${year}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Storage key for custom in-place cell overrides per month
  const storageKey = `opera_fiche_frais_overrides_${selectedMonth}`;
  const [customOverrides, setCustomOverrides] = useState<Record<number, Partial<FicheFraisDayRow>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Reload custom overrides when month changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`opera_fiche_frais_overrides_${selectedMonth}`);
      setCustomOverrides(saved ? JSON.parse(saved) : {});
    } catch {
      setCustomOverrides({});
    }
  }, [selectedMonth]);

  // Save overrides when updated
  const updateRowField = (dayNum: number, field: keyof FicheFraisDayRow, value: any) => {
    setCustomOverrides((prev) => {
      const updated = {
        ...prev,
        [dayNum]: {
          ...(prev[dayNum] || {}),
          [field]: value,
        },
      };
      try {
        localStorage.setItem(`opera_fiche_frais_overrides_${selectedMonth}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Build the 1..daysInMonth row items automatically populated from Missions and Expenses
  const rows: FicheFraisDayRow[] = useMemo(() => {
    const list: FicheFraisDayRow[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month - 1, d);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateShortStr = `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;

      // Check if user has missions on this day
      const dayMissions = missions.filter((m) => m.startDate === dateIso);
      const primaryMission = dayMissions[0];

      // Check if user has registered expenses on this day
      const dayExpenses = expenses.filter((e) => e.date === dateIso);
      const essenceExp = dayExpenses.find((e) => e.category === 'carburant');
      const autorouteExp = dayExpenses.find((e) => e.category === 'peage');
      const repasExp = dayExpenses.find((e) => e.category === 'repas');
      const diversExp = dayExpenses.find((e) => !['carburant', 'peage', 'repas'].includes(e.category));

      // Calculate default kms
      let defaultKms: number | '' = '';
      let defaultObjet = '';

      if (primaryMission) {
        const cityLower = (primaryMission.city || '').trim().toLowerCase();
        defaultObjet = cityLower || primaryMission.title.slice(0, 20);

        if (STANDARD_DISTANCES[cityLower]) {
          defaultKms = STANDARD_DISTANCES[cityLower];
        } else if (primaryMission.customDistanceKm) {
          defaultKms = Math.round(primaryMission.customDistanceKm * 2);
        } else if (primaryMission.distanceKm) {
          defaultKms = Math.round(primaryMission.distanceKm * 2);
        } else {
          defaultKms = 110;
        }
      }

      // Merge with custom overrides
      const override = customOverrides[d] || {};

      list.push({
        dayNumber: d,
        dateStr: dateShortStr,
        objet: override.objet !== undefined ? override.objet : defaultObjet,
        kms: override.kms !== undefined ? override.kms : defaultKms,
        essence: override.essence !== undefined ? override.essence : (essenceExp ? essenceExp.amountTTC : ''),
        autoroute: override.autoroute !== undefined ? override.autoroute : (autorouteExp ? autorouteExp.amountTTC : ''),
        repas: override.repas !== undefined ? override.repas : (repasExp ? repasExp.amountTTC : ''),
        divers: override.divers !== undefined ? override.divers : (diversExp ? diversExp.amountTTC : ''),
        denomination: override.denomination !== undefined ? override.denomination : (diversExp?.description || (primaryMission ? primaryMission.title.slice(0, 25) : '')),
        isWeekend,
      });
    }

    return list;
  }, [daysInMonth, year, month, missions, expenses, customOverrides]);

  // Compute Totals
  const totalKms = rows.reduce((acc, r) => acc + (typeof r.kms === 'number' ? r.kms : 0), 0);
  const totalEssence = rows.reduce((acc, r) => acc + (typeof r.essence === 'number' ? r.essence : 0), 0);
  const totalAutoroute = rows.reduce((acc, r) => acc + (typeof r.autoroute === 'number' ? r.autoroute : 0), 0);
  const totalRepas = rows.reduce((acc, r) => acc + (typeof r.repas === 'number' ? r.repas : 0), 0);
  const totalDivers = rows.reduce((acc, r) => acc + (typeof r.divers === 'number' ? r.divers : 0), 0);
  const totalFraisReels = totalEssence + totalAutoroute + totalRepas + totalDivers;
  const totalIk = Math.round(totalKms * tauxIk * 100) / 100;
  const grandTotal = totalFraisReels + totalIk;
  const kmFinMois = kmDebutMois + totalKms;

  const employeeName = (profile.name && profile.name !== 'Formateur') ? profile.name : 'HACHOUD WARD-SALEM';

  // Export PDF handler
  const handleDownloadPdf = () => {
    const monthData: FicheFraisMonthData = {
      monthName,
      periodStr: `Période du 01/${String(month).padStart(2, '0')}/${year} au ${String(daysInMonth).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      employeeName,
      kmDebutMois,
      kmFinMois,
      tauxIk,
      rows,
    };

    const doc = generateOperaFicheDeFraisPdf(monthData);
    const fileName = `FICHE_DE_FRAIS_Opera_Formation_${monthName.replace(' ', '_')}_${employeeName.replace(/[\s-]/g, '_')}.pdf`;
    doc.save(fileName);

    setNotification(`PDF officiel généré et téléchargé : "${fileName}" !`);
    setTimeout(() => setNotification(null), 6000);
  };

  // Open Email Control Modal
  const handleOpenEmailModal = () => {
    setEmailSubject(`[NOTE DE FRAIS] ${employeeName} - ${monthName} - Opéra Formation`);
    setIsEmailVerified(false);
    setIsSendEmailModalOpen(true);
  };

  // Save recipient email
  const handleSaveRecipients = (val: string) => {
    setRecipientEmails(val);
    try {
      localStorage.setItem('daily_pilot_expense_recipients', val);
    } catch {}
  };

  // Prepare Mailto URL
  const prepareMailtoLink = () => {
    const body = `Bonjour,

Veuillez trouver ci-joint ma fiche de frais d'intervention pour le mois de ${monthName}.

RÉCAPITULATIF DES FRAIS :
---------------------------------------------
• Intervenant : ${employeeName}
• Période : 01/${String(month).padStart(2, '0')}/${year} au ${String(daysInMonth).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}
• Total kilomètres parcourus : ${totalKms} km
• Indemnités Kilométriques (${tauxIk.toFixed(2)} €/km) : ${totalIk.toFixed(2)} €
• Carburant / Essence : ${totalEssence.toFixed(2)} €
• Autoroute / Péage : ${totalAutoroute.toFixed(2)} €
• Repas : ${totalRepas.toFixed(2)} €
• Divers : ${totalDivers.toFixed(2)} €
---------------------------------------------
TOTAL GÉNÉRAL À REMBOURSER : ${grandTotal.toFixed(2)} €

(Fichier PDF officiel joint au message)

Bien cordialement,
${employeeName}
Opéra Formation`;

    const recipients = encodeURIComponent(recipientEmails);
    const subject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:${recipients}?subject=${subject}&body=${encodedBody}`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner and Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
              Modèle Officiel Opéra Formation (Fiche de Frais)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Conforme à 100% à votre modèle PDF/Excel officiel. Remplissage automatique depuis vos formations et tickets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="2026-11">Novembre 2026 (Planning actuel)</option>
              <option value="2026-10">Octobre 2026</option>
              <option value="2026-09">Septembre 2026</option>
              <option value="2026-08">Août 2026 (Modèle exemple)</option>
              <option value="2026-12">Décembre 2026</option>
            </select>
          </div>

          {/* Action 1: Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Enregistrer en PDF</span>
          </button>

          {/* Action 2: Verify & Send by Email */}
          <button
            onClick={handleOpenEmailModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Vérifier & Envoyer par mail</span>
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-emerald-100 rounded-sm">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* THE OFFICIAL OPÉRA FORMATION SHEET VIEW (1:1 REPLICA) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-4 sm:p-8 shadow-xl overflow-x-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-900 dark:border-slate-600 pb-4">
          {/* Logo Opéra */}
          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-1 w-10 h-10 shrink-0">
              <div className="bg-emerald-600 rounded-xs" />
              <div className="bg-slate-900 dark:bg-white rounded-xs" />
              <div className="bg-slate-900 dark:bg-white rounded-xs" />
              <div className="bg-emerald-600 rounded-xs" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Opéra
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                Formation • Sécurité • Ingénierie • Conseil
              </p>
            </div>
          </div>

          {/* Title box with Employee and Period */}
          <div className="border-2 border-slate-900 dark:border-slate-600 px-6 py-2.5 rounded-xl text-center">
            <h1 className="text-sm sm:text-base font-extrabold uppercase text-slate-900 dark:text-white tracking-wide">
              FICHE DE FRAIS {monthName} {employeeName}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Période du 01/{String(month).padStart(2, '0')}/{year} au {String(daysInMonth).padStart(2, '0')}/{String(month).padStart(2, '0')}/{year}
            </p>
          </div>
        </div>

        {/* Info notice about direct in-place editing */}
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Les lignes sont pré-remplies selon vos formations et vos tickets. <strong>Vous pouvez cliquer dans n'importe quelle case</strong> pour modifier un montant ou ajouter une remarque.
            </span>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-800 dark:border-slate-600 min-w-[760px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border-b-2 border-slate-800 dark:border-slate-600">
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-center w-20">Date</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-left min-w-[140px]">Objet</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-center w-20">kms</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-right w-24">Essence</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-right w-24">Autoroute</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-right w-24">Repas</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-right w-20">Divers</th>
                <th className="border border-slate-400 dark:border-slate-700 p-2 text-left min-w-[180px]">Divers / dénomination</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.dayNumber}
                  className={`border-b border-slate-300 dark:border-slate-700 transition-colors ${
                    row.isWeekend
                      ? 'bg-slate-200/70 dark:bg-slate-800/80 font-semibold'
                      : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Date */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center font-bold text-slate-900 dark:text-slate-100">
                    {row.dateStr}
                  </td>

                  {/* Objet (ville/formation) */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1">
                    <input
                      type="text"
                      value={row.objet}
                      onChange={(e) => updateRowField(row.dayNumber, 'objet', e.target.value)}
                      placeholder={row.isWeekend ? '' : 'Ex: ales, nîmes'}
                      className="w-full bg-transparent px-1.5 py-0.5 rounded text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* kms */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1 text-center">
                    <input
                      type="number"
                      value={row.kms}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                        updateRowField(row.dayNumber, 'kms', val);
                      }}
                      className="w-full bg-transparent text-center px-1 py-0.5 rounded text-xs font-bold outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Essence */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={row.essence}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        updateRowField(row.dayNumber, 'essence', val);
                      }}
                      placeholder=""
                      className="w-full bg-transparent text-right px-1 py-0.5 rounded text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </td>

                  {/* Autoroute / Péage */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={row.autoroute}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        updateRowField(row.dayNumber, 'autoroute', val);
                      }}
                      placeholder=""
                      className="w-full bg-transparent text-right px-1 py-0.5 rounded text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </td>

                  {/* Repas */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={row.repas}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        updateRowField(row.dayNumber, 'repas', val);
                      }}
                      placeholder=""
                      className="w-full bg-transparent text-right px-1 py-0.5 rounded text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </td>

                  {/* Divers */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={row.divers}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        updateRowField(row.dayNumber, 'divers', val);
                      }}
                      placeholder=""
                      className="w-full bg-transparent text-right px-1 py-0.5 rounded text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* Divers / Dénomination */}
                  <td className="border border-slate-300 dark:border-slate-700 p-1">
                    <input
                      type="text"
                      value={row.denomination}
                      onChange={(e) => updateRowField(row.dayNumber, 'denomination', e.target.value)}
                      placeholder=""
                      className="w-full bg-transparent px-1.5 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300 outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}

              {/* BOTTOM TOTALS SECTION */}
              {/* Total de kms */}
              <tr className="border-t-2 border-slate-800 dark:border-slate-600 font-bold bg-slate-50 dark:bg-slate-800/60">
                <td colSpan={2} className="border border-slate-400 dark:border-slate-700 p-2 text-left">
                  Total de kms
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-center text-sm font-black text-blue-600 dark:text-blue-400">
                  {totalKms}
                </td>
                <td colSpan={5} className="border border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40" />
              </tr>

              {/* Indemnité Kilométrique */}
              <tr className="font-bold bg-slate-50 dark:bg-slate-800/60">
                <td colSpan={2} className="border border-slate-400 dark:border-slate-700 p-2 text-left flex items-center justify-between">
                  <span>Indemnité Kilométrique</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      value={tauxIk}
                      onChange={(e) => setTauxIk(parseFloat(e.target.value) || 0.40)}
                      className="w-14 text-right px-1 py-0.5 bg-white dark:bg-slate-900 border rounded text-xs"
                    />
                    <span>€ / km</span>
                  </div>
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-center font-extrabold text-emerald-600 dark:text-emerald-400">
                  {totalIk.toFixed(2)} €
                </td>
                <td colSpan={5} className="border border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40" />
              </tr>

              {/* Km Début de Mois */}
              <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold">
                <td colSpan={2} className="border border-slate-400 dark:border-slate-700 p-2 text-left">
                  Km Début de Mois
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-1 text-center">
                  <input
                    type="number"
                    value={kmDebutMois}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setKmDebutMois(val);
                      try {
                        localStorage.setItem('opera_km_debut_mois', String(val));
                      } catch {}
                    }}
                    className="w-full text-center bg-transparent font-bold outline-none"
                  />
                </td>
                <td colSpan={5} className="border border-slate-400 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40" />
              </tr>

              {/* Km Fin de Mois */}
              <tr className="bg-slate-50 dark:bg-slate-800/60 font-semibold">
                <td colSpan={2} className="border border-slate-400 dark:border-slate-700 p-2 text-left">
                  Km Fin de Mois
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-center font-bold">
                  {kmFinMois}
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-right font-bold text-slate-800 dark:text-slate-200">
                  {totalEssence.toFixed(2)} €
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-right font-bold text-slate-800 dark:text-slate-200">
                  {totalAutoroute.toFixed(2)} €
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-right font-bold text-slate-800 dark:text-slate-200">
                  {totalRepas.toFixed(2)} €
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 text-right font-bold text-slate-800 dark:text-slate-200">
                  {totalDivers.toFixed(2)} €
                </td>
                <td className="border border-slate-400 dark:border-slate-700 p-2 font-bold text-right text-xs">
                  TOTAUX COLONNES
                </td>
              </tr>

              {/* GRAND TOTAL ROW */}
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td colSpan={3} className="border border-slate-900 p-3 text-left tracking-wide">
                  TOTAL GÉNÉRAL (Frais réels + Indemnités Kilométriques)
                </td>
                <td colSpan={5} className="border border-slate-900 p-3 text-right text-base text-emerald-400">
                  {grandTotal.toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Standard Destination Reference Table (As on page 2 & 3 of PDF) */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Barème des distances standard Opéra Formation (Aller-Retour depuis Montpellier) :</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            {Object.entries(STANDARD_DISTANCES).map(([ville, km]) => (
              <div key={ville} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-200 capitalize">{ville}</p>
                <p className="text-[11px] text-slate-500">{km} km</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: CONTRÔLE ET ENVOI PAR E-MAIL */}
      {isSendEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Contrôle & Envoi de la Note de Frais
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vérifiez les montants avant envoi au service comptabilité
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSendEmailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. RECIPIENT EMAIL ADDRESSES (REQUESTED BY USER) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Adresses e-mail destinataires (comptabilité / manager) *
              </label>
              <input
                type="text"
                value={recipientEmails}
                onChange={(e) => handleSaveRecipients(e.target.value)}
                placeholder="Ex: comptabilite@opera-formation.fr, manager@opera-formation.fr"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Vous pouvez saisir plusieurs adresses séparées par des virgules. Elles sont mémorisées pour les prochains mois.
              </p>
            </div>

            {/* 2. SUMMARY CONTROL CHECKLIST */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Récapitulatif de contrôle pour {monthName} :</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 text-[11px]">Intervenant</span>
                  <p className="font-bold text-slate-900 dark:text-white">{employeeName}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 text-[11px]">Distance totale</span>
                  <p className="font-bold text-slate-900 dark:text-white">{totalKms} km ({totalIk.toFixed(2)} €)</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 text-[11px]">Frais réels (Tickets)</span>
                  <p className="font-bold text-slate-900 dark:text-white">{totalFraisReels.toFixed(2)} €</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                  <span className="text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">Total Général Remboursable</span>
                  <p className="font-black text-sm text-emerald-900 dark:text-emerald-200">{grandTotal.toFixed(2)} €</p>
                </div>
              </div>

              {/* Detailed Breakdown list */}
              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span>Carburant / Essence :</span>
                  <span className="font-bold">{totalEssence.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Autoroute / Péages :</span>
                  <span className="font-bold">{totalAutoroute.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Repas midi :</span>
                  <span className="font-bold">{totalRepas.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Divers :</span>
                  <span className="font-bold">{totalDivers.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* 3. USER CONFIRMATION CHECKBOX */}
            <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={isEmailVerified}
                onChange={(e) => setIsEmailVerified(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-blue-600 rounded-sm cursor-pointer"
              />
              <span>
                J'ai vérifié et validé l'exactitude des kilomètres ({totalKms} km) et de tous mes tickets pour le mois de {monthName}.
              </span>
            </label>

            {/* 4. ACTIONS */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsSendEmailModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>

              <button
                onClick={handleDownloadPdf}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Télécharger le PDF</span>
              </button>

              <a
                href={prepareMailtoLink()}
                onClick={() => {
                  if (!isEmailVerified) {
                    alert('Veuillez cocher la case confirmant la vérification de vos frais.');
                    return false;
                  }
                  // Automatically download PDF so the user can easily attach it
                  handleDownloadPdf();
                  setIsSendEmailModalOpen(false);
                }}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md shadow-emerald-500/20 inline-flex items-center justify-center gap-2 transition-all ${
                  isEmailVerified
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-emerald-600/60 cursor-not-allowed'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Ouvrir l'e-mail pré-rempli & Joindre PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

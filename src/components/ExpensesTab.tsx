import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Receipt,
  Car,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Search,
  Sparkles,
  RefreshCw,
  X,
  Eye,
  CreditCard,
  Euro,
  ClipboardPaste,
  Filter,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { ExpenseItem, ExpenseCategory, Mission, UserProfile, MileageAllowance } from '../types';
import { OperaFicheDeFrais } from './OperaFicheDeFrais';

interface ExpensesTabProps {
  expenses: ExpenseItem[];
  missions: Mission[];
  profile: UserProfile;
  onAddExpense: (expense: ExpenseItem) => void;
  onUpdateExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  missions,
  profile,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  // Navigation inside Expenses tab
  const [subTab, setSubTab] = useState<'fiche_opera' | 'receipts' | 'mileage' | 'export'>('fiche_opera');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Processing & Modals
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isPasteTextModalOpen, setIsPasteTextModalOpen] = useState(false);
  const [pastedEmailContent, setPastedEmailContent] = useState('');
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Mileage rate per kilometer (default standard French fiscal scale for 5-7 CV: 0.60 €)
  const [mileageRate, setMileageRate] = useState<number>(0.60);

  // Hidden inputs for camera and file upload
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category labels and badges
  const categoryLabels: Record<ExpenseCategory, { label: string; color: string }> = {
    peage: { label: 'Péage', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300' },
    carburant: { label: 'Carburant', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' },
    repas: { label: 'Repas', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' },
    hebergement: { label: 'Hôtel / Nuitée', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300' },
    transport: { label: 'Train / Taxi / VTC', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300' },
    parking: { label: 'Parking', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300' },
    fournitures: { label: 'Fournitures', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300' },
    autre: { label: 'Autre dépense', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract only the base64 portion
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process receipt image (from camera or upload)
  const handleImageSelected = async (file: File) => {
    setIsProcessing(true);
    setProcessStatus('Lecture de la photo et analyse IA du ticket...');
    try {
      const base64Data = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      const res = await fetch('/api/gemini/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          availableMissions: missions.map((m) => ({
            id: m.id,
            startDate: m.startDate,
            city: m.city,
            title: m.title,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de l\'analyse du ticket');
      }

      const extracted = await res.json();

      // Find matching mission
      const matchedMission = extracted.suggestedMissionId
        ? missions.find((m) => m.id === extracted.suggestedMissionId)
        : missions.find((m) => m.startDate === extracted.date);

      const newExpense: ExpenseItem = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: extracted.date || new Date().toISOString().slice(0, 10),
        merchant: extracted.merchant || 'Commerçant',
        category: (extracted.category as ExpenseCategory) || 'autre',
        description: extracted.description || '',
        amountTTC: Number(extracted.amountTTC) || 0,
        amountHT: extracted.amountHT ? Number(extracted.amountHT) : undefined,
        vatAmount: extracted.vatAmount ? Number(extracted.vatAmount) : undefined,
        vatRate: extracted.vatRate ? Number(extracted.vatRate) : undefined,
        currency: 'EUR',
        paymentMethod: extracted.paymentMethod || 'cb',
        receiptImageUrl: `data:${mimeType};base64,${base64Data}`,
        receiptFileName: file.name,
        missionId: matchedMission?.id,
        missionTitle: matchedMission?.title,
        city: matchedMission?.city,
        status: 'validated',
        createdAt: new Date().toISOString(),
        source: 'photo_scan',
      };

      onAddExpense(newExpense);
      setSuccessNotification(
        `Ticket ajouté ! ${newExpense.merchant} • ${newExpense.amountTTC.toFixed(2)} € (${categoryLabels[newExpense.category]?.label})`
      );
      setTimeout(() => setSuccessNotification(null), 6000);
    } catch (err: any) {
      alert(`Impossible d'analyser le ticket : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  // Process pasted email text
  const handleExtractFromPastedEmail = async () => {
    if (!pastedEmailContent.trim()) return;

    setIsProcessing(true);
    setProcessStatus('Analyse du texte du courriel par intelligence artificielle...');
    try {
      const res = await fetch('/api/gemini/extract-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: pastedEmailContent,
          availableMissions: missions.map((m) => ({
            id: m.id,
            startDate: m.startDate,
            city: m.city,
            title: m.title,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de l\'extraction de la facture/e-mail');
      }

      const extracted = await res.json();
      const matchedMission = extracted.suggestedMissionId
        ? missions.find((m) => m.id === extracted.suggestedMissionId)
        : missions.find((m) => m.startDate === extracted.date);

      const newExpense: ExpenseItem = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: extracted.date || new Date().toISOString().slice(0, 10),
        merchant: extracted.merchant || 'Fournisseur',
        category: (extracted.category as ExpenseCategory) || 'autre',
        description: extracted.description || '',
        amountTTC: Number(extracted.amountTTC) || 0,
        amountHT: extracted.amountHT ? Number(extracted.amountHT) : undefined,
        vatAmount: extracted.vatAmount ? Number(extracted.vatAmount) : undefined,
        vatRate: extracted.vatRate ? Number(extracted.vatRate) : undefined,
        currency: 'EUR',
        paymentMethod: extracted.paymentMethod || 'cb',
        missionId: matchedMission?.id,
        missionTitle: matchedMission?.title,
        city: matchedMission?.city,
        status: 'validated',
        createdAt: new Date().toISOString(),
        source: 'email_extract',
      };

      onAddExpense(newExpense);
      setPastedEmailContent('');
      setIsPasteTextModalOpen(false);
      setSuccessNotification(
        `Dépense enregistrée depuis l'e-mail ! ${newExpense.merchant} • ${newExpense.amountTTC.toFixed(2)} €`
      );
      setTimeout(() => setSuccessNotification(null), 6000);
    } catch (err: any) {
      alert(`Erreur : ${err.message || 'Impossible d\'analyser le texte'}`);
    } finally {
      setIsProcessing(false);
      setProcessStatus('');
    }
  };

  // Filtered expenses list
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      searchTerm === '' ||
      exp.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.city && exp.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || exp.category === selectedCategory;

    const matchesMonth =
      selectedMonth === 'all' || exp.date.startsWith(selectedMonth);

    return matchesSearch && matchesCat && matchesMonth;
  });

  // Calculate totals
  const totalTTC = filteredExpenses.reduce((sum, e) => sum + (e.amountTTC || 0), 0);
  const totalVAT = filteredExpenses.reduce((sum, e) => sum + (e.vatAmount || 0), 0);
  const totalHT = filteredExpenses.reduce((sum, e) => sum + (e.amountHT || (e.amountTTC - (e.vatAmount || 0))), 0);

  // Calculate mileage allowance from missions (aller-retour)
  const mileageAllowances: MileageAllowance[] = missions.map((m) => {
    // Estimating distance round-trip: if single trip distance is in m.customDistanceKm or m.distanceKm, double it for A/R
    const singleDist = m.customDistanceKm || m.distanceKm;
    const distanceKm = singleDist ? Math.round(singleDist * 2) : 50;
    const totalAmount = Math.round(distanceKm * mileageRate * 100) / 100;
    return {
      missionId: m.id,
      date: m.startDate,
      missionTitle: m.title,
      city: m.city,
      distanceKm,
      ratePerKm: mileageRate,
      totalAmount,
    };
  });

  const totalMileageKm = mileageAllowances.reduce((sum, m) => sum + m.distanceKm, 0);
  const totalMileageAmount = mileageAllowances.reduce((sum, m) => sum + m.totalAmount, 0);
  const grandTotal = totalTTC + totalMileageAmount;

  // Export to CSV format (compatible with Excel)
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Commercant / Fournisseur',
      'Categorie',
      'Description',
      'Montant TTC (EUR)',
      'Montant HT (EUR)',
      'TVA (EUR)',
      'Taux TVA (%)',
      'Paiement',
      'Mission rattachee',
      'Ville',
      'Justificatif',
    ];

    const rows = filteredExpenses.map((e) => [
      `"${e.date}"`,
      `"${e.merchant.replace(/"/g, '""')}"`,
      `"${categoryLabels[e.category]?.label || e.category}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amountTTC.toFixed(2),
      (e.amountHT || 0).toFixed(2),
      (e.vatAmount || 0).toFixed(2),
      e.vatRate || '',
      e.paymentMethod || 'cb',
      `"${(e.missionTitle || '').replace(/"/g, '""')}"`,
      `"${(e.city || '').replace(/"/g, '""')}"`,
      e.receiptImageUrl ? 'OUI' : 'NON',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Notes_de_Frais_${profile.initials || 'Formateur'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Hidden file and camera inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelected(file);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelected(file);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Header and Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Notes de Frais & Justificatifs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Photographiez vos tickets, importez vos factures de déplacement et suivez vos indemnités kilométriques
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Camera Photo (Primary mobile action) */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Photographier un ticket</span>
          </button>

          {/* 2. Upload file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importer image / PDF</span>
          </button>

          {/* 3. Paste Email */}
          <button
            onClick={() => setIsPasteTextModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <ClipboardPaste className="w-4 h-4 text-purple-500" />
            <span>Coller e-mail / facture</span>
          </button>

          {/* 4. Manual entry */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsManualModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Saisie manuelle</span>
          </button>
        </div>
      </div>

      {/* AI Processing Banner */}
      {isProcessing && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-blue-900 dark:text-blue-200">Intelligence Artificielle en action...</p>
            <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-0.5">{processStatus}</p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">{successNotification}</span>
          </div>
          <button onClick={() => setSuccessNotification(null)} className="p-1 hover:bg-emerald-100 rounded-sm">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total TTC */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Frais TTC (Justificatifs)</span>
            <Euro className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalTTC.toFixed(2)} €
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Dont {totalVAT.toFixed(2)} € de TVA récupérable
          </p>
        </div>

        {/* Indemnités Kilométriques */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Indemnités Kilométriques (IK)</span>
            <Car className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalMileageAmount.toFixed(2)} €
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {totalMileageKm} km parcourus ({mileageRate.toFixed(2)} €/km)
          </p>
        </div>

        {/* Total Général Remboursable */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
          <div className="flex items-center justify-between text-blue-100 text-xs font-semibold">
            <span>Total Général Remboursable</span>
            <CheckCircle2 className="w-4 h-4 text-blue-200" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            {grandTotal.toFixed(2)} €
          </p>
          <p className="text-[11px] text-blue-100 mt-0.5">
            Frais réels + barème kilométrique
          </p>
        </div>

        {/* Nombre de reçus */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Justificatifs enregistrés</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {filteredExpenses.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {filteredExpenses.filter((e) => e.receiptImageUrl).length} avec photo attachée
          </p>
        </div>
      </div>

      {/* Sub-tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 sm:gap-6 text-xs font-bold overflow-x-auto pb-1">
        <button
          onClick={() => setSubTab('fiche_opera')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            subTab === 'fiche_opera'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Fiche de Frais Opéra (Modèle PDF/Excel)</span>
        </button>

        <button
          onClick={() => setSubTab('receipts')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            subTab === 'receipts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Tickets & Factures ({filteredExpenses.length})</span>
        </button>

        <button
          onClick={() => setSubTab('mileage')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            subTab === 'mileage'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Indemnités Kilométriques ({mileageAllowances.length} trajets)</span>
        </button>

        <button
          onClick={() => setSubTab('export')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            subTab === 'export'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* SUBTAB 0: OFFICIAL OPÉRA FORMATION FICHE DE FRAIS */}
      {subTab === 'fiche_opera' && (
        <OperaFicheDeFrais
          missions={missions}
          expenses={expenses}
          profile={profile}
        />
      )}

      {/* SUBTAB 1: RECEIPTS & TICKETS */}
      {subTab === 'receipts' && (
        <div className="space-y-4">
          {/* Search and Category Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par commerçant, lieu, description..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">Toutes les catégories</option>
                <option value="peage">Péage</option>
                <option value="carburant">Carburant</option>
                <option value="repas">Repas</option>
                <option value="hebergement">Hôtel</option>
                <option value="transport">Transport</option>
                <option value="parking">Parking</option>
                <option value="fournitures">Fournitures</option>
                <option value="autre">Autre</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                title="Exporter les dépenses au format CSV pour Excel"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* List of Expenses */}
          {filteredExpenses.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shadow-xs">
                <Receipt className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  Aucun ticket ou frais enregistré
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prenez en photo votre premier reçu avec votre smartphone ou collez le texte d'un billet/facture reçu par mail.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Prendre en photo mon premier ticket</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((expense) => {
                const cat = categoryLabels[expense.category] || categoryLabels.autre;
                return (
                  <div
                    key={expense.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-start gap-3">
                      {expense.receiptImageUrl ? (
                        <button
                          onClick={() => setPreviewImageModal(expense.receiptImageUrl || null)}
                          className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0 group relative cursor-pointer"
                          title="Agrandir la photo du ticket"
                        >
                          <img
                            src={expense.receiptImageUrl}
                            alt={expense.merchant}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {expense.merchant}
                          </h4>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${cat.color}`}>
                            {cat.label}
                          </span>
                          {expense.source === 'photo_scan' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> IA
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            {expense.date}
                          </span>
                          {expense.city && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                {expense.city}
                              </span>
                            </>
                          )}
                          {expense.paymentMethod && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{expense.paymentMethod.replace('_', ' ')}</span>
                            </>
                          )}
                        </div>

                        {expense.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {expense.description}
                          </p>
                        )}

                        {expense.missionTitle && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                            Mission : {expense.missionTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Amounts & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {expense.amountTTC.toFixed(2)} €
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {expense.vatAmount
                            ? `TVA ${expense.vatRate || ''}% : ${expense.vatAmount.toFixed(2)} €`
                            : 'TVA non spécifiée'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingExpense(expense);
                            setIsManualModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer le ticket « ${expense.merchant} » (${expense.amountTTC.toFixed(2)} €) ?`)) {
                              onDeleteExpense(expense.id);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MILEAGE ALLOWANCE (IK) */}
      {subTab === 'mileage' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-600" />
                  <span>Calcul des Indemnités Kilométriques (Trajets A/R Formations)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculé automatiquement à partir des adresses de vos missions de formation et de votre barème kilométrique
                </p>
              </div>

              {/* Editable Rate */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Taux fiscal :</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  max="2.00"
                  value={mileageRate}
                  onChange={(e) => setMileageRate(parseFloat(e.target.value) || 0.60)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-right"
                />
                <span className="text-xs font-bold text-slate-500">€ / km</span>
              </div>
            </div>

            {/* Mileage List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {mileageAllowances.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{m.missionTitle}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                        Aller-Retour
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>{m.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-rose-500" /> {m.city}
                      </span>
                      <span>•</span>
                      <span>Distance estimée : <strong>{m.distanceKm} km</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      +{m.totalAmount.toFixed(2)} €
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {m.distanceKm} km × {m.ratePerKm.toFixed(2)} €
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
              <span>Total Indemnités Kilométriques :</span>
              <span className="text-base text-emerald-600 dark:text-emerald-400">
                {totalMileageAmount.toFixed(2)} € ({totalMileageKm} km)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: EXPORT EXCEL & COMPTABILITÉ */}
      {subTab === 'export' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Export Comptable & Modèle Excel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Téléchargez l'ensemble de vos justificatifs et calculs de frais au format CSV/Excel.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Prêt pour votre modèle Excel personnalisé</span>
            </p>
            <p className="mt-1">
              Dès que vous fournirez votre modèle Excel de note de frais spécifique, l'application pourra injecter directement ces données dans les cases correspondantes de votre fichier.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 inline-flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le relevé CSV (ouvrable dans Excel)</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: PREVIEW RECEIPT IMAGE FULL SCREEN */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl p-3 overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageModal}
              alt="Reçu en plein écran"
              className="max-h-[80vh] w-auto mx-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* MODAL 2: PASTE EMAIL / INVOICE TEXT */}
      {isPasteTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Coller le texte d'un e-mail de frais
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPasteTextModalOpen(false);
                  setPastedEmailContent('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Collez ici le courriel de confirmation d'un billet de train SNCF, d'une course Uber, d'une nuit d'hôtel ou d'une commande de matériel. L'IA extrait le commerçant, la date, le montant TTC et la TVA.
            </p>

            <textarea
              rows={8}
              value={pastedEmailContent}
              onChange={(e) => setPastedEmailContent(e.target.value)}
              placeholder={`Exemple :\nConfirmation de commande SNCF Connect\nBillet TGV Inoui Paris - Montpellier\nDate du voyage : 28/10/2026\nMontant total TTC : 67,50 € dont TVA 10% (6,14 €)...\n`}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsPasteTextModalOpen(false);
                  setPastedEmailContent('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={handleExtractFromPastedEmail}
                disabled={!pastedEmailContent.trim() || isProcessing}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyse IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extraire et enregistrer la dépense</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANUAL EXPENSE ADD / EDIT */}
      {isManualModalOpen && (
        <ExpenseManualModal
          isOpen={true}
          expense={editingExpense}
          missions={missions}
          onClose={() => {
            setIsManualModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={(savedExpense) => {
            if (editingExpense) {
              onUpdateExpense(savedExpense);
            } else {
              onAddExpense(savedExpense);
            }
            setIsManualModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
};

// Subcomponent: Manual Add/Edit Modal
interface ExpenseManualModalProps {
  isOpen: boolean;
  expense: ExpenseItem | null;
  missions: Mission[];
  onClose: () => void;
  onSave: (expense: ExpenseItem) => void;
}

const ExpenseManualModal: React.FC<ExpenseManualModalProps> = ({
  isOpen,
  expense,
  missions,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<ExpenseItem>>(
    expense || {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      merchant: '',
      category: 'repas',
      description: '',
      amountTTC: 0,
      amountHT: 0,
      vatAmount: 0,
      vatRate: 20,
      currency: 'EUR',
      paymentMethod: 'cb',
      status: 'validated',
      createdAt: new Date().toISOString(),
      source: 'manual',
    }
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {expense ? 'Modifier la dépense' : 'Ajouter un frais manuellement'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Commerçant / Fournisseur *
            </label>
            <input
              type="text"
              value={form.merchant || ''}
              onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              placeholder="Ex: TotalEnergies, Vinci Autoroutes, Brasserie de la Gare"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="peage">Péage</option>
                <option value="carburant">Carburant</option>
                <option value="repas">Repas</option>
                <option value="hebergement">Hôtel / Hébergement</option>
                <option value="transport">Train / Taxi / VTC</option>
                <option value="parking">Parking</option>
                <option value="fournitures">Fournitures</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Montant TTC (€) *</label>
              <input
                type="number"
                step="0.01"
                value={form.amountTTC || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setForm({ ...form, amountTTC: val });
                }}
                className="w-full px-3 py-2 rounded-xl border border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-xs font-black text-blue-900 dark:text-blue-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Montant TVA (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.vatAmount || ''}
                onChange={(e) => setForm({ ...form, vatAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Paiement</label>
              <select
                value={form.paymentMethod || 'cb'}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="cb">Carte Bancaire (CB)</option>
                <option value="especes">Espèces</option>
                <option value="carte_societe">Carte Société</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Motif</label>
            <input
              type="text"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Déjeuner formateur, péage retour Montpellier"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mission rattachée (optionnel)</label>
            <select
              value={form.missionId || ''}
              onChange={(e) => {
                const id = e.target.value;
                const m = missions.find((x) => x.id === id);
                setForm({
                  ...form,
                  missionId: id || undefined,
                  missionTitle: m?.title,
                  city: m?.city,
                });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            >
              <option value="">Aucune mission rattachée</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.startDate} - {m.title} ({m.city})
                </option>
              ))}
            </select>
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
              if (!form.merchant || form.amountTTC === undefined || form.amountTTC <= 0) {
                alert('Veuillez préciser le commerçant et un montant TTC supérieur à 0.');
                return;
              }
              onSave(form as ExpenseItem);
            }}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
          >
            Enregistrer le frais
          </button>
        </div>
      </div>
    </div>
  );
};

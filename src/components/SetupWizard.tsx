import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  User,
  AlarmClock,
  Mic,
  Compass,
  Car,
  Train,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile, GoogleAuthState, TransportMode } from '../types';
import { googleSignIn } from '../services/auth';

interface SetupWizardProps {
  initialProfile: UserProfile;
  authState: GoogleAuthState;
  onComplete: (profile: UserProfile) => void;
  onClose?: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  initialProfile,
  authState,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<number>(1);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleConnect = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await googleSignIn();
    } catch (err: any) {
      setLoginError(err.message || 'Impossible de finaliser la connexion Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    const updated = { ...profile, setupCompleted: true };
    onComplete(updated);
  };

  const toggleDay = (day: number) => {
    const current = profile.workingDays || [1, 2, 3, 4, 5];
    if (current.includes(day)) {
      setProfile({ ...profile, workingDays: current.filter((d) => d !== day) });
    } else {
      setProfile({ ...profile, workingDays: [...current, day].sort() });
    }
  };

  const toggleTheme = (theme: string) => {
    const current = profile.favoriteQuoteThemes || [];
    if (current.includes(theme)) {
      setProfile({ ...profile, favoriteQuoteThemes: current.filter((t) => t !== theme) });
    } else {
      setProfile({ ...profile, favoriteQuoteThemes: [...current, theme] });
    }
  };

  const daysLabels = [
    { num: 1, label: 'Lun' },
    { num: 2, label: 'Mar' },
    { num: 3, label: 'Mer' },
    { num: 4, label: 'Jeu' },
    { num: 5, label: 'Ven' },
    { num: 6, label: 'Sam' },
    { num: 7, label: 'Dim' },
  ];

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Wizard Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-6 h-6 animate-spin-slow" />
              <span className="font-bold tracking-tight text-lg">Daily Pilot — Configuration</span>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold backdrop-blur-xs">
              Étape {step} sur 5
            </span>
          </div>

          <p className="text-sm text-blue-100">
            {step === 1 && 'Connexion à vos services Google'}
            {step === 2 && 'Votre profil et vos habitudes de trajet'}
            {step === 3 && 'Vos préférences de réveil et de sécurité'}
            {step === 4 && 'Personnalisation de votre assistant vocal'}
            {step === 5 && 'Récapitulatif et validation de votre configuration'}
          </p>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-5 gap-1.5 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* STEP 1: Google Connection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    Authentification Google Sécurisée
                  </p>
                  Pour synchroniser vos missions et vos trajets, Daily Pilot se connecte avec votre compte Google (Gmail pour extraire les convocations, Google Agenda pour vos plannings, et Drive pour vos documents).
                </div>
              </div>

              {/* Real Connection Status */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    État de connexion
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      authState.isConnected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {authState.isConnected ? 'Connecté' : 'Non connecté'}
                  </span>
                </div>

                {authState.isConnected ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <p className="text-slate-700 dark:text-slate-300">
                      Compte associé : <span className="font-semibold text-blue-600 dark:text-blue-400">{authState.userEmail}</span>
                    </p>
                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Google Agenda : Événements de formation</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Gmail : Recherche des convocations</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Google Drive : Accès aux supports pédagogiques</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      onClick={handleGoogleConnect}
                      disabled={isLoggingIn}
                      className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-3 shadow-xs transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      {isLoggingIn ? 'Connexion en cours...' : 'Se connecter avec Google'}
                    </button>
                    {loginError && (
                      <p className="mt-2 text-xs text-rose-500 font-medium">{loginError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: User Profile & Travel parameters */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prénom ou nom professionnel
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Ex: Formateur SH"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mes initiales de planning (ex: SH)
                  </label>
                  <input
                    type="text"
                    value={profile.initials || ''}
                    onChange={(e) => setProfile({ ...profile, initials: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40 text-sm font-black uppercase text-blue-900 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Ex: SH"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ville de résidence (Domicile)
                  </label>
                  <input
                    type="text"
                    value={profile.homeCity}
                    onChange={(e) => setProfile({ ...profile, homeCity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="Ex: Montpellier"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Moyen de transport principal
                  </label>
                  <select
                    value={profile.mainTransport}
                    onChange={(e) => setProfile({ ...profile, mainTransport: e.target.value as TransportMode })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="car">Voiture individuelle</option>
                    <option value="train">Train / TER / TGV</option>
                    <option value="carpooling">Covoiturage</option>
                    <option value="public_transit">Transports urbains</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse exacte du domicile (pour le calcul précis des départs)
                </label>
                <input
                  type="text"
                  value={profile.homeAddress}
                  onChange={(e) => setProfile({ ...profile, homeAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  placeholder="Ex: 14 Rue du Faubourg du Courreau, 34000 Montpellier"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Heure début habituelle
                  </label>
                  <input
                    type="time"
                    value={profile.defaultStartTime}
                    onChange={(e) => setProfile({ ...profile, defaultStartTime: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Heure de coucher habituelle
                  </label>
                  <input
                    type="time"
                    value={profile.bedTime || '23:00'}
                    onChange={(e) => setProfile({ ...profile, bedTime: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              {/* Tolls and routes preferences */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Éviter les autoroutes à péage
                </span>
                <input
                  type="checkbox"
                  checked={profile.avoidTolls}
                  onChange={(e) => setProfile({ ...profile, avoidTolls: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Wake-up preferences */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Temps de préparation le matin
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={profile.prepDurationMinutes}
                      onChange={(e) => setProfile({ ...profile, prepDurationMinutes: parseInt(e.target.value) || 30 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                    <span className="text-xs font-semibold text-slate-500">min</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Marge de sécurité trajet
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={profile.safetyMarginMinutes}
                      onChange={(e) => setProfile({ ...profile, safetyMarginMinutes: parseInt(e.target.value) || 15 })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                    <span className="text-xs font-semibold text-slate-500">min</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Heure minimale souhaitée de réveil
                </label>
                <input
                  type="time"
                  value={profile.minWakeUpTime}
                  onChange={(e) => setProfile({ ...profile, minWakeUpTime: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  En cas d'intervention très éloignée, Daily Pilot vous préviendra si un départ plus précoce est requis.
                </p>
              </div>

              {/* Working days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Jours travaillés habituels
                </label>
                <div className="flex gap-2">
                  {daysLabels.map((d) => {
                    const isSelected = profile.workingDays.includes(d.num);
                    return (
                      <button
                        key={d.num}
                        type="button"
                        onClick={() => toggleDay(d.num)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Traffic alerts */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Recevoir les alertes de circulation en temps réel
                </span>
                <input
                  type="checkbox"
                  checked={profile.allowTrafficAlerts}
                  onChange={(e) => setProfile({ ...profile, allowTrafficAlerts: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Assistant Preferences */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Niveau de détail des réponses vocales
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, detailLevel: 'compact' })}
                    className={`p-3 text-xs font-semibold rounded-xl border text-left transition-all ${
                      profile.detailLevel === 'compact'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="font-bold">Synthétique (Recommandé)</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Points essentiels, départ et météo rapide</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, detailLevel: 'detailed' })}
                    className={`p-3 text-xs font-semibold rounded-xl border text-left transition-all ${
                      profile.detailLevel === 'detailed'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="font-bold">Détaillé</p>
                    <p className="text-[11px] opacity-80 mt-0.5">Contacts, matériel et itinéraire pas à pas</p>
                  </button>
                </div>
              </div>

              {/* Motivational Quote Themes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Thèmes de motivation favoris
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableQuoteThemes.map((th) => {
                    const isSelected = profile.favoriteQuoteThemes.includes(th);
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

              {/* Spiritual Option: Hadith quotidien */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Hadith quotidien authentique (Optionnel)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile.hadithEnabled}
                    onChange={(e) => setProfile({ ...profile, hadithEnabled: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Présentation chaque matin d'un hadith authentique vérifié (Sahih Bukhari, Muslim...) avec source, numéro et courte réflexion éthique.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Summary & Confirmation */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Récapitulatif de vos paramètres
                </h4>

                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 block">Formateur :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ville de résidence :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.homeCity}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Transport :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{profile.mainTransport}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Préparation matin :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.prepDurationMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Marge de sécurité :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.safetyMarginMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Réveil minimal :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{profile.minWakeUpTime}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  <p>Compte Google : {authState.isConnected ? authState.userEmail : 'Mode autonome / fichiers manuels'}</p>
                  <p>Hadith quotidien : {profile.hadithEnabled ? 'Activé' : 'Désactivé'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Vous pourrez ajuster ces préférences à tout moment dans l'onglet Réglages.</span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédent</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Démarrer Daily Pilot</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

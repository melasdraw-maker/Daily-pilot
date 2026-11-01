import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Sparkles,
  ExternalLink,
  Laptop,
  Check,
  AlertCircle,
  Copy,
  FileCode,
  Globe,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkInstallModal: React.FC<ApkInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSharedLink, setCopiedSharedLink] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'pwabuilder' | 'manifest'>('direct');

  if (!isOpen) return null;

  const currentDevUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-dev-...';
  const sharedAppUrl = 'https://ais-pre-anbberwkkigrmwfwuzcguv-612678977825.europe-west3.run.app';

  const manifestJsonString = JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/web-manifest-combined.json',
      id: '/',
      name: 'Daily Pilot - Mon Assistant Personnel Intelligent',
      short_name: 'Daily Pilot',
      description:
        'Assistant personnel intelligent pour formateurs et intervenants mobiles : organisation des missions, trajets, réveil intelligent, briefing vocal et préparation pédagogique.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      orientation: 'portrait',
      background_color: '#0f172a',
      theme_color: '#2563eb',
      lang: 'fr-FR',
      dir: 'ltr',
      categories: ['productivity', 'business', 'utilities'],
      prefer_related_applications: false,
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'any',
        },
      ],
      screenshots: [
        {
          src: '/screenshot-mobile-1.jpg',
          sizes: '1080x2400',
          type: 'image/jpeg',
          form_factor: 'narrow',
          label: 'Tableau de bord et missions du jour',
        },
        {
          src: '/screenshot-mobile-2.jpg',
          sizes: '1080x2400',
          type: 'image/jpeg',
          form_factor: 'wide',
          label: 'Planning hebdomadaire et réveil intelligent',
        },
      ],
      shortcuts: [
        {
          name: 'Missions du jour',
          short_name: 'Missions',
          description: 'Consulter les formations du jour et itinéraire',
          url: '/',
          icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
        },
        {
          name: 'Réveil Intelligent',
          short_name: 'Réveil',
          description: 'Calcul automatique heure de levée et alarme',
          url: '/?tab=wakeup',
          icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
        },
        {
          name: 'Planning Hebdo',
          short_name: 'Planning',
          description: 'Gérer le calendrier et convocations',
          url: '/?tab=planning',
          icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
        },
      ],
    },
    null,
    2
  );

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadManifest = () => {
    const blob = new Blob([manifestJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/50 dark:from-slate-800/80 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Installer l'APK sur Téléphone
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  Android & WebAPK
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                2 solutions simples pour avoir l'application sur votre smartphone
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
            onClick={() => setActiveTab('direct')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'direct'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Option 1 : Direct sur Téléphone (Sans PWABuilder)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwabuilder')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'pwabuilder'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Option 2 : PWABuilder (Fichier .apk)</span>
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'manifest'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4 text-emerald-500" />
            <span>Code Manifest JSON</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: INSTALLATION DIRECTE SUR TÉLÉPHONE (LE PLUS SIMPLE) */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Méthode Recommandée (Aucun outil requis)</span>
                  </span>
                  <h3 className="font-black text-lg">
                    Installer directement sur Android via Chrome
                  </h3>
                  <p className="text-xs text-emerald-100 leading-relaxed">
                    Sur Android, Google Chrome compile lui-même un <strong>WebAPK officiel</strong> avec icône personnalisée sur votre écran d'accueil et dans votre tiroir d'applications, sans avoir besoin de passer par PWABuilder !
                  </p>
                </div>

                {isInstallable ? (
                  <button
                    onClick={handleTriggerInstall}
                    className="w-full py-3 px-4 rounded-2xl bg-white text-emerald-800 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-emerald-50 active:scale-[0.98] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Installer maintenant sur mon téléphone</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs text-xs space-y-2 text-white">
                    <p className="font-bold flex items-center gap-1.5 text-amber-200">
                      <span>Comment faire en 3 secondes depuis votre téléphone :</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-50">
                      <li>Ouvrez l'application sur Google Chrome sur votre téléphone</li>
                      <li>Touchez le menu <strong>⋮ (les 3 points en haut à droite)</strong></li>
                      <li>Touchez <strong>« Installer l'application »</strong> (ou <em>Ajouter à l'écran d'accueil</em>)</li>
                      <li>Touchez <strong>Installer</strong> : l'APK est généré instantanément sur votre téléphone !</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Shared Link to open on mobile */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-3">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Adresse publique à ouvrir sur votre smartphone :</span>
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">
                      URL Publique Partagée (Recommandée pour mobile & PWABuilder) :
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={sharedAppUrl}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono truncate"
                      />
                      <button
                        onClick={() => handleCopy(sharedAppUrl, setCopiedSharedLink)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        {copiedSharedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSharedLink ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWABUILDER INSTRUCTIONS (RÉSOLUTION DE VOTRE CAPTURE D'ÉCRAN) */}
          {activeTab === 'pwabuilder' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
                  <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Pourquoi PWABuilder a affiché « Missing Name » sur votre capture :</span>
                </div>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  PWABuilder a effectué un test automatique avant que la réponse n'arrive (« timed out »). Deux solutions très simples pour finaliser votre APK :
                </p>
              </div>

              {/* Solution A: Edit Your Manifest */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2.5">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                  Solution A : En 1 clic dans PWABuilder
                </span>
                <p className="font-bold text-slate-900 dark:text-white">
                  1. Cliquez sur le bouton bleu « Edit Your Manifest » visible sur votre capture
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Dans la fenêtre qui s'ouvre, collez le code Manifest JSON complet (disponible dans l'onglet « Code Manifest JSON » ci-dessus) ou cliquez sur le bouton ci-dessous pour le copier :
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(manifestJsonString, setCopiedManifest)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    {copiedManifest ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedManifest ? 'Manifest copié dans le presse-papier !' : 'Copier tout le Manifest JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownloadManifest}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Télécharger manifest.json</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  2. Cliquez sur <strong>« Save »</strong> dans PWABuilder, puis sur le bouton <strong>« Package For Stores »</strong> (en haut de votre capture) pour télécharger le package APK Android !
                </p>
              </div>

              {/* Solution B: Retest with Shared Public URL */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-2.5">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                  Solution B : Relancer le test avec l'URL Publique Partagée
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  L'URL de développement peut bloquer les robots de test. Utilisez l'URL partagée suivante qui autorise les requêtes sans authentification :
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sharedAppUrl}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                  />
                  <button
                    onClick={() => handleCopy(sharedAppUrl, setCopiedSharedLink)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
                  >
                    {copiedSharedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSharedLink ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <div className="pt-1">
                  <a
                    href={`https://www.pwabuilder.com/report?url=${encodeURIComponent(sharedAppUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    <span>Lancer le test PWABuilder avec l'URL Partagée</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CODE MANIFEST COMPLET */}
          {activeTab === 'manifest' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    Fichier manifest.json officiel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Contient le nom, la description, les icônes, les captures et les raccourcis
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(manifestJsonString, setCopiedManifest)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                  >
                    {copiedManifest ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedManifest ? 'Copié !' : 'Copier'}</span>
                  </button>
                  <button
                    onClick={handleDownloadManifest}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Télécharger</span>
                  </button>
                </div>
              </div>

              <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto max-h-72 border border-slate-800">
                {manifestJsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Serveur avec CORS activé pour PWABuilder</span>
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

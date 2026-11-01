import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Building, UserCheck, Car, ExternalLink } from 'lucide-react';
import { Mission } from '../types';

interface MissionEditModalProps {
  isOpen?: boolean;
  mission: Mission | null;
  defaultInitials?: string;
  onSave: (mission: Mission) => void;
  onClose: () => void;
}

export const MissionEditModal: React.FC<MissionEditModalProps> = ({
  isOpen = true,
  mission,
  defaultInitials = '',
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;
  const [form, setForm] = useState<Partial<Mission>>(
    mission || {
      id: `m-custom-${Date.now()}`,
      title: '',
      client: '',
      category: 'echafaudages',
      trainerInitials: defaultInitials,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      startTime: '08:30',
      endTime: '16:30',
      city: '',
      address: '',
      contactName: '',
      contactPhone: '',
      parkingInfo: '',
      materials: ['EPI de base'],
      documents: ['Livret de formation.pdf'],
      notes: '',
      status: 'valid',
      confidence: 'high',
      confidenceNotes: 'Saisie manuelle formateur',
      source: 'Saisie personnalisée',
      lastModified: new Date().toISOString(),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.city) {
      alert('Veuillez renseigner au moins l\'intitulé de la formation et la ville.');
      return;
    }
    onSave(form as Mission);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {mission ? 'Modifier la mission' : 'Ajouter une mission à mon planning'}
            </h3>
            <p className="text-xs text-slate-500">
              Intervenant : <span className="font-bold text-blue-600">{form.trainerInitials || defaultInitials}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Intitulé de la formation
            </label>
            <input
              type="text"
              required
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              placeholder="Ex: Échafaudages R408 ou Habilitation B1V"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client / Organisme
              </label>
              <input
                type="text"
                value={form.client || ''}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="Ex: CFA Occitanie / Eiffage"
              />
            </div>
            <div>
              <label className="block font-bold text-blue-700 dark:text-blue-400 mb-1">
                Initiales formateur
              </label>
              <input
                type="text"
                value={form.trainerInitials || ''}
                onChange={(e) => setForm({ ...form, trainerInitials: e.target.value.toUpperCase() })}
                placeholder={defaultInitials || "Initiales"}
                maxLength={6}
                className="w-full px-3 py-2 rounded-xl border-2 border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40 text-xs font-black uppercase text-blue-900 dark:text-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Thématique</label>
            <select
              value={form.category || 'echafaudages'}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="echafaudages">Échafaudages (R408 / R457)</option>
              <option value="prevention">Prévention des risques & SST</option>
              <option value="securite">Sécurité CACES R489</option>
              <option value="technique">Habilitation Électrique (B1V, BR)</option>
              <option value="autre">Autre thématique</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.startDate || ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Début</label>
                <input
                  type="time"
                  required
                  value={form.startTime || '08:30'}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fin</label>
                <input
                  type="time"
                  required
                  value={form.endTime || '16:30'}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ville</label>
              <input
                type="text"
                required
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="Ex: Nîmes, Montpellier..."
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adresse exacte</label>
              <input
                type="text"
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="Ex: 85 Rue Forez"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="Ex: Laurent Martin"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.contactPhone || ''}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="06 ..."
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Stationnement & Accès</label>
            <input
              type="text"
              value={form.parkingInfo || ''}
              onChange={(e) => setForm({ ...form, parkingInfo: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              placeholder="Ex: Parking visiteurs sécurisé, code portail..."
            />
          </div>

          {/* Durée réelle du trajet Google Maps (Override précis) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                <Car className="w-4 h-4 text-amber-600" />
                <span>Temps de trajet réel (Google Maps)</span>
              </div>
              {form.address && form.city && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${form.address}, ${form.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Ouvrir Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Si vous habitez tout près (ex: à <strong>4 min</strong>), renseignez le temps Maps ci-dessous pour éviter les calculs théoriques d'agglomération (34 min) et recalculer vos heures de départ et de réveil au plus juste.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                  Durée exacte (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={form.customTravelDurationMin ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setForm({ ...form, customTravelDurationMin: val });
                  }}
                  placeholder="Ex: 4"
                  className="w-full px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-bold text-amber-950 dark:text-amber-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                  Distance réelle (km - optionnel)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={1000}
                  value={form.customDistanceKm ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setForm({ ...form, customDistanceKm: val });
                  }}
                  placeholder="Ex: 1.5"
                  className="w-full px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-medium mr-1">Raccourcis :</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, customTravelDurationMin: 4, customDistanceKm: 1.5 })}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  form.customTravelDurationMin === 4
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 hover:bg-amber-100/50'
                }`}
              >
                ⚡ 4 min (Maps)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, customTravelDurationMin: 10, customDistanceKm: 4 })}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  form.customTravelDurationMin === 10
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 hover:bg-amber-100/50'
                }`}
              >
                10 min
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, customTravelDurationMin: 15, customDistanceKm: 7 })}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  form.customTravelDurationMin === 15
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 hover:bg-amber-100/50'
                }`}
              >
                15 min
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, customTravelDurationMin: undefined, customDistanceKm: undefined })}
                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              >
                Calcul auto
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
            >
              Enregistrer la mission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

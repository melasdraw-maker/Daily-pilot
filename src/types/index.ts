export type TransportMode = 'car' | 'train' | 'carpooling' | 'public_transit';

export interface UserProfile {
  name: string;
  initials: string; // Trigramme ou initiales formateur
  homeAddress: string;
  workAddress?: string;
  homeCity: string;
  timezone: string;
  language: string;
  mainTransport: TransportMode;
  defaultStartTime: string; // e.g. "08:30"
  prepDurationMinutes: number; // e.g. 35
  safetyMarginMinutes: number; // e.g. 15
  avoidTolls: boolean;
  routePreference: 'fastest' | 'shortest' | 'economic';
  bedTime?: string; // e.g. "23:00"
  minWakeUpTime: string; // e.g. "06:00"
  allowTrafficAlerts: boolean;
  workingDays: number[]; // 1=Lundi, 5=Vendredi
  assistantVoice: string;
  speechRate: number; // 0.8 - 1.2
  detailLevel: 'compact' | 'detailed';
  favoriteQuoteThemes: string[];
  hadithEnabled: boolean;
  privacyMode?: boolean; // Mode protection des données sensibles (masquage téléphones/adresses)
  setupCompleted: boolean;
}

export type MissionCategory =
  | 'echafaudages'
  | 'prevention'
  | 'securite'
  | 'technique'
  | 'management'
  | 'autre';

export type MissionStatus = 'valid' | 'conflict' | 'cancelled' | 'pending';

export interface Mission {
  id: string;
  title: string;
  client: string;
  category: MissionCategory;
  trainerInitials?: string; // Initiales du formateur attitré
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  city: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  parkingInfo?: string;
  materials: string[];
  documents: string[];
  notes?: string;
  status: MissionStatus;
  confidence: 'high' | 'medium' | 'low';
  confidenceNotes?: string;
  source: string;
  lastModified: string;
  calendarEventId?: string;
  notebookLmUrl?: string;
  customTravelDurationMin?: number; // Durée réelle ajustée (ex: 4 min confirmée via Google Maps)
  customDistanceKm?: number; // Distance réelle ajustée (ex: 1.5 km)
  distanceKm?: number; // Distance estimée
}

export interface TravelCalculation {
  distanceKm: number;
  durationMinutes: number;
  durationWithTrafficMinutes?: number;
  trafficCondition: 'fluid' | 'moderate' | 'dense' | 'unknown';
  trafficReport?: string;
  departureTime: string; // HH:mm
  wakeUpTime: string; // HH:mm
  isCustomDuration?: boolean; // Vrai si le temps provient d'une confirmation Google Maps / saisie formateur
  calculationBreakdown: {
    startTime: string;
    travelMinutes: number;
    safetyMarginMinutes: number;
    prepMinutes: number;
    minWakeUpConstraint?: string;
  };
}

export interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'sheet' | 'link';
  status: 'ready' | 'missing';
  url?: string;
  note?: string;
}

export interface PedagogicalSheet {
  id: string;
  category: MissionCategory;
  title: string;
  subtitle: string;
  objectives: string[];
  programSummary: string;
  requiredMaterials: string[];
  documents: DocumentItem[];
  notebookLmTitle: string;
  notebookLmUrl: string;
  quickPrompts: string[];
}

export interface WeatherData {
  city: string;
  region?: string;
  temperature: number;
  apparentTemperature?: number;
  weatherCode: number;
  weatherDescription: string;
  rainProbability?: number;
  windSpeed: number;
  updatedAt: string;
  isDestination?: boolean;
}

export interface DailyHadith {
  id: string;
  textFrench: string;
  collection: string;
  hadithNumber: string;
  authenticity: string;
  shortExplanation: string;
  theme: string;
}

export interface MotivationalQuote {
  id: string;
  quote: string;
  theme: string;
  author?: string;
}

export interface AnomalyReport {
  id: string;
  type: 'overlap' | 'unrealistic_travel' | 'missing_address' | 'insufficient_prep';
  severity: 'high' | 'warning';
  title: string;
  description: string;
  missionIds: string[];
}

export interface GoogleAuthState {
  isConnected: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  hasCalendarScope: boolean;
  hasGmailScope: boolean;
  hasDriveScope: boolean;
  lastSyncAt: string | null;
}

export type ExpenseCategory =
  | 'peage'
  | 'carburant'
  | 'repas'
  | 'hebergement'
  | 'transport'
  | 'parking'
  | 'fournitures'
  | 'autre';

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string; // e.g. "TotalEnergies", "ASF Autoroutes", "Brasserie Le Globe"
  category: ExpenseCategory;
  description?: string;
  amountTTC: number; // Montant total TTC en €
  amountHT?: number; // Montant HT en €
  vatAmount?: number; // Montant TVA en €
  vatRate?: number; // Taux TVA (ex: 20, 10, 5.5)
  currency: string; // 'EUR'
  paymentMethod?: 'cb' | 'especes' | 'carte_societe' | 'autre';
  receiptImageUrl?: string; // Image base64 ou URL de preview
  receiptFileName?: string;
  missionId?: string; // ID de mission rattachée
  missionTitle?: string;
  city?: string;
  status: 'draft' | 'validated' | 'reimbursed';
  createdAt: string;
  source: 'photo_scan' | 'manual' | 'email_extract';
}

export interface MileageAllowance {
  missionId: string;
  date: string;
  missionTitle: string;
  city: string;
  distanceKm: number;
  ratePerKm: number; // e.g. 0.60 €/km
  totalAmount: number;
}


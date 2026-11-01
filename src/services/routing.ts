import { TravelCalculation, UserProfile, Mission } from '../types';

// Known geographical coordinates for hubs across Occitanie, PACA and surrounding regions
const CITY_COORDINATES: Record<string, { lat: number; lon: number; defaultKmFromMtp?: number }> = {
  'montpellier': { lat: 43.6108, lon: 3.8767, defaultKmFromMtp: 8 },
  'nimes': { lat: 43.8367, lon: 4.3601, defaultKmFromMtp: 54 },
  'beziers': { lat: 43.3442, lon: 3.2158, defaultKmFromMtp: 72 },
  'avignon': { lat: 43.9493, lon: 4.8055, defaultKmFromMtp: 98 },
  'marseille': { lat: 43.2965, lon: 5.3698, defaultKmFromMtp: 168 },
  'arles': { lat: 43.6768, lon: 4.6303, defaultKmFromMtp: 78 },
  'sete': { lat: 43.4079, lon: 3.6934, defaultKmFromMtp: 32 },
  'perpignan': { lat: 42.6887, lon: 2.8948, defaultKmFromMtp: 154 },
  'toulouse': { lat: 43.6047, lon: 1.4442, defaultKmFromMtp: 242 },
  'ales': { lat: 44.1272, lon: 4.0818, defaultKmFromMtp: 70 },
  'narbonne': { lat: 43.1838, lon: 3.0042, defaultKmFromMtp: 95 },
  'carcassonne': { lat: 43.2130, lon: 2.3510, defaultKmFromMtp: 150 },
  'lunel': { lat: 43.6749, lon: 4.1352, defaultKmFromMtp: 28 },
  'agde': { lat: 43.3108, lon: 3.4758, defaultKmFromMtp: 58 },
  'frontignan': { lat: 43.4475, lon: 3.7547, defaultKmFromMtp: 26 },
  'mauguio': { lat: 43.6167, lon: 4.0167, defaultKmFromMtp: 15 },
  'lattes': { lat: 43.5683, lon: 3.9033, defaultKmFromMtp: 7 },
  'castelnau-le-lez': { lat: 43.6339, lon: 3.8997, defaultKmFromMtp: 6 },
  'orange': { lat: 44.1381, lon: 4.8075, defaultKmFromMtp: 110 },
  'aix-en-provence': { lat: 43.5297, lon: 5.4474, defaultKmFromMtp: 155 },
  'millau': { lat: 44.0986, lon: 3.0783, defaultKmFromMtp: 112 },
  'lyon': { lat: 45.7640, lon: 4.8357, defaultKmFromMtp: 300 },
  'valence': { lat: 44.9333, lon: 4.8917, defaultKmFromMtp: 215 },
};

function normalizeCity(city: string): string {
  if (!city) return '';
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .split(/\s+/)[0]; // take main city token
}

/**
 * Haversine formula to calculate great-circle distance between two points in km
 */
function calculateDistanceBetweenCoordinates(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Dynamically computes road distance (km) and base travel duration (min)
 * taking into account departure home address/city and arrival mission address/city.
 */
function estimateRoadRoute(
  originCity: string,
  destinationCity: string,
  destinationAddress: string,
  avoidTolls: boolean,
  transportMode: string = 'car'
): { km: number; standardMin: number; rushMin: number } {
  const normOrigin = normalizeCity(originCity || 'montpellier');
  const normDest = normalizeCity(destinationCity || 'montpellier');

  // Same city or intra-urban commute
  if (normOrigin === normDest || (!normDest && normOrigin)) {
    const isSpecialAddress = destinationAddress && destinationAddress.length > 10;
    // For intra-urban journeys, base distance is typically 4 to 8 km
    const km = isSpecialAddress ? 8 : 5;
    const standardMin = isSpecialAddress ? 14 : 10;
    // Rush hour adds 4 to 6 min in intra-city traffic instead of an exaggerated 12+ min
    const rushMin = standardMin + (isSpecialAddress ? 6 : 4);
    return { km, standardMin, rushMin };
  }

  const coordOrigin = CITY_COORDINATES[normOrigin] || CITY_COORDINATES['montpellier'];
  const coordDest = CITY_COORDINATES[normDest];

  let km = 45;
  if (coordDest && coordOrigin) {
    const directKm = calculateDistanceBetweenCoordinates(
      coordOrigin.lat,
      coordOrigin.lon,
      coordDest.lat,
      coordDest.lon
    );
    // Road winding factor in France: ~1.28 - 1.35
    km = Math.round(directKm * 1.3);
  } else if (coordDest?.defaultKmFromMtp) {
    km = coordDest.defaultKmFromMtp;
  }

  // Base driving duration based on road type
  // With autoroute (toll): average 85-95 km/h overall including city access
  // Avoid tolls: average 58-65 km/h on departmental roads
  let averageSpeedKmh = avoidTolls ? 60 : 85;
  if (km < 25) averageSpeedKmh = 45; // local roads

  let standardMin = Math.round((km / averageSpeedKmh) * 60);
  if (standardMin < 10) standardMin = 10;

  // Additional margin if public transit or train
  if (transportMode === 'train') {
    standardMin += 20; // Gare access + transit
  } else if (transportMode === 'public_transit') {
    standardMin = Math.round(standardMin * 1.35);
  }

  // Rush hour traffic impact (+15 to 30% or +12-25 min)
  const rushMin = Math.round(standardMin * 1.25 + 5);

  return { km, standardMin, rushMin };
}

/**
 * Calculates departure time and wake up time based on the strict formula:
 * Heure de départ recommandée = Heure début formation - Durée trajet - Marge sécurité
 * Heure de réveil (levée) = Heure de départ - Durée préparation matin
 * Respecte l'heure minimale de réveil configurée
 * Supporte le temps de trajet réel personnalisé (ex: 4 minutes via Google Maps)
 */
export function calculateTravelAndWakeUp(
  mission: Mission,
  profile: UserProfile
): TravelCalculation {
  const homeCity = profile.homeCity || 'Montpellier';
  const destCity = mission.city || homeCity;
  const destAddress = mission.address || '';

  const routeData = estimateRoadRoute(
    homeCity,
    destCity,
    destAddress,
    profile.avoidTolls ?? false,
    profile.mainTransport || 'car'
  );

  // Check if mission start is in morning rush hour (07:30 - 09:15)
  const [startHour, startMin] = (mission.startTime || '08:30').split(':').map(Number);
  const startMinutesSinceMidnight = startHour * 60 + startMin;
  const isMorningRush = startMinutesSinceMidnight >= 450 && startMinutesSinceMidnight <= 570;

  // Check if the user specified a custom/real travel duration (e.g. 4 minutes via Google Maps)
  const hasCustomDuration =
    typeof mission.customTravelDurationMin === 'number' &&
    mission.customTravelDurationMin > 0;

  const durationMinutes = hasCustomDuration
    ? mission.customTravelDurationMin!
    : routeData.standardMin;

  const durationWithTrafficMinutes = hasCustomDuration
    ? mission.customTravelDurationMin!
    : isMorningRush
    ? routeData.rushMin
    : durationMinutes;

  const distanceKm = hasCustomDuration
    ? mission.customDistanceKm ?? Math.max(1, Math.round((mission.customTravelDurationMin! * 0.6) * 10) / 10)
    : routeData.km;

  const trafficCondition = hasCustomDuration
    ? 'fluid'
    : isMorningRush
    ? durationWithTrafficMinutes > durationMinutes + 8
      ? 'dense'
      : 'moderate'
    : 'fluid';

  const trafficReport = hasCustomDuration
    ? `Durée réelle confirmée via Google Maps (${durationWithTrafficMinutes} min pour ~${distanceKm} km). Calcul direct appliqué sans marge théorique superflue.`
    : isMorningRush
    ? `Ralentissements habituels constatés sur l'itinéraire vers ${destCity} (+${routeData.rushMin - routeData.standardMin} min de trafic estimé aux heures de pointe).`
    : `Circulation habituelle fluide depuis ${homeCity} vers ${destCity}.`;

  // Formula 1: Heure de départ recommandée
  // Départ = Heure début - Durée trajet (avec trafic) - Marge sécurité
  const effectiveTravel = durationWithTrafficMinutes;
  const safetyMargin = profile.safetyMarginMinutes ?? 15;
  const prepMinutes = profile.prepDurationMinutes ?? 35;

  const departureMinutesSinceMidnight = startMinutesSinceMidnight - effectiveTravel - safetyMargin;
  
  // Handle positive modulo for time computation
  let adjustedDepMinutes = departureMinutesSinceMidnight;
  if (adjustedDepMinutes < 0) adjustedDepMinutes += 24 * 60;

  const depHour = Math.floor(adjustedDepMinutes / 60) % 24;
  const depMin = adjustedDepMinutes % 60;
  const departureTime = `${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}`;

  // Formula 2: Heure de levée (réveil recommandée)
  // Réveil = Heure de départ - Durée préparation matin
  let wakeUpMinutesSinceMidnight = departureMinutesSinceMidnight - prepMinutes;
  let minWakeUpConstraint: string | undefined = undefined;

  // Check minimum wake-up constraint if user configured a minWakeUpTime
  if (profile.minWakeUpTime) {
    const [minH, minM] = profile.minWakeUpTime.split(':').map(Number);
    const minMinutes = minH * 60 + minM;
    if (wakeUpMinutesSinceMidnight < minMinutes) {
      minWakeUpConstraint = `Déplacement matinal pour ${destCity} : heure de levée recalculée à ${String(Math.floor(wakeUpMinutesSinceMidnight / 60)).padStart(2, '0')}:${String(wakeUpMinutesSinceMidnight % 60).padStart(2, '0')} (avant votre heure plancher de ${profile.minWakeUpTime}) afin de préserver votre marge de ${safetyMargin} min et votre préparation de ${prepMinutes} min.`;
    }
  }

  let adjustedWakeMinutes = wakeUpMinutesSinceMidnight;
  if (adjustedWakeMinutes < 0) adjustedWakeMinutes += 24 * 60;

  const wakeHour = Math.floor(adjustedWakeMinutes / 60) % 24;
  const wakeMin = adjustedWakeMinutes % 60;
  const wakeUpTime = `${String(wakeHour).padStart(2, '0')}:${String(wakeMin).padStart(2, '0')}`;

  return {
    distanceKm,
    durationMinutes,
    durationWithTrafficMinutes,
    trafficCondition,
    trafficReport,
    departureTime,
    wakeUpTime,
    isCustomDuration: hasCustomDuration,
    calculationBreakdown: {
      startTime: mission.startTime || '08:30',
      travelMinutes: effectiveTravel,
      safetyMarginMinutes: safetyMargin,
      prepMinutes,
      minWakeUpConstraint,
    },
  };
}

export function openExternalNavigation(
  address: string,
  city: string,
  app: 'google_maps' | 'waze' = 'google_maps'
) {
  const query = encodeURIComponent(`${address || ''}, ${city || ''}`.trim());
  if (app === 'waze') {
    window.open(`https://waze.com/ul?q=${query}`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }
}

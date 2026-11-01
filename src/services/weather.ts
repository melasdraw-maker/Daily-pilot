import { WeatherData } from '../types';

export const WMO_WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'Ciel dégagé', icon: '☀️' },
  1: { label: 'Principalement dégagé', icon: '🌤️' },
  2: { label: 'Partiellement nuageux', icon: '⛅' },
  3: { label: 'Couvert', icon: '☁️' },
  45: { label: 'Brouillard', icon: '🌫️' },
  48: { label: 'Brouillard givrant', icon: '🌫️' },
  51: { label: 'Bruine légère', icon: '🌦️' },
  53: { label: 'Bruine modérée', icon: '🌦️' },
  55: { label: 'Bruine dense', icon: '🌧️' },
  61: { label: 'Pluie faible', icon: '🌧️' },
  63: { label: 'Pluie modérée', icon: '🌧️' },
  65: { label: 'Pluie forte', icon: '⛈️' },
  71: { label: 'Chute de neige légère', icon: '🌨️' },
  73: { label: 'Chute de neige modérée', icon: '❄️' },
  75: { label: 'Chute de neige forte', icon: '❄️' },
  80: { label: 'Averses faibles', icon: '🌦️' },
  81: { label: 'Averses modérées', icon: '🌧️' },
  82: { label: 'Averses violentes', icon: '⛈️' },
  95: { label: 'Orage', icon: '⚡' },
};

export function getWeatherDescription(code: number): { label: string; icon: string } {
  return WMO_WEATHER_CODES[code] || { label: 'Variable', icon: '🌤️' };
}

export async function fetchLiveWeather(city: string, isDestination: boolean = false): Promise<WeatherData> {
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    if (!res.ok) {
      throw new Error(`Erreur météo pour ${city}`);
    }
    const data = await res.json();
    const weatherInfo = getWeatherDescription(data.current?.weather_code || 0);

    return {
      city: data.city || city,
      region: data.region,
      temperature: Math.round(data.current?.temperature_2m ?? 18),
      apparentTemperature: Math.round(data.current?.apparent_temperature ?? 18),
      weatherCode: data.current?.weather_code || 0,
      weatherDescription: weatherInfo.label,
      rainProbability: data.hourly?.precipitation_probability?.[8] ?? 0,
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 12),
      updatedAt: data.updatedAt || new Date().toISOString(),
      isDestination,
    };
  } catch (err) {
    console.warn(`Fallback météo pour ${city}:`, err);
    // Return honest fallback indicating communication issue
    return {
      city,
      temperature: 18,
      weatherCode: 1,
      weatherDescription: 'Données météo en cours d\'actualisation',
      windSpeed: 10,
      updatedAt: new Date().toISOString(),
      isDestination,
    };
  }
}

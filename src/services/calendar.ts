import { getAccessToken } from './auth';
import { Mission, UserProfile } from '../types';
import { calculateTravelAndWakeUp } from './routing';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function listGoogleCalendarEvents(timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentification requise pour Google Agenda');

  const params = new URLSearchParams({
    calendarId: 'primary',
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur Google Agenda (${res.status})`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createMissionEventInCalendar(mission: Mission, timezone: string = 'Europe/Paris'): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentification requise pour Google Agenda');

  const startDateTime = `${mission.startDate}T${mission.startTime || '08:30'}:00`;
  const endDateTime = `${mission.endDate || mission.startDate}T${mission.endTime || '16:30'}:00`;

  const description = [
    `Formation: ${mission.title}`,
    `Client / Organisme: ${mission.client}`,
    `Contact sur place: ${mission.contactName || 'N/C'}`,
    `Accès & Stationnement: ${mission.parkingInfo || 'Non spécifié'}`,
    `Matériel à prévoir: ${mission.materials?.join(', ') || 'N/C'}`,
    `Documents requis: ${mission.documents?.join(', ') || 'N/C'}`,
    mission.notes ? `Notes: ${mission.notes}` : '',
    mission.trainerInitials ? `Formateur: ${mission.trainerInitials}` : '',
    `Géré automatiquement par Daily Pilot`,
  ].filter(Boolean).join('\n\n');

  const payload = {
    summary: `[Formation] ${mission.title} - ${mission.city}`,
    location: mission.address ? `${mission.address}, ${mission.city}` : mission.city,
    description,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone: timezone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    extendedProperties: {
      private: {
        dailyPilotMissionId: mission.id,
        dailyPilotTrainer: mission.trainerInitials || '',
        dailyPilotApp: 'Daily Pilot',
      },
    },
  };

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur création événement (${res.status})`);
  }

  const data = await res.json();
  return data.id;
}

export async function deleteMissionEventInCalendar(eventId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentification requise pour Google Agenda');

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok || res.status === 404;
}

/**
 * Batch synchronize all missions into Google Calendar
 */
export async function syncAllMissionsToGoogleCalendar(
  missions: Mission[],
  profile: UserProfile,
  onProgress?: (done: number, total: number, lastCreated: Mission) => void
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < missions.length; i++) {
    const mission = missions[i];
    try {
      await createMissionEventInCalendar(mission, profile.timezone || 'Europe/Paris');
      successCount++;
      if (onProgress) {
        onProgress(successCount, missions.length, mission);
      }
    } catch (err: any) {
      console.warn(`Erreur sync pour mission ${mission.title}:`, err);
      errors.push(`${mission.title}: ${err.message || 'Erreur'}`);
    }
  }

  return { successCount, errors };
}

/**
 * Generate standard RFC 5545 iCalendar (.ics) string containing:
 * - Training Mission VEVENT
 * - Dedicated Wake-Up Alarm VEVENT with VALARM trigger for phone clocks
 */
export function generateIcsCalendarWithAlarms(missions: Mission[], profile: UserProfile): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daily Pilot//FR//Formations et Reveil//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Daily Pilot${profile.initials ? ` (${profile.initials})` : ''}`,
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  missions.forEach((m, idx) => {
    const travel = calculateTravelAndWakeUp(m, profile);
    const startIso = m.startDate.replace(/-/g, '') + 'T' + (m.startTime || '08:30').replace(/:/g, '') + '00';
    const endIso = (m.endDate || m.startDate).replace(/-/g, '') + 'T' + (m.endTime || '16:30').replace(/:/g, '') + '00';
    const wakeUpIso = m.startDate.replace(/-/g, '') + 'T' + travel.wakeUpTime.replace(/:/g, '') + '00';
    const departureIso = m.startDate.replace(/-/g, '') + 'T' + travel.departureTime.replace(/:/g, '') + '00';

    // 1. Mission Event
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:dp-mission-${m.id}-${idx}@dailypilot.app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${startIso}`);
    lines.push(`DTEND:${endIso}`);
    lines.push(`SUMMARY:[Formation] ${m.title} - ${m.city}`);
    lines.push(`LOCATION:${(m.address ? m.address + ', ' : '') + m.city}`);
    lines.push(`DESCRIPTION:Client: ${m.client}\\n${m.trainerInitials ? `Formateur: ${m.trainerInitials}\\n` : ''}Départ conseillé: ${travel.departureTime}\\nRéveil: ${travel.wakeUpTime}`);
    lines.push('STATUS:CONFIRMED');

    // Alarm reminder 30 min before departure
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT30M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Départ dans 30 min pour votre mission à ${m.city}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');

    // 2. Dedicated Wake-up Alarm Event (So user's calendar rings as an alarm clock)
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:dp-alarm-${m.id}-${idx}@dailypilot.app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${wakeUpIso}`);
    lines.push(`DTEND:${departureIso}`);
    lines.push(`SUMMARY:⏰ Réveil Daily Pilot (${travel.wakeUpTime}) -> Départ ${travel.departureTime}`);
    lines.push(`LOCATION:${profile.homeCity || 'Domicile'}`);
    lines.push(`DESCRIPTION:⏰ Heure de levée pour votre formation à ${m.city} (${m.title}).\\nPréparation: ${profile.prepDurationMinutes || 45} min.\\nDépart impératif: ${travel.departureTime}`);
    lines.push('STATUS:CONFIRMED');

    // Immediate sound alarm at wake up time
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER;VALUE=DATE-TIME:' + wakeUpIso);
    lines.push('ACTION:AUDIO');
    lines.push('ATTACH;VALUE=URI:Chord');
    lines.push(`DESCRIPTION:⏰ RÉVEIL DAILY PILOT - Départ ${travel.departureTime}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a download of the .ics file on browser
 */
export function downloadIcsFile(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Direct Google Calendar web link for single mission
 */
export function getGoogleCalendarWebEventUrl(mission: Mission, departureTime?: string, wakeUpTime?: string): string {
  const title = encodeURIComponent(`[Formation] ${mission.title} - ${mission.city}`);
  const startIso = mission.startDate.replace(/-/g, '') + 'T' + (mission.startTime || '08:30').replace(/:/g, '') + '00';
  const endIso = (mission.endDate || mission.startDate).replace(/-/g, '') + 'T' + (mission.endTime || '16:30').replace(/:/g, '') + '00';
  const location = encodeURIComponent((mission.address ? mission.address + ', ' : '') + mission.city);
  const details = encodeURIComponent(
    `Formation: ${mission.title}\nClient: ${mission.client}\nDépart conseillé: ${departureTime || '07:30'}\nRéveil: ${wakeUpTime || '06:30'}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
}

/**
 * Automatically opens the mission in Google Calendar in 1 click
 */
export function openMissionInGoogleCalendar(mission: Mission, departureTime?: string, wakeUpTime?: string) {
  const url = getGoogleCalendarWebEventUrl(mission, departureTime, wakeUpTime);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Automatically opens the wake-up alarm in Google Calendar in 1 click
 */
export function openWakeUpInGoogleCalendar(mission: Mission, departureTime: string, wakeUpTime: string) {
  const title = encodeURIComponent(`⏰ Réveil Daily Pilot (${wakeUpTime}) - Départ ${departureTime}`);
  const startIso = mission.startDate.replace(/-/g, '') + 'T' + wakeUpTime.replace(/:/g, '') + '00';
  const endIso = mission.startDate.replace(/-/g, '') + 'T' + departureTime.replace(/:/g, '') + '00';
  const details = encodeURIComponent(
    `⏰ Alarme de réveil pour votre formation à ${mission.city} (${mission.title})\n` +
    `🚗 Départ recommandé : ${departureTime}\n` +
    `🎯 Début formation : ${mission.startTime || '08:30'}`
  );
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

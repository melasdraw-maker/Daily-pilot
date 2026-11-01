import { Mission, MissionCategory } from '../types';

/**
 * Parses plain-text emails sent by Opera Formation into structured Mission objects.
 * Supports the exact format used by Opera Formation managers:
 * "Le 02/11/2026 de 08:30 à 16:30 -> A260FDA: INTRA: Client - VILLE - Intitulé (Lieu: ... >> Coordonnées Client INTRA : ... - Adresse | CP VILLE)"
 */
export function parseOperaFormationEmail(
  rawText: string,
  trainerInitials: string = 'HWS'
): Mission[] {
  if (!rawText || !rawText.trim()) return [];

  const missions: Mission[] = [];
  const lines = rawText.split('\n');

  // Regex pattern for Opera Formation line:
  // "Le 02/11/2026 de 08:30 à 16:30 -> ..."
  const dateLineRegex = /Le\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+de\s+(\d{1,2}[h:]\d{2})\s+à\s+(\d{1,2}[h:]\d{2})\s*->\s*(.+)/i;

  // Track multi-day sessions with same code/title to number them (Jour 1/X, Jour 2/X)
  interface RawParsedItem {
    date: string;
    startTime: string;
    endTime: string;
    body: string;
  }
  const rawItems: RawParsedItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(dateLineRegex);
    if (match) {
      const [_, dateRaw, startRaw, endRaw, body] = match;

      // Normalize date DD/MM/YYYY -> YYYY-MM-DD
      const [d, m, y] = dateRaw.split('/');
      const dateIso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

      // Normalize time "08:30" or "08h30" -> "08:30"
      const startTime = startRaw.replace('h', ':').padStart(5, '0');
      const endTime = endRaw.replace('h', ':').padStart(5, '0');

      rawItems.push({
        date: dateIso,
        startTime,
        endTime,
        body: body.trim(),
      });
    }
  }

  // Count occurrences of titles or codes across the week for Jour X/Y
  const baseKeyCounts: Record<string, number> = {};
  rawItems.forEach((item) => {
    // Extract code or short title before colon
    const codeMatch = item.body.match(/^([A-Z0-9]+):/i);
    const key = codeMatch ? codeMatch[1].toUpperCase() : item.body.slice(0, 30);
    baseKeyCounts[key] = (baseKeyCounts[key] || 0) + 1;
  });

  const baseKeyTracker: Record<string, number> = {};

  rawItems.forEach((item, index) => {
    const body = item.body;

    // 1. Extract Code (e.g. "A260FDA")
    const codeMatch = body.match(/^([A-Z0-9]+):/i);
    const sessionCode = codeMatch ? codeMatch[1].toUpperCase() : '';

    // 2. Extract Location and Address from "(Lieu: ...)"
    // e.g. "(Lieu: Chez le client >> Coordonnées Client INTRA : Syndicat mixte Pays des Cevennes - PLIE Cévenol - 6 place des Martyrs de la Résistance | 30100 ALES)"
    let address = '';
    let city = '';
    let clientFromAddress = '';

    const lieuMatch = body.match(/\(Lieu:\s*([^)]+)\)/i);
    if (lieuMatch) {
      const lieuContent = lieuMatch[1];

      // Address pattern: look for street and postal code "6 place des Martyrs... | 30100 ALES"
      const addressMatch = lieuContent.match(/(?:-\s*)([\d\w\s,'éèêëàâôûîïç]+?)\s*\|\s*(\d{5})\s*([A-ZÀ-Ÿ\s-]+)/i);
      if (addressMatch) {
        const street = addressMatch[1].trim();
        const postal = addressMatch[2].trim();
        const detectedCity = addressMatch[3].trim();
        address = `${street}, ${postal} ${detectedCity}`;
        city = formatCityName(detectedCity);
      } else {
        // Fallback: extract after the last "-"
        const parts = lieuContent.split('-');
        if (parts.length > 1) {
          address = parts[parts.length - 1].replace(/\|/g, ',').trim();
        }
      }

      // Client name from inside Lieu if present
      const clientMatch = lieuContent.match(/Coordonnées Client(?:\s+INTRA)?\s*:\s*([^-\n]+)/i);
      if (clientMatch) {
        clientFromAddress = clientMatch[1].trim();
      }
    }

    // 3. Extract Details before "(Lieu:"
    const contentBeforeLieu = body.split(/\(Lieu:/i)[0].trim();

    // Remove the code prefix (e.g. "A260FDA: ")
    let remainder = contentBeforeLieu.replace(/^[A-Z0-9]+:\s*/i, '');
    // Remove "INTRA: " prefix if present
    remainder = remainder.replace(/^INTRA:\s*/i, '');

    // Pattern: "CLIENT - VILLE - FORMATION - NB_STAGIAIRES"
    const segments = remainder.split(/\s+-\s+/);

    let client = clientFromAddress || '';
    let courseName = '';
    let traineesNote = '';

    if (segments.length >= 3) {
      client = client || segments[0].trim();
      // segments[1] is often city (e.g. ALES)
      if (!city && segments[1]) {
        city = formatCityName(segments[1].trim());
      }

      // The rest is course name and trainees
      const courseSegments = segments.slice(2);
      const lastSeg = courseSegments[courseSegments.length - 1];
      if (/stagiaire/i.test(lastSeg)) {
        traineesNote = lastSeg.trim();
        courseName = courseSegments.slice(0, -1).join(' - ').trim();
      } else {
        courseName = courseSegments.join(' - ').trim();
      }
    } else {
      courseName = remainder;
    }

    // Default city fallback if still not found
    if (!city) {
      if (/ales/i.test(body)) city = 'Alès';
      else if (/nimes/i.test(body)) city = 'Nîmes';
      else if (/beziers/i.test(body)) city = 'Béziers';
      else if (/st aun/i.test(body)) city = 'St Aunès';
      else if (/toulouse/i.test(body)) city = 'Toulouse';
      else city = 'Montpellier';
    }

    if (!address) {
      address = `Centre Opera Formation, ${city}`;
    }

    // 4. Multi-day numbering (Jour 1/4, Jour 2/4...)
    const key = sessionCode || courseName.slice(0, 30);
    const totalDaysForSession = baseKeyCounts[key] || 1;
    baseKeyTracker[key] = (baseKeyTracker[key] || 0) + 1;
    const currentDayNum = baseKeyTracker[key];

    let fullTitle = '';
    if (sessionCode) {
      fullTitle += `${sessionCode} : `;
    }

    // Clean up course name
    let cleanCourseTitle = courseName
      .replace(/^CCTH\s+GO\s*:\s*/i, 'CCTH GO - ')
      .replace(/:\s*Certificat de Compétences au Travail en Hauteur.*/i, ' - Travail en Hauteur Gros Œuvre')
      .trim();

    if (!cleanCourseTitle) {
      cleanCourseTitle = 'Session de Formation';
    }

    fullTitle += cleanCourseTitle;

    if (totalDaysForSession > 1) {
      fullTitle += ` (Jour ${currentDayNum}/${totalDaysForSession})`;
    }

    // 5. Categorize Mission
    let category: MissionCategory = 'technique';
    const lowerAll = (fullTitle + ' ' + body).toLowerCase();
    if (lowerAll.includes('hauteur') || lowerAll.includes('echafaud') || lowerAll.includes('ccth')) {
      category = 'echafaudages';
    } else if (lowerAll.includes('caces') || lowerAll.includes('aipr') || lowerAll.includes('reseau')) {
      category = 'securite';
    } else if (lowerAll.includes('sst') || lowerAll.includes('secour') || lowerAll.includes('prevention')) {
      category = 'prevention';
    }

    // 6. Distance standard
    const lowerCity = city.toLowerCase();
    let distanceKm = 50;
    if (lowerCity.includes('alès') || lowerCity.includes('ales')) distanceKm = 68;
    else if (lowerCity.includes('nîmes') || lowerCity.includes('nimes')) distanceKm = 55;
    else if (lowerCity.includes('béziers') || lowerCity.includes('beziers')) distanceKm = 75;
    else if (lowerCity.includes('st aunès') || lowerCity.includes('staun')) distanceKm = 10;
    else if (lowerCity.includes('toulouse')) distanceKm = 240;

    missions.push({
      id: `m-opera-${item.date}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title: fullTitle,
      client: client || 'Opéra Formation',
      category,
      trainerInitials: trainerInitials || 'HWS',
      startDate: item.date,
      endDate: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      city,
      address,
      contactName: client ? `${client} (Lieu: Chez le client)` : 'Opéra Formation',
      contactPhone: '04 66 56 •• ••',
      parkingInfo: `Stationnement proximité site ${city}`,
      materials: [
        category === 'echafaudages' ? 'Harnais complet antichute' : 'EPI',
        'Casque de protection avec jugulaire',
        'Supports de formation Opera Formation',
      ],
      documents: ['Feuille_Emargement_Session.pdf', 'Livret_Stagiaire.pdf'],
      notes: traineesNote ? `Groupe de ${traineesNote}.` : 'Session transmise par e-mail Opera Formation.',
      status: 'valid',
      confidence: 'high',
      confidenceNotes: 'Importé directement depuis le mail planning Opera Formation.',
      source: 'E-mail Opera Formation',
      lastModified: new Date().toISOString(),
      customDistanceKm: distanceKm,
      distanceKm: distanceKm,
    });
  });

  return missions;
}

function formatCityName(raw: string): string {
  const c = raw.trim().toUpperCase();
  if (c === 'ALES') return 'Alès';
  if (c === 'NIMES') return 'Nîmes';
  if (c === 'BEZIERS') return 'Béziers';
  if (c.includes('AUNES') || c.includes('AUNÈS')) return 'St Aunès';
  if (c === 'MONTPELLIER') return 'Montpellier';
  if (c === 'TOULOUSE') return 'Toulouse';
  return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
}

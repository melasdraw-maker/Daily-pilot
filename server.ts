import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Security & CORS Headers Middleware (Permits PWABuilder, Android WebAPK, and mobile fetch)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(self)');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Shared Gemini client instance with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Extract structured training missions from text or Excel/CSV data
app.post('/api/gemini/extract-missions', async (req, res) => {
  try {
    const { rawContent, filename, userCity, userInitials } = req.body;
    if (!rawContent) {
      return res.status(400).json({ error: 'Contenu manquant' });
    }

    const prompt = `Tu es l'assistant de gestion de missions pour un formateur professionnel qui se déplace en France.
L'utilisateur s'identifie par les initiales / trigramme : "${userInitials || 'Non spécifié'}".
Analyse le document/texte ci-dessous (provenant de: "${filename || 'document'}") et extrait toutes les missions de formation détectées.

RÈGLES CRUCIALES ET ABSOLUES :
1. SESSIONS MULTI-JOURS (2 JOURS OU PLUS) AVEC LE MÊME INTERVENANT :
   - ATTENTION PARTICULIÈRE : Beaucoup de formations se déroulent sur 2 JOURS consécutifs (ex: Lundi et Mardi, dates '26/10 au 27/10', ou 'Durée: 2 jours / 14h', ou deux lignes consécutives avec le même formateur).
   - L'intervenant doit préparer son déplacement et se réveiller chaque matin : TU DOIS OBLIGATOIREMENT CRÉER UNE MISSION DISTINCTE POUR CHAQUE JOUR DE LA SESSION !
   - Exemple : pour une session Échafaudage de 2 jours le 26 et 27 octobre, tu dois générer 2 objets mission :
     * Mission 1 : startDate="2026-10-26", endDate="2026-10-26", title="Échafaudage R408 (Jour 1/2)"
     * Mission 2 : startDate="2026-10-27", endDate="2026-10-27", title="Échafaudage R408 (Jour 2/2)"
   - Ne saute JAMAIS le 2ème jour ! Même intervenant, même lieu (ou lieu différent si précisé), mais deux missions séparées.

2. SÉLECTION SYSTÉMATIQUE À CHAQUE APPARITION DE L'INITIALE :
   - À CHAQUE FOIS que tu vois l'initiale demandée "${userInitials || ''}" (dans une colonne Formateur, Intervenant, Trigramme, ou dans une ligne/cellule), SÉLECTIONNE-LA ET CRÉE LA MISSION.
   - Ne laisse passer aucun jour où figure l'initiale "${userInitials || ''}".

3. DÉTECTION DES INITIALES DU FORMATEUR :
   - Les organismes et CFA utilisent des colonnes "Formateur", "Intervenant", "Trigramme", "Initiales".
   - Extrais impérativement les initiales dans "trainerInitials".

4. RIGOUREUX SUR LES DONNÉES :
   - N'invente jamais d'adresse ou d'horaire non mentionnés.
   - Normalise les dates en AAAA-MM-JJ et les heures en HH:mm (24h).
   - Détecte l'adresse exacte et la ville en France.

Contenu brut :
"""
${rawContent.slice(0, 30000)}
"""

Réponds STRICTEMENT avec un objet JSON ayant la structure suivante :
{
  "missions": [
    {
      "id": "mission-unique-id",
      "title": "Nom précis de la formation avec mention du jour si session multi-jours (ex: Échafaudage R408 (Jour 1/2))",
      "client": "Organisme ou client donneur d'ordre",
      "trainerInitials": "${userInitials || ''}",
      "startDate": "AAAA-MM-JJ",
      "endDate": "AAAA-MM-JJ",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "city": "Ville (ex: Montpellier, Nîmes)",
      "address": "Adresse complète du site ou du centre de formation",
      "contactName": "Nom du contact sur place",
      "contactPhone": "Téléphone du contact",
      "parkingInfo": "Précisions sur le stationnement si mentionnées",
      "materials": ["EPI de sécurité", "PC portable"],
      "documents": ["Feuille d'émargement", "Support de cours"],
      "notes": "Remarques particulières",
      "confidence": "high",
      "confidenceNotes": "Préciser ce qui est explicite vs déduit",
      "source": "${filename || 'Import'}"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Format de réponse JSON invalide');
      }
    }

    // Server-side safety: ensure any mission with startDate !== endDate is split into individual days
    const expandedMissions: any[] = [];
    if (Array.isArray(parsed.missions)) {
      for (const m of parsed.missions) {
        if (m.startDate && m.endDate && m.startDate !== m.endDate) {
          const start = new Date(m.startDate);
          const end = new Date(m.endDate);
          const dayDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
          if (dayDiff > 1 && dayDiff <= 7) {
            for (let d = 0; d < dayDiff; d++) {
              const currentDay = new Date(start);
              currentDay.setDate(start.getDate() + d);
              const dateStr = currentDay.toISOString().slice(0, 10);
              expandedMissions.push({
                ...m,
                id: `${m.id || 'm'}-jour-${d + 1}`,
                title: m.title.includes('Jour') ? m.title : `${m.title} (Jour ${d + 1}/${dayDiff})`,
                startDate: dateStr,
                endDate: dateStr,
              });
            }
            continue;
          }
        }
        expandedMissions.push(m);
      }
      parsed.missions = expandedMissions;
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('Erreur extraction missions:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de l\'extraction par IA' });
  }
});

// Endpoint: Extract expense receipt details from photo (base64) or email text
app.post('/api/gemini/extract-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType, rawText, availableMissions } = req.body;
    if (!imageBase64 && !rawText) {
      return res.status(400).json({ error: 'Fournissez une image de reçu ou le texte de la facture/e-mail' });
    }

    const systemPrompt = `Tu es un expert comptable spécialisé dans l'analyse et la vérification des notes de frais pour les formateurs et intervenants en déplacement professionnel en France.
Analyse le ticket de caisse, la facturette ou le reçu fourni (image ou texte).
Extrais avec une rigueur absolue :
1. Le commerçant / enseigne (merchant). Ex: "TotalEnergies", "ASF / Vinci Autoroutes", "Brasserie de la Gare", "Ibis Budget", "SNCF Connect", "Relay".
2. La date de la dépense (date) au format AAAA-MM-JJ. Si l'année n'est pas explicite, prends l'année en cours (2026).
3. Le montant total TTC (amountTTC) en euros (nombre décimal avec point, ex: 34.50).
4. Le montant HT (amountHT) si mentionné, sinon calcule-le à partir de la TVA ou laisse null.
5. Le montant de la TVA (vatAmount) en euros si lisible, sinon null.
6. Le taux de TVA (vatRate) en pourcentage (ex: 20, 10, 5.5, 2.1) si mentionné.
7. La catégorie (category) parmi STRICTEMENT l'une des suivantes :
   - "peage" (péage autoroutier, télépeage)
   - "carburant" (essence, gazole, recharge électrique)
   - "repas" (restaurant, brasserie, boulangerie, repas midi)
   - "hebergement" (hôtel, gîte, nuitée)
   - "transport" (billet train, taxi, VTC, bus, métro)
   - "parking" (stationnement, horodateur)
   - "fournitures" (papeterie, matériel pédagogique, câbles)
   - "autre" (divers)
8. Une courte description synthétique (description) utile pour la comptabilité (ex: "Péage A9 Montpellier - Nîmes", "Repas midi formateur", "Gazole SP95").
9. Le moyen de paiement (paymentMethod) : "cb", "especes", "carte_societe", ou "autre".

${Array.isArray(availableMissions) && availableMissions.length > 0 ? `
Missions de formation connues dans le planning de l'utilisateur :
${JSON.stringify(availableMissions.map((m: any) => ({ id: m.id, date: m.startDate, city: m.city, title: m.title })))}
Si la date ou le lieu de la dépense correspond à l'une de ces missions, indique son ID dans "suggestedMissionId", sinon null.
` : ''}

Réponds STRICTEMENT avec un objet JSON :
{
  "merchant": "Nom du commerçant",
  "date": "AAAA-MM-JJ",
  "amountTTC": 0.00,
  "amountHT": 0.00,
  "vatAmount": 0.00,
  "vatRate": 20.0,
  "category": "repas",
  "description": "Description courte",
  "paymentMethod": "cb",
  "suggestedMissionId": null,
  "confidence": "high"
}`;

    const contents: any[] = [];

    if (imageBase64) {
      // Clean base64 header if present (data:image/jpeg;base64,...)
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    if (rawText) {
      contents.push(`Texte de la facture / e-mail reçu :\n"""\n${rawText.slice(0, 8000)}\n"""`);
    }

    contents.push(systemPrompt);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Réponse d\'analyse de reçu illisible');
      }
    }

    return res.json(parsed);
  } catch (err: any) {
    console.error('Erreur analyse reçu:', err);
    return res.status(500).json({ error: err.message || 'Impossible d\'analyser le reçu par IA' });
  }
});

// Helper: Smart rule-based conversational fallback in French if Gemini API is temporarily unavailable
function generateFallbackAssistantResponse(message: string, context: any) {
  const q = (message || '').toLowerCase();
  const userName = context?.profile?.name || 'Formateur';
  const next = context?.nextMission;
  const todayMissions = context?.todayMissions || [];
  const weather = context?.weather;
  const travel = context?.travel;
  const departureTime = travel?.departureTime || '07:30';
  const wakeUpTime = context?.wakeUpTime || travel?.wakeUpTime || '06:30';
  const hadith = context?.dailyHadith;
  const isHadithEnabled = context?.hadithEnabled !== false;

  const hadithSpeech = (isHadithEnabled && hadith?.textFrench)
    ? ` Et voici votre hadith du jour : « ${hadith.textFrench} », rapporté par ${hadith.collection || 'les recueils prophétiques'}. ${hadith.shortExplanation ? `Enseignement : ${hadith.shortExplanation}.` : ''}`
    : '';

  const hadithDisplay = (isHadithEnabled && hadith?.textFrench)
    ? `\n\n🕌 **Hadith du jour** :\n« ${hadith.textFrench} »\n*Source : ${hadith.collection || ''} (${hadith.hadithNumber || ''})*\n💡 *Enseignement* : ${hadith.shortExplanation || ''}`
    : '';

  // 1. Quoi de neuf / Quoi de prévu / Programme du jour
  if (
    q.includes('neuf') ||
    q.includes('prevu') ||
    q.includes('prévu') ||
    q.includes('aujourd') ||
    q.includes('journée') ||
    q.includes('programme')
  ) {
    if (next) {
      const speech = `Bonjour ${userName}. Votre prochaine session est ${next.title} à ${next.city}, débutant à ${next.startTime || '08:30'}. Votre heure de départ recommandée est fixée à ${departureTime}, avec une heure de réveil idéale à ${wakeUpTime}. ${weather ? `Météo sur place : ${weather.current?.temperature_2m || 15} degrés.` : ''}${hadithSpeech} Excellente formation !`;
      const display = `Bonjour ${userName} !\n\n📅 **Prochaine mission** : ${next.title}\n📍 **Lieu** : ${next.city} (${next.address || 'Centre de formation'})\n⏰ **Horaires** : ${next.startTime || '08:30'} - ${next.endTime || '17:00'}\n🚗 **Départ conseillé** : ${departureTime}\n⏰ **Réveil conseillé** : ${wakeUpTime}${hadithDisplay}\n\nTous vos documents sont prêts. Bonne journée !`;
      return { speechText: speech, displayText: display, action: 'open_planning' };
    } else {
      const speech = `Bonjour ${userName}. Rien n'est prévu dans votre planning : vous êtes en vacances ! Profitez de votre repos et de votre temps libre.${hadithSpeech}`;
      const display = `Bonjour ${userName} !\n\n🌴 **Vous êtes en vacances** : rien n'est prévu dans votre planning aujourd'hui. Aucun réveil ni déplacement programmé. Profitez bien de vos congés !${hadithDisplay}`;
      return { speechText: speech, displayText: display, action: 'open_planning' };
    }
  }

  // 2. Demande spécifique du Hadith
  if (q.includes('hadith') || q.includes('rappel') || q.includes('spirituel')) {
    if (hadith?.textFrench) {
      const speech = `Voici le hadith du jour : « ${hadith.textFrench} », rapporté par ${hadith.collection || 'les recueils authentiques'}. ${hadith.shortExplanation || ''}`;
      const display = `🕌 **Hadith du jour** :\n\n« ${hadith.textFrench} »\n\n📖 *${hadith.collection || ''} (${hadith.hadithNumber || ''})*\n✨ *Authenticité* : ${hadith.authenticity || 'Sahih'}\n💡 *Enseignement* : ${hadith.shortExplanation || ''}`;
      return { speechText: speech, displayText: display, action: null };
    }
  }

  // 3. Validation de planning / Google Calendar / Réveil
  if (
    q.includes('calendar') ||
    q.includes('agenda') ||
    q.includes('valider') ||
    q.includes('validation') ||
    (q.includes('mettre') && (q.includes('reveil') || q.includes('réveil') || q.includes('planning')))
  ) {
    const speech = `Votre planning est prêt. J'ouvre l'outil de synchronisation pour envoyer vos missions sur Google Agenda et programmer automatiquement vos réveils.`;
    const display = `📅 **Synchronisation & Validation**\n\nPrêt à envoyer vos missions vers **Google Agenda** et programmer vos **réveils intelligents** pour chaque formation de la semaine.\n\n👉 Confirmez dans la fenêtre qui s'affiche.`;
    return { speechText: speech, displayText: display, action: 'open_planning_validation' };
  }

  // 4. Questions de départ
  if (q.includes('partir') || q.includes('depart') || q.includes('départ') || q.includes('route')) {
    if (next) {
      const dur = travel?.durationWithTrafficMinutes || 45;
      const speech = `Pour votre intervention à ${next.city}, vous devez partir au plus tard à ${departureTime}. Le trajet est estimé à environ ${dur} minutes avec une marge de sécurité.`;
      const display = `🚗 **Départ conseillé** : ${departureTime}\n📍 Destination : ${next.city}\n⏱️ Trajet estimé : ${dur} minutes\n🎯 Début de la formation : ${next.startTime || '08:30'}`;
      return { speechText: speech, displayText: display, action: 'open_travel' };
    }
    return {
      speechText: `Aucun trajet actif n'est détecté. Définissez une mission pour calculer l'heure de départ idéale.`,
      displayText: `Aucun trajet actif. Veuillez sélectionner ou importer une mission.`,
      action: null,
    };
  }

  // 5. Questions de réveil
  if (q.includes('reveil') || q.includes('réveil') || q.includes('lever') || q.includes('debout')) {
    if (next) {
      const prep = context?.profile?.preparationMinutes || 45;
      const speech = `Votre réveil est calculé à ${wakeUpTime}, ce qui vous laisse ${prep} minutes de préparation avant un départ à ${departureTime}.`;
      const display = `⏰ **Heure de réveil recommandée** : ${wakeUpTime}\n☕ Temps de préparation : ${prep} min\n🚗 Heure de départ : ${departureTime}`;
      return { speechText: speech, displayText: display, action: 'open_wake_up' };
    }
    return {
      speechText: `Votre réveil habituel est prêt. Importez votre planning pour calculer l'horaire précis selon vos trajets.`,
      displayText: `Aucune mission enregistrée pour calculer l'horaire de réveil exact.`,
      action: null,
    };
  }

  // 6. Météo
  if (q.includes('meteo') || q.includes('météo') || q.includes('pluie') || q.includes('temperature') || q.includes('température')) {
    const city = next?.city || context?.profile?.homeCity || 'Montpellier';
    const temp = weather?.current?.temperature_2m ?? 16;
    const speech = `À ${city}, la température est actuellement de ${temp} degrés. Les conditions de route sont favorables pour votre déplacement.`;
    const display = `🌤️ **Météo pour ${city}**\n🌡️ Température : ${temp}°C\n💧 Humidité : ${weather?.current?.relative_humidity_2m || 65}%\n💨 Vent : ${weather?.current?.wind_speed_10m || 10} km/h`;
    return { speechText: speech, displayText: display, action: null };
  }

  // Default friendly response
  const speech = `Bien reçu ${userName}. Je suis Daily Pilot, à votre disposition pour vos horaires de départ, vos missions de formation, le hadith du jour et votre trajet. Que souhaitez-vous savoir ?`;
  const display = `Bonjour ${userName} 👋\n\nJe suis Daily Pilot. Posez-moi vos questions sur :\n- Quoi de neuf aujourd'hui (avec météo & Hadith du jour)\n- Votre heure de départ ou de réveil\n- La validation de votre planning sur Google Agenda`;
  return { speechText: speech, displayText: display, action: null };
}

// Endpoint: Voice conversational assistant
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message vocal vide' });
    }

    const systemInstruction = `Tu es "Daily Pilot", l'assistant personnel intelligent et bienveillant d'un formateur professionnel en déplacement régulier en France.
Tu communiques en français naturel, chaleureux, concis, direct et très professionnel.
Tes réponses vocales doivent être faciles et agréables à écouter (pas de listes à puces indigestes, phrases fluides).

Données de contexte actuelles :
- Date locale : ${context?.currentDate || new Date().toISOString()}
- Heure locale : ${context?.currentTime || '13:30'}
- Profil formateur : ${context?.profile?.name || 'Formateur'}${context?.profile?.initials ? `, initiales ${context?.profile?.initials}` : ''}, domicile à ${context?.profile?.homeCity || 'Montpellier'}
- Prochaine formation : ${JSON.stringify(context?.nextMission || null)}
- Missions du jour : ${JSON.stringify(context?.todayMissions || [])}
- Météo : ${JSON.stringify(context?.weather || null)}
- Trajet estimé : ${JSON.stringify(context?.travel || null)}
- Réveil recommandé : ${context?.wakeUpTime || 'Non calculé'}
- Phrase motivante du jour : "${context?.motivationalQuote?.quote || ''}"
- Hadith du jour actif : ${context?.hadithEnabled !== false ? JSON.stringify(context?.dailyHadith) : 'Désactivé'}

RÈGLES CRUCIALES :
1. Pour "Quoi de neuf ?" ou "Quoi de prévu aujourd'hui ?" :
   - Salue chaleureusement en citant le prénom.
   - Présente la prochaine mission (titre, ville, horaires).
   - Annonce le temps de trajet estimé, l'heure de départ conseillée et l'heure de réveil idéale.
   - Donne un point météo clair.
   - RÈGLE OBLIGATOIRE DU HADITH : Si le hadith du jour est présent dans le contexte (${JSON.stringify(context?.dailyHadith || null)}), TU DOIS OBLIGATOIREMENT le lire à voix haute dans speechText ("Et voici votre hadith du jour : « ... », rapporté par ...") et l'afficher dans displayText avec la référence et l'enseignement. Ne l'omets JAMAIS !
   - Conclus avec une note motivante ou la citation du jour.
2. Pour les demandes de mise sur Google Calendar ou sur le réveil ou validation de planning ("Mettre sur mon agenda", "Mettre sur mon réveil", "Valider mon planning") :
   - Réponds que c'est prêt et déclenche l'action "open_planning_validation".
3. Pour les questions d'horaires ("À quelle heure dois-je partir ?", "À quelle heure me réveiller ?") : donne l'horaire précis avec les explications claires.
4. Identifie si une action UI doit être déclenchée (ex: "open_planning_validation", "open_planning", "open_travel", "open_wake_up", "open_pedagogy", "open_notebooklm").

Renvoie un JSON strict :
{
  "speechText": "Le texte à prononcer à haute voix, fluide, sans astérisques markdown ni puces",
  "displayText": "Texte mis en forme pour affichage sur l'écran du smartphone",
  "action": null,
  "actionPayload": {}
}`;

    let result: { speechText: string; displayText: string; action?: string | null; audioBase64?: string | null } | null = null;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      try {
        result = JSON.parse(text);
      } catch {
        result = {
          speechText: text.replace(/[*#]/g, ''),
          displayText: text,
          action: null,
        };
      }
    } catch (genErr: any) {
      console.warn('Gemini generateContent non disponible ou erreur, bascule sur le moteur de secours:', genErr?.message);
      result = generateFallbackAssistantResponse(message, context);
    }

    if (!result || !result.speechText) {
      result = generateFallbackAssistantResponse(message, context);
    }

    // Optional: Try generating speech audio via Gemini TTS with a fast 1800ms timeout
    let audioBase64: string | null = null;
    try {
      if (process.env.GEMINI_API_KEY && result.speechText) {
        const shortSpeechText = result.speechText.slice(0, 220);
        const ttsPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text: shortSpeechText }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800));
        const ttsResponse: any = await Promise.race([ttsPromise, timeoutPromise]);
        if (ttsResponse && ttsResponse.candidates) {
          audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        }
      }
    } catch (ttsErr: any) {
      console.log('Gemini TTS audio non disponible, fallback Web Speech:', ttsErr?.message);
    }

    return res.json({
      ...result,
      audioBase64,
    });
  } catch (err: any) {
    console.error('Erreur assistant vocal global:', err);
    // Never return 500 error, return a friendly fallback
    const fallback = generateFallbackAssistantResponse(req.body?.message || '', req.body?.context || {});
    return res.json(fallback);
  }
});

// Endpoint: Real weather proxy using Open-Meteo
app.get('/api/weather', async (req, res) => {
  try {
    const city = (req.query.city as string) || 'Paris';

    // 1. Geocode city
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: `Ville "${city}" non trouvée` });
    }

    const { latitude, longitude, name, admin1, country } = geoData.results[0];

    // 2. Fetch current weather and hourly forecast
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto&forecast_days=2`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    return res.json({
      city: name,
      region: admin1 || country,
      latitude,
      longitude,
      current: weatherData.current,
      hourly: weatherData.hourly,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Erreur météo:', err);
    return res.status(500).json({ error: 'Impossible de récupérer la météo en direct' });
  }
});

// Explicit PWA Manifest & Service Worker routes for PWABuilder & Mobile APK packaging
app.get('/sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Dev vs Production Vite mounting
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Daily Pilot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

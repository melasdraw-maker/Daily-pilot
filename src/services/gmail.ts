import { getAccessToken } from './auth';

export interface GmailSearchResult {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  sender: string;
  date: string;
  hasAttachments: boolean;
  attachmentNames: string[];
  rawText?: string;
}

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me';

export async function searchGmailMissions(
  query: string = 'formation OR convocation OR planning OR session',
  maxResults: number = 15
): Promise<GmailSearchResult[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentification requise pour Gmail');

  const url = `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur recherche Gmail (${res.status})`);
  }

  const listData = await res.json();
  const messages = listData.messages || [];

  const results: GmailSearchResult[] = [];

  // Fetch details for each message
  for (const msg of messages.slice(0, 10)) {
    try {
      const msgRes = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!msgRes.ok) continue;
      const data = await msgRes.json();

      let subject = 'Sans objet';
      let sender = 'Inconnu';
      let date = '';

      const headers = data.payload?.headers || [];
      for (const h of headers) {
        if (h.name.toLowerCase() === 'subject') subject = h.value;
        if (h.name.toLowerCase() === 'from') sender = h.value;
        if (h.name.toLowerCase() === 'date') date = h.value;
      }

      const attachmentNames: string[] = [];
      const extractAttachments = (parts: any[]) => {
        if (!parts) return;
        for (const p of parts) {
          if (p.filename && p.filename.length > 0) {
            attachmentNames.push(p.filename);
          }
          if (p.parts) extractAttachments(p.parts);
        }
      };

      if (data.payload?.parts) {
        extractAttachments(data.payload.parts);
      }

      results.push({
        id: data.id,
        threadId: data.threadId,
        snippet: data.snippet || '',
        subject,
        sender,
        date,
        hasAttachments: attachmentNames.length > 0,
        attachmentNames,
      });
    } catch (e) {
      console.warn('Erreur lecture message Gmail:', e);
    }
  }

  return results;
}

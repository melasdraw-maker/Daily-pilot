import { jsPDF } from 'jspdf';
import { Mission, UserProfile } from '../types';
import { calculateTravelAndWakeUp } from './routing';
import { getAccessToken } from './auth';

export function generateWeeklyPlanningPdf(
  missions: Mission[],
  profile: UserProfile,
  weekTitle: string = 'Planning Hebdomadaire des Formations'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const generationDate = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const version = `v${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}-${now.getHours()}${now.getMinutes()}`;

  // Header Background Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DAILY PILOT — PLANNING HEBDOMADAIRE', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Formateur : ${profile.name} | Domicile : ${profile.homeCity} | Généré le : ${generationDate} | Réf: ${version}`, 14, 24);

  let yPos = 42;

  // Overview summary box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total missions : ${missions.length} intervention(s)`, 18, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Paramètres appliqués : Marge sécurité ${profile.safetyMarginMinutes} min | Préparation ${profile.prepDurationMinutes} min | Réveil min ${profile.minWakeUpTime}`,
    18,
    yPos + 12
  );

  yPos += 24;

  // Sort missions by date and start time
  const sorted = [...missions].sort((a, b) => `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`));

  sorted.forEach((m, idx) => {
    // Check if new page is needed
    if (yPos > pageHeight - 45) {
      doc.addPage();
      yPos = 20;
    }

    const travel = calculateTravelAndWakeUp(m, profile);

    // Card background
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.roundedRect(14, yPos, pageWidth - 28, 38, 2, 2, 'FD');

    // Colored category pill
    doc.setFillColor(37, 99, 235); // Blue 600
    doc.rect(14, yPos, 4, 38, 'F');

    // Day & Date
    const missionDate = new Date(`${m.startDate}T12:00:00`);
    const dateStr = missionDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).toUpperCase();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`${dateStr} : ${m.title}`, 22, yPos + 7);

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client / Organisme : ${m.client}  |  Horaires : ${m.startTime} - ${m.endTime}`, 22, yPos + 13);
    doc.text(`Lieu : ${m.address}, ${m.city}`, 22, yPos + 19);

    // Departure & Wake-up timing box
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 118, 110); // Teal 700
    doc.text(
      `Trajet : ~${travel.distanceKm} km (${travel.durationWithTrafficMinutes || travel.durationMinutes} min)   |   Départ recommandé : ${travel.departureTime}   |   Réveil : ${travel.wakeUpTime}`,
      22,
      yPos + 25
    );

    // Contact & Materials
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const contactText = m.contactName ? `Contact : ${m.contactName} (${m.contactPhone || 'N/C'})` : 'Contact sur place non renseigné';
    const matText = m.materials?.length ? `Matériel : ${m.materials.slice(0, 3).join(', ')}` : '';
    doc.text(`${contactText}  ${matText ? ' | ' + matText : ''}`, 22, yPos + 31);

    if (m.parkingInfo) {
      doc.text(`Accès/Parking : ${m.parkingInfo.slice(0, 90)}`, 22, yPos + 36);
    }

    yPos += 43;
  });

  // Footer on last page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Document généré par Daily Pilot — Assistant Intelligent du Formateur. Horaires calculés avec marges de sécurité.', 14, pageHeight - 8);

  return doc;
}

export async function shareOrDownloadPdf(doc: jsPDF, filename: string = 'Daily_Pilot_Planning.pdf') {
  const blob = doc.output('blob');
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      await navigator.share({
        title: 'Planning Hebdomadaire - Daily Pilot',
        text: 'Voici mon planning de formation de la semaine.',
        files: [file],
      });
      return;
    } catch {
      // User cancelled share or fallback to download
    }
  }
  doc.save(filename);
}

export async function savePdfToGoogleDrive(doc: jsPDF, filename: string = 'Daily_Pilot_Planning.pdf'): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentification requise pour Google Drive');

  const pdfBlob = doc.output('blob');
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    description: 'Planning hebdomadaire exporté depuis Daily Pilot',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur sauvegarde Drive (${res.status})`);
  }

  const data = await res.json();
  return data.id;
}

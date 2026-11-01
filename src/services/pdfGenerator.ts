import jsPDF from 'jspdf';

export interface FicheFraisDayRow {
  dayNumber: number; // 1..31
  dateStr: string; // "02/11/26"
  objet: string; // "ales", "nîmes", etc.
  kms: number | '';
  essence: number | '';
  autoroute: number | '';
  repas: number | '';
  divers: number | '';
  denomination: string;
  isWeekend?: boolean;
}

export interface FicheFraisMonthData {
  monthName: string; // "novembre 2026"
  periodStr: string; // "Période du 01/11/2026 au 30/11/2026"
  employeeName: string; // "HACHOUD WARD-SALEM"
  kmDebutMois: number;
  kmFinMois: number;
  tauxIk: number; // 0.40
  rows: FicheFraisDayRow[];
}

/**
 * Generates an official Opéra Formation "FICHE DE FRAIS" PDF file matching the template.
 */
export function generateOperaFicheDeFraisPdf(data: FicheFraisMonthData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 10;
  const marginRight = 10;
  const tableWidth = pageWidth - marginLeft - marginRight; // 190mm

  // Colors
  const darkGray = '#222222';
  const lightGray = '#f3f4f6';
  const weekendGray = '#e5e7eb';
  const borderGray = '#6b7280';
  const operaGreen = '#15803d'; // Opéra branding green

  // --- 1. HEADER (OPERA LOGO & TITLE) ---
  // Opéra Logo graphic
  doc.setFillColor(21, 128, 61); // green
  doc.rect(marginLeft, 10, 6, 6, 'F');
  doc.setFillColor(34, 34, 34); // black
  doc.rect(marginLeft + 7, 10, 6, 6, 'F');
  doc.rect(marginLeft, 17, 6, 6, 'F');
  doc.setFillColor(21, 128, 61);
  doc.rect(marginLeft + 7, 17, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(34, 34, 34);
  doc.text('Opéra', marginLeft + 16, 17);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Formation - Sécurité - Ingénierie - Conseil', marginLeft, 26);

  // Title Box on the right
  const titleBoxX = 75;
  const titleBoxWidth = pageWidth - titleBoxX - marginRight; // 125mm
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.6);
  doc.rect(titleBoxX, 10, titleBoxWidth, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(`FICHE DE FRAIS ${data.monthName.toUpperCase()} ${data.employeeName.toUpperCase()}`, titleBoxX + titleBoxWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(data.periodStr, titleBoxX + titleBoxWidth / 2, 22, { align: 'center' });

  // --- 2. TABLE HEADERS ---
  const startY = 32;
  const colWidths = {
    date: 18,
    objet: 48,
    kms: 16,
    essence: 20,
    autoroute: 18,
    repas: 18,
    divers: 16,
    denomination: 36,
  };

  const colX = {
    date: marginLeft,
    objet: marginLeft + colWidths.date,
    kms: marginLeft + colWidths.date + colWidths.objet,
    essence: marginLeft + colWidths.date + colWidths.objet + colWidths.kms,
    autoroute: marginLeft + colWidths.date + colWidths.objet + colWidths.kms + colWidths.essence,
    repas: marginLeft + colWidths.date + colWidths.objet + colWidths.kms + colWidths.essence + colWidths.autoroute,
    divers: marginLeft + colWidths.date + colWidths.objet + colWidths.kms + colWidths.essence + colWidths.autoroute + colWidths.repas,
    denomination: marginLeft + colWidths.date + colWidths.objet + colWidths.kms + colWidths.essence + colWidths.autoroute + colWidths.repas + colWidths.divers,
  };

  const rowHeight = 5.2;

  // Header row
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.setFillColor(245, 245, 245);
  doc.rect(marginLeft, startY, tableWidth, rowHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);

  doc.text('Date', colX.date + colWidths.date / 2, startY + 3.7, { align: 'center' });
  doc.text('Objet', colX.objet + colWidths.objet / 2, startY + 3.7, { align: 'center' });
  doc.text('kms', colX.kms + colWidths.kms / 2, startY + 3.7, { align: 'center' });
  doc.text('Essence', colX.essence + colWidths.essence / 2, startY + 3.7, { align: 'center' });
  doc.text('Autoroute', colX.autoroute + colWidths.autoroute / 2, startY + 3.7, { align: 'center' });
  doc.text('Repas', colX.repas + colWidths.repas / 2, startY + 3.7, { align: 'center' });
  doc.text('Divers', colX.divers + colWidths.divers / 2, startY + 3.7, { align: 'center' });
  doc.text('Divers/dénomination', colX.denomination + 2, startY + 3.7);

  // Column vertical lines for header
  Object.values(colX).forEach((x) => {
    doc.line(x, startY, x, startY + rowHeight);
  });
  doc.line(marginLeft + tableWidth, startY, marginLeft + tableWidth, startY + rowHeight);

  // --- 3. DAYS ROWS (1 to 31) ---
  let curY = startY + rowHeight;
  let totalKms = 0;
  let totalEssence = 0;
  let totalAutoroute = 0;
  let totalRepas = 0;
  let totalDivers = 0;

  data.rows.forEach((row) => {
    const isWk = row.isWeekend;

    if (isWk) {
      doc.setFillColor(235, 235, 235);
      doc.rect(marginLeft, curY, tableWidth, rowHeight, 'F');
    }

    doc.rect(marginLeft, curY, tableWidth, rowHeight, 'D');

    // Vertical column grid lines
    doc.line(colX.objet, curY, colX.objet, curY + rowHeight);
    doc.line(colX.kms, curY, colX.kms, curY + rowHeight);
    doc.line(colX.essence, curY, colX.essence, curY + rowHeight);
    doc.line(colX.autoroute, curY, colX.autoroute, curY + rowHeight);
    doc.line(colX.repas, curY, colX.repas, curY + rowHeight);
    doc.line(colX.divers, curY, colX.divers, curY + rowHeight);
    doc.line(colX.denomination, curY, colX.denomination, curY + rowHeight);

    doc.setFont('helvetica', isWk ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);

    // Date
    doc.text(row.dateStr, colX.date + colWidths.date / 2, curY + 3.7, { align: 'center' });

    // Objet
    if (row.objet) {
      doc.text(row.objet.slice(0, 30), colX.objet + 2, curY + 3.7);
    }

    // kms
    if (typeof row.kms === 'number' && row.kms > 0) {
      totalKms += row.kms;
      doc.text(String(row.kms), colX.kms + colWidths.kms / 2, curY + 3.7, { align: 'center' });
    }

    // Essence
    if (typeof row.essence === 'number' && row.essence > 0) {
      totalEssence += row.essence;
      doc.text(`${row.essence.toFixed(2)} €`, colX.essence + colWidths.essence - 2, curY + 3.7, { align: 'right' });
    }

    // Autoroute
    if (typeof row.autoroute === 'number' && row.autoroute > 0) {
      totalAutoroute += row.autoroute;
      doc.text(`${row.autoroute.toFixed(2)} €`, colX.autoroute + colWidths.autoroute - 2, curY + 3.7, { align: 'right' });
    }

    // Repas
    if (typeof row.repas === 'number' && row.repas > 0) {
      totalRepas += row.repas;
      doc.text(`${row.repas.toFixed(2)} €`, colX.repas + colWidths.repas - 2, curY + 3.7, { align: 'right' });
    }

    // Divers
    if (typeof row.divers === 'number' && row.divers > 0) {
      totalDivers += row.divers;
      doc.text(`${row.divers.toFixed(2)} €`, colX.divers + colWidths.divers - 2, curY + 3.7, { align: 'right' });
    }

    // Denomination / remarks
    if (row.denomination) {
      doc.setFontSize(6.5);
      doc.text(row.denomination.slice(0, 32), colX.denomination + 2, curY + 3.7);
    }

    curY += rowHeight;
  });

  // --- 4. SUMMARY BOX (BOTTOM) ---
  const summaryBoxWidth = colWidths.date + colWidths.objet;
  const summaryRowHeight = 5.2;

  // Total de kms
  doc.rect(marginLeft, curY, summaryBoxWidth, summaryRowHeight, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Total de kms', marginLeft + 2, curY + 3.7);
  doc.rect(colX.kms, curY, colWidths.kms, summaryRowHeight, 'D');
  doc.text(String(totalKms), colX.kms + colWidths.kms / 2, curY + 3.7, { align: 'center' });
  curY += summaryRowHeight;

  // Indemnité Kilométrique
  const totalIk = Math.round(totalKms * (data.tauxIk || 0.40) * 100) / 100;
  doc.rect(marginLeft, curY, summaryBoxWidth, summaryRowHeight, 'D');
  doc.text(`Indemnité Kilométrique ${(data.tauxIk || 0.40).toFixed(2)}€`, marginLeft + 2, curY + 3.7);
  doc.rect(colX.kms, curY, colWidths.kms, summaryRowHeight, 'D');
  doc.text(`${totalIk.toFixed(2)} €`, colX.kms + colWidths.kms / 2, curY + 3.7, { align: 'center' });
  curY += summaryRowHeight;

  // Km Début de Mois
  doc.rect(marginLeft, curY, summaryBoxWidth, summaryRowHeight, 'D');
  doc.text('Km Début de Mois', marginLeft + 2, curY + 3.7);
  doc.rect(colX.kms, curY, colWidths.kms, summaryRowHeight, 'D');
  doc.text(String(data.kmDebutMois || 25100), colX.kms + colWidths.kms / 2, curY + 3.7, { align: 'center' });
  curY += summaryRowHeight;

  // Km Fin de Mois
  const kmFinCalculated = data.kmFinMois || ((data.kmDebutMois || 25100) + totalKms);
  doc.rect(marginLeft, curY, summaryBoxWidth, summaryRowHeight, 'D');
  doc.text('Km Fin de Mois', marginLeft + 2, curY + 3.7);
  doc.rect(colX.kms, curY, colWidths.kms, summaryRowHeight, 'D');
  doc.text(String(kmFinCalculated), colX.kms + colWidths.kms / 2, curY + 3.7, { align: 'center' });

  // TOTAUX Row for Columns
  const totauxY = curY;
  doc.setFillColor(240, 240, 240);
  doc.rect(colX.essence, totauxY, colWidths.essence + colWidths.autoroute + colWidths.repas + colWidths.divers, summaryRowHeight, 'FD');

  // TOTAUX Label
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAUX', colX.kms - 2, totauxY + 3.7, { align: 'right' });

  // Totaux amounts
  doc.text(`${totalEssence.toFixed(2)} €`, colX.essence + colWidths.essence - 2, totauxY + 3.7, { align: 'right' });
  doc.text(`${totalAutoroute.toFixed(2)} €`, colX.autoroute + colWidths.autoroute - 2, totauxY + 3.7, { align: 'right' });
  doc.text(`${totalRepas.toFixed(2)} €`, colX.repas + colWidths.repas - 2, totauxY + 3.7, { align: 'right' });
  doc.text(`${totalDivers.toFixed(2)} €`, colX.divers + colWidths.divers - 2, totauxY + 3.7, { align: 'right' });

  curY += summaryRowHeight;

  // GRAND TOTAL
  const grandTotal = totalEssence + totalAutoroute + totalRepas + totalDivers + totalIk;
  doc.setFillColor(34, 34, 34);
  doc.rect(colX.divers, curY, colWidths.divers + colWidths.denomination, summaryRowHeight + 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('TOTAL GÉNÉRAL', colX.divers + 2, curY + 4.5);
  doc.text(`${grandTotal.toFixed(2)} €`, marginLeft + tableWidth - 2, curY + 4.5, { align: 'right' });

  return doc;
}

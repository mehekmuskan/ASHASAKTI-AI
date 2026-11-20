import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { VisitRecord } from '../types/health';

export function exportVisitsToPdf(visits: VisitRecord[], contextLabel: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('AshaSakhi-AI — Karnataka ASHA Home Visit Register', 40, 42);

  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${contextLabel}  ·  Generated ${new Date().toISOString().slice(0, 10)}  ·  ${visits.length} records`,
    40,
    60
  );

  const rows = visits.map((v) => [
    v.visitDate,
    `${v.patientName} (${v.patientAge}y)`,
    `${v.village}, ${v.district}`,
    v.category,
    v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '—',
    v.hemoglobin !== null ? `${v.hemoglobin.toFixed(1)}` : '—',
    v.symptoms || '—',
    v.ifaTabletsGiven > 0 ? `${v.ifaTabletsGiven} tabs` : '—',
    v.riskLevel.toUpperCase(),
    v.followUpStatus.toUpperCase(),
    v.nextVisitDate,
  ]);

  autoTable(doc, {
    startY: 76,
    head: [
      [
        'Date',
        'Beneficiary',
        'Village / District',
        'Category',
        'BP',
        'Hb (g/dL)',
        'Symptoms',
        'IFA',
        'Risk',
        'Follow-up',
        'Next Visit',
      ],
    ],
    body: rows,
    styles: { fontSize: 8, cellPadding: 5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`ashasakhi-register-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportVisitsToExcel(visits: VisitRecord[]): void {
  const sheetRows = visits.map((v) => ({
    'Visit Date': v.visitDate,
    'Beneficiary Name': v.patientName,
    'Age (yrs)': v.patientAge,
    Village: v.village,
    PHC: v.phcName,
    District: v.district,
    Category: v.category,
    'Gestational Weeks': v.gestationalWeeks ?? '',
    'BP Systolic (mmHg)': v.bpSystolic ?? '',
    'BP Diastolic (mmHg)': v.bpDiastolic ?? '',
    'Hemoglobin (g/dL)': v.hemoglobin ?? '',
    'Weight (kg)': v.weightKg ?? '',
    Symptoms: v.symptoms,
    Counseling: v.counselingGiven,
    'IFA Tablets': v.ifaTabletsGiven,
    Immunization: v.immunizationStatus,
    'Risk Level': v.riskLevel.toUpperCase(),
    'Risk Reasons': v.riskReasons.join('; '),
    'Recommended Action': v.recommendedAction,
    'Follow-up Status': v.followUpStatus,
    'Next Visit Date': v.nextVisitDate,
    'Raw Transcript': v.rawTranscript,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ASHA Visit Register');
  XLSX.writeFile(workbook, `ashasakhi-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Exportación de reportes a Excel (.xlsx) y PDF, generados en el navegador.
// Las librerías se cargan bajo demanda (import dinámico): no pesan en el bundle principal.
// Un mismo modelo de tablas (`ExportDoc`) alimenta los dos formatos.

import type { SheetData } from 'write-excel-file/universal';
import { getLocale, tr } from '../i18n';

export type ExportCell = string | number | null;

export interface ExportTable {
  /** Nombre de la hoja de Excel / título de la sección en el PDF */
  name: string;
  headers: string[];
  rows: ExportCell[][];
}

export interface ExportDoc {
  title: string;
  subtitle?: string;
  tables: ExportTable[];
}

/** Máximo de filas por tabla en el PDF: más allá es ilegible y lento; el Excel no tiene tope. */
export const PDF_MAX_ROWS = 1500;

const HEADER_BG = '#E2E8F0';

const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Excel: máx. 31 caracteres, sin `[]:*?/\`, y sin nombres repetidos. */
export const safeSheetName = (name: string, used: Set<string>): string => {
  const base = (name.replace(/[[\]:*?/\\]/g, ' ').trim() || 'Sheet').slice(0, 31);
  let candidate = base;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) {
    const suffix = ` ${i}`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

/** Ancho de columna (en caracteres) según el contenido, con tope. */
const columnWidths = (t: ExportTable): { width: number }[] =>
  t.headers.map((h, i) => {
    const longest = t.rows.reduce((m, r) => Math.max(m, String(r[i] ?? '').length), h.length);
    return { width: Math.min(48, Math.max(8, longest + 2)) };
  });

export async function exportXlsx(filename: string, doc: ExportDoc): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const used = new Set<string>();

  const sheets = doc.tables.map(t => {
    const data: SheetData = [
      t.headers.map(h => ({ value: h, fontWeight: 'bold' as const, backgroundColor: HEADER_BG })),
      ...t.rows.map(r => r.map(c => (c === null ? null : { value: c }))),
    ];
    return {
      data,
      sheet: safeSheetName(t.name, used),
      columns: columnWidths(t),
      stickyRowsCount: 1,
    };
  });

  const blob = await writeExcelFile(sheets).toBlob();
  saveBlob(blob, filename);
}

export async function exportPdf(filename: string, doc: ExportDoc): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  const margin = 36;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(doc.title, margin, 44);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  const generated = tr('reportes.generado', { date: new Date().toLocaleString(getLocale()) });
  pdf.text(doc.subtitle ? `${doc.subtitle}  ·  ${generated}` : generated, margin, 60);
  pdf.setTextColor(0);

  let y = 78;
  for (const t of doc.tables) {
    // Cada tabla empieza con su título; si no cabe en lo que queda de página, en una nueva
    if (y > pageH - 110) { pdf.addPage(); y = margin; }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(t.name, margin, y);
    y += 8;

    const truncated = t.rows.length > PDF_MAX_ROWS;
    const body = (truncated ? t.rows.slice(0, PDF_MAX_ROWS) : t.rows)
      .map(r => r.map(c => (c === null ? '' : String(c))));

    let endY = y;
    autoTable(pdf, {
      head: [t.headers],
      body,
      startY: y,
      margin: { left: margin, right: margin, bottom: 36 },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      didDrawPage: (d) => { endY = d.cursor?.y ?? endY; },
    });
    y = endY + 10;

    if (truncated) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(tr('reportes.pdf_truncado', { n: PDF_MAX_ROWS, total: t.rows.length }), margin, y);
      pdf.setTextColor(0);
      y += 16;
    }
    y += 12;
  }

  // Pie con numeración en todas las páginas
  const pages = pdf.getNumberOfPages();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(120);
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.text(`${p} / ${pages}`, pageW - margin, pageH - 18, { align: 'right' });
  }

  saveBlob(pdf.output('blob'), filename);
}

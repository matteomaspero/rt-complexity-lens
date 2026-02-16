/**
 * PDF Report Generator for RTp-lens
 *
 * Generates structured, multi-page PDF reports using jsPDF.
 * Charts are captured from the DOM via html2canvas and embedded as images.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { PlanMetrics, BeamMetrics, RTPlan } from '@/lib/dicom/types';
import { PLAN_COLUMNS, type ExportablePlan } from '@/lib/export-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PDFChartRef {
  label: string;
  element: HTMLElement | null;
}

interface TableRow {
  cells: string[];
  isCategoryHeader?: boolean;
  isHighlighted?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_H = 12;
const HEADER_COLOR: [number, number, number] = [41, 98, 255]; // brand blue
const HEADER_BG_LIGHT: [number, number, number] = [235, 241, 255];
const ALT_ROW: [number, number, number] = [248, 249, 252];
const TEXT_COLOR: [number, number, number] = [30, 30, 30];
const MUTED_COLOR: [number, number, number] = [120, 120, 130];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
    doc.text('RTp-lens — rt-complexity-lens.lovable.app', MARGIN, PAGE_H - 5);
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - FOOTER_H) {
    doc.addPage();
    return MARGIN + 5;
  }
  return y;
}

function drawHLine(doc: jsPDF, y: number) {
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function addCoverPage(
  doc: jsPDF,
  title: string,
  subtitle: string,
  infoRows: [string, string][],
) {
  let y = 40;

  // Title bar
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('RTp-lens Complexity Report', MARGIN, 18);

  // Subtitle
  y = 38;
  doc.setFontSize(13);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(title, MARGIN, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(subtitle, MARGIN, y);
  y += 4;
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, MARGIN, y);
  y += 8;

  drawHLine(doc, y);
  y += 6;

  // Info table
  doc.setFontSize(9);
  for (const [label, value] of infoRows) {
    y = ensureSpace(doc, y, 6);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(label, MARGIN, y);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(value || '—', MARGIN + 45, y);
    y += 5;
  }

  return y + 4;
}

// ---------------------------------------------------------------------------
// Table drawing
// ---------------------------------------------------------------------------

function drawTable(
  doc: jsPDF,
  y: number,
  headers: string[],
  rows: TableRow[],
  colWidths?: number[],
  contentWidth?: number,
): number {
  const cw = contentWidth ?? CONTENT_W;
  const nCols = headers.length;
  const defaultW = cw / nCols;
  const widths = colWidths ?? headers.map(() => defaultW);
  const baseX = MARGIN;

  // Header
  y = ensureSpace(doc, y, 12);
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(baseX, y - 4, cw, 6, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  let x = baseX + 1;
  for (let c = 0; c < nCols; c++) {
    doc.text(headers[c], x, y, { maxWidth: widths[c] - 2 });
    x += widths[c];
  }
  y += 4;

  // Rows
  doc.setFontSize(7.5);
  for (let r = 0; r < rows.length; r++) {
    y = ensureSpace(doc, y, 5);
    const row = rows[r];

    if (row.isCategoryHeader) {
      doc.setFillColor(...HEADER_BG_LIGHT);
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 5, 'F');
      doc.setTextColor(...HEADER_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(row.cells[0], MARGIN + 1, y);
      doc.setFont('helvetica', 'normal');
      y += 4;
      continue;
    }

    // Alternating rows
    if (r % 2 === 0 && !row.isHighlighted) {
      doc.setFillColor(...ALT_ROW);
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 4.5, 'F');
    }
    if (row.isHighlighted) {
      doc.setFillColor(255, 250, 230);
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 4.5, 'F');
    }

    doc.setTextColor(...TEXT_COLOR);
    x = MARGIN + 1;
    for (let c = 0; c < nCols; c++) {
      const cellText = row.cells[c] ?? '';
      doc.text(cellText, x, y, { maxWidth: widths[c] - 2 });
      x += widths[c];
    }
    y += 4;
  }

  return y + 2;
}

// ---------------------------------------------------------------------------
// Chart capture
// ---------------------------------------------------------------------------

interface CapturedChart {
  data: string;
  ratio: number;
  label: string;
}

async function captureChart(element: HTMLElement): Promise<{ data: string; ratio: number } | null> {
  try {
    const canvas = await html2canvas(element, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    const ratio = canvas.height / canvas.width;
    return { data: canvas.toDataURL('image/jpeg', 0.85), ratio };
  } catch {
    return null;
  }
}

function addChartPage(doc: jsPDF, y: number, label: string, chart: { data: string; ratio: number }, contentW: number = CONTENT_W, xOffset: number = MARGIN): number {
  const maxH = 120;
  let imgW = contentW;
  let imgH = imgW * chart.ratio;
  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH / chart.ratio;
  }
  y = ensureSpace(doc, y, imgH + 14);
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(label, xOffset, y);
  y += 4;
  doc.addImage(chart.data, 'JPEG', xOffset, y, imgW, imgH);
  y += imgH + 6;
  return y;
}

// ---------------------------------------------------------------------------
// Metrics table builder (shared across modes)
// ---------------------------------------------------------------------------

/** Build rows from PLAN_COLUMNS for a set of exportable plans */
function buildMetricsRows(plans: ExportablePlan[], includeBeams = true): { headers: string[]; rows: TableRow[]; widths: number[] } {
  // Use a compact subset of columns for PDF readability
  const metricCols = PLAN_COLUMNS.filter(c =>
    c.category !== 'Plan Info' && c.category !== 'Row' && c.category !== 'Beam Geometry'
  );

  const headers = ['File', 'Beam', 'Level', ...metricCols.map(c => c.header)];
  const nMetric = metricCols.length;
  const metricW = (CONTENT_W - 50) / nMetric;
  const widths = [22, 14, 14, ...metricCols.map(() => Math.max(metricW, 8))];

  const rows: TableRow[] = [];
  let lastCategory = '';

  // Add category headers inline
  for (const col of metricCols) {
    if (col.category !== lastCategory) {
      lastCategory = col.category;
    }
  }

  for (const p of plans) {
    // Plan-total row
    const planCells = [
      p.fileName.replace(/\.dcm$/i, '').slice(0, 20),
      'ALL',
      'Plan',
      ...metricCols.map(col => {
        if (col.beamOnly) return '';
        const v = col.extract(p);
        if (typeof v === 'number') return isNaN(v) ? '' : v.toFixed(col.decimals);
        return v ?? '';
      }),
    ];
    rows.push({ cells: planCells.map(String), isHighlighted: true });

    // Beam rows
    if (includeBeams) {
      for (const bm of p.metrics.beamMetrics) {
        const beamCells = [
          '',
          `${bm.beamNumber}`,
          'Beam',
          ...metricCols.map(col => {
            if (col.planOnly) return '';
            if (col.extractBeam) {
              const v = col.extractBeam(bm);
              if (v === undefined) return '';
              if (typeof v === 'number') return isNaN(v) ? '' : v.toFixed(col.decimals);
              return String(v);
            }
            return '';
          }),
        ];
        rows.push({ cells: beamCells });
      }
    }
  }

  return { headers, rows, widths };
}

/** Compact metrics table: key-value pairs in two columns */
function buildCompactMetrics(
  metrics: PlanMetrics,
  plan: RTPlan,
): { headers: string[]; rows: TableRow[]; widths: number[] } {
  const headers = ['Metric', 'Value', 'Unit'];
  const widths = [60, 50, CONTENT_W - 110];
  const rows: TableRow[] = [];

  const metricCols = PLAN_COLUMNS.filter(c =>
    c.category !== 'Plan Info' && c.category !== 'Row' && c.category !== 'Beam Geometry'
  );

  let lastCat = '';
  const exportable: ExportablePlan = { fileName: '', plan, metrics };

  for (const col of metricCols) {
    if (col.category !== lastCat) {
      lastCat = col.category;
      rows.push({ cells: [col.category], isCategoryHeader: true });
    }
    if (col.beamOnly) continue;
    const v = col.extract(exportable);
    if (v === undefined || v === '') continue;
    const display = typeof v === 'number' ? (isNaN(v) ? '' : v.toFixed(col.decimals)) : String(v);
    const unit = col.header.match(/\(([^)]+)\)$/)?.[1] ?? '';
    rows.push({ cells: [col.header.replace(/\s*\([^)]+\)$/, ''), display, unit] });
  }

  return { headers, rows, widths };
}

// ---------------------------------------------------------------------------
// Single Plan PDF
// ---------------------------------------------------------------------------

export async function generateSinglePlanPDF(
  plan: RTPlan,
  metrics: PlanMetrics,
  chartRefs: PDFChartRef[] = [],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cover
  let y = addCoverPage(doc, plan.planLabel || 'Treatment Plan', `Single Plan Analysis`, [
    ['Patient ID', plan.patientId],
    ['Patient Name', plan.patientName],
    ['Technique', plan.technique],
    ['Machine', plan.treatmentMachineName ?? ''],
    ['Institution', plan.institutionName ?? ''],
    ['Beams', String(plan.beams.length)],
    ['Total MU', metrics.totalMU.toFixed(1)],
    ['Rx Dose', metrics.prescribedDose != null ? `${metrics.prescribedDose.toFixed(2)} Gy` : '—'],
    ['Fractions', metrics.numberOfFractions != null ? String(metrics.numberOfFractions) : '—'],
    ['Dose/Fx', metrics.dosePerFraction != null ? `${metrics.dosePerFraction.toFixed(2)} Gy` : '—'],
  ]);

  // Plan metrics
  doc.addPage();
  y = MARGIN + 5;
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Plan-Level Metrics', MARGIN, y);
  y += 6;

  const compact = buildCompactMetrics(metrics, plan);
  y = drawTable(doc, y, compact.headers, compact.rows, compact.widths);

  // Beam metrics
  for (const bm of metrics.beamMetrics) {
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(10);
    doc.setTextColor(...HEADER_COLOR);
    doc.text(`Beam ${bm.beamNumber}: ${bm.beamName}`, MARGIN, y);
    y += 5;

    const beamRows: TableRow[] = [];
    const metricCols = PLAN_COLUMNS.filter(c =>
      c.category !== 'Plan Info' && c.category !== 'Row' && !c.planOnly
    );
    let lastCat = '';
    for (const col of metricCols) {
      if (col.category !== lastCat) {
        lastCat = col.category;
        beamRows.push({ cells: [col.category], isCategoryHeader: true });
      }
      if (!col.extractBeam) continue;
      const v = col.extractBeam(bm);
      if (v === undefined || v === '') continue;
      const display = typeof v === 'number' ? (isNaN(v) ? '' : v.toFixed(col.decimals)) : String(v);
      const unit = col.header.match(/\(([^)]+)\)$/)?.[1] ?? '';
      beamRows.push({ cells: [col.header.replace(/\s*\([^)]+\)$/, ''), display, unit] });
    }
    y = drawTable(doc, y, ['Metric', 'Value', 'Unit'], beamRows, [60, 50, CONTENT_W - 110]);
  }

  // Charts
  for (const ref of chartRefs) {
    if (!ref.element) continue;
    const chart = await captureChart(ref.element);
    if (chart) {
      y = addChartPage(doc, y, ref.label, chart);
    }
  }

  addFooter(doc);
  doc.save(`${(plan.planLabel || 'plan').replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf`);
}

// ---------------------------------------------------------------------------
// Batch PDF
// ---------------------------------------------------------------------------

export async function generateBatchPDF(
  plans: ExportablePlan[],
  chartRefs: PDFChartRef[] = [],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Cover (landscape A4: 297 x 210)
  const lW = 297;
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, lW, 28, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('RTp-lens — Batch Analysis Report', 15, 18);

  let y = 38;
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${plans.length} plans analyzed`, 15, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, 15, y);
  y += 10;

  // Summary statistics
  const numericCols = PLAN_COLUMNS.filter(c => {
    if (c.category === 'Plan Info' || c.category === 'Row' || c.category === 'Beam Geometry') return false;
    return plans.some(p => typeof c.extract(p) === 'number');
  });

  const statsHeaders = ['Metric', 'Min', 'Q1', 'Median', 'Q3', 'P95', 'Max', 'Mean', 'Std'];
  const statsWidths = [45, 22, 22, 22, 22, 22, 22, 22, 22];
  // landscape content width is 297 - 30 = 267
  const statsRows: TableRow[] = [];
  let lastCat = '';

  for (const col of numericCols) {
    if (col.beamOnly) continue;
    if (col.category !== lastCat) {
      lastCat = col.category;
      statsRows.push({ cells: [col.category], isCategoryHeader: true });
    }
    const values = plans
      .map(p => col.extract(p))
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) continue;

    const min = values[0];
    const max = values[values.length - 1];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const q1 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const p95 = values[Math.floor(values.length * 0.95)];

    const d = col.decimals;
    statsRows.push({
      cells: [
        col.header.replace(/\s*\([^)]+\)$/, ''),
        min.toFixed(d), q1.toFixed(d), median.toFixed(d), q3.toFixed(d),
        p95.toFixed(d), max.toFixed(d), mean.toFixed(d), std.toFixed(d),
      ],
    });
  }

  doc.addPage('landscape');
  y = 15;
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Summary Statistics', 15, y);
  y += 6;
  y = drawTable(doc, y, statsHeaders, statsRows, statsWidths);

  // Charts
  for (const ref of chartRefs) {
    if (!ref.element) continue;
    const chart = await captureChart(ref.element);
    if (chart) {
      doc.addPage('landscape');
      y = 15;
      y = addChartPage(doc, y, ref.label, chart, 267, 15);
    }
  }

  addFooter(doc);
  doc.save(`rtplens-batch-report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ---------------------------------------------------------------------------
// Cohort PDF
// ---------------------------------------------------------------------------

export async function generateCohortPDF(
  plans: ExportablePlan[],
  chartRefs: PDFChartRef[] = [],
) {
  // Reuse batch format with different title
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, 297, 28, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('RTp-lens — Cohort Analysis Report', 15, 18);

  let y = 38;
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${plans.length} plans in cohort`, 15, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, 15, y);
  y += 10;

  // Summary stats (same as batch)
  const numericCols = PLAN_COLUMNS.filter(c => {
    if (c.category === 'Plan Info' || c.category === 'Row' || c.category === 'Beam Geometry') return false;
    return plans.some(p => typeof c.extract(p) === 'number');
  });

  const statsHeaders = ['Metric', 'Min', 'Q1', 'Median', 'Q3', 'P95', 'Max', 'Mean', 'Std'];
  const statsWidths = [45, 22, 22, 22, 22, 22, 22, 22, 22];
  const statsRows: TableRow[] = [];
  let lastCat = '';

  for (const col of numericCols) {
    if (col.beamOnly) continue;
    if (col.category !== lastCat) {
      lastCat = col.category;
      statsRows.push({ cells: [col.category], isCategoryHeader: true });
    }
    const values = plans
      .map(p => col.extract(p))
      .filter((v): v is number => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => a - b);
    if (values.length === 0) continue;

    const min = values[0];
    const max = values[values.length - 1];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const q1 = values[Math.floor(values.length * 0.25)];
    const median = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const p95 = values[Math.floor(values.length * 0.95)];
    const d = col.decimals;

    statsRows.push({
      cells: [
        col.header.replace(/\s*\([^)]+\)$/, ''),
        min.toFixed(d), q1.toFixed(d), median.toFixed(d), q3.toFixed(d),
        p95.toFixed(d), max.toFixed(d), mean.toFixed(d), std.toFixed(d),
      ],
    });
  }

  doc.addPage('landscape');
  y = 15;
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Summary Statistics', 15, y);
  y += 6;
  y = drawTable(doc, y, statsHeaders, statsRows, statsWidths);

  // Charts
  for (const ref of chartRefs) {
    if (!ref.element) continue;
    const chart = await captureChart(ref.element);
    if (chart) {
      doc.addPage('landscape');
      y = 15;
      y = addChartPage(doc, y, ref.label, chart, 267, 15);
    }
  }

  addFooter(doc);
  doc.save(`rtplens-cohort-report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ---------------------------------------------------------------------------
// Compare PDF
// ---------------------------------------------------------------------------

export async function generateComparePDF(
  planA: { plan: RTPlan; metrics: PlanMetrics; fileName: string },
  planB: { plan: RTPlan; metrics: PlanMetrics; fileName: string },
  chartRefs: PDFChartRef[] = [],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cover
  let y = addCoverPage(doc, 'Plan Comparison', `Plan A vs Plan B`, [
    ['', ''],
    ['— Plan A —', ''],
    ['File', planA.fileName],
    ['Patient', planA.plan.patientId],
    ['Label', planA.plan.planLabel],
    ['Technique', planA.plan.technique],
    ['Machine', planA.plan.treatmentMachineName ?? '—'],
    ['Total MU', planA.metrics.totalMU.toFixed(1)],
    ['', ''],
    ['— Plan B —', ''],
    ['File', planB.fileName],
    ['Patient', planB.plan.patientId],
    ['Label', planB.plan.planLabel],
    ['Technique', planB.plan.technique],
    ['Machine', planB.plan.treatmentMachineName ?? '—'],
    ['Total MU', planB.metrics.totalMU.toFixed(1)],
  ]);

  // Diff table
  doc.addPage();
  y = MARGIN + 5;
  doc.setFontSize(12);
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Metrics Comparison', MARGIN, y);
  y += 6;

  const diffHeaders = ['Metric', 'Plan A', 'Plan B', 'Diff', 'Diff %'];
  const diffWidths = [50, 30, 30, 30, CONTENT_W - 140];
  const diffRows: TableRow[] = [];

  const metricCols = PLAN_COLUMNS.filter(c =>
    c.category !== 'Plan Info' && c.category !== 'Row' && c.category !== 'Beam Geometry' && !c.beamOnly
  );

  let lastCat2 = '';
  const eA: ExportablePlan = { fileName: planA.fileName, plan: planA.plan, metrics: planA.metrics };
  const eB: ExportablePlan = { fileName: planB.fileName, plan: planB.plan, metrics: planB.metrics };

  for (const col of metricCols) {
    if (col.category !== lastCat2) {
      lastCat2 = col.category;
      diffRows.push({ cells: [col.category], isCategoryHeader: true });
    }

    const vA = col.extract(eA);
    const vB = col.extract(eB);
    if (typeof vA !== 'number' && typeof vB !== 'number') continue;

    const numA = typeof vA === 'number' ? vA : NaN;
    const numB = typeof vB === 'number' ? vB : NaN;
    const diff = !isNaN(numA) && !isNaN(numB) ? numB - numA : NaN;
    const pct = !isNaN(diff) && numA !== 0 ? (diff / Math.abs(numA)) * 100 : NaN;

    diffRows.push({
      cells: [
        col.header.replace(/\s*\([^)]+\)$/, ''),
        !isNaN(numA) ? numA.toFixed(col.decimals) : '—',
        !isNaN(numB) ? numB.toFixed(col.decimals) : '—',
        !isNaN(diff) ? (diff >= 0 ? '+' : '') + diff.toFixed(col.decimals) : '—',
        !isNaN(pct) ? (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%' : '—',
      ],
    });
  }

  y = drawTable(doc, y, diffHeaders, diffRows, diffWidths);

  // Charts
  for (const ref of chartRefs) {
    if (!ref.element) continue;
    const chart = await captureChart(ref.element);
    if (chart) {
      y = addChartPage(doc, y, ref.label, chart);
    }
  }

  addFooter(doc);
  const nameA = (planA.plan.planLabel || 'A').replace(/[^a-zA-Z0-9]/g, '_');
  const nameB = (planB.plan.planLabel || 'B').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`rtplens-compare_${nameA}_vs_${nameB}.pdf`);
}

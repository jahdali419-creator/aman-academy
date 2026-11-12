import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatDateLong } from "@/lib/format";

export type CertificatePdfInput = {
  number: string;
  learnerNameEn: string;
  learnerNameAr: string | null;
  courseTitleEn: string;
  courseTitleAr: string;
  courseCode: string;
  completedAt: Date;
  expiresAt: Date | null;
  instructorEn: string | null;
  instructorAr: string | null;
  status: "valid" | "revoked" | "expired";
  verifyUrl: string;
  sample: boolean;
};

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const font = (f: string) => path.join(FONT_DIR, f);
const NAVY = "#0a1c36";
const EMERALD = "#0e7c5b";
const MUTED = "#55627a";
const PAPER = "#fbf8f3";
const LINE = "#d6cab7";
const isArabic = (s: string) => /[؀-ۿ]/.test(s);

type Doc = InstanceType<typeof PDFDocument>;
type LineOpts = { size: number; color?: string; bold?: boolean; align?: "center" | "start" | "end"; x?: number; width?: number };

/**
 * Draw one line of text with reliable bidirectional layout.
 * PDFKit shapes Arabic letters correctly inside a word, but does not order
 * words right-to-left, so each word is measured and placed individually:
 * right-to-left when the line contains Arabic, left-to-right otherwise.
 * Arabic words use the Arabic font and Latin words/numbers the Latin font.
 */
function drawLine(doc: Doc, text: string, y: number, o: LineOpts) {
  const words = text
    .trim()
    .split(/\s+/)
    // ASCII punctuation attached to an Arabic word is not in the Arabic font subset.
    .map((w) => (isArabic(w) ? w.replace(/[.,:;!?()"']/g, "") : w))
    .filter(Boolean);
  if (words.length === 0) return;
  const rtl = words.some(isArabic);
  const face = (w: string) => `${isArabic(w) ? "ar" : "en"}${o.bold ? "-bold" : ""}`;
  doc.fontSize(o.size);
  const widths = words.map((w) => doc.font(face(w)).widthOfString(w));
  const gap = o.size * 0.3;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  const boxX = o.x ?? 0;
  const boxW = o.width ?? doc.page.width;
  const align = o.align ?? "center";
  // "start" follows the text direction: right edge for Arabic, left edge otherwise.
  const left = align === "center" ? boxX + (boxW - total) / 2 : (align === "start") === rtl ? boxX + boxW - total : boxX;
  doc.fillColor(o.color ?? NAVY);
  let cursor = rtl ? left + total : left;
  words.forEach((w, i) => {
    if (rtl) cursor -= widths[i];
    doc.font(face(w)).text(w, cursor, y, { lineBreak: false });
    cursor += rtl ? -gap : widths[i] + gap;
  });
}

function drawMark(doc: Doc, x: number, y: number, size: number) {
  const s = size / 40;
  doc.save().translate(x, y).scale(s);
  doc.path("M20 3 5.5 8.2v10.3c0 8.7 5.8 15.2 14.5 18.5 8.7-3.3 14.5-9.8 14.5-18.5V8.2L20 3Z").fill(NAVY);
  doc.path("m13.2 19.8 4.7 4.7 9-9.6").lineWidth(3.2).lineCap("round").lineJoin("round").stroke("#13996f");
  doc.restore();
}

/** Render the bilingual certificate as an A4 landscape PDF. */
export async function renderCertificatePdf(c: CertificatePdfInput): Promise<Buffer> {
  const qr = await QRCode.toBuffer(c.verifyUrl, { errorCorrectionLevel: "M", margin: 0, width: 360, color: { dark: NAVY, light: "#ffffff" } });
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    font: font("ibm-plex-sans-latin-400-normal.woff"),
    info: { Title: `Certificate ${c.number}`, Author: "Aman Academy", Subject: c.courseTitleEn },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (d: Buffer) => chunks.push(d));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("en", font("ibm-plex-sans-latin-400-normal.woff"));
  doc.registerFont("en-bold", font("ibm-plex-sans-latin-600-normal.woff"));
  doc.registerFont("ar", font("ibm-plex-sans-arabic-arabic-400-normal.woff"));
  doc.registerFont("ar-bold", font("ibm-plex-sans-arabic-arabic-600-normal.woff"));

  const W = doc.page.width;
  const H = doc.page.height;

  // Frame
  doc.rect(0, 0, W, H).fill(PAPER);
  doc.rect(18, 18, W - 36, H - 36).lineWidth(2.5).stroke(NAVY);
  doc.rect(27, 27, W - 54, H - 54).lineWidth(0.6).stroke(EMERALD);
  doc.rect(18, 18, W - 36, 7).fill(NAVY);

  // Watermark for anything that is not a live, valid certificate
  const mark = c.status === "revoked" ? "REVOKED" : c.status === "expired" ? "EXPIRED" : c.sample ? "SAMPLE" : null;
  if (mark) {
    doc.save().translate(W / 2, H / 2).rotate(-24).font("en-bold").fontSize(120).fillColor(c.status === "valid" ? NAVY : "#a3231a").fillOpacity(0.06);
    doc.text(mark, -doc.widthOfString(mark) / 2, -60, { lineBreak: false });
    doc.restore().fillOpacity(1);
  }

  // Issuer
  drawMark(doc, W / 2 - 17, 48, 34);
  drawLine(doc, "Aman Academy", 90, { size: 12, bold: true, x: 0, width: W / 2 - 14, align: "end" });
  drawLine(doc, "أكاديمية أمان", 88, { size: 12, bold: true, x: W / 2 + 14, width: W / 2 - 14, align: "end" });

  // Title
  drawLine(doc, "Certificate of Completion", 124, { size: 27, bold: true });
  drawLine(doc, "شهادة إتمام", 158, { size: 21, bold: true, color: EMERALD });

  // Holder
  drawLine(doc, "This is to certify that", 204, { size: 10.5, color: MUTED });
  drawLine(doc, c.learnerNameEn, 222, { size: 28, bold: true });
  if (c.learnerNameAr) drawLine(doc, c.learnerNameAr, 259, { size: 20, bold: true });
  doc.moveTo(W / 2 - 150, 296).lineTo(W / 2 + 150, 296).lineWidth(0.8).stroke(LINE);

  // Course
  drawLine(doc, "attended the live online course and passed its knowledge assessment", 308, { size: 10.5, color: MUTED });
  drawLine(doc, "حضر الدورة المباشرة عن بعد واجتاز تقييمها المعرفي", 324, { size: 10.5, color: MUTED });
  drawLine(doc, c.courseTitleEn, 348, { size: 20, bold: true });
  drawLine(doc, c.courseTitleAr, 376, { size: 17, bold: true, color: EMERALD });

  // Details (three columns) + QR
  const top = 428;
  const colW = 190;
  const col = (i: number) => 62 + i * colW;
  const field = (i: number, en: string, ar: string, value: string, valueAr?: string) => {
    drawLine(doc, en, top, { size: 8, color: MUTED, x: col(i), width: colW, align: "start" });
    drawLine(doc, ar, top + 11, { size: 8, color: MUTED, x: col(i), width: colW - 20, align: "end" });
    drawLine(doc, value, top + 27, { size: 11.5, bold: true, x: col(i), width: colW, align: "start" });
    if (valueAr) drawLine(doc, valueAr, top + 43, { size: 10.5, bold: true, x: col(i), width: colW - 20, align: "end" });
  };
  field(0, "Completion date", "تاريخ الإتمام", formatDateLong(c.completedAt, "en"), formatDateLong(c.completedAt, "ar"));
  field(1, "Certificate number", "رقم الشهادة", c.number);
  if (c.expiresAt) field(2, "Valid until", "سارية حتى", formatDateLong(c.expiresAt, "en"), formatDateLong(c.expiresAt, "ar"));
  else if (c.instructorEn) field(2, "Instructor", "المدرب", c.instructorEn, c.instructorAr ?? undefined);
  if (c.expiresAt && c.instructorEn) {
    drawLine(doc, `Instructor: ${c.instructorEn}`, top + 64, { size: 8.5, color: MUTED, x: col(0), width: 400, align: "start" });
  }

  const qrSize = 84;
  const qrX = W - 62 - qrSize;
  doc.rect(qrX - 6, top - 10, qrSize + 12, qrSize + 12).fill("#ffffff");
  doc.image(qr, qrX, top - 4, { width: qrSize });
  drawLine(doc, "Scan to verify", top + qrSize + 6, { size: 7.5, color: MUTED, x: qrX - 30, width: qrSize + 60 });
  drawLine(doc, "امسح للتحقق", top + qrSize + 16, { size: 7.5, color: MUTED, x: qrX - 30, width: qrSize + 60 });

  // Footer
  drawLine(doc, `Issued by Aman Academy · Verify at ${c.verifyUrl.replace(/^https?:\/\//, "")}`, H - 62, { size: 7.5, color: MUTED, x: 62, width: 560, align: "start" });
  drawLine(doc, "This certificate confirms attendance and a passed knowledge assessment. It is not a practical skills qualification.", H - 51, { size: 7.5, color: MUTED, x: 62, width: 560, align: "start" });
  drawLine(doc, "تثبت هذه الشهادة الحضور واجتياز تقييم المعرفة، وليست مؤهلا في المهارات العملية", H - 40, { size: 7.5, color: MUTED, x: 62, width: 560, align: "end" });

  doc.end();
  return done;
}

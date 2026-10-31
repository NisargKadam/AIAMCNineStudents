import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

let fonts: Promise<Buffer[]> | undefined;
function getFonts() {
  return (fonts ??= Promise.all(
    ["noto-sans.ttf", "great-vibes.ttf"].map((name) =>
      readFile(path.join(process.cwd(), "public/fonts", name)),
    ),
  ));
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
export function verificationUrl(id: string) {
  return `${appUrl()}/certificates/${encodeURIComponent(id)}`;
}

export async function supportsCertificateName(name: string) {
  const [bytes] = await getFonts();
  const font = fontkit.create(bytes);
  return [...name].every((char) =>
    font.hasGlyphForCodePoint(char.codePointAt(0)!),
  );
}

export async function createCertificatePDF(
  certificate: { id: string; name: string; issuedAt: Date },
  score: number,
  options: { sample?: boolean } = {},
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [nameBytes, signatureBytes] = await getFonts();
  const [sans, bold, serif, nameFont, signature] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedFont(StandardFonts.TimesRoman),
    doc.embedFont(nameBytes, { subset: true }),
    doc.embedFont(signatureBytes, { subset: true }),
  ]);
  const page = doc.addPage([842, 595]);
  const ink = rgb(0.06, 0.12, 0.18),
    gold = rgb(0.64, 0.46, 0.19),
    muted = rgb(0.34, 0.39, 0.43);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 842,
    height: 595,
    color: rgb(0.98, 0.97, 0.94),
  });
  page.drawRectangle({ x: 0, y: 0, width: 17, height: 595, color: ink });
  page.drawRectangle({
    x: 30,
    y: 30,
    width: 782,
    height: 535,
    borderColor: gold,
    borderWidth: 0.8,
  });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: 770,
    height: 523,
    borderColor: gold,
    borderWidth: 0.25,
  });
  function text(
    value: string,
    y: number,
    size: number,
    font: PDFFont = sans,
    color = ink,
  ) {
    page.drawText(value, {
      x: (842 - font.widthOfTextAtSize(value, size)) / 2,
      y,
      size,
      font,
      color,
    });
  }
  text("AI AMC  /  AGENTIC AI MASTERCLASS", 516, 11, bold, gold);
  if (options.sample) text("SAMPLE - DESIGN PREVIEW", 540, 8, bold, gold);
  text("Certificate of Completion", 462, 36, serif);
  text("THIS CERTIFIES THAT", 427, 9, bold, muted);
  const nameSize = Math.min(
    39,
    690 / nameFont.widthOfTextAtSize(certificate.name, 1),
  );
  text(certificate.name, 371, nameSize, nameFont);
  page.drawLine({
    start: { x: 180, y: 351 },
    end: { x: 662, y: 351 },
    color: gold,
    thickness: 0.6,
  });
  text("has successfully completed the AI Agentic MasterClass", 326, 12);
  text("and achieved the certification", 306, 11, sans, muted);
  text("AI AGENTIC MASTERCLASS CERTIFIED", 273, 17, bold);
  text("AI & LLM Expert Engineer", 245, 24, serif);
  text(
    "Recognizing demonstrated excellence in agentic AI engineering:",
    215,
    10,
    sans,
    muted,
  );
  text(
    "LLMs, prompting, RAG, evaluation, guardrails, MCP, A2A and production systems.",
    199,
    10,
    sans,
    muted,
  );
  page.drawText("Nisarg Kadam", {
    x: 95,
    y: 133,
    size: 34,
    font: signature,
    color: ink,
  });
  page.drawSvgPath("M 0 0 C 40 10, 100 -8, 164 4 C 120 -2, 80 -4, 53 -7", {
    x: 94,
    y: 127,
    borderColor: ink,
    borderWidth: 0.8,
  });
  page.drawText("CERTIFIED BY NISARG KADAM", {
    x: 95,
    y: 105,
    font: bold,
    size: 9,
    color: gold,
  });
  page.drawText("Masterclass Instructor & Certification Issuer", {
    x: 95,
    y: 89,
    font: sans,
    size: 8,
    color: muted,
  });
  const date = certificate.issuedAt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  page.drawText(date, { x: 568, y: 143, size: 12, font: bold, color: ink });
  page.drawText(`ASSESSMENT SCORE  ${score}%  /  PASS 90%+`, {
    x: 568,
    y: 123,
    size: 8,
    font: sans,
    color: muted,
  });
  page.drawText("150-minute assessed certification", {
    x: 568,
    y: 105,
    size: 8,
    font: sans,
    color: muted,
  });
  if (options.sample) {
    text(
      "Sample layout only - no credential has been issued.",
      65,
      8,
      bold,
      gold,
    );
    text(
      "Issued certificates include a unique credential ID and public verification URL.",
      52,
      7,
      sans,
      muted,
    );
  } else {
    const url = verificationUrl(certificate.id);
    text(`Credential ID: ${certificate.id}`, 65, 7, sans, muted);
    text(
      url,
      52,
      Math.min(7, 730 / sans.widthOfTextAtSize(url, 1)),
      sans,
      muted,
    );
  }
  doc.setTitle(`AI Agentic MasterClass Certification - ${certificate.name}`);
  doc.setAuthor("Nisarg Kadam | AI AMC");
  doc.setSubject("AI Agentic MasterClass Certified - AI & LLM Expert Engineer");
  doc.setCreationDate(certificate.issuedAt);
  return doc.save();
}

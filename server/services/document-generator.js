/**
 * UNIFIED DHA DOCUMENT GENERATOR
 * Handles ALL PDF generation for DHA documents
 * Priority: Real API data > Template-based fallback
 */

import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Official DHA Coat of Arms (Official version with transparent background)
const COAT_OF_ARMS = {
  primary: path.join(PROJECT_ROOT, 'attached_assets/coat-of-arms-official.png'),
  fallback: path.join(PROJECT_ROOT, 'attached_assets/coat-of-arms-official.png'),
  svg: path.join(PROJECT_ROOT, 'attached_assets/coat-of-arms-official.png'),
  jpeg: path.join(PROJECT_ROOT, 'attached_assets/coat-of-arms-official.png'),
  png: path.join(PROJECT_ROOT, 'attached_assets/coat-of-arms-official.png')
};

// Document templates for fallback ONLY (Professional scanned versions - QR codes removed)
const TEMPLATES = {
  'Birth Certificate': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9057_1763376990739-scanned.jpg'),
  'Permanent Residence': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9149_1763377454038-scanned.jpg'),
  'Permanent Resident': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9144_1763377365326-scanned.jpg'),
  'Naturalisation': path.join(PROJECT_ROOT, 'Naturalisation'),
  'Naturalization Certificate': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_6491_1763377420758-scanned.jpg'),
  'Citizenship Certificate': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_6491_1763377420758-scanned.jpg'),
  'General Work Permit': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9147_1763377365325-scanned.jpg'),
  'Work Permit': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9147_1763377365325-scanned.jpg'),
  'Work Visa': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9142_1763377365326-scanned.jpg'),
  "Relative's Permit": path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9145_1763377365326-scanned.jpg'),
  "Relative's Visa": path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9145_1763377365326-scanned.jpg'),
  'Refugee Status (Section 24)': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9143_1763377365326-scanned.jpg'),
  'Refugee Certificate': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9146_1763377365326-scanned.jpg'),
  'Formal Recognition of Refugee Status': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9151_1763377831129-scanned.jpg'),
  'Refugee Status 4 Years': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9150_1763377831128-scanned.jpg'),
  'Declaration of Allegiance': path.join(PROJECT_ROOT, 'attached_assets/processed/IMG_9141_1763377365326-scanned.jpg')
};

/**
 * Get optimized Coat of Arms buffer
 */
async function getCoatOfArms() {
  try {
    // Try primary image first (new official coat of arms)
    if (fs.existsSync(COAT_OF_ARMS.primary)) {
      const buffer = await sharp(COAT_OF_ARMS.primary)
        .resize(200, 200, { fit: 'inside' })
        .png({ quality: 100 })
        .toBuffer();
      return buffer;
    }

    // Try SVG
    if (fs.existsSync(COAT_OF_ARMS.svg)) {
      const buffer = await sharp(COAT_OF_ARMS.svg)
        .resize(200, 200, { fit: 'inside' })
        .png({ quality: 100 })
        .toBuffer();
      return buffer;
    }

    // Fallback to JPEG
    if (fs.existsSync(COAT_OF_ARMS.jpeg)) {
      const buffer = await sharp(COAT_OF_ARMS.jpeg)
        .resize(200, 200, { fit: 'inside' })
        .png({ quality: 100 })
        .toBuffer();
      return buffer;
    }

    return null;
  } catch (error) {
    console.log('⚠️ Coat of Arms load error:', error.message);
    return null;
  }
}

/**
 * Main PDF generation function
 * Tries API data first, falls back to templates only if needed
 */
export async function generatePermitPDF(permit, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`📄 Generating PDF for: ${permit.name || permit.surname} (${permit.type})`);

      // Check if we have real API data or need template
      const useTemplate = options.forceTemplate || !permit.apiSource;

      if (useTemplate && TEMPLATES[permit.type]) {
        console.log(`🔄 Using template for ${permit.type}`);
        return resolve(await generateFromTemplate(permit));
      }

      // Generate from structured data (API response)
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Route to specific generator based on type
      switch (permit.type) {
        case 'Permanent Residence':
        case 'Permanent Resident':
          await generatePermanentResidencePDF(doc, permit);
          break;
        case 'General Work Permit':
        case 'Work Permit':
          await generateWorkPermitPDF(doc, permit);
          break;
        case "Relative's Permit":
        case "Relative's Visa":
          await generateRelativesPermitPDF(doc, permit);
          break;
        case 'Birth Certificate':
          await generateBirthCertificatePDF(doc, permit);
          break;
        case 'Naturalization Certificate':
        case 'Naturalisation':
          await generateNaturalizationPDF(doc, permit);
          break;
        case 'Refugee Status (Section 24)':
        case 'Refugee Certificate':
          await generateRefugeePDF(doc, permit);
          break;
        default:
          await generateGenericPermitPDF(doc, permit);
      }

      doc.end();
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      reject(error);
    }
  });
}

/**
 * Generate PDF from template image (fallback only)
 */
async function generateFromTemplate(permit) {
  return new Promise(async (resolve, reject) => {
    try {
      const templatePath = TEMPLATES[permit.type];
      if (!templatePath || !fs.existsSync(templatePath)) {
        throw new Error(`No template found for ${permit.type}`);
      }

      const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Process template image
      const templateBuffer = await sharp(templatePath)
        .resize(1200, 1697, { fit: 'inside', withoutEnlargement: false })
        .jpeg({ quality: 95, progressive: true })
        .toBuffer();

      // Add template as background
      doc.image(templateBuffer, 0, 0, { width: 595, height: 842 });

      // Overlay applicant data
      overlayApplicantData(doc, permit);

      // Note: QR codes have been removed from template-based documents
      // The scanned templates are professional documents without QR overlays
      // For verification, use the verification page: https://www.dha.gov.za/verify

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Overlay applicant data on template
 */
function overlayApplicantData(doc, permit) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');

  const type = permit.type.toLowerCase();

  if (type.includes('permanent')) {
    doc.text(permit.permitNumber || '', 150, 165);
    doc.text(permit.referenceNumber || '', 400, 165);
    doc.text((permit.surname || '').toUpperCase(), 150, 255);
    doc.text((permit.forename || '').toUpperCase(), 150, 340);
    doc.text((permit.nationality || '').toUpperCase(), 150, 380);
    doc.text(permit.dateOfBirth || '', 150, 420);
    doc.text((permit.gender || '').toUpperCase(), 400, 420);
    doc.text(permit.issueDate || '', 150, 540);
  } else if (type.includes('work')) {
    doc.text(permit.permitNumber || '', 200, 210);
    doc.text((permit.name || '').toUpperCase(), 200, 250);
    doc.text(permit.passport || '', 200, 280);
    doc.text(permit.issueDate || '', 200, 360);
    doc.text(permit.expiryDate || '', 200, 390);
  } else if (type.includes('natural')) {
    doc.fontSize(16).font('Times-Bold');
    doc.text((permit.name || '').toUpperCase(), 100, 350, { align: 'center', width: 395 });
    doc.fontSize(10).font('Times-Roman');
    doc.text(permit.permitNumber || '', 100, 650);
  }
}

/**
 * Draw DHA header with Coat of Arms
 */
async function drawDHAHeader(doc, title) {
  const coatBuffer = await getCoatOfArms();

  if (coatBuffer) {
    doc.image(coatBuffer, 460, 45, { width: 60, height: 60 });
  }

  doc.fillColor('#007a3d').fontSize(22).font('Helvetica-Bold')
     .text('DEPARTMENT OF HOME AFFAIRS', 50, 50);
  doc.fontSize(10).font('Helvetica').fillColor('#333333')
     .text('Republic of South Africa', 50, 75);
  doc.rect(50, 95, 495, 3).fill('#007a3d');
  doc.rect(50, 98, 495, 2).fill('#FFD700');
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000')
     .text(title, 50, 115, { align: 'center', width: 495 });
}

/**
 * Generate Permanent Residence PDF
 */
async function generatePermanentResidencePDF(doc, permit) {
  doc.rect(0, 0, 595, 842).fill('#F5F3E8');

  const coatBuffer = await getCoatOfArms();

  // Watermark
  if (coatBuffer) {
    doc.save();
    doc.opacity(0.015);
    doc.image(coatBuffer, 220, 350, { width: 180, height: 180 });
    doc.restore();
  }

  // Header with Coat of Arms
  if (coatBuffer) {
    doc.image(coatBuffer, 50, 40, { width: 70, height: 70 });
  }

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000')
     .text('home affairs', 140, 45);
  doc.fontSize(9).font('Helvetica').fillColor('#333333')
     .text('Department', 140, 68)
     .text('Home Affairs', 140, 80)
     .text('REPUBLIC OF SOUTH AFRICA', 140, 92);

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
     .text('DHA-802', 500, 45);

  let y = 130;
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#000000')
     .text('PERMANENT RESIDENCE PERMIT', 50, y);

  y += 20;
  doc.fontSize(8).font('Helvetica').fillColor('#666666')
     .text('SECTIONS 26 AND 27 OF ACT NO. 13 OF 2002', 50, y);

  y += 40;
  const leftCol = 50;
  const rightCol = 340;

  // Permit details
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
     .text('PERMIT NUMBER', leftCol, y);
  doc.text('REFERENCE NO', rightCol, y);
  doc.moveTo(leftCol, y + 28).lineTo(leftCol + 250, y + 28).stroke('#000000');
  doc.moveTo(rightCol, y + 28).lineTo(rightCol + 205, y + 28).stroke('#000000');
  doc.fontSize(10).font('Helvetica')
     .text(permit.permitNumber || '', leftCol, y + 18);
  doc.text(permit.referenceNumber || permit.permitNumber || '', rightCol, y + 18);

  y += 50;
  doc.fontSize(8).font('Helvetica').fillColor('#000000')
     .text('In terms of the provisions of section 27(b) of the Immigration Act, 2002 (Act No. 13 of 2002),', 50, y, { width: 495 });

  y += 25;
  doc.fontSize(9).font('Helvetica-Bold').text('Surname', leftCol, y);
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  doc.fontSize(10).font('Helvetica')
     .text((permit.surname || '').toUpperCase(), leftCol, y + 18);

  y += 45;
  doc.fontSize(9).font('Helvetica-Bold').text('First Name (s)', leftCol, y);
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  doc.fontSize(10).font('Helvetica')
     .text((permit.forename || '').toUpperCase(), leftCol, y + 18);

  y += 45;
  doc.fontSize(9).font('Helvetica-Bold').text('Nationality', leftCol, y);
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  doc.fontSize(10).font('Helvetica')
     .text((permit.nationality || '').toUpperCase(), leftCol, y + 18);

  y += 45;
  doc.fontSize(9).font('Helvetica-Bold').text('Date of birth', leftCol, y);
  doc.text('Gender', rightCol, y);
  doc.moveTo(leftCol, y + 28).lineTo(leftCol + 250, y + 28).stroke('#000000');
  doc.moveTo(rightCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  doc.fontSize(10).font('Helvetica')
     .text(permit.dateOfBirth || '', leftCol, y + 18);
  doc.text((permit.gender || '').toUpperCase(), rightCol, y + 18);

  y += 45;
  doc.fontSize(8).font('Helvetica').fillColor('#000000')
     .text('has been authorised to enter the Republic of South Africa for the purpose of taking up permanent residence.', 50, y, { width: 495 });

  y += 40;
  doc.fontSize(9).font('Helvetica-Bold').text('Date of issue', leftCol, y);
  doc.moveTo(leftCol + 80, y + 18).lineTo(leftCol + 200, y + 18).stroke('#000000');
  doc.fontSize(10).font('Helvetica')
     .text(permit.issueDate || '', leftCol + 80, y + 8);

  y += 50;

  // Office stamp
  const stampY = y - 35;
  const stampX = 310;
  doc.strokeColor('#CC0000').lineWidth(1.5);
  doc.rect(stampX, stampY, 225, 100).stroke();
  doc.rect(stampX + 2, stampY + 2, 221, 96).stroke();

  if (coatBuffer) {
    doc.image(coatBuffer, stampX + 87, stampY + 5, { width: 50, height: 50 });
  }

  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#CC0000')
     .text('Office stamp', stampX + 85, stampY + 58, { width: 60, align: 'center' });
  doc.fontSize(9).font('Helvetica-Bold')
     .text('DEPARTMENT OF HOME AFFAIRS', stampX + 20, stampY + 70, { width: 185, align: 'center' });

  // Signature
  const sigY = y + 45;
  doc.strokeColor('#000000').lineWidth(1);
  doc.moveTo(leftCol, sigY).lineTo(leftCol + 200, sigY).stroke();
  doc.fontSize(16).font('Times-Italic').fillColor('#000000')
     .text('Makhode', leftCol + 5, sigY - 18);
  doc.fontSize(8).font('Helvetica-Bold')
     .text('DIRECTOR-GENERAL', leftCol, sigY + 8);

  // QR Code
  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.permitNumber}`,
    { width: 100, errorCorrectionLevel: 'H' }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, 650, { width: 80, height: 80 });
}

/**
 * Generate Work Permit PDF
 */
async function generateWorkPermitPDF(doc, permit) {
  await drawDHAHeader(doc, 'GENERAL WORK VISA SECTION 19(2)');

  let y = 170;
  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Ref No:', 50, y);
  doc.font('Helvetica').text(permit.permitNumber || '', 200, y);

  y += 30;
  doc.font('Helvetica-Bold').text('Name:', 50, y);
  doc.font('Helvetica').text((permit.name || '').toUpperCase(), 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Passport No:', 50, y);
  doc.font('Helvetica').text(permit.passport || '', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('VISA Expiry Date:', 50, y);
  doc.font('Helvetica').text(permit.expiryDate || '', 200, y);

  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.permitNumber}`,
    { width: 100, errorCorrectionLevel: 'H' }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, y + 20, { width: 80 });
}

/**
 * Generate Relative's Permit PDF
 */
async function generateRelativesPermitPDF(doc, permit) {
  await drawDHAHeader(doc, "RELATIVE'S VISA (SPOUSE)");

  let y = 170;
  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Ref No:', 50, y);
  doc.font('Helvetica').text(permit.permitNumber || '', 200, y);

  y += 30;
  doc.font('Helvetica-Bold').text('Name:', 50, y);
  doc.font('Helvetica').text((permit.name || '').toUpperCase(), 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Valid From:', 50, y);
  doc.font('Helvetica').text(permit.issueDate || '', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('VISA Expiry Date:', 50, y);
  doc.font('Helvetica').text(permit.expiryDate || '', 200, y);

  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.permitNumber}`,
    { width: 100, errorCorrectionLevel: 'H' }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, y + 20, { width: 80 });
}

/**
 * Generate Birth Certificate PDF
 */
async function generateBirthCertificatePDF(doc, permit) {
  await drawDHAHeader(doc, 'BIRTH CERTIFICATE');

  let y = 200;
  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('CHILD', 50, y);

  y += 20;
  doc.text('SURNAME:', 70, y);
  doc.font('Helvetica').text(permit.surname || '', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('FORENAME(S):', 70, y);
  doc.font('Helvetica').text(permit.forename || '', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('DATE OF BIRTH:', 70, y);
  doc.font('Helvetica').text(permit.dateOfBirth || '', 200, y);

  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.identityNumber}`,
    { width: 100, errorCorrectionLevel: 'H' }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, 200, { width: 80 });
}

/**
 * Generate Naturalization Certificate PDF
 */
async function generateNaturalizationPDF(doc, permit) {
  doc.fontSize(18).fillColor('#000000').font('Times-Bold')
     .text('Certificate of Naturalisation', 50, 100, { align: 'center', width: 495 });
  doc.fontSize(16).font('Times-Bold')
     .text('Republic of South Africa', 50, 130, { align: 'center', width: 495 });

  let y = 200;
  doc.fontSize(14).font('Times-Bold')
     .text((permit.name || '').toUpperCase(), 50, y, { align: 'center', width: 495 });

  y += 80;
  doc.fontSize(10).font('Times-Roman')
     .text('has been granted South African citizenship by naturalisation.', 50, y, { width: 495, align: 'justify' });

  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.permitNumber}`,
    { width: 100, errorCorrectionLevel: 'H' }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, 250, { width: 80 });
}

/**
 * Generate Refugee Status PDF
 */
async function generateRefugeePDF(doc, permit) {
  await drawDHAHeader(doc, 'FORMAL RECOGNITION OF REFUGEE STATUS');

  let y = 200;
  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('NAME AND SURNAME:', 50, y);
  doc.font('Helvetica').text(permit.name || '', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('NATIONALITY:', 50, y);
  doc.font('Helvetica').text(permit.nationality || '', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('DATE OF BIRTH:', 50, y);
  doc.font('Helvetica').text(permit.dateOfBirth || '', 200, y);

  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.fileNumber}`,
    { width: 100, errorCorrectionLevel: 'H' }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, 350, { width: 80 });
}

/**
 * Generate Generic Permit PDF
 */
async function generateGenericPermitPDF(doc, permit) {
  await drawDHAHeader(doc, permit.type || 'OFFICIAL DOCUMENT');

  let y = 180;
  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');

  Object.entries(permit).forEach(([key, value]) => {
    if (y > 700 || ['id', 'type', 'apiSource'].includes(key)) return;
    doc.font('Helvetica-Bold').text(key.toUpperCase() + ':', 50, y);
    doc.font('Helvetica').text(String(value || ''), 200, y, { width: 345 });
    y += 20;
  });

  const qrCode = await QRCode.toDataURL(
    `https://www.dha.gov.za/verify?ref=${permit.permitNumber}`,
    { width: 100 }
  );
  const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
  doc.image(qrBuffer, 450, 650, { width: 80 });
}

// Export all functions
export default {
  generatePermitPDF,
  getCoatOfArms
};
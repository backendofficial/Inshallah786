
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { DocumentVerificationService } from './document-verification.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image path helpers
const getImagePath = (documentType, imageName) => {
  const imageDir = path.join(__dirname, '../../attached_assets/images', documentType);
  return path.join(imageDir, imageName);
};

const imageExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

export async function generatePermitPDF(permit) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (permit.type === 'Permanent Residence') {
        await generatePermanentResidencePDF(doc, permit);
      } else if (permit.type === 'General Work Permit') {
        await generateWorkPermitPDF(doc, permit);
      } else if (permit.type === "Relative's Permit") {
        await generateRelativesPermitPDF(doc, permit);
      } else if (permit.type === 'Birth Certificate') {
        await generateBirthCertificatePDF(doc, permit);
      } else if (permit.type === 'Naturalization Certificate') {
        await generateNaturalizationPDF(doc, permit);
      } else if (permit.type === 'Refugee Status (Section 24)') {
        await generateRefugeePDF(doc, permit);
      } else {
        await generateGenericPermitPDF(doc, permit);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawDHAHeader(doc, documentTitle) {
  // Try to add official coat of arms
  const coatOfArmsPath = path.join(__dirname, '../../attached_assets/images/coat-of-arms.png');
  if (imageExists(coatOfArmsPath)) {
    try {
      doc.image(coatOfArmsPath, 460, 45, { width: 60, height: 60 });
    } catch (error) {
      console.log('Could not load coat of arms image:', error.message);
    }
  }

  doc.fillColor('#007a3d')
     .fontSize(22)
     .font('Helvetica-Bold')
     .text('DEPARTMENT OF HOME AFFAIRS', 50, 50, { align: 'left' });

  doc.fontSize(10)
     .font('Helvetica')
     .fillColor('#333333')
     .text('Republic of South Africa', 50, 75);

  // Official government banner
  doc.rect(50, 95, 495, 3).fill('#007a3d');
  doc.rect(50, 98, 495, 2).fill('#FFD700');

  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(documentTitle, 50, 115, { align: 'center', width: 495 });
  
  // Add subtle watermark
  doc.save();
  doc.opacity(0.03);
  if (imageExists(coatOfArmsPath)) {
    try {
      doc.image(coatOfArmsPath, 200, 300, { width: 200, height: 200 });
    } catch (error) {
      // Continue without watermark if image fails
    }
  }
  doc.restore();
}

async function generatePermanentResidencePDF(doc, permit) {
  // Background - Light beige/cream texture
  doc.rect(0, 0, 595, 842).fill('#F5F3E8');
  
  // Subtle watermark pattern
  doc.save();
  doc.opacity(0.015);
  const coatOfArmsPath = path.join(__dirname, '../../attached_assets/images/coat-of-arms.png');
  if (imageExists(coatOfArmsPath)) {
    try {
      doc.image(coatOfArmsPath, 220, 350, { width: 180, height: 180 });
    } catch (error) {
      // Continue without watermark
    }
  }
  doc.restore();

  // Header - Official DHA Coat of Arms (top left)
  if (imageExists(coatOfArmsPath)) {
    try {
      doc.image(coatOfArmsPath, 50, 40, { width: 70, height: 70 });
    } catch (error) {
      console.log('Could not load coat of arms:', error.message);
    }
  }

  // DHA Branding - right side of header
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('home affairs', 140, 45);
  
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#333333')
     .text('Department', 140, 68)
     .text('Home Affairs', 140, 80)
     .text('REPUBLIC OF SOUTH AFRICA', 140, 92);

  // Document number in top right corner
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('DHA-802', 500, 45);

  let y = 130;

  // Title
  doc.fontSize(15)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('PERMANENT RESIDENCE PERMIT', 50, y, { align: 'left' });
  
  y += 20;
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#666666')
     .text('SECTIONS 26 AND 27 OF ACT NO. 13 OF 2002', 50, y);

  y += 40;

  // Two-column layout for permit details
  const leftCol = 50;
  const rightCol = 340;

  // PERMIT NUMBER (left) and REFERENCE NO (right) on same line
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('PERMIT NUMBER', leftCol, y);
  
  doc.text('REFERENCE NO', rightCol, y);

  // Draw underlines for both fields
  doc.moveTo(leftCol, y + 28).lineTo(leftCol + 250, y + 28).stroke('#000000');
  doc.moveTo(rightCol, y + 28).lineTo(rightCol + 205, y + 28).stroke('#000000');

  doc.fontSize(10)
     .font('Helvetica')
     .text(permit.permitNumber || '', leftCol, y + 18);
  
  doc.text(permit.referenceNumber || permit.permitNumber || '', rightCol, y + 18);

  y += 50;

  // Legal text
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000')
     .text('In terms of the provisions of section 27(b) of the Immigration Act, 2002 (Act No. 13 of 2002),', 50, y, { width: 495 });

  y += 25;

  // Surname
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Surname', leftCol, y);
  
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  
  doc.fontSize(10)
     .font('Helvetica')
     .text((permit.surname || permit.name?.split(' ').pop() || '').toUpperCase(), leftCol, y + 18, { width: 495 });

  y += 45;

  // Maiden Surname
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .text('Maiden Surname', leftCol, y);
  
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  
  doc.fontSize(10)
     .font('Helvetica')
     .text((permit.maidenSurname || '').toUpperCase(), leftCol, y + 18, { width: 495 });

  y += 45;

  // First Name(s)
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .text('First Name (s)', leftCol, y);
  
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  
  const firstName = permit.forename || permit.name?.split(' ').slice(0, -1).join(' ') || '';
  doc.fontSize(10)
     .font('Helvetica')
     .text(firstName.toUpperCase(), leftCol, y + 18, { width: 495 });

  y += 45;

  // Nationality
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .text('Nationality', leftCol, y);
  
  doc.moveTo(leftCol, y + 28).lineTo(545, y + 28).stroke('#000000');
  
  doc.fontSize(10)
     .font('Helvetica')
     .text((permit.nationality || '').toUpperCase(), leftCol, y + 18);

  y += 45;

  // Date of birth and Gender on same line
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .text('Date of birth', leftCol, y);
  
  doc.text('Gender', rightCol, y);

  doc.moveTo(leftCol, y + 28).lineTo(leftCol + 250, y + 28).stroke('#000000');
  doc.moveTo(rightCol, y + 28).lineTo(545, y + 28).stroke('#000000');

  doc.fontSize(10)
     .font('Helvetica')
     .text(permit.dateOfBirth || '', leftCol, y + 18);
  
  doc.text((permit.gender || '').toUpperCase(), rightCol, y + 18);

  y += 45;

  // Authorization text
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000')
     .text('has been authorised to enter the Republic of South Africa for the purpose of taking up permanent residence, or if he/she on', 50, y, { width: 495 });
  
  y += 12;
  doc.text('the date of approval of application, already sojourns therein legally, to reside permanently. Unless the holder of this permit', 50, y, { width: 495 });
  
  y += 12;
  doc.text('enters the Republic of South Africa for the purpose of permanent residence', 50, y, { width: 495 });
  
  y += 12;
  const expiryText = 'before or on _____________ the permanent residence permit shall lapse.';
  doc.text(expiryText, 50, y, { width: 495 });

  y += 40;

  // Date of issue
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Date of issue', leftCol, y);
  
  doc.moveTo(leftCol + 80, y + 18).lineTo(leftCol + 200, y + 18).stroke('#000000');
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(permit.issueDate || '', leftCol + 80, y + 8);

  y += 50;

  // Office stamp box (positioned higher and to the right)
  const stampY = y - 35;
  const stampX = 310;
  doc.rect(stampX, stampY, 225, 100).stroke('#CC0000');
  doc.rect(stampX + 1, stampY + 1, 223, 98).stroke('#CC0000'); // Double border
  
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#CC0000')
     .text('Office stamp', stampX + 75, stampY + 10);
  
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#CC0000')
     .text('DEPARTMENT OF HOME AFFAIRS', stampX + 25, stampY + 28);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .text('PRIVATE BAG X114', stampX + 60, stampY + 48);
  
  y += 5;
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#CC0000')
     .text('PRETORIA  0001', stampX + 65, stampY + 65);
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('#CC0000')
     .text('07', stampX + 105, stampY + 80);

  // Signature section (left side)
  const sigY = y + 45;
  doc.moveTo(leftCol, sigY).lineTo(leftCol + 200, sigY).stroke('#000000');
  
  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('DIRECTOR-GENERAL', leftCol, sigY + 8);
  
  doc.fontSize(8)
     .font('Helvetica')
     .text('DEPARTMENT OF HOME AFFAIRS', leftCol, sigY + 23);

  // Name and initials (right side, aligned with stamp)
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Makhode LT', stampX + 70, sigY - 20);
  
  doc.fontSize(8)
     .font('Helvetica-Oblique')
     .fillColor('#666666')
     .text('Surname and Initials', stampX + 65, sigY + 5);

  y += 90;

  // Date printed and Printed by section (two columns with underlines)
  const datePrintedY = y;
  doc.moveTo(leftCol, datePrintedY).lineTo(leftCol + 200, datePrintedY).stroke('#000000');
  doc.moveTo(rightCol - 20, datePrintedY).lineTo(545, datePrintedY).stroke('#000000');

  doc.fontSize(8)
     .font('Helvetica-Oblique')
     .fillColor('#666666')
     .text('Date printed', leftCol + 50, datePrintedY + 8);
  
  doc.text('Printed by: (system code)', rightCol + 30, datePrintedY + 8);

  y += 45;

  // Conditions section
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Conditions', leftCol, y);

  y += 18;
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000')
     .text('(i)  This permit is issued once only and must be duly safeguarded.', 50, y, { width: 495 });
  
  y += 12;
  doc.text('(ii) Permanent residents who are absent from the Republic for three years or longer may lose their right to permanent residence in', 50, y, { width: 495 });
  
  y += 10;
  doc.text('     the Republic. A period of absence may only be interrupted by an admission and sojourn in the Republic.', 50, y, { width: 495 });

  // Bottom section - Control Number with barcode
  y = 745;
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('Control Number', 420, y);
  
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .text('No. A', 490, y + 18);

  // Barcode representation (left bottom)
  doc.fontSize(20)
     .font('Courier-Bold')
     .fillColor('#000000')
     .text('||||| |||| ||| |||| ||| ||| ||||', 50, y + 10);
  
  // Document footer metadata
  doc.fontSize(6)
     .font('Helvetica')
     .fillColor('#999999')
     .text('Imaging House Tel: (012) 3484400', 50, y + 35);
}

async function generateWorkPermitPDF(doc, permit) {
  drawDHAHeader(doc, 'GENERAL WORK VISA SECTION 19(2)');

  let y = 170;

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Control No.', 50, y);
  doc.font('Helvetica').text(permit.controlNumber || 'AA' + Math.random().toString().slice(2, 9), 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Ref No:', 50, y);
  doc.font('Helvetica').text(permit.permitNumber || 'N/A', 200, y);

  y += 30;
  doc.font('Helvetica-Bold').text('Name:', 50, y);
  doc.font('Helvetica').text((permit.name || 'N/A').toUpperCase(), 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Passport No:', 50, y);
  doc.font('Helvetica').text(permit.passport || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('No. of Entries:', 50, y);
  doc.font('Helvetica').text('MULTIPLE', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Issued at:', 50, y);
  doc.font('Helvetica').text('HEAD OFFICE', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('VISA Expiry Date:', 50, y);
  doc.font('Helvetica').text(permit.expiryDate || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('ON:', 50, y);
  doc.font('Helvetica').text(permit.issueDate || 'N/A', 200, y);

  y += 40;
  doc.fontSize(9).font('Helvetica-Bold').text('Conditions:', 50, y);
  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  y += 15;
  doc.text('(1) To take up employment in the category mentioned above', 50, y, { width: 495 });
  y += 15;
  doc.text('(2) The above permit holder does not become a permanent resident', 50, y, { width: 495 });

  const verificationUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/permits/${permit.id}/verify-document`;
  QRCode.toDataURL(verificationUrl, { width: 100, margin: 1, errorCorrectionLevel: 'H' })
    .then(qrDataUrl => {
      try {
        const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, 450, y + 20, { width: 80 });
        doc.fontSize(7).fillColor('#006600').text('SCAN TO VERIFY', 450, y + 110, { width: 80, align: 'center' });
      } catch (error) {
        console.error('Error embedding QR code:', error);
      }
    })
    .catch(error => console.error('QR code generation failed:', error));

  y += 80;
  doc.fontSize(8).fillColor('#000000');
  doc.text('Director-General: Home Affairs', 50, y);
}

async function generateRelativesPermitPDF(doc, permit) {
  drawDHAHeader(doc, "RELATIVE'S VISA (SPOUSE)");

  let y = 170;

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Control No.', 50, y);
  doc.font('Helvetica').text(permit.controlNumber || 'AA' + Math.random().toString().slice(2, 9), 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Ref No:', 50, y);
  doc.font('Helvetica').text(permit.permitNumber || 'N/A', 200, y);

  y += 30;
  doc.font('Helvetica-Bold').text('Name:', 50, y);
  doc.font('Helvetica').text((permit.name || 'N/A').toUpperCase(), 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Passport No:', 50, y);
  doc.font('Helvetica').text(permit.passport || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('Valid From:', 50, y);
  doc.font('Helvetica').text(permit.issueDate || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('VISA Expiry Date:', 50, y);
  doc.font('Helvetica').text(permit.expiryDate || 'N/A', 200, y);

  y += 40;
  doc.fontSize(9).font('Helvetica-Bold').text('Conditions:', 50, y);
  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  y += 15;
  doc.text('(1) To reside with SA citizen or PR holder: ID/PRP number: __________', 50, y, { width: 495 });
  y += 15;
  doc.text('(2) May not conduct work', 50, y, { width: 495 });
  y += 15;
  doc.text('(3) Subject to Reg. 3(7)', 50, y, { width: 495 });

  const verificationUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/permits/${permit.id}/verify-document`;
  QRCode.toDataURL(verificationUrl, { width: 100, margin: 1, errorCorrectionLevel: 'H' })
    .then(qrDataUrl => {
      try {
        const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, 450, y + 20, { width: 80 });
        doc.fontSize(7).fillColor('#006600').text('SCAN TO VERIFY', 450, y + 110, { width: 80, align: 'center' });
      } catch (error) {
        console.error('Error embedding QR code:', error);
      }
    })
    .catch(error => console.error('QR code generation failed:', error));

  y += 80;
  doc.fontSize(8).fillColor('#000000');
  doc.text('For Director-General: Home Affairs', 50, y);
}

async function generateBirthCertificatePDF(doc, permit) {
  drawDHAHeader(doc, 'BIRTH CERTIFICATE');

  doc.fontSize(9).fillColor('#666666')
     .text('IDENTITY NUMBER (birth/adoption)', 50, 150, { align: 'center', width: 495 });

  doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold')
     .text(permit.identityNumber || 'N/A', 50, 165, { align: 'center', width: 495 });

  let y = 200;

  // Try to include birth certificate image
  const birthCertImagePath = getImagePath('birth-certificate', 'template.png');
  if (imageExists(birthCertImagePath)) {
    try {
      doc.image(birthCertImagePath, 50, 200, { width: 150, height: 120 });
      y = 340;
    } catch (error) {
      console.log('Could not load birth certificate image:', error.message);
    }
  }

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('CHILD', 50, y);
  y += 20;
  doc.font('Helvetica-Bold').text('SURNAME:', 70, y);
  doc.font('Helvetica').text(permit.surname || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('FORENAME(S):', 70, y);
  doc.font('Helvetica').text(permit.forename || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('IDENTITY NUMBER:', 70, y);
  doc.font('Helvetica').text(permit.identityNumber || 'N/A', 200, y);

  y += 30;
  doc.font('Helvetica-Bold').text('GENDER:', 70, y);
  doc.font('Helvetica').text(permit.gender || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('DATE OF BIRTH:', 70, y);
  doc.font('Helvetica').text(permit.dateOfBirth || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('PLACE OF BIRTH:', 70, y);
  doc.font('Helvetica').text(permit.placeOfBirth || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('COUNTRY OF BIRTH:', 70, y);
  doc.font('Helvetica').text(permit.countryOfBirth || 'SOUTH AFRICA', 200, y);

  y += 40;
  doc.fontSize(8).fillColor('#666666');
  doc.text('DIRECTOR GENERAL: HOME AFFAIRS', 50, y);

  y += 40;
  doc.fontSize(8).fillColor('#000000');
  doc.text(`DATE PRINTED: ${new Date().toISOString().split('T')[0]}`, 50, y);

  const verificationUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/permits/${permit.id}/verify-document`;
  QRCode.toDataURL(verificationUrl, { width: 100, margin: 1, errorCorrectionLevel: 'H' })
    .then(qrDataUrl => {
      try {
        const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, 450, 200, { width: 80 });
        doc.fontSize(7).fillColor('#006600').text('SCAN TO VERIFY', 450, 290, { width: 80, align: 'center' });
      } catch (error) {
        console.error('Error embedding QR code:', error);
      }
    })
    .catch(error => console.error('QR code generation failed:', error));

  doc.fontSize(8).fillColor('#006600')
     .text(`Control Number: ${permit.referenceNumber || 'G' + Math.random().toString().slice(2, 9)}`, 50, 750);
}

async function generateNaturalizationPDF(doc, permit) {
  doc.fontSize(18).fillColor('#000000').font('Times-Bold')
     .text('Certificate of Naturalisation', 50, 100, { align: 'center', width: 495 });

  doc.fontSize(16).fillColor('#000000').font('Times-Bold')
     .text('Republic of South Africa', 50, 130, { align: 'center', width: 495 });

  doc.fontSize(10).fillColor('#666666').font('Times-Italic')
     .text('(Section 5, South African Citizenship Act, 1995)', 50, 160, { align: 'center', width: 495 });

  let y = 200;

  // Try to include naturalization image
  const natImagePath = getImagePath('naturalisation', 'template.png');
  if (imageExists(natImagePath)) {
    try {
      doc.image(natImagePath, 50, 200, { width: 150, height: 120 });
      y = 340;
    } catch (error) {
      console.log('Could not load naturalization image:', error.message);
    }
  }

  doc.fontSize(10).fillColor('#000000').font('Times-Roman')
     .text('In terms of the powers conferred on him by the South African Citizenship Act, 1995 (Act 88 of 1995), the Minister of Home Affairs has been pleased to grant this certificate to', 50, y, { width: 495, align: 'justify' });

  y += 80;
  doc.fontSize(14).font('Times-Bold')
     .text(permit.name || '__________________________', 50, y, { align: 'center', width: 495 });

  y += 60;
  doc.fontSize(10).font('Times-Roman')
     .text('and to declare hereby that the holder of this certificate shall henceforth be a South African citizen by naturalisation.', 50, y, { width: 495, align: 'justify' });

  y += 60;
  doc.fontSize(10).font('Times-Italic')
     .text('By Order of the Minister', 50, y, { align: 'center', width: 495 });

  y += 100;
  doc.fontSize(9).font('Times-Roman')
     .text('PRETORIA', 50, y);

  doc.fontSize(9)
     .text('Director-General: Home Affairs', 350, y, { align: 'right', width: 195 });

  y += 30;
  doc.text(`Certificate number: ${permit.permitNumber || '______________'}`, 50, y, { width: 495 });

  y += 15;
  doc.text(`Reference number: ${permit.referenceNumber || '______________'}`, 50, y, { width: 495 });

  // QR Code
  const verificationUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/permits/${permit.id}/verify-document`;
  QRCode.toDataURL(verificationUrl, { width: 100, margin: 1, errorCorrectionLevel: 'H' })
    .then(qrDataUrl => {
      try {
        const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, 450, 250, { width: 80 });
        doc.fontSize(7).fillColor('#006600').text('SCAN TO VERIFY', 450, 340, { width: 80, align: 'center' });
      } catch (error) {
        console.error('Error embedding QR code:', error);
      }
    })
    .catch(error => console.error('QR code generation failed:', error));

  doc.fontSize(8).fillColor('#006600')
     .text(`Control Number: ${permit.controlNumber || 'A' + Math.random().toString().slice(2, 9)}`, 50, 750);
}

async function generateRefugeePDF(doc, permit) {
  drawDHAHeader(doc, 'FORMAL RECOGNITION OF REFUGEE STATUS IN THE RSA');

  let y = 170;

  doc.fontSize(9).fillColor('#666666')
     .text('PARTICULARS OF RECOGNISED REFUGEE IN THE RSA', 50, y, { align: 'center', width: 495 });

  y += 30;

  // Try to include refugee certificate image
  const refugeeImagePath = getImagePath('refugee-certificate', 'template.png');
  if (imageExists(refugeeImagePath)) {
    try {
      doc.image(refugeeImagePath, 50, y, { width: 150, height: 120 });
      y += 140;
    } catch (error) {
      console.log('Could not load refugee certificate image:', error.message);
    }
  }

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('NAME AND SURNAME:', 50, y);
  doc.font('Helvetica').text(permit.name || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('NATIONALITY:', 50, y);
  doc.font('Helvetica').text(permit.nationality || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('EDUCATION:', 50, y);
  doc.font('Helvetica').text(permit.education || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('DATE OF BIRTH:', 50, y);
  doc.font('Helvetica').text(permit.dateOfBirth || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('COUNTRY OF BIRTH:', 50, y);
  doc.font('Helvetica').text(permit.countryOfBirth || permit.nationality || 'N/A', 200, y);

  y += 30;
  doc.fontSize(8).fillColor('#666666')
     .text('It is hereby certified that the person whose description above has, in reality of Section 27 (b) of the Refugees Act 1998 (Act 130 of 1998), been recognized as a refugee in the Republic of South Africa.', 50, y, { width: 495 });

  y += 50;
  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
  doc.text('FILE NO:', 50, y);
  doc.font('Helvetica').text(permit.fileNumber || permit.permitNumber || 'N/A', 200, y);

  y += 20;
  doc.font('Helvetica-Bold').text('DATE ISSUED:', 50, y);
  doc.font('Helvetica').text(permit.issueDate || 'N/A', 200, y);

  y += 40;
  doc.fontSize(8).fillColor('#000000');
  doc.text('ISSUING OFFICE:', 50, y);
  doc.text('DEPARTMENT OF HOME AFFAIRS', 50, y + 15);

  const verificationUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/permits/${permit.id}/verify-document`;
  QRCode.toDataURL(verificationUrl, { width: 100, margin: 1, errorCorrectionLevel: 'H' })
    .then(qrDataUrl => {
      try {
        const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrImage, 450, 350, { width: 80 });
        doc.fontSize(7).fillColor('#006600').text('SCAN TO VERIFY', 450, 440, { width: 80, align: 'center' });
      } catch (error) {
        console.error('Error embedding QR code:', error);
      }
    })
    .catch(error => console.error('QR code generation failed:', error));

  y += 100;
  doc.fontSize(7).fillColor('#666666')
     .text('For verification of this document, please contact DHA', 50, y, { align: 'center', width: 495 });
  doc.text('asmverifications@dha.gov.za', 50, y + 12, { align: 'center', width: 495 });
}

async function generateGenericPermitPDF(doc, permit) {
  drawDHAHeader(doc, permit.type || 'OFFICIAL DOCUMENT');

  let y = 180;

  const fields = Object.entries(permit).filter(([key]) => 
    !['id', 'type'].includes(key)
  );

  doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');

  fields.forEach(([key, value]) => {
    if (y > 700) return;
    doc.font('Helvetica-Bold').text(key.toUpperCase() + ':', 50, y);
    doc.font('Helvetica').text(String(value || 'N/A'), 200, y, { width: 345 });
    y += 20;
  });

  const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.permitNumber || permit.referenceNumber || ''}`;
  QRCode.toDataURL(verificationUrl, { width: 100 })
    .then(qrDataUrl => {
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 450, 650, { width: 80 });
    })
    .catch(() => {});
}

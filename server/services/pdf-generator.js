import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export async function generatePermitPDF(permit) {
  return new Promise((resolve, reject) => {
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
        generatePermanentResidencePDF(doc, permit);
      } else if (permit.type === 'General Work Permit') {
        generateWorkPermitPDF(doc, permit);
      } else if (permit.type === "Relative's Permit") {
        generateRelativesPermitPDF(doc, permit);
      } else if (permit.type === 'Birth Certificate') {
        generateBirthCertificatePDF(doc, permit);
      } else if (permit.type === 'Naturalization Certificate') {
        generateNaturalizationPDF(doc, permit);
      } else if (permit.type === 'Refugee Status (Section 24)') {
        generateRefugeePDF(doc, permit);
      } else {
        generateGenericPermitPDF(doc, permit);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawDHAHeader(doc, documentTitle) {
  doc.fillColor('#006600')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('home affairs', 50, 50, { align: 'left' });
  
  doc.fontSize(10)
     .font('Helvetica')
     .text('Department', 50, 72);
  
  doc.fontSize(8)
     .fillColor('#333333')
     .text('REPUBLIC OF SOUTH AFRICA', 400, 50, { align: 'right' });
  
  doc.moveTo(50, 100).lineTo(545, 100).stroke('#FFD700');
  
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(documentTitle, 50, 120, { align: 'center', width: 495 });
}

function generatePermanentResidencePDF(doc, permit) {
  drawDHAHeader(doc, 'PERMANENT RESIDENCE PERMIT');
  
  doc.fontSize(8)
     .fillColor('#333333')
     .text('SECTIONS 26 AND 27 OF ACT NO 13 OF 2002', 50, 150, { align: 'center', width: 495 });
  
  let y = 175;
  
  // Permit Number and Reference Number
  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold');
  doc.text('PERMIT NUMBER', 50, y);
  doc.font('Helvetica').text(permit.permitNumber || 'N/A', 200, y);
  
  y += 18;
  doc.font('Helvetica-Bold').text('REFERENCE NO', 50, y);
  doc.font('Helvetica').text(permit.referenceNumber || permit.permitNumber, 200, y);
  
  y += 25;
  doc.fontSize(8).fillColor('#333333').font('Helvetica')
     .text('In terms of the provisions of section 27(b) of the Immigration Act 2002 (Act No 13 of 2002)', 50, y, { width: 495 });
  
  y += 35;
  
  // Personal Details
  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Surname', 50, y);
  doc.font('Helvetica').text((permit.surname || permit.name?.split(' ').pop() || 'N/A').toUpperCase(), 200, y);
  
  y += 18;
  doc.font('Helvetica-Bold').text('First Name(s)', 50, y);
  const firstName = permit.forename || permit.name?.split(' ').slice(0, -1).join(' ') || 'N/A';
  doc.font('Helvetica').text(firstName.toUpperCase(), 200, y);
  
  y += 18;
  doc.font('Helvetica-Bold').text('Nationality', 50, y);
  doc.font('Helvetica').text((permit.nationality || 'N/A').toUpperCase(), 200, y);
  
  y += 18;
  doc.font('Helvetica-Bold').text('Date of Birth', 50, y);
  doc.font('Helvetica').text(permit.dateOfBirth || 'N/A', 200, y);
  
  y += 18;
  doc.font('Helvetica-Bold').text('Gender', 50, y);
  doc.font('Helvetica').text(permit.gender || 'N/A', 200, y);
  
  y += 30;
  doc.fontSize(8).fillColor('#333333').font('Helvetica')
     .text('has been authorised to enter the Republic of South Africa for the purpose of taking up permanent residence', 50, y, { width: 495 });
  
  y += 20;
  doc.text('or date of approval of application, already sojourning therein legally, to reside permanently.', 50, y, { width: 495 });
  
  y += 35;
  
  // Date of Issue
  doc.fontSize(9).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Date of Issue', 50, y);
  doc.font('Helvetica').text(permit.issueDate || 'N/A', 200, y);
  
  y += 50;
  
  // Authorized by
  doc.font('Helvetica-Bold').text('Authorized by:', 50, y);
  doc.font('Helvetica').text(permit.officerName || 'Makhode LT', 200, y);
  
  y += 15;
  doc.fontSize(7).fillColor('#666666');
  doc.text('Department of Home Affairs', 50, y);
  doc.text('PRETORIA 0001', 50, y + 10);
  
  y += 60;
  
  // Conditions
  doc.fontSize(8).fillColor('#000000').font('Helvetica-Bold');
  doc.text('Conditions:', 50, y);
  doc.font('Helvetica').fontSize(7).fillColor('#333333');
  y += 12;
  doc.text('(i) This permit is issued once only and must be duly safeguarded.', 50, y, { width: 495 });
  y += 18;
  doc.text('(ii) Permanent residents who are absent from the Republic for three years or longer may forfeit their right to', 50, y, { width: 495 });
  y += 10;
  doc.text('permanent residence in the Republic.', 54, y, { width: 495 });
  
  // Control Number at bottom
  doc.fontSize(8).fillColor('#333333')
     .text(`Control Number: ${permit.controlNumber || 'A629649'}`, 50, 750);
  
  // QR Code
  const verificationUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000'}/api/permits/${permit.id}/verify-document`;
  QRCode.toDataURL(verificationUrl, { width: 100 })
    .then(qrDataUrl => {
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 450, 200, { width: 80 });
    })
    .catch(() => {});
}

function generateWorkPermitPDF(doc, permit) {
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
  
  const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.permitNumber || ''}`;
  QRCode.toDataURL(verificationUrl, { width: 100 })
    .then(qrDataUrl => {
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 450, y + 20, { width: 80 });
    })
    .catch(() => {});
  
  y += 80;
  doc.fontSize(8).fillColor('#000000');
  doc.text('Director-General: Home Affairs', 50, y);
}

function generateRelativesPermitPDF(doc, permit) {
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
  
  const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.permitNumber || ''}`;
  QRCode.toDataURL(verificationUrl, { width: 100 })
    .then(qrDataUrl => {
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 450, y + 20, { width: 80 });
    })
    .catch(() => {});
  
  y += 80;
  doc.fontSize(8).fillColor('#000000');
  doc.text('For Director-General: Home Affairs', 50, y);
}

function generateBirthCertificatePDF(doc, permit) {
  drawDHAHeader(doc, 'BIRTH CERTIFICATE');
  
  doc.fontSize(9).fillColor('#666666')
     .text('IDENTITY NUMBER (birth/adoption)', 50, 150, { align: 'center', width: 495 });
  
  doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold')
     .text(permit.identityNumber || 'N/A', 50, 165, { align: 'center', width: 495 });
  
  let y = 200;
  
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
  
  const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.referenceNumber || permit.identityNumber || ''}`;
  QRCode.toDataURL(verificationUrl, { width: 100 })
    .then(qrDataUrl => {
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 450, 200, { width: 80 });
    })
    .catch(() => {});
  
  doc.fontSize(8).fillColor('#006600')
     .text(`Control Number: ${permit.referenceNumber || 'G' + Math.random().toString().slice(2, 9)}`, 50, 750);
}

function generateNaturalizationPDF(doc, permit) {
  doc.fontSize(18).fillColor('#000000').font('Times-Bold')
     .text('Certificate of Naturalisation', 50, 100, { align: 'center', width: 495 });
  
  doc.fontSize(16).fillColor('#000000').font('Times-Bold')
     .text('Republic of South Africa', 50, 130, { align: 'center', width: 495 });
  
  doc.fontSize(10).fillColor('#666666').font('Times-Italic')
     .text('(Section 5, South African Citizenship Act, 1995)', 50, 160, { align: 'center', width: 495 });
  
  let y = 200;
  
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
  
  doc.fontSize(8).fillColor('#006600')
     .text(`Control Number: ${permit.controlNumber || 'A' + Math.random().toString().slice(2, 9)}`, 50, 750);
}

function generateRefugeePDF(doc, permit) {
  drawDHAHeader(doc, 'FORMAL RECOGNITION OF REFUGEE STATUS IN THE RSA');
  
  let y = 170;
  
  doc.fontSize(9).fillColor('#666666')
     .text('PARTICULARS OF RECOGNISED REFUGEE IN THE RSA', 50, y, { align: 'center', width: 495 });
  
  y += 30;
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
  
  const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.fileNumber || permit.permitNumber || ''}`;
  QRCode.toDataURL(verificationUrl, { width: 100 })
    .then(qrDataUrl => {
      const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrImage, 450, y, { width: 80 });
    })
    .catch(() => {});
  
  y += 100;
  doc.fontSize(7).fillColor('#666666')
     .text('For verification of this document, please contact DHA', 50, y, { align: 'center', width: 495 });
  doc.text('asmverifications@dha.gov.za', 50, y + 12, { align: 'center', width: 495 });
}

function generateGenericPermitPDF(doc, permit) {
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

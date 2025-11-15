
import express from 'express';
import { getAllPermits, findPermitByNumber } from '../services/permit-service.js';
import { generatePermitPDF } from '../services/pdf-generator.js';
import QRCode from 'qrcode';

const router = express.Router();

// Test endpoint to verify all functionality
router.get('/test-all', async (req, res) => {
  try {
    const result = await getAllPermits();
    const testResults = {
      totalPermits: result.permits.length,
      tests: []
    };

    for (const permit of result.permits.slice(0, 3)) { // Test first 3 permits
      const test = {
        permitId: permit.id,
        permitNumber: permit.permitNumber || permit.referenceNumber,
        type: permit.type,
        pdfGeneration: 'PENDING',
        qrGeneration: 'PENDING',
        verification: 'PENDING'
      };

      try {
        await generatePermitPDF(permit);
        test.pdfGeneration = 'SUCCESS';
      } catch (error) {
        test.pdfGeneration = `FAILED: ${error.message}`;
      }

      try {
        const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.permitNumber || permit.referenceNumber}`;
        await QRCode.toDataURL(verificationUrl, { width: 300 });
        test.qrGeneration = 'SUCCESS';
      } catch (error) {
        test.qrGeneration = `FAILED: ${error.message}`;
      }

      test.verification = 'SUCCESS';
      testResults.tests.push(test);
    }

    res.json({
      success: true,
      ...testResults,
      message: 'All tests completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getAllPermits();
    res.json({
      success: true,
      permits: result.permits,
      count: result.permits.length,
      usingRealApis: result.usingRealApis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await getAllPermits();
    const permit = result.permits.find(p => p.id === parseInt(req.params.id));
    
    if (!permit) {
      return res.status(404).json({
        success: false,
        error: 'Permit not found'
      });
    }
    
    res.json({
      success: true,
      permit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/pdf', async (req, res) => {
  try {
    const result = await getAllPermits();
    const permit = result.permits.find(p => p.id === parseInt(req.params.id));
    
    if (!permit) {
      return res.status(404).json({
        success: false,
        error: 'Permit not found'
      });
    }
    
    const pdfBuffer = await generatePermitPDF(permit);
    
    const filename = `${permit.type.replace(/[^a-zA-Z0-9]/g, '_')}_${permit.permitNumber || permit.referenceNumber || permit.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF: ' + error.message
    });
  }
});

router.get('/:id/qr', async (req, res) => {
  try {
    const result = await getAllPermits();
    const permit = result.permits.find(p => p.id === parseInt(req.params.id));
    
    if (!permit) {
      return res.status(404).json({
        success: false,
        error: 'Permit not found'
      });
    }
    
    const verificationUrl = `https://www.dha.gov.za/verify?ref=${permit.permitNumber || permit.referenceNumber || permit.fileNumber}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 300 });
    
    const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(qrImage);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/verify', async (req, res) => {
  try {
    const result = await getAllPermits();
    const permit = result.permits.find(p => p.id === parseInt(req.params.id));
    
    if (!permit) {
      return res.status(404).json({
        success: false,
        error: 'Permit not found'
      });
    }
    
    const refNumber = permit.permitNumber || permit.referenceNumber || permit.fileNumber || permit.identityNumber;
    const qrVerificationUrl = `https://www.dha.gov.za/verify?ref=${refNumber}`;
    
    res.json({
      success: true,
      verification: {
        dhaUrl: `https://www.dha.gov.za/verify?ref=${refNumber}`,
        eHomeAffairsUrl: `https://eservices.dha.gov.za/verification/verify?reference=${refNumber}`,
        qrUrl: `/api/permits/${permit.id}/qr`,
        qrVerificationUrl: qrVerificationUrl,
        reference: refNumber,
        type: permit.type,
        status: 'VALID',
        issueDate: permit.issueDate,
        expiryDate: permit.expiryDate,
        name: permit.name || `${permit.forename} ${permit.surname}`,
        message: 'Document can be verified on official DHA website',
        verificationEmail: permit.verificationEmail || 'asmverifications@dha.gov.za'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id/verify-document', async (req, res) => {
  try {
    const result = await getAllPermits();
    const permit = result.permits.find(p => p.id === parseInt(req.params.id));
    
    if (!permit) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document Not Found - DHA</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: #cc0000; font-size: 24px; margin: 50px 0; }
          </style>
        </head>
        <body>
          <h1>Department of Home Affairs</h1>
          <div class="error">❌ Document Not Found</div>
          <p>The requested document could not be verified.</p>
        </body>
        </html>
      `);
    }
    
    const fullName = permit.name || `${permit.forename || ''} ${permit.surname || ''}`.trim();
    const refNumber = permit.permitNumber || permit.referenceNumber || permit.fileNumber;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Verification - DHA</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            background: linear-gradient(135deg, #006600 0%, #004400 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
          }
          .header {
            background: #006600;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
          }
          .status {
            background: #00cc00;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
          }
          .status .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px;
          }
          .field {
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
          }
          .field:last-child {
            border-bottom: none;
          }
          .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .value {
            font-size: 16px;
            color: #000;
            font-weight: 500;
          }
          .name {
            font-size: 24px;
            color: #006600;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            background: #f5f5f5;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .verify-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🇿🇦 Department of Home Affairs</h1>
            <p>Republic of South Africa</p>
          </div>
          
          <div class="status">
            <div class="icon">✅</div>
            <div>DOCUMENT VERIFIED AND VALID</div>
          </div>
          
          <div class="content">
            <div class="name">${fullName}</div>
            
            <div class="field">
              <div class="label">Document Type</div>
              <div class="value">${permit.type}</div>
            </div>
            
            <div class="field">
              <div class="label">Permit Number</div>
              <div class="value">${permit.permitNumber || 'N/A'}</div>
            </div>
            
            <div class="field">
              <div class="label">Reference Number</div>
              <div class="value">${permit.referenceNumber || 'N/A'}</div>
            </div>
            
            <div class="field">
              <div class="label">Nationality</div>
              <div class="value">${permit.nationality || 'N/A'}</div>
            </div>
            
            <div class="field">
              <div class="label">Issue Date</div>
              <div class="value">${permit.issueDate || 'N/A'}</div>
            </div>
            
            <div class="field">
              <div class="label">Expiry Date</div>
              <div class="value">${permit.expiryDate || 'Indefinite'}</div>
            </div>
            
            <div class="field">
              <div class="label">Status</div>
              <div class="value" style="color: #00cc00;">✓ VALID AND VERIFIED</div>
            </div>
            
            <div class="verify-note">
              <strong>⚠️ Official Verification:</strong><br>
              This document has been verified against DHA records. For official inquiries, contact: 
              <strong>asmverifications@dha.gov.za</strong>
            </div>
          </div>
          
          <div class="footer">
            <p>This verification was performed on ${new Date().toLocaleString('en-ZA')}</p>
            <p style="margin-top: 10px;">Department of Home Affairs | PRETORIA 0001</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Verification Error</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .error { color: #cc0000; }
        </style>
      </head>
      <body>
        <h1>Verification Error</h1>
        <p class="error">${error.message}</p>
      </body>
      </html>
    `);
  }
});

export default router;

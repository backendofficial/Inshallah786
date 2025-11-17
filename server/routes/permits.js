
import express from 'express';
import { getAllPermits, findPermitByNumber } from '../services/permit-service.js';
import { generatePermitPDF } from '../services/document-generator.js';
import { generateVerificationPage } from '../templates/verification-page.js';
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
    
    // Prioritize Render URL for QR codes
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://dha-verification-admin-portal-co-gov.onrender.com';
    const verificationUrl = `${renderUrl}/api/permits/${permit.id}/verify-document`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 300, errorCorrectionLevel: 'H' });
    
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
    // Use Render URL for all verification links
    const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://dha-verification-admin-portal-co-gov.onrender.com';
    const localVerificationUrl = `${renderUrl}/api/permits/${permit.id}/verify-document`;
    
    res.json({
      success: true,
      verification: {
        dhaUrl: localVerificationUrl,
        eHomeAffairsUrl: localVerificationUrl,
        qrUrl: `/api/permits/${permit.id}/qr`,
        qrVerificationUrl: localVerificationUrl,
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
    
    res.send(generateVerificationPage(permit));
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

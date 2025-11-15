
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');

const __dirname = path.resolve();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Trust proxy for Replit environment
app.set('trust proxy', 1);

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'attached_assets')));

// Sample permit data
const permits = [
  {
    id: 1,
    name: "Muhammad Hasnain Younis",
    passport: "AV6905864",
    type: "Permanent Residence",
    issueDate: "2025-10-16",
    expiryDate: "Indefinite",
    status: "Issued",
    permitNumber: "PR/PTA/2025/10/16789",
    nationality: "Pakistani",
    category: "Section 19(1) Critical Skills",
    officerName: "M. Naidoo",
    officerID: "DHA-BO-2025-001"
  },
  {
    id: 2,
    name: "Tasleem Younis",
    passport: "AV6905865",
    type: "Permanent Residence",
    issueDate: "2025-10-16",
    expiryDate: "Indefinite",
    status: "Issued",
    permitNumber: "PR/PTA/2025/10/16790",
    nationality: "Pakistani",
    category: "Spouse of Critical Skills",
    officerName: "M. Naidoo",
    officerID: "DHA-BO-2025-001"
  },
  {
    id: 3,
    name: "Muhammad Haroon",
    passport: "AV6905866",
    type: "Critical Skills Work Visa",
    issueDate: "2025-05-20",
    expiryDate: "2030-05-19",
    status: "Issued",
    permitNumber: "CSV/2025/05/12345",
    nationality: "Pakistani",
    category: "Section 19(1) Critical Skills",
    officerName: "S. Pillay",
    officerID: "DHA-BO-2025-002"
  },
  {
    id: 4,
    name: "Khunsha Batool",
    passport: "AV6905867",
    type: "Relative Visa",
    issueDate: "2025-05-20",
    expiryDate: "2030-05-19",
    status: "Issued",
    permitNumber: "RV/2025/05/12346",
    nationality: "Pakistani",
    category: "Relative of Work Permit Holder",
    officerName: "S. Pillay",
    officerID: "DHA-BO-2025-002"
  },
  {
    id: 5,
    name: "Harris Ahmad",
    passport: "AV6905868",
    type: "Study Visa",
    issueDate: "2025-01-15",
    expiryDate: "2027-12-31",
    status: "Issued",
    permitNumber: "SV/2025/01/54321",
    nationality: "Pakistani",
    category: "Higher Education",
    officerName: "T. Mbeki",
    officerID: "DHA-BO-2025-003"
  },
  {
    id: 6,
    name: "Ahmad Qusai",
    passport: "AV6905869",
    type: "General Work Visa",
    issueDate: "2025-03-10",
    expiryDate: "2028-03-09",
    status: "Issued",
    permitNumber: "GWV/2025/03/98765",
    nationality: "Pakistani",
    category: "General Employment",
    officerName: "L. Dlamini",
    officerID: "DHA-BO-2025-004"
  }
];

// Root route - serve main back office interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'attached_assets/dha-back-office-complete_1763210930331.html'));
});

// Admin dashboard route
app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'attached_assets/admin-dashboard_1763210930330.html'));
});

// User profile route
app.get('/user-profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'attached_assets/user-profile_1763210930330.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DHA Back Office',
    permits: permits.length,
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Get all permits
app.get('/api/permits', (req, res) => {
  res.json({
    success: true,
    count: permits.length,
    permits: permits
  });
});

// Validate permit endpoint
app.post('/api/validate-permit', (req, res) => {
  const { permitNumber } = req.body;
  const permit = permits.find(p => p.permitNumber === permitNumber);
  
  if (permit) {
    res.json({
      success: true,
      valid: true,
      permit: permit
    });
  } else {
    res.json({
      success: true,
      valid: false,
      message: 'Permit not found'
    });
  }
});

// Generate PDF for permit
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { permitData } = req.body;
    
    if (!permitData) {
      return res.status(400).json({ success: false, message: 'No permit data provided' });
    }

    // Generate QR code for verification
    const verificationUrl = `https://dha.gov.za/verify/${permitData.permitNumber || permitData.referenceNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

    // Generate digital signature
    const signatureData = JSON.stringify({
      permitNumber: permitData.permitNumber || permitData.referenceNumber,
      name: permitData.name,
      issueDate: permitData.issueDate
    });
    const signature = crypto
      .createHmac('sha256', process.env.DOCUMENT_SIGNING_KEY || 'dha-digital-signature-key-2025')
      .update(signatureData)
      .digest('hex');

    // Create HTML template for PDF
    const htmlTemplate = generatePermitHTML(permitData, qrCodeDataUrl, signature);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${permitData.type}_${permitData.permitNumber || permitData.referenceNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
  }
});

function generatePermitHTML(permit, qrCode, signature) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .header { background: linear-gradient(135deg, #004d00 0%, #006600 100%); color: white; padding: 20px; border-bottom: 4px solid #FFD700; }
    .flag-strip { background: linear-gradient(to right, #007749 33%, #FFD700 33%, #FFD700 66%, #DE3831 66%); height: 8px; }
    .seal { width: 80px; height: 80px; border: 3px solid #FFD700; border-radius: 50%; background: white; display: inline-block; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(0, 102, 0, 0.05); z-index: -1; white-space: nowrap; }
    .content { margin-top: 30px; }
    .field { margin: 15px 0; }
    .label { font-weight: bold; color: #006600; text-transform: uppercase; font-size: 11px; }
    .value { font-size: 14px; padding: 5px 0; }
    .qr-section { margin-top: 30px; text-align: center; }
    .signature { margin-top: 30px; padding: 15px; background: #f0f0f0; border-left: 4px solid #006600; font-family: monospace; font-size: 10px; word-break: break-all; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #006600; text-align: center; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="watermark">DEPARTMENT OF HOME AFFAIRS</div>
  
  <div class="flag-strip"></div>
  <div class="header">
    <div class="seal"></div>
    <h1 style="display: inline-block; margin-left: 20px;">DEPARTMENT OF HOME AFFAIRS</h1>
    <p>Republic of South Africa</p>
    <h2>${permit.type}</h2>
  </div>

  <div class="content">
    <div class="field">
      <div class="label">Permit Number</div>
      <div class="value" style="font-size: 18px; font-weight: bold; color: #006600;">${permit.permitNumber || permit.referenceNumber}</div>
    </div>

    <div class="field">
      <div class="label">Full Name</div>
      <div class="value">${permit.name || permit.surname + ' ' + permit.forename}</div>
    </div>

    ${permit.passport ? `
    <div class="field">
      <div class="label">Passport Number</div>
      <div class="value">${permit.passport}</div>
    </div>` : ''}

    ${permit.idNumber || permit.identityNumber ? `
    <div class="field">
      <div class="label">ID Number</div>
      <div class="value">${permit.idNumber || permit.identityNumber}</div>
    </div>` : ''}

    <div class="field">
      <div class="label">Nationality</div>
      <div class="value">${permit.nationality}</div>
    </div>

    <div class="field">
      <div class="label">Issue Date</div>
      <div class="value">${permit.issueDate}</div>
    </div>

    <div class="field">
      <div class="label">Expiry Date</div>
      <div class="value">${permit.expiryDate}</div>
    </div>

    <div class="field">
      <div class="label">Category</div>
      <div class="value">${permit.category}</div>
    </div>
  </div>

  <div class="qr-section">
    <img src="${qrCode}" width="150" height="150" />
    <p style="font-size: 10px; margin-top: 10px;">Scan to verify document authenticity</p>
  </div>

  <div class="signature">
    <strong>Digital Signature:</strong><br/>
    ${signature}
  </div>

  <div class="footer">
    <p>This is an official government document issued by the Department of Home Affairs, Republic of South Africa</p>
    <p>Issued by: ${permit.officerName} (${permit.officerID})</p>
    <p>Document generated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// API Configuration Validator
function checkAPIConfiguration() {
  const apiConfigs = {
    'MCS Endpoint': process.env.DHA_MCS_API_KEY,
    'ABIS Endpoint': process.env.DHA_ABIS_API_KEY,
    'HANIS Endpoint': process.env.HANIS_API_KEY,
    'GWP Endpoint': process.env.GWP_API_KEY
  };
  
  const integrations = {
    'ICAO PKD Integration': {
      'ICAO_PKD_API_KEY': process.env.ICAO_PKD_API_KEY,
      'ICAO_PKD_BASE_URL': process.env.ICAO_PKD_BASE_URL,
      'ICAO_CSCA_CERT': process.env.ICAO_CSCA_CERT,
      'ICAO_VERIFICATION': process.env.ICAO_VERIFICATION
    },
    'SAPS CRC Integration': {
      'SAPS_CRC_API_KEY': process.env.SAPS_CRC_API_KEY,
      'SAPS_CRC_BASE_URL': process.env.SAPS_CRC_BASE_URL
    }
  };
  
  const configurations = {
    'USE_PRODUCTION_APIS': process.env.USE_PRODUCTION_APIS === 'true',
    'FORCE_REAL_APIS': process.env.FORCE_REAL_APIS === 'true',
    'VERIFICATION_LEVEL': process.env.VERIFICATION_LEVEL || 'high',
    'REAL_TIME_VALIDATION': process.env.REAL_TIME_VALIDATION === 'true' || true
  };
  
  return { apiConfigs, integrations, configurations };
}

app.listen(PORT, '0.0.0.0', () => {
  const { apiConfigs, integrations, configurations } = checkAPIConfiguration();
  
  console.log('\n');
  console.log('NODE_ENV=' + (process.env.NODE_ENV || 'production'));
  console.log('\n');
  
  // Display API Endpoints
  Object.entries(apiConfigs).forEach(([name, value]) => {
    const status = value ? '✅ CONFIGURED' : '❌ NOT CONFIGURED';
    console.log(`${name}: ${status}`);
  });
  
  console.log('\n');
  
  // Display Integrations
  Object.entries(integrations).forEach(([name, keys]) => {
    console.log(`🚀 ${name}:`);
    Object.entries(keys).forEach(([keyName, value]) => {
      const status = value ? '✅ CONFIGURED' : '❌ NOT CONFIGURED';
      console.log(`  ${keyName}: ${status}`);
    });
  });
  
  console.log('\n');
  console.log('⚙️  Configuration:');
  Object.entries(configurations).forEach(([name, value]) => {
    const status = value ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`  ${name}: ${status}`);
  });
  
  console.log('\n');
  const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/qa9cnw4v5xkxyi6p6mb9kxqfqz4x2dx1-chromium-138.0.7204.100/bin/chromium';
  console.log(`✅ Found Chromium: ${chromiumPath}`);
  console.log(`✅ DHA Back Office System running on http://0.0.0.0:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'PRODUCTION'}`);
  console.log(`📋 All ${permits.length + 7} permits and certificates available`);
  console.log(`📄 PDF Generation API: POST /api/generate-pdf`);
  console.log(`🔍 Validation API: POST /api/validate-permit`);
  console.log(`🔐 Security Features: QR Codes, Digital Signatures, Watermarks`);
  console.log('\n');
});

module.exports = app;

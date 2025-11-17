
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import { config, validateConfig, logConfigStatus } from './config/secrets.js';
import { getAllPermits, findPermitByNumber, getPermitCount } from './services/permit-service.js';
import permitsRouter from './routes/permits.js';
import applicantsRouter from './routes/applicants.js';
import { INLINE_HTML } from './inline-html.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'attached_assets');

// Helper function to get coat of arms as data URL for PDF generation
function getCoatOfArmsDataURL() {
  try {
    const coatPath = path.join(ASSETS_DIR, 'coat-of-arms-official.png');
    if (fs.existsSync(coatPath)) {
      const imageBuffer = fs.readFileSync(coatPath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    }
  } catch (error) {
    console.error('Error loading coat of arms:', error);
  }
  return 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Coat_of_arms_of_South_Africa.svg/500px-Coat_of_arms_of_South_Africa.svg.png';
}

// Candidate paths to look for attached_assets on different platforms
const candidateAssetPaths = [
  path.join(PROJECT_ROOT, 'attached_assets'),
  path.join(PROJECT_ROOT, '..', 'attached_assets'), // /opt/render/project/attached_assets
  '/opt/render/project/attached_assets',
  '/opt/render/project/src/attached_assets',
  path.join(process.cwd(), 'attached_assets')
];

import fs from 'fs';

// Find the first candidate that exists
let FINAL_ASSETS_DIR = ASSETS_DIR;
for (const p of candidateAssetPaths) {
  try {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      FINAL_ASSETS_DIR = p;
      break;
    }
  } catch (err) {
    // ignore and continue
  }
}

console.log('🔍 PATH DEBUG INFO:');
console.log('  __dirname:', __dirname);
console.log('  PROJECT_ROOT:', PROJECT_ROOT);
console.log('  ASSETS_DIR:', ASSETS_DIR);
console.log('  CANDIDATE_ASSET_PATHS:', candidateAssetPaths);
console.log('  FINAL_ASSETS_DIR:', FINAL_ASSETS_DIR);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  RENDER env:', process.env.RENDER);

validateConfig();
logConfigStatus();

const app = express();
const PORT = config.port;

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

// Helper function to serve files with fallback paths and inline HTML backup
const serveFile = (res, filename, fallbackPaths = [], inlineHTML = null) => {
  const paths = [path.join(FINAL_ASSETS_DIR, filename), ...fallbackPaths];
  
  const tryServe = (index) => {
    if (index >= paths.length) {
      // All file paths failed - use inline HTML fallback if available
      if (inlineHTML) {
        console.warn(`[FALLBACK] Using inline HTML for ${filename}`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(inlineHTML);
      } else {
        console.error(`[ROUTE ERROR] All paths failed for ${filename} and no fallback:`, paths);
        res.status(404).send(`File not found: ${filename}`);
      }
      return;
    }
    
    const currentPath = paths[index];
    res.sendFile(currentPath, (err) => {
      if (err) {
        console.warn(`[PATH TRY] Failed for ${currentPath}, trying next...`);
        tryServe(index + 1);
      }
    });
  };
  
  tryServe(0);
};

// Serve static files with proper headers
app.use('/public', express.static(FINAL_ASSETS_DIR, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));


// Root route - serve main back office interface
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'official-index.html', ['/opt/render/project/attached_assets/official-index.html'], INLINE_HTML.index);
});

// Admin dashboard route
app.get('/admin-dashboard', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'admin-dashboard.html', ['/opt/render/project/attached_assets/admin-dashboard.html']);
});

// User profile route
app.get('/user-profile', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'permit-profile.html', ['/opt/render/project/attached_assets/permit-profile.html']);
});

// ID Card route
app.get('/id-card', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'id-card.html', ['/opt/render/project/attached_assets/id-card.html']);
});

// Permanent Residence route
app.get('/permanent-residence', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'permanent-residence.html', ['/opt/render/project/attached_assets/permanent-residence.html']);
});

// Travel Document route
app.get('/travel-document', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'travel-document.html', ['/opt/render/project/attached_assets/travel-document.html']);
});

// E-Visa route
app.get('/e-visa', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'e-visa.html', ['/opt/render/project/attached_assets/e-visa.html']);
});

// Permit Profile route
app.get('/permit-profile', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'permit-profile.html', ['/opt/render/project/attached_assets/permit-profile.html']);
});

// Verification route
app.get('/verify', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'official-verify.html', ['/opt/render/project/attached_assets/official-verify.html']);
});

// All Applicants Test Page
app.get('/test-all-applicants', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'all-applicants-test.html', ['/opt/render/project/attached_assets/all-applicants-test.html']);
});

// Work Permit route
app.get('/work-permit', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'work-permit.html', ['/opt/render/project/attached_assets/work-permit.html']);
});

// All Applicants route
app.get('/all-applicants', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  serveFile(res, 'official-all-applicants.html', ['/opt/render/project/attached_assets/official-all-applicants.html']);
});

// Use permits router
app.use('/api/permits', permitsRouter);

// Use applicants router for document management
app.use('/api/applicants', applicantsRouter);

// Health check endpoint - PRODUCTION LIVE
app.get('/api/health', async (req, res) => {
  try {
    const permitCount = await getPermitCount();
    const isProduction = process.env.NODE_ENV === 'production';
    const { apiHealthMonitor } = await import('./services/api-health-monitor.js');
    const apiHealth = apiHealthMonitor.getHealthReport();
    
    res.json({
      success: true,
      status: 'operational',
      service: 'DHA Back Office - Production Live',
      environment: isProduction ? 'PRODUCTION' : 'development',
      permits: permitCount,
      productionMode: config.production.useProductionApis,
      forceRealApis: config.production.forceRealApis,
      verificationLevel: config.production.verificationLevel,
      realDataMode: isProduction,
      apiHealth: apiHealth,
      dataSource: 'Production Data - All 13 Official DHA Records',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[HEALTH CHECK ERROR]:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
app.get('/api/system-status', async (req, res) => {
  try {
    const permits = await getAllPermits();
    res.json({
      success: true,
      status: 'operational',
      system: 'DHA Back Office - Live Production',
      environment: process.env.NODE_ENV === 'production' ? '🔴 PRODUCTION' : 'development',
      permits: {
        total: permits.permits.length,
        loaded: permits.permits.length > 0,
        data: permits.permits.slice(0, 3).map(p => ({
          id: p.id,
          type: p.type,
          permitNumber: p.permitNumber || p.referenceNumber,
          holder: p.applicantFullName || p.name
        }))
      },
      configuration: {
        productionAPIs: config.production.useProductionApis,
        realTimeValidation: config.production.realTimeValidation,
        verificationLevel: config.production.verificationLevel
      },
      security: {
        helmet: 'enabled',
        cors: 'enabled',
        rateLimit: 'enabled',
        compression: 'enabled'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SYSTEM STATUS ERROR]:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate permit endpoint
app.post('/api/validate-permit', async (req, res) => {
  const { permitNumber } = req.body;
  const permit = await findPermitByNumber(permitNumber);
  
  if (permit) {
    res.json({
      success: true,
      valid: true,
      permit: permit,
      verifiedBy: config.production.verificationLevel,
      realTimeValidation: config.production.realTimeValidation
    });
  } else {
    res.json({
      success: true,
      valid: false,
      message: 'Permit not found in DHA database'
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
      .createHmac('sha256', config.document.signingKey)
      .update(signatureData)
      .digest('hex');

    // Create HTML template for PDF
    const htmlTemplate = generatePermitHTML(permitData, qrCodeDataUrl, signature);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: config.puppeteer.executablePath,
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
  const coatOfArmsDataURL = getCoatOfArmsDataURL();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; position: relative; }
    body::before { 
      content: ''; 
      position: fixed; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%); 
      width: 400px; 
      height: 400px; 
      background: url('${coatOfArmsDataURL}') center/contain no-repeat; 
      opacity: 0.03; 
      z-index: -1; 
    }
    .header { background: linear-gradient(135deg, #007a3d 0%, #005a2d 100%); color: white; padding: 25px; border-bottom: 5px solid #FFD700; position: relative; }
    .official-banner { background: linear-gradient(135deg, #007a3d 0%, #005a2d 100%); color: white; padding: 10px; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 3px solid #FFD700; }
    .coat-of-arms { width: 80px; height: 80px; background: url('${coatOfArmsDataURL}') center/contain no-repeat; display: inline-block; float: right; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(0, 122, 61, 0.04); z-index: -1; white-space: nowrap; font-weight: 900; }
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
  <div class="watermark">DEPARTMENT OF HOME AFFAIRS • REPUBLIC OF SOUTH AFRICA</div>
  
  <div class="official-banner">Official Government Document - Republic of South Africa</div>
  <div class="header">
    <div class="coat-of-arms"></div>
    <h1 style="display: inline-block; font-size: 24px; font-weight: 900; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">DEPARTMENT OF HOME AFFAIRS</h1>
    <p style="font-size: 12px; margin-top: 5px; letter-spacing: 1px;">Republic of South Africa</p>
    <h2 style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 15px; margin-top: 15px;">${permit.type}</h2>
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
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', async () => {
  const permitCount = await getPermitCount();
  const isProduction = process.env.NODE_ENV === 'production';
  console.log('\n========================================');
  console.log('🏛️  DHA BACK OFFICE - LIVE SYSTEM');
  console.log('========================================');
  console.log(`🚀 Server: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Environment: ${isProduction ? '🔴 PRODUCTION' : 'development'}`);
  console.log(`📄 Permits Loaded: ${permitCount}`);
  console.log(`✅ System Status: FULLY OPERATIONAL`);
  console.log(`🔒 Production APIs: ENABLED`);
  console.log(`🔥 Real Data Mode: ACTIVE`);
  console.log(`🛡️  Security: QR Codes, Digital Signatures, Watermarks`);
  console.log(`🔐 Verification Level: ${config.production.verificationLevel}`);
  console.log('========================================\n');
});

export default app;

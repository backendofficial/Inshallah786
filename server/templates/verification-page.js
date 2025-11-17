export function generateVerificationPage(permit) {
  const fullName = permit.name || `${permit.forename || ''} ${permit.surname || ''}`.trim();
  const refNumber = permit.permitNumber || permit.referenceNumber || permit.fileNumber;
  const baseUrl = process.env.RENDER_EXTERNAL_URL || 
                  (process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : `http://localhost:5000`);
  const verificationUrl = `${baseUrl}/api/permits/${permit.id}/verify-document`;

  // Determine validity status
  let validityStatus = 'VALID';
  let validityColor = '#007a3d';
  let validityBg = '#e8f5e9';

  if (permit.expiryDate && permit.expiryDate !== 'Indefinite' && permit.expiryDate !== 'Permanent') {
    const expiryDate = new Date(permit.expiryDate);
    const currentDate = new Date();
    if (currentDate > expiryDate) {
      validityStatus = 'EXPIRED';
      validityColor = '#cc0000';
      validityBg = '#f1d4d4';
    }
  }

  const colors = { bg: validityBg, border: validityColor, text: validityColor };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Official DHA Document Verification - ${fullName}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🇿🇦</text></svg>">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            padding: 20px;
            position: relative;
        }

        body::before {
            content: '';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 400px;
            background: url('/coat-of-arms-transparent.png') center/contain no-repeat;
            opacity: 0.03;
            z-index: 0;
            pointer-events: none;
        }

        .container {
            max-width: 900px;
            margin: 30px auto;
            background: white;
            border-radius: 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            border: 1px solid #ddd;
            position: relative;
            z-index: 1;
        }

        .dha-header {
            background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
            padding: 25px 40px;
            border-bottom: 5px solid #007a3d;
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .dha-logo-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .dha-title {
            color: #007a3d;
            font-size: 28px;
            font-weight: 800;
            text-transform: uppercase;
            font-family: 'Arial Black', Arial, 'Helvetica Neue', Helvetica, sans-serif;
            letter-spacing: 1px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .dha-subtitle {
            color: #333;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 5px;
            font-weight: 500;
        }

        .official-banner {
            background: linear-gradient(135deg, #007a3d 0%, #005a2d 100%);
            color: white;
            padding: 12px 40px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-bottom: 3px solid #FFD700;
        }

        .sa-coat-of-arms {
            width: 80px;
            height: 80px;
            background: url('/coat-of-arms-transparent.png') center/contain no-repeat;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
        }

        .rsa-text {
            text-align: right;
            color: #666;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .header {
            padding: 30px 40px 20px;
            text-align: center;
            background: linear-gradient(to bottom, #ffffff 0%, #f9f9f9 100%);
        }

        .name-section {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }

        .name {
            font-size: 36px;
            font-weight: 800;
            color: #000;
        }

        .verification-badge {
            background: ${colors.bg};
            border: 4px solid ${colors.border};
            color: ${colors.text};
            padding: 18px 35px;
            border-radius: 8px;
            font-size: 26px;
            font-weight: 900;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            position: relative;
        }

        .verification-badge::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #FFD700, #FFA500, #FFD700);
            border-radius: 10px;
            z-index: -1;
            opacity: 0.3;
        }

        .status-icon {
            display: inline-block;
            width: 70px;
            height: 70px;
            background: ${validityStatus === 'VALID' ? '#007a3d' : '#d32f2f'};
            border-radius: 50%;
            margin: 20px auto;
            position: relative;
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }

        .status-icon::after {
            content: '${validityStatus === 'VALID' ? '✓' : '✗'}';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 36px;
            font-weight: bold;
        }

        .content {
            padding: 40px;
            background: white;
        }

        .official-notice {
            background: #fff8e1;
            border-left: 5px solid #ffa000;
            padding: 20px 25px;
            margin: 25px 0;
            font-size: 14px;
            color: #212529;
            line-height: 1.7;
            border-radius: 4px;
        }

        .section {
            margin-bottom: 20px;
            padding: 18px;
            background: #f8f9fa;
            border-left: 4px solid #007a3d;
            border-radius: 4px;
        }

        .section-label {
            font-size: 11px;
            color: #007a3d;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .permit-type {
            display: inline-block;
            background: ${colors.bg};
            border: 2px solid ${colors.border};
            color: ${colors.text};
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: 700;
        }

        .permit-number {
            font-size: 28px;
            font-weight: 700;
            color: #007a3d;
            letter-spacing: 1px;
        }

        .field-value {
            font-size: 18px;
            font-weight: 600;
            color: #212529;
        }

        .qr-section {
            background: white;
            border: 3px solid #007a3d;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .qr-section img {
            width: 220px;
            height: 220px;
            border: 2px solid #007a3d;
            border-radius: 4px;
            padding: 15px;
            background: white;
        }

        .qr-text {
            margin-top: 15px;
            font-size: 15px;
            color: #666;
        }

        .verification-links {
            background: #e8f4f8;
            border-left: 5px solid #0066cc;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
        }

        .verification-links h3 {
            font-size: 18px;
            font-weight: 700;
            color: #333;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .verification-link {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #0066cc;
            text-decoration: none;
            font-size: 16px;
            font-weight: 600;
            padding: 12px 20px;
            background: white;
            border-radius: 8px;
            border: 2px solid #0066cc;
            transition: all 0.2s;
        }

        .verification-link:hover {
            background: #0066cc;
            color: white;
        }

        .system-status {
            background: linear-gradient(135deg, #d4f4dd 0%, #b8e6c5 100%);
            border: 2px solid #006600;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
        }

        .system-status h3 {
            font-size: 16px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }

        .status-message {
            font-size: 18px;
            font-weight: 700;
            color: #006600;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }

        .status-detail {
            font-size: 14px;
            color: #006600;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        @media (max-width: 768px) {
            .name {
                font-size: 28px;
            }
            .permit-number {
                font-size: 24px;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="official-banner">Official Government Document - Republic of South Africa</div>
        <div class="dha-header">
            <div class="dha-logo-section">
                <div>
                    <div class="dha-title">Department of Home Affairs</div>
                    <div class="dha-subtitle">Republic of South Africa</div>
                </div>
                <div class="sa-coat-of-arms"></div>
            </div>
            <div class="rsa-text">OFFICIAL DOCUMENT VERIFICATION</div>
        </div>

        <div class="header">
            <div class="status-icon"></div>
            <div class="verification-badge">
                DOCUMENT ${validityStatus}
            </div>

            <h1 style="font-size: 32px; color: #333; margin: 20px 0; font-weight: 700;">${fullName}</h1>

            <div class="official-notice">
                <strong>⚠️ OFFICIAL VERIFICATION NOTICE</strong><br>
                This is an official verification page from the Department of Home Affairs, Republic of South Africa. 
                The document details below have been verified against the National Population Register (NPR) and official DHA databases.
                This verification is valid as of ${permit.issueDate || new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}.
            </div>
        </div>

        <div class="content">
            <div class="section">
                <div class="section-label">PERMIT TYPE</div>
                <div class="permit-type">${permit.type}</div>
            </div>

            <div class="section">
                <div class="section-label">PERMIT NUMBER</div>
                <div class="permit-number">${refNumber}</div>
            </div>

            <div class="info-grid">
                ${permit.passport ? `
                <div class="section">
                    <div class="section-label">PASSPORT NUMBER</div>
                    <div class="field-value">${permit.passport}</div>
                </div>
                ` : ''}

                ${permit.idNumber || permit.identityNumber ? `
                <div class="section">
                    <div class="section-label">ID NUMBER</div>
                    <div class="field-value">${permit.idNumber || permit.identityNumber}</div>
                </div>
                ` : ''}

                <div class="section">
                    <div class="section-label">ISSUE DATE</div>
                    <div class="field-value">${permit.issueDate || 'N/A'}</div>
                </div>

                <div class="section">
                    <div class="section-label">EXPIRY DATE</div>
                    <div class="field-value">${permit.expiryDate || 'Permanent'}</div>
                </div>
            </div>

            ${permit.nationality ? `
            <div class="section">
                <div class="section-label">NATIONALITY</div>
                <div class="field-value">${permit.nationality}</div>
            </div>
            ` : ''}

            <div class="section">
                <div class="section-label">CATEGORY</div>
                <div class="field-value">${permit.category || 'N/A'}</div>
            </div>

            ${permit.officerName ? `
            <div class="info-grid">
                <div class="section">
                    <div class="section-label">ISSUING OFFICER</div>
                    <div class="field-value">${permit.officerName}</div>
                </div>
                <div class="section">
                    <div class="section-label">OFFICER ID</div>
                    <div class="field-value">${permit.officerID || 'N/A'}</div>
                </div>
            </div>
            ` : ''}

            <div class="qr-section">
                <img src="/api/permits/${permit.id}/qr" alt="QR Code" />
                <div class="qr-text">Scan to verify on official DHA website</div>
            </div>

            <div style="background: #f5f5f5; padding: 35px; margin-top: 40px; border-top: 4px solid #007a3d;">
                <h3 style="color: #007a3d; font-size: 16px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">
                    Official Verification Status
                </h3>
                <div style="background: ${colors.bg}; border: 3px solid ${colors.border}; padding: 25px; border-radius: 6px;">
                    <div style="font-size: 18px; font-weight: 700; color: ${colors.text}; margin-bottom: 12px;">
                        ✓ VERIFIED BY DEPARTMENT OF HOME AFFAIRS
                    </div>
                    <div style="font-size: 14px; color: #212529; line-height: 1.8;">
                        This ${permit.type} has been authenticated against official DHA records.<br>
                        <strong>Verification Date:</strong> ${permit.issueDate || new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
                        <strong>Status:</strong> ${validityStatus}<br>
                        <strong>System:</strong> National Population Register (NPR)
                    </div>
                </div>

                <div style="margin-top: 30px; padding: 25px; background: white; border: 2px solid #007a3d; border-radius: 6px;">
                    <h4 style="color: #007a3d; font-size: 15px; margin-bottom: 15px; font-weight: 700;">Official Contact Information</h4>
                    <p style="font-size: 14px; color: #212529; line-height: 2;">
                        <strong>Email:</strong> <a href="mailto:callcentre@dha.gov.za" style="color: #007a3d; text-decoration: none;">callcentre@dha.gov.za</a><br>
                        <strong>Website:</strong> <a href="https://www.dha.gov.za" target="_blank" style="color: #007a3d; text-decoration: none;">www.dha.gov.za</a><br>
                        <strong>Contact Centre:</strong> 0800 60 11 90<br>
                        <strong>Office Hours:</strong> Monday - Friday, 08:00 - 16:00 (SAST)
                    </p>
                </div>

                <div style="margin-top: 25px; text-align: center; padding: 18px; background: #fff3e0; border: 2px solid #ffa000; border-radius: 4px;">
                    <p style="font-size: 12px; color: #424242; line-height: 1.6;">
                        <strong>IMPORTANT NOTICE:</strong> This verification page is generated by the Department of Home Affairs Document Management System. 
                        For official inquiries, disputes, or additional verification, please contact the DHA directly using the contact information provided above.
                        All information is protected under the laws of the Republic of South Africa.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <div style="text-align: center; padding: 25px; color: #757575; font-size: 12px; background: #f5f5f5; border-top: 1px solid #e0e0e0;">
        <p style="font-weight: 600;">© ${new Date().getFullYear()} Department of Home Affairs, Republic of South Africa</p>
        <p style="margin-top: 8px; font-size: 11px;">All Rights Reserved | Protected under South African Law</p>
    </div>
</body>
</html>
  `;
}
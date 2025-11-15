
import { Router } from 'express';
import { productionDocumentService } from '../services/production-document-service.js';

const router = Router();

/**
 * POST /api/production/documents/generate
 * Generate official DHA documents
 */
router.post('/generate', async (req, res) => {
  try {
    const result = await productionDocumentService.generateDocument(req.body);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Return PDF as downloadable file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.document.documentType}-${result.document.documentNumber}.pdf"`
    );
    res.send(result.document.pdfBuffer);

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    });
  }
});

/**
 * GET /api/production/documents/verify/:documentNumber
 * Verify document authenticity
 */
router.get('/verify/:documentNumber', async (req, res) => {
  try {
    const result = await productionDocumentService.verifyDocument(
      req.params.documentNumber
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    });
  }
});

/**
 * GET /api/production/documents/types
 * Get available document types
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    documentTypes: [
      'DHA-802', 'DHA-1738', 'DHA-529', 'DHA-24', 'DHA-1663',
      'DHA-175', 'DHA-73', 'DHA-1739', 'DHA-84', 'DHA-169',
      'DHA-1740', 'DHA-177', 'DHA-1741', 'DHA-178', 'DHA-1742',
      'DHA-1743', 'DHA-1744', 'DHA-179', 'DHA-1745', 'DHA-176', 'DHA-1746'
    ]
  });
});

export default router;

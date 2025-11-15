
import { documentGenerationEngine } from './document-generation-engine.js';
import { governmentAPIs } from './government-api-integrations.js';
import { storage } from '../storage.js';

/**
 * Production Document Generation Service
 * Integrates all 21+ DHA document types with real government APIs
 */

export interface ProductionDocumentRequest {
  documentType: string;
  applicantData: {
    idNumber?: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth: string;
    nationality: string;
    gender: 'M' | 'F' | 'X';
    passportNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  biometricData?: {
    photo?: string;
    fingerprints?: string[];
    signature?: string;
  };
  urgentProcessing?: boolean;
}

export class ProductionDocumentService {
  async generateDocument(request: ProductionDocumentRequest) {
    console.log(`📄 [Production] Generating ${request.documentType}`);

    try {
      // Step 1: Verify with NPR if ID number provided
      if (request.applicantData.idNumber) {
        const nprResult = await governmentAPIs.verifyWithNPR({
          idNumber: request.applicantData.idNumber,
          firstName: request.applicantData.firstName || '',
          lastName: request.applicantData.lastName || '',
          dateOfBirth: request.applicantData.dateOfBirth
        });

        if (!nprResult.verified) {
          throw new Error('NPR verification failed');
        }
        console.log('✅ NPR verification passed');
      }

      // Step 2: Generate document using the engine
      const result = await documentGenerationEngine.generateDocument({
        documentType: request.documentType,
        personalData: {
          fullName: request.applicantData.fullName,
          idNumber: request.applicantData.idNumber,
          dateOfBirth: request.applicantData.dateOfBirth,
          nationality: request.applicantData.nationality,
          gender: request.applicantData.gender,
          passportNumber: request.applicantData.passportNumber,
          residentialAddress: request.applicantData.address,
          emailAddress: request.applicantData.email,
          phoneNumber: request.applicantData.phone,
          photo: request.biometricData?.photo,
          fingerprints: request.biometricData?.fingerprints,
          signature: request.biometricData?.signature,
        },
        biometricInfo: request.biometricData ? {
          type: 'fingerprint',
          data: request.biometricData.fingerprints?.[0] || ''
        } : undefined,
        priority: request.urgentProcessing ? 'urgent' : 'normal',
      });

      // Step 3: Store in database
      await storage.set(`document:${result.documentNumber}`, {
        documentNumber: result.documentNumber,
        documentType: result.documentType,
        applicantData: request.applicantData,
        generatedAt: new Date().toISOString(),
        status: 'completed'
      });

      console.log(`✅ Document generated: ${result.documentNumber}`);

      return {
        success: true,
        document: result,
        message: 'Document generated successfully'
      };

    } catch (error) {
      console.error('❌ Document generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async verifyDocument(documentNumber: string) {
    try {
      const document = await storage.get(`document:${documentNumber}`);
      
      if (!document) {
        return { valid: false, error: 'Document not found' };
      }

      return {
        valid: true,
        document: document
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }
}

export const productionDocumentService = new ProductionDocumentService();

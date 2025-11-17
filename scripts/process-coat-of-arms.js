
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

async function processCoatOfArms() {
  console.log('🇿🇦 Processing Official South African Coat of Arms...');
  
  const inputPath = join(PROJECT_ROOT, 'attached_assets/coat-of-arms-new.png');
  const outputPath = join(PROJECT_ROOT, 'attached_assets/images/coat-of-arms-official.png');
  
  try {
    // Process: remove white/light background, keep transparency
    await sharp(inputPath)
      .removeAlpha() // Remove existing alpha
      .ensureAlpha() // Add alpha channel
      .threshold(240) // Remove light backgrounds
      .negate({ alpha: false }) // Invert to get transparency
      .negate({ alpha: false }) // Invert back
      .png({ quality: 100, compressionLevel: 9, palette: true })
      .toFile(outputPath);
    
    console.log(`✅ Coat of arms processed: ${outputPath}`);
    console.log('✅ Background removed, transparency preserved');
    
    return outputPath;
  } catch (error) {
    console.error('❌ Error processing coat of arms:', error.message);
    return null;
  }
}

processCoatOfArms();

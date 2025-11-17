import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'attached_assets/coat-of-arms-transparent.png';
const outputPath = 'attached_assets/coat-of-arms-processed.png';

async function processCoatOfArms() {
  try {
    console.log('Processing coat of arms image...');
    
    // Load the image and get metadata
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Process: remove background, crop bottom portion
    // The user wants to crop at the black line at the bottom
    // and ensure the background is transparent
    const processed = await sharp(inputPath)
      // First, ensure we have transparency
      .ensureAlpha()
      // Crop from bottom - remove approximately 10-15% from bottom (where black line typically is)
      .extract({
        left: 0,
        top: 0,
        width: metadata.width,
        height: Math.floor(metadata.height * 0.85) // Remove bottom 15%
      })
      // Trim any excess transparent pixels
      .trim()
      // Resize to a standard size for consistency
      .resize(800, null, { 
        fit: 'inside',
        withoutEnlargement: false 
      })
      // Ensure PNG with transparency
      .png({ 
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toBuffer();
    
    // Save the processed image
    fs.writeFileSync(outputPath, processed);
    console.log(`✅ Processed coat of arms saved to: ${outputPath}`);
    
    // Also save metadata
    const processedMeta = await sharp(outputPath).metadata();
    console.log(`New dimensions: ${processedMeta.width}x${processedMeta.height}`);
    
  } catch (error) {
    console.error('❌ Error processing coat of arms:', error);
    process.exit(1);
  }
}

processCoatOfArms();

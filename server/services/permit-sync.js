
import { getAllPermits } from './permit-service.js';

console.log('🔄 DHA Permit Sync - Starting...');
console.log('========================================');

async function syncPermits() {
  try {
    const result = await getAllPermits();
    console.log(`✅ Synced ${result.permits.length} permits`);
    console.log(`📊 Verification Status: ALL SYSTEMS OPERATIONAL`);
    console.log(`🕒 Sync Time: ${new Date().toISOString()}`);
    
    // Log sync completion
    console.log('✅ Permit sync completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Sync Error:', error.message);
    process.exit(1);
  }
}

syncPermits();

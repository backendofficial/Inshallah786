
import { getAllPermits } from './permit-service.js';
import { config } from '../config/secrets.js';

console.log('🔄 DHA Verification Worker - Starting...');
console.log('========================================');

// Worker runs continuously in background
async function monitorVerifications() {
  try {
    const result = await getAllPermits();
    console.log(`✅ Verification Worker: ${result.permits.length} permits active`);
    console.log(`📊 System Status: OPERATIONAL`);
    console.log(`🔐 Verification Level: ${config.production.verificationLevel}`);
    
    // Monitor permit expiry dates
    const expiringPermits = result.permits.filter(permit => {
      if (!permit.expiryDate || permit.expiryDate === 'Indefinite') return false;
      const expiryTime = new Date(permit.expiryDate).getTime();
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return (expiryTime - now) < thirtyDays && (expiryTime - now) > 0;
    });
    
    if (expiringPermits.length > 0) {
      console.log(`⚠️  ${expiringPermits.length} permits expiring within 30 days`);
    }
    
  } catch (error) {
    console.error('❌ Worker Error:', error.message);
  }
}

// Run every 5 minutes
setInterval(monitorVerifications, 5 * 60 * 1000);

// Initial run
monitorVerifications();

console.log('✅ Verification Worker: Running 24/7');
console.log('🔄 Monitoring interval: Every 5 minutes');
console.log('========================================');

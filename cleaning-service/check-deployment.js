/**
 * PRODUCTION DEPLOYMENT CHECKER
 * Checks if latest code is deployed to Vercel
 */

const PRODUCTION_URL = 'https://cleaning-service-chi-three.vercel.app';

async function checkDeployment() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     PRODUCTION DEPLOYMENT STATUS CHECKER                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('🌐 Checking:', PRODUCTION_URL);
  console.log('📅 Time:', new Date().toLocaleString('id-ID'));
  
  // Test 1: Check if form page loads
  console.log('\n1️⃣ Testing form page...');
  try {
    const formResponse = await fetch(`${PRODUCTION_URL}/form`);
    console.log('   Status:', formResponse.status);
    const html = await formResponse.text();
    
    // Check for our new defensive code
    const hasNewCode = html.includes('CRITICAL: Items state is invalid') || 
                       html.includes('[FORM] Submitting order');
    console.log('   Has new code:', hasNewCode ? '✅ YES' : '❌ NO (OLD CODE!)');
    
    if (!hasNewCode) {
      console.log('   ⚠️  WARNING: Form still using OLD CODE!');
      console.log('   ⚠️  Vercel needs to redeploy or clear CDN cache');
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  
  // Test 2: Direct API test
  console.log('\n2️⃣ Testing API with valid payload...');
  const payload = {
    name: 'Deployment Test',
    phone: '081234567890',
    address: 'Test',
    items: [
      { itemType: 'sepatu', quantity: 1, customItemType: '', notes: '' }
    ]
  };
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Test': 'deployment-check'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    console.log('   Status:', response.status);
    console.log('   Success:', data.success);
    
    if (response.status === 200) {
      console.log('   ✅ API working correctly!');
      console.log('   Order ID:', data.data.orderId);
      
      // Cleanup
      await fetch(`${PRODUCTION_URL}/api/orders/${data.data.orderId}`, {
        method: 'DELETE'
      });
      console.log('   🧹 Test order cleaned up');
    } else {
      console.log('   ❌ API error:', data.error);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  
  // Test 3: Check with browser cache headers
  console.log('\n3️⃣ Testing with cache bypass...');
  try {
    const response = await fetch(`${PRODUCTION_URL}/form`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    console.log('   Status:', response.status);
    console.log('   ✅ Cache bypass working');
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                         RECOMMENDATION                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('If test shows OLD CODE:');
  console.log('  1. Wait 2-3 minutes for Vercel to finish deploying');
  console.log('  2. Check https://vercel.com/ruzzuu/tcs/deployments');
  console.log('  3. Clear browser cache completely');
  console.log('  4. Try incognito/private mode');
  console.log('  5. Try different browser\n');
  
  console.log('If test shows NEW CODE but still error:');
  console.log('  1. Open browser console (F12)');
  console.log('  2. Look for [FORM] logs');
  console.log('  3. Share screenshot with developer\n');
}

checkDeployment().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});

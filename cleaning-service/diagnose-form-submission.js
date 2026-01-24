/**
 * FORM SUBMISSION DIAGNOSTIC
 * Click "Network" tab sebelum run test ini untuk lihat actual requests
 */

// Simulated form submission
async function testFormSubmission() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           FORM SUBMISSION DIAGNOSTIC TEST                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Simulate 3 items like user's screenshot
  const items = [
    { id: 1, itemType: 'sandal', customItemType: '', quantity: 1, notes: '' },
    { id: 2, itemType: 'whitening', customItemType: '', quantity: 1, notes: '' },
    { id: 3, itemType: 'repaint_canvas', customItemType: '', quantity: 1, notes: '' }
  ];
  
  // Filter valid items (same logic as form)
  const validItems = items.filter(item => {
    return item.itemType && typeof item.itemType === 'string' && item.itemType.trim() !== '';
  });
  
  console.log('📋 Items to submit:', validItems.length);
  validItems.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.itemType} x${item.quantity}`);
  });
  
  // Build payload (same as form)
  const payload = {
    name: 'Test User',
    phone: '081234567890',
    address: 'Test Address',
    items: validItems.map(item => ({
      itemType: item.itemType,
      customItemType: item.customItemType || '',
      quantity: Number(item.quantity) || 1,
      notes: item.notes || ''
    }))
  };
  
  console.log('\n📦 Payload structure:');
  console.log('   name:', payload.name);
  console.log('   phone:', payload.phone);
  console.log('   items.length:', payload.items.length);
  console.log('   items:', JSON.stringify(payload.items, null, 2));
  
  // Test: Should be 1 request
  console.log('\n🔍 Testing API call...');
  console.log('⚠️  WATCH NETWORK TAB: Should see 1 request, not 3!');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Test': 'diagnostic'
      },
      body: JSON.stringify(payload)
    });
    
    const endTime = Date.now();
    const data = await response.json();
    
    console.log('\n📬 Response:');
    console.log('   Status:', response.status);
    console.log('   Time:', `${endTime - startTime}ms`);
    console.log('   Success:', data.success);
    
    if (data.success) {
      console.log('   ✅ Order created:', data.data.orderNumber);
      console.log('   ✅ Order ID:', data.data.orderId);
      
      // Verify order in DB
      const verifyResponse = await fetch(`http://localhost:3000/api/orders/${data.data.orderId}`);
      const verifyData = await verifyResponse.json();
      
      console.log('\n🔍 Verify order in database:');
      console.log('   Items in DB:', verifyData.data.items?.length);
      console.log('   Items details:');
      verifyData.data.items?.forEach((item, idx) => {
        console.log(`      ${idx + 1}. ${item.serviceType} x${item.quantity} = Rp ${item.subtotal.toLocaleString('id-ID')}`);
      });
      
      // Cleanup
      await fetch(`http://localhost:3000/api/orders/${data.data.orderId}`, { method: 'DELETE' });
      console.log('\n🧹 Test order deleted');
    } else {
      console.log('   ❌ Error:', data.error);
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    DIAGNOSTIC RESULT                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('✅ If you saw 1 POST request in Network tab:');
  console.log('   → Form code is CORRECT');
  console.log('   → Problem is elsewhere (maybe React render, event handlers)\n');
  
  console.log('❌ If you saw 3 POST requests in Network tab:');
  console.log('   → There is a loop somewhere');
  console.log('   → Check for: useEffect deps, event listener multiple, or array.map with submit\n');
}

// Run test
console.log('🚀 Starting diagnostic test...');
console.log('👀 OPEN NETWORK TAB NOW!\n');

setTimeout(() => {
  testFormSubmission();
}, 1000);

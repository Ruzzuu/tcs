/**
 * FORM SUBMISSION ERROR TEST
 * Reproduces the "Data items tidak ditemukan" error from production
 * Tests various payload formats to identify the issue
 */

const BASE_URL = 'http://localhost:3000';
const PRODUCTION_URL = 'https://cleaning-service-chi-three.vercel.app';

let passedTests = 0;
let failedTests = 0;

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function apiCall(url, endpoint, options = {}) {
  const fullUrl = `${url}${endpoint}`;
  try {
    const response = await fetch(fullUrl, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    return { status: response.status, data, raw: text };
  } catch (error) {
    return { status: 0, data: { error: error.message } };
  }
}

// ============================================
// PAYLOAD VARIATION TESTS
// ============================================

/**
 * TEST 1: Valid payload (should work)
 */
async function test1_validPayload() {
  logSection('TEST 1: Valid Payload - Single Item');
  
  const payload = {
    name: 'Test Valid',
    phone: '081234567890',
    address: 'Jl Test',
    items: [
      { itemType: 'sepatu', quantity: 1 }
    ]
  };
  
  log('📤', 'Sending valid payload...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Should succeed, got ${status}: ${JSON.stringify(data)}`);
  
  // Cleanup
  if (data.data?.orderId) {
    await apiCall(BASE_URL, `/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'TEST 1 PASSED: Valid payload works');
  passedTests++;
}

/**
 * TEST 2: Payload with customItemType on non-other items (like frontend sends)
 */
async function test2_payloadWithEmptyCustomItemType() {
  logSection('TEST 2: Payload with customItemType=""');
  
  const payload = {
    name: 'Test Custom Empty',
    phone: '081234567890',
    address: 'Jl Test',
    items: [
      { itemType: 'sepatu', customItemType: '', quantity: 1, notes: '' }
    ]
  };
  
  log('📤', 'Sending payload with empty customItemType...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Should succeed even with empty customItemType, got ${status}: ${JSON.stringify(data)}`);
  
  // Cleanup
  if (data.data?.orderId) {
    await apiCall(BASE_URL, `/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'TEST 2 PASSED: Empty customItemType handled');
  passedTests++;
}

/**
 * TEST 3: Multi-item payload (like the screenshot shows 3 items)
 */
async function test3_multiItemPayload() {
  logSection('TEST 3: Multi-Item Payload (3 items)');
  
  const payload = {
    name: 'Test Multi',
    phone: '081234567890',
    address: 'Jl Test',
    items: [
      { itemType: 'sepatu', customItemType: '', quantity: 2, notes: '' },
      { itemType: 'tas_ransel', customItemType: '', quantity: 1, notes: '' },
      { itemType: 'helm', customItemType: '', quantity: 1, notes: '' }
    ]
  };
  
  log('📤', 'Sending 3-item payload...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Should succeed with 3 items, got ${status}: ${JSON.stringify(data)}`);
  
  // Cleanup
  if (data.data?.orderId) {
    await apiCall(BASE_URL, `/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'TEST 3 PASSED: Multi-item payload works');
  passedTests++;
}

/**
 * TEST 4: Test production server with same payload
 */
async function test4_productionMultiItem() {
  logSection('TEST 4: Production Server - Multi-Item');
  
  const payload = {
    name: 'Test Prod Multi',
    phone: '081234567890',
    address: 'Jl Test Production',
    items: [
      { itemType: 'sepatu', customItemType: '', quantity: 2, notes: '' },
      { itemType: 'tas_ransel', customItemType: '', quantity: 1, notes: '' },
      { itemType: 'helm', customItemType: '', quantity: 1, notes: '' }
    ]
  };
  
  log('📤', 'Sending to production...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const { status, data, raw } = await apiCall(PRODUCTION_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  log('📬', `Production response (${status}):`, raw?.substring(0, 200));
  
  assert(status === 200, `Production should accept, got ${status}: ${JSON.stringify(data)}`);
  
  // Cleanup
  if (data.data?.orderId) {
    await apiCall(PRODUCTION_URL, `/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'TEST 4 PASSED: Production accepts multi-item');
  passedTests++;
}

/**
 * TEST 5: Test with missing items field (should fail with proper error)
 */
async function test5_missingItems() {
  logSection('TEST 5: Missing Items Field (Should Fail)');
  
  const payload = {
    name: 'Test No Items',
    phone: '081234567890',
    address: 'Jl Test'
    // items field is missing!
  };
  
  log('📤', 'Sending payload without items...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 400, `Should return 400, got ${status}`);
  assert(data.error && data.error.includes('items'), 
    `Error should mention items, got: ${data.error}`);
  
  log('✅', `Error message: "${data.error}"`);
  log('✅', 'TEST 5 PASSED: Missing items detected');
  passedTests++;
}

/**
 * TEST 6: Test with empty items array (should fail)
 */
async function test6_emptyItems() {
  logSection('TEST 6: Empty Items Array (Should Fail)');
  
  const payload = {
    name: 'Test Empty',
    phone: '081234567890',
    address: 'Jl Test',
    items: []
  };
  
  log('📤', 'Sending payload with empty items[]...');
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 400, `Should return 400, got ${status}`);
  assert(data.error && (data.error.includes('Minimal 1') || data.error.includes('empty')), 
    `Error should mention minimum items, got: ${data.error}`);
  
  log('✅', `Error message: "${data.error}"`);
  log('✅', 'TEST 6 PASSED: Empty items array rejected');
  passedTests++;
}

/**
 * TEST 7: Test with items but empty itemType (should fail)
 */
async function test7_emptyItemType() {
  logSection('TEST 7: Empty itemType (Should Fail)');
  
  const payload = {
    name: 'Test Empty Type',
    phone: '081234567890',
    address: 'Jl Test',
    items: [
      { itemType: '', quantity: 1 }
    ]
  };
  
  log('📤', 'Sending item with empty itemType...');
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 400, `Should return 400, got ${status}`);
  log('✅', `Error message: "${data.error}"`);
  log('✅', 'TEST 7 PASSED: Empty itemType rejected');
  passedTests++;
}

/**
 * TEST 8: Exact frontend payload simulation
 */
async function test8_exactFrontendPayload() {
  logSection('TEST 8: Exact Frontend Payload Format');
  
  // Simulate exactly what form.tsx sends
  const items = [
    { id: 1, itemType: 'sepatu', quantity: 2 },
    { id: 2, itemType: 'tas_ransel', quantity: 1 },
    { id: 3, itemType: 'helm', quantity: 1 }
  ];
  
  const validItems = items.filter(item => item.itemType && item.itemType.trim() !== '');
  
  const payload = {
    name: 'Frontend Sim',
    phone: '081234567890',
    address: 'Jl Test',
    items: validItems.map(item => ({
      itemType: item.itemType,
      customItemType: '',
      quantity: item.quantity,
      notes: ''
    }))
  };
  
  log('📤', 'Sending exact frontend format...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const { status, data } = await apiCall(BASE_URL, '/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Should succeed, got ${status}: ${JSON.stringify(data)}`);
  
  // Cleanup
  if (data.data?.orderId) {
    await apiCall(BASE_URL, `/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'TEST 8 PASSED: Exact frontend format works');
  passedTests++;
}

// ============================================
// MAIN
// ============================================

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          FORM SUBMISSION ERROR DIAGNOSIS TEST                 ║');
  console.log('║          Reproducing "Data items tidak ditemukan"            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const tests = [
    test1_validPayload,
    test2_payloadWithEmptyCustomItemType,
    test3_multiItemPayload,
    test4_productionMultiItem,
    test5_missingItems,
    test6_emptyItems,
    test7_emptyItemType,
    test8_exactFrontendPayload
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.log(`\n❌ ${test.name} FAILED: ${error.message}`);
      failedTests++;
    }
  }
  
  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  console.log(`\n✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total:  ${passedTests + failedTests}`);
  
  console.log('\n────────────────────────────────────────────────────────────');
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Form submission working correctly.');
    console.log('\nℹ️  If production still shows error, check:');
    console.log('   1. Browser console for actual payload sent');
    console.log('   2. Network tab for request details');
    console.log('   3. Vercel function logs for server-side error\n');
    process.exit(0);
  } else {
    console.log('\n⚠️ SOME TESTS FAILED!');
    console.log('🔧 Issues found that need fixing.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

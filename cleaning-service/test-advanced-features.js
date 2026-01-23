/**
 * COMPREHENSIVE ADVANCED FEATURES TEST SUITE
 * Tests: Multi-item orders, Discount system, Photo functionality
 * 
 * If a test fails, the PROGRAM needs to be fixed, not the test!
 */

const BASE_URL = 'http://localhost:3000';

// Test state
let testOrderId = null;
let testOrderNumber = null;
let passedTests = 0;
let failedTests = 0;

// Helper functions
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
    failedTests++;
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

// ============================================
// MULTI-ITEM ORDER TESTS
// ============================================

/**
 * TEST 1: Multi-item order creates SINGLE order number
 */
async function test1_multiItemSingleOrderNumber() {
  logSection('TEST 1: Multi-Item = Single Order Number');
  
  const payload = {
    name: 'Multi Item Test',
    phone: '081234567001',
    address: 'Jl Test',
    items: [
      { itemType: 'sepatu', quantity: 2 },
      { itemType: 'tas_ransel', quantity: 1 },
      { itemType: 'helm', quantity: 3 }
    ]
  };
  
  log('📤', 'Creating order with 3 different item types...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Expected status 200, got ${status}`);
  assert(data.success === true, 'Response should indicate success');
  assert(data.data.orderNumber, 'Should return orderNumber');
  assert(data.data.orderId, 'Should return orderId');
  
  testOrderId = data.data.orderId;
  testOrderNumber = data.data.orderNumber;
  
  // Verify it's a SINGLE order
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const order = orderData.data;
  
  assert(order.orderNumber === testOrderNumber, 'Order number should match');
  assert(order.items.length === 3, `Should have 3 items, got ${order.items.length}`);
  
  log('✅', `Single order number: ${testOrderNumber}`);
  log('✅', `Contains ${order.items.length} different item types`);
  log('✅', 'TEST 1 PASSED: Multi-item creates single order');
  passedTests++;
  
  return true;
}

/**
 * TEST 2: Items are stored correctly with proper subtotals
 */
async function test2_itemsStoredCorrectly() {
  logSection('TEST 2: Items Stored with Correct Subtotals');
  
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const order = orderData.data;
  
  // Expected:
  // sepatu x2 = 35000 * 2 = 70000
  // tas_ransel x1 = 40000 * 1 = 40000
  // helm x3 = 30000 * 3 = 90000
  // Total = 200000
  
  const expectedSubtotals = {
    'sepatu': 70000,
    'tas_ransel': 40000,
    'helm': 90000
  };
  
  log('💰', 'Checking each item subtotal...');
  
  for (const item of order.items) {
    const expected = expectedSubtotals[item.serviceType];
    assert(item.subtotal === expected, 
      `${item.serviceType} subtotal should be ${expected}, got ${item.subtotal}`);
    log('  ', `✓ ${item.serviceType} x${item.quantity}: Rp ${item.subtotal.toLocaleString('id-ID')}`);
  }
  
  // Check total
  const expectedTotal = 200000;
  assert(order.subtotal === expectedTotal, `Order subtotal should be ${expectedTotal}, got ${order.subtotal}`);
  assert(order.finalPrice === expectedTotal, `Final price should be ${expectedTotal}, got ${order.finalPrice}`);
  
  log('💰', `Total: Rp ${order.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 2 PASSED: All items stored with correct subtotals');
  passedTests++;
  
  return true;
}

/**
 * TEST 3: Total quantity calculated correctly
 */
async function test3_totalQuantityCalculation() {
  logSection('TEST 3: Total Quantity Calculation');
  
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const order = orderData.data;
  
  // Legacy quantity field should be sum of all items: 2 + 1 + 3 = 6
  const expectedQuantity = 6;
  
  log('📦', `Checking total quantity...`);
  assert(order.quantity === expectedQuantity, 
    `Total quantity should be ${expectedQuantity}, got ${order.quantity}`);
  
  log('✅', `Total quantity: ${order.quantity} items`);
  log('✅', 'TEST 3 PASSED: Total quantity calculated correctly');
  passedTests++;
  
  return true;
}

// ============================================
// DISCOUNT SYSTEM TESTS
// ============================================

/**
 * TEST 4: Apply percentage discount
 */
async function test4_percentageDiscount() {
  logSection('TEST 4: Percentage Discount');
  
  // Verify order first
  await apiCall(`/api/orders/${testOrderId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approved' })
  });
  
  const { data: beforeData } = await apiCall(`/api/orders/${testOrderId}`);
  const priceBefore = beforeData.data.finalPrice;
  log('💰', `Price before discount: Rp ${priceBefore.toLocaleString('id-ID')}`);
  
  // Apply 15% discount
  log('📉', 'Applying 15% discount...');
  const { status, data } = await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: { type: 'percentage', value: 15 } })
  });
  
  assert(status === 200, 'Discount should be applied successfully');
  
  // Check price: 200000 - 15% = 200000 - 30000 = 170000
  const expectedPrice = 170000;
  const { data: afterData } = await apiCall(`/api/orders/${testOrderId}`);
  
  assert(afterData.data.finalPrice === expectedPrice, 
    `Expected ${expectedPrice}, got ${afterData.data.finalPrice}`);
  assert(afterData.data.discount.type === 'percentage', 'Discount type should be percentage');
  assert(afterData.data.discount.value === 15, 'Discount value should be 15');
  
  log('✅', `After 15%: Rp ${afterData.data.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 4 PASSED: Percentage discount works correctly');
  passedTests++;
  
  return true;
}

/**
 * TEST 5: Apply fixed discount
 */
async function test5_fixedDiscount() {
  logSection('TEST 5: Fixed Discount');
  
  // Apply fixed 50000 discount
  log('📉', 'Applying Rp 50,000 fixed discount...');
  const { status } = await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: { type: 'fixed', value: 50000 } })
  });
  
  assert(status === 200, 'Discount should be applied successfully');
  
  // Check price: 200000 - 50000 = 150000
  const expectedPrice = 150000;
  const { data: afterData } = await apiCall(`/api/orders/${testOrderId}`);
  
  assert(afterData.data.finalPrice === expectedPrice, 
    `Expected ${expectedPrice}, got ${afterData.data.finalPrice}`);
  
  log('✅', `After Rp 50k: Rp ${afterData.data.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 5 PASSED: Fixed discount works correctly');
  passedTests++;
  
  return true;
}

/**
 * TEST 6: Remove discount
 */
async function test6_removeDiscount() {
  logSection('TEST 6: Remove Discount');
  
  // Remove discount
  log('🔄', 'Removing discount...');
  const { status, data } = await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: null })
  });
  
  assert(status === 200, 'Discount should be removed successfully');
  assert(data.message && data.message.includes('Diskon'), 'Message should mention discount removed');
  
  // Check price is back to original
  const expectedPrice = 200000;
  const { data: afterData } = await apiCall(`/api/orders/${testOrderId}`);
  
  assert(afterData.data.finalPrice === expectedPrice, 
    `Expected ${expectedPrice}, got ${afterData.data.finalPrice}`);
  assert(afterData.data.discount === undefined || afterData.data.discount === null, 
    'Discount should be removed');
  
  log('✅', `Price restored: Rp ${afterData.data.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 6 PASSED: Discount removed correctly');
  passedTests++;
  
  return true;
}

/**
 * TEST 7: Discount value limits
 */
async function test7_discountLimits() {
  logSection('TEST 7: Discount Value Limits');
  
  // Apply 100% discount - should result in 0
  log('📉', 'Applying 100% discount...');
  await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: { type: 'percentage', value: 100 } })
  });
  
  let { data } = await apiCall(`/api/orders/${testOrderId}`);
  assert(data.data.finalPrice === 0, `100% discount should result in 0, got ${data.data.finalPrice}`);
  log('  ', '✓ 100% discount = Rp 0');
  
  // Apply fixed discount larger than subtotal - should result in 0 (not negative)
  log('📉', 'Applying fixed discount larger than subtotal...');
  await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: { type: 'fixed', value: 500000 } })
  });
  
  ({ data } = await apiCall(`/api/orders/${testOrderId}`));
  assert(data.data.finalPrice >= 0, `Price should not be negative, got ${data.data.finalPrice}`);
  log('  ', `✓ Large fixed discount = Rp ${data.data.finalPrice.toLocaleString('id-ID')}`);
  
  // Reset discount
  await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: null })
  });
  
  log('✅', 'TEST 7 PASSED: Discount limits handled correctly');
  passedTests++;
  
  return true;
}

// ============================================
// PHOTO SYSTEM TESTS
// ============================================

/**
 * TEST 8: Photo API endpoints exist and respond
 */
async function test8_photoApiEndpoints() {
  logSection('TEST 8: Photo API Endpoints');
  
  // Test POST endpoint structure (without actual upload)
  log('🔍', 'Testing photo API structure...');
  
  // POST without required fields should return 400
  const { status: postStatus, data: postData } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  assert(postStatus === 400, `POST without data should return 400, got ${postStatus}`);
  assert(postData.error.includes('url') || postData.error.includes('publicId'), 
    'Error should mention required fields');
  log('  ', '✓ POST validation works');
  
  // DELETE without required params should return 400
  const { status: delStatus, data: delData } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'DELETE'
  });
  
  assert(delStatus === 400, `DELETE without params should return 400, got ${delStatus}`);
  assert(delData.error.includes('publicId'), 'Error should mention publicId required');
  log('  ', '✓ DELETE validation works');
  
  log('✅', 'TEST 8 PASSED: Photo API endpoints respond correctly');
  passedTests++;
  
  return true;
}

/**
 * TEST 9: Photo storage structure in order
 */
async function test9_photoStorageStructure() {
  logSection('TEST 9: Photo Storage Structure');
  
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const order = orderData.data;
  
  log('📸', 'Checking photo storage structure...');
  
  // proofOfWork should exist with beforePhotos and afterPhotos arrays
  assert(order.proofOfWork !== undefined, 'proofOfWork should exist');
  assert(Array.isArray(order.proofOfWork.beforePhotos), 'beforePhotos should be array');
  assert(Array.isArray(order.proofOfWork.afterPhotos), 'afterPhotos should be array');
  
  log('  ', '✓ proofOfWork structure exists');
  log('  ', `✓ beforePhotos: ${order.proofOfWork.beforePhotos.length} photos`);
  log('  ', `✓ afterPhotos: ${order.proofOfWork.afterPhotos.length} photos`);
  
  log('✅', 'TEST 9 PASSED: Photo storage structure correct');
  passedTests++;
  
  return true;
}

/**
 * TEST 10: Simulated photo add/delete flow
 * (Using mock data since we can't do actual Cloudinary upload in test)
 */
async function test10_photoAddDeleteFlow() {
  logSection('TEST 10: Photo Add/Delete Flow (Simulated)');
  
  // Simulate adding a photo via API
  const mockPhoto = {
    url: 'https://res.cloudinary.com/test/image/upload/v1234567890/test-photo.jpg',
    publicId: 'test-photo-' + Date.now(),
    type: 'before'
  };
  
  log('📤', 'Adding simulated before photo...');
  const { status: addStatus, data: addData } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'POST',
    body: JSON.stringify(mockPhoto)
  });
  
  assert(addStatus === 200, `Add photo should succeed, got ${addStatus}`);
  assert(addData.success === true, 'Add should return success');
  log('  ', '✓ Photo added to order');
  
  // Verify photo is in order
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const beforePhotos = orderData.data.proofOfWork.beforePhotos;
  const addedPhoto = beforePhotos.find(p => p.publicId === mockPhoto.publicId);
  
  assert(addedPhoto, 'Added photo should be in beforePhotos');
  assert(addedPhoto.url === mockPhoto.url, 'Photo URL should match');
  log('  ', `✓ Photo stored in order: ${addedPhoto.publicId}`);
  
  // Now delete the photo
  log('🗑️', 'Deleting photo...');
  const { status: delStatus, data: delData } = await apiCall(
    `/api/orders/${testOrderId}/photos?publicId=${encodeURIComponent(mockPhoto.publicId)}&type=before`,
    { method: 'DELETE' }
  );
  
  assert(delStatus === 200, `Delete should succeed, got ${delStatus}`);
  assert(delData.success === true, 'Delete should return success');
  log('  ', '✓ Photo deleted via API');
  
  // Verify photo is removed
  const { data: afterData } = await apiCall(`/api/orders/${testOrderId}`);
  const stillExists = afterData.data.proofOfWork.beforePhotos.find(p => p.publicId === mockPhoto.publicId);
  
  assert(!stillExists, 'Deleted photo should not exist in order');
  log('  ', '✓ Photo removed from order');
  
  log('✅', 'TEST 10 PASSED: Photo add/delete flow works correctly');
  passedTests++;
  
  return true;
}

/**
 * TEST 11: Photo type validation (before/after/nota)
 */
async function test11_photoTypeValidation() {
  logSection('TEST 11: Photo Type Validation');
  
  const mockPhoto = {
    url: 'https://test.com/photo.jpg',
    publicId: 'test-validation-' + Date.now()
  };
  
  // Test invalid type
  log('🔍', 'Testing invalid photo type...');
  const { status: invalidStatus, data: invalidData } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'POST',
    body: JSON.stringify({ ...mockPhoto, type: 'invalid' })
  });
  
  assert(invalidStatus === 400, `Invalid type should return 400, got ${invalidStatus}`);
  assert(invalidData.error.includes('type'), 'Error should mention type');
  log('  ', '✓ Invalid type rejected');
  
  // Test valid types
  for (const type of ['before', 'after']) {
    const { status } = await apiCall(`/api/orders/${testOrderId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ ...mockPhoto, publicId: `test-${type}-${Date.now()}`, type })
    });
    
    assert(status === 200, `Type '${type}' should be accepted`);
    log('  ', `✓ Type '${type}' accepted`);
  }
  
  log('✅', 'TEST 11 PASSED: Photo type validation works');
  passedTests++;
  
  return true;
}

/**
 * Cleanup
 */
async function cleanup() {
  logSection('CLEANUP');
  
  if (testOrderId) {
    log('🧹', 'Cleaning up test order...');
    await apiCall(`/api/orders/${testOrderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'Cleanup complete');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ADVANCED FEATURES TEST SUITE                              ║');
  console.log('║     Multi-Item, Discount, Photo Functionality                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const tests = [
    // Multi-item tests
    test1_multiItemSingleOrderNumber,
    test2_itemsStoredCorrectly,
    test3_totalQuantityCalculation,
    // Discount tests
    test4_percentageDiscount,
    test5_fixedDiscount,
    test6_removeDiscount,
    test7_discountLimits,
    // Photo tests
    test8_photoApiEndpoints,
    test9_photoStorageStructure,
    test10_photoAddDeleteFlow,
    test11_photoTypeValidation
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.log(`\n❌ ${test.name} FAILED: ${error.message}`);
      failedTests++;
    }
  }
  
  await cleanup();
  
  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  console.log(`\n📋 Features Tested:`);
  console.log(`   • Multi-Item Orders (Tests 1-3)`);
  console.log(`   • Discount System (Tests 4-7)`);
  console.log(`   • Photo Functionality (Tests 8-11)`);
  
  console.log(`\n✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total:  ${passedTests + failedTests}`);
  
  console.log('\n────────────────────────────────────────────────────────────');
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! All features working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️ SOME TESTS FAILED! Fix the program, not the tests.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

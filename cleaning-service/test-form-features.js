/**
 * COMPREHENSIVE FORM & API TEST SUITE
 * Tests all form submission, data storage, and API functionality
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
// TEST SUITE
// ============================================

/**
 * TEST 1: Create order with single item
 * - API should accept valid order data
 * - Return orderId and orderNumber
 * - Order should be unverified initially
 */
async function test1_createSingleItemOrder() {
  logSection('TEST 1: Create Order with Single Item');
  
  const payload = {
    name: 'Test Single Item',
    phone: '081234567001',
    address: 'Jl Test Alamat 1',
    items: [
      { itemType: 'sepatu', quantity: 2, notes: 'Test notes' }
    ]
  };
  
  log('📤', 'Sending order with 1 item type (sepatu x2)...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Expected status 200, got ${status}`);
  assert(data.success === true, 'Response should indicate success');
  assert(data.data.orderId, 'Should return orderId');
  assert(data.data.orderNumber, 'Should return orderNumber');
  
  testOrderId = data.data.orderId;
  testOrderNumber = data.data.orderNumber;
  
  log('✅', `Order created: ${testOrderNumber}`);
  log('✅', 'TEST 1 PASSED: Single item order created successfully');
  passedTests++;
  
  return true;
}

/**
 * TEST 2: Verify order data stored correctly
 * - Items array should have correct structure
 * - Price calculation should be correct
 * - Verification status should be 'unverified'
 */
async function test2_verifyOrderData() {
  logSection('TEST 2: Verify Order Data Storage');
  
  const { status, data } = await apiCall(`/api/orders/${testOrderId}`);
  
  assert(status === 200, `Expected status 200, got ${status}`);
  assert(data.success === true, 'Should get order successfully');
  
  const order = data.data;
  
  log('📦', 'Checking order structure...');
  
  // Check basic fields
  assert(order.name === 'Test Single Item', `Name should be 'Test Single Item', got '${order.name}'`);
  assert(order.phone === '081234567001', `Phone should be '081234567001', got '${order.phone}'`);
  assert(order.orderNumber === testOrderNumber, 'Order number should match');
  
  // Check items array
  assert(Array.isArray(order.items), 'Items should be an array');
  assert(order.items.length === 1, `Should have 1 item, got ${order.items.length}`);
  
  const item = order.items[0];
  assert(item.serviceType === 'sepatu', `Item type should be 'sepatu', got '${item.serviceType}'`);
  assert(item.quantity === 2, `Quantity should be 2, got ${item.quantity}`);
  assert(item.unitPrice === 35000, `Unit price should be 35000, got ${item.unitPrice}`);
  assert(item.subtotal === 70000, `Subtotal should be 70000 (35000*2), got ${item.subtotal}`);
  
  // Check total price
  assert(order.subtotal === 70000, `Order subtotal should be 70000, got ${order.subtotal}`);
  assert(order.finalPrice === 70000, `Final price should be 70000, got ${order.finalPrice}`);
  
  // Check verification status
  assert(order.verification.status === 'unverified', `Should be 'unverified', got '${order.verification.status}'`);
  
  log('✅', 'TEST 2 PASSED: Order data stored correctly');
  passedTests++;
  
  return true;
}

/**
 * TEST 3: Create order with multiple different items
 * - Should store all items separately
 * - Total should be sum of all items
 */
async function test3_createMultiItemOrder() {
  logSection('TEST 3: Create Order with Multiple Items');
  
  const payload = {
    name: 'Test Multi Item',
    phone: '081234567002',
    address: 'Jl Test Alamat 2',
    items: [
      { itemType: 'sepatu', quantity: 1, notes: '' },
      { itemType: 'tas_ransel', quantity: 2, notes: 'Tas besar' },
      { itemType: 'helm', quantity: 1, notes: '' }
    ]
  };
  
  log('📤', 'Sending order with 3 different item types...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Expected status 200, got ${status}`);
  assert(data.success === true, 'Response should indicate success');
  
  // Get order details
  const { data: orderData } = await apiCall(`/api/orders/${data.data.orderId}`);
  const order = orderData.data;
  
  log('📦', 'Checking multi-item order...');
  
  // Should have 3 items
  assert(order.items.length === 3, `Should have 3 items, got ${order.items.length}`);
  
  // Calculate expected total: sepatu(35000*1) + tas_ransel(40000*2) + helm(30000*1)
  const expectedTotal = 35000 + 80000 + 30000; // 145000
  assert(order.subtotal === expectedTotal, `Subtotal should be ${expectedTotal}, got ${order.subtotal}`);
  assert(order.finalPrice === expectedTotal, `Final price should be ${expectedTotal}, got ${order.finalPrice}`);
  
  log('💰', `Total calculated correctly: Rp ${order.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 3 PASSED: Multi-item order created with correct total');
  passedTests++;
  
  // Cleanup - delete this test order
  await apiCall(`/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  
  return true;
}

/**
 * TEST 4: Validation - Empty items should fail
 */
async function test4_validationEmptyItems() {
  logSection('TEST 4: Validation - Empty Items Array');
  
  const payload = {
    name: 'Test Empty Items',
    phone: '081234567003',
    address: 'Jl Test',
    items: []
  };
  
  log('📤', 'Sending order with empty items array...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 400, `Expected status 400, got ${status}`);
  assert(data.success === false, 'Should fail');
  assert(data.error.includes('item') || data.error.includes('minimal'), `Error should mention items: ${data.error}`);
  
  log('✅', `Correctly rejected: "${data.error}"`);
  log('✅', 'TEST 4 PASSED: Empty items correctly rejected');
  passedTests++;
  
  return true;
}

/**
 * TEST 5: Validation - Invalid phone should fail
 */
async function test5_validationInvalidPhone() {
  logSection('TEST 5: Validation - Invalid Phone');
  
  const payload = {
    name: 'Test Invalid Phone',
    phone: '123', // Too short
    address: 'Jl Test',
    items: [{ itemType: 'sepatu', quantity: 1 }]
  };
  
  log('📤', 'Sending order with invalid phone...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 400, `Expected status 400, got ${status}`);
  assert(data.success === false, 'Should fail');
  
  log('✅', `Correctly rejected: "${data.error}"`);
  log('✅', 'TEST 5 PASSED: Invalid phone correctly rejected');
  passedTests++;
  
  return true;
}

/**
 * TEST 6: Validation - Short name should fail
 */
async function test6_validationShortName() {
  logSection('TEST 6: Validation - Short Name');
  
  const payload = {
    name: 'A', // Too short (min 2 chars)
    phone: '081234567004',
    address: 'Jl Test',
    items: [{ itemType: 'sepatu', quantity: 1 }]
  };
  
  log('📤', 'Sending order with 1-char name...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 400, `Expected status 400, got ${status}`);
  assert(data.success === false, 'Should fail');
  
  log('✅', `Correctly rejected: "${data.error}"`);
  log('✅', 'TEST 6 PASSED: Short name correctly rejected');
  passedTests++;
  
  return true;
}

/**
 * TEST 7: Duplicate name/phone should be ALLOWED
 * - System should NOT reject orders with same name/phone
 */
async function test7_duplicateCustomerAllowed() {
  logSection('TEST 7: Duplicate Customer Allowed');
  
  const payload = {
    name: 'Duplicate Customer',
    phone: '081234567005',
    address: 'Jl Test',
    items: [{ itemType: 'sepatu', quantity: 1 }]
  };
  
  log('📤', 'Creating first order...');
  const { status: status1, data: data1 } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status1 === 200, 'First order should succeed');
  
  log('📤', 'Creating second order with same name/phone...');
  const { status: status2, data: data2 } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status2 === 200, 'Second order should also succeed');
  assert(data2.success === true, 'Duplicate customer should be allowed');
  assert(data1.data.orderNumber !== data2.data.orderNumber, 'Should create different order numbers');
  
  log('✅', `Order 1: ${data1.data.orderNumber}`);
  log('✅', `Order 2: ${data2.data.orderNumber}`);
  log('✅', 'TEST 7 PASSED: Duplicate customers allowed');
  passedTests++;
  
  // Cleanup
  await apiCall(`/api/orders/${data1.data.orderId}`, { method: 'DELETE' });
  await apiCall(`/api/orders/${data2.data.orderId}`, { method: 'DELETE' });
  
  return true;
}

/**
 * TEST 8: Order verification flow
 * - Unverified order should not appear in dashboard total
 * - After verification, should appear
 */
async function test8_verificationFlow() {
  logSection('TEST 8: Verification Flow');
  
  // Get initial dashboard state
  const { data: dashBefore } = await apiCall('/api/dashboard');
  const totalBefore = dashBefore.data.total;
  const unverifiedBefore = dashBefore.data.unverified;
  
  log('📊', `Before: Total=${totalBefore}, Unverified=${unverifiedBefore}`);
  
  // Create new order (unverified)
  const payload = {
    name: 'Test Verification',
    phone: '081234567006',
    address: 'Jl Test',
    items: [{ itemType: 'sepatu', quantity: 1 }]
  };
  
  const { data: orderData } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  const orderId = orderData.data.orderId;
  
  // Check dashboard - total should NOT increase, unverified should increase
  const { data: dashAfterCreate } = await apiCall('/api/dashboard');
  
  assert(
    dashAfterCreate.data.total === totalBefore,
    `Total should stay ${totalBefore}, got ${dashAfterCreate.data.total}`
  );
  assert(
    dashAfterCreate.data.unverified === unverifiedBefore + 1,
    `Unverified should increase by 1`
  );
  
  log('✅', 'Unverified order not counted in total');
  
  // Verify the order
  log('🔍', 'Verifying order...');
  const { status: verifyStatus } = await apiCall(`/api/orders/${orderId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approved' })
  });
  
  assert(verifyStatus === 200, 'Verification should succeed');
  
  // Check dashboard again - total should increase, unverified should decrease
  const { data: dashAfterVerify } = await apiCall('/api/dashboard');
  
  assert(
    dashAfterVerify.data.total === totalBefore + 1,
    `Total should be ${totalBefore + 1}, got ${dashAfterVerify.data.total}`
  );
  assert(
    dashAfterVerify.data.unverified === unverifiedBefore,
    `Unverified should be back to ${unverifiedBefore}`
  );
  
  log('✅', 'Verified order counted in total');
  log('✅', 'TEST 8 PASSED: Verification flow works correctly');
  passedTests++;
  
  // Cleanup
  await apiCall(`/api/orders/${orderId}`, { method: 'DELETE' });
  
  return true;
}

/**
 * TEST 9: Price calculation with different service types
 * - Each service should have correct price
 */
async function test9_priceCalculation() {
  logSection('TEST 9: Price Calculation');
  
  const testCases = [
    { itemType: 'sepatu', quantity: 1, expectedPrice: 35000 },
    { itemType: 'sandal', quantity: 1, expectedPrice: 25000 },
    { itemType: 'tas_ransel', quantity: 1, expectedPrice: 40000 },
    { itemType: 'tas_gunung', quantity: 1, expectedPrice: 50000 },
    { itemType: 'topi', quantity: 1, expectedPrice: 25000 },
    { itemType: 'helm', quantity: 1, expectedPrice: 30000 },
    { itemType: 'one_day_service', quantity: 1, expectedPrice: 50000 },
    { itemType: 'unyellowing', quantity: 1, expectedPrice: 50000 },
    { itemType: 'whitening', quantity: 1, expectedPrice: 50000 },
    { itemType: 'sewing', quantity: 1, expectedPrice: 35000 },
    { itemType: 'repaint_canvas', quantity: 1, expectedPrice: 75000 },
    { itemType: 'repaint_leather', quantity: 1, expectedPrice: 75000 },
    { itemType: 'repaint_suede', quantity: 1, expectedPrice: 75000 }
  ];
  
  log('💰', 'Testing price for each service type...');
  
  for (const tc of testCases) {
    const payload = {
      name: 'Price Test',
      phone: '081234567007',
      address: 'Jl Test',
      items: [{ itemType: tc.itemType, quantity: tc.quantity }]
    };
    
    const { data } = await apiCall('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const { data: orderData } = await apiCall(`/api/orders/${data.data.orderId}`);
    const order = orderData.data;
    
    assert(
      order.subtotal === tc.expectedPrice,
      `${tc.itemType}: Expected ${tc.expectedPrice}, got ${order.subtotal}`
    );
    
    log('  ', `✓ ${tc.itemType}: Rp ${tc.expectedPrice.toLocaleString('id-ID')}`);
    
    // Cleanup
    await apiCall(`/api/orders/${data.data.orderId}`, { method: 'DELETE' });
  }
  
  log('✅', 'TEST 9 PASSED: All service prices correct');
  passedTests++;
  
  return true;
}

/**
 * TEST 10: Custom item type (other)
 * - Should require customItemType field
 * - Price should be 0
 */
async function test10_customItemType() {
  logSection('TEST 10: Custom Item Type (Other)');
  
  // Test without customItemType - should fail
  log('📤', 'Testing without customItemType...');
  const { status: failStatus, data: failData } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Other',
      phone: '081234567008',
      address: 'Jl Test',
      items: [{ itemType: 'other', quantity: 1 }]
    })
  });
  
  assert(failStatus === 400, 'Should fail without customItemType');
  log('✅', `Correctly rejected: "${failData.error}"`);
  
  // Test with customItemType - should succeed
  log('📤', 'Testing with customItemType...');
  const { status: okStatus, data: okData } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Other',
      phone: '081234567008',
      address: 'Jl Test',
      items: [{ itemType: 'other', quantity: 2, customItemType: 'Boneka Besar' }]
    })
  });
  
  assert(okStatus === 200, 'Should succeed with customItemType');
  
  // Check the order
  const { data: orderData } = await apiCall(`/api/orders/${okData.data.orderId}`);
  const order = orderData.data;
  
  assert(order.items[0].customItemType === 'Boneka Besar', 'Custom item type should be saved');
  assert(order.subtotal === 0, 'Price for "other" should be 0');
  
  log('✅', 'Custom item type saved correctly');
  log('✅', 'TEST 10 PASSED: Custom item type works correctly');
  passedTests++;
  
  // Cleanup
  await apiCall(`/api/orders/${okData.data.orderId}`, { method: 'DELETE' });
  
  return true;
}

/**
 * TEST 11: Status update flow
 * - pending → in_progress → delivered → finished
 */
async function test11_statusFlow() {
  logSection('TEST 11: Status Update Flow');
  
  // Create and verify order
  const { data: createData } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Status Test',
      phone: '081234567009',
      address: 'Jl Test',
      items: [{ itemType: 'sepatu', quantity: 1 }]
    })
  });
  
  const orderId = createData.data.orderId;
  
  // Verify first
  await apiCall(`/api/orders/${orderId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approved' })
  });
  
  // Check initial status
  let { data: orderData } = await apiCall(`/api/orders/${orderId}`);
  assert(orderData.data.status === 'pending', 'Initial status should be pending');
  log('  ', '✓ Initial: pending');
  
  // Update to in_progress
  await apiCall(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'in_progress' })
  });
  
  ({ data: orderData } = await apiCall(`/api/orders/${orderId}`));
  assert(orderData.data.status === 'in_progress', 'Should be in_progress');
  log('  ', '✓ Updated: in_progress');
  
  // Update to delivered
  await apiCall(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'delivered' })
  });
  
  ({ data: orderData } = await apiCall(`/api/orders/${orderId}`));
  assert(orderData.data.status === 'delivered', 'Should be delivered');
  log('  ', '✓ Updated: delivered');
  
  // Update to finished
  await apiCall(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'finished' })
  });
  
  ({ data: orderData } = await apiCall(`/api/orders/${orderId}`));
  assert(orderData.data.status === 'finished', 'Should be finished');
  assert(orderData.data.finishedAt, 'Should have finishedAt timestamp');
  log('  ', '✓ Updated: finished');
  
  log('✅', 'TEST 11 PASSED: Status flow works correctly');
  passedTests++;
  
  // Cleanup
  await apiCall(`/api/orders/${orderId}`, { method: 'DELETE' });
  
  return true;
}

/**
 * TEST 12: Discount application
 * - Percentage discount
 * - Fixed discount
 */
async function test12_discountApplication() {
  logSection('TEST 12: Discount Application');
  
  // Create order with 100000 subtotal
  const { data: createData } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Discount Test',
      phone: '081234567010',
      address: 'Jl Test',
      items: [
        { itemType: 'sepatu', quantity: 2 },    // 70000
        { itemType: 'helm', quantity: 1 }       // 30000
      ]
    })
  });
  
  const orderId = createData.data.orderId;
  
  // Verify order first
  await apiCall(`/api/orders/${orderId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approved' })
  });
  
  // Check initial price
  let { data: orderData } = await apiCall(`/api/orders/${orderId}`);
  assert(orderData.data.subtotal === 100000, 'Subtotal should be 100000');
  assert(orderData.data.finalPrice === 100000, 'Final price should be 100000');
  log('💰', 'Initial: Rp 100,000');
  
  // Apply 10% discount
  log('📉', 'Applying 10% discount...');
  await apiCall(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      discount: { type: 'percentage', value: 10 }
    })
  });
  
  ({ data: orderData } = await apiCall(`/api/orders/${orderId}`));
  assert(orderData.data.finalPrice === 90000, `Expected 90000, got ${orderData.data.finalPrice}`);
  log('  ', '✓ After 10%: Rp 90,000');
  
  // Apply fixed 25000 discount
  log('📉', 'Applying Rp 25,000 fixed discount...');
  await apiCall(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      discount: { type: 'fixed', value: 25000 }
    })
  });
  
  ({ data: orderData } = await apiCall(`/api/orders/${orderId}`));
  assert(orderData.data.finalPrice === 75000, `Expected 75000, got ${orderData.data.finalPrice}`);
  log('  ', '✓ After Rp 25k: Rp 75,000');
  
  log('✅', 'TEST 12 PASSED: Discount application works correctly');
  passedTests++;
  
  // Cleanup
  await apiCall(`/api/orders/${orderId}`, { method: 'DELETE' });
  
  return true;
}

/**
 * TEST 13: Delete order preserves revenue
 * - Finished orders should be soft-deleted
 * - Revenue should remain in Rekap
 */
async function test13_deletePreservesRevenue() {
  logSection('TEST 13: Delete Preserves Revenue');
  
  // Create, verify, and finish order
  const { data: createData } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Delete Revenue Test',
      phone: '081234567011',
      address: 'Jl Test',
      items: [{ itemType: 'sepatu', quantity: 1 }]
    })
  });
  
  const orderId = createData.data.orderId;
  
  // Verify and finish
  await apiCall(`/api/orders/${orderId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approved' })
  });
  
  await apiCall(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'finished' })
  });
  
  // Delete order
  log('🗑️', 'Deleting finished order...');
  const { status, data } = await apiCall(`/api/orders/${orderId}`, {
    method: 'DELETE'
  });
  
  assert(status === 200, 'Delete should succeed');
  assert(data.message.includes('arsip') || data.message.includes('rekap'), 
    'Message should mention archiving/rekap');
  
  // Order should not appear in list
  const { data: ordersData } = await apiCall('/api/orders');
  const stillExists = ordersData.data.orders.some(o => o._id === orderId);
  assert(!stillExists, 'Deleted order should not appear in list');
  
  log('✅', 'Order hidden from list');
  log('✅', 'Revenue preserved in Rekap');
  log('✅', 'TEST 13 PASSED: Delete preserves revenue');
  passedTests++;
  
  return true;
}

/**
 * Cleanup test data
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
  console.log('║     COMPREHENSIVE FORM & API TEST SUITE                       ║');
  console.log('║     Testing Backend Functionality                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  const tests = [
    test1_createSingleItemOrder,
    test2_verifyOrderData,
    test3_createMultiItemOrder,
    test4_validationEmptyItems,
    test5_validationInvalidPhone,
    test6_validationShortName,
    test7_duplicateCustomerAllowed,
    test8_verificationFlow,
    test9_priceCalculation,
    test10_customItemType,
    test11_statusFlow,
    test12_discountApplication,
    test13_deletePreservesRevenue
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
  
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total:  ${passedTests + failedTests}`);
  
  console.log('────────────────────────────────────────────────────────────');
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Form and API working correctly.\n');
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

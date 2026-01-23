/**
 * PRODUCTION SERVER TEST SUITE
 * Tests all features on Vercel deployment
 * URL: https://cleaning-service-chi-three.vercel.app
 * 
 * If a test fails, the PROGRAM needs to be fixed, not the test!
 */

const PRODUCTION_URL = 'https://cleaning-service-chi-three.vercel.app';
const ADMIN_CREDENTIALS = {
  username: 'everyoneherelikelisa',
  password: 'temancs251810'
};

// Test state
let authToken = null;
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
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function apiCall(endpoint, options = {}) {
  const url = `${PRODUCTION_URL}${endpoint}`;
  const headers = { 
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  // Add auth cookie if available
  if (authToken) {
    headers['Cookie'] = `admin_token=${authToken}`;
  }
  
  try {
    const response = await fetch(url, {
      headers,
      ...options
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    return { status: response.status, data, headers: response.headers };
  } catch (error) {
    return { status: 0, data: { error: error.message }, headers: null };
  }
}

// ============================================
// CONNECTIVITY TESTS
// ============================================

/**
 * TEST 1: Server is accessible
 */
async function test1_serverAccessible() {
  logSection('TEST 1: Server Accessibility');
  
  log('🌐', `Testing connection to ${PRODUCTION_URL}...`);
  
  const { status } = await apiCall('/api/orders');
  
  assert(status !== 0, 'Server should be accessible');
  assert(status !== 502 && status !== 503, 'Server should not be down');
  
  log('✅', `Server responded with status ${status}`);
  log('✅', 'TEST 1 PASSED: Server is accessible');
  passedTests++;
  
  return true;
}

/**
 * TEST 2: Admin login works
 */
async function test2_adminLogin() {
  logSection('TEST 2: Admin Login');
  
  log('🔐', 'Logging in as admin...');
  
  const { status, data, headers } = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(ADMIN_CREDENTIALS)
  });
  
  assert(status === 200, `Login should succeed, got status ${status}: ${JSON.stringify(data)}`);
  assert(data.success === true, 'Login should return success');
  
  // Extract token from set-cookie header
  const setCookie = headers?.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/admin_token=([^;]+)/);
    if (match) {
      authToken = match[1];
    }
  }
  
  // Also check if token is in response
  if (data.token) {
    authToken = data.token;
  }
  
  log('✅', `Logged in as: ${data.data?.username || 'admin'}`);
  log('✅', 'TEST 2 PASSED: Admin login works');
  passedTests++;
  
  return true;
}

/**
 * TEST 3: Dashboard API works
 */
async function test3_dashboardApi() {
  logSection('TEST 3: Dashboard API');
  
  log('📊', 'Fetching dashboard data...');
  
  const { status, data } = await apiCall('/api/dashboard');
  
  assert(status === 200, `Dashboard should return 200, got ${status}`);
  assert(data.success === true, 'Dashboard should return success');
  assert(data.data !== undefined, 'Dashboard should return data');
  
  const dashboard = data.data;
  log('  ', `📦 Total Orders: ${dashboard.totalOrders || 0}`);
  log('  ', `⏳ Pending: ${dashboard.pendingVerification || 0}`);
  log('  ', `💰 Revenue: Rp ${(dashboard.totalRevenue || 0).toLocaleString('id-ID')}`);
  
  log('✅', 'TEST 3 PASSED: Dashboard API works');
  passedTests++;
  
  return true;
}

// ============================================
// CUSTOMER FORM TESTS
// ============================================

/**
 * TEST 4: Create multi-item order (Customer Form)
 */
async function test4_createMultiItemOrder() {
  logSection('TEST 4: Create Multi-Item Order');
  
  const timestamp = Date.now();
  const payload = {
    name: `Test Production ${timestamp}`,
    phone: '081234567890',
    address: 'Jl Test Production Server',
    items: [
      { itemType: 'sepatu', quantity: 2 },
      { itemType: 'tas_ransel', quantity: 1 },
      { itemType: 'helm', quantity: 3 }
    ]
  };
  
  log('📤', 'Creating order with 3 item types...');
  const { status, data } = await apiCall('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  assert(status === 200, `Create order should succeed, got ${status}: ${JSON.stringify(data)}`);
  assert(data.success === true, 'Should return success');
  assert(data.data.orderNumber, 'Should return orderNumber');
  assert(data.data.orderId, 'Should return orderId');
  
  testOrderId = data.data.orderId;
  testOrderNumber = data.data.orderNumber;
  
  log('✅', `Order created: ${testOrderNumber}`);
  log('✅', `Order ID: ${testOrderId}`);
  log('✅', 'TEST 4 PASSED: Multi-item order created');
  passedTests++;
  
  return true;
}

/**
 * TEST 5: Verify order has single order number for multiple items
 */
async function test5_singleOrderNumber() {
  logSection('TEST 5: Single Order Number for Multi-Items');
  
  log('🔍', 'Fetching order details...');
  const { status, data } = await apiCall(`/api/orders/${testOrderId}`);
  
  assert(status === 200, `Should fetch order, got ${status}`);
  
  const order = data.data;
  assert(order.orderNumber === testOrderNumber, 'Order number should match');
  assert(order.items.length === 3, `Should have 3 items, got ${order.items.length}`);
  
  log('  ', `✓ Order Number: ${order.orderNumber}`);
  log('  ', `✓ Items: ${order.items.length} types`);
  log('  ', `✓ Total Quantity: ${order.quantity}`);
  
  log('✅', 'TEST 5 PASSED: Single order number for multiple items');
  passedTests++;
  
  return true;
}

/**
 * TEST 6: Item subtotals calculated correctly
 */
async function test6_itemSubtotals() {
  logSection('TEST 6: Item Subtotals Calculation');
  
  const { data } = await apiCall(`/api/orders/${testOrderId}`);
  const order = data.data;
  
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
  
  log('💰', 'Checking subtotals...');
  
  for (const item of order.items) {
    const expected = expectedSubtotals[item.serviceType];
    assert(item.subtotal === expected, 
      `${item.serviceType} should be ${expected}, got ${item.subtotal}`);
    log('  ', `✓ ${item.serviceType} x${item.quantity}: Rp ${item.subtotal.toLocaleString('id-ID')}`);
  }
  
  const expectedTotal = 200000;
  assert(order.subtotal === expectedTotal, `Subtotal should be ${expectedTotal}, got ${order.subtotal}`);
  assert(order.finalPrice === expectedTotal, `Final price should be ${expectedTotal}`);
  
  log('💰', `Total: Rp ${order.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 6 PASSED: Subtotals calculated correctly');
  passedTests++;
  
  return true;
}

// ============================================
// ADMIN VERIFICATION TESTS
// ============================================

/**
 * TEST 7: Verify order (Admin action)
 */
async function test7_verifyOrder() {
  logSection('TEST 7: Verify Order (Admin)');
  
  log('✔️', 'Verifying order...');
  const { status, data } = await apiCall(`/api/orders/${testOrderId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approved' })
  });
  
  assert(status === 200, `Verify should succeed, got ${status}: ${JSON.stringify(data)}`);
  
  // Check order verification.status updated (not status field)
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  assert(orderData.data.verification.status === 'approved', 
    `verification.status should be approved, got ${orderData.data.verification?.status}`);
  
  log('✅', 'Order verification.status = approved');
  log('✅', 'TEST 7 PASSED: Order verification works');
  passedTests++;
  
  return true;
}

// ============================================
// DISCOUNT SYSTEM TESTS
// ============================================

/**
 * TEST 8: Apply percentage discount
 */
async function test8_percentageDiscount() {
  logSection('TEST 8: Percentage Discount');
  
  log('📉', 'Applying 15% discount...');
  const { status, data } = await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: { type: 'percentage', value: 15 } })
  });
  
  assert(status === 200, `Should apply discount, got ${status}: ${JSON.stringify(data)}`);
  
  // Check price: 200000 - 15% = 170000
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const expectedPrice = 170000;
  
  assert(orderData.data.finalPrice === expectedPrice, 
    `Expected ${expectedPrice}, got ${orderData.data.finalPrice}`);
  
  log('✅', `Price after 15% discount: Rp ${orderData.data.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 8 PASSED: Percentage discount works');
  passedTests++;
  
  return true;
}

/**
 * TEST 9: Apply fixed discount
 */
async function test9_fixedDiscount() {
  logSection('TEST 9: Fixed Discount');
  
  log('📉', 'Applying Rp 50,000 fixed discount...');
  const { status } = await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: { type: 'fixed', value: 50000 } })
  });
  
  assert(status === 200, 'Should apply discount');
  
  // Check price: 200000 - 50000 = 150000
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const expectedPrice = 150000;
  
  assert(orderData.data.finalPrice === expectedPrice, 
    `Expected ${expectedPrice}, got ${orderData.data.finalPrice}`);
  
  log('✅', `Price after Rp 50k discount: Rp ${orderData.data.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 9 PASSED: Fixed discount works');
  passedTests++;
  
  return true;
}

/**
 * TEST 10: Remove discount
 */
async function test10_removeDiscount() {
  logSection('TEST 10: Remove Discount');
  
  log('🔄', 'Removing discount...');
  const { status, data } = await apiCall(`/api/orders/${testOrderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount: null })
  });
  
  assert(status === 200, 'Should remove discount');
  
  // Check price restored
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const expectedPrice = 200000;
  
  assert(orderData.data.finalPrice === expectedPrice, 
    `Expected ${expectedPrice}, got ${orderData.data.finalPrice}`);
  
  log('✅', `Price restored: Rp ${orderData.data.finalPrice.toLocaleString('id-ID')}`);
  log('✅', 'TEST 10 PASSED: Discount removal works');
  passedTests++;
  
  return true;
}

// ============================================
// PHOTO SYSTEM TESTS
// ============================================

/**
 * TEST 11: Photo API structure
 */
async function test11_photoApiStructure() {
  logSection('TEST 11: Photo API Structure');
  
  log('📸', 'Testing photo API endpoints...');
  
  // Test POST validation
  const { status: postStatus, data: postData } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  assert(postStatus === 400, `POST without data should return 400, got ${postStatus}`);
  log('  ', '✓ POST validation works');
  
  // Test DELETE validation
  const { status: delStatus } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'DELETE'
  });
  
  assert(delStatus === 400, `DELETE without params should return 400, got ${delStatus}`);
  log('  ', '✓ DELETE validation works');
  
  log('✅', 'TEST 11 PASSED: Photo API structure correct');
  passedTests++;
  
  return true;
}

/**
 * TEST 12: Photo storage structure
 */
async function test12_photoStorageStructure() {
  logSection('TEST 12: Photo Storage Structure');
  
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const order = orderData.data;
  
  log('📸', 'Checking photo storage...');
  
  assert(order.proofOfWork !== undefined, 'proofOfWork should exist');
  assert(Array.isArray(order.proofOfWork.beforePhotos), 'beforePhotos should be array');
  assert(Array.isArray(order.proofOfWork.afterPhotos), 'afterPhotos should be array');
  
  log('  ', '✓ proofOfWork structure exists');
  log('  ', `✓ beforePhotos: ${order.proofOfWork.beforePhotos.length}`);
  log('  ', `✓ afterPhotos: ${order.proofOfWork.afterPhotos.length}`);
  
  log('✅', 'TEST 12 PASSED: Photo storage structure correct');
  passedTests++;
  
  return true;
}

/**
 * TEST 13: Add and delete photo flow
 */
async function test13_photoAddDeleteFlow() {
  logSection('TEST 13: Photo Add/Delete Flow');
  
  const mockPhoto = {
    url: 'https://res.cloudinary.com/test/image/upload/v1234567890/prod-test.jpg',
    publicId: 'prod-test-' + Date.now(),
    type: 'before'
  };
  
  log('📤', 'Adding test photo...');
  const { status: addStatus, data: addData } = await apiCall(`/api/orders/${testOrderId}/photos`, {
    method: 'POST',
    body: JSON.stringify(mockPhoto)
  });
  
  assert(addStatus === 200, `Add should succeed, got ${addStatus}: ${JSON.stringify(addData)}`);
  log('  ', '✓ Photo added');
  
  // Verify added
  const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
  const addedPhoto = orderData.data.proofOfWork.beforePhotos.find(
    p => p.publicId === mockPhoto.publicId
  );
  assert(addedPhoto, 'Photo should be in order');
  log('  ', '✓ Photo stored in order');
  
  // Delete
  log('🗑️', 'Deleting test photo...');
  const { status: delStatus } = await apiCall(
    `/api/orders/${testOrderId}/photos?publicId=${encodeURIComponent(mockPhoto.publicId)}&type=before`,
    { method: 'DELETE' }
  );
  
  assert(delStatus === 200, `Delete should succeed, got ${delStatus}`);
  log('  ', '✓ Photo deleted');
  
  // Verify deleted
  const { data: afterData } = await apiCall(`/api/orders/${testOrderId}`);
  const stillExists = afterData.data.proofOfWork.beforePhotos.find(
    p => p.publicId === mockPhoto.publicId
  );
  assert(!stillExists, 'Photo should be removed');
  log('  ', '✓ Photo removed from order');
  
  log('✅', 'TEST 13 PASSED: Photo add/delete flow works');
  passedTests++;
  
  return true;
}

// ============================================
// STATUS UPDATE TESTS
// ============================================

/**
 * TEST 14: Update order status
 */
async function test14_updateStatus() {
  logSection('TEST 14: Update Order Status');
  
  // Use correct status values: pending, in_progress, finished, delivered, picked_up
  const statuses = ['in_progress', 'finished'];
  
  for (const newStatus of statuses) {
    log('🔄', `Changing status to: ${newStatus}...`);
    const { status, data } = await apiCall(`/api/orders/${testOrderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    
    assert(status === 200, `Should update to ${newStatus}, got ${status}: ${JSON.stringify(data)}`);
    
    const { data: orderData } = await apiCall(`/api/orders/${testOrderId}`);
    assert(orderData.data.status === newStatus, 
      `Status should be ${newStatus}, got ${orderData.data.status}`);
    
    log('  ', `✓ Status: ${newStatus}`);
  }
  
  log('✅', 'TEST 14 PASSED: Status updates work');
  passedTests++;
  
  return true;
}

/**
 * TEST 15: Orders list API
 */
async function test15_ordersListApi() {
  logSection('TEST 15: Orders List API');
  
  log('📋', 'Fetching orders list...');
  const { status, data } = await apiCall('/api/orders');
  
  assert(status === 200, `Should return 200, got ${status}`);
  assert(data.success === true, 'Should return success');
  // Note: GET /api/orders returns { data: { orders: [], total, page, totalPages } }
  assert(data.data && Array.isArray(data.data.orders), 'Should return data.orders array');
  
  log('  ', `✓ Found ${data.data.orders.length} orders (page ${data.data.page}/${data.data.totalPages})`);
  
  // Find our test order
  const testOrder = data.data.orders.find(o => o._id === testOrderId);
  if (testOrder) {
    log('  ', `✓ Test order found in list`);
  } else {
    log('  ', `ℹ️ Test order may be on different page (total: ${data.data.total})`);
  }
  
  log('✅', 'TEST 15 PASSED: Orders list API works');
  passedTests++;
  
  return true;
}

/**
 * TEST 16: Pending orders API
 */
async function test16_pendingOrdersApi() {
  logSection('TEST 16: Pending Orders API');
  
  log('⏳', 'Fetching pending orders...');
  const { status, data } = await apiCall('/api/orders/pending');
  
  assert(status === 200, `Should return 200, got ${status}`);
  assert(data.success === true, 'Should return success');
  assert(Array.isArray(data.data), 'Should return array');
  
  log('  ', `✓ Pending orders: ${data.data.length}`);
  
  log('✅', 'TEST 16 PASSED: Pending orders API works');
  passedTests++;
  
  return true;
}

// ============================================
// CLEANUP
// ============================================

async function cleanup() {
  logSection('CLEANUP');
  
  if (testOrderId) {
    log('🧹', 'Deleting test order from production...');
    const { status } = await apiCall(`/api/orders/${testOrderId}`, { 
      method: 'DELETE' 
    });
    
    if (status === 200) {
      log('✅', 'Test order deleted');
    } else {
      log('⚠️', `Could not delete test order (status ${status})`);
    }
  }
  
  log('✅', 'Cleanup complete');
}

// ============================================
// MAIN
// ============================================

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     PRODUCTION SERVER TEST SUITE                              ║');
  console.log('║     Testing on Vercel: cleaning-service-chi-three.vercel.app  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 Target: ${PRODUCTION_URL}`);
  console.log(`📅 Time: ${new Date().toLocaleString('id-ID')}`);
  
  const tests = [
    // Connectivity
    test1_serverAccessible,
    test2_adminLogin,
    test3_dashboardApi,
    // Customer Form
    test4_createMultiItemOrder,
    test5_singleOrderNumber,
    test6_itemSubtotals,
    // Admin Actions
    test7_verifyOrder,
    // Discount System
    test8_percentageDiscount,
    test9_fixedDiscount,
    test10_removeDiscount,
    // Photo System
    test11_photoApiStructure,
    test12_photoStorageStructure,
    test13_photoAddDeleteFlow,
    // Status & Lists
    test14_updateStatus,
    test15_ordersListApi,
    test16_pendingOrdersApi
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
  console.log('║                 PRODUCTION TEST SUMMARY                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  console.log(`\n📋 Features Tested on Production Server:`);
  console.log(`   • Server Connectivity (Tests 1-3)`);
  console.log(`   • Customer Form & Multi-Item (Tests 4-6)`);
  console.log(`   • Admin Verification (Test 7)`);
  console.log(`   • Discount System (Tests 8-10)`);
  console.log(`   • Photo Management (Tests 11-13)`);
  console.log(`   • Status & Order Lists (Tests 14-16)`);
  
  console.log(`\n✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total:  ${passedTests + failedTests}`);
  
  console.log('\n────────────────────────────────────────────────────────────');
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL PRODUCTION TESTS PASSED!');
    console.log('✅ App is working correctly on Vercel server.');
    console.log('📱 Safe to use on mobile devices.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️ SOME TESTS FAILED ON PRODUCTION!');
    console.log('🔧 Fix the issues before using on mobile.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

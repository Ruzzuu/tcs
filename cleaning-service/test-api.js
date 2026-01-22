/**
 * API Testing Script
 * Run: node test-api.js
 * Tests all API endpoints for the cleaning service
 */

const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60) + '\n');
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}`, color);
  if (details) {
    log(`  ${details}`, 'gray');
  }
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, error = null) {
  results.tests.push({ name, passed, error });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

// Helper to make requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

// Test 1: Create Order - Valid Single Item
async function testCreateOrderSingleItem() {
  const testName = 'Create Order - Single Item';
  
  const orderData = {
    name: 'Test User',
    phone: '081234567890',
    address: 'Jl. Test No. 123',
    items: [
      {
        itemType: 'repaint_canvas',
        quantity: 2,
        notes: 'Test notes'
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  const passed = response.ok && response.data.success;
  logTest(testName, passed, response.ok ? `Order ID: ${response.data.data?.orderId}` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
  
  return response.data.data?.orderId;
}

// Test 2: Create Order - Multiple Items
async function testCreateOrderMultipleItems() {
  const testName = 'Create Order - Multiple Items';
  
  const orderData = {
    name: 'Test User Multi',
    phone: '081234567891',
    address: 'Jl. Test Multi No. 456',
    items: [
      {
        itemType: 'repaint_canvas',
        quantity: 1,
        notes: 'Item 1'
      },
      {
        itemType: 'sandal',
        quantity: 2,
        notes: 'Item 2'
      },
      {
        itemType: 'tas_ransel',
        quantity: 1,
        notes: 'Item 3'
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  const passed = response.ok && response.data.success;
  logTest(testName, passed, response.ok ? `Order ID: ${response.data.data?.orderId}` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
  
  return response.data.data?.orderId;
}

// Test 3: Create Order - Custom Item Type (Other)
async function testCreateOrderCustomItem() {
  const testName = 'Create Order - Custom Item Type';
  
  const orderData = {
    name: 'Test Custom',
    phone: '081234567892',
    address: 'Jl. Test Custom No. 789',
    items: [
      {
        itemType: 'other',
        customItemType: 'Helm Custom',
        quantity: 1,
        notes: 'Custom helm'
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  const passed = response.ok && response.data.success;
  logTest(testName, passed, response.ok ? `Order ID: ${response.data.data?.orderId}` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
  
  return response.data.data?.orderId;
}

// Test 4: Create Order - Invalid (Missing Required Fields)
async function testCreateOrderInvalid() {
  const testName = 'Create Order - Invalid (Missing Fields)';
  
  const orderData = {
    name: '',
    phone: '123', // Invalid phone
    items: [] // Empty items
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  // Should fail with 400
  const passed = !response.ok && response.status === 400;
  logTest(testName, passed, `Expected 400, got ${response.status}`);
  recordTest(testName, passed);
}

// Test 5: Create Order - Invalid Item Type
async function testCreateOrderInvalidItemType() {
  const testName = 'Create Order - Invalid Item Type';
  
  const orderData = {
    name: 'Test Invalid',
    phone: '081234567893',
    address: 'Jl. Test',
    items: [
      {
        itemType: 'invalid_type_xyz',
        quantity: 1
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  // Should fail with 400
  const passed = !response.ok && response.status === 400;
  logTest(testName, passed, `Expected 400, got ${response.status}`);
  recordTest(testName, passed);
}

// Test 6: Create Order - Missing Custom Item Type
async function testCreateOrderMissingCustomType() {
  const testName = 'Create Order - Missing Custom Type';
  
  const orderData = {
    name: 'Test Missing Custom',
    phone: '081234567894',
    address: 'Jl. Test',
    items: [
      {
        itemType: 'other',
        // Missing customItemType
        quantity: 1
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  // Should fail with 400
  const passed = !response.ok && response.status === 400;
  logTest(testName, passed, `Expected 400, got ${response.status}`);
  recordTest(testName, passed);
}

// Test 7: Get Orders List
async function testGetOrders() {
  const testName = 'Get Orders List';
  
  const response = await request('/api/orders');

  const passed = response.ok && response.data.success && Array.isArray(response.data.data.orders);
  logTest(testName, passed, passed ? `Found ${response.data.data.orders.length} orders` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
}

// Test 8: Get Orders - Pagination
async function testGetOrdersPagination() {
  const testName = 'Get Orders - Pagination';
  
  const response = await request('/api/orders?page=1&limit=5');

  const passed = response.ok && response.data.success && response.data.data.orders.length <= 5;
  logTest(testName, passed, passed ? `Page 1 with ${response.data.data.orders.length} orders` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
}

// Test 9: Get Orders - Filter by Verified Status
async function testGetOrdersFilterVerified() {
  const testName = 'Get Orders - Filter Verified';
  
  const response = await request('/api/orders?verified=false');

  const passed = response.ok && response.data.success;
  logTest(testName, passed, passed ? `Found ${response.data.data.orders.length} unverified orders` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
}

// Test 10: Get Single Order
async function testGetSingleOrder(orderId) {
  if (!orderId) {
    log('⊗ Get Single Order - Skipped (no orderId)', 'yellow');
    return;
  }
  
  const testName = 'Get Single Order';
  
  const response = await request(`/api/orders/${orderId}`);

  const passed = response.ok && response.data.success && response.data.data?._id;
  const errorMsg = response.data?.error || (response.data?.data ? 'Invalid response structure' : 'Request failed');
  logTest(testName, passed, passed ? `Order Number: ${response.data.data.orderNumber}` : `Error: ${errorMsg}`);
  recordTest(testName, passed, errorMsg);
}

// Test 11: Get Dashboard Stats
async function testGetDashboard() {
  const testName = 'Get Dashboard Stats';
  
  const response = await request('/api/dashboard');

  const passed = response.ok && response.data.success && response.data.data;
  const errorMsg = response.data?.error || (response.data?.data ? 'Invalid response structure' : 'Request failed');
  const totalOrders = response.data.data?.totalOrders || 'N/A';
  logTest(testName, passed, passed ? `Total orders: ${totalOrders}` : `Error: ${errorMsg}`);
  recordTest(testName, passed, errorMsg);
}

// Test 12: Get Pending Orders
async function testGetPendingOrders() {
  const testName = 'Get Pending Orders';
  
  const response = await request('/api/orders/pending');

  const passed = response.ok && response.data.success && Array.isArray(response.data.data);
  const errorMsg = response.data?.error || (response.data?.data ? 'Invalid response structure' : 'Request failed');
  logTest(testName, passed, passed ? `Found ${response.data.data.length} pending orders` : `Error: ${errorMsg}`);
  recordTest(testName, passed, errorMsg);
  recordTest(testName, passed, response.data.error);
}

// Test 13: Price Calculation - Multiple Items
async function testPriceCalculation() {
  const testName = 'Price Calculation - Verification';
  
  const orderData = {
    name: 'Test Price',
    phone: '081234567895',
    address: 'Jl. Test Price',
    items: [
      {
        itemType: 'repaint_canvas', // 75000
        quantity: 2, // = 150000
        notes: 'Item 1'
      },
      {
        itemType: 'sandal', // 25000
        quantity: 3, // = 75000
        notes: 'Item 2'
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  if (!response.ok) {
    logTest(testName, false, `Failed to create order: ${response.data.error}`);
    recordTest(testName, false, response.data.error);
    return;
  }

  const orderId = response.data.data?.orderId;
  const getResponse = await request(`/api/orders/${orderId}`);

  if (!getResponse.ok) {
    logTest(testName, false, `Failed to retrieve order`);
    recordTest(testName, false);
    return;
  }

  const order = getResponse.data.data;  // Order is directly in data, not data.order
  if (!order || !order.subtotal) {
    logTest(testName, false, `Order data incomplete or missing`);
    recordTest(testName, false);
    return;
  }

  const expectedTotal = 150000 + 75000; // 225000
  const actualTotal = order.subtotal;

  const passed = actualTotal === expectedTotal;
  logTest(
    testName, 
    passed, 
    passed 
      ? `Expected: Rp ${expectedTotal}, Got: Rp ${actualTotal}` 
      : `Price mismatch! Expected: Rp ${expectedTotal}, Got: Rp ${actualTotal}`
  );
  recordTest(testName, passed);
}

// Test 14: Multiple Submissions Same Phone
async function testMultipleSubmissionsSamePhone() {
  const testName = 'Multiple Submissions Same Phone - No Merge';
  
  const phone = '081234567896';
  
  // First order
  const order1 = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Same Phone 1',
      phone: phone,
      address: 'Jl. Test 1',
      items: [{ itemType: 'repaint_canvas', quantity: 1, notes: 'Order 1' }]
    })
  });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 100));

  // Second order with same phone
  const order2 = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Same Phone 2',
      phone: phone,
      address: 'Jl. Test 2',
      items: [{ itemType: 'sandal', quantity: 1, notes: 'Order 2' }]
    })
  });

  if (!order1.ok || !order2.ok) {
    logTest(testName, false, `Failed to create orders`);
    recordTest(testName, false);
    return;
  }

  const orderId1 = order1.data.data?.orderId;
  const orderId2 = order2.data.data?.orderId;

  // They should have different order IDs (no merge)
  const passed = orderId1 !== orderId2;
  logTest(
    testName, 
    passed, 
    passed 
      ? `Created 2 separate orders: ${orderId1.slice(0, 8)}... and ${orderId2.slice(0, 8)}...` 
      : `Orders merged incorrectly! Same ID: ${orderId1}`
  );
  recordTest(testName, passed);
}

// Main test runner
async function runAllTests() {
  log('\n🧪 API Testing Suite for Cleaning Service', 'blue');
  log(`Testing: ${BASE_URL}`, 'gray');
  
  try {
    // Section 1: Order Creation Tests
    logSection('📝 Order Creation Tests');
    const orderId1 = await testCreateOrderSingleItem();
    const orderId2 = await testCreateOrderMultipleItems();
    const orderId3 = await testCreateOrderCustomItem();
    await testCreateOrderInvalid();
    await testCreateOrderInvalidItemType();
    await testCreateOrderMissingCustomType();

    // Section 2: Order Retrieval Tests
    logSection('📋 Order Retrieval Tests');
    await testGetOrders();
    await testGetOrdersPagination();
    await testGetOrdersFilterVerified();
    await testGetSingleOrder(orderId1 || orderId2 || orderId3);
    
    // Section 3: Dashboard Tests
    logSection('📊 Dashboard & Stats Tests');
    await testGetDashboard();
    await testGetPendingOrders();
    
    // Section 4: Business Logic Tests
    logSection('💡 Business Logic Tests');
    await testPriceCalculation();
    await testMultipleSubmissionsSamePhone();

    // Final Results
    logSection('📈 Test Results Summary');
    log(`Total Tests: ${results.passed + results.failed}`, 'blue');
    log(`✓ Passed: ${results.passed}`, 'green');
    log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'gray');
    
    if (results.failed > 0) {
      log('\nFailed Tests:', 'red');
      results.tests.filter(t => !t.passed).forEach(test => {
        log(`  • ${test.name}`, 'red');
        if (test.error) {
          log(`    ${test.error}`, 'gray');
        }
      });
    }
    
    const percentage = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    log(`\nSuccess Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

    // Exit with error code if tests failed
    if (results.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return true;
  } catch {
    return false;
  }
}

// Start tests
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log(`\n❌ Server is not running at ${BASE_URL}`, 'red');
    log('Please start the development server first:', 'yellow');
    log('  npm run dev\n', 'gray');
    process.exit(1);
  }
  
  await runAllTests();
})();

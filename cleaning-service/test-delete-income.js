/**
 * API Testing Script - Delete Order & Weekly Income
 * Run: node test-delete-income.js
 * Tests order deletion with revenue tracking and weekly income calculations
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

// Test 1: Create Test Order for Deletion
async function testCreateOrderForDeletion() {
  const testName = 'Create Test Order (For Deletion)';
  
  const orderData = {
    name: 'Test Delete User',
    phone: '081999888777',
    address: 'Jl. Test Delete No. 999',
    items: [
      {
        itemType: 'sepatu',
        quantity: 2,
        notes: 'Test order akan dihapus'
      }
    ]
  };

  const response = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  const passed = response.ok && response.data.success;
  logTest(testName, passed, passed ? `Order ID: ${response.data.data?.orderId}` : `Error: ${response.data.error}`);
  recordTest(testName, passed, response.data.error);
  
  return response.data.data?.orderId;
}

// Test 2: Delete Pending Order (Should Hard Delete)
async function testDeletePendingOrder(orderId) {
  if (!orderId) {
    log('⊗ Delete Pending Order - Skipped (no orderId)', 'yellow');
    return;
  }

  const testName = 'Delete Pending Order (Hard Delete)';
  
  const response = await request(`/api/orders/${orderId}`, {
    method: 'DELETE'
  });

  const passed = response.ok && response.data.success;
  const message = response.data.message || '';
  const isHardDelete = !message.includes('diarsipkan') && !message.includes('rekap');
  
  logTest(
    testName, 
    passed && isHardDelete, 
    passed 
      ? `${message} (${isHardDelete ? 'Hard Delete ✓' : 'Soft Delete ✗'})` 
      : `Error: ${response.data.error}`
  );
  recordTest(testName, passed && isHardDelete, response.data.error);
}

// Test 3: Create Completed Order for Deletion
async function testCreateCompletedOrder() {
  const testName = 'Create Completed Order (For Soft Delete Test)';
  
  // First create order
  const orderData = {
    name: 'Test Complete Delete',
    phone: '081999888666',
    address: 'Jl. Test Complete No. 888',
    items: [
      {
        itemType: 'tas_ransel',
        quantity: 1,
        notes: 'Test completed order'
      }
    ]
  };

  const createResponse = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });

  if (!createResponse.ok) {
    logTest(testName, false, `Failed to create order: ${createResponse.data.error}`);
    recordTest(testName, false, createResponse.data.error);
    return null;
  }

  const orderId = createResponse.data.data?.orderId;

  // Mark as finished
  const updateResponse = await request(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ 
      status: 'finished',
      finishedAt: new Date().toISOString()
    })
  });

  const passed = updateResponse.ok && updateResponse.data.success;
  logTest(
    testName, 
    passed, 
    passed 
      ? `Order ${orderId} marked as finished` 
      : `Error: ${updateResponse.data.error}`
  );
  recordTest(testName, passed, updateResponse.data.error);

  return orderId;
}

// Test 4: Delete Completed Order (Should Soft Delete + Create Rekap)
async function testDeleteCompletedOrder(orderId) {
  if (!orderId) {
    log('⊗ Delete Completed Order - Skipped (no orderId)', 'yellow');
    return;
  }

  const testName = 'Delete Completed Order (Soft Delete + Rekap)';
  
  const response = await request(`/api/orders/${orderId}`, {
    method: 'DELETE'
  });

  const passed = response.ok && response.data.success;
  const message = response.data.message || '';
  const isSoftDelete = message.includes('diarsipkan') || message.includes('rekap');
  
  logTest(
    testName, 
    passed && isSoftDelete, 
    passed 
      ? `${message} (${isSoftDelete ? 'Soft Delete + Rekap ✓' : 'Hard Delete ✗'})` 
      : `Error: ${response.data.error}`
  );
  recordTest(testName, passed && isSoftDelete, response.data.error);

  // Verify order is soft deleted
  if (passed) {
    const getResponse = await request(`/api/orders/${orderId}`);
    if (getResponse.ok && getResponse.data.data?.deleted) {
      log(`  ✓ Verified: Order marked as deleted`, 'gray');
    }
  }
}

// Test 5: Verify Week Calculation for Jan 15, 2026
async function testWeekCalculationJan15() {
  const testName = 'Week Calculation - Jan 15, 2026 (Should be Week 3)';
  
  // Jan 15, 2026 should be in week 3
  // Week 1: Dec 28, 2025 - Jan 3, 2026
  // Week 2: Jan 4 - Jan 10
  // Week 3: Jan 11 - Jan 17 <-- Jan 15 is here
  // Week 4: Jan 18 - Jan 24
  
  // Test with week 3
  const response = await request('/api/income/weekly?week=3&year=2026');

  if (!response.ok) {
    logTest(testName, false, `API Error: ${response.data?.error || 'Unknown'}`);
    recordTest(testName, false);
    return;
  }

  const data = response.data.data;
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const jan15 = new Date('2026-01-15');

  // Check if Jan 15 falls within the week range
  const isInRange = jan15 >= startDate && jan15 <= endDate;
  
  logTest(
    testName, 
    isInRange, 
    isInRange 
      ? `Week 3: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')} ✓` 
      : `Week 3 range doesn't include Jan 15! Got: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`
  );
  recordTest(testName, isInRange);

  return isInRange;
}

// Test 6: Get Weekly Income Data
async function testGetWeeklyIncome() {
  const testName = 'Get Weekly Income - Current Week';
  
  // Get available weeks first
  const availableResponse = await request('/api/income/weekly?action=available&year=2026');
  
  if (!availableResponse.ok) {
    logTest(testName, false, `Failed to get available weeks`);
    recordTest(testName, false);
    return;
  }

  const availableWeeks = availableResponse.data.data?.availableWeeks || [];
  
  if (availableWeeks.length === 0) {
    log('⊗ No available weeks with data', 'yellow');
    recordTest(testName, true); // Not a failure, just no data
    return;
  }

  // Get data for the first available week
  const weekNum = availableWeeks[0];
  const response = await request(`/api/income/weekly?week=${weekNum}&year=2026`);

  const passed = response.ok && response.data.success && Array.isArray(response.data.data?.weekData);
  
  logTest(
    testName, 
    passed, 
    passed 
      ? `Week ${weekNum}: ${response.data.data.weekData.length} days of data` 
      : `Error: ${response.data.error}`
  );
  recordTest(testName, passed, response.data.error);

  // Show daily breakdown
  if (passed && response.data.data.weekData) {
    response.data.data.weekData.forEach(day => {
      if (day.amount > 0) {
        log(`  ${day.day}: Rp ${day.amount.toLocaleString('id-ID')} (${day.date})`, 'gray');
      }
    });
  }
}

// Test 7: Income Data Consistency
async function testIncomeDataConsistency() {
  const testName = 'Income Data Consistency';
  
  // Get all finished orders
  const ordersResponse = await request('/api/orders?status=finished');
  
  if (!ordersResponse.ok) {
    logTest(testName, false, `Failed to get orders`);
    recordTest(testName, false);
    return;
  }

  const orders = ordersResponse.data.data?.orders || [];
  const totalFromOrders = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);

  // Get income from API (all available weeks)
  const availableResponse = await request('/api/income/weekly?action=available&year=2026');
  const availableWeeks = availableResponse.data.data?.availableWeeks || [];
  
  let totalFromIncome = 0;
  for (const week of availableWeeks) {
    const weekResponse = await request(`/api/income/weekly?week=${week}&year=2026`);
    if (weekResponse.ok) {
      const weekData = weekResponse.data.data?.weekData || [];
      weekData.forEach(day => {
        totalFromIncome += day.amount || 0;
      });
    }
  }

  // They should match (within reasonable margin)
  const difference = Math.abs(totalFromOrders - totalFromIncome);
  const passed = difference < 1000; // Allow Rp 1000 difference for rounding

  logTest(
    testName, 
    passed, 
    `Orders Total: Rp ${totalFromOrders.toLocaleString('id-ID')}, Income API: Rp ${totalFromIncome.toLocaleString('id-ID')}, Diff: Rp ${difference.toLocaleString('id-ID')}`
  );
  recordTest(testName, passed);
}

// Main test runner
async function runAllTests() {
  log('\n🧪 API Testing Suite - Delete & Weekly Income', 'blue');
  log(`Testing: ${BASE_URL}`, 'gray');
  
  try {
    // Section 1: Order Deletion Tests
    logSection('🗑️  Order Deletion Tests');
    const pendingOrderId = await testCreateOrderForDeletion();
    await testDeletePendingOrder(pendingOrderId);
    const completedOrderId = await testCreateCompletedOrder();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit
    await testDeleteCompletedOrder(completedOrderId);

    // Section 2: Weekly Income Tests
    logSection('📊 Weekly Income Calculation Tests');
    await testWeekCalculationJan15();
    await testGetWeeklyIncome();
    await testIncomeDataConsistency();

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

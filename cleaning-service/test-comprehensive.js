/**
 * COMPREHENSIVE API Testing - Deep Analysis
 * Tests: Delete, Weekly Income, Data Consistency
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'blue');
  console.log('='.repeat(70) + '\n');
}

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log(`✓ ${name}`, 'green');
  } else {
    results.failed++;
    log(`✗ ${name}`, 'red');
  }
  if (details) {
    log(`  ${details}`, 'gray');
  }
}

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

// Deep analysis of week calculation
async function analyzeWeekCalculation() {
  logSection('📅 DEEP ANALYSIS: Week Calculation');
  
  const testDates = [
    { date: '2026-01-15', expectedWeek: 3, name: 'Jan 15 (Rendi & Budi)' },
    { date: '2026-01-19', expectedWeek: 4, name: 'Jan 19 (Ahmad Dahlan)' },
    { date: '2026-01-17', expectedWeek: 3, name: 'Jan 17 (Siti)' },
    { date: '2026-01-21', expectedWeek: 4, name: 'Jan 21 (feafaewaefw)' },
  ];

  log('Expected week ranges:', 'yellow');
  log('  Week 3: Sun 11 Jan - Sat 17 Jan 2026', 'gray');
  log('  Week 4: Sun 18 Jan - Sat 24 Jan 2026', 'gray');
  log('', 'reset');

  for (const test of testDates) {
    for (let week = 3; week <= 4; week++) {
      const response = await request(`/api/income/weekly?week=${week}&year=2026`);
      
      if (!response.ok) continue;
      
      const startDate = new Date(response.data.data.startDate);
      const endDate = new Date(response.data.data.endDate);
      const testDate = new Date(test.date);
      
      const isInRange = testDate >= startDate && testDate <= endDate;
      
      if (isInRange) {
        const correct = week === test.expectedWeek;
        recordTest(
          `${test.name} → Week ${week}`,
          correct,
          `Range: ${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')} ${correct ? '✓' : '✗ Should be Week ' + test.expectedWeek}`
        );
        break;
      }
    }
  }
}

// Deep analysis of income totals
async function analyzeIncomeTotals() {
  logSection('💰 DEEP ANALYSIS: Income Totals');
  
  // Get all finished orders
  const ordersResponse = await request('/api/orders?status=finished');
  if (!ordersResponse.ok) {
    recordTest('Get Finished Orders', false, 'Failed to fetch orders');
    return;
  }

  const orders = ordersResponse.data.data.orders.filter(o => !o.deleted);
  
  log('Finished Orders (Not Deleted):', 'yellow');
  const ordersByDate = {};
  let totalRevenue = 0;
  
  orders.forEach(order => {
    const date = new Date(order.finishedAt || order.createdAt);
    const dateStr = date.toISOString().split('T')[0];
    const revenue = order.finalPrice || order.subtotal || 0;
    
    if (!ordersByDate[dateStr]) {
      ordersByDate[dateStr] = { orders: [], total: 0 };
    }
    ordersByDate[dateStr].orders.push({
      name: order.name,
      orderNumber: order.orderNumber,
      revenue
    });
    ordersByDate[dateStr].total += revenue;
    totalRevenue += revenue;
    
    log(`  ${order.name} - ${order.orderNumber}: Rp ${revenue.toLocaleString('id-ID')} (${dateStr})`, 'gray');
  });

  log(`\nTotal Revenue from Orders: Rp ${totalRevenue.toLocaleString('id-ID')}`, 'magenta');

  // Get income from API
  log('\nWeekly Income API:', 'yellow');
  const weeks = [3, 4];
  let apiTotalRevenue = 0;

  for (const week of weeks) {
    const response = await request(`/api/income/weekly?week=${week}&year=2026`);
    if (!response.ok) continue;

    const weekData = response.data.data.weekData;
    const weekTotal = weekData.reduce((sum, day) => sum + day.amount, 0);
    apiTotalRevenue += weekTotal;

    log(`  Week ${week}: Rp ${weekTotal.toLocaleString('id-ID')}`, 'gray');
    weekData.forEach(day => {
      if (day.amount > 0) {
        log(`    ${day.day} (${day.date}): Rp ${day.amount.toLocaleString('id-ID')}`, 'gray');
      }
    });
  }

  log(`\nTotal Revenue from API: Rp ${apiTotalRevenue.toLocaleString('id-ID')}`, 'magenta');
  
  const difference = totalRevenue - apiTotalRevenue;
  const isMatch = Math.abs(difference) < 1000;

  recordTest(
    'Income Total Match',
    isMatch,
    `Orders: Rp ${totalRevenue.toLocaleString('id-ID')} vs API: Rp ${apiTotalRevenue.toLocaleString('id-ID')} (Diff: Rp ${Math.abs(difference).toLocaleString('id-ID')})`
  );

  // Check if Rendi + Budi = expected
  const jan15Orders = ordersByDate['2026-01-15'];
  if (jan15Orders) {
    const expectedTotal = jan15Orders.total;
    log(`\nJan 15 Orders Total: Rp ${expectedTotal.toLocaleString('id-ID')}`, 'yellow');
    jan15Orders.orders.forEach(o => {
      log(`  ${o.name}: Rp ${o.revenue.toLocaleString('id-ID')}`, 'gray');
    });

    // Check what API shows for week 3
    const week3Response = await request(`/api/income/weekly?week=3&year=2026`);
    if (week3Response.ok) {
      const jan15Data = week3Response.data.data.weekData.find(d => d.date === '2026-01-15');
      if (jan15Data) {
        const apiShows = jan15Data.amount;
        const matches = apiShows === expectedTotal;
        recordTest(
          'Jan 15 Revenue in API',
          matches,
          `Expected: Rp ${expectedTotal.toLocaleString('id-ID')}, API shows: Rp ${apiShows.toLocaleString('id-ID')}`
        );
      }
    }
  }
}

// Deep analysis of soft delete
async function analyzeSoftDelete() {
  logSection('🗑️  DEEP ANALYSIS: Soft Delete Behavior');
  
  // Get all orders including deleted
  const allOrdersResponse = await request('/api/orders');
  if (!allOrdersResponse.ok) {
    recordTest('Get All Orders', false, 'Failed to fetch');
    return;
  }

  const allOrders = allOrdersResponse.data.data.orders;
  const deletedOrders = allOrders.filter(o => o.deleted === true);
  const notDeletedOrders = allOrders.filter(o => !o.deleted);

  log(`Total orders in DB: ${allOrders.length}`, 'yellow');
  log(`  Not deleted: ${notDeletedOrders.length}`, 'gray');
  log(`  Deleted: ${deletedOrders.length}`, 'gray');

  if (deletedOrders.length > 0) {
    log('\nDeleted Orders:', 'yellow');
    deletedOrders.forEach(order => {
      log(`  ${order.name} - ${order.orderNumber} (Rp ${order.finalPrice || 0})`, 'gray');
      log(`    Deleted: ${order.deleted}, RekapId: ${order.rekapId || 'none'}`, 'gray');
    });
  }

  // Check if deleted orders appear in dashboard
  const dashboardResponse = await request('/api/dashboard');
  if (dashboardResponse.ok) {
    const dashboardOrders = dashboardResponse.data.data.recentFinishedOrders || [];
    const deletedInDashboard = dashboardOrders.filter(o => o.deleted === true);
    
    const cleanDashboard = deletedInDashboard.length === 0;
    recordTest(
      'Deleted Orders NOT in Dashboard',
      cleanDashboard,
      cleanDashboard 
        ? 'Dashboard clean ✓' 
        : `${deletedInDashboard.length} deleted orders still appear!`
    );

    if (!cleanDashboard) {
      log('\nDeleted orders appearing in dashboard:', 'red');
      deletedInDashboard.forEach(o => {
        log(`  ${o.name} - ${o.orderNumber}`, 'gray');
      });
    }
  }

  // Test creating and deleting an order
  log('\nTest: Create → Delete → Verify', 'yellow');
  
  // Create test order
  const createResponse = await request('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Soft Delete',
      phone: '081999000111',
      address: 'Test Address',
      items: [{ itemType: 'sepatu', quantity: 1, notes: 'Test' }]
    })
  });

  if (!createResponse.ok) {
    recordTest('Create Test Order', false, 'Failed to create');
    return;
  }

  const orderId = createResponse.data.data.orderId;
  log(`  Created order: ${orderId}`, 'gray');

  // Mark as finished
  const updateResponse = await request(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ 
      status: 'finished',
      finishedAt: new Date().toISOString()
    })
  });

  if (!updateResponse.ok) {
    recordTest('Mark as Finished', false, 'Failed to update');
    return;
  }
  log(`  Marked as finished`, 'gray');

  // Delete
  const deleteResponse = await request(`/api/orders/${orderId}`, {
    method: 'DELETE'
  });

  if (!deleteResponse.ok) {
    recordTest('Delete Order', false, `Status ${deleteResponse.status}: ${deleteResponse.data?.error}`);
    return;
  }
  log(`  Deleted: ${deleteResponse.data.message}`, 'gray');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500));

  // Verify it's soft deleted
  const verifyResponse = await request(`/api/orders/${orderId}`);
  if (verifyResponse.ok) {
    const order = verifyResponse.data.data;
    const isSoftDeleted = order.deleted === true;
    const hasRekapId = !!order.rekapId;

    recordTest(
      'Soft Delete Verification',
      isSoftDeleted && hasRekapId,
      `Deleted: ${order.deleted}, RekapId: ${order.rekapId || 'missing!'}`
    );

    // Verify it doesn't appear in list
    const listResponse = await request('/api/orders?status=finished');
    if (listResponse.ok) {
      const appearsInList = listResponse.data.data.orders.some(o => o._id === orderId && !o.deleted);
      recordTest(
        'Deleted Order Hidden from List',
        !appearsInList,
        appearsInList ? 'Still appears in list!' : 'Not in list ✓'
      );
    }
  }
}

// Check Rekap collection
async function analyzeRekapCollection() {
  logSection('📊 DEEP ANALYSIS: Rekap Collection');
  
  // This would need a separate API endpoint to inspect Rekap
  // For now, we'll check through income API which uses Rekap
  
  const response = await request('/api/income/weekly?week=3&year=2026');
  if (!response.ok) {
    recordTest('Access Rekap Data', false, 'Cannot access income API');
    return;
  }

  const weekData = response.data.data.weekData;
  const hasData = weekData.some(day => day.amount > 0);

  recordTest(
    'Rekap Collection Has Data',
    hasData,
    hasData ? 'Rekap contains revenue data ✓' : 'No data in Rekap!'
  );

  // Show what's in Rekap
  log('\nRekap Data (Week 3):', 'yellow');
  weekData.forEach(day => {
    if (day.amount > 0) {
      log(`  ${day.day} (${day.date}): Rp ${day.amount.toLocaleString('id-ID')}`, 'gray');
    }
  });
}

// Main runner
async function runAllTests() {
  log('\n🔬 COMPREHENSIVE DEEP ANALYSIS', 'blue');
  log(`Testing: ${BASE_URL}`, 'gray');
  log(`Timestamp: ${new Date().toISOString()}`, 'gray');
  
  try {
    await analyzeWeekCalculation();
    await analyzeIncomeTotals();
    await analyzeSoftDelete();
    await analyzeRekapCollection();

    // Final Results
    logSection('📈 Test Results Summary');
    log(`Total Tests: ${results.passed + results.failed}`, 'blue');
    log(`✓ Passed: ${results.passed}`, 'green');
    log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'gray');
    
    if (results.failed > 0) {
      log('\n❌ Failed Tests:', 'red');
      results.tests.filter(t => !t.passed).forEach(test => {
        log(`  • ${test.name}`, 'red');
        if (test.details) {
          log(`    ${test.details}`, 'gray');
        }
      });
    }
    
    const percentage = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    log(`\nSuccess Rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

    if (results.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Check server
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return true;
  } catch {
    return false;
  }
}

// Start
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

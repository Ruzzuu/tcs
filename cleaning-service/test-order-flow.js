// ============================================
// COMPREHENSIVE ORDER FLOW TEST
// ============================================
// Tests: Create Order -> Verify -> Finish -> Delete
// Also tests validation and edge cases

const BASE_URL = 'http://localhost:3000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testOrderCreation() {
  section('TEST 1: Valid Order Creation (Multiple Items)');
  
  const orderData = {
    name: 'Test Customer',
    phone: '081234567890',
    address: 'Jl. Test No. 123',
    items: [
      {
        itemType: 'sepatu',
        quantity: 2,
        customItemType: '',
        notes: 'Clean carefully'
      },
      {
        itemType: 'tas_ransel',
        quantity: 1,
        customItemType: '',
        notes: ''
      }
    ]
  };

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log(`✓ Order created successfully`, 'green');
      log(`  Order Number: ${result.data.orderNumber}`, 'gray');
      log(`  Order ID: ${result.data.orderId}`, 'gray');
      return result.data.orderId;
    } else {
      log(`✗ Failed to create order`, 'red');
      log(`  Error: ${result.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return null;
  }
}

async function testValidation() {
  section('TEST 2: Validation - Empty Items Array');
  
  const invalidOrder = {
    name: 'Test User',
    phone: '081234567890',
    address: 'Test Address',
    items: [] // Empty array
  };

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidOrder)
    });

    const result = await response.json();

    if (response.status === 400 && result.error.includes('Minimal 1 item')) {
      log(`✓ Validation working: Empty items rejected`, 'green');
      log(`  Error message: ${result.error}`, 'gray');
    } else {
      log(`✗ Validation failed: Should reject empty items`, 'red');
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
  }
}

async function testValidation2() {
  section('TEST 3: Validation - Missing Name');
  
  const invalidOrder = {
    name: '', // Empty name
    phone: '081234567890',
    address: 'Test Address',
    items: [{ itemType: 'sepatu', quantity: 1, customItemType: '', notes: '' }]
  };

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidOrder)
    });

    const result = await response.json();

    if (response.status === 400 && result.error.includes('Nama minimal')) {
      log(`✓ Validation working: Empty name rejected`, 'green');
    } else {
      log(`✗ Validation failed: Should reject empty name`, 'red');
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
  }
}

async function testValidation3() {
  section('TEST 4: Validation - Invalid Phone');
  
  const invalidOrder = {
    name: 'Test User',
    phone: '123', // Invalid phone
    address: 'Test Address',
    items: [{ itemType: 'sepatu', quantity: 1, customItemType: '', notes: '' }]
  };

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidOrder)
    });

    const result = await response.json();

    if (response.status === 400 && result.error.includes('WhatsApp')) {
      log(`✓ Validation working: Invalid phone rejected`, 'green');
    } else {
      log(`✗ Validation failed: Should reject invalid phone`, 'red');
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
  }
}

async function testVerifyOrder(orderId) {
  section('TEST 5: Verify Order');
  
  if (!orderId) {
    log('⊘ Skipped: No order ID from previous test', 'yellow');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approved' })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log(`✓ Order verified successfully`, 'green');
      return true;
    } else {
      log(`✗ Failed to verify order`, 'red');
      log(`  Error: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

async function testFinishOrder(orderId) {
  section('TEST 6: Finish Order');
  
  if (!orderId) {
    log('⊘ Skipped: No order ID from previous test', 'yellow');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'finished' })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log(`✓ Order finished successfully`, 'green');
      return true;
    } else {
      log(`✗ Failed to finish order`, 'red');
      log(`  Error: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

async function testDeleteOrder(orderId) {
  section('TEST 7: Soft Delete Order');
  
  if (!orderId) {
    log('⊘ Skipped: No order ID from previous test', 'yellow');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log(`✓ Order deleted successfully`, 'green');
      log(`  Message: ${result.message}`, 'gray');
      return true;
    } else {
      log(`✗ Failed to delete order`, 'red');
      log(`  Error: ${result.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
    return false;
  }
}

async function testOrderHidden(orderId) {
  section('TEST 8: Verify Deleted Order Hidden from List');
  
  if (!orderId) {
    log('⊘ Skipped: No order ID from previous test', 'yellow');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/orders`);
    const result = await response.json();

    if (response.ok && result.success) {
      const found = result.data.orders.find(o => o._id === orderId);
      
      if (!found) {
        log(`✓ Deleted order hidden from list`, 'green');
      } else {
        log(`✗ Deleted order still visible in list`, 'red');
      }
    }
  } catch (error) {
    log(`✗ Request failed: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║     COMPREHENSIVE ORDER FLOW TEST SUITE             ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  let orderId = null;

  // Test order creation
  orderId = await testOrderCreation();

  // Test validation
  await testValidation();
  await testValidation2();
  await testValidation3();

  // Test order flow
  const verified = await testVerifyOrder(orderId);
  const finished = await testFinishOrder(orderId);
  const deleted = await testDeleteOrder(orderId);
  await testOrderHidden(orderId);

  // Summary
  section('TEST SUMMARY');
  log('All tests completed!', 'cyan');
  log('\nNote: Check console logs for any errors or warnings', 'gray');
  console.log('');
}

// Run tests
runAllTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});

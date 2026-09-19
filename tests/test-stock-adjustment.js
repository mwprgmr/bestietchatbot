// Test suite for stock adjustment frontend validation and RPC mapping

function validateAndMapStockAdjustment(quantityInput, rawMovementType, selectedInventoryId, reasonInput) {
  // 1. Fix quantity input handling
  const rawInput = quantityInput != null ? String(quantityInput).trim() : '';
  if (!rawInput) {
    return { valid: false, error: 'Please enter a valid quantity greater than 0 kg.' };
  }

  const numericQty = Number(rawInput);
  if (isNaN(numericQty) || !isFinite(numericQty) || numericQty <= 0) {
    return { valid: false, error: 'Please enter a valid quantity greater than 0 kg.' };
  }

  // 2. Movement type mapping
  let mappedMovementType = rawMovementType;
  if (mappedMovementType === 'DAMAGED') mappedMovementType = 'DAMAGE';
  if (mappedMovementType === 'MANUAL_ADJUSTMENT') mappedMovementType = 'WASTAGE';
  if (mappedMovementType === 'RETURN') mappedMovementType = 'CUSTOMER_RETURN';

  // 3. Inventory ID verification
  if (!selectedInventoryId) {
    return { valid: false, error: 'Invalid inventory record selected.' };
  }

  const trimmedReason = reasonInput && reasonInput.trim() ? reasonInput.trim() : `Adjusted stock (${mappedMovementType})`;

  // 4. Formatted payload for RPC
  const payload = {
    p_inventory_id: selectedInventoryId,
    p_movement_type: mappedMovementType,
    p_adjustment_qty: numericQty, // numeric value, not string
    p_reason: trimmedReason
  };

  return { valid: true, payload };
}

// RUN TEST SCENARIOS
console.log('--- RUNNING STOCK ADJUSTMENT TESTS ---');

const testCases = [
  // Quantities for RESTOCK
  { qty: '1', type: 'RESTOCK', invId: 'inv-123', expectedValid: true, expectedQty: 1, expectedType: 'RESTOCK' },
  { qty: '0.5', type: 'RESTOCK', invId: 'inv-123', expectedValid: true, expectedQty: 0.5, expectedType: 'RESTOCK' },
  { qty: '10.25', type: 'RESTOCK', invId: 'inv-123', expectedValid: true, expectedQty: 10.25, expectedType: 'RESTOCK' },
  { qty: '', type: 'RESTOCK', invId: 'inv-123', expectedValid: false },
  { qty: '   ', type: 'RESTOCK', invId: 'inv-123', expectedValid: false },
  { qty: '0', type: 'RESTOCK', invId: 'inv-123', expectedValid: false },
  { qty: '-1', type: 'RESTOCK', invId: 'inv-123', expectedValid: false },
  { qty: '-0.5', type: 'RESTOCK', invId: 'inv-123', expectedValid: false },

  // Quantities for DAMAGE
  { qty: '1', type: 'DAMAGE', invId: 'inv-123', expectedValid: true, expectedQty: 1, expectedType: 'DAMAGE' },
  { qty: '0.5', type: 'DAMAGE', invId: 'inv-123', expectedValid: true, expectedQty: 0.5, expectedType: 'DAMAGE' },
  { qty: '', type: 'DAMAGE', invId: 'inv-123', expectedValid: false },
  { qty: '0', type: 'DAMAGE', invId: 'inv-123', expectedValid: false },
  { qty: '-5', type: 'DAMAGE', invId: 'inv-123', expectedValid: false },

  // Quantities for WASTAGE
  { qty: '1', type: 'WASTAGE', invId: 'inv-123', expectedValid: true, expectedQty: 1, expectedType: 'WASTAGE' },
  { qty: '0.5', type: 'WASTAGE', invId: 'inv-123', expectedValid: true, expectedQty: 0.5, expectedType: 'WASTAGE' },
  { qty: '', type: 'WASTAGE', invId: 'inv-123', expectedValid: false },
  { qty: '0', type: 'WASTAGE', invId: 'inv-123', expectedValid: false },
  { qty: '-2.5', type: 'WASTAGE', invId: 'inv-123', expectedValid: false },

  // Quantities for CUSTOMER_RETURN
  { qty: '1', type: 'CUSTOMER_RETURN', invId: 'inv-123', expectedValid: true, expectedQty: 1, expectedType: 'CUSTOMER_RETURN' },
  { qty: '0.5', type: 'CUSTOMER_RETURN', invId: 'inv-123', expectedValid: true, expectedQty: 0.5, expectedType: 'CUSTOMER_RETURN' },
  { qty: '', type: 'CUSTOMER_RETURN', invId: 'inv-123', expectedValid: false },
  { qty: '0', type: 'CUSTOMER_RETURN', invId: 'inv-123', expectedValid: false },
  { qty: '-10', type: 'CUSTOMER_RETURN', invId: 'inv-123', expectedValid: false }
];

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = validateAndMapStockAdjustment(tc.qty, tc.type, tc.invId, 'Test reason');
  if (result.valid !== tc.expectedValid) {
    console.error(`❌ FAILED for qty="${tc.qty}", type=${tc.type}: expected valid=${tc.expectedValid}, got valid=${result.valid} (error: ${result.error})`);
    failed++;
  } else if (tc.expectedValid) {
    if (result.payload.p_adjustment_qty !== tc.expectedQty) {
      console.error(`❌ FAILED qty mismatch for "${tc.qty}": expected ${tc.expectedQty}, got ${result.payload.p_adjustment_qty}`);
      failed++;
    } else if (result.payload.p_movement_type !== tc.expectedType) {
      console.error(`❌ FAILED type mismatch: expected ${tc.expectedType}, got ${result.payload.p_movement_type}`);
      failed++;
    } else if (typeof result.payload.p_adjustment_qty !== 'number') {
      console.error(`❌ FAILED numeric type check: expected number, got ${typeof result.payload.p_adjustment_qty}`);
      failed++;
    } else {
      console.log(`✅ PASSED: [${tc.type}] qty="${tc.qty}" -> numeric=${result.payload.p_adjustment_qty}, type=${result.payload.p_movement_type}`);
      passed++;
    }
  } else {
    console.log(`✅ PASSED: [${tc.type}] qty="${tc.qty}" correctly rejected with message: "${result.error}"`);
    passed++;
  }
}

console.log(`\nSUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

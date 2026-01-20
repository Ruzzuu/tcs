# Multi-Item Orders Implementation Guide

## Overview
This document outlines the complete implementation plan for converting single-item orders to multi-item basket functionality.

## ✅ Completed Steps

### 1. Type Definitions (`src/types/index.ts`)
- ✅ Added `OrderItem` interface with all required fields
- ✅ Updated `Order` interface to include `items: OrderItem[]`
- ✅ Kept legacy fields for backwards compatibility
- ✅ Made `subtotal` and `finalPrice` required

### 2. Database Schema (`src/lib/models/Order.ts`)
- ✅ Created `OrderItemSchema` sub-schema
- ✅ Added `items` array field with validation
- ✅ Kept legacy fields as optional
- ✅ Updated pricing fields

### 3. Utilities Created
- ✅ `src/lib/orderUtils.ts` - Order item operations
- ✅ `src/lib/featureFlags.ts` - Feature flag configuration
- ✅ `scripts/migrate-to-multi-item.ts` - Migration script

## 📋 Remaining Implementation Tasks

### Phase 1: API Updates (Critical)

#### A. Update `src/app/api/orders/route.ts` - POST endpoint
**Current behavior**: Creates new order per item
**New behavior**: Find existing pending order or create new

```typescript
// Pseudocode for new POST logic:
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, phone, address, itemType, quantity, customerNotes } = body;
  
  // Feature flag check
  if (isFeatureEnabled('MULTI_ITEM_ORDERS')) {
    // Find existing pending order for this customer (same phone + today)
    const existingOrder = await Order.findOne({
      phone,
      status: 'pending',
      'verification.status': 'unverified',
      createdAt: { $gte: startOfToday }
    });

    if (existingOrder && isFeatureEnabled('AUTO_MERGE_ORDERS')) {
      // Append item to existing order
      const newItem = createOrderItem(itemType, quantity, customItemType, customerNotes);
      existingOrder.items.push(newItem);
      
      // Recalculate totals
      const pricing = calculateOrderTotal(existingOrder.items, existingOrder.discount);
      existingOrder.subtotal = pricing.subtotal;
      existingOrder.finalPrice = pricing.total;
      
      await existingOrder.save();
      return NextResponse.json({ success: true, data: existingOrder });
    }
  }
  
  // Create new order with single item
  const item = createOrderItem(itemType, quantity, customItemType, customerNotes);
  const subtotal = item.subtotal;
  
  const newOrder = new Order({
    orderNumber: generateOrderNumber(),
    name,
    phone,
    address,
    items: [item],
    subtotal,
    finalPrice: subtotal,
    // ... other fields
  });
  
  await newOrder.save();
  return NextResponse.json({ success: true, data: newOrder });
}
```

#### B. Add new endpoint: `src/app/api/orders/[id]/items/route.ts`
**Purpose**: Add/remove items from existing order

```typescript
// POST /api/orders/[id]/items - Add item
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  
  const order = await Order.findById(id);
  if (!order || order.status !== 'pending') {
    return NextResponse.json({ error: 'Order not found or not pending' }, { status: 404 });
  }
  
  const newItem = createOrderItem(
    body.itemType,
    body.quantity,
    body.customItemType,
    body.notes
  );
  
  order.items.push(newItem);
  const pricing = calculateOrderTotal(order.items, order.discount);
  order.subtotal = pricing.subtotal;
  order.finalPrice = pricing.total;
  
  await order.save();
  return NextResponse.json({ success: true, data: order });
}

// DELETE /api/orders/[id]/items/[itemId] - Remove item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id, itemId } = await params;
  
  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  
  order.items = order.items.filter(item => item.id !== itemId);
  
  if (order.items.length === 0) {
    return NextResponse.json({ error: 'Cannot delete last item' }, { status: 400 });
  }
  
  const pricing = calculateOrderTotal(order.items, order.discount);
  order.subtotal = pricing.subtotal;
  order.finalPrice = pricing.total;
  
  await order.save();
  return NextResponse.json({ success: true, data: order });
}
```

#### C. Update `src/app/api/orders/[id]/route.ts` - PATCH endpoint
**Change**: Recalculate totals when discount applied using all items

```typescript
// In discount handling section:
if ('discount' in body) {
  const order = await Order.findById(id);
  
  if (body.discount === null) {
    // Remove discount
    const subtotal = calculateOrderSubtotal(order.items);
    await Order.findByIdAndUpdate(id, {
      $unset: { discount: "" },
      $set: { subtotal, finalPrice: subtotal }
    });
  } else {
    // Apply discount
    const pricing = calculateOrderTotal(order.items, body.discount);
    await Order.findByIdAndUpdate(id, {
      $set: {
        discount: body.discount,
        subtotal: pricing.subtotal,
        finalPrice: pricing.total
      }
    });
  }
}
```

### Phase 2: Frontend Updates (Admin UI)

#### A. Update `src/app/admin/orders/[id]/page.tsx`

**1. Show Items Table Instead of Single Item**

Replace current single item display with:

```tsx
{/* Items Table */}
<div className="px-4 mt-6">
  <h3 className="text-[#111318] dark:text-white text-lg font-bold mb-3">
    Item Pesanan ({order.items.length})
  </h3>
  
  <div className="bg-white dark:bg-[#1a2230] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
    {order.items.map((item, index) => (
      <div key={item.id} className={`p-4 ${index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="material-symbols-outlined">
                {SERVICES[item.serviceType]?.icon || 'inventory_2'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[#111318] dark:text-white font-medium">
                {SERVICES[item.serviceType]?.name || item.serviceType}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {formatCurrency(item.unitPrice)} × {item.quantity}
              </p>
              {item.notes && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[#111318] dark:text-white font-semibold">
              {formatCurrency(item.subtotal)}
            </p>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="text-red-500 hover:text-red-700 text-sm mt-1"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    ))}
    
    {/* Add Item Button */}
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setShowAddItemModal(true)}
        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-[#1152d4] hover:text-[#1152d4] transition-colors flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">add</span>
        <span>Tambah Item</span>
      </button>
    </div>
  </div>
</div>
```

**2. Update Nota Template**

```tsx
{/* In nota template - replace single item with items loop */}
<tbody>
  {order.items.map((item) => (
    <tr key={item.id} style={{ color: '#1f2937' }}>
      <td style={{ padding: '8px 0' }}>
        {SERVICES[item.serviceType]?.name || item.serviceType}
      </td>
      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
      <td style={{ textAlign: 'right' }}>
        {formatCurrency(item.subtotal)}
      </td>
    </tr>
  ))}
</tbody>
```

**3. Add Item Management Handlers**

```typescript
// Add item handler
const handleAddItem = async (itemData: {
  serviceType: ServiceType;
  quantity: number;
  notes?: string;
}) => {
  try {
    const response = await fetch(`/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    
    const result = await response.json();
    if (result.success) {
      setOrder(result.data);
      setShowAddItemModal(false);
      alert('Item berhasil ditambahkan!');
    }
  } catch (err) {
    alert('Gagal menambahkan item');
  }
};

// Delete item handler
const handleDeleteItem = async (itemId: string) => {
  if (order.items.length === 1) {
    alert('Tidak bisa menghapus item terakhir');
    return;
  }
  
  const confirmed = confirm('Hapus item ini?');
  if (!confirmed) return;
  
  try {
    const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    if (result.success) {
      setOrder(result.data);
      alert('Item berhasil dihapus!');
    }
  } catch (err) {
    alert('Gagal menghapus item');
  }
};
```

### Phase 3: Customer Form Updates

#### Update `src/app/form/page.tsx`
- Keep single-item form for now
- API will handle appending to existing order automatically
- No UI changes needed initially

### Phase 4: Migration & Deployment

#### Step 1: Enable Feature Flags
Add to `.env.local`:
```
NEXT_PUBLIC_FEATURE_MULTI_ITEM=true
NEXT_PUBLIC_FEATURE_AUTO_MERGE=false  # Start with false, enable later
```

#### Step 2: Run Migration
```bash
# Dry run first (test on staging)
npm run migrate:multi-item

# Check results, then run on production
```

#### Step 3: Staged Rollout
1. Deploy with feature flags OFF
2. Run migration script
3. Enable `MULTI_ITEM_ORDERS` flag
4. Test thoroughly
5. Enable `AUTO_MERGE_ORDERS` flag
6. Monitor for issues

### Phase 5: Testing Checklist

#### Unit Tests Needed
- [ ] `calculateOrderSubtotal()` with multiple items
- [ ] `calculateOrderTotal()` with discount on multiple items
- [ ] `createOrderItem()` generates correct structure
- [ ] `shouldAppendToOrder()` matching logic

#### Integration Tests Needed
- [ ] POST /api/orders with feature flag ON/OFF
- [ ] POST /api/orders/[id]/items adds item correctly
- [ ] DELETE /api/orders/[id]/items/[itemId] removes item
- [ ] PATCH /api/orders/[id] applies discount to all items
- [ ] Concurrent order creation (race condition test)

#### Manual Testing
- [ ] Create new order → verify single item
- [ ] Add item to existing order → verify two items shown
- [ ] Apply discount → verify calculated on total
- [ ] Remove discount → verify totals recalculated
- [ ] Delete item → verify order updated
- [ ] Upload photos → verify still works
- [ ] Generate nota → verify all items shown
- [ ] WhatsApp link → verify message includes all items

## Rollback Plan

### If Issues Found After Deployment:

1. **Immediate**: Disable feature flags
   ```bash
   NEXT_PUBLIC_FEATURE_MULTI_ITEM=false
   NEXT_PUBLIC_FEATURE_AUTO_MERGE=false
   ```

2. **Data Rollback**: Run migration rollback
   ```bash
   npm run migrate:multi-item rollback
   ```

3. **Code Rollback**: Revert to previous deployment

## Performance Considerations

- **Items array size**: Limit to 50 items per order (add validation)
- **Database queries**: Add index on `{ phone: 1, status: 1, createdAt: -1 }`
- **API response size**: Already reasonable (<100KB per order with items)
- **Migration time**: ~1 second per 100 orders

## Next Steps

1. Review this implementation plan
2. Create feature branch: `feature/multi-item-orders`
3. Implement Phase 1 (API) first
4. Write and run tests
5. Implement Phase 2 (Frontend)
6. Test on staging environment
7. Run migration on staging
8. Deploy to production with flags OFF
9. Enable flags gradually
10. Monitor metrics and errors

## Files to Create/Modify

### New Files
- ✅ `src/lib/orderUtils.ts`
- ✅ `src/lib/featureFlags.ts`
- ✅ `scripts/migrate-to-multi-item.ts`
- ⏳ `src/app/api/orders/[id]/items/route.ts`
- ⏳ `__tests__/lib/orderUtils.test.ts`
- ⏳ `__tests__/api/orders.test.ts`

### Modified Files
- ✅ `src/types/index.ts`
- ✅ `src/lib/models/Order.ts`
- ⏳ `src/app/api/orders/route.ts`
- ⏳ `src/app/api/orders/[id]/route.ts`
- ⏳ `src/app/admin/orders/[id]/page.tsx`
- ⏳ `package.json` (add migration script)

## Estimated Timeline

- **Phase 1 (API)**: 2-3 days
- **Phase 2 (Frontend)**: 2-3 days
- **Phase 3 (Testing)**: 2 days
- **Phase 4 (Migration & Deploy)**: 1 day
- **Total**: ~1-2 weeks

## Questions & Decisions Needed

1. **Item limit**: Max items per order? (Suggested: 50)
2. **Merge window**: How long to merge orders? (Suggested: same day)
3. **Merge criteria**: Phone only or phone + address? (Suggested: phone only)
4. **Item photos**: Keep at order level or add per-item? (Suggested: keep order-level for now)
5. **Historical orders**: Migrate all or only recent? (Suggested: all)

---

**Status**: ✅ Ready for Phase 1 implementation
**Last Updated**: January 21, 2026

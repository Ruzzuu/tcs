import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Order from '@/lib/models/Order';
import Rekap from '@/lib/models/Rekap';

describe('Orders Rekap Integration Tests', () => {
  let orderId: string;
  let rekapId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cleaning-service-test';
    await mongoose.connect(mongoUri);
    await Order.deleteMany({ orderNumber: /^TEST-/ });
    await Rekap.deleteMany({});
  });

  afterAll(async () => {
    await Order.deleteMany({ orderNumber: /^TEST-/ });
    await Rekap.deleteMany({});
    await mongoose.disconnect();
  });

  it('should create immutable rekap when completing an order', async () => {
    const order = await Order.create({
      orderNumber: 'TEST-REKAP-001',
      name: 'Test User',
      phone: '081234567890',
      address: 'Test Address',
      items: [
        {
          id: 'test-item-1',
          serviceType: 'sepatu',
          quantity: 1,
          unitPrice: 50000,
          subtotal: 50000
        }
      ],
      subtotal: 50000,
      finalPrice: 50000,
      status: 'pending',
      verification: { status: 'approved', verifiedAt: new Date() }
    });

    orderId = order._id.toString();

    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.rekap.immutable).toBe(true);
    expect(result.data.rekap.amount).toBe(50000);
    expect(result.data.order.status).toBe('finished');
    expect(result.data.order.rekapId).toBeTruthy();

    rekapId = result.data.rekap._id;
  });

  it('should be idempotent when completing same order twice', async () => {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toContain('sudah diselesaikan');
  });

  it('should soft-delete complete order and leave rekap intact', async () => {
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toContain('soft delete');

    const order = await Order.findById(orderId);
    expect(order?.deleted).toBe(true);
    expect(order?.archivedAt).toBeTruthy();

    const rekap = await Rekap.findById(rekapId);
    expect(rekap).toBeTruthy();
    expect(rekap?.immutable).toBe(true);
    expect(rekap?.amount).toBe(50000);
  });

  it('should hard-delete non-complete order', async () => {
    const order = await Order.create({
      orderNumber: 'TEST-REKAP-002',
      name: 'Test User 2',
      phone: '081298765432',
      address: 'Test Address 2',
      items: [
        {
          id: 'test-item-2',
          serviceType: 'tas_ransel',
          quantity: 1,
          unitPrice: 40000,
          subtotal: 40000
        }
      ],
      subtotal: 40000,
      finalPrice: 40000,
      status: 'pending',
      verification: { status: 'approved', verifiedAt: new Date() }
    });

    const testOrderId = order._id.toString();

    const response = await fetch(`http://localhost:3000/api/orders/${testOrderId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);

    const deletedOrder = await Order.findById(testOrderId);
    expect(deletedOrder).toBeNull();
  });

  it('should return 404 when completing non-existent order', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const response = await fetch(`http://localhost:3000/api/orders/${fakeId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status).toBe(404);
  });

  it('should return 400 for invalid order ID', async () => {
    const response = await fetch(`http://localhost:3000/api/orders/invalid-id/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status).toBe(400);
  });
});

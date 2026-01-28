import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Rekap from '@/lib/models/Rekap';
import { runTransactionSafe } from '@/lib/db/transactions';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'ID pesanan tidak valid' },
        { status: 400 }
      );
    }

    const result = await runTransactionSafe(async (session) => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (order.rekapId) {
        const existingRekap = await Rekap.findOne({ orderId: order._id }).session(session);
        if (existingRekap) {
          return { order, rekap: existingRekap, existed: true };
        }
      }

      const amount = order.finalPrice ?? order.subtotal ?? 0;

      const lastRekap = await Rekap.findOne()
        .sort({ createdAt: -1 })
        .session(session);

      const previousBalance = lastRekap?.balanceSnapshot ?? 0;
      const newBalance = previousBalance + amount;

      // Use WIB timezone (GMT+7) for Indonesian time
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const wibTime = utcTime + (7 * 3600 * 1000);
      const wibDate = new Date(wibTime);

      const rekap = await Rekap.create(
        [{
          orderId: order._id,
          amount,
          immutable: true,
          balanceSnapshot: newBalance,
          createdAt: wibDate
        }],
        { session }
      );

      order.status = 'finished';
      order.rekapId = rekap[0]._id.toString();
      order.finishedAt = wibDate;
      await order.save({ session });

      return { order, rekap: rekap[0], existed: false };
    });

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        rekap: result.rekap
      },
      message: result.existed 
        ? 'Pesanan sudah diselesaikan sebelumnya' 
        : 'Pesanan berhasil diselesaikan dan rekap dibuat'
    });

  } catch (error: any) {
    console.error('POST /api/orders/[id]/complete error:', error);

    if (error.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Gagal menyelesaikan pesanan' },
      { status: 500 }
    );
  }
}

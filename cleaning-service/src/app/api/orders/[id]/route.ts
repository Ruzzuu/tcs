// ============================================
// SINGLE ORDER API - Get, Update, Delete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Rekap from '@/lib/models/Rekap';
import { v2 as cloudinary } from 'cloudinary';
import { calculateTotal } from '@/lib/services';
import type { ServiceSelection, Discount } from '@/lib/services';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { calculateOrderTotal } from '@/lib/orderUtils';
import { runTransactionSafe } from '@/lib/db/transactions';
import mongoose from 'mongoose';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/orders/[id] - Get single order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Only allow certain fields to be updated
    const allowedFields = ['status', 'notes', 'beforePhoto', 'afterPhoto', 'finalPrice', 'proofOfWork', 'notaImage', 'discount'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle discount updates
    if ('discount' in body) {
      const order = await Order.findById(id);
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Pesanan tidak ditemukan' },
          { status: 404 }
        );
      }

      if (body.discount === null) {
        // Remove discount - use $unset to completely remove the field
        const subtotal = isFeatureEnabled('MULTI_ITEM_ORDERS') && order.items && order.items.length > 0
          ? order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)
          : (order.estimatedPrice || 0);

        const updatedOrder = await Order.findByIdAndUpdate(
          id,
          {
            $unset: { discount: "" },
            $set: {
              subtotal: subtotal,
              finalPrice: subtotal
            }
          },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedOrder) {
          return NextResponse.json(
            { success: false, error: 'Pesanan tidak ditemukan' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updatedOrder,
          message: 'Diskon berhasil dihapus'
        });
      } else {
        // Apply discount
        const discount: Discount = body.discount;
        
        if (isFeatureEnabled('MULTI_ITEM_ORDERS') && order.items && order.items.length > 0) {
          // Multi-item order: use new calculation method
          const subtotal = order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
          const pricing = calculateOrderTotal(order.items, discount);
          
          updateData.discount = discount;
          updateData.subtotal = subtotal;
          updateData.finalPrice = pricing.total;
        } else {
          // Legacy single-item order - check for required fields
          if (!order.itemType || order.quantity === undefined || !order.estimatedPrice) {
            return NextResponse.json(
              { success: false, error: 'Data pesanan tidak lengkap' },
              { status: 400 }
            );
          }
          
          const items: ServiceSelection[] = [{
            serviceKey: order.itemType,
            quantity: order.quantity,
            price: order.estimatedPrice / order.quantity
          }];

          const pricing = calculateTotal(items, discount);
          
          updateData.discount = discount;
          updateData.subtotal = pricing.subtotal;
          updateData.finalPrice = pricing.total;
        }
      }
    }

    // Set finishedAt when status changes to finished AND create Rekap
    if (updateData.status === 'finished') {
      // Use WIB timezone (GMT+7) for Indonesian time
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const wibTime = utcTime + (7 * 3600 * 1000);
      updateData.finishedAt = new Date(wibTime);
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Auto-create Rekap if status changed to finished and no rekap exists
    if (updateData.status === 'finished' && !order.rekapId) {
      try {
        const amount = order.finalPrice ?? order.subtotal ?? 0;
        
        const lastRekap = await Rekap.findOne().sort({ createdAt: -1 });
        const previousBalance = lastRekap?.balanceSnapshot ?? 0;
        const newBalance = previousBalance + amount;
        
        // Use WIB timezone for Rekap timestamp
        const now = new Date();
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const wibTime = utcTime + (7 * 3600 * 1000);
        const wibDate = new Date(wibTime);
        
        const rekap = await Rekap.create({
          orderId: order._id,
          amount,
          immutable: true,
          balanceSnapshot: newBalance,
          createdAt: order.finishedAt || wibDate
        });
        
        // Ensure backward compatibility before saving
        if (!order.subtotal) {
          order.subtotal = order.finalPrice || order.estimatedPrice || 0;
        }
        
        order.rekapId = rekap._id.toString();
        await order.save();
        
        console.log(`Auto-created Rekap for order ${order.orderNumber}: Rp ${amount.toLocaleString('id-ID')}`);
      } catch (rekapError) {
        console.error('Failed to auto-create Rekap:', rekapError);
        // Don't fail the whole request, just log the error
      }
    }

    // Update Rekap if discount/finalPrice changed on a finished order with existing Rekap
    if (order.status === 'finished' && order.rekapId && ('discount' in body || 'finalPrice' in body)) {
      try {
        const newAmount = order.finalPrice ?? order.subtotal ?? 0;
        const currentRekap = await Rekap.findById(order.rekapId);
        
        if (currentRekap && currentRekap.amount !== newAmount) {
          const oldAmount = currentRekap.amount;
          const amountDifference = newAmount - oldAmount;
          
          console.log(`🔄 Updating Rekap for order ${order.orderNumber}: Rp ${oldAmount.toLocaleString('id-ID')} → Rp ${newAmount.toLocaleString('id-ID')} (${amountDifference > 0 ? '+' : ''}Rp ${Math.abs(amountDifference).toLocaleString('id-ID')})`);
          
          // Recalculate balance snapshots for this and all subsequent Rekap entries
          // Get all Rekap entries ordered by creation date
          const allRekaps = await Rekap.find().sort({ createdAt: 1 });
          
          let recalculate = false;
          let runningBalance = 0;
          
          for (const rekap of allRekaps) {
            if (rekap._id.toString() === currentRekap._id.toString()) {
              // Found the rekap to update - change its amount and start recalculating from here
              recalculate = true;
              rekap.amount = newAmount; // Update amount in the database copy
            }
            
            if (recalculate) {
              // Recalculate from this point forward using the updated amount
              runningBalance += rekap.amount;
              rekap.balanceSnapshot = runningBalance;
              await rekap.save();
              console.log(`  ↳ Updated balance for ${rekap._id}: amount=${rekap.amount}, balance=${runningBalance}`);
            } else {
              // Just accumulate the balance from previous entries
              runningBalance = rekap.balanceSnapshot;
            }
          }
        }
      } catch (rekapError) {
        console.error('Failed to update Rekap:', rekapError);
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: order.toObject(),
      message: 'Pesanan berhasil diperbarui'
    });
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui pesanan' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Delete order and all associated images
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    const isComplete = order.status === 'finished' || !!order.rekapId;

    console.log(`🔍 DELETE order ${order.orderNumber}: status=${order.status}, isComplete=${isComplete}, rekapId=${order.rekapId}, finalPrice=${order.finalPrice}`);

    // If order is complete and has revenue, save to Rekap before deleting
    if (isComplete) {
      // Check if rekap already exists
      if (!order.rekapId && order.finalPrice > 0) {
        try {
          // Create rekap entry with correct schema
          const rekapEntry = new Rekap({
            orderId: order._id,
            amount: order.finalPrice || order.subtotal || 0,
            immutable: true,
            balanceSnapshot: 0 // Will be updated by balance calculation logic
          });
          
          await rekapEntry.save();
          
          // Update order with rekapId (convert to string)
          order.rekapId = rekapEntry._id.toString();
          console.log(`✅ Created Rekap entry ${rekapEntry._id} for order ${order.orderNumber} (${order._id}) with amount Rp ${order.finalPrice}`);
        } catch (rekapError) {
          console.error('⚠️ Failed to create Rekap entry:', rekapError);
          // Continue with soft delete even if rekap creation fails
        }
      }

      // Soft delete
      order.deleted = true;
      order.archivedAt = new Date();
      
      // Ensure backward compatibility: set subtotal if missing
      if (!order.subtotal) {
        order.subtotal = order.finalPrice || order.estimatedPrice || 0;
      }
      
      try {
        await order.save();
        console.log(`✅ Order ${order.orderNumber} soft deleted successfully`);
      } catch (saveError) {
        console.error(`❌ Failed to save order ${order.orderNumber}:`, saveError);
        throw saveError;
      }

      return NextResponse.json({
        success: true,
        message: 'Pesanan berhasil diarsipkan. Data pendapatan tetap tersimpan di rekap.'
      });
    }

    const publicIdsToDelete: string[] = [];
    
    if (order.proofOfWork?.beforePhotos && order.proofOfWork.beforePhotos.length > 0) {
      order.proofOfWork.beforePhotos.forEach((img: any) => {
        if (img.publicId) {
          publicIdsToDelete.push(img.publicId);
        }
      });
    }
    
    if (order.proofOfWork?.afterPhotos && order.proofOfWork.afterPhotos.length > 0) {
      order.proofOfWork.afterPhotos.forEach((img: any) => {
        if (img.publicId) {
          publicIdsToDelete.push(img.publicId);
        }
      });
    }
    
    if (order.notaImage?.publicId) {
      publicIdsToDelete.push(order.notaImage.publicId);
    }

    console.log('Public IDs to delete from Cloudinary:', publicIdsToDelete);

    const deletePromises = publicIdsToDelete.map(async (publicId) => {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`Cloudinary delete result for ${publicId}:`, result);
        return result;
      } catch (error) {
        console.error(`Failed to delete image from Cloudinary: ${publicId}`, error);
        return null;
      }
    });

    await Promise.allSettled(deletePromises);

    await Order.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Pesanan dan semua gambar berhasil dihapus'
    });
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus pesanan';
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus pesanan', details: errorMessage },
      { status: 500 }
    );
  }
}

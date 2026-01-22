// ============================================
// DASHBOARD API - KPIs and Aggregations
// ============================================

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { SERVICE_COLORS } from '@/lib/services';
import { ServiceType } from '@/types';

// GET /api/dashboard - Get dashboard data
export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all aggregations in parallel
    const [
      kpiResult,
      unverifiedCount,
      serviceDistribution,
      incomeTrend,
      recentOrders
    ] = await Promise.all([
      // KPI counts (only verified orders, exclude deleted)
      Order.aggregate([
        { $match: { 'verification.status': 'approved', deleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
            },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            finished: {
              $sum: { 
                $cond: [
                  { $in: ['$status', ['finished', 'picked_up']] }, 
                  1, 
                  0
                ] 
              }
            }
          }
        }
      ]),

      // Unverified count (for pending verification badge, exclude deleted)
      Order.countDocuments({ 'verification.status': 'unverified', deleted: { $ne: true } }),

      // Service distribution pie chart - count all individual items (exclude deleted)
      Order.aggregate([
        { $match: { 'verification.status': 'approved', deleted: { $ne: true } } },
        {
          $project: {
            // Expand items array if exists, otherwise create single item from legacy fields
            itemsToCount: {
              $cond: {
                if: { $and: [{ $isArray: '$items' }, { $gt: [{ $size: '$items' }, 0] }] },
                then: '$items',
                else: [{
                  serviceType: '$itemType',
                  quantity: { $ifNull: ['$quantity', 1] }
                }]
              }
            }
          }
        },
        { $unwind: '$itemsToCount' },
        {
          $group: {
            _id: '$itemsToCount.serviceType',
            count: { $sum: { $ifNull: ['$itemsToCount.quantity', 1] } }
          }
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            value: '$count'
          }
        },
        { $sort: { value: -1 } }
      ]),

      // Income trend (last 7 days, only finished orders, exclude deleted)
      Order.aggregate([
        {
          $match: {
            'verification.status': 'approved',
            status: 'finished',
            finishedAt: { $gte: sevenDaysAgo },
            deleted: { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$finishedAt' }
            },
            amount: {
              $sum: { $ifNull: ['$finalPrice', '$estimatedPrice'] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Recent orders (last 10 verified, exclude deleted)
      Order.find({ 'verification.status': 'approved', deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    // Process KPI data
    const kpiData = kpiResult[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      delivered: 0,
      finished: 0
    };

    // Add colors to service distribution
    const serviceDistributionWithColors = serviceDistribution.map(item => ({
      ...item,
      color: SERVICE_COLORS[item.name as ServiceType] || '#666666'
    }));

    // Format income trend with day names
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const incomeTrendFormatted = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const found = incomeTrend.find(d => d._id === dateStr);
      
      incomeTrendFormatted.push({
        day: days[date.getDay()],
        date: dateStr,
        amount: found?.amount || 0
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        total: kpiData.total,
        pending: kpiData.pending,
        inProgress: kpiData.inProgress,
        delivered: kpiData.delivered || 0,
        finished: kpiData.finished,
        unverified: unverifiedCount,
        serviceDistribution: serviceDistributionWithColors,
        incomeTrend: incomeTrendFormatted,
        recentOrders
      }
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data dashboard' },
      { status: 500 }
    );
  }
}

// ============================================
// DASHBOARD API - KPIs and Aggregations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { SERVICE_COLORS } from '@/lib/services';
import { ServiceType } from '@/types';

// GET /api/dashboard - Get dashboard data with pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const statusFilter = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sort') || 'createdAt:desc';

    // Parse sort
    const [sortField, sortOrder] = sortBy.split(':');
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build filter for orders list
    const ordersFilter: any = { 
      'verification.status': 'approved', 
      deleted: { $ne: true } 
    };
    if (statusFilter !== 'all') {
      ordersFilter.status = statusFilter;
    }

    // Run all aggregations in parallel
    const [
      kpiResult,
      serviceDistribution,
      incomeTrend,
      totalOrders,
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
            pickedUp: {
              $sum: { $cond: [{ $eq: ['$status', 'picked_up'] }, 1, 0] }
            },
            finished: {
              $sum: { $cond: [{ $eq: ['$status', 'finished'] }, 1, 0] }
            }
          }
        }
      ]),

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

      // Total orders count for pagination
      Order.countDocuments(ordersFilter),

      // Recent orders with pagination (verified, exclude deleted)
      Order.find(ordersFilter)
        .sort({ [sortField]: sortDirection })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    // Process KPI data
    const kpiData = kpiResult[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      delivered: 0,
      pickedUp: 0,
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

    const totalPages = Math.ceil(totalOrders / limit);

    return NextResponse.json({
      success: true,
      data: {
        total: kpiData.total,
        pending: kpiData.pending,
        inProgress: kpiData.inProgress,
        delivered: kpiData.delivered || 0,
        pickedUp: kpiData.pickedUp || 0,
        finished: kpiData.finished,
        serviceDistribution: serviceDistributionWithColors,
        incomeTrend: incomeTrendFormatted,
        recentOrders
      },
      meta: {
        total: totalOrders,
        page,
        limit,
        totalPages
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

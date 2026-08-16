// ============================================
// DASHBOARD API - KPIs and Aggregations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { SERVICES, SERVICE_COLORS } from '@/lib/services';
import { ServiceType } from '@/types';
import { isAdminAuthenticated } from '@/lib/adminAuth';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/dashboard - Get dashboard data with pagination
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
    const statusFilter = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sort') || 'createdAt:desc';
    const requestType = searchParams.get('type') || 'all'; // 'all' | 'analytics' | 'orders'
    const search = searchParams.get('search')?.trim().slice(0, 100) || '';
    const date = searchParams.get('date')?.trim() || '';

    // Parse sort
    const [requestedSortField, sortOrder] = sortBy.split(':');
    const sortField = requestedSortField === 'finishedAt' ? 'finishedAt' : 'createdAt';
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

    if (search) {
      const escapedSearch = escapeRegex(search);
      const searchRegex = new RegExp(escapedSearch, 'i');
      const normalizedSearch = search.toLowerCase();
      const matchingServiceTypes = Object.entries(SERVICES)
        .filter(([serviceType, service]) =>
          serviceType.toLowerCase().includes(normalizedSearch) ||
          service.name.toLowerCase().includes(normalizedSearch) ||
          service.nameEn.toLowerCase().includes(normalizedSearch)
        )
        .map(([serviceType]) => serviceType);

      ordersFilter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { orderNumber: searchRegex },
        { notes: searchRegex },
        { customItemType: searchRegex },
        { 'items.notes': searchRegex },
        { 'items.customItemType': searchRegex },
        ...(matchingServiceTypes.length > 0
          ? [
              { itemType: { $in: matchingServiceTypes } },
              { 'items.serviceType': { $in: matchingServiceTypes } },
            ]
          : []),
      ];
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const startDate = new Date(`${date}T00:00:00.000+07:00`);
      if (!Number.isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        ordersFilter.createdAt = { $gte: startDate, $lt: endDate };
      }
    }

    const analyticsMatch = { 'verification.status': 'approved', deleted: { $ne: true } };

    // Run analytics queries only when needed
    let kpiResult: any[] = [];
    let serviceDistribution: any[] = [];
    let incomeTrend: any[] = [];

    if (requestType !== 'orders') {
      [kpiResult, serviceDistribution, incomeTrend] = await Promise.all([
        Order.aggregate([
          { $match: analyticsMatch },
          { $group: { _id: null, total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, finished: { $sum: { $cond: [{ $eq: ['$status', 'finished'] }, 1, 0] } } } }
        ]),
        Order.aggregate([
          { $match: analyticsMatch },
          { $project: { itemsToCount: { $cond: { if: { $and: [{ $isArray: '$items' }, { $gt: [{ $size: '$items' }, 0] }] }, then: '$items', else: [{ serviceType: '$itemType', quantity: { $ifNull: ['$quantity', 1] } }] } } } },
          { $unwind: '$itemsToCount' },
          { $group: { _id: '$itemsToCount.serviceType', count: { $sum: { $ifNull: ['$itemsToCount.quantity', 1] } } } },
          { $project: { _id: 0, name: '$_id', value: '$count' } },
          { $sort: { value: -1 } }
        ]),
        Order.aggregate([
          { $match: { 'verification.status': 'approved', status: 'finished', finishedAt: { $gte: sevenDaysAgo }, deleted: { $ne: true } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$finishedAt' } }, amount: { $sum: { $ifNull: ['$finalPrice', '$estimatedPrice'] } } } },
          { $sort: { _id: 1 } }
        ])
      ]);
    }

    // Run orders queries only when needed
    let totalOrders = 0;
    let recentOrders: any[] = [];

    if (requestType !== 'analytics') {
      [totalOrders, recentOrders] = await Promise.all([
        Order.countDocuments(ordersFilter),
        Order.find(ordersFilter)
          .select('_id orderNumber name phone items itemType customItemType quantity finalPrice estimatedPrice status createdAt finishedAt proofOfWork.beforePhotos proofOfWork.afterPhotos')
          .slice('proofOfWork.beforePhotos', 3)
          .slice('proofOfWork.afterPhotos', 3)
          .sort({ [sortField]: sortDirection })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
      ]);
    }

    // Process KPI data
    const kpiData = kpiResult[0] || {
      total: 0,
      pending: 0,
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

    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

    // Build response — analytics fields and orders fields are separate
    const analyticsPayload = requestType !== 'orders' ? {
      total: kpiData.total,
      pending: kpiData.pending,
      inProgress: kpiData.inProgress,
      delivered: kpiData.delivered || 0,
      pickedUp: kpiData.pickedUp || 0,
      finished: kpiData.finished,
      serviceDistribution: serviceDistributionWithColors,
      incomeTrend: incomeTrendFormatted,
    } : {};

    const ordersPayload = requestType !== 'analytics' ? { recentOrders } : {};

    return NextResponse.json({
      success: true,
      data: { ...analyticsPayload, ...ordersPayload },
      ...(requestType !== 'analytics' ? {
        meta: { total: totalOrders, page, limit, totalPages }
      } : {})
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data dashboard' },
      { status: 500 }
    );
  }
}

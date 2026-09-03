// ============================================
// DASHBOARD API - KPIs and Aggregations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { SERVICES, SERVICE_COLORS } from '@/lib/services';
import { DISCOVERY_SOURCE_LABELS, DISCOVERY_SOURCE_VALUES } from '@/lib/discoverySources';
import type { DiscoverySource, ServiceType } from '@/types';
import { isAdminAuthenticated } from '@/lib/adminAuth';

type KpiAggregate = {
  total: number;
  pending: number;
  finished: number;
  inProgress?: number;
  delivered?: number;
  pickedUp?: number;
};

type ServiceDistributionAggregate = {
  name: ServiceType;
  value: number;
};

type IncomeTrendAggregate = {
  _id: string;
  amount: number;
};

type DiscoverySourceAggregate = {
  distribution: Array<{ _id: DiscoverySource; count: number }>;
  summary: Array<{ totalCustomers: number; answeredCustomers: number }>;
};

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
    const serviceMonth = searchParams.get('serviceMonth')?.trim() || '';
    const serviceFlow = searchParams.get('serviceFlow')?.trim() || 'incoming';

    if (serviceFlow !== 'incoming' && serviceFlow !== 'outgoing') {
      return NextResponse.json(
        { success: false, error: 'Jenis arus layanan tidak valid' },
        { status: 400 }
      );
    }

    const serviceMonthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(serviceMonth);
    if (serviceMonth && !serviceMonthMatch) {
      return NextResponse.json(
        { success: false, error: 'Format bulan layanan tidak valid' },
        { status: 400 }
      );
    }

    // Parse sort
    const [requestedSortField, sortOrder] = sortBy.split(':');
    const sortField = requestedSortField === 'finishedAt' ? 'finishedAt' : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build filter for orders list
    const ordersFilter: Record<string, unknown> = {
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
    const serviceDistributionMatch: Record<string, unknown> = { ...analyticsMatch };

    // Incoming services use the order creation date. Outgoing services only
    // include completed orders and use the completion date.
    const serviceDateField = serviceFlow === 'outgoing' ? 'finishedAt' : 'createdAt';
    if (serviceFlow === 'outgoing') {
      serviceDistributionMatch.status = 'finished';
      serviceDistributionMatch.finishedAt = { $exists: true, $ne: null };
    }

    if (serviceMonthMatch) {
      const year = Number(serviceMonthMatch[1]);
      const month = Number(serviceMonthMatch[2]);
      const nextMonthYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+07:00`);
      const endDate = new Date(`${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000+07:00`);

      serviceDistributionMatch[serviceDateField] = { $gte: startDate, $lt: endDate };
    }

    // Run analytics queries only when needed
    let kpiResult: KpiAggregate[] = [];
    let serviceDistribution: ServiceDistributionAggregate[] = [];
    let incomeTrend: IncomeTrendAggregate[] = [];
    let discoverySourceResult: DiscoverySourceAggregate[] = [];

    const fetchIncomeTrend = () => Order.aggregate<IncomeTrendAggregate>([
      { $match: { 'verification.status': 'approved', status: 'finished', finishedAt: { $gte: sevenDaysAgo }, deleted: { $ne: true } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$finishedAt' } }, amount: { $sum: { $ifNull: ['$finalPrice', '$estimatedPrice'] } } } },
      { $sort: { _id: 1 } }
    ]);

    const fetchDiscoverySources = () => Order.aggregate<DiscoverySourceAggregate>([
      { $match: analyticsMatch },
      {
        $project: {
          customerKey: {
            $toLower: {
              $trim: { input: { $ifNull: ['$phone', ''] } }
            }
          },
          discoverySources: {
            $filter: {
              input: { $ifNull: ['$discoverySources', []] },
              as: 'source',
              cond: { $in: ['$$source', DISCOVERY_SOURCE_VALUES] }
            }
          }
        }
      },
      {
        $group: {
          _id: '$customerKey',
          sourceSelections: { $push: '$discoverySources' }
        }
      },
      {
        $project: {
          discoverySources: {
            $reduce: {
              input: '$sourceSelections',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          }
        }
      },
      {
        $facet: {
          distribution: [
            { $unwind: '$discoverySources' },
            { $group: { _id: '$discoverySources', count: { $sum: 1 } } }
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                answeredCustomers: {
                  $sum: {
                    $cond: [{ $gt: [{ $size: '$discoverySources' }, 0] }, 1, 0]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    if (requestType === 'report') {
      [incomeTrend, discoverySourceResult] = await Promise.all([
        fetchIncomeTrend(),
        fetchDiscoverySources()
      ]);
    } else if (requestType !== 'orders') {
      [kpiResult, serviceDistribution, incomeTrend, discoverySourceResult] = await Promise.all([
        Order.aggregate([
          { $match: analyticsMatch },
          { $group: { _id: null, total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, finished: { $sum: { $cond: [{ $eq: ['$status', 'finished'] }, 1, 0] } } } }
        ]),
        Order.aggregate([
          { $match: serviceDistributionMatch },
          { $project: { itemsToCount: { $cond: { if: { $and: [{ $isArray: '$items' }, { $gt: [{ $size: '$items' }, 0] }] }, then: '$items', else: [{ serviceType: '$itemType', quantity: { $ifNull: ['$quantity', 1] } }] } } } },
          { $unwind: '$itemsToCount' },
          { $group: { _id: '$itemsToCount.serviceType', count: { $sum: { $ifNull: ['$itemsToCount.quantity', 1] } } } },
          { $project: { _id: 0, name: '$_id', value: '$count' } },
          { $sort: { value: -1 } }
        ]),
        fetchIncomeTrend(),
        fetchDiscoverySources()
      ]);
    }

    // Run orders queries only when needed
    let totalOrders = 0;
    let recentOrders: unknown[] = [];

    if (requestType !== 'analytics' && requestType !== 'report') {
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

    const rawDiscoveryDistribution = discoverySourceResult[0]?.distribution || [];
    const rawDiscoverySummary = discoverySourceResult[0]?.summary?.[0] || {
      totalCustomers: 0,
      answeredCustomers: 0,
    };
    const discoverySourceSummary = {
      totalCustomers: rawDiscoverySummary.totalCustomers,
      answeredCustomers: rawDiscoverySummary.answeredCustomers,
      unansweredCustomers:
        rawDiscoverySummary.totalCustomers - rawDiscoverySummary.answeredCustomers,
    };
    const discoverySourceDistribution = DISCOVERY_SOURCE_VALUES.map((source) => {
      const count = rawDiscoveryDistribution.find(
        (item) => item._id === source
      )?.count || 0;

      return {
        source,
        label: DISCOVERY_SOURCE_LABELS[source],
        count,
        percentage: discoverySourceSummary.answeredCustomers > 0
          ? Math.round((count / discoverySourceSummary.answeredCustomers) * 100)
          : 0,
      };
    }).sort((a, b) => b.count - a.count);

    // Build response — analytics fields and orders fields are separate
    const analyticsPayload = requestType === 'report' ? {
      incomeTrend: incomeTrendFormatted,
      discoverySourceDistribution,
      discoverySourceSummary,
    } : requestType !== 'orders' ? {
      total: kpiData.total,
      pending: kpiData.pending,
      inProgress: kpiData.inProgress,
      delivered: kpiData.delivered || 0,
      pickedUp: kpiData.pickedUp || 0,
      finished: kpiData.finished,
      serviceDistribution: serviceDistributionWithColors,
      incomeTrend: incomeTrendFormatted,
      discoverySourceDistribution,
      discoverySourceSummary,
    } : {};

    const ordersPayload = requestType !== 'analytics' && requestType !== 'report'
      ? { recentOrders }
      : {};

    return NextResponse.json({
      success: true,
      data: { ...analyticsPayload, ...ordersPayload },
      ...(requestType !== 'analytics' && requestType !== 'report' ? {
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

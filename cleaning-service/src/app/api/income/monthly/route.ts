import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rekap from '@/lib/models/Rekap';
import { isAdminAuthenticated } from '@/lib/adminAuth';

// Month names in Indonesian
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember'
];

function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const requestedYear = yearParam ? parseInt(yearParam, 10) : null;

    if (yearParam && (!/^\d{4}$/.test(yearParam) || Number.isNaN(requestedYear))) {
      return NextResponse.json(
        { success: false, error: 'Invalid year parameter' },
        { status: 400 }
      );
    }

    const fetchAvailableYears = () => Rekap.aggregate([
      {
        $match: {
          immutable: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y', date: '$createdAt' }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const fetchYearlyData = (year: number) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

      return Rekap.aggregate([
        {
          $match: {
            immutable: true,
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $unwind: '$order'
        },
        {
          $match: {
            'order.deleted': { $ne: true }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$createdAt' }
            },
            total: { $sum: '$amount' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
    };

    let availableYears;
    let selectedYear = requestedYear;
    let yearlyData;

    if (selectedYear !== null) {
      [availableYears, yearlyData] = await Promise.all([
        fetchAvailableYears(),
        fetchYearlyData(selectedYear)
      ]);
    } else {
      availableYears = await fetchAvailableYears();
      const latestAvailableYear = availableYears[availableYears.length - 1]?._id;
      selectedYear = latestAvailableYear ? parseInt(latestAvailableYear, 10) : null;
      yearlyData = selectedYear !== null ? await fetchYearlyData(selectedYear) : [];
    }

    const yearsList = availableYears.map(item => parseInt(item._id, 10));
    const selectedYearData = selectedYear !== null
      ? {
        year: selectedYear,
        monthlyIncome: yearlyData
        .filter(item => {
          const [itemYear] = item._id.split('-');
          return parseInt(itemYear, 10) === selectedYear;
        })
        .map(item => {
          const [, itemMonth] = item._id.split('-');
          return {
            month: parseInt(itemMonth, 10),
            monthName: getMonthName(parseInt(itemMonth, 10)),
            amount: item.total
          };
        })
      }
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        availableYears: yearsList,
        selectedYearData
      }
    });
    
  } catch (error) {
    console.error('GET /api/income/monthly error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch yearly income data' },
      { status: 500 }
    );
  }
}

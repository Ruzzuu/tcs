import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

type MonthlyCustomerAggregate = {
  _id: string;
  newCustomers: number;
  returningCustomers: number;
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const yearParam = new URL(request.url).searchParams.get('year');
    const requestedYear = yearParam === null ? null : Number(yearParam);

    if (
      requestedYear !== null &&
      (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2100)
    ) {
      return NextResponse.json(
        { success: false, error: 'Tahun tidak valid' },
        { status: 400 }
      );
    }

    await connectDB();

    const monthlyData = await Order.aggregate<MonthlyCustomerAggregate>([
      {
        $match: {
          'verification.status': 'approved',
          deleted: { $ne: true },
          phone: { $type: 'string', $ne: '' },
          createdAt: { $type: 'date' },
        },
      },
      {
        $set: {
          rawContact: {
            $toLower: { $trim: { input: '$phone' } },
          },
        },
      },
      {
        $set: {
          compactContact: {
            $regexReplace: {
              input: '$rawContact',
              regex: /[\s()+.-]/,
              replacement: '',
            },
          },
        },
      },
      {
        $set: {
          normalizedContact: {
            $cond: [
              {
                $regexMatch: {
                  input: '$compactContact',
                  regex: /^(?:0|62)?8[0-9]{7,11}$/,
                },
              },
              {
                $switch: {
                  branches: [
                    {
                      case: { $regexMatch: { input: '$compactContact', regex: /^62/ } },
                      then: {
                        $concat: [
                          '0',
                          {
                            $substrCP: [
                              '$compactContact',
                              2,
                              { $subtract: [{ $strLenCP: '$compactContact' }, 2] },
                            ],
                          },
                        ],
                      },
                    },
                    {
                      case: { $regexMatch: { input: '$compactContact', regex: /^8/ } },
                      then: { $concat: ['0', '$compactContact'] },
                    },
                  ],
                  default: '$compactContact',
                },
              },
              '$rawContact',
            ],
          },
          activeMonth: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt',
              timezone: 'Asia/Jakarta',
            },
          },
        },
      },
      { $match: { normalizedContact: { $ne: '' } } },
      {
        $group: {
          _id: '$normalizedContact',
          firstOrderAt: { $min: '$createdAt' },
          activeMonths: { $addToSet: '$activeMonth' },
        },
      },
      { $unwind: '$activeMonths' },
      {
        $set: {
          firstOrderMonth: {
            $dateToString: {
              format: '%Y-%m',
              date: '$firstOrderAt',
              timezone: 'Asia/Jakarta',
            },
          },
        },
      },
      {
        $group: {
          _id: '$activeMonths',
          newCustomers: {
            $sum: { $cond: [{ $eq: ['$activeMonths', '$firstOrderMonth'] }, 1, 0] },
          },
          returningCustomers: {
            $sum: { $cond: [{ $ne: ['$activeMonths', '$firstOrderMonth'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const availableYears = Array.from(
      new Set(monthlyData.map((item) => Number(item._id.slice(0, 4))))
    ).filter(Number.isInteger).sort((a, b) => a - b);

    const selectedYear = requestedYear ?? availableYears.at(-1) ?? null;
    const selectedYearData = selectedYear === null ? null : {
      year: selectedYear,
      monthlyCustomers: MONTH_NAMES.map((monthName, index) => {
        const month = index + 1;
        const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
        const found = monthlyData.find((item) => item._id === monthKey);
        const newCustomers = found?.newCustomers ?? 0;
        const returningCustomers = found?.returningCustomers ?? 0;

        return {
          month,
          monthName,
          newCustomers,
          returningCustomers,
          totalCustomers: newCustomers + returningCustomers,
        };
      }),
    };

    const totals = selectedYearData?.monthlyCustomers.reduce(
      (result, month) => ({
        newCustomers: result.newCustomers + month.newCustomers,
        returningCustomers: result.returningCustomers + month.returningCustomers,
        totalCustomers: result.totalCustomers + month.totalCustomers,
      }),
      { newCustomers: 0, returningCustomers: 0, totalCustomers: 0 }
    ) ?? { newCustomers: 0, returningCustomers: 0, totalCustomers: 0 };

    return NextResponse.json({
      success: true,
      data: {
        availableYears,
        selectedYearData: selectedYearData ? { ...selectedYearData, totals } : null,
      },
    });
  } catch (error) {
    console.error('GET /api/customers/monthly error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil laporan pelanggan' },
      { status: 500 }
    );
  }
}

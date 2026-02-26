import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rekap from '@/lib/models/Rekap';

// Month names in Indonesian
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember'
];

// Get week of month (1-5) for a given date
function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  return Math.ceil(day / 7);
}

// Get month names for response
function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || '';
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    // Step 1: Get all available months for the year
    const monthlyData = await Rekap.aggregate([
      {
        $match: {
          immutable: true,
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59, 999)
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
    
    // Extract available months (1-12)
    const availableMonths = monthlyData.map(item => {
      const monthNum = parseInt(item._id.split('-')[1]);
      return monthNum;
    });
    
    // Step 2: If specific month is requested, get weekly breakdown
    let selectedMonthData = null;
    
    if (monthParam) {
      const monthNumber = parseInt(monthParam);
      
      // Validate month is available
      if (availableMonths.includes(monthNumber)) {
        const startDate = new Date(year, monthNumber - 1, 1);
        const endDate = new Date(year, monthNumber, 0, 23, 59, 59, 999);
        
        const weeklyIncome = await Rekap.aggregate([
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
            $project: {
              week: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              amount: '$amount'
            }
          },
          {
            $group: {
              _id: null,
              weeks: {
                $push: {
                  week: {
                    $let: {
                      vars: { day: { $dayOfMonth: '$createdAt' } },
                      in: { $ceil: { $divide: ['$$day', 7] } }
                    }
                  },
                  amount: '$amount'
                }
              }
            }
          },
          {
            $unwind: '$weeks'
          },
          {
            $group: {
              _id: '$weeks.week',
              amount: { $sum: '$weeks.amount' }
            }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $project: {
              _id: 0,
              week: '$_id',
              amount: 1
            }
          }
        ]);
        
        selectedMonthData = {
          month: monthNumber,
          monthName: getMonthName(monthNumber),
          year: year,
          weeklyIncome,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        year,
        availableMonths,
        selectedMonthData
      }
    });
    
  } catch (error) {
    console.error('GET /api/income/monthly error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monthly income data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rekap from '@/lib/models/Rekap';

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
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const yearlyData = await Rekap.aggregate([
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
    
    const availableYears = await Rekap.aggregate([
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
    
    const yearsList = availableYears.map(item => parseInt(item._id));
    
    let selectedYearData = null;
    
    if (yearParam) {
      const yearNumber = parseInt(yearParam);
      
      const monthlyIncome = yearlyData
        .filter(item => {
          const [itemYear, itemMonth] = item._id.split('-');
          return parseInt(itemYear) === yearNumber;
        })
        .map(item => {
          const [itemYear, itemMonth] = item._id.split('-');
          return {
            month: parseInt(itemMonth),
            monthName: getMonthName(parseInt(itemMonth)),
            amount: item.total
          };
        });
      
      selectedYearData = {
        year: yearNumber,
        monthlyIncome
      };
    }
    
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

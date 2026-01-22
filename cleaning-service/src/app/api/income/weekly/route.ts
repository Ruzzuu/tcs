import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rekap from '@/lib/models/Rekap';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Action: Get available weeks
    if (action === 'available') {
      const yearParam = searchParams.get('year');
      const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
      
      const availableWeeks = await Rekap.aggregate([
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
          $group: {
            _id: null,
            dates: { $push: '$createdAt' }
          }
        }
      ]);
      
      if (!availableWeeks.length || !availableWeeks[0].dates.length) {
        return NextResponse.json({
          success: true,
          data: {
            year,
            availableWeeks: []
          }
        });
      }
      
      // Calculate week numbers from dates
      const weekSet = new Set<number>();
      availableWeeks[0].dates.forEach((date: Date) => {
        const weekNum = getCurrentWeek(new Date(date));
        weekSet.add(weekNum);
      });
      
      const sortedWeeks = Array.from(weekSet).sort((a, b) => a - b);
      
      return NextResponse.json({
        success: true,
        data: {
          year,
          availableWeeks: sortedWeeks
        }
      });
    }
    
    // Action: Get week data
    const weekParam = searchParams.get('week');
    const yearParam = searchParams.get('year');
    
    if (!weekParam) {
      return NextResponse.json(
        { success: false, error: 'Week parameter required' },
        { status: 400 }
      );
    }
    
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    const weekNumber = parseInt(weekParam);
    
    const { startDate, endDate } = getWeekDateRange(year, weekNumber);
    
    const dailyData = await Rekap.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate
          },
          immutable: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const weekData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dailyData.find(d => d._id === dateStr);
      
      return {
        day: dayLabels[date.getDay()],
        amount: dayData?.total || 0,
        date: dateStr
      };
    });
    
    return NextResponse.json({
      success: true,
      data: {
        weekNumber,
        year,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        weekData
      }
    });
    
  } catch (error: any) {
    console.error('GET /api/income/weekly error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weekly income data' },
      { status: 500 }
    );
  }
}

function getCurrentWeek(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function getWeekDateRange(year: number, week: number): { startDate: Date; endDate: Date } {
  const startOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7 - startOfYear.getDay();
  
  const startDate = new Date(year, 0, 1 + daysToAdd);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      NEXT_PUBLIC_FEATURE_MULTI_ITEM: process.env.NEXT_PUBLIC_FEATURE_MULTI_ITEM || 'NOT SET',
      NEXT_PUBLIC_FEATURE_AUTO_MERGE: process.env.NEXT_PUBLIC_FEATURE_AUTO_MERGE || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
}

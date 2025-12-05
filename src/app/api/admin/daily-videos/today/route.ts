import { NextRequest, NextResponse } from 'next/server';

// GET - Get today's day of year number
export async function GET(request: NextRequest) {
  try {
    // Calculate today's day of year (1-365)
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      dayOfYear,
      date: today.toISOString(),
      dateFormatted: today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  } catch (error: any) {
    console.error('Get today error:', error);
    return NextResponse.json(
      { message: 'Failed to get today\'s day', error: error.message },
      { status: 500 }
    );
  }
}


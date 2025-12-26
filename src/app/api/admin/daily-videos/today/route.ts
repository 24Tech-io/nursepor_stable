import { NextRequest, NextResponse } from 'next/server';

// GET - Get today's date in dd-mm-yyyy format
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayDate = `${day}-${month}-${year}`;

    return NextResponse.json({
      date: todayDate,
      dateFormatted: today.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  } catch (error: any) {
    console.error('Get today error:', error);
    return NextResponse.json(
      { message: 'Failed to get today\'s date', error: error.message },
      { status: 500 }
    );
  }
}





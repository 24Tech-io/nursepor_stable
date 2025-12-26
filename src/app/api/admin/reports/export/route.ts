import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const { format, data } = await request.json();

        if (!format || !data) {
            return NextResponse.json({ message: 'Missing format or data' }, { status: 400 });
        }

        if (format === 'csv') {
            // Generate CSV
            const headers = Object.keys(data[0] || {});
            const csvRows = [
                headers.join(','),
                ...data.map((row: any) =>
                    headers.map(header => JSON.stringify(row[header] || '')).join(',')
                )
            ];
            const csv = csvRows.join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="report-${Date.now()}.csv"`
                }
            });
        }

        if (format === 'json') {
            return new NextResponse(JSON.stringify(data, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="report-${Date.now()}.json"`
                }
            });
        }

        return NextResponse.json({ message: 'Unsupported format' }, { status: 400 });
    } catch (error) {
        logger.error('Export error:', error);
        return NextResponse.json({
            message: 'Export failed',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { format, data } = await request.json();

    if (!format || !data) {
      return NextResponse.json({ message: 'Missing format or data' }, { status: 400 });
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map((row: any) =>
          headers.map((header) => JSON.stringify(row[header] || '')).join(',')
        ),
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report-${Date.now()}.csv"`,
        },
      });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="report-${Date.now()}.json"`,
        },
      });
    }

    return NextResponse.json({ message: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        message: 'Export failed',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

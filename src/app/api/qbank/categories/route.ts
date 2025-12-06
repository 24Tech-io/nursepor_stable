import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { qbankCategories } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// Prevent build-time database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    // Fetch all categories with question counts
    const categories = await db.select().from(qbankCategories).orderBy(qbankCategories.sortOrder);

    // Get question counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const { qbankQuestions } = await import('@/lib/db/schema');
        const questions = await db
          .select()
          .from(qbankQuestions)
          .where(eq(qbankQuestions.categoryId, cat.id));

        return {
          id: cat.id,
          name: cat.name,
          parentCategoryId: cat.parentCategoryId,
          description: cat.description,
          color: cat.color,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          questionCount: questions.length,
        };
      })
    );

    return NextResponse.json({ categories: categoriesWithCounts });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch categories', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color, icon, parentCategoryId, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ message: 'Category name is required' }, { status: 400 });
    }

    const db = getDatabase();

    const [newCategory] = await db
      .insert(qbankCategories)
      .values({
        name,
        description: description || null,
        color: color || '#8B5CF6',
        icon: icon || '📁',
        parentCategoryId: parentCategoryId || null,
        sortOrder: sortOrder || 0,
      })
      .returning();

    return NextResponse.json(
      {
        category: {
          id: newCategory.id,
          name: newCategory.name,
          description: newCategory.description,
          color: newCategory.color,
          icon: newCategory.icon,
          parentCategoryId: newCategory.parentCategoryId,
          sortOrder: newCategory.sortOrder,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { message: 'Failed to create category', error: error.message },
      { status: 500 }
    );
  }
}

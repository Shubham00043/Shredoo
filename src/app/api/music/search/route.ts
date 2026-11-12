import { NextRequest, NextResponse } from 'next/server';
import { searchMusic } from '@/lib/music';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const category = (searchParams.get('category') || 'all') as any;

    const results = await searchMusic(query, category);
    const tracks =
      category === 'bollywood'
        ? results.bollywood
        : category === 'independent'
        ? results.independent
        : [...results.bollywood, ...results.independent];

    return NextResponse.json({
      success: true,
      query,
      results,
      tracks,
    });
  } catch (err: any) {
    console.error('Error in /api/music/search:', err);
    return NextResponse.json({ error: err?.message || 'Search failed' }, { status: 500 });
  }
}


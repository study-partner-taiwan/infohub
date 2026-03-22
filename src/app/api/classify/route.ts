import { NextRequest, NextResponse } from 'next/server';
import { getSourceById, saveClassification } from '@/lib/db';
import { classifyContent } from '@/lib/classifier';

// POST /api/classify - 手動觸發分類
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_id } = body;

    if (!source_id) {
      return NextResponse.json({ error: '需要 source_id' }, { status: 400 });
    }

    const source = await getSourceById(source_id);
    if (!source) {
      return NextResponse.json({ error: '找不到此來源' }, { status: 404 });
    }

    const result = await classifyContent({
      url: source.url || undefined,
      title: source.title || undefined,
      description: source.description || undefined,
      author: source.author || undefined,
      platform: source.platform,
      content_text: source.content_text || undefined,
    });

    const classification = await saveClassification({
      source_id,
      ...result,
    });

    return NextResponse.json({
      success: true,
      classification: {
        ...classification,
        subcategories: result.subcategories,
        keywords: result.keywords,
        tags: result.tags,
      },
    });
  } catch (error) {
    console.error('POST /api/classify error:', error);
    return NextResponse.json({ error: '分類失敗' }, { status: 500 });
  }
}

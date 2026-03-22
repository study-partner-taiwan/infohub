import { NextRequest, NextResponse } from 'next/server';
import { getAllSources, createSource, deleteSource, getCategories, getStats, saveClassification } from '@/lib/db';
import { extractFromUrl, parseSharedText } from '@/lib/extractor';
import { classifyContent } from '@/lib/classifier';

// GET /api/sources - 取得所有來源（支援分類篩選）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');

    if (action === 'categories') {
      const categories = await getCategories();
      return NextResponse.json({ categories });
    }

    if (action === 'stats') {
      const stats = await getStats();
      return NextResponse.json({ stats });
    }

    const sources = await getAllSources({ category, platform, limit, offset });
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('GET /api/sources error:', error);
    return NextResponse.json({ error: '無法取得資料' }, { status: 500 });
  }
}

// POST /api/sources - 新增來源（手動輸入或從分享接收）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, text, title: inputTitle, notes } = body;

    // 解析輸入（可能是 URL 或是分享文字）
    let targetUrl = url;
    let extraDescription = notes || '';

    if (text) {
      const parsed = parseSharedText(text);
      if (!targetUrl && parsed.url) {
        targetUrl = parsed.url;
      }
      // 保留分享文字作為描述（例如 Instagram 分享時附帶的文字）
      if (parsed.description) {
        extraDescription = extraDescription ? `${extraDescription} ${parsed.description}` : parsed.description;
      }
    }

    if (!targetUrl) {
      return NextResponse.json({ error: '請提供有效的 URL' }, { status: 400 });
    }

    // 擷取內容
    const extracted = await extractFromUrl(targetUrl);

    // 儲存來源
    const source = await createSource({
      type: extracted.type,
      platform: extracted.platform,
      title: inputTitle || extracted.title || undefined,
      url: targetUrl,
      author: extracted.author || undefined,
      description: extracted.description || extraDescription || undefined,
      content_text: extracted.content_text || extraDescription || undefined,
      thumbnail_url: extracted.thumbnail_url || undefined,
      raw_metadata: extracted.raw_metadata,
    });

    // 非同步分類（不阻塞回應）
    classifyContent({
      url: targetUrl,
      title: source.title || undefined,
      description: source.description || extraDescription || undefined,
      author: source.author || undefined,
      platform: source.platform,
      content_text: source.content_text || undefined,
    }).then(async classification => {
      try {
        await saveClassification({
          source_id: source.id,
          ...classification,
        });
        console.log(`✅ 已分類: ${source.title} → ${classification.primary_category}`);
      } catch (e) {
        console.error('分類儲存失敗:', e);
      }
    }).catch(e => {
      console.error('分類失敗:', e);
    });

    return NextResponse.json({
      success: true,
      source,
      message: '已儲存！AI 正在進行分類...',
    });
  } catch (error) {
    console.error('POST /api/sources error:', error);
    return NextResponse.json({ error: '儲存失敗' }, { status: 500 });
  }
}

// DELETE /api/sources?id=xxx - 刪除來源
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '需要 id 參數' }, { status: 400 });
    }
    await deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/sources error:', error);
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}

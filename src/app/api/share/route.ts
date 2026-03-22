import { NextRequest, NextResponse } from 'next/server';

// POST /api/share - 從 PWA Share Target 接收分享內容
// 這個端點接收從手機分享按鈕傳來的內容
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const url = formData.get('url') as string || '';
    const text = formData.get('text') as string || '';
    const title = formData.get('title') as string || '';

    // 轉發到 sources API
    const apiUrl = new URL('/api/sources', request.url);
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url || undefined, text, title: title || undefined }),
    });

    const data = await response.json();

    if (data.success) {
      // 分享成功，重導向到主頁
      return NextResponse.redirect(new URL('/?shared=success', request.url));
    } else {
      return NextResponse.redirect(new URL('/?shared=error', request.url));
    }
  } catch (error) {
    console.error('POST /api/share error:', error);
    return NextResponse.redirect(new URL('/?shared=error', request.url));
  }
}

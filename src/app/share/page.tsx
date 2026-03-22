'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ShareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('正在處理分享內容...');

  useEffect(() => {
    const url = searchParams.get('url') || '';
    const text = searchParams.get('text') || '';
    const title = searchParams.get('title') || '';

    // 從分享接收到的參數
    const shareUrl = url || extractUrl(text) || '';
    const shareText = text;

    if (!shareUrl && !shareText) {
      setStatus('error');
      setMessage('沒有收到分享內容');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    // 發送到 API
    fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: shareUrl || undefined,
        text: shareText,
        title: title || undefined,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage('已儲存！AI 正在自動分類...');
          setTimeout(() => router.push('/?shared=success'), 1500);
        } else {
          setStatus('error');
          setMessage(data.error || '儲存失敗');
          setTimeout(() => router.push('/?shared=error'), 2000);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('連線失敗');
        setTimeout(() => router.push('/?shared=error'), 2000);
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center animate-slide-up">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">H</span>
        </div>

        {/* 狀態指示器 */}
        {status === 'processing' && (
          <div className="mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          </div>
        )}
        {status === 'success' && (
          <div className="mb-4 text-4xl">✅</div>
        )}
        {status === 'error' && (
          <div className="mb-4 text-4xl">❌</div>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {status === 'processing' && '接收分享內容'}
          {status === 'success' && '儲存成功！'}
          {status === 'error' && '儲存失敗'}
        </h2>
        <p className="text-sm text-gray-500">{message}</p>

        {/* 顯示分享的 URL */}
        {searchParams.get('url') && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">分享的連結</p>
            <p className="text-xs text-gray-600 truncate">
              {searchParams.get('url') || extractUrl(searchParams.get('text') || '')}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6">即將自動跳轉到主頁面...</p>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}

function extractUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s]+)/i);
  return match ? match[1] : null;
}

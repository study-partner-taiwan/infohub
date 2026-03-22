'use client';

import { useState } from 'react';

export function AddSourceModal({
  onAdd,
  onClose,
}: {
  onAdd: (url: string, notes?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      await onAdd(url.trim(), notes.trim() || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 彈窗 */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 animate-slide-up shadow-xl">
        {/* 手機拖曳指示器 */}
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">新增資訊</h2>
        <p className="text-sm text-gray-500 mb-5">貼上 Instagram、YouTube 或任何網頁連結</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">連結 URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              autoFocus
              required
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              備註 <span className="text-gray-400 font-normal">(選填)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="描述一下這個內容..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* 快速範例 */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-xs text-gray-400">支援平台：</span>
            {['Instagram', 'YouTube', 'Twitter/X', 'TikTok', 'Reddit', '任何網頁'].map((p) => (
              <span key={p} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {p}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  處理中...
                </>
              ) : (
                <>儲存並分類</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

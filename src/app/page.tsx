'use client';

import { useState, useEffect, useCallback } from 'react';
import { SourceCard } from '@/components/SourceCard';
import { AddSourceModal } from '@/components/AddSourceModal';
import { CategoryFilter } from '@/components/CategoryFilter';
import { StatsBar } from '@/components/StatsBar';
import { Header } from '@/components/Header';
import { Toast } from '@/components/Toast';

interface Source {
  id: string;
  type: string;
  platform: string;
  title: string | null;
  url: string | null;
  author: string | null;
  description: string | null;
  content_text: string | null;
  thumbnail_url: string | null;
  created_at: string;
  primary_category: string | null;
  subcategories: string[];
  keywords: string[];
  tags: string[];
  confidence: number | null;
  summary: string | null;
  one_line: string | null;
  key_points: string[];
  core_topics: string[];
  key_terms: string[];
  main_arguments: string[];
}

export default function HomePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, classified: 0, categories: 0 });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      const res = await fetch(`/api/sources?${params}`);
      const data = await res.json();
      setSources(data.sources || []);
    } catch (e) {
      console.error('載入失敗:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/sources?action=categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) {
      console.error('載入分類失敗:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/sources?action=stats');
      const data = await res.json();
      setStats(data.stats || { total: 0, classified: 0, categories: 0 });
    } catch (e) {
      console.error('載入統計失敗:', e);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchCategories();
    fetchStats();
  }, [fetchSources]);

  // 檢查是否從分享跳轉回來
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === 'success') {
      setToast({ message: '已成功儲存！AI 正在分類中...', type: 'success' });
      window.history.replaceState({}, '', '/');
      // 延遲重新載入以等待分類完成
      setTimeout(() => {
        fetchSources();
        fetchCategories();
        fetchStats();
      }, 3000);
    } else if (params.get('shared') === 'error') {
      setToast({ message: '儲存失敗，請重試', type: 'error' });
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleAddSource = async (url: string, notes?: string) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, notes }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '已儲存！AI 正在分類中...', type: 'success' });
        setShowAddModal(false);
        // 立即添加到列表
        fetchSources();
        // 延遲重新載入以取得分類結果
        setTimeout(() => {
          fetchSources();
          fetchCategories();
          fetchStats();
        }, 5000);
      } else {
        setToast({ message: data.error || '儲存失敗', type: 'error' });
      }
    } catch (e) {
      setToast({ message: '連線失敗', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
      setSources(sources.filter(s => s.id !== id));
      fetchCategories();
      fetchStats();
    } catch (e) {
      setToast({ message: '刪除失敗', type: 'error' });
    }
  };

  const handleReclassify = async (id: string) => {
    try {
      setToast({ message: '正在重新分類...', type: 'success' });
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '重新分類完成！', type: 'success' });
        fetchSources();
        fetchCategories();
      }
    } catch (e) {
      setToast({ message: '分類失敗', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddClick={() => setShowAddModal(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <StatsBar stats={stats} />

        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={(cat) => { setSelectedCategory(cat); setLoading(true); }}
        />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl mb-4">📡</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {selectedCategory === 'all' ? '還沒有收集任何資訊' : `「${selectedCategory}」分類中沒有內容`}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedCategory === 'all'
                ? '從 Instagram 分享內容到這裡，或點擊右上角的「+」手動新增'
                : '試試其他分類，或新增更多內容'}
            </p>
            {selectedCategory === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                新增第一筆資訊
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {sources.map((source, i) => (
              <SourceCard
                key={source.id}
                source={source}
                index={i}
                onDelete={handleDelete}
                onReclassify={handleReclassify}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddSourceModal
          onAdd={handleAddSource}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

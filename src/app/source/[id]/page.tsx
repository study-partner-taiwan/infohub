'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';

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

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📷', youtube: '▶️', twitter: '🐦', tiktok: '🎵',
  facebook: '👤', reddit: '🔥', threads: '🧵', web: '🌐',
};

// Decode HTML entities
function d(text: string | null): string {
  if (!text) return '';
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
  }
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Parse date safely
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) date = new Date(dateStr + 'Z');
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-TW');
}

// Clean IG noise from content
function cleanContent(text: string): string {
  let clean = text;
  // Remove "XX likes, XX comments - username on Date:" prefix
  clean = clean.replace(/^\d[\d,]* likes?,\s*\d[\d,]* comments?\s*-\s*\S+\s+on\s+\w+\s+\d+,?\s*\d*:\s*/i, '');
  // Remove leading quotes
  clean = clean.replace(/^[""\u201c\u201d]+/, '');
  return clean.trim();
}

export default function SourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sources`)
      .then(r => r.json())
      .then(data => {
        const found = data.sources?.find((s: Source) => s.id === params.id);
        setSource(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">找不到此項目</p>
          <button onClick={() => router.push('/')} className="text-primary-600 underline">回首頁</button>
        </div>
      </div>
    );
  }

  const icon = PLATFORM_ICONS[source.platform] || '🌐';
  const title = d(source.title);
  const author = d(source.author);
  const content = cleanContent(d(source.content_text));
  const description = cleanContent(d(source.description));
  const summary = d(source.summary);
  const timeStr = formatDate(source.created_at);

  // Short display title
  let shortTitle = title;
  const onIgIdx = shortTitle.indexOf(' on Instagram:');
  if (onIgIdx > 0) shortTitle = shortTitle.slice(0, onIgIdx);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{shortTitle || 'Untitled'}</h1>
            <p className="text-xs text-gray-400">{icon} {source.platform} {author && `· ${author}`}</p>
          </div>
          {source.url && (
            <a href={source.url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 shrink-0">
              開啟原文
            </a>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Source info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          {source.thumbnail_url && (
            <img src={source.thumbnail_url} alt="" className="w-full h-48 object-cover rounded-xl mb-4"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}

          {/* Category & time */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {source.primary_category && (
              <span className="bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1 rounded-full">
                {source.primary_category}
              </span>
            )}
            {timeStr && <span className="text-xs text-gray-400">{timeStr}</span>}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900 mb-3">{shortTitle || 'Untitled'}</h2>

          {/* Content */}
          {content && (
            <div className="bg-gray-50 rounded-xl p-4 mb-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
            </div>
          )}

          {/* Description (only if different from content) */}
          {description && description !== content && (
            <div className="bg-gray-50 rounded-xl p-4 mb-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{description}</p>
            </div>
          )}

          {/* Keywords */}
          {source.keywords && source.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {source.keywords.map((kw, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{d(kw)}</span>
              ))}
            </div>
          )}
        </div>

        {/* ===== AI ANALYSIS SECTION ===== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-sm">🔍</span>
            AI 內容分析
          </h3>

          {/* One-line summary */}
          {source.one_line && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-amber-800">{d(source.one_line)}</p>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">摘要</p>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Key Points */}
          {source.key_points && source.key_points.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">重點提取</p>
              <div className="space-y-2">
                {source.key_points.map((point, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-700">{d(point)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Topics */}
          {source.core_topics && source.core_topics.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">核心議題</p>
              <div className="flex flex-wrap gap-2">
                {source.core_topics.map((topic, i) => (
                  <span key={i} className="bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-lg">{d(topic)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Main Arguments */}
          {source.main_arguments && source.main_arguments.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">主要論點</p>
              <div className="space-y-2">
                {source.main_arguments.map((arg, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-accent-500 mt-1 shrink-0">▸</span>
                    <p className="text-sm text-gray-700">{d(arg)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Terms */}
          {source.key_terms && source.key_terms.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">關鍵術語</p>
              <div className="flex flex-wrap gap-1.5">
                {source.key_terms.map((term, i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg">{d(term)}</span>
                ))}
              </div>
            </div>
          )}

          {/* No analysis available */}
          {!source.key_points?.length && !source.core_topics?.length && !summary && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-2xl mb-2">🔑</p>
              <p className="text-sm">需要設定 Claude API Key 才能自動分析內容</p>
              <p className="text-xs mt-1">編輯 .env.local 加入 ANTHROPIC_API_KEY</p>
            </div>
          )}
        </div>

        {/* Chat Window */}
        <ChatWindow source={{
          ...source,
          title: title,
          author: author,
          description: description,
          content_text: content,
          summary: summary,
        }} />
      </main>
    </div>
  );
}

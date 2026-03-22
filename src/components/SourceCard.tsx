'use client';

import { useState } from 'react';

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

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  instagram: { label: 'Instagram', color: 'from-pink-500 to-purple-600', icon: '📷' },
  youtube: { label: 'YouTube', color: 'from-red-500 to-red-600', icon: '▶️' },
  twitter: { label: 'Twitter/X', color: 'from-blue-400 to-blue-500', icon: '🐦' },
  tiktok: { label: 'TikTok', color: 'from-gray-800 to-gray-900', icon: '🎵' },
  facebook: { label: 'Facebook', color: 'from-blue-600 to-blue-700', icon: '👤' },
  reddit: { label: 'Reddit', color: 'from-orange-500 to-orange-600', icon: '🔥' },
  threads: { label: 'Threads', color: 'from-gray-800 to-gray-900', icon: '🧵' },
  web: { label: '網頁', color: 'from-gray-500 to-gray-600', icon: '🌐' },
};

// Decode HTML entities like &#x5f35; → 張
function decodeEntities(text: string | null): string {
  if (!text) return '';
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = text;
    return el.value;
  }
  // SSR fallback
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Extract a short clean summary from long IG text
function extractSummary(source: Source): string {
  const raw = source.summary || source.description || source.content_text || '';
  const decoded = decodeEntities(raw);

  // Remove common IG noise: "XX likes, XX comments - username on Date:"
  let clean = decoded.replace(/^\d[\d,]* likes?,\s*\d[\d,]* comments?\s*-\s*\S+\s+on\s+\w+\s+\d+,?\s*\d*:\s*/i, '');
  // Remove "username on Instagram:" prefix
  clean = clean.replace(/^.*?\s+on\s+Instagram:\s*/i, '');
  // Remove leading quotes
  clean = clean.replace(/^[""\u201c\u201d]+/, '');
  // Remove hashtags
  clean = clean.replace(/#\S+/g, '').trim();
  // Remove emoji-heavy lines (instructions like 1️⃣ 2️⃣ etc)
  const lines = clean.split('\n').filter(l => l.trim());
  // Take first 2 meaningful lines
  const meaningful = lines
    .filter(l => l.trim().length > 5)
    .filter(l => !/^[\d️⃣🚀🤝💻]+/.test(l.trim()))
    .filter(l => !l.toLowerCase().includes('disclaimer'))
    .slice(0, 2);

  const result = meaningful.join(' ').trim();
  // Cap at 80 chars
  if (result.length > 80) return result.slice(0, 77) + '...';
  return result || decodeEntities(source.title || '').slice(0, 60);
}

export function SourceCard({
  source,
  index,
  onDelete,
  onReclassify,
}: {
  source: Source;
  index: number;
  onDelete: (id: string) => void;
  onReclassify: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const platform = PLATFORM_CONFIG[source.platform] || PLATFORM_CONFIG.web;
  const timeAgo = getTimeAgo(source.created_at);
  const title = decodeEntities(source.title);
  const author = decodeEntities(source.author);
  const summary = extractSummary(source);

  // Extract short display title (remove "on Instagram:" etc)
  let displayTitle = title;
  const onIgIdx = displayTitle.indexOf(' on Instagram:');
  if (onIgIdx > 0) displayTitle = displayTitle.slice(0, onIgIdx);
  if (displayTitle.length > 50) displayTitle = displayTitle.slice(0, 47) + '...';

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 animate-fade-in group cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => window.location.href = `/source/${source.id}`}
    >
      {/* Thumbnail or platform banner */}
      {source.thumbnail_url ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={source.thumbnail_url}
            alt={displayTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute top-3 left-3">
            <PlatformBadge platform={platform} />
          </div>
        </div>
      ) : (
        <div className={`h-20 bg-gradient-to-r ${platform.color} flex items-center justify-between px-4`}>
          <PlatformBadge platform={platform} />
          <span className="text-3xl opacity-30">{platform.icon}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Category tag */}
        <div className="flex items-center gap-2 mb-2">
          {source.primary_category ? (
            <span className="bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {source.primary_category}
            </span>
          ) : (
            <span className="bg-yellow-50 text-yellow-700 text-xs font-medium px-2.5 py-1 rounded-full animate-pulse">
              分類中...
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">
          {displayTitle || '未知內容'}
        </h3>

        {/* === KEY SUMMARY BLOCK === */}
        {summary && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3">
            <p className="text-xs font-medium text-amber-700 mb-0.5">📌 重點摘要</p>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Author & time */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {author && <span>{author}</span>}
            <span>{timeAgo}</span>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                <div className="absolute right-0 bottom-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36 animate-fade-in">
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                    >
                      <span>🔗</span> 開啟原始連結
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onReclassify(source.id); setShowMenu(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <span>🔄</span> 重新分類
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(source.id); setShowMenu(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <span>🗑️</span> 刪除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Keywords */}
        {source.keywords && source.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-50">
            {source.keywords.slice(0, 4).map((kw, i) => (
              <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                #{decodeEntities(kw)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: { label: string; color: string; icon: string } }) {
  return (
    <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full text-gray-700 shadow-sm">
      {platform.icon} {platform.label}
    </span>
  );
}

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  // Handle ISO strings with or without Z
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    date = new Date(dateStr + 'Z');
  }
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-TW');
}

'use client';

const CATEGORY_ICONS: Record<string, string> = {
  '全部': '🌐',
  '美食料理': '🍳',
  '旅遊探險': '✈️',
  '時尚穿搭': '👗',
  '美妝保養': '💄',
  '健身運動': '💪',
  '科技數位': '💻',
  '攝影藝術': '📸',
  '音樂舞蹈': '🎵',
  '寵物動物': '🐾',
  '家居生活': '🏠',
  '教育學習': '📚',
  '商業理財': '💰',
  '娛樂搞笑': '😂',
  '新聞時事': '📰',
  '手作DIY': '🎨',
  '遊戲電競': '🎮',
  '親子育兒': '👶',
  '心靈成長': '🧘',
  '自然風景': '🌿',
  '其他': '📌',
};

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: {
  categories: { category: string; count: number }[];
  selected: string;
  onSelect: (category: string) => void;
}) {
  const allCount = categories.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onSelect('all')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selected === 'all'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          <span>🌐</span>
          <span>全部</span>
          {allCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selected === 'all' ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {allCount}
            </span>
          )}
        </button>

        {categories.map(({ category, count }) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selected === category
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            <span>{CATEGORY_ICONS[category] || '📌'}</span>
            <span>{category}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selected === category ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

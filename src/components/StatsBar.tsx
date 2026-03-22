'use client';

export function StatsBar({ stats }: { stats: { total: number; classified: number; categories: number } }) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="text-2xl font-bold text-primary-700">{stats.total}</div>
        <div className="text-xs text-gray-500 mt-0.5">收集的資訊</div>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="text-2xl font-bold text-accent-500">{stats.classified}</div>
        <div className="text-xs text-gray-500 mt-0.5">已分類</div>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="text-2xl font-bold text-amber-500">{stats.categories}</div>
        <div className="text-xs text-gray-500 mt-0.5">分類數</div>
      </div>
    </div>
  );
}

'use client';

export function Header({ onAddClick }: { onAddClick: () => void }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">H</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">InfoHub</h1>
              <p className="text-xs text-gray-500 -mt-0.5">資訊聚合平台</p>
            </div>
          </div>

          <button
            onClick={onAddClick}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新增
          </button>
        </div>
      </div>
    </header>
  );
}

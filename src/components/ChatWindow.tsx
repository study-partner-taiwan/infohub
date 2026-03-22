'use client';

import { useState, useRef, useEffect } from 'react';

interface SourceData {
  title?: string | null;
  platform?: string;
  author?: string | null;
  primary_category?: string | null;
  summary?: string | null;
  description?: string | null;
  content_text?: string | null;
  url?: string | null;
  keywords?: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { id: 'summarize', label: '📝 摘要整理', prompt: '請幫我整理這個內容的重點摘要，用繁體中文回答。' },
  { id: 'actions',   label: '💡 行動建議', prompt: '根據這個內容，給我具體可以執行的行動建議，用繁體中文回答。' },
  { id: 'document',  label: '📄 產生報告', prompt: '根據這個內容，產生一份結構化的報告，用繁體中文回答。' },
  { id: 'discuss',   label: '💬 深度討論', prompt: '我想深入討論這個內容，請分析它的優缺點和潛在價值，用繁體中文回答。' },
];

export function ChatWindow({ source }: { source: SourceData }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = async (userText: string) => {
    if (!userText.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInput('');
    setLoading(true);
    setNoKey(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          source_id: (source as Record<string, unknown>).id || undefined,
          history: messages.slice(-10),
        }),
      });
      const data = await res.json();

      if (data.reply?.includes('API Key')) {
        setNoKey(true);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '連線失敗，請確認伺服器正在運行。' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-600 to-accent-500">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">AI</span>
          Claude AI 助手
        </h3>
        <p className="text-white/70 text-xs mt-1">直接跟 Claude 討論這筆收集的內容</p>
      </div>

      {/* Quick actions (show when no messages yet) */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-gray-50">
          <p className="text-xs text-gray-400 font-medium mb-3">快速操作：</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => sendChat(action.prompt)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-primary-50 hover:text-primary-700 rounded-xl text-sm text-gray-600 transition-colors disabled:opacity-50 text-left"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* API Key warning */}
      {noKey && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs font-medium text-amber-700 mb-1">需要設定 Claude API Key</p>
          <p className="text-xs text-amber-600">
            編輯 infohub 資料夾中的 <code className="bg-amber-100 px-1 rounded">.env.local</code>，加入：
          </p>
          <p className="text-xs text-amber-800 font-mono mt-1 bg-amber-100 p-2 rounded">
            ANTHROPIC_API_KEY=sk-ant-你的金鑰
          </p>
          <p className="text-xs text-amber-600 mt-1">
            從 <a href="https://console.anthropic.com" target="_blank" className="underline">console.anthropic.com</a> 取得（每次對話約 NT$1-3）
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 text-sm py-8">
            <p className="text-3xl mb-3">💬</p>
            <p>點擊上方快速操作，或在下方輸入問題</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-md'
                : 'bg-gray-50 text-gray-800 rounded-bl-md border border-gray-100'
            }`}>
              {msg.role === 'assistant' ? (
                <MarkdownContent content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(input); } }}
            placeholder="問任何關於這筆內容的問題..."
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => sendChat(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-3 text-xs overflow-x-auto my-2"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-primary-700">$1</code>')
    .replace(/### (.+)/g, '<h3 class="font-bold text-base mt-3 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="font-bold text-lg mt-4 mb-2">$1</h2>')
    .replace(/# (.+)/g, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  return <div dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${html}</p>` }} />;
}

import { kv } from '@vercel/kv';

// 使用 Vercel KV (Redis) 作為雲端資料庫
// 資料結構：
//   sources:{id} → Source object
//   sources:list → sorted set (score = timestamp)
//   classifications:{source_id} → Classification object
//   categories:count → hash { category: count }

export interface Source {
  id: string;
  type: string;
  platform: string;
  title: string | null;
  url: string | null;
  author: string | null;
  description: string | null;
  content_text: string | null;
  thumbnail_url: string | null;
  raw_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Classification {
  id: string;
  source_id: string;
  primary_category: string;
  subcategories: string[];
  keywords: string[];
  tags: string[];
  confidence: number;
  summary: string | null;
  one_line: string | null;
  key_points: string[];
  core_topics: string[];
  key_terms: string[];
  main_arguments: string[];
  classified_at: string;
}

export interface SourceWithClassification extends Source {
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

function generateId(): string {
  return crypto.randomUUID();
}

export async function createSource(data: {
  type?: string;
  platform?: string;
  title?: string;
  url?: string;
  author?: string;
  description?: string;
  content_text?: string;
  thumbnail_url?: string;
  raw_metadata?: Record<string, unknown>;
}): Promise<Source> {
  const now = new Date().toISOString();
  const source: Source = {
    id: generateId(),
    type: data.type || 'web',
    platform: data.platform || 'unknown',
    title: data.title || null,
    url: data.url || null,
    author: data.author || null,
    description: data.description || null,
    content_text: data.content_text || null,
    thumbnail_url: data.thumbnail_url || null,
    raw_metadata: data.raw_metadata || null,
    created_at: now,
    updated_at: now,
  };

  // 儲存 source 物件
  await kv.set(`sources:${source.id}`, source);
  // 加入排序列表（用時間戳排序）
  await kv.zadd('sources:list', { score: Date.now(), member: source.id });

  return source;
}

export async function saveClassification(data: {
  source_id: string;
  primary_category: string;
  subcategories?: string[];
  keywords?: string[];
  tags?: string[];
  confidence?: number;
  summary?: string;
  one_line?: string;
  key_points?: string[];
  core_topics?: string[];
  key_terms?: string[];
  main_arguments?: string[];
}): Promise<Classification> {
  const classification: Classification = {
    id: generateId(),
    source_id: data.source_id,
    primary_category: data.primary_category,
    subcategories: data.subcategories || [],
    keywords: data.keywords || [],
    tags: data.tags || [],
    confidence: data.confidence || 0,
    summary: data.summary || null,
    one_line: data.one_line || null,
    key_points: data.key_points || [],
    core_topics: data.core_topics || [],
    key_terms: data.key_terms || [],
    main_arguments: data.main_arguments || [],
    classified_at: new Date().toISOString(),
  };

  await kv.set(`classifications:${data.source_id}`, classification);

  return classification;
}

export async function getAllSources(options?: {
  category?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<SourceWithClassification[]> {
  const { category, platform, limit = 50, offset = 0 } = options || {};

  // 取得所有 source ID（按時間倒序）
  const ids = await kv.zrange('sources:list', 0, -1, { rev: true }) as string[];

  if (!ids || ids.length === 0) return [];

  // 批次取得所有 sources
  const pipeline = kv.pipeline();
  for (const id of ids) {
    pipeline.get(`sources:${id}`);
  }
  const sourcesRaw = await pipeline.exec();

  // 批次取得所有 classifications
  const clsPipeline = kv.pipeline();
  for (const id of ids) {
    clsPipeline.get(`classifications:${id}`);
  }
  const classificationsRaw = await clsPipeline.exec();

  let results: SourceWithClassification[] = [];

  for (let i = 0; i < ids.length; i++) {
    const source = sourcesRaw[i] as Source | null;
    if (!source) continue;

    const cls = classificationsRaw[i] as Classification | null;

    results.push({
      ...source,
      primary_category: cls?.primary_category || null,
      subcategories: cls?.subcategories || [],
      keywords: cls?.keywords || [],
      tags: cls?.tags || [],
      confidence: cls?.confidence || null,
      summary: cls?.summary || null,
      one_line: cls?.one_line || null,
      key_points: cls?.key_points || [],
      core_topics: cls?.core_topics || [],
      key_terms: cls?.key_terms || [],
      main_arguments: cls?.main_arguments || [],
    });
  }

  // 篩選
  if (category && category !== 'all') {
    results = results.filter(s => s.primary_category === category);
  }
  if (platform && platform !== 'all') {
    results = results.filter(s => s.platform === platform);
  }

  return results.slice(offset, offset + limit);
}

export async function getSourceById(id: string): Promise<SourceWithClassification | undefined> {
  const source = await kv.get<Source>(`sources:${id}`);
  if (!source) return undefined;

  const cls = await kv.get<Classification>(`classifications:${id}`);

  return {
    ...source,
    primary_category: cls?.primary_category || null,
    subcategories: cls?.subcategories || [],
    keywords: cls?.keywords || [],
    tags: cls?.tags || [],
    confidence: cls?.confidence || null,
    summary: cls?.summary || null,
    one_line: cls?.one_line || null,
    key_points: cls?.key_points || [],
    core_topics: cls?.core_topics || [],
    key_terms: cls?.key_terms || [],
    main_arguments: cls?.main_arguments || [],
  };
}

export async function deleteSource(id: string): Promise<void> {
  await kv.del(`sources:${id}`);
  await kv.del(`classifications:${id}`);
  await kv.zrem('sources:list', id);
}

export async function getCategories(): Promise<{ category: string; count: number }[]> {
  // 遍歷所有 classifications 統計分類
  const ids = await kv.zrange('sources:list', 0, -1) as string[];
  if (!ids || ids.length === 0) return [];

  const pipeline = kv.pipeline();
  for (const id of ids) {
    pipeline.get(`classifications:${id}`);
  }
  const results = await pipeline.exec();

  const counts: Record<string, number> = {};
  for (const cls of results) {
    if (cls && (cls as Classification).primary_category) {
      const cat = (cls as Classification).primary_category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getStats(): Promise<{ total: number; classified: number; categories: number }> {
  const totalCount = await kv.zcard('sources:list');

  const ids = await kv.zrange('sources:list', 0, -1) as string[];
  if (!ids || ids.length === 0) {
    return { total: 0, classified: 0, categories: 0 };
  }

  const pipeline = kv.pipeline();
  for (const id of ids) {
    pipeline.get(`classifications:${id}`);
  }
  const results = await pipeline.exec();

  let classified = 0;
  const categorySet = new Set<string>();
  for (const cls of results) {
    if (cls && (cls as Classification).primary_category) {
      classified++;
      categorySet.add((cls as Classification).primary_category);
    }
  }

  return {
    total: totalCount || 0,
    classified,
    categories: categorySet.size,
  };
}

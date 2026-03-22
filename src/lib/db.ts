import { put, list, del } from '@vercel/blob';

// 使用 Vercel Blob 作為雲端資料庫
// 將整個 DB 存成一個 JSON blob 檔案

const DB_BLOB_NAME = 'infohub-db.json';

interface DbSchema {
  sources: Source[];
  classifications: Classification[];
}

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

async function readDb(): Promise<DbSchema> {
  try {
    const { blobs } = await list({ prefix: DB_BLOB_NAME });
    if (blobs.length === 0) {
      return { sources: [], classifications: [] };
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(blobs[0].url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      console.log('readDb fetch failed:', response.status, response.statusText);
      return { sources: [], classifications: [] };
    }
    return await response.json();
  } catch (e) {
    console.log('readDb error:', e);
    return { sources: [], classifications: [] };
  }
}

async function writeDb(data: DbSchema): Promise<void> {
  await put(DB_BLOB_NAME, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
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
  const db = await readDb();
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
  db.sources.push(source);
  await writeDb(db);
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
  const db = await readDb();
  db.classifications = db.classifications.filter(c => c.source_id !== data.source_id);
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
  db.classifications.push(classification);
  await writeDb(db);
  return classification;
}

export async function getAllSources(options?: {
  category?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<SourceWithClassification[]> {
  const db = await readDb();
  const { category, platform, limit = 50, offset = 0 } = options || {};

  let results: SourceWithClassification[] = db.sources
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(source => {
      const cls = db.classifications.find(c => c.source_id === source.id);
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
    });

  if (category && category !== 'all') {
    results = results.filter(s => s.primary_category === category);
  }
  if (platform && platform !== 'all') {
    results = results.filter(s => s.platform === platform);
  }

  return results.slice(offset, offset + limit);
}

export async function getSourceById(id: string): Promise<SourceWithClassification | undefined> {
  const db = await readDb();
  const source = db.sources.find(s => s.id === id);
  if (!source) return undefined;
  const cls = db.classifications.find(c => c.source_id === id);
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
  const db = await readDb();
  db.sources = db.sources.filter(s => s.id !== id);
  db.classifications = db.classifications.filter(c => c.source_id !== id);
  await writeDb(db);
}

export async function getCategories(): Promise<{ category: string; count: number }[]> {
  const db = await readDb();
  const counts: Record<string, number> = {};
  for (const c of db.classifications) {
    counts[c.primary_category] = (counts[c.primary_category] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getStats(): Promise<{ total: number; classified: number; categories: number }> {
  const db = await readDb();
  const categories = new Set(db.classifications.map(c => c.primary_category));
  return {
    total: db.sources.length,
    classified: db.classifications.length,
    categories: categories.size,
  };
}

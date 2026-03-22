import fs from 'fs';
import path from 'path';

// 使用 JSON 檔案作為簡易資料庫（開發/個人使用足夠）
// 生產環境建議替換為 PostgreSQL

const DB_PATH = process.env.DATABASE_PATH || './data/infohub.json';

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

function ensureDbExists(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ sources: [], classifications: [] }, null, 2));
  }
}

function readDb(): DbSchema {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { sources: [], classifications: [] };
  }
}

function writeDb(data: DbSchema): void {
  ensureDbExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return crypto.randomUUID();
}

export function createSource(data: {
  type?: string;
  platform?: string;
  title?: string;
  url?: string;
  author?: string;
  description?: string;
  content_text?: string;
  thumbnail_url?: string;
  raw_metadata?: Record<string, unknown>;
}): Source {
  const db = readDb();
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
  writeDb(db);
  return source;
}

export function saveClassification(data: {
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
}): Classification {
  const db = readDb();
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
  writeDb(db);
  return classification;
}

export function getAllSources(options?: {
  category?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): SourceWithClassification[] {
  const db = readDb();
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

export function getSourceById(id: string): SourceWithClassification | undefined {
  const db = readDb();
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

export function deleteSource(id: string): void {
  const db = readDb();
  db.sources = db.sources.filter(s => s.id !== id);
  db.classifications = db.classifications.filter(c => c.source_id !== id);
  writeDb(db);
}

export function getCategories(): { category: string; count: number }[] {
  const db = readDb();
  const counts: Record<string, number> = {};
  for (const c of db.classifications) {
    counts[c.primary_category] = (counts[c.primary_category] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function getStats(): { total: number; classified: number; categories: number } {
  const db = readDb();
  const categories = new Set(db.classifications.map(c => c.primary_category));
  return {
    total: db.sources.length,
    classified: db.classifications.length,
    categories: categories.size,
  };
}

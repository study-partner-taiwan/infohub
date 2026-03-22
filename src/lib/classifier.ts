import Anthropic from '@anthropic-ai/sdk';

const CATEGORIES = [
  '美食料理', '旅遊探險', '時尚穿搭', '美妝保養',
  '健身運動', '科技數位', '攝影藝術', '音樂舞蹈',
  '寵物動物', '家居生活', '教育學習', '商業理財',
  '娛樂搞笑', '新聞時事', '手作DIY', '遊戲電競',
  '親子育兒', '心靈成長', '自然風景', '其他',
];

export interface ClassificationResult {
  primary_category: string;
  subcategories: string[];
  keywords: string[];
  tags: string[];
  confidence: number;
  summary: string;
  // New: rich analysis fields
  key_points: string[];
  core_topics: string[];
  key_terms: string[];
  main_arguments: string[];
  one_line: string;
}

export async function classifyContent(data: {
  url?: string;
  title?: string;
  description?: string;
  author?: string;
  platform?: string;
  content_text?: string;
}): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallbackClassify(data);
  }

  try {
    const client = new Anthropic({ apiKey });

    const contentDescription = [
      data.title && `Title: ${data.title}`,
      data.author && `Author: ${data.author}`,
      data.platform && `Platform: ${data.platform}`,
      data.description && `Description: ${data.description}`,
      data.content_text && `Content: ${data.content_text.slice(0, 3000)}`,
      data.url && `URL: ${data.url}`,
    ].filter(Boolean).join('\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a content analysis expert. Analyze the following social media content thoroughly.

Content:
${contentDescription}

Available categories:
${CATEGORIES.join(', ')}

Reply in JSON only (no markdown code blocks). All text in Traditional Chinese:
{
  "primary_category": "best matching category from the list above",
  "subcategories": ["sub-category 1", "sub-category 2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85,
  "one_line": "One sentence summary of this content (under 30 chars)",
  "summary": "2-3 sentence summary explaining what this content is about and why it matters",
  "key_points": [
    "Key point 1: the most important takeaway",
    "Key point 2: second important point",
    "Key point 3: third point"
  ],
  "core_topics": ["Core topic 1", "Core topic 2", "Core topic 3"],
  "key_terms": ["Important term 1", "Term 2", "Term 3"],
  "main_arguments": [
    "Main argument or claim 1",
    "Main argument or claim 2"
  ]
}

Rules:
- primary_category MUST be from the category list
- one_line: very short, like a headline (under 30 Traditional Chinese characters)
- summary: 2-3 sentences explaining the content
- key_points: 2-5 most important takeaways, each starting with a descriptive label
- core_topics: 2-4 main topics discussed
- key_terms: important terminology, tools, names mentioned
- main_arguments: main claims or arguments made in the content
- ALL text must be in Traditional Chinese
- Reply with JSON only`
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    return {
      primary_category: result.primary_category || '其他',
      subcategories: result.subcategories || [],
      keywords: result.keywords || [],
      tags: result.tags || [],
      confidence: result.confidence || 0.5,
      one_line: result.one_line || '',
      summary: result.summary || '',
      key_points: result.key_points || [],
      core_topics: result.core_topics || [],
      key_terms: result.key_terms || [],
      main_arguments: result.main_arguments || [],
    };
  } catch (error) {
    console.error('Claude API classification failed:', error);
    return fallbackClassify(data);
  }
}

// Keyword-based fallback (no API key needed)
function fallbackClassify(data: {
  url?: string;
  title?: string;
  description?: string;
  content_text?: string;
}): ClassificationResult {
  const text = [data.title, data.description, data.content_text, data.url]
    .filter(Boolean).join(' ').toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    '美食料理': ['food', 'recipe', 'cook', 'restaurant', '美食', '料理', '食譜', '餐廳', '吃', 'ramen', '拉麵'],
    '旅遊探險': ['travel', 'trip', 'hotel', 'flight', '旅遊', '旅行', '景點', '飯店'],
    '時尚穿搭': ['fashion', 'outfit', 'style', 'wear', '穿搭', '時尚', '服飾'],
    '美妝保養': ['makeup', 'skincare', 'beauty', '美妝', '保養', '化妝'],
    '健身運動': ['fitness', 'workout', 'gym', 'exercise', '健身', '運動', '瑜伽'],
    '科技數位': ['tech', 'code', 'ai', 'app', 'software', '科技', '程式', 'iphone', 'android', 'gemini', '數位', '線上'],
    '攝影藝術': ['photo', 'camera', 'art', 'design', '攝影', '藝術', '設計'],
    '音樂舞蹈': ['music', 'dance', 'song', 'sing', '音樂', '舞蹈', '歌'],
    '寵物動物': ['pet', 'dog', 'cat', 'animal', '寵物', '貓', '狗', '動物'],
    '家居生活': ['home', 'decor', 'interior', 'house', '家居', '居家', '裝潢'],
    '教育學習': ['learn', 'study', 'course', 'education', '學習', '教育', '課程'],
    '商業理財': ['business', 'finance', 'invest', 'money', '商業', '理財', '投資', '變現', '賺', '收入', '事業'],
    '娛樂搞笑': ['funny', 'meme', 'comedy', 'humor', '搞笑', '趣味', '梗'],
    '遊戲電競': ['game', 'gaming', 'esport', '遊戲', '電競'],
    '新聞時事': ['news', 'breaking', 'politics', '新聞', '時事', '政治', '選舉'],
    '手作DIY': ['diy', 'craft', 'handmade', '手作', '手工', '自製'],
    '親子育兒': ['baby', 'parenting', 'child', 'kid', '寶寶', '育兒', '親子', '媽媽'],
    '心靈成長': ['mindful', 'meditation', 'growth', 'motivat', '心靈', '冥想', '成長', '勵志'],
    '自然風景': ['nature', 'landscape', 'mountain', 'ocean', 'forest', '自然', '風景', '山', '海', '森林', '紀錄片'],
  };

  let bestCategory = '其他';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Extract a clean one-liner from the title
  let oneLine = data.title || data.description || '';
  // Remove "on Instagram:" prefix
  const igIdx = oneLine.indexOf(' on Instagram:');
  if (igIdx > 0) oneLine = oneLine.slice(0, igIdx);
  if (oneLine.length > 30) oneLine = oneLine.slice(0, 27) + '...';

  return {
    primary_category: bestCategory,
    subcategories: [],
    keywords: [],
    tags: [],
    confidence: bestScore > 0 ? Math.min(0.3 + bestScore * 0.15, 0.7) : 0.1,
    one_line: oneLine,
    summary: data.title || data.description || '（需要 API Key 才能產生詳細分析）',
    key_points: [],
    core_topics: [],
    key_terms: [],
    main_arguments: [],
  };
}

export { CATEGORIES };

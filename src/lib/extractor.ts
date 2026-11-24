// Instagram 與其他平台的內容擷取工具

export interface ExtractedContent {
  platform: string;
  type: string;
  title: string | null;
  author: string | null;
  description: string | null;
  thumbnail_url: string | null;
  content_text: string | null;
  url: string;
  raw_metadata: Record<string, unknown>;
}

// 偵測 URL 屬於哪個平台
export function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('reddit.com')) return 'reddit';
  if (u.includes('threads.net') || u.includes('threads.com')) return 'threads';
  return 'web';
}

// 偵測內容類型
export function detectContentType(url: string, platform: string): string {
  const u = url.toLowerCase();
  if (platform === 'instagram') {
    if (u.includes('/reel/') || u.includes('/reels/')) return 'reel';
    if (u.includes('/stories/')) return 'story';
    if (u.includes('/p/')) return 'post';
    return 'post';
  }
  if (platform === 'youtube') {
    if (u.includes('/shorts/')) return 'short';
    return 'video';
  }
  if (platform === 'tiktok') return 'video';
  if (platform === 'threads') return 'post';
  return 'article';
}

// 從 URL 擷取內容（使用 oEmbed 或 OpenGraph）
export async function extractFromUrl(inputUrl: string): Promise<ExtractedContent> {
  // 短連結（例如 threads.com/share/xxx）先解析成真正的貼文網址
  const url = await resolveShareUrl(inputUrl);
  const platform = detectPlatform(url);
  const type = detectContentType(url, platform);

  const baseResult: ExtractedContent = {
    platform,
    type,
    title: null,
    author: null,
    description: null,
    thumbnail_url: null,
    content_text: null,
    url,
    raw_metadata: { platform, type },
  };

  // 嘗試 oEmbed
  try {
    const oembedData = await fetchOEmbed(url, platform);
    if (oembedData) {
      baseResult.title = oembedData.title || null;
      baseResult.author = oembedData.author_name || null;
      baseResult.thumbnail_url = oembedData.thumbnail_url || null;
      baseResult.raw_metadata = { ...baseResult.raw_metadata, oembed: oembedData };
    }
  } catch (e) {
    console.log('oEmbed fetch failed, continuing with basic info');
  }

  // 嘗試擷取 OpenGraph 資料
  try {
    const ogData = await fetchOpenGraph(url);
    if (ogData) {
      baseResult.title = baseResult.title || ogData.title || null;
      baseResult.description = ogData.description || null;
      baseResult.thumbnail_url = baseResult.thumbnail_url || ogData.image || null;
      baseResult.raw_metadata = { ...baseResult.raw_metadata, og: ogData };
    }
  } catch (e) {
    console.log('OpenGraph fetch failed, continuing with basic info');
  }

  // YouTube: 自動擷取字幕/逐字稿
  if (platform === 'youtube') {
    try {
      const transcript = await fetchYouTubeTranscript(url);
      if (transcript) {
        baseResult.content_text = transcript;
        baseResult.raw_metadata = { ...baseResult.raw_metadata, has_transcript: true };
        console.log(`✅ YouTube transcript fetched: ${transcript.length} chars`);
      }
    } catch (e) {
      console.log('YouTube transcript fetch failed:', e);
    }
  }

  // 從 URL 本身解析一些資訊
  const urlInfo = parseUrlInfo(url, platform);
  baseResult.title = baseResult.title || urlInfo.title;
  baseResult.author = baseResult.author || urlInfo.author;

  return baseResult;
}

// 解析 Threads 分享短連結：threads.com/share/CODE → threads.com/@user/post/CODE
// 解析失敗時回傳原網址，不影響後續流程
export async function resolveShareUrl(url: string): Promise<string> {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isThreads = host.endsWith('threads.com') || host.endsWith('threads.net');
    if (!isThreads || !parsed.pathname.startsWith('/share/')) return url;

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': THREADS_UA, 'Accept': 'text/html' },
    });
    if (res.url && res.url !== url && !new URL(res.url).pathname.startsWith('/share/')) {
      return stripTracking(res.url);
    }

    // 沒有 HTTP 轉址時，從頁面的 canonical / og:url 取得真正網址
    const html = await res.text();
    const canonical =
      extractMetaTag(html, 'og:url') ||
      (html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null);
    if (canonical && /\/@[^/]+\/post\//.test(canonical)) return stripTracking(canonical);
    return url;
  } catch {
    return url;
  }
}

function stripTracking(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

// Meta 系網站（Threads）對一般爬蟲常回傳登入牆，用 Meta 自家的預覽爬蟲 UA 才拿得到 OG 資料
const THREADS_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

// oEmbed 擷取
async function fetchOEmbed(url: string, platform: string): Promise<Record<string, string> | null> {
  const oembedEndpoints: Record<string, string> = {
    instagram: `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`,
    youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    twitter: `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
    tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  };

  const endpoint = oembedEndpoints[platform];
  if (!endpoint) return null;

  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(5000),
    headers: { 'User-Agent': 'InfoHub/1.0' },
  });

  if (!res.ok) return null;
  return res.json();
}

// OpenGraph 資料擷取
async function fetchOpenGraph(url: string): Promise<{ title?: string; description?: string; image?: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': detectPlatform(url) === 'threads' ? THREADS_UA : 'Mozilla/5.0 (compatible; InfoHub/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const title = extractMetaTag(html, 'og:title') || extractMetaTag(html, 'title') || extractHtmlTitle(html);
    const description = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'description');
    const image = extractMetaTag(html, 'og:image');

    return { title: title || undefined, description: description || undefined, image: image || undefined };
  } catch {
    return null;
  }
}

function extractMetaTag(html: string, property: string): string | null {
  // 匹配 <meta property="og:xxx" content="..." /> 或 <meta name="xxx" content="..." />
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// 從 URL 路徑解析基本資訊
function parseUrlInfo(url: string, platform: string): { title: string | null; author: string | null } {
  try {
    const parsed = new URL(url);

    if (platform === 'instagram') {
      // 解析 Instagram URL 格式：
      // instagram.com/reel/CODE → type=reel, no author
      // instagram.com/p/CODE → type=post, no author
      // instagram.com/username/reel/CODE → type=reel, author=username
      // instagram.com/username/ → author=username
      const parts = parsed.pathname.split('/').filter(Boolean);
      let author: string | null = null;
      let type = 'post';

      if (parts[0] === 'reel' || parts[0] === 'reels') {
        type = 'reel';
        // /reel/CODE — 沒有 username
      } else if (parts[0] === 'p') {
        type = 'post';
      } else if (parts[0] === 'stories') {
        type = 'story';
        author = parts[1] || null;
      } else {
        // /username/reel/CODE 或 /username/
        author = parts[0] || null;
        if (parts[1] === 'reel' || parts[1] === 'reels') type = 'reel';
        else if (parts[1] === 'p') type = 'post';
      }

      const displayType = type === 'reel' ? 'Reel' : type === 'story' ? 'Story' : '貼文';
      const titleParts = [`Instagram ${displayType}`];
      if (author) titleParts.push(`by @${author}`);

      return {
        title: titleParts.join(' '),
        author: author ? `@${author}` : null,
      };
    }

    if (platform === 'youtube') {
      const title = parsed.searchParams.get('v') ? `YouTube 影片` : 'YouTube 內容';
      return { title, author: null };
    }

    if (platform === 'twitter') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const author = parts[0] || null;
      return {
        title: `Tweet by @${author}`,
        author: author ? `@${author}` : null,
      };
    }

    if (platform === 'threads') {
      // threads.com/@username/post/CODE
      const parts = parsed.pathname.split('/').filter(Boolean);
      const handle = parts[0]?.startsWith('@') ? parts[0].slice(1) : null;
      return {
        title: handle ? `Threads 貼文 by @${handle}` : 'Threads 貼文',
        author: handle ? `@${handle}` : null,
      };
    }

    return { title: null, author: null };
  } catch {
    return { title: null, author: null };
  }
}

// ===== YouTube Transcript Fetcher (using youtube-transcript package) =====

async function fetchYouTubeTranscript(url: string): Promise<string | null> {
  try {
    // Dynamic import to avoid issues if package not installed
    const { fetchTranscript } = require('youtube-transcript');

    // Try preferred languages in order
    const langs = ['zh-TW', 'zh-Hant', 'zh', 'ja', 'en'];
    let segments = null;

    for (const lang of langs) {
      try {
        segments = await fetchTranscript(url, { lang });
        if (segments && segments.length > 0) {
          console.log(`YouTube transcript (${lang}): ${segments.length} segments`);
          break;
        }
      } catch {
        // Try next language
      }
    }

    // Fallback: try without specifying language (gets default)
    if (!segments || segments.length === 0) {
      try {
        segments = await fetchTranscript(url);
        console.log(`YouTube transcript (default): ${segments?.length || 0} segments`);
      } catch (e) {
        console.log('YouTube transcript: no captions available for this video');
        return null;
      }
    }

    if (!segments || segments.length === 0) return null;

    const transcript = segments.map((s: { text: string }) => s.text).join(' ');
    console.log(`YouTube transcript fetched: ${transcript.length} chars`);

    // Cap at 5000 chars for the classifier
    return transcript.length > 5000 ? transcript.slice(0, 5000) + '...' : transcript;
  } catch (e) {
    console.log('YouTube transcript error:', e);
    return null;
  }
}

// 解析從分享動作收到的文字（可能包含 URL + 描述）
export function parseSharedText(text: string): { url: string | null; description: string | null } {
  // 尋找 URL
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
  const url = urlMatch ? urlMatch[1] : null;

  // 剩餘文字作為描述
  const description = url ? text.replace(url, '').trim() : text.trim();

  return {
    url,
    description: description || null,
  };
}

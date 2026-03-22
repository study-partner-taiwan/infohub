import { NextRequest, NextResponse } from 'next/server';
import { getSourceById, getAllSources } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/chat - AI chat about collected sources
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, source_id, action, history = [] } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: '⚠️ Need Claude API Key to use chat.\n\nEdit `.env.local` and add:\n```\nANTHROPIC_API_KEY=sk-ant-your-key\n```\nGet key: https://console.anthropic.com',
      });
    }

    // Build context from source(s)
    let context = '';

    if (source_id) {
      const source = await getSourceById(source_id);
      if (!source) {
        return NextResponse.json({ reply: 'Source not found.' }, { status: 404 });
      }
      context = buildSourceContext(source);
    } else {
      // Use all recent sources as context
      const sources = await getAllSources({ limit: 20 });
      if (sources.length === 0) {
        return NextResponse.json({ reply: 'No collected sources yet. Share some content first!' });
      }
      context = sources.map((s, i) => buildSourceContext(s, i + 1)).join('\n\n---\n\n');
    }

    // Build the prompt based on action
    let userMessage = message || '';

    if (action === 'summarize') {
      userMessage = 'Please provide a detailed summary of this content in Traditional Chinese. Include key points, main topics, and takeaways.';
    } else if (action === 'actions') {
      userMessage = 'Based on this content, give me specific actionable suggestions in Traditional Chinese. What should I do next? What can I learn from this? Any opportunities?';
    } else if (action === 'document') {
      userMessage = 'Based on this content, create a well-structured document/report in Traditional Chinese with sections, key findings, and conclusions.';
    }

    const client = new Anthropic({ apiKey });

    // Build messages array with history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add history
    for (const h of history.slice(-10)) {
      messages.push({ role: h.role, content: h.content });
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are InfoHub AI Assistant. You help users understand, analyze, and act on information they've collected from social media and the web.

Context - The user has collected the following content:

${context}

Rules:
- Always reply in Traditional Chinese (繁體中文)
- Be specific and reference the actual content
- For summaries: organize by themes with clear structure
- For action suggestions: give numbered, concrete steps
- For documents: use proper headings and sections
- For Q&A: answer based on the collected content, say if info is insufficient
- Use markdown formatting for readability`,
      messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errMsg.includes('authentication') || errMsg.includes('api_key')) {
      return NextResponse.json({ reply: '⚠️ API Key invalid. Please check `.env.local`.' });
    }
    return NextResponse.json({ reply: `Error: ${errMsg}` }, { status: 500 });
  }
}

function buildSourceContext(source: Awaited<ReturnType<typeof getSourceById>>, index?: number): string {
  if (!source) return '';
  const parts: string[] = [];
  if (index) parts.push(`[#${index}]`);
  if (source.title) parts.push(`Title: ${source.title}`);
  if (source.platform) parts.push(`Platform: ${source.platform}`);
  if (source.author) parts.push(`Author: ${source.author}`);
  if (source.primary_category) parts.push(`Category: ${source.primary_category}`);
  if (source.summary) parts.push(`AI Summary: ${source.summary}`);
  if (source.description) parts.push(`Description: ${source.description}`);
  if (source.content_text) parts.push(`Content: ${source.content_text}`);
  if (source.url) parts.push(`URL: ${source.url}`);
  if (source.keywords && source.keywords.length > 0) {
    const kw = Array.isArray(source.keywords) ? source.keywords : JSON.parse(source.keywords as string);
    parts.push(`Keywords: ${kw.join(', ')}`);
  }
  return parts.join('\n');
}

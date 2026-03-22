#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

// Find the InfoHub data file
// Try multiple common locations
const POSSIBLE_PATHS = [
  process.env.INFOHUB_DATA_PATH,
  path.join(process.cwd(), "data", "infohub.json"),
  path.join(process.cwd(), "..", "data", "infohub.json"),
];

function findDataPath() {
  for (const p of POSSIBLE_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function readDb() {
  const dataPath = findDataPath();
  if (!dataPath) return { sources: [], classifications: [] };
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  } catch {
    return { sources: [], classifications: [] };
  }
}

function getSourceWithClassification(source, db) {
  const cls = db.classifications.find((c) => c.source_id === source.id);
  return {
    ...source,
    category: cls?.primary_category || null,
    keywords: cls?.keywords || [],
    summary: cls?.summary || null,
  };
}

function formatSource(s) {
  const lines = [];
  if (s.title) lines.push(`Title: ${s.title}`);
  if (s.platform) lines.push(`Platform: ${s.platform}`);
  if (s.author) lines.push(`Author: ${s.author}`);
  if (s.category) lines.push(`Category: ${s.category}`);
  if (s.summary) lines.push(`Summary: ${s.summary}`);
  if (s.content_text) lines.push(`Content: ${s.content_text}`);
  if (s.description && s.description !== s.content_text)
    lines.push(`Description: ${s.description}`);
  if (s.url) lines.push(`URL: ${s.url}`);
  if (s.keywords?.length) lines.push(`Keywords: ${s.keywords.join(", ")}`);
  if (s.created_at) lines.push(`Saved: ${s.created_at}`);
  return lines.join("\n");
}

// ===== MCP Server =====
const server = new Server(
  { name: "infohub", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ===== Tools =====
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "infohub_list",
      description:
        "List all content collected in InfoHub. Optionally filter by category or platform. Use this to see what the user has saved from Instagram, YouTube, etc.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by category (e.g. 美食料理, 旅遊探險, 科技數位)",
          },
          platform: {
            type: "string",
            description: "Filter by platform (instagram, youtube, twitter, tiktok, web)",
          },
          limit: {
            type: "number",
            description: "Max items to return (default 20)",
          },
        },
      },
    },
    {
      name: "infohub_get",
      description:
        "Get full details of a specific collected item by its ID. Use after infohub_list to dive deeper into one item.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Source ID" },
        },
        required: ["id"],
      },
    },
    {
      name: "infohub_categories",
      description:
        "Get all categories and how many items are in each. Useful to see what topics the user has been collecting.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "infohub_search",
      description:
        "Search collected content by keyword. Searches titles, content, descriptions, and keywords.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword" },
        },
        required: ["query"],
      },
    },
    {
      name: "infohub_summary",
      description:
        "Get a summary overview of everything collected in InfoHub - total items, categories breakdown, platforms breakdown, and recent items.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const db = readDb();

  if (name === "infohub_list") {
    let sources = db.sources
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((s) => getSourceWithClassification(s, db));

    if (args?.category) {
      sources = sources.filter((s) => s.category === args.category);
    }
    if (args?.platform) {
      sources = sources.filter((s) => s.platform === args.platform);
    }

    const limit = args?.limit || 20;
    sources = sources.slice(0, limit);

    if (sources.length === 0) {
      return { content: [{ type: "text", text: "No items found." }] };
    }

    const text = sources
      .map((s, i) => `[${i + 1}] ${s.category || "uncategorized"} | ${s.platform} | ${s.title || "untitled"}\n    ID: ${s.id}`)
      .join("\n\n");

    return {
      content: [{ type: "text", text: `Found ${sources.length} items:\n\n${text}` }],
    };
  }

  if (name === "infohub_get") {
    const source = db.sources.find((s) => s.id === args.id);
    if (!source) {
      return { content: [{ type: "text", text: "Item not found." }] };
    }
    const enriched = getSourceWithClassification(source, db);
    return {
      content: [{ type: "text", text: formatSource(enriched) }],
    };
  }

  if (name === "infohub_categories") {
    const counts = {};
    for (const c of db.classifications) {
      counts[c.primary_category] = (counts[c.primary_category] || 0) + 1;
    }
    const lines = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `  ${cat}: ${count} items`);

    return {
      content: [
        {
          type: "text",
          text: `Categories (${Object.keys(counts).length} total):\n\n${lines.join("\n")}\n\nTotal items: ${db.sources.length}`,
        },
      ],
    };
  }

  if (name === "infohub_search") {
    const q = (args.query || "").toLowerCase();
    const results = db.sources
      .map((s) => getSourceWithClassification(s, db))
      .filter((s) => {
        const searchable = [
          s.title, s.content_text, s.description, s.summary,
          s.author, s.category, ...(s.keywords || []),
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(q);
      });

    if (results.length === 0) {
      return { content: [{ type: "text", text: `No results for "${args.query}".` }] };
    }

    const text = results
      .map((s, i) => `[${i + 1}] ${formatSource(s)}`)
      .join("\n\n---\n\n");

    return {
      content: [{ type: "text", text: `Found ${results.length} results for "${args.query}":\n\n${text}` }],
    };
  }

  if (name === "infohub_summary") {
    const total = db.sources.length;
    if (total === 0) {
      return { content: [{ type: "text", text: "InfoHub is empty. No content collected yet." }] };
    }

    const catCounts = {};
    for (const c of db.classifications) {
      catCounts[c.primary_category] = (catCounts[c.primary_category] || 0) + 1;
    }

    const platCounts = {};
    for (const s of db.sources) {
      platCounts[s.platform] = (platCounts[s.platform] || 0) + 1;
    }

    const recent = db.sources
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((s) => {
        const e = getSourceWithClassification(s, db);
        return `  - ${e.category || "?"} | ${e.title || e.url || "untitled"}`;
      });

    const text = [
      `InfoHub Overview`,
      `================`,
      `Total items: ${total}`,
      `Classified: ${db.classifications.length}`,
      ``,
      `By category:`,
      ...Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `  ${c}: ${n}`),
      ``,
      `By platform:`,
      ...Object.entries(platCounts).sort((a, b) => b[1] - a[1]).map(([p, n]) => `  ${p}: ${n}`),
      ``,
      `Recent items:`,
      ...recent,
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

// ===== Start =====
const transport = new StdioServerTransport();
await server.connect(transport);

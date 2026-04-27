/**
 * Codebase vector index using Voyage AI embeddings.
 *
 * Walks the workspace, chunks source files into overlapping windows,
 * embeds them with voyage-code-3, and stores everything in a module-level
 * in-memory cache keyed by working directory.
 *
 * Cache TTL is 90 s — long enough to avoid redundant re-indexing within a
 * single agent turn, short enough to pick up edits the agent makes.
 */

import type { Sandbox } from "@open-harness/sandbox";

// ─── Constants ───────────────────────────────────────────────────────────────

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-code-3";

const CHUNK_LINES = 80;
const OVERLAP_LINES = 15;
const MAX_FILES = 600;
const BATCH_SIZE = 64;
const CACHE_TTL_MS = 90_000;

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".svelte",
  ".vue",
  ".json",
  ".jsonc",
  ".toml",
  ".yaml",
  ".yml",
  ".md",
  ".mdx",
  ".txt",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".graphql",
  ".gql",
  ".prisma",
  ".env.example",
]);

const IGNORE_GLOBS = [
  "--glob='!node_modules/**'",
  "--glob='!.git/**'",
  "--glob='!.next/**'",
  "--glob='!dist/**'",
  "--glob='!build/**'",
  "--glob='!coverage/**'",
  "--glob='!.turbo/**'",
  "--glob='!*.lock'",
  "--glob='!*.lockb'",
  "--glob='!*.png'",
  "--glob='!*.jpg'",
  "--glob='!*.jpeg'",
  "--glob='!*.gif'",
  "--glob='!*.webp'",
  "--glob='!*.ico'",
  "--glob='!*.svg'",
  "--glob='!*.woff'",
  "--glob='!*.woff2'",
  "--glob='!*.ttf'",
  "--glob='!*.eot'",
  "--glob='!*.mp4'",
  "--glob='!*.mp3'",
  "--glob='!*.pdf'",
].join(" ");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeChunk {
  file: string;
  startLine: number;
  endLine: number;
  text: string;
  embedding: number[];
}

export interface CodeIndex {
  chunks: CodeChunk[];
  builtAt: number;
  workingDirectory: string;
  fileCount: number;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const indexCache = new Map<string, CodeIndex>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasCodeExtension(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return false;
  return CODE_EXTENSIONS.has(filePath.slice(lastDot).toLowerCase());
}

function chunkFile(
  text: string,
  filePath: string,
): Array<{ startLine: number; endLine: number; text: string }> {
  const lines = text.split("\n");
  if (lines.length <= CHUNK_LINES) {
    return [{ startLine: 1, endLine: lines.length, text }];
  }

  const chunks: Array<{ startLine: number; endLine: number; text: string }> =
    [];
  let i = 0;
  while (i < lines.length) {
    const startIdx = i;
    const endIdx = Math.min(i + CHUNK_LINES, lines.length);
    chunks.push({
      startLine: startIdx + 1,
      endLine: endIdx,
      text: lines.slice(startIdx, endIdx).join("\n"),
    });
    i += CHUNK_LINES - OVERLAP_LINES;
  }
  return chunks;
}

async function embedBatch(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: batch,
        model: EMBEDDING_MODEL,
        input_type: "document",
        truncation: true,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Voyage API error ${res.status}: ${errText.slice(0, 400)}`,
      );
    }
    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    allEmbeddings.push(...data.data.map((d) => d.embedding));
  }
  return allEmbeddings;
}

export async function embedQuery(
  query: string,
  apiKey: string,
): Promise<number[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [query],
      model: EMBEDDING_MODEL,
      input_type: "query",
      truncation: true,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voyage API error ${res.status}: ${errText.slice(0, 400)}`);
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const embedding = data.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Voyage API returned no embedding data");
  }
  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build (or return cached) the vector index for the given sandbox workspace.
 *
 * @param sandbox   Connected Sandbox instance
 * @param apiKey    Voyage API key
 * @param force     Force rebuild even if cache is fresh
 */
export async function buildOrGetIndex(
  sandbox: Sandbox,
  apiKey: string,
  force = false,
): Promise<CodeIndex> {
  const cacheKey = sandbox.workingDirectory;
  const cached = indexCache.get(cacheKey);

  if (!force && cached && Date.now() - cached.builtAt < CACHE_TTL_MS) {
    return cached;
  }

  // List all workspace files, respecting .gitignore-like exclusions
  const listResult = await sandbox.exec(
    `rg --files ${IGNORE_GLOBS} 2>/dev/null | head -${MAX_FILES}`,
    sandbox.workingDirectory,
    30_000,
  );

  const filePaths = listResult.stdout
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter(hasCodeExtension);

  // Read files and build raw chunks
  const rawChunks: Array<{
    file: string;
    startLine: number;
    endLine: number;
    text: string;
  }> = [];

  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const absolutePath = filePath.startsWith("/")
          ? filePath
          : `${sandbox.workingDirectory}/${filePath}`;
        const content = await sandbox.readFile(absolutePath, "utf-8");
        if (!content || content.length > 200_000) return;
        const fileChunks = chunkFile(content, filePath);
        for (const chunk of fileChunks) {
          rawChunks.push({
            file: filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            // Prepend path as context so the embedding model knows which file this is
            text: `// File: ${filePath}\n${chunk.text}`,
          });
        }
      } catch {
        // Silently skip unreadable files (binary, permissions, etc.)
      }
    }),
  );

  if (rawChunks.length === 0) {
    const empty: CodeIndex = {
      chunks: [],
      builtAt: Date.now(),
      workingDirectory: sandbox.workingDirectory,
      fileCount: 0,
    };
    indexCache.set(cacheKey, empty);
    return empty;
  }

  // Embed all chunks
  const texts = rawChunks.map((c) => c.text);
  const embeddings = await embedBatch(texts, apiKey);

  const chunks: CodeChunk[] = rawChunks.map((chunk, i) => ({
    file: chunk.file,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    text: chunk.text,
    embedding: embeddings[i] ?? [],
  }));

  const index: CodeIndex = {
    chunks,
    builtAt: Date.now(),
    workingDirectory: sandbox.workingDirectory,
    fileCount: new Set(rawChunks.map((c) => c.file)).size,
  };
  indexCache.set(cacheKey, index);
  return index;
}

/**
 * Search the index for chunks semantically similar to `query`.
 */
export async function searchIndex(
  query: string,
  index: CodeIndex,
  apiKey: string,
  topK = 8,
  targetDirectory?: string,
): Promise<
  Array<{
    file: string;
    startLine: number;
    endLine: number;
    score: number;
    snippet: string;
  }>
> {
  if (index.chunks.length === 0) return [];

  const queryEmbedding = await embedQuery(query, apiKey);

  let candidates = index.chunks;
  if (targetDirectory) {
    const dir = targetDirectory.replace(/\/$/, "") + "/";
    candidates = candidates.filter(
      (c) => c.file.startsWith(dir) || c.file.startsWith("/" + dir),
    );
  }

  const scored = candidates
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((c) => ({
    file: c.file,
    startLine: c.startLine,
    endLine: c.endLine,
    score: Math.round(c.score * 1000) / 1000,
    // Strip the "// File: ..." prefix we injected for embeddings
    snippet: c.text.replace(/^\/\/ File: [^\n]+\n/, "").slice(0, 400),
  }));
}

/**
 * Invalidate the cached index for a given working directory.
 * Call this after the agent makes substantial file edits so the next
 * codebase_search call gets a fresh index.
 */
export function invalidateIndex(workingDirectory: string): void {
  indexCache.delete(workingDirectory);
}

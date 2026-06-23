function sanitizeJsonStrings(s: string): string {
  // Replace literal newlines/tabs inside JSON string values — LLMs often emit these
  return s.replace(/"(?:[^"\\]|\\.)*"/g, (m) =>
    m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
  );
}

export function parseAgentResponse(content: string): unknown {
  // Strip think/thinking blocks and markdown fences
  let cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  // Strip leading markdown headers
  cleaned = cleaned.replace(/^#+\s*[\w\s]*\n?/gm, "").trim();

  // Find first JSON object or array
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }

  if (start > 0) {
    cleaned = cleaned.slice(start);
  }

  // Attempt 1: direct parse
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Attempt 2: sanitize literal newlines in strings, then parse
  try { return JSON.parse(sanitizeJsonStrings(cleaned)); } catch { /* fall through */ }

  // Attempt 3: greedy bracket extraction
  let best = "";
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === "{" || c === "[") {
      const close = c === "{" ? "}" : "]";
      let depth = 1;
      let j = i + 1;
      while (j < cleaned.length && depth > 0) {
        if (cleaned[j] === close) depth--;
        else if (cleaned[j] === c) depth++;
        j++;
      }
      if (depth === 0) {
        const candidate = cleaned.slice(i, j);
        if (candidate.length > best.length) best = candidate;
      }
    }
  }

  if (best) {
    // Attempt 4: parse extracted block + sanitize
    try { return JSON.parse(best); } catch { /* fall through */ }
    try { return JSON.parse(sanitizeJsonStrings(best)); } catch { /* fall through */ }
  }

  throw new Error(`JSON parse failed. Content preview: ${cleaned.slice(0, 200)}`);
}
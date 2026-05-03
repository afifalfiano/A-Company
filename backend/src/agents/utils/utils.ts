export function parseAgentResponse(content: string): unknown {
  // Strip LangChain think blocks
  let cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json|```/g, "")
    .trim();

  // Strip leading markdown headers or thinking labels like "# Response" or "## Analysis"
  cleaned = cleaned.replace(/^#+\s*[\w\s]*\n?/gm, "").trim();

  // Find first valid JSON object or array
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

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try a greedy approach: extract first balanced {...} or [...]
    let best = "";
    let bestEnd = -1;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (c === "{" || c === "[") {
        const open = c === "{" ? "}" : "]";
        let depth = 1;
        let j = i + 1;
        while (j < cleaned.length && depth > 0) {
          const ch = cleaned[j];
          if (ch === open) depth--;
          else if (ch === c) depth++;
          j++;
        }
        if (depth === 0) {
          const candidate = cleaned.slice(i, j);
          if (candidate.length > best.length) {
            best = candidate;
            bestEnd = j;
          }
        }
      }
    }
    if (best) {
      try {
        return JSON.parse(best);
      } catch {
        throw new Error(`JSON parse failed. Content preview: ${cleaned.slice(0, 200)}`);
      }
    }
    throw new Error(`JSON parse failed. No valid JSON found. Content preview: ${cleaned.slice(0, 200)}`);
  }
}
/**
 * Tolerant JSON parsing for streamed structured output.
 *
 * While a model streams a JSON object/array token-by-token, the buffer is
 * almost always *incomplete* (open strings, missing closing brackets, a
 * dangling key, a trailing comma, etc.). `parsePartialJson` repairs the
 * buffer enough to `JSON.parse` it so the UI can render progressively.
 *
 * Returns `undefined` only when nothing sensible can be parsed yet.
 */
export function parsePartialJson(input: string): unknown {
  if (typeof input !== "string") return undefined;
  const text = input.trim();
  if (!text) return undefined;

  // Fast path: already valid.
  try {
    return JSON.parse(text);
  } catch {
    // fall through to repair
  }

  let candidate = text;
  // Each iteration either parses successfully or drops the dangling tail token
  // (back to the previous structural delimiter), so this converges quickly.
  while (candidate.length > 0) {
    const repaired = closeOpenStructures(candidate);
    if (repaired !== null) {
      try {
        return JSON.parse(repaired);
      } catch {
        // keep trimming
      }
    }
    const trimmed = dropDanglingTail(candidate);
    if (trimmed === candidate) break;
    candidate = trimmed;
  }

  return undefined;
}

/**
 * Closes any open string and brackets and removes obvious trailing junk
 * (a dangling comma, or a `key:` with no value → `key: null`).
 */
function closeOpenStructures(source: string): string | null {
  const closers: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") closers.push("}");
    else if (ch === "[") closers.push("]");
    else if (ch === "}" || ch === "]") closers.pop();
  }

  let out = source;
  if (inString) out += '"';
  out = out.replace(/\s+$/, "");

  // A trailing comma can't be followed by a closer.
  if (out.endsWith(",")) out = out.slice(0, -1);
  // A trailing colon means a value is still missing.
  if (out.endsWith(":")) out += "null";

  for (let i = closers.length - 1; i >= 0; i--) out += closers[i];
  return out;
}

/**
 * Cuts the buffer back to (and including) the last top-level structural
 * delimiter so the next repair attempt drops an incomplete trailing token
 * (e.g. a half-written key, number or keyword).
 */
function dropDanglingTail(source: string): string {
  let inString = false;
  let escaped = false;
  let lastDelim = -1;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "," || ch === ":" || ch === "{" || ch === "[") lastDelim = i;
  }

  if (lastDelim < 0) return "";
  return source.slice(0, lastDelim + 1);
}

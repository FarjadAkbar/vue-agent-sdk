import MarkdownIt from "markdown-it";
import katex from "katex";
import katexPlugin from "@vscode/markdown-it-katex";

// Use highlight.js core + a curated set of languages to keep the bundle small.
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import markdown from "highlight.js/lib/languages/markdown";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);

const md: MarkdownIt = new MarkdownIt({
  html: false, // never trust raw HTML from model output (XSS-safe)
  linkify: true,
  breaks: true,
});

// KaTeX math: $inline$ and $$block$$. Never throw on malformed input.
// The package's default export is the plugin (handles both CJS/ESM shapes).
const mk = (katexPlugin as unknown as { default?: unknown }).default ?? katexPlugin;
md.use(mk as Parameters<typeof md.use>[0], { katex, throwOnError: false });

function highlight(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      /* fall through */
    }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return md.utils.escapeHtml(code);
  }
}

// Custom fenced-code renderer: wraps each block in a toolbar (language label +
// copy button) so <ChatMessage> / <MarkdownContent> can offer "copy code".
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = token.info ? md.utils.unescapeAll(token.info).trim() : "";
  const lang = info.split(/\s+/g)[0] || "text";
  const highlighted = highlight(token.content, lang);
  const label = md.utils.escapeHtml(lang);
  return (
    `<div class="agent-code" data-lang="${label}">` +
    `<div class="agent-code__bar">` +
    `<span class="agent-code__lang">${label}</span>` +
    `<button type="button" class="agent-code__copy" aria-label="Copy code">Copy</button>` +
    `</div>` +
    `<pre class="hljs"><code>${highlighted}</code></pre>` +
    `</div>`
  );
};

// Open links in a new tab safely.
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/** Render a markdown string to trusted HTML (model output is escaped). */
export function renderMarkdown(source: string): string {
  return md.render(source ?? "");
}

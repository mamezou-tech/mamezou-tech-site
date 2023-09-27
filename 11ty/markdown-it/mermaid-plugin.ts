import MarkdownIt from 'npm:markdown-it';
import * as Token from 'npm:markdown-it/lib/token';
import * as Renderer from 'npm:markdown-it/lib/renderer';
import { escapeHtml } from "https://deno.land/x/escape_html/mod.ts";

export default (md: MarkdownIt) => {
  const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = function(tokens: Token[], idx: number, options: MarkdownIt.Options, env: any, self: Renderer) {
    const token = tokens[idx];
    const code = token.content.trim();
    if (token.info.trim() === 'mermaid') {
      return `<pre class="mermaid">${escapeHtml(code)}</pre>`
    }
    return defaultRenderer(tokens, idx, options, env, self);
  };
}
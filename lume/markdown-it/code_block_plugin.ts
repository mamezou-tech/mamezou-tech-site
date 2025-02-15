import MarkdownIt from "markdown-it";
import * as Token from "markdown-it/lib/token";
import * as Renderer from "markdown-it/lib/renderer";
import { escapeHtml } from "https://deno.land/x/escape_html/mod.ts";

export default function markdownItDiffHighlight(
  md: MarkdownIt,
) {
  const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (
    tokens: Token[],
    idx: number,
    options: MarkdownIt.Options,
    env: unknown,
    self: Renderer,
  ) => {
    const token = tokens[idx];
    const code = token.content.trim();
    const info = token.info;
    const [lang, name] = info.split(":");
    // mermaid
    if (lang === "mermaid") {
      // write as plain code(client rendering)
      return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
    }

    // diff highlight plugin
    if (
      token.tag === "code" && lang.startsWith("diff-") && token.content.length
    ) {
      token.attrJoin("class", "diff-highlight");
    }

    // with file name
    if (name) {
      token.info = lang; // remove name for prism
      const rendered = defaultRenderer(tokens, idx, options, env, self);
      return rendered.replace(
        /<div style="position: relative">/,
        (match: string) => `${match}<span class="code-filename">${name}</span>`,
      );
    }

    return defaultRenderer(tokens, idx, options, env, self);
  };
}

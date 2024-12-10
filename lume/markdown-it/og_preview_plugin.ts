import MarkdownIt from "markdown-it";
import * as Token from "markdown-it/lib/token";
import * as State from "markdown-it/lib/State";

export default function markdownItOgPreview(md: MarkdownIt, options = {}) {
  // カスタム記法 @[og](url)
  md.inline.ruler.before('link', 'og_preview', (state: State, silent: boolean) => {
    const start = state.pos;
    const marker = state.src.charAt(start);

    if (marker !== '@') return false; // @で始まらなければ無視
    if (state.src.slice(start, start + 5) !== '@[og]') return false; // @[og]チェック

    const openParen = state.src.indexOf('(', start + 5);
    const closeParen = state.src.indexOf(')', openParen);

    if (openParen === -1 || closeParen === -1) return false; // 不正な構文なら無視

    const url = state.src.slice(openParen + 1, closeParen).trim();

    if (!url) return false;

    if (!silent) {
      const token = state.push('og_preview', 'div', 0);
      token.attrSet('data-url', url); // データ属性としてURLを埋め込む
    }

    state.pos = closeParen + 1;
    return true;
  });

  md.renderer.rules.og_preview = (tokens: Token[], idx: number) => {
    const url = tokens[idx].attrGet('data-url');
    return `<div class="og-preview" style="overflow-wrap: break-word" data-og-url="${url}"><a href="${url}" target="_blank">${url}</a></div>`;
  };
};

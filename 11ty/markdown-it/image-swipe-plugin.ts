import * as Token from "markdown-it/lib/token";
import * as Renderer from 'markdown-it/lib/renderer';
import MarkdownIt from "markdown-it";

export default (md: MarkdownIt) => {
  const originalRule = md.renderer.rules.image;
  md.renderer.rules.image = function(tokens: Token[], idx: number, options: MarkdownIt.Options, env: any, self: Renderer) {
    const imageTag = originalRule(tokens, idx, options, env, self);
    const token = tokens[idx];
    return `<a id="image-swipe-${idx}" class="image-swipe" href="${token.attrs[token.attrIndex("src")][1]}" target="_blank" rel="noopener noreferrer">${imageTag}</a>`;
  };
}
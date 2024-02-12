import MarkdownIt from 'markdown-it';
import * as Token from 'markdown-it/lib/token';
import * as Renderer from 'markdown-it/lib/renderer';

export default function markdownItDiffHighlight(
  md: MarkdownIt
) {
  const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (
    tokens: Token[],
    idx: number,
    options: MarkdownIt.Options,
    env: any,
    self: Renderer
  ) => {
    const origRendered = defaultRenderer(tokens, idx, options, env, self);
    if (tokens[idx].tag !== 'code') {
      return origRendered;
    }
    if (!tokens[idx].info || tokens[idx].info === 'mermaid') {
      return origRendered;
    }
    if (tokens[idx].content.length === 0) {
      return origRendered;
    }
    tokens[idx].attrJoin('class', 'diff-highlight');

    return defaultRenderer(tokens, idx, options);
  };
}

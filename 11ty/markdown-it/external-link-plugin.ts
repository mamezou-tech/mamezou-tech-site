import MarkdownIt from 'markdown-it';
import * as Token from 'markdown-it/lib/token';
import * as Renderer from 'markdown-it/lib/renderer';
export default (md: MarkdownIt) => {
  function isInternalLink(token: Token) {
    return token.attrIndex("href") === -1 ||
      token.attrGet("href").match(/^([#\/].*$|https:\/\/developer\.mamezou-tech\.com.*$)/);
  }

  md.renderer.rules.link_open = function(tokens: Token[], idx: number, options: MarkdownIt.Options, env: any, self: Renderer) {
    if (isInternalLink(tokens[idx])) {
      // skip internal link
      return self.renderToken(tokens, idx, options);
    }
    tokens[idx].attrPush(["target", "_blank"]);
    tokens[idx].attrPush(["rel", "noopener noreferrer"]);
    tokens[idx].attrJoin("class", "new-tab-link");
    return self.renderToken(tokens, idx, options);
  };
};
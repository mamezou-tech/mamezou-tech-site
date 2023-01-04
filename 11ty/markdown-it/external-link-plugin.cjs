module.exports = (md) => {
  function isInternalLink(token) {
    return token.attrIndex("href") === -1 ||
      token.attrGet("href").match(/^([#\/].*$|https:\/\/developer\.mamezou-tech\.com.*$)/);
  }

  md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
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
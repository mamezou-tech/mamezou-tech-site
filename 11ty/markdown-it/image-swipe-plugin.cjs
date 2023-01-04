module.exports = (md) => {
  const originalRule = md.renderer.rules.image;
  md.renderer.rules.image = function(tokens, idx, options, env, self) {
    const imageTag = originalRule(tokens, idx, options, env, self);
    const token = tokens[idx];
    return `<a id="image-swipe-${idx}" class="image-swipe" href="${token.attrs[token.attrIndex("src")][1]}" target="_blank" rel="noopener noreferrer">${imageTag}</a>`;
  };
}
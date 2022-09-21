const {chop} = require("./utils.cjs");
module.exports = (collections, page, defaultValue) => {
  const {inputPath} = page;
  if (!inputPath) return defaultValue;

  const isPost = inputPath.includes('/posts/')
  if (!isPost) return defaultValue;

  const post = collections.find(el => el.url === page.url)
  if (!post) return defaultValue;
  const content = post.templateContent.toString()
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/[\r\n]/gi, "");
  return chop(content);
};
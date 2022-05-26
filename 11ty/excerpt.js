const {chop} = require("./utils");
module.exports = (post) => {
  if (!post) {
    console.log("Page contents not found!! something wrong...")
    return "";
  }
  const content = post.replace(/(<([^>]+)>)/gi, '');
  return chop(content);
};
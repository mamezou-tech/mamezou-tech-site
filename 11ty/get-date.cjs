const {DateTime} = require("luxon");
module.exports = (posts, url) => {
  const post = posts.find(post => post.url.toLowerCase() === url.toLowerCase());
  if (!post) {
    console.log("NOT FOUND", url);
    return "";
  }
  return DateTime.fromJSDate(post.date).toISODate();
};

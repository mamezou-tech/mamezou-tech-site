const {generalTags} = require("./utils");
module.exports = (collection) => {
  const tagSet = new Set();
  collection.getAll().forEach(item => {
    if ('tags' in item.data) {
      const filtered = item.data.tags.filter((item) => !generalTags.find((tag) => item === tag));
      for (const tag of filtered) {
        tagSet.add(tag);
      }
    }
  });
  return [...tagSet].sort();
};
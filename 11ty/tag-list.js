const {generalTags} = require("./utils");
module.exports = (collection) => {
  const tagSet = new Set();
  collection.getAll().forEach(item => {
    if ('tags' in item.data) {
      const tags = item.data.tags;
      const filtered = tags.filter((item) => !generalTags.find((tag) => item === tag));
      for (const tag of filtered) {
        tagSet.add(tag);
      }
    }
  });
  return [...tagSet].sort();
};
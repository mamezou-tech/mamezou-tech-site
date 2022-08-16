const { generalTags } = require("./utils");
module.exports = (tags) => {
  return tags
    .toString()
    .split(",")
    .filter((tag) => {
      return !generalTags.includes(tag);
    });
};
